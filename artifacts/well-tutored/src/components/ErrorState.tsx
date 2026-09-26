import * as React from "react";
import { AlertCircle, RotateCcw } from "lucide-react";

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({ message = "Something went wrong loading this content.", onRetry }: ErrorStateProps) {
  return (
    <section
      className="flex flex-col items-center justify-center py-20 px-6 text-center"
      data-testid="error-state"
      role="alert"
      aria-labelledby="error-state-title"
    >
      <div className="w-[50px] h-[50px] rounded-full bg-destructive/10 text-destructive flex items-center justify-center mb-5">
        <AlertCircle size={22} />
      </div>
      <h3 id="error-state-title" className="font-serif text-[24px] tracking-tight text-foreground mb-2">Could not load data</h3>
      <p className="text-muted-foreground text-[14px] max-w-[300px] mb-6">{message}</p>
      
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="flex items-center gap-2 border border-border px-5 py-2.5 text-[12px] font-bold text-foreground hover:bg-foreground hover:text-background transition-colors"
          data-testid="button-retry"
        >
          <RotateCcw size={14} /> Try again
        </button>
      )}
    </section>
  );
}
