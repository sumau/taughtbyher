import { ReactNode } from "react";
import { Link } from "wouter";
import { ArrowRight, Menu, X, ShieldCheck, PenTool } from "lucide-react";
import { useState } from "react";

export function Shell({
  children,
  isSignedIn,
}: {
  children: ReactNode;
  isSignedIn: boolean;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [policy, setPolicy] = useState<"safeguarding" | "privacy" | null>(null);

  const closeMenu = () => setMenuOpen(false);

  return (
    <div className="min-h-[100dvh] flex flex-col font-sans bg-background text-foreground overflow-x-hidden selection:bg-primary/20 selection:text-foreground">
      {/* Navigation */}
      <nav className="h-[82px] w-full max-w-[1210px] mx-auto px-6 md:px-[30px] flex items-center justify-between relative z-40">
        <Link href="/" className="flex items-center gap-2.5 font-bold text-[19px] tracking-tight hover:text-primary transition-colors" data-testid="nav-home">
          <div className="w-[30px] h-[30px] rounded-full bg-primary flex items-center justify-center text-primary-foreground font-serif text-[22px] font-normal pb-0.5">
            w
          </div>
          taught by her
        </Link>
        
        {/* Desktop Links */}
        <div className="hidden md:flex items-center gap-7 text-[12px] font-semibold">
          <Link href="/" className="hover:text-primary transition-colors" data-testid="nav-tutors">Meet our tutors</Link>
          <Link href="/resources" className="hover:text-primary transition-colors" data-testid="nav-resources">Insights & resources</Link>
          <Link href="/enquire" className="flex items-center gap-2 border-b border-foreground pb-1.5 hover:text-primary hover:border-primary transition-colors" data-testid="nav-enquire">
            Enquire <ArrowRight size={13} />
          </Link>
          <Link href={isSignedIn ? "/workspace" : "/sign-in"} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors" data-testid="nav-workspace">
            <PenTool size={14} /> {isSignedIn ? "Workspace" : "Workspace sign in"}
          </Link>
        </div>

        {/* Mobile Menu Toggle */}
        <button 
          className="md:hidden p-2 -mr-2 text-foreground hover:text-primary transition-colors"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label={menuOpen ? "Close navigation" : "Open navigation"}
          data-testid="nav-mobile-toggle"
        >
          {menuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </nav>

      {/* Mobile Menu Dropdown */}
      {menuOpen && (
        <div className="md:hidden absolute top-[82px] left-0 right-0 bg-card z-30 px-6 py-6 shadow-xl border-t border-border flex flex-col gap-4 text-[14px] font-medium" data-testid="nav-mobile-menu">
          <Link href="/" onClick={closeMenu} className="hover:text-primary" data-testid="nav-mobile-tutors">Meet our tutors</Link>
          <Link href="/resources" onClick={closeMenu} className="hover:text-primary" data-testid="nav-mobile-resources">Insights & resources</Link>
          <Link href="/enquire" onClick={closeMenu} className="text-primary flex items-center gap-2" data-testid="nav-mobile-enquire">Enquire <ArrowRight size={14} /></Link>
          <Link href={isSignedIn ? "/workspace" : "/sign-in"} onClick={closeMenu} className="text-muted-foreground hover:text-foreground flex items-center gap-2 pt-4 border-t border-border" data-testid="nav-mobile-workspace">
            <PenTool size={14} /> {isSignedIn ? "Workspace" : "Workspace sign in"}
          </Link>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {children}
      </div>

      {/* Footer */}
      <footer className="bg-[#302D29] text-[#F8F1E8] px-6 md:px-[30px] py-[45px] md:py-[60px]" data-testid="footer">
        <div className="max-w-[1150px] mx-auto grid grid-cols-1 md:grid-cols-12 gap-[40px] md:gap-[30px] text-[12px]">
          
          <div className="md:col-span-5">
            <Link href="/" className="flex items-center gap-2.5 font-bold text-[19px] tracking-tight mb-4" data-testid="footer-home">
              <div className="w-[30px] h-[30px] rounded-full bg-primary flex items-center justify-center text-primary-foreground font-serif text-[22px] font-normal pb-0.5">
                w
              </div>
              taught by her
            </Link>
            <p className="text-[#C9BFB4] leading-[1.65] max-w-[300px]">
              Women tutors supporting female secondary and A-level students.
            </p>
          </div>
          
          <div className="md:col-span-3 flex flex-col gap-3 items-start text-[#EADFD3]">
            <Link href="/" className="hover:text-primary transition-colors" data-testid="footer-tutors">Meet the tutors</Link>
            <Link href="/resources" className="hover:text-primary transition-colors" data-testid="footer-resources">Insights & resources</Link>
            <Link href="/enquire" className="hover:text-primary transition-colors" data-testid="footer-enquire">Make an enquiry</Link>
          </div>

          <div className="md:col-span-4 flex flex-col gap-3 items-start text-[#EADFD3]">
            <button onClick={() => setPolicy("safeguarding")} className="hover:text-primary transition-colors flex items-center gap-2" data-testid="footer-safeguarding">
               Safeguarding
            </button>
            <button onClick={() => setPolicy("privacy")} className="hover:text-primary transition-colors flex items-center gap-2" data-testid="footer-privacy">
               Privacy & cookies
            </button>
            {isSignedIn && (
              <Link href="/workspace" className="hover:text-primary transition-colors mt-2 text-[#968D82]">
                Workspace
              </Link>
            )}
          </div>

          <div className="col-span-1 md:col-span-12 mt-4 md:mt-8 pt-5 border-t border-[#5A524B] text-[11px] text-[#968D82] flex flex-col sm:flex-row justify-between gap-4">
            <span>© {new Date().getFullYear()} Taught by Her</span>
            <span>Academic excellence, personalised for her</span>
          </div>

        </div>
      </footer>

      {/* Policies Modals */}
      {policy && (
        <div 
          className="fixed inset-0 bg-[#3D3932]/70 z-50 flex justify-center items-center p-4 md:p-6 overflow-y-auto"
          onClick={() => setPolicy(null)}
          data-testid={`modal-${policy}`}
        >
          <div 
            className="bg-card w-full max-w-[530px] p-8 md:p-[45px] relative"
            onClick={e => e.stopPropagation()}
            role="dialog"
          >
            <button 
              className="absolute right-4 top-4 p-2 text-muted-foreground hover:text-primary"
              onClick={() => setPolicy(null)}
              data-testid="modal-close"
            >
              <X size={18} />
            </button>
            
            <ShieldCheck size={26} className="text-primary mb-5" />
            
            <span className="block text-[10px] font-bold tracking-[0.15em] uppercase text-primary mb-3">
              {policy === "safeguarding" ? "A safe, professional space" : "Clear by design"}
            </span>
            
            <h2 className="text-[36px] md:text-[45px] leading-[0.95] mb-5 tracking-tight">
              {policy === "safeguarding" ? <>Safeguarding<br/><em>comes first.</em></> : <>Privacy &<br/><em>cookies.</em></>}
            </h2>
            
            <div className="text-muted-foreground text-[14px] leading-[1.65] space-y-4">
              {policy === "safeguarding" ? (
                <>
                  <p>Taught by Her is designed for female secondary and A-level students. Enquiries involving under-18s should include a parent or guardian's contact details.</p>
                  <div className="mt-6 pt-5 border-t border-border text-[13px]">
                    <strong className="text-foreground block mb-1">Professional boundaries</strong>
                    Tutors communicate through agreed professional channels. Student information is not displayed publicly, and the agency keeps oversight of tutor enquiries and introductions.
                  </div>
                </>
              ) : (
                <>
                  <p>We only ask for the information needed to respond to an enquiry. Your details are not published on tutor profiles or shared for marketing.</p>
                  <div className="mt-6 pt-5 border-t border-border text-[13px]">
                    <strong className="text-foreground block mb-1">Your choices</strong>
                    You can unsubscribe from resource updates at any time. Any future analytics or cookies will be explained clearly before they are used.
                  </div>
                </>
              )}
            </div>

            <button 
              className="mt-8 bg-foreground text-background text-[12px] font-bold px-5 py-3 hover:bg-primary transition-colors flex items-center gap-2"
              onClick={() => setPolicy(null)}
            >
              Close <X size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
