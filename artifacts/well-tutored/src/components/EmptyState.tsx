import { SearchX } from "lucide-react";

export function EmptyState({ title = "Nothing found", message = "We couldn't find what you're looking for." }: { title?: string, message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 px-6 text-center" data-testid="empty-state">
      <div className="w-[60px] h-[60px] rounded-full bg-card border border-border text-muted-foreground flex items-center justify-center mb-5">
        <SearchX size={24} />
      </div>
      <h3 className="font-serif text-[24px] tracking-tight text-foreground mb-2">{title}</h3>
      <p className="text-muted-foreground text-[14px] max-w-[320px]">{message}</p>
    </div>
  );
}
