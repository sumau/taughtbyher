import { useListTutors } from "@workspace/api-client-react";
import { ArrowLeft, ArrowRight, ShieldCheck } from "lucide-react";
import { Link } from "wouter";
import { EnquiryForm } from "@/components/EnquiryForm";
import { ErrorState } from "@/components/ErrorState";
import { LoadingState } from "@/components/LoadingState";
import {
  publicTutorQueryOptions,
  publicTutorRequestOptions,
} from "@/lib/public-tutor-query";

export default function Enquiry() {
  const {
    data: tutors,
    isLoading,
    error,
    refetch,
  } = useListTutors({
    query: publicTutorQueryOptions,
    request: publicTutorRequestOptions,
  });

  if (isLoading) return <LoadingState message="Loading enquiry form..." />;
  if (error) {
    return (
      <ErrorState
        message="Could not load the available tutors."
        onRetry={refetch}
      />
    );
  }

  const contactableTutors = tutors?.filter((tutor) => tutor.availability !== "unavailable") ?? [];

  if (!contactableTutors.length) {
    return (
      <ErrorState
        message="There are no tutors available for enquiries at the moment."
        onRetry={refetch}
      />
    );
  }

  return (
    <main className="flex-1" data-testid="page-enquiry">
      <section className="bg-secondary px-6 md:px-[30px] pt-[48px] md:pt-[72px] pb-[54px] md:pb-[72px]">
        <div className="max-w-[1150px] mx-auto">
          <nav aria-label="Breadcrumb" className="mb-[44px]">
            <ol className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.13em] text-muted-foreground">
              <li><Link href="/" className="hover:text-primary transition-colors" data-testid="enquiry-back-link">Back to the tutors</Link></li>
              <li aria-hidden="true">/</li>
              <li aria-current="page" className="text-foreground">Enquiry</li>
            </ol>
          </nav>

          <div className="grid grid-cols-1 md:grid-cols-[1fr_330px] gap-[40px] md:gap-[70px] items-end">
            <div>
              <span className="block uppercase tracking-[0.18em] text-[10px] font-bold text-primary mb-4">
                Direct enquiry
              </span>
              <h1
                className="font-serif text-[clamp(51px,7vw,88px)] leading-[0.88] tracking-tight mb-[24px]"
                data-testid="enquiry-title"
              >
                Let&apos;s talk
                <br />
                <em>tutoring.</em>
              </h1>
              <p className="max-w-[570px] text-muted-foreground text-[15px] leading-[1.65]">
                Tell us which tutor you are interested in, then share a little
                about the student and the support that would help. We review
                every named-tutor enquiry and keep your details private.
              </p>
            </div>

            <aside className="border-l border-border pl-[26px] pb-1 text-muted-foreground text-[13px] leading-[1.6]">
              <ShieldCheck size={22} className="text-primary mb-[14px]" />
              <strong className="block text-foreground font-serif text-[24px] font-normal mb-[9px]">
                Thoughtful support,
                <br />
                clearly arranged.
              </strong>
              No tutor email addresses are published. Your enquiry is shared
              only for the purpose of making an introduction.
            </aside>
          </div>
        </div>
      </section>

      <section className="px-6 md:px-[30px] py-[56px] md:py-[82px]" aria-labelledby="enquiry-form-title">
        <div className="max-w-[1150px] mx-auto grid grid-cols-1 md:grid-cols-[0.82fr_1.18fr] gap-[40px] md:gap-[85px] items-start">
          <div className="md:pt-[18px]">
            <span className="block uppercase tracking-[0.17em] text-[10px] font-bold text-primary mb-4">
              How it works
            </span>
            <h2 className="font-serif text-[clamp(39px,5vw,62px)] leading-[0.92] tracking-tight mb-[25px]">
              Start with
              <br />
              <em>what she needs.</em>
            </h2>
            <div className="grid gap-[18px] text-[13px] leading-[1.6] text-muted-foreground">
              <div className="flex gap-[13px]">
                <span className="shrink-0 w-[26px] h-[26px] border border-border rounded-full flex items-center justify-center font-serif text-[14px] text-primary">
                  1
                </span>
                <p className="m-0">
                  Choose the tutor whose subject experience feels like the
                  right fit.
                </p>
              </div>
              <div className="flex gap-[13px]">
                <span className="shrink-0 w-[26px] h-[26px] border border-border rounded-full flex items-center justify-center font-serif text-[14px] text-primary">
                  2
                </span>
                <p className="m-0">
                  Share the student&apos;s age, subject, level and current
                  context.
                </p>
              </div>
              <div className="flex gap-[13px]">
                <span className="shrink-0 w-[26px] h-[26px] border border-border rounded-full flex items-center justify-center font-serif text-[14px] text-primary">
                  3
                </span>
                <p className="m-0">
                  Our team reviews the enquiry and helps arrange the next
                  step.
                </p>
              </div>
            </div>
            <Link
              href="/resources"
              className="mt-[34px] inline-flex items-center gap-2 text-[12px] font-bold text-foreground hover:text-primary transition-colors"
              data-testid="enquiry-resources-link"
            >
              Read our subject resources <ArrowRight size={14} />
            </Link>
          </div>

           <EnquiryForm tutors={contactableTutors} />
        </div>
      </section>
    </main>
  );
}