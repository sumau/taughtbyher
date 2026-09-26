import { SignIn } from "@clerk/react";
import { ArrowLeft, BookOpenCheck } from "lucide-react";
import { Link } from "wouter";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function SignInPage() {
  const next = new URLSearchParams(window.location.search).get("next");
  const redirectUrl =
    next?.startsWith("/") && !next.startsWith("//") ? next : "/workspace";

  return (
    <div className="flex-1 px-6 md:px-8 py-12 md:py-20 bg-secondary/35">
      <div className="max-w-[1020px] mx-auto grid md:grid-cols-[.8fr_1fr] gap-10 md:gap-20 items-center">
        <div className="hidden md:block">
          <Link href="/" className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[.16em] font-bold text-muted-foreground hover:text-primary transition-colors mb-16">
            <ArrowLeft size={13} /> Back to the site
          </Link>
          <BookOpenCheck className="text-primary mb-7" size={28} strokeWidth={1.4} />
          <p className="text-[11px] uppercase tracking-[.18em] text-primary font-bold mb-4">The Well Tutored workspace</p>
          <h1 className="font-serif text-[clamp(44px,5vw,72px)] leading-[.93] tracking-tight mb-6">Good teaching<br /><em>starts with care.</em></h1>
          <p className="text-sm leading-7 text-muted-foreground max-w-[350px]">Keep your profile, thoughtful resources and tutor introductions in one calm place.</p>
        </div>
        <div className="bg-card border border-border p-7 md:p-10">
          <div className="mb-8 max-w-sm">
            <p className="text-[10px] uppercase tracking-[.16em] text-primary font-bold mb-3">Workspace access</p>
            <h2 className="text-3xl font-serif text-foreground mb-3">Welcome back.</h2>
            <p className="text-muted-foreground text-sm leading-6">Sign in to manage your profile and writing.</p>
          </div>
          <SignIn
            routing="path"
            path={`${basePath}/sign-in`}
            signUpUrl={`${basePath}/sign-up`}
            forceRedirectUrl={`${basePath}${redirectUrl}`}
          />
        </div>
      </div>
    </div>
  );
}
