export const TUTOR_ACCENT_VALUES = [
  "#D98F7F",
  "#D8B267",
  "#B5A1CC",
  "#83B7B0",
  "#9DBB83",
  "#8EA8CE",
  "#C98B9B",
  "#A88DBD",
  "#7FA6A0",
  "#8B9FC2",
  "#D08C76",
  "#C2A06E",
  "#B48C9E",
  "#8C8FB5",
  "#73A9A1",
  "#8FAE7E",
  "#A997C7",
  "#7899B5",
  "#C18A9A",
  "#9C9A72",
] as const;

export type TutorAccent = (typeof TUTOR_ACCENT_VALUES)[number];

export const TUTOR_ACCENTS: ReadonlyArray<{
  value: TutorAccent;
  label: string;
}> = [
  { value: "#D98F7F", label: "Coral" },
  { value: "#D8B267", label: "Marigold" },
  { value: "#B5A1CC", label: "Lavender" },
  { value: "#83B7B0", label: "Teal" },
  { value: "#9DBB83", label: "Leaf" },
  { value: "#8EA8CE", label: "Blue" },
  { value: "#C98B9B", label: "Rose" },
  { value: "#A88DBD", label: "Plum" },
  { value: "#7FA6A0", label: "Sage" },
  { value: "#8B9FC2", label: "Slate" },
  { value: "#D08C76", label: "Terracotta" },
  { value: "#C2A06E", label: "Ochre" },
  { value: "#B48C9E", label: "Mauve" },
  { value: "#8C8FB5", label: "Periwinkle" },
  { value: "#73A9A1", label: "Seafoam" },
  { value: "#8FAE7E", label: "Moss" },
  { value: "#A997C7", label: "Orchid" },
  { value: "#7899B5", label: "Steel" },
  { value: "#C18A9A", label: "Berry" },
  { value: "#9C9A72", label: "Olive" },
];

export function normalizeTutorAccent(
  value: string | null | undefined,
): TutorAccent {
  const normalized = value?.toUpperCase() as TutorAccent | undefined;
  return normalized && TUTOR_ACCENT_VALUES.includes(normalized)
    ? normalized
    : "#8EA8CE";
}