import * as React from "react";

interface LoadingStateProps {
  message?: string;
  variant?: "page" | "tutor-grid";
}

export function LoadingState({ message = "Loading...", variant = "page" }: LoadingStateProps) {
  if (variant === "tutor-grid") {
    return (
      <div
        className="space-y-5"
        data-testid="tutor-loading-state"
        role="status"
        aria-live="polite"
        aria-busy="true"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-[14px]" aria-hidden="true">
          {Array.from({ length: 3 }, (_, index) => (
            <div
              className="bg-card p-[24px] min-h-[285px] border border-transparent"
              data-testid={`tutor-card-skeleton-${index + 1}`}
              key={index}
            >
              <div className="flex items-start justify-between gap-3 mb-5">
                <div className="space-y-2">
                  <div className="h-3 w-20 rounded-full skeleton-shimmer" />
                  <div className="h-7 w-36 rounded skeleton-shimmer" />
                </div>
                <div className="h-6 w-20 rounded-full skeleton-shimmer" />
              </div>
              <div className="space-y-2 mb-5">
                <div className="h-3 w-full rounded skeleton-shimmer" />
                <div className="h-3 w-11/12 rounded skeleton-shimmer" />
                <div className="h-3 w-4/5 rounded skeleton-shimmer" />
              </div>
              <div className="border-t border-border pt-[13px] space-y-2">
                <div className="h-3 w-32 rounded skeleton-shimmer" />
                <div className="h-3 w-24 rounded skeleton-shimmer" />
              </div>
            </div>
          ))}
        </div>
        <p
          className="text-muted-foreground text-[12px] uppercase tracking-[0.16em] font-semibold"
          data-testid="loading-message"
        >
          {message}
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-[420px] flex flex-col justify-center py-20 px-6" data-testid="loading-state" role="status" aria-live="polite" aria-busy="true">
      <div className="max-w-[1150px] w-full mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_300px] gap-10 items-end mb-14">
          <div className="space-y-4">
            <div className="h-3 w-28 rounded-full skeleton-shimmer" />
            <div className="h-16 md:h-24 max-w-[580px] rounded skeleton-shimmer" />
            <div className="h-4 max-w-[500px] rounded skeleton-shimmer" />
            <div className="h-4 max-w-[420px] rounded skeleton-shimmer" />
          </div>
          <div className="hidden md:block h-28 border-l border-border pl-6">
            <div className="h-5 w-40 rounded skeleton-shimmer mb-3" />
            <div className="h-3 w-full rounded skeleton-shimmer mb-2" />
            <div className="h-3 w-4/5 rounded skeleton-shimmer" />
          </div>
        </div>
        <div className="editorial-rule mb-8" />
        <p className="text-muted-foreground text-[12px] uppercase tracking-[0.16em] font-semibold" data-testid="loading-message">{message}</p>
      </div>
    </div>
  );
}
