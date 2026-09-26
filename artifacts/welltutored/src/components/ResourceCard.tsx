import { format } from "date-fns";
import { Clock3 } from "lucide-react";
import type { Resource } from "@workspace/api-client-react";
import { Link } from "wouter";
import { ResourceTypeIcon } from "@/components/ResourceType";

type ResourceCardProps = {
  resource: Resource;
  index: number;
};

export function ResourceCard({ resource, index }: ResourceCardProps) {
  return (
    <Link
      href={`/resources/${resource.slug}`}
      className={`bg-card p-[25px] min-h-[280px] md:min-h-[310px] text-left border border-transparent hover:border-primary transition-all hover:-translate-y-1 relative flex flex-col items-start ${index % 3 === 1 ? "md:mt-[32px]" : ""}`}
      data-testid={`resource-card-${resource.slug}`}
    >
      <div className="w-full flex items-center justify-between mb-[43px]">
        <span
          className="w-[40px] h-[40px] rounded-full flex items-center justify-center text-foreground pb-0.5"
          style={{ backgroundColor: resource.tint }}
          aria-label={resource.type}
        >
          <ResourceTypeIcon type={resource.type} size={18} />
        </span>
        <time
          dateTime={resource.publishedAt}
          className="text-[11px] text-muted-foreground font-medium"
        >
          {format(new Date(resource.publishedAt), "MMM d, yyyy")}
        </time>
      </div>

      <span className="text-[10px] uppercase tracking-[0.12em] text-primary font-bold mb-3">
        {resource.type}
      </span>
      <h2 className="font-serif text-[28px] leading-[1.02] tracking-tight mb-[14px] text-foreground pr-4">
        {resource.title}
      </h2>
      <p className="text-[12px] text-muted-foreground leading-[1.55] max-w-[270px] m-0 mb-[60px] line-clamp-3">
        {resource.excerpt}
      </p>

      <div className="absolute left-[25px] right-[25px] bottom-[22px] flex justify-between gap-[9px] text-[10px] text-muted-foreground font-medium pt-3 border-t border-border">
        <span className="truncate">
          {resource.tutorName} · {resource.level}
        </span>
        <span className="flex items-center gap-[5px] shrink-0">
          <Clock3 size={12} /> {resource.readMinutes} min read
        </span>
      </div>
    </Link>
  );
}