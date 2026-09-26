import { SignUp } from "@clerk/react";
import { ArrowLeft, PenLine } from "lucide-react";
import { Link } from "wouter";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function SignUpPage() {
  return (
    <div className="flex-1 px-6 md:px-8 py-12 md:py-20 bg-secondary/35">
      <div className="max-w-[1020px] mx-auto grid md:grid-cols-[.8fr_1fr] gap-10 md:gap-20 items-center">
        <div className="hidden md:block">
          <Link href="/" className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[.16em] font-bold text-muted-foreground hover:text-primary transition-colors mb-16">
            <ArrowLeft size={13} /> Back to the site
          </Link>
          <PenLine className="text-primary mb-7" size={28} strokeWidth={1.4} />
          <p className="text-[11px] uppercase tracking-[.18em] text-primary font-bold mb-4">A considered place to write</p>
          <h1 className="font-serif text-[clamp(44px,5vw,72px)] leading-[.93] tracking-tight mb-6">Bring your<br /><em>point of view.</em></h1>
          <p className="text-sm leading-7 text-muted-foreground max-w-[350px]">Join a small community of women tutors sharing practical, generous subject knowledge.</p>
        </div>
        <div className="bg-card border border-border p-7 md:p-10">
          <div className="mb-8 max-w-sm">
            <p className="text-[10px] uppercase tracking-[.16em] text-primary font-bold mb-3">Workspace access</p>
            <h2 className="text-3xl font-serif text-foreground mb-3">By invitation.</h2>
            <p className="text-muted-foreground text-sm leading-6">Use your approved email to create a workspace account. Your profile will be reviewed before publication.</p>
          </div>
          <SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} forceRedirectUrl={`${basePath}/workspace`} />
        </div>
      </div>
    </div>
  );
}
