import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useAuth, useClerk } from "@clerk/react";
import { useGetWorkspaceSession } from "@workspace/api-client-react";
import { FileText, Inbox, LayoutDashboard, UserRound, UsersRound } from "lucide-react";

export function WorkspaceLayout({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn } = useAuth();
  const { signOut } = useClerk();
  const [location] = useLocation();
  const { data: session } = useGetWorkspaceSession({
    query: {
      enabled: isLoaded && isSignedIn,
      retry: false,
    },
  });
  const navigation = [
    { href: "/workspace", label: "Overview", icon: LayoutDashboard },
    { href: "/workspace/enquiries", label: "Enquiries", icon: Inbox },
    { href: "/workspace/profile", label: "Tutor profile", icon: UserRound },
    { href: "/workspace/resources/new", label: "Write resource", icon: FileText },
    ...(session?.role === "owner"
      ? [
          { href: "/workspace/tutors", label: "Tutor profiles", icon: UserRound },
          { href: "/workspace/accounts", label: "Accounts", icon: UsersRound },
        ]
      : []),
  ];

  return (
    <div className="min-h-[100dvh] flex flex-col font-sans bg-background text-foreground overflow-x-hidden selection:bg-primary/20 selection:text-foreground">
      <nav className="min-h-[64px] w-full px-6 py-3 flex items-center justify-between border-b border-border bg-card">
        <Link
          href="/"
          className="flex items-center gap-2 font-bold text-[16px] tracking-tight hover:text-primary transition-colors"
        >
          <div className="w-[24px] h-[24px] rounded-full bg-primary flex items-center justify-center text-primary-foreground font-serif text-[16px] font-normal pb-0.5">
            w
          </div>
          taught by her
        </Link>
        <div className="flex items-center gap-4 text-[12px] font-semibold text-muted-foreground">
          <Link
            href="/"
            className="hidden sm:inline hover:text-foreground transition-colors"
          >
            Back to Site
          </Link>
          <span className="w-1 h-1 rounded-full bg-border" />
          <button
            type="button"
            onClick={() => signOut()}
            className="hover:text-foreground transition-colors"
            data-testid="workspace-sign-out"
          >
            Sign out
          </button>
        </div>
      </nav>
      <div className="border-b border-border bg-card/75 px-6 overflow-x-auto">
        <div className="max-w-[1240px] mx-auto flex items-center gap-1 min-w-max">
          {navigation.map(({ href, label, icon: Icon }) => {
            const active = href === "/workspace"
              ? location === "/workspace"
              : location.startsWith(href.replace("/new", ""));
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-2 px-3 py-3.5 text-[11px] font-semibold border-b-2 transition-colors ${active ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}
                data-testid={`workspace-nav-${label.toLowerCase().replace(/\s+/g, "-")}`}
              >
                <Icon size={14} strokeWidth={1.8} /> {label}
              </Link>
            );
          })}
        </div>
      </div>
      <div className="flex-1 flex flex-col">{children}</div>
    </div>
  );
}