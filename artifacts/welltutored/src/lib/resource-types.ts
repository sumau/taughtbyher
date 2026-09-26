import {
  BookOpenText,
  ClipboardCheck,
  FileText,
  PenLine,
  type LucideIcon,
} from "lucide-react";

export const RESOURCE_TYPES = [
  "Study note",
  "Guide",
  "Essay",
  "Revision notes",
] as const;

export type ResourceType = (typeof RESOURCE_TYPES)[number];

export const resourceTypeMeta: Record<
  ResourceType,
  { label: ResourceType; Icon: LucideIcon }
> = {
  "Study note": { label: "Study note", Icon: BookOpenText },
  Guide: { label: "Guide", Icon: FileText },
  Essay: { label: "Essay", Icon: PenLine },
  "Revision notes": { label: "Revision notes", Icon: ClipboardCheck },
};

export function getResourceTypeMeta(type: string) {
  return (
    resourceTypeMeta[type as ResourceType] ?? resourceTypeMeta["Study note"]
  );
}