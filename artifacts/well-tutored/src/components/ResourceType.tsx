import type { ComponentProps } from "react";
import { getResourceTypeMeta } from "@/lib/resource-types";

type ResourceTypeIconProps = Omit<ComponentProps<"svg">, "children"> & {
  type: string;
  size?: number;
};

export function ResourceTypeIcon({
  type,
  size = 14,
  ...props
}: ResourceTypeIconProps) {
  const { Icon } = getResourceTypeMeta(type);
  return <Icon size={size} {...props} />;
}

type ResourceTypeLabelProps = ResourceTypeIconProps & {
  children?: never;
};

export function ResourceTypeLabel({
  type,
  size = 13,
  className,
  ...props
}: ResourceTypeLabelProps) {
  return (
    <span className={`inline-flex items-center gap-1.5 ${className ?? ""}`}>
      <ResourceTypeIcon type={type} size={size} aria-hidden="true" {...props} />
      {type}
    </span>
  );
}