import { useParams } from "wouter";
import * as React from "react";
import { useGetTutor, getGetTutorQueryKey, type Tutor } from "@workspace/api-client-react";
import { Link } from "wouter";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { ErrorState } from "@/components/ErrorState";
import { LoadingState } from "@/components/LoadingState";
import { EnquiryForm } from "@/components/EnquiryForm";
import { ResourceTypeLabel } from "@/components/ResourceType";
import {
  publicTutorQueryOptions,
  publicTutorRequestOptions,
} from "@/lib/public-tutor-query";

const availabilityDescriptions = {
  accepting: "Accepting enquiries",
  limited: "Limited availability",
  unavailable: "Not currently accepting enquiries",
} as const;

export function TutorEnquiry({ tutor }: { tutor: Tutor }) {
  return tutor.availability === "unavailable" ? (
    <div className="bg-card p-8 text-sm text-muted-foreground leading-[1.6]" data-testid="tutor-enquiry-unavailable">
      {tutor.name} is not currently accepting enquiries. Please check back later or choose another tutor.
    </div>
  ) : (
    <EnquiryForm tutor={tutor} compact={true} />
  );
}

export default function TutorProfile() {
  const { slug } = useParams<{ slug: string }>();
  const { data: tutor, isLoading, error, refetch } = useGetTutor(slug as string, {
    query: {
      ...publicTutorQueryOptions,
      enabled: !!slug,
      queryKey: getGetTutorQueryKey(slug as string),
    },
    request: publicTutorRequestOptions,
  });

  const jumpTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  if (isLoading) return <LoadingState message="Loading profile..." />;
  if (error || !tutor) return <ErrorState message="Could not find this tutor." onRetry={refetch} />;

  const firstName = tutor.name.split(' ')[0];

  return (
    <main className="flex-1" data-testid={`page-tutor-${tutor.slug}`}>
      {/* Breadcrumb / Nav */}
      <div className="max-w-[1210px] mx-auto px-6 md:px-[30px] pt-6 flex justify-between items-center text-[11px] text-muted-foreground font-medium">
        <Link href="/" className="inline-flex items-center gap-2 hover:text-primary transition-colors" data-testid="link-back">
          <ArrowLeft size={13} /> All tutors
        </Link>
        <div className="hidden sm:flex items-center gap-6">
          <button onClick={() => jumpTo('about')} className="hover:text-primary">About {firstName}</button>
          <button onClick={() => jumpTo('resources')} className="hover:text-primary">Her resources</button>
        </div>
      </div>

      {/* Hero */}
      <section className="max-w-[1210px] mx-auto px-6 md:px-[30px] py-[40px] md:py-[60px] grid grid-cols-1 md:grid-cols-[1.2fr_0.8fr] gap-[40px] md:gap-[80px] items-end border-b border-border mb-12">
        <div>
          <span className="block uppercase tracking-[0.17em] text-[10px] font-bold text-primary mb-4" data-testid="tutor-subject-kicker">
            {tutor.subject}
          </span>
          <h1 className="font-serif text-[clamp(55px,7vw,94px)] leading-[0.9] tracking-tight mb-[26px]" data-testid="tutor-name">
            {firstName}<br /><em>{tutor.name.split(' ').slice(1).join(' ')}.</em>
          </h1>
          <p className="max-w-[650px] text-muted-foreground text-[16px] leading-[1.65]" data-testid="tutor-intro">
            {tutor.profileSummary}
          </p>
        </div>
        
        <aside className="relative p-[30px] min-h-[295px] flex flex-col justify-between" style={{ backgroundColor: tutor.tint }}>
          <div>
            <div className="inline-flex items-center gap-[7px] rounded-full bg-card text-foreground px-3 py-2 text-[10px] font-bold border border-border shadow-sm">
              <i className={`w-2 h-2 rounded-full ${tutor.availability === 'accepting' ? 'bg-green-600' : tutor.availability === 'limited' ? 'bg-amber-500' : 'bg-red-500'}`} />
              {availabilityDescriptions[tutor.availability]}
            </div>
          </div>
          <div>
            <blockquote className="font-serif font-medium text-[20px] md:text-[22px] leading-[1.25] tracking-tight mt-[28px] max-w-[310px] text-foreground">
              {tutor.teachingIntro}
            </blockquote>
            <div className="text-[11px] text-foreground/70 mt-[18px] font-semibold">
              {firstName}'s approach
            </div>
          </div>
        </aside>
      </section>

      {/* About */}
      <section className="px-6 md:px-[30px] max-w-[1210px] mx-auto mb-[80px]" id="about">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-[40px] md:gap-[86px]">
          <div>
            <span className="block uppercase tracking-[0.17em] text-[10px] font-bold text-primary mb-4">A little about {firstName}</span>
            <div className="text-muted-foreground text-[14px] leading-[1.7] max-w-[490px] space-y-4 whitespace-pre-wrap" data-testid="tutor-bio">
              {tutor.bio}
            </div>
          </div>
          
          <div>
            <div className="border-t border-border mt-8 md:mt-0">
              <div className="grid grid-cols-[125px_1fr] gap-[22px] py-[17px] border-b border-border text-[13px] leading-[1.55]">
                <b className="font-bold text-foreground">University</b>
                <span className="text-muted-foreground">{tutor.university}</span>
              </div>
              <div className="grid grid-cols-[125px_1fr] gap-[22px] py-[17px] border-b border-border text-[13px] leading-[1.55]">
                <b className="font-bold text-foreground">Qualification</b>
                <span className="text-muted-foreground">{tutor.qualification}</span>
              </div>
              <div className="grid grid-cols-[125px_1fr] gap-[22px] py-[17px] border-b border-border text-[13px] leading-[1.55]">
                <b className="font-bold text-foreground">Session rate</b>
                <span className="text-muted-foreground">Illustrative rate · £{tutor.rate} per 60-minute session</span>
              </div>
              <div className="grid grid-cols-[125px_1fr] gap-[22px] py-[17px] border-b border-border text-[13px] leading-[1.55]">
                <b className="font-bold text-foreground">Session feel</b>
                <span className="text-muted-foreground">{tutor.style}</span>
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-[12px] mt-[28px]">
              <div className="bg-card p-[20px] min-h-[92px] border border-border">
                <strong className="font-serif text-[22px] block mb-2 font-medium">Core Subject</strong>
                <span className="text-[11px] text-muted-foreground">{tutor.subject}</span>
              </div>
              <div className="bg-card p-[20px] min-h-[92px] border border-border">
                <strong className="font-serif text-[22px] block mb-2 font-medium">Support</strong>
                <span className="text-[11px] text-muted-foreground">{tutor.support}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Teaching Style */}
      <section className="bg-foreground text-background px-6 md:px-[30px] py-[60px] md:py-[88px]">
        <div className="max-w-[1150px] mx-auto">
          <span className="block uppercase tracking-[0.17em] text-[10px] font-bold text-primary mb-4">What it's like to learn with her</span>
          <h2 className="font-serif text-[clamp(43px,5vw,67px)] leading-[0.91] tracking-tight m-0 mb-6">
            Her way of<br /><em>teaching.</em>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-[25px] md:gap-[30px] mt-[40px] pt-[20px] border-t border-[#635950]">
            {tutor.teachingPoints.map((point, index) => (
              <article key={`${point.title}-${index}`}>
                <b className="block text-[#E7C5B5] font-serif font-medium text-[25px] mb-[12px]">
                  {String(index + 1).padStart(2, "0")} · {point.title}
                </b>
                <p className="text-[12px] leading-[1.6] text-[#CEC1B4] m-0">
                  {point.body}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Resources */}
      {tutor.resources && tutor.resources.length > 0 && (
        <section className="bg-secondary px-6 md:px-[30px] py-[60px] md:py-[88px]" id="resources">
          <div className="max-w-[1150px] mx-auto">
            <span className="block uppercase tracking-[0.17em] text-[10px] font-bold text-primary mb-4">From {firstName}'s desk</span>
            <h2 className="font-serif text-[clamp(43px,5vw,67px)] leading-[0.91] tracking-tight m-0 mb-6">
              Small notes for<br /><em>big ideas.</em>
            </h2>
            <p className="text-muted-foreground text-[14px] leading-[1.7] max-w-[490px]">
              A few of {firstName}'s tutor-written resources — practical, personal and designed to be picked up between lessons.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-[1.25fr_0.75fr] gap-[14px] mt-[38px]">
              {tutor.resources[0] && (
                <Link href={`/resources/${tutor.resources[0].slug}`} className="bg-card p-[27px] min-h-[225px] md:min-h-[274px] text-left hover:-translate-y-1 transition-transform border border-border flex flex-col justify-between" style={{ backgroundColor: tutor.tint }}>
                   <div>
                     <ResourceTypeLabel
                       type={tutor.resources[0].type}
                       className="text-[10px] uppercase tracking-[0.13em] text-foreground font-bold opacity-80"
                     />
                     <span className="text-[10px] uppercase tracking-[0.13em] text-foreground font-bold opacity-80">
                       · {tutor.resources[0].readMinutes} min read
                     </span>
                    <h3 className="font-serif text-[29px] leading-[1.03] tracking-tight mt-[25px] mb-[20px] max-w-[400px]">{tutor.resources[0].title}</h3>
                  </div>
                  <footer className="border-t border-foreground/10 pt-[12px] text-[11px] flex justify-between items-center w-full mt-auto">
                    <span className="font-medium text-foreground">By {firstName} {tutor.name.split(' ')[1]}</span>
                     <span className="flex items-center gap-1.5 text-foreground/80">Open resource <ArrowRight size={12} /></span>
                  </footer>
                </Link>
              )}
              
              <div className="grid gap-[14px]">
                {tutor.resources.slice(1, 3).map(resource => (
                  <Link href={`/resources/${resource.slug}`} key={resource.id} className="bg-card p-[27px] min-h-[140px] text-left hover:-translate-y-1 transition-transform border border-border flex flex-col justify-between">
                     <div>
                       <ResourceTypeLabel
                         type={resource.type}
                         className="text-[10px] uppercase tracking-[0.13em] text-primary font-bold"
                       />
                      <h3 className="font-serif text-[22px] leading-[1.05] tracking-tight mt-[16px] mb-[20px]">{resource.title}</h3>
                    </div>
                    <footer className="border-t border-border pt-[12px] text-[11px] flex justify-between items-center w-full mt-auto">
                      <span className="font-medium">By {firstName}</span>
                       <span className="text-muted-foreground flex items-center gap-1.5">Open resource <ArrowRight size={12} /></span>
                    </footer>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Enquire */}
      <section className="bg-foreground text-background px-6 md:px-[30px] py-[60px] md:py-[88px]">
        <div className="max-w-[1150px] mx-auto grid grid-cols-1 md:grid-cols-[0.9fr_1.1fr] gap-[40px] md:gap-[75px] items-start">
          <div>
            <span className="block uppercase tracking-[0.17em] text-[10px] font-bold text-primary mb-4">Direct enquiry</span>
            <h2 className="font-serif text-[clamp(43px,5vw,67px)] leading-[0.91] tracking-tight m-0 mb-[25px]">
              Could {firstName}<br /><em>be your person?</em>
            </h2>
            <p className="text-[#CEC1B4] text-[14px] leading-[1.7]">
              Tell us a little about the student and what would help. Well Tutored securely delivers your named-tutor enquiry to the team for review. We never publish or expose tutor email addresses.
            </p>
            <div className="mt-[31px] grid gap-[13px]">
              <div className="flex items-center gap-[11px] text-[12px] text-[#E5D8CD]">
                <i className="not-italic w-[25px] h-[25px] border border-[#81766D] rounded-full flex items-center justify-center font-serif text-[13px] text-primary pb-0.5">1</i>
                Share the student's subject, level and context
              </div>
              <div className="flex items-center gap-[11px] text-[12px] text-[#E5D8CD]">
                <i className="not-italic w-[25px] h-[25px] border border-[#81766D] rounded-full flex items-center justify-center font-serif text-[13px] text-primary pb-0.5">2</i>
                Your enquiry is recorded for {firstName}
              </div>
              <div className="flex items-center gap-[11px] text-[12px] text-[#E5D8CD]">
                <i className="not-italic w-[25px] h-[25px] border border-[#81766D] rounded-full flex items-center justify-center font-serif text-[13px] text-primary pb-0.5">3</i>
                Well Tutored keeps an agency copy
              </div>
            </div>
          </div>
          
          <TutorEnquiry tutor={tutor} />
        </div>
      </section>
    </main>
  );
}
