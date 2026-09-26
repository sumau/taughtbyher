import { useEffect, useRef, useState } from "react";
import * as React from "react";
import { useCreateEnquiry, type EnquiryReceipt } from "@workspace/api-client-react";
import { ArrowRight, Check, ShieldCheck } from "lucide-react";
import type { Tutor } from "@workspace/api-client-react";

interface EnquiryFormProps {
  tutor?: Tutor;
  tutors?: Tutor[];
  compact?: boolean;
}

export function EnquiryForm({ tutor, tutors = [], compact = false }: EnquiryFormProps) {
  const createEnquiry = useCreateEnquiry();
  const [receipt, setReceipt] = useState<EnquiryReceipt | null>(null);
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const receiptRef = useRef<HTMLDivElement>(null);
  const submitButtonRef = useRef<HTMLButtonElement>(null);
  const submissionInFlight = useRef(false);
  const focusFirstFieldOnReset = useRef(false);
  const fieldRefs = useRef<Record<string, HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null>>({});

  const [form, setForm] = useState({
    name: "",
    email: "",
    tutorSlug: tutor?.slug || "",
    studentName: "",
    studentAge: "",
    subjectLevel: "",
    message: ""
  });

  const update = (key: keyof typeof form, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }));
    setSubmitError("");
  };

  const errors: Record<string, string> = {};
  if (!form.name.trim()) errors.name = "Enter the parent or guardian's name.";
  if (!form.email.trim()) {
    errors.email = "Enter an email address.";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
    errors.email = "Enter a valid email address.";
  }
  if (!form.tutorSlug) errors.tutorSlug = "Choose a tutor.";
  if (!form.studentName.trim()) errors.studentName = "Enter the student's name.";
  if (!form.studentAge) errors.studentAge = "Choose the student's age.";
  if (!form.subjectLevel.trim()) errors.subjectLevel = "Enter the subject and level.";
  if (!form.message.trim()) {
    errors.message = "Tell us a little about what support would help.";
  } else if (form.message.trim().length < 10) {
    errors.message = "Use at least 10 characters so the tutor has useful context.";
  }

  const isComplete = Object.keys(errors).length === 0;
  const showError = (key: string) => Boolean(errors[key] && (attemptedSubmit || touched[key]));
  const markTouched = (key: string) => {
    setTouched(prev => ({ ...prev, [key]: true }));
  };

  useEffect(() => {
    if (receipt) {
      receiptRef.current?.focus();
    } else if (focusFirstFieldOnReset.current) {
      focusFirstFieldOnReset.current = false;
      fieldRefs.current.name?.focus();
    }
  }, [receipt]);

  useEffect(() => {
    if (submitError) {
      submitButtonRef.current?.focus();
    }
  }, [submitError]);

  const handleReset = () => {
    focusFirstFieldOnReset.current = true;
    setReceipt(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAttemptedSubmit(true);
    setTouched(Object.keys(form).reduce<Record<string, boolean>>((result, key) => {
      result[key] = true;
      return result;
    }, {}));
    if (!isComplete || submissionInFlight.current || createEnquiry.isPending) {
      const firstInvalid = Object.keys(errors).find((key) => errors[key]);
      if (firstInvalid) fieldRefs.current[firstInvalid]?.focus();
      return;
    }
    setSubmitError("");
    submissionInFlight.current = true;
    setIsSubmitting(true);

    createEnquiry.mutate({
      data: form
    }, {
      onSuccess: (result) => {
        submissionInFlight.current = false;
        setIsSubmitting(false);
        setReceipt(result);
        setForm({
          name: "",
          email: "",
          tutorSlug: tutor?.slug || "",
          studentName: "",
          studentAge: "",
          subjectLevel: "",
          message: ""
        });
        setAttemptedSubmit(false);
        setTouched({});
      },
      onError: () => {
        submissionInFlight.current = false;
        setIsSubmitting(false);
        setSubmitError("We could not record your enquiry. Please check the details and try again.");
      }
    });
  };

  if (receipt) {
    return (
      <div
        ref={receiptRef}
        className={`text-center py-10 px-4 ${compact ? 'bg-card' : ''}`}
        data-testid="enquiry-success"
        role="status"
        aria-live="polite"
        tabIndex={-1}
      >
        <div className={`w-[50px] h-[50px] ${receipt.deliveryStatus === "delivered" ? "bg-accent text-accent-foreground" : "bg-secondary text-foreground"} rounded-full flex items-center justify-center mx-auto mb-6`}>
          <Check size={24} />
        </div>
        <span className="block text-[10px] font-bold tracking-[0.15em] uppercase text-primary mb-3">
          {receipt.deliveryStatus === "delivered" ? "Message delivered" : receipt.deliveryStatus === "failed" ? "Delivery needs attention" : "Message recorded"}
        </span>
        <h2 className="font-serif text-[32px] md:text-[40px] leading-[1.1] tracking-tight mb-4">
          {receipt.deliveryStatus === "delivered" ? <>Safely delivered<br /><em>to Taught by Her.</em></> : <>Enquiry recorded<br /><em>for {receipt.tutorName}.</em></>}
        </h2>
        <p className="text-muted-foreground text-[14px] leading-[1.6] max-w-[360px] mx-auto mb-8">
          {receipt.message}
        </p>
        <button
          type="button"
          onClick={handleReset}
          className="bg-foreground text-background text-[12px] font-bold px-6 py-3.5 hover:bg-primary transition-colors inline-flex items-center justify-center gap-2"
          data-testid="enquiry-reset"
        >
          Send another enquiry <ArrowRight size={14} />
        </button>
      </div>
    );
  }

  return (
    <div className={`${compact ? 'bg-card p-8' : ''}`} id="enquire" data-testid="enquiry-form-container">
      {tutor?.availability === "unavailable" ? (
        <div className="border border-border bg-background p-6 text-sm text-muted-foreground leading-[1.6]" data-testid="enquiry-unavailable">
          {tutor.name} is not currently accepting enquiries. Please choose another tutor or check back later.
        </div>
      ) : (
      <>
      {compact ? (
        <div className="mb-6">
          <h3 className="font-serif text-[28px] md:text-[32px] tracking-tight mb-2 text-foreground">Make a direct enquiry</h3>
          <p className="text-muted-foreground text-[13px] leading-[1.5]">
            {tutor
              ? "We’ll record your enquiry securely and keep your details private."
              : "Tell us which tutor you are interested in. We’ll record your enquiry securely and keep your details private."}
          </p>
        </div>
      ) : (
        <div className="mb-8">
           <h2 id={compact ? undefined : "enquiry-form-title"} className="font-serif text-[38px] md:text-[48px] tracking-tight leading-[0.95] mb-3 text-foreground">
            Ask about<br /><em>{tutor ? tutor.name.split(' ')[0] : 'a tutor'}.</em>
          </h2>
          <p className="text-muted-foreground text-[14px] leading-[1.6]">
            {tutor ? `${tutor.name} is selected.` : 'Select a tutor.'} For students under 18, please provide a parent or guardian's details.
          </p>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-4"
        data-testid="enquiry-form"
        noValidate
        aria-describedby="enquiry-form-instructions"
      >
        <p id="enquiry-form-instructions" className="text-[11px] text-muted-foreground leading-[1.5]">
          Fields marked with an asterisk are required. We will use these details only to respond to this enquiry.
        </p>
        {/* Parent Details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label htmlFor="enquiry-parent-name" className="flex flex-col gap-1.5 text-[11px] font-bold text-foreground">
            Parent or guardian name *
            <input 
              id="enquiry-parent-name"
              name="name"
              type="text"
              autoComplete="name"
              ref={(element) => { fieldRefs.current.name = element; }}
              className="border border-border bg-background px-3 py-3 text-[13px] font-normal text-foreground focus:border-primary outline-none transition-colors"
              placeholder="e.g. Eleanor James"
              value={form.name}
              onChange={e => update("name", e.target.value)}
              onBlur={() => markTouched("name")}
              aria-invalid={showError("name")}
              aria-describedby={showError("name") ? "enquiry-parent-name-error" : undefined}
              data-testid="input-parent-name"
            />
            {showError("name") && <span id="enquiry-parent-name-error" className="font-normal text-destructive" role="alert">{errors.name}</span>}
          </label>
          <label htmlFor="enquiry-parent-email" className="flex flex-col gap-1.5 text-[11px] font-bold text-foreground">
            Email address *
            <input 
              id="enquiry-parent-email"
              name="email"
              type="email"
              autoComplete="email"
              ref={(element) => { fieldRefs.current.email = element; }}
              className="border border-border bg-background px-3 py-3 text-[13px] font-normal text-foreground focus:border-primary outline-none transition-colors"
              placeholder="you@example.com"
              value={form.email}
              onChange={e => update("email", e.target.value)}
              onBlur={() => markTouched("email")}
              aria-invalid={showError("email")}
              aria-describedby={showError("email") ? "enquiry-parent-email-error" : undefined}
              data-testid="input-parent-email"
            />
            {showError("email") && <span id="enquiry-parent-email-error" className="font-normal text-destructive" role="alert">{errors.email}</span>}
          </label>
        </div>

        {/* Tutor Selection (if not pre-selected) */}
        {!tutor && tutors.length > 0 && (
          <label htmlFor="enquiry-tutor" className="flex flex-col gap-1.5 text-[11px] font-bold text-foreground">
            Tutor you are interested in *
            <select
              id="enquiry-tutor"
              name="tutorSlug"
              ref={(element) => { fieldRefs.current.tutorSlug = element; }}
              className="border border-border bg-background px-3 py-3 text-[13px] font-normal text-foreground focus:border-primary outline-none transition-colors appearance-none"
              value={form.tutorSlug}
              onChange={e => update("tutorSlug", e.target.value)}
              onBlur={() => markTouched("tutorSlug")}
              aria-invalid={showError("tutorSlug")}
              aria-describedby={showError("tutorSlug") ? "enquiry-tutor-error" : undefined}
              data-testid="input-tutor-select"
            >
              <option value="">Select a tutor</option>
              {tutors.map(t => (
                <option key={t.slug} value={t.slug}>{t.name} ({t.subject})</option>
              ))}
            </select>
            {showError("tutorSlug") && <span id="enquiry-tutor-error" className="font-normal text-destructive" role="alert">{errors.tutorSlug}</span>}
          </label>
        )}

        {/* Student Details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label htmlFor="enquiry-student-name" className="flex flex-col gap-1.5 text-[11px] font-bold text-foreground">
            Student's name *
            <input 
              id="enquiry-student-name"
              name="studentName"
              type="text"
              autoComplete="section-student name"
              ref={(element) => { fieldRefs.current.studentName = element; }}
              className="border border-border bg-background px-3 py-3 text-[13px] font-normal text-foreground focus:border-primary outline-none transition-colors"
              placeholder="First name"
              value={form.studentName}
              onChange={e => update("studentName", e.target.value)}
              onBlur={() => markTouched("studentName")}
              aria-invalid={showError("studentName")}
              aria-describedby={showError("studentName") ? "enquiry-student-name-error" : undefined}
              data-testid="input-student-name"
            />
            {showError("studentName") && <span id="enquiry-student-name-error" className="font-normal text-destructive" role="alert">{errors.studentName}</span>}
          </label>
          <label htmlFor="enquiry-student-age" className="flex flex-col gap-1.5 text-[11px] font-bold text-foreground">
            Student's age *
            <select
              id="enquiry-student-age"
              name="studentAge"
              ref={(element) => { fieldRefs.current.studentAge = element; }}
              className="border border-border bg-background px-3 py-3 text-[13px] font-normal text-foreground focus:border-primary outline-none transition-colors appearance-none"
              value={form.studentAge}
              onChange={e => update("studentAge", e.target.value)}
              onBlur={() => markTouched("studentAge")}
              aria-invalid={showError("studentAge")}
              aria-describedby={showError("studentAge") ? "enquiry-student-age-error" : undefined}
              data-testid="input-student-age"
            >
              <option value="">Select</option>
              <option value="Under 13">Under 13</option>
              <option value="13-15">13–15</option>
              <option value="16-17">16–17</option>
              <option value="18+">18+</option>
            </select>
            {showError("studentAge") && <span id="enquiry-student-age-error" className="font-normal text-destructive" role="alert">{errors.studentAge}</span>}
          </label>
        </div>

        <label htmlFor="enquiry-subject-level" className="flex flex-col gap-1.5 text-[11px] font-bold text-foreground">
          Subject and level *
          <input 
            id="enquiry-subject-level"
            name="subjectLevel"
            type="text"
            autoComplete="off"
            ref={(element) => { fieldRefs.current.subjectLevel = element; }}
            className="border border-border bg-background px-3 py-3 text-[13px] font-normal text-foreground focus:border-primary outline-none transition-colors"
            placeholder="e.g. GCSE English Literature"
            value={form.subjectLevel}
            onChange={e => update("subjectLevel", e.target.value)}
            onBlur={() => markTouched("subjectLevel")}
            aria-invalid={showError("subjectLevel")}
            aria-describedby={showError("subjectLevel") ? "enquiry-subject-level-error" : undefined}
            data-testid="input-subject-level"
          />
          {showError("subjectLevel") && <span id="enquiry-subject-level-error" className="font-normal text-destructive" role="alert">{errors.subjectLevel}</span>}
        </label>

        <label htmlFor="enquiry-message" className="flex flex-col gap-1.5 text-[11px] font-bold text-foreground">
          What would you like the tutor to know? *
          <textarea 
            id="enquiry-message"
            name="message"
            autoComplete="off"
            ref={(element) => { fieldRefs.current.message = element; }}
            rows={4}
            className="border border-border bg-background px-3 py-3 text-[13px] font-normal text-foreground focus:border-primary outline-none transition-colors resize-none"
            placeholder="A little about what the student is working on, and what support might feel useful... (min 10 characters)"
            value={form.message}
            onChange={e => update("message", e.target.value)}
            onBlur={() => markTouched("message")}
            aria-invalid={showError("message")}
            aria-describedby={showError("message") ? "enquiry-message-error" : undefined}
            data-testid="input-message"
          />
          {showError("message") && <span id="enquiry-message-error" className="font-normal text-destructive" role="alert">{errors.message}</span>}
        </label>

        {submitError && (
          <p className="border border-destructive/40 bg-destructive/10 px-3 py-2 text-[12px] text-destructive" role="alert" data-testid="error-enquiry-submit">
            {submitError}
          </p>
        )}

        <p aria-live="polite" role="status" className="sr-only">
          {isSubmitting ? "Submitting your enquiry." : ""}
        </p>

        <button 
          type="submit"
          ref={submitButtonRef}
          disabled={!isComplete || isSubmitting || createEnquiry.isPending}
          className="mt-2 bg-foreground text-background text-[12px] font-bold px-6 py-4 hover:bg-primary transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          data-testid="button-submit-enquiry"
        >
          {isSubmitting ? 'Submitting...' : 'Submit enquiry'} <ArrowRight size={15} />
        </button>

        <div className="mt-4 pt-4 border-t border-border flex items-start gap-3 text-[11px] text-muted-foreground leading-[1.5]">
          <ShieldCheck size={18} className="text-primary shrink-0" />
          <p>
            Safeguarding note: enquiries for under-18s should come from a parent or guardian. Your details are shared securely and only for this enquiry and its record.
          </p>
        </div>
      </form>
      </>
      )}
    </div>
  );
}
