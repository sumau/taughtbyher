import './_group.css';
import { ArrowRight, CalendarDays, Check, ShieldCheck } from 'lucide-react';
import { useState } from 'react';

export function BookingSuccess() {
  const [opened, setOpened] = useState(false);

  return (
    <main className="min-h-screen bg-background px-5 py-10 sm:px-10">
      <div className="mx-auto max-w-[680px]">
        <div className="mb-8">
          <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.16em] text-primary">
            Direct enquiry
          </p>
          <h1 className="mb-3 text-[42px] leading-[0.95] tracking-tight text-foreground sm:text-[52px]">
            Ask about<br /><em>Jane.</em>
          </h1>
          <p className="max-w-[520px] text-[14px] leading-[1.6] text-muted-foreground">
            A clear next step after the form, without making booking feel mandatory.
          </p>
        </div>

        <section
          className="border border-border bg-card px-6 py-9 text-center sm:px-10"
          aria-labelledby="success-heading"
        >
          <div className="mx-auto mb-6 flex h-[50px] w-[50px] items-center justify-center rounded-full bg-accent text-accent-foreground">
            <Check size={24} />
          </div>
          <span className="mb-3 block text-[10px] font-bold uppercase tracking-[0.15em] text-primary">
            Message delivered
          </span>
          <h2 id="success-heading" className="mb-4 text-[34px] leading-[1.05] tracking-tight sm:text-[40px]">
            Safely delivered<br /><em>to Well Tutored.</em>
          </h2>
          <p className="mx-auto mb-8 max-w-[380px] text-[14px] leading-[1.6] text-muted-foreground">
            Your enquiry for Jane has been sent securely. If you are ready to talk, you can choose a time that works for you.
          </p>

          <div className="mx-auto max-w-[430px] border border-border bg-background p-5 text-left">
            <div className="mb-4 flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center bg-secondary text-primary">
                <CalendarDays size={18} />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-primary">Optional next step</p>
                <h3 className="mt-1 text-[22px] leading-[1.05] tracking-tight">Book an introductory call</h3>
              </div>
            </div>
            <p className="mb-5 text-[12px] leading-[1.55] text-muted-foreground">
              Jane manages her own availability. Choose a time on her secure scheduling page; the calendar invite will be sent automatically.
            </p>
            <button
              type="button"
              onClick={() => setOpened(true)}
              className="inline-flex w-full items-center justify-center gap-2 bg-foreground px-5 py-3.5 text-[12px] font-bold text-background transition-colors hover:bg-primary"
            >
              {opened ? 'Scheduling page opened' : 'Choose a time with Jane'}
              <ArrowRight size={14} />
            </button>
            <p className="mt-3 text-center text-[10px] text-muted-foreground">
              Opens Jane&apos;s Cal.com page in a new tab
            </p>
          </div>

          <button
            type="button"
            className="mt-8 inline-flex items-center justify-center gap-2 border border-border bg-transparent px-5 py-3 text-[12px] font-bold text-foreground transition-colors hover:border-primary hover:text-primary"
          >
            Send another enquiry <ArrowRight size={14} />
          </button>
        </section>

        <div className="mt-5 flex items-start gap-3 text-[11px] leading-[1.5] text-muted-foreground">
          <ShieldCheck size={18} className="shrink-0 text-primary" />
          <p>Your enquiry details stay private and are used only to respond to this request.</p>
        </div>
      </div>
    </main>
  );
}