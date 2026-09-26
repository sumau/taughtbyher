import { Router, type IRouter, type Request } from "express";
import { and, asc, eq } from "drizzle-orm";
import {
  CreateEnquiryBody,
  CreateEnquiryResponse,
  ListWorkspaceEnquiriesResponse,
  RetryWorkspaceEnquiryParams,
  RetryWorkspaceEnquiryResponse,
} from "@workspace/api-zod";
import {
  db,
  enquiriesTable,
  tutorsTable,
} from "@workspace/db";
import {
  canReceivePublicEnquiries,
  findPublishedTutor,
} from "../lib/public-tutors";
import {
  requireApproved,
  requireWorkspaceAccount as workspaceAccount,
} from "../auth/workspace-access";

const router: IRouter = Router();
const simpleEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const deliveryMessages = {
  pending: "Your enquiry was recorded and is waiting for staff delivery.",
  delivered: "Your enquiry has been delivered to the Well Tutored team.",
  failed:
    "Your enquiry was recorded, but delivery needs staff attention. You do not need to submit it again.",
} as const;

type DeliveryStatus = keyof typeof deliveryMessages;

function publicDeliveryStatus(value: string): DeliveryStatus {
  if (value === "delivered" || value === "failed") return value;
  return "pending";
}

function enquiryReceipt(
  enquiry: {
    id: number;
    createdAt: Date;
  },
  tutorName: string,
  deliveryStatus: DeliveryStatus,
) {
  return {
    id: enquiry.id,
    tutorName,
    receivedAt: enquiry.createdAt.toISOString(),
    deliveryStatus,
    message: deliveryMessages[deliveryStatus],
  };
}

async function markDeliveryFailed(enquiryId: number, req: Request) {
  try {
    await db
      .update(enquiriesTable)
      .set({ deliveryStatus: "failed" })
      .where(eq(enquiriesTable.id, enquiryId));
    return "failed" as const;
  } catch (error) {
    req.log.error({ err: error, enquiryId }, "Could not persist failed enquiry delivery");
    return "pending" as const;
  }
}

async function deliverEnquiry(
  enquiryId: number,
  req: Request,
) {
  try {
    const [delivered] = await db
      .update(enquiriesTable)
      .set({ deliveryStatus: "delivered" })
      .where(eq(enquiriesTable.id, enquiryId))
      .returning({ id: enquiriesTable.id });
    if (!delivered) throw new Error("Enquiry no longer exists");
    return "delivered" as const;
  } catch (error) {
    req.log.error({ err: error, enquiryId }, "Enquiry delivery failed");
    return markDeliveryFailed(enquiryId, req);
  }
}

router.post("/enquiries", async (req, res): Promise<void> => {
  const parsed = CreateEnquiryBody.safeParse(req.body);
  if (!parsed.success || !simpleEmail.test(req.body?.email ?? "")) {
    res.status(400).json({ error: "Please check the enquiry details." });
    return;
  }

  const tutor = await findPublishedTutor(parsed.data.tutorSlug);

  if (!tutor) {
    res.status(400).json({ error: "Please select an available tutor." });
    return;
  }
  if (!canReceivePublicEnquiries(tutor)) {
    res.status(400).json({ error: "Please select an available tutor." });
    return;
  }

  const [enquiry] = await db
    .insert(enquiriesTable)
    .values({
      tutorId: tutor.id,
      name: parsed.data.name,
      email: parsed.data.email,
      studentName: parsed.data.studentName,
      studentAge: parsed.data.studentAge,
      subjectLevel: parsed.data.subjectLevel,
      message: parsed.data.message,
      deliveryStatus: "pending",
    })
    .returning({
      id: enquiriesTable.id,
      createdAt: enquiriesTable.createdAt,
    });

  const deliveryStatus = await deliverEnquiry(enquiry.id, req);
  req.log.info({ enquiryId: enquiry.id, tutorId: tutor.id, deliveryStatus }, "Named tutor enquiry accepted");

  res.status(201).json(
    CreateEnquiryResponse.parse(enquiryReceipt(enquiry, tutor.name, deliveryStatus)),
  );
});

router.get("/workspace/enquiries", async (req, res): Promise<void> => {
  const account = await workspaceAccount(req, res);
  if (!account || !requireApproved(account, res)) return;

  const rows = await db
    .select({
      enquiry: enquiriesTable,
      tutorName: tutorsTable.name,
    })
    .from(enquiriesTable)
    .innerJoin(tutorsTable, eq(enquiriesTable.tutorId, tutorsTable.id))
    .where(
      account.role === "owner"
        ? undefined
        : account.tutorId
          ? eq(enquiriesTable.tutorId, account.tutorId)
          : eq(enquiriesTable.tutorId, -1),
    )
    .orderBy(asc(enquiriesTable.createdAt), asc(enquiriesTable.id));

  res.json(
    ListWorkspaceEnquiriesResponse.parse(
      rows.map(({ enquiry, tutorName }) => ({
        id: enquiry.id,
        tutorId: enquiry.tutorId,
        tutorName,
        name: enquiry.name,
        email: enquiry.email,
        studentName: enquiry.studentName,
        studentAge: enquiry.studentAge,
        subjectLevel: enquiry.subjectLevel,
        message: enquiry.message,
        deliveryStatus: publicDeliveryStatus(enquiry.deliveryStatus),
        createdAt: enquiry.createdAt.toISOString(),
      })),
    ),
  );
});

router.post("/workspace/enquiries/:id/retry", async (req, res): Promise<void> => {
  const account = await workspaceAccount(req, res);
  if (!account || !requireApproved(account, res)) return;

  const params = RetryWorkspaceEnquiryParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid enquiry." });
    return;
  }

  const [row] = await db
    .select({
      enquiry: enquiriesTable,
      tutorName: tutorsTable.name,
    })
    .from(enquiriesTable)
    .innerJoin(tutorsTable, eq(enquiriesTable.tutorId, tutorsTable.id))
    .where(
      and(
        eq(enquiriesTable.id, params.data.id),
        account.role === "owner"
          ? undefined
          : account.tutorId
            ? eq(enquiriesTable.tutorId, account.tutorId)
            : eq(enquiriesTable.tutorId, -1),
      ),
    )
    .limit(1);

  if (!row) {
    res.status(404).json({ error: "Enquiry not found." });
    return;
  }

  const deliveryStatus = await deliverEnquiry(row.enquiry.id, req);
  if (deliveryStatus !== "delivered") {
    res.status(503).json({ error: "Delivery is still unavailable. Please try again later." });
    return;
  }

  res.json(
    RetryWorkspaceEnquiryResponse.parse({
      id: row.enquiry.id,
      tutorId: row.enquiry.tutorId,
      tutorName: row.tutorName,
      name: row.enquiry.name,
      email: row.enquiry.email,
      studentName: row.enquiry.studentName,
      studentAge: row.enquiry.studentAge,
      subjectLevel: row.enquiry.subjectLevel,
      message: row.enquiry.message,
      deliveryStatus,
      createdAt: row.enquiry.createdAt.toISOString(),
    }),
  );
});

export default router;