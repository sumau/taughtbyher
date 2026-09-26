import { Link } from "wouter";
import {
  getListWorkspaceAccountsQueryKey,
  getListWorkspaceTutorsQueryKey,
  getGetWorkspaceSessionQueryKey,
  useArchiveWorkspaceTutor,
  useGetWorkspaceSession,
  useListWorkspaceAccounts,
  useListWorkspaceTutors,
  useRestoreWorkspaceTutor,
  useUpdateWorkspaceAccount,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Archive,
  ExternalLink,
  Plus,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TutorFormDialog } from "@/components/workspace/TutorFormDialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState } from "react";
import { invalidatePublicTutorQueries } from "@/lib/public-tutor-query";

export default function WorkspaceTutorProfiles() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const { data: session, isLoading: isLoadingSession } = useGetWorkspaceSession();
  const {
    data: tutors,
    isLoading: isLoadingTutors,
    isError: tutorsError,
  } = useListWorkspaceTutors({
    query: {
      enabled: session?.role === "owner",
    },
  });
  const { data: accounts, isLoading: isLoadingAccounts } =
    useListWorkspaceAccounts({
      query: {
        enabled: session?.role === "owner",
      },
    });
  const archiveTutor = useArchiveWorkspaceTutor();
  const restoreTutor = useRestoreWorkspaceTutor();
  const updateAccount = useUpdateWorkspaceAccount();
  const queryClient = useQueryClient();

  const isLoading =
    isLoadingSession || isLoadingTutors || isLoadingAccounts;
  const isOwner = session?.role === "owner";

  const handleCreated = () => {
    queryClient.invalidateQueries({
      queryKey: getListWorkspaceTutorsQueryKey(),
    });
    queryClient.invalidateQueries({
      queryKey: getListWorkspaceAccountsQueryKey(),
    });
  };

  const invalidateTutorLists = () => {
    queryClient.invalidateQueries({
      queryKey: getListWorkspaceTutorsQueryKey(),
    });
    queryClient.invalidateQueries({
      queryKey: getListWorkspaceAccountsQueryKey(),
    });
  };

  const handleArchive = (id: number, slug: string) => {
    archiveTutor.mutate(
      { id },
      {
        onSuccess: () => {
          toast.success("Tutor profile archived");
          invalidateTutorLists();
          invalidatePublicTutorQueries(queryClient, slug);
        },
        onError: () => {
          toast.error("Failed to archive tutor profile");
        },
      },
    );
  };

  const handleRestore = (id: number, slug: string) => {
    restoreTutor.mutate(
      { id },
      {
        onSuccess: () => {
          toast.success("Tutor profile restored as a draft");
          invalidateTutorLists();
          invalidatePublicTutorQueries(queryClient, slug);
        },
        onError: () => {
          toast.error("Failed to restore tutor profile");
        },
      },
    );
  };

  const isLifecyclePending =
    archiveTutor.isPending || restoreTutor.isPending;

  const handleAccountChange = (tutorId: number, accountId: string) => {
    const nextAccountId = accountId === "none" ? null : Number(accountId);
    const currentAccount = accounts?.find((item) => item.tutorId === tutorId);
    const targetAccount = accounts?.find((item) => item.id === nextAccountId);
    if (nextAccountId != null && (!targetAccount || targetAccount.role !== "tutor")) {
      toast.error("Choose an approved tutor account.");
      return;
    }
    const accountToUpdate = targetAccount ?? currentAccount;
    if (!accountToUpdate) return;

    updateAccount.mutate(
      {
        id: accountToUpdate.id,
        data: {
          role: accountToUpdate.role,
          tutorId: nextAccountId == null ? null : tutorId,
        },
      },
      {
        onSuccess: () => {
          toast.success(
            nextAccountId == null
              ? "Workspace account unlinked"
              : "Workspace account assigned",
          );
          invalidateTutorLists();
          queryClient.invalidateQueries({
            queryKey: getGetWorkspaceSessionQueryKey(),
          });
        },
        onError: () => {
          toast.error("Failed to update the workspace account");
        },
      },
    );
  };

  if (!isLoading && !isOwner) {
    return (
      <div className="mx-auto flex min-h-[50vh] w-full max-w-xl flex-col items-center justify-center p-6 text-center md:p-12">
        <h1 className="mb-3 font-serif text-3xl">Owner access required</h1>
        <p className="mb-6 text-sm text-muted-foreground">
          Tutor profiles can only be managed by the agency owner.
        </p>
        <Link href="/workspace">
          <Button variant="outline" className="rounded-none">
            Back to overview
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl p-6 md:p-12">
      <div className="mb-10 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="mb-2 font-serif text-3xl text-foreground">
            Tutor profiles
          </h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Manage tutor profiles separately from Workspace access. Published
            profiles appear on the public site; drafts and archived profiles
            stay private.
          </p>
        </div>
        <Button
          type="button"
          className="rounded-none"
          onClick={() => setIsCreateOpen(true)}
          data-testid="button-create-tutor-profile"
        >
          <Plus size={15} />
          Create profile
        </Button>
      </div>

      <section aria-label="Tutor profile records">
        <div className="mb-3 flex justify-end">
          {!isLoading && tutors && (
            <span className="text-xs text-muted-foreground">
              {tutors.length} {tutors.length === 1 ? "profile" : "profiles"}
            </span>
          )}
        </div>

        {tutorsError ? (
          <div className="border border-destructive/40 bg-destructive/10 p-5 text-sm text-destructive">
            We could not load the tutor profiles. Try refreshing the page.
          </div>
        ) : (
          <div className="overflow-x-auto border border-border bg-card">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="min-w-[260px] font-semibold text-xs uppercase tracking-wider text-muted-foreground">
                    Tutor
                  </TableHead>
                  <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">
                    Profile status
                  </TableHead>
                   <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">
                     View
                   </TableHead>
                  <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">
                    Workspace account
                  </TableHead>
                  <TableHead className="text-right font-semibold text-xs uppercase tracking-wider text-muted-foreground">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  [1, 2, 3].map((row) => (
                    <TableRow key={row} className="border-border">
                      <TableCell>
                        <Skeleton className="mb-1 h-4 w-36" />
                        <Skeleton className="h-3 w-24" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-6 w-20" />
                      </TableCell>
                       <TableCell>
                         <Skeleton className="h-8 w-16" />
                       </TableCell>
                      <TableCell>
                        <Skeleton className="mb-1 h-4 w-32" />
                        <Skeleton className="h-3 w-44" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="ml-auto h-8 w-24" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : tutors && tutors.length > 0 ? (
                  tutors.map((tutor) => {
                    const account = accounts?.find(
                      (item) => item.tutorId === tutor.id,
                    );

                    return (
                      <TableRow key={tutor.id} className="border-border">
                        <TableCell>
                          <div
                            className="font-medium"
                            data-testid={`text-tutor-profile-${tutor.id}`}
                          >
                            {tutor.name}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {tutor.subject || "Subject not added"}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              tutor.profileStatus === "published"
                                ? "secondary"
                                : tutor.profileStatus === "archived"
                                  ? "destructive"
                                : "outline"
                            }
                            className="rounded-none text-[11px] font-normal"
                            data-testid={`status-tutor-profile-${tutor.id}`}
                          >
                            {tutor.profileStatus === "published"
                              ? "Published"
                              : tutor.profileStatus === "archived"
                                ? "Archived"
                              : "Draft"}
                          </Badge>
                        </TableCell>
                         <TableCell>
                           {tutor.profileStatus === "published" ? (
                             <a
                               href={`/tutors/${tutor.slug}`}
                               target="_blank"
                               rel="noreferrer"
                               className="inline-flex h-8 w-8 items-center justify-center rounded-none text-muted-foreground hover:bg-muted hover:text-foreground"
                               aria-label={`View ${tutor.name}'s public profile`}
                               title="View public profile"
                               data-testid={`link-view-tutor-profile-${tutor.id}`}
                             >
                               <ExternalLink size={14} />
                               <span className="sr-only">View public profile</span>
                             </a>
                           ) : (
                             <span className="text-xs text-muted-foreground">
                               Not public
                             </span>
                           )}
                         </TableCell>
                         <TableCell>
                           <div className="flex flex-col items-start gap-2">
                             <Select
                               value={account ? String(account.id) : "none"}
                               onValueChange={(value) =>
                                 handleAccountChange(tutor.id, value)
                               }
                               disabled={updateAccount.isPending}
                             >
                               <SelectTrigger
                                 className="h-8 w-[220px] rounded-none border-border bg-transparent text-xs shadow-none"
                                 aria-label={`Workspace account for ${tutor.name}`}
                                 data-testid={`select-tutor-account-${tutor.id}`}
                               >
                                 <SelectValue placeholder="Assign account" />
                               </SelectTrigger>
                               <SelectContent className="rounded-none border-border shadow-md">
                                 <SelectItem
                                   value="none"
                                   className="rounded-none text-xs italic text-muted-foreground"
                                 >
                                   No account linked
                                 </SelectItem>
                                 {accounts
                                   ?.filter(
                                     (item) =>
                                       item.role === "tutor" &&
                                       (item.tutorId == null ||
                                         item.tutorId === tutor.id),
                                   )
                                   .map((item) => (
                                     <SelectItem
                                       key={item.id}
                                       value={String(item.id)}
                                       className="rounded-none text-xs"
                                     >
                                       {item.displayName} · {item.email}
                                     </SelectItem>
                                   ))}
                               </SelectContent>
                             </Select>
                             {account && (
                               <div className="text-xs text-muted-foreground">
                                 {account.email}
                               </div>
                             )}
                           </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <button
                                  type="button"
                                  className={`inline-flex h-8 items-center gap-2 rounded-none px-2 text-xs ${
                                    tutor.profileStatus === "archived"
                                      ? "text-muted-foreground hover:bg-muted hover:text-foreground"
                                      : "text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                                  }`}
                                  disabled={isLifecyclePending}
                                  data-testid={`${tutor.profileStatus === "archived" ? "button-restore" : "button-archive"}-tutor-profile-${tutor.id}`}
                                >
                                  {tutor.profileStatus === "archived" ? (
                                    <RotateCcw size={14} />
                                  ) : (
                                    <Archive size={14} />
                                  )}
                                  {tutor.profileStatus === "archived"
                                    ? "Restore"
                                    : "Archive"}
                                </button>
                              </AlertDialogTrigger>
                              <AlertDialogContent className="rounded-none border-border">
                                <AlertDialogHeader>
                                  <AlertDialogTitle className="font-serif">
                                    {tutor.profileStatus === "archived"
                                      ? `Restore ${tutor.name}'s profile?`
                                      : `Archive ${tutor.name}'s profile?`}
                                  </AlertDialogTitle>
                                  <AlertDialogDescription>
                                    {tutor.profileStatus === "archived"
                                      ? "This restores the profile as Not published. Its details and resources are kept, but it will stay private until the profile is published again."
                                      : "This hides the profile from the public site and keeps its resources, enquiries, and Workspace account intact. You can restore it later as a draft."}
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel className="rounded-none">
                                    Cancel
                                  </AlertDialogCancel>
                                  <AlertDialogAction
                                    className={
                                      tutor.profileStatus === "archived"
                                        ? "rounded-none"
                                        : "rounded-none bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    }
                                    onClick={() =>
                                      tutor.profileStatus === "archived"
                                        ? handleRestore(tutor.id, tutor.slug)
                                        : handleArchive(tutor.id, tutor.slug)
                                    }
                                    disabled={isLifecyclePending}
                                    data-testid={`${tutor.profileStatus === "archived" ? "button-confirm-restore" : "button-confirm-archive"}-tutor-profile-${tutor.id}`}
                                  >
                                    {tutor.profileStatus === "archived"
                                      ? "Restore as draft"
                                      : "Archive profile"}
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="h-28 text-center text-sm text-muted-foreground"
                    >
                      No tutor profiles yet. Create a draft profile to get started.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </section>

      <TutorFormDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onCreated={handleCreated}
      />
    </div>
  );
}