import * as React from "react";
import { useListTutors } from "@workspace/api-client-react";
import { ArrowRight } from "lucide-react";
import { Link } from "wouter";
import { ErrorState } from "@/components/ErrorState";
import { LoadingState } from "@/components/LoadingState";
import {
  publicTutorQueryOptions,
  publicTutorRequestOptions,
} from "@/lib/public-tutor-query";

const availabilityLabels = {
  accepting: "Available",
  limited: "Limited",
  unavailable: "Unavailable",
} as const;

const availabilityDotClasses = {
  accepting: "bg-green-600",
  limited: "bg-amber-500",
  unavailable: "bg-red-500",
} as const;

export default function Home() {
  const { data: tutors, isLoading: tutorsLoading, error: tutorsError, refetch: refetchTutors } = useListTutors({
    query: publicTutorQueryOptions,
    request: publicTutorRequestOptions,
  });

  const handleJump = (id: string) => {
    const target = document.getElementById(id);
    target?.scrollIntoView({ behavior: "smooth" });
    target?.focus({ preventScroll: true });
  };

  return (
    <main className="flex-1" data-testid="page-home">
      {/* Hero Section */}
      <section aria-labelledby="home-hero-title" className="max-w-[1210px] mx-auto px-6 md:px-[30px] pt-[48px] md:pt-[72px] pb-[64px] md:pb-[82px] grid grid-cols-1 md:grid-cols-[1fr_330px] gap-[40px] md:gap-[70px] items-end" id="top">
        <div>
          <span className="block uppercase tracking-[0.17em] text-[10px] font-bold text-primary mb-4" data-testid="hero-kicker">
            A boutique tutoring agency for young women
          </span>
          <h1 id="home-hero-title" className="font-serif text-[clamp(48px,6vw,84px)] leading-[0.91] tracking-tight mb-[25px]" data-testid="hero-title">
            Academic excellence,<br /><em>personalised for her.</em>
          </h1>
          <p className="max-w-[610px] text-muted-foreground text-[16px] leading-[1.65] mb-[30px]" data-testid="hero-copy">
            Well Tutored offers thoughtful, one-to-one support for female secondary and A-level students, led by women tutors with deep subject expertise.
          </p>
          <button 
            className="bg-foreground text-background inline-flex items-center gap-2.5 px-[18px] py-[14px] text-[12px] font-bold hover:bg-primary transition-colors"
            onClick={() => handleJump("tutors")}
            data-testid="button-browse-tutors"
          >
            Meet our tutors <ArrowRight size={15} />
          </button>
        </div>
        <aside className="border-l border-border pl-[26px] pb-1 text-muted-foreground text-[13px] leading-[1.6]">
          <strong className="block text-foreground font-serif text-[24px] font-normal mb-[9px]">
            Women tutors.<br />Thoughtful, expert support.
          </strong>
          Support for the subject in front of you, and the person doing the learning.
        </aside>
      </section>

      {/* Tutors Section */}
      <section className="bg-secondary px-6 md:px-[30px] py-[64px] md:py-[82px] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary" id="tutors" tabIndex={-1} aria-labelledby="home-tutors-title">
        <div className="max-w-[1150px] mx-auto">
          <div className="flex flex-col md:flex-row justify-between md:items-end gap-[20px] md:gap-[40px] mb-[42px]">
            <div>
              <span className="block uppercase tracking-[0.17em] text-[10px] font-bold text-primary mb-4">Meet our tutors</span>
              <h2 id="home-tutors-title" className="font-serif text-[clamp(43px,5vw,68px)] leading-[0.91] tracking-tight m-0">
                People, not<br /><em>profiles.</em>
              </h2>
            </div>
            <p className="text-muted-foreground max-w-[360px] text-[14px] leading-[1.6] m-0">
              Get to know the women behind the lessons: their subjects, university backgrounds, qualifications and the distinct feel they bring to a session.
            </p>
          </div>

          {tutorsLoading ? (
            <LoadingState variant="tutor-grid" message="Loading tutors..." />
          ) : tutorsError ? (
            <ErrorState
              message="We couldn't load the tutor profiles. Please try again."
              onRetry={refetchTutors}
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-[14px]" data-testid="tutor-grid">
              {(tutors || []).map((tutor) => (
                <Link href={`/tutors/${tutor.slug}`} key={tutor.id} className="bg-card p-[24px] text-left min-h-[285px] h-full transition-transform hover:-translate-y-1 flex flex-col border border-transparent hover:border-primary/20" data-testid={`tutor-card-${tutor.slug}`}>
                  <div className="flex items-start justify-between gap-[12px] mb-[20px]">
                    <div className="min-w-0">
                      <span className="block text-[12px] text-primary font-bold mb-1">{tutor.subject}</span>
                      <h3 className="font-serif text-[27px] leading-none m-0 tracking-tight">{tutor.name}</h3>
                    </div>
                    <span
                      className="inline-flex shrink-0 items-center gap-[6px] rounded-full px-[9px] py-[6px] text-[9px] uppercase tracking-[0.1em] font-bold text-foreground/80"
                      style={{ backgroundColor: tutor.tint }}
                      aria-label={`Availability: ${availabilityLabels[tutor.availability]}`}
                    >
                      <span className={`w-[7px] h-[7px] rounded-full ${availabilityDotClasses[tutor.availability]}`} aria-hidden="true" />
                      {availabilityLabels[tutor.availability]}
                    </span>
                  </div>
                  <p className="text-[12px] text-muted-foreground leading-[1.55] mt-0 mb-[20px] flex-1 line-clamp-3">
                    {tutor.profileSummary}
                  </p>
                  <div className="border-t border-border pt-[13px] text-[11px] text-muted-foreground flex justify-between gap-[12px] mt-auto">
                    <span><b className="text-foreground font-semibold">{tutor.university}</b><br />{tutor.qualification}</span>
                    <span className="text-right max-w-[100px]">{tutor.style}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}

        </div>
      </section>

      {/* Enquiry Section */}
      <section className="bg-foreground text-background px-6 md:px-[30px] py-[64px] md:py-[82px]">
        <div className="max-w-[1150px] mx-auto grid grid-cols-1 md:grid-cols-[0.9fr_1.1fr] gap-[40px] md:gap-[75px] items-start">
          <div>
            <span className="block uppercase tracking-[0.17em] text-[10px] font-bold text-primary mb-4">Direct enquiry</span>
            <h2 className="font-serif text-[clamp(45px,13vw,68px)] leading-[0.91] tracking-tight m-0 mb-[25px]">
              Let’s talk<br /><em>tutoring.</em>
            </h2>
            <p className="text-[#CEC1B4] max-w-[400px] leading-[1.65] text-[14px]">
              Choose the tutor you are interested in, then tell us a little about what you need. Well Tutored records the enquiry securely so the team can review it and respond.
            </p>
            <div className="mt-[28px] grid gap-[12px]">
              <div className="flex items-center gap-[10px] text-[12px] text-[#E5D8CD]">
                <span className="w-[24px] h-[24px] border border-[#81766D] rounded-full flex items-center justify-center font-serif text-[13px] text-[#E7C5B5] pb-0.5">1</span>
                Choose a named tutor from the profiles above
              </div>
              <div className="flex items-center gap-[10px] text-[12px] text-[#E5D8CD]">
                <span className="w-[24px] h-[24px] border border-[#81766D] rounded-full flex items-center justify-center font-serif text-[13px] text-[#E7C5B5] pb-0.5">2</span>
                Share the subject and school level
              </div>
              <div className="flex items-center gap-[10px] text-[12px] text-[#E5D8CD]">
                <span className="w-[24px] h-[24px] border border-[#81766D] rounded-full flex items-center justify-center font-serif text-[13px] text-[#E7C5B5] pb-0.5">3</span>
                Well Tutored reviews your named-tutor enquiry
              </div>
            </div>
          </div>

          <div className="bg-card text-foreground p-8 md:p-10 self-stretch flex flex-col justify-center">
            <span className="block uppercase tracking-[0.15em] text-[10px] font-bold text-primary mb-4">
              Ready when you are
            </span>
            <h3 className="font-serif text-[32px] md:text-[40px] leading-[0.98] tracking-tight mb-4">
              Find the right
              <br />
              <em>fit.</em>
            </h3>
            <p className="text-muted-foreground text-[13px] leading-[1.6] max-w-[360px] mb-7">
              Choose a tutor on the full enquiry page, then tell us a little
              about the student and the support that would help.
            </p>
            <Link
              href="/enquire"
              className="bg-foreground text-background text-[12px] font-bold px-6 py-4 hover:bg-primary transition-colors inline-flex items-center justify-center gap-2 w-fit"
              data-testid="button-home-enquire"
            >
              Make an enquiry <ArrowRight size={15} />
            </Link>
            <p className="text-muted-foreground text-[11px] leading-[1.5] mt-4 mb-0">
              Your details are shared securely and only for this enquiry and
              its record.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
