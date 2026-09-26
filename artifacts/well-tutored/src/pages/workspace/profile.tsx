import { useEffect, useRef, useState } from "react";
import { 
  useGetWorkspaceSession, 
  useUpdateWorkspaceProfile, 
  useDiscardWorkspaceProfileDraft,
  getGetWorkspaceSessionQueryKey,
  useGetTutor,
  getGetTutorQueryKey,
  type WorkspaceTutor,
} from "@workspace/api-client-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertCircle, Check, Loader2, ExternalLink } from "lucide-react";
import { TutorProfileUpdateAvailability } from "@workspace/api-client-react";
import {
  normalizeTutorAccent,
  TUTOR_ACCENTS,
  TUTOR_ACCENT_VALUES,
} from "@/lib/tutor-accents";
import { cn } from "@/lib/utils";
import { invalidatePublicTutorQueries } from "@/lib/public-tutor-query";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const teachingPointSchema = z.object({
  title: z.string().min(2, "Point title is required"),
  body: z.string().min(10, "Point description should be at least 10 characters"),
});

const profileSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  initials: z.string().min(1, "Initials are required").max(4, "Too long"),
  subject: z.string().min(2, "Subject expertise is required"),
  support: z.string(),
  profileSummary: z.string().max(200, "Profile summary must be 200 characters or fewer"),
  university: z.string().min(2, "University is required"),
  qualification: z.string().min(2, "Qualification is required"),
  bio: z.string().min(20, "Bio should be at least 20 characters"),
  style: z.string().min(2, "Teaching style is required"),
  teachingIntro: z.string().min(20, "Teaching introduction should be at least 20 characters").max(200, "Teaching approach must be 200 characters or fewer"),
  teachingPoints: z.array(teachingPointSchema).length(3),
  rate: z.coerce.number().min(0, "Rate must be positive"),
  availability: z.enum([
    TutorProfileUpdateAvailability.accepting,
    TutorProfileUpdateAvailability.limited,
    TutorProfileUpdateAvailability.unavailable
  ]),
  tint: z.enum(TUTOR_ACCENT_VALUES),
});
type ProfileFormValues = z.infer<typeof profileSchema>;

function profileFormValues(tutor: WorkspaceTutor): ProfileFormValues {
  return {
    firstName: tutor.firstName,
    lastName: tutor.lastName,
    initials: tutor.initials,
    subject: tutor.subject,
    support: tutor.support,
    profileSummary: tutor.profileSummary,
    university: tutor.university,
    qualification: tutor.qualification,
    bio: tutor.bio,
    style: tutor.style,
    teachingIntro: tutor.teachingIntro,
    teachingPoints: [
      ...tutor.teachingPoints,
      ...Array.from({ length: 3 }, () => ({ title: "", body: "" })),
    ].slice(0, 3),
    rate: tutor.rate,
    availability: tutor.availability as TutorProfileUpdateAvailability,
    tint: normalizeTutorAccent(tutor.tint),
  };
}

export default function WorkspaceProfile() {
  const { data: session, isLoading: isSessionLoading } = useGetWorkspaceSession();
  const updateProfile = useUpdateWorkspaceProfile();
  const discardDraft = useDiscardWorkspaceProfileDraft();
  const queryClient = useQueryClient();
  const [saveFeedback, setSaveFeedback] = useState<"saved" | "error" | null>(null);
  const [saveMessage, setSaveMessage] = useState("");
  const [publishValidationMessage, setPublishValidationMessage] = useState<string | null>(null);
  const saveFeedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveTarget = useRef<"draft" | "published" | null>(null);

  const form = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      initials: "",
      subject: "",
      support: "",
      profileSummary: "",
      university: "",
      qualification: "",
      bio: "",
      style: "",
        teachingIntro: "",
        teachingPoints: [
          { title: "", body: "" },
          { title: "", body: "" },
          { title: "", body: "" },
        ],
      rate: 0,
      availability: TutorProfileUpdateAvailability.accepting,
      tint: "#8EA8CE",
    }
  });

  const isInitialized = useRef(false);

  useEffect(() => {
    if (!form.formState.isDirty || !saveFeedback) return;
    setSaveFeedback(null);
    setSaveMessage("");
  }, [form.formState.isDirty, saveFeedback]);

  useEffect(() => {
    return () => {
      if (saveFeedbackTimer.current) {
        clearTimeout(saveFeedbackTimer.current);
      }
    };
  }, []);

  useEffect(() => {
    if (session?.tutor && !isInitialized.current) {
      isInitialized.current = true;
      form.reset(profileFormValues(session.tutor));
    }
  }, [session, form]);

  const { data: publicProfile, isLoading: isPublicProfileLoading } = useGetTutor(session?.tutor?.slug || "", {
    query: {
      enabled: !!session?.tutor?.slug && session.tutor.profileStatus === "draft",
      retry: false,
    }
  });

  const onSubmit = (data: ProfileFormValues, statusOverride: "draft" | "published") => {
    updateProfile.mutate(
      {
        data: {
          ...data,
          rate: Number(data.rate) || 0,
          status: statusOverride,
        },
      },
      {
        onSuccess: (updatedTutor) => {
            const message =
              statusOverride === "published"
                ? "Profile published just now."
                : "Profile draft saved successfully.";
            toast.success(message);
            queryClient.setQueryData(getGetWorkspaceSessionQueryKey(), (old: any) =>
              old ? { ...old, tutor: updatedTutor } : old,
            );
            if (statusOverride === "published") {
              invalidatePublicTutorQueries(queryClient, [
                session?.tutor?.slug,
                updatedTutor.slug,
              ]);
            }
            form.reset(form.getValues());
            setSaveFeedback("saved");
            setSaveMessage(message);
            if (saveFeedbackTimer.current) {
              clearTimeout(saveFeedbackTimer.current);
            }
            saveFeedbackTimer.current = setTimeout(() => {
              setSaveFeedback(null);
              setSaveMessage("");
            }, 4000);
        },
        onError: (error) => {
          const responseData = (error as {
            data?: {
              error?: unknown;
              details?: Array<{ path?: unknown; message?: unknown }>;
            };
          }).data;
          const validationDetails = responseData?.details
            ?.map((detail) =>
              [detail.path, detail.message]
                .filter((value): value is string => typeof value === "string")
                .join(": "),
            )
            .filter(Boolean)
            .join(" ");
          const message =
            validationDetails ||
            (typeof responseData?.error === "string"
              ? responseData.error
              : "Failed to save profile. Please check your inputs.");
          toast.error(message);
            setSaveFeedback("error");
            setSaveMessage(message);
        }
      }
    );
  };

  const saveDraft = () => {
    saveTarget.current = "draft";
    setPublishValidationMessage(null);
    form.clearErrors();
    onSubmit(form.getValues(), "draft");
  };

  const publishProfile = () => {
    saveTarget.current = "published";
    const values = form.getValues();
    const result = profileSchema.safeParse(values);
    if (!result.success) {
      form.clearErrors();
      const labels: Record<string, string> = {
        firstName: "a first name",
        lastName: "a last name",
        initials: "initials",
        subject: "a subject",
        university: "a university",
        qualification: "a qualification",
        bio: "a biography of at least 20 characters",
        style: "a teaching style",
        teachingIntro: "a teaching approach of at least 20 characters",
        teachingPoints: "three complete teaching principles",
        rate: "a valid hourly rate",
      };
      const missingFields = Array.from(
        new Set(
          result.error.issues.map((issue) => {
            const path = issue.path.join(".");
            const pointMatch = path.match(/^teachingPoints\.(\d+)\./);
            return pointMatch
              ? `complete content for teaching principle ${Number(pointMatch[1]) + 1}`
              : labels[path] ?? issue.message;
          }),
        ),
      );
      for (const issue of result.error.issues) {
        const path = issue.path.join(".");
        if (path) {
          form.setError(path as keyof ProfileFormValues, {
            type: "manual",
            message: issue.message,
          });
        }
      }
      const message = `Add ${missingFields.join(", ")} before publishing.`;
      setPublishValidationMessage(message);
      toast.error("Complete the profile before publishing", {
        description: message,
      });
      const firstInvalidField = result.error.issues[0]?.path.join(".");
      if (firstInvalidField) {
        window.requestAnimationFrame(() => {
          form.setFocus(firstInvalidField as keyof ProfileFormValues);
        });
      }
      return;
    }

    form.clearErrors();
    setPublishValidationMessage(null);
    onSubmit(result.data, "published");
  };

  const discardSavedDraft = () => {
    discardDraft.mutate(undefined, {
      onSuccess: (publishedTutor) => {
        queryClient.setQueryData(getGetWorkspaceSessionQueryKey(), (old: any) =>
          old ? { ...old, tutor: publishedTutor } : old,
        );
        queryClient.setQueryData(
          getGetTutorQueryKey(publishedTutor.slug),
          publishedTutor,
        );
        form.reset(profileFormValues(publishedTutor));
        setSaveFeedback(null);
        setSaveMessage("");
        setPublishValidationMessage(null);
        toast.success("Draft discarded", {
          description: "The editor has been restored to your published profile.",
        });
      },
      onError: () => {
        toast.error("Could not discard the draft. Please try again.");
      },
    });
  };

  const isDraft = session?.tutor?.profileStatus === "draft";
  const isPublished = session?.tutor?.profileStatus === "published";
  const isArchived = session?.tutor?.profileStatus === "archived";
  const hasUnsavedChanges = form.formState.isDirty;
  const hasPublicProfile = isPublished || !!publicProfile;
  const isDeterminingPublicStatus = isDraft && isPublicProfileLoading;

  if (isSessionLoading || isDeterminingPublicStatus) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[50vh]">
        <Loader2 className="animate-spin text-muted-foreground w-6 h-6" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto w-full p-6 md:p-12">
      <div className="mb-10 flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-serif text-foreground">Your Profile</h1>
          <p className="text-muted-foreground text-sm">
            Manage your public presence and how you appear to prospective students.
          </p>
        </div>

        {session?.tutor && (
          <div
            className={cn(
              "flex flex-col gap-5 p-5 md:p-6 border transition-colors duration-300",
              isPublished && !hasUnsavedChanges 
                ? "bg-accent/20 border-accent/40" 
                : isDraft && !hasPublicProfile 
                  ? "bg-secondary/40 border-secondary/60" 
                  : isArchived
                    ? "bg-destructive/5 border-destructive/20"
                    : "bg-primary/5 border-primary/20"
            )}
          >
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className={cn(
                  "flex h-2 w-2 rounded-full",
                  isPublished && !hasUnsavedChanges ? "bg-emerald-600 dark:bg-emerald-500" :
                  isDraft && !hasPublicProfile ? "bg-muted-foreground" :
                   isArchived ? "bg-destructive" :
                   "bg-primary"
                )} />
                <h2 className="font-semibold text-xs uppercase tracking-wider text-foreground">
                  {hasUnsavedChanges && "Unsaved Changes"}
                  {!hasUnsavedChanges && isPublished && "Profile is Live"}
                  {!hasUnsavedChanges && isDraft && hasPublicProfile && "Editing Private Draft"}
                  {!hasUnsavedChanges && isDraft && !hasPublicProfile && "Unpublished Draft"}
                   {!hasUnsavedChanges && isArchived && "Profile Archived"}
                </h2>
              </div>
              <p className="text-sm text-foreground/80 leading-relaxed max-w-2xl">
                {hasUnsavedChanges && hasPublicProfile && "These changes have not been saved. Save them privately as a draft, or publish them to update your live profile."}
                {hasUnsavedChanges && !hasPublicProfile && "These changes have not been saved. Save your draft to continue later, or publish when the profile is complete."}
                {!hasUnsavedChanges && isPublished && "Your profile is visible to students. Any new changes you make here will remain private until you publish them."}
                {!hasUnsavedChanges && isDraft && hasPublicProfile && "Your last published profile is still live and visible to students. This saved draft is private."}
                {!hasUnsavedChanges && isDraft && !hasPublicProfile && "Your profile is currently private. Complete your details and publish to become visible to students."}
                 {!hasUnsavedChanges && isArchived && "This profile is archived and hidden from students. Ask the agency owner to restore it before making changes."}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 border-t border-current/10 pt-5 md:justify-end">
              {hasPublicProfile && (
                <Button variant="ghost" className="bg-transparent border-transparent hover:bg-black/5 dark:hover:bg-white/5" asChild>
                  <a href={`/tutors/${session.tutor.slug}`} target="_blank" rel="noopener noreferrer">
                    View Live
                    <ExternalLink className="ml-2 h-3.5 w-3.5" />
                  </a>
                </Button>
              )}

              {isDraft && hasPublicProfile && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      disabled={updateProfile.isPending || discardDraft.isPending}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      Discard Draft
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="rounded-none border-border">
                    <AlertDialogHeader>
                      <AlertDialogTitle className="font-serif">
                        Discard this draft?
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        Your draft and any unsaved edits will be permanently
                        removed. Your published profile will stay live and will
                        be restored in the editor.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel className="rounded-none">
                        Keep Editing
                      </AlertDialogCancel>
                      <AlertDialogAction
                        onClick={discardSavedDraft}
                        className="rounded-none bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        {discardDraft.isPending ? "Discarding..." : "Discard Draft"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}

              <Button
                type="button"
                variant="outline"
                onClick={saveDraft}
                disabled={
                  updateProfile.isPending ||
                  discardDraft.isPending ||
                  isArchived ||
                  (isDraft && !hasUnsavedChanges)
                }
                className="border-border bg-transparent hover:bg-secondary/50"
              >
                {updateProfile.isPending && saveTarget.current === "draft" ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : saveFeedback === "saved" && isDraft && !hasUnsavedChanges ? (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Saved
                  </>
                ) : (
                  "Save Draft"
                )}
              </Button>
              
              <Button
                type="button"
                onClick={publishProfile}
                disabled={
                  updateProfile.isPending ||
                  discardDraft.isPending ||
                  isArchived ||
                  (isPublished && !hasUnsavedChanges)
                }
              >
                {updateProfile.isPending && saveTarget.current === "published" ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Publishing...
                  </>
                ) : saveFeedback === "saved" && isPublished && !hasUnsavedChanges ? (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Published
                  </>
                ) : hasPublicProfile ? (
                  "Publish Changes"
                ) : (
                  "Publish Profile"
                )}
              </Button>
            </div>
          </div>
        )}

        {publishValidationMessage && (
          <div
            className="flex max-w-full items-start gap-3 border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive page-reveal"
            role="alert"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="font-semibold mb-1">Almost ready to publish</p>
              <p className="leading-relaxed">{publishValidationMessage}</p>
            </div>
          </div>
        )}
      </div>

      <div className="bg-card border border-border p-6 md:p-10">
        <Form {...form}>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              publishProfile();
            }}
            className="space-y-8"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">First Name</FormLabel>
                        <FormControl>
                          <Input {...field} className="rounded-none border-border bg-transparent shadow-none h-10" />
                        </FormControl>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Last Name</FormLabel>
                        <FormControl>
                          <Input {...field} className="rounded-none border-border bg-transparent shadow-none h-10" />
                        </FormControl>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="initials"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Initials</FormLabel>
                        <FormControl>
                          <Input {...field} maxLength={4} className="rounded-none border-border bg-transparent shadow-none h-10" />
                        </FormControl>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="rate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Hourly Rate (£)</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} className="rounded-none border-border bg-transparent shadow-none h-10" />
                        </FormControl>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="subject"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Subject Expertise</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g. A-level Mathematics & Physics" className="rounded-none border-border bg-transparent shadow-none h-10" />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />

              </div>

              <div className="space-y-6">
                <FormField
                  control={form.control}
                  name="university"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">University</FormLabel>
                      <FormControl>
                        <Input {...field} className="rounded-none border-border bg-transparent shadow-none h-10" />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="qualification"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Degree / Qualification</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g. BSc Mathematics (First Class)" className="rounded-none border-border bg-transparent shadow-none h-10" />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="tint"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                        Profile Accent Color
                      </FormLabel>
                      <FormDescription className="text-xs">
                        Choose an available accent for your public profile. Each accent can belong to one tutor only.
                      </FormDescription>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger aria-label="Profile accent color" className="rounded-none border-border bg-transparent shadow-none">
                            <SelectValue placeholder="Choose an accent" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {TUTOR_ACCENTS.map((accent) => {
                            const isAvailable =
                              session?.availableTutorAccents?.includes(accent.value) ?? false;
                            const isCurrent = field.value === accent.value;
                            return (
                              <SelectItem
                                key={accent.value}
                                value={accent.value}
                                disabled={!isAvailable && !isCurrent}
                              >
                                <span className="flex items-center gap-2">
                                  <span
                                    className="h-4 w-4 shrink-0 border border-foreground/10"
                                    style={{ backgroundColor: accent.value }}
                                  />
                                  <span>{accent.label}</span>
                                  {!isAvailable && !isCurrent && (
                                    <span className="text-muted-foreground">(in use)</span>
                                  )}
                                </span>
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <FormField
                control={form.control}
                name="support"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Support</FormLabel>
                    <FormDescription className="text-xs">A short description of the support you offer.</FormDescription>
                    <FormControl>
                      <Input {...field} placeholder="e.g. Exam confidence & revision" className="rounded-none border-border bg-transparent shadow-none h-10" />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="availability"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Status</FormLabel>
                    <FormDescription className="text-xs">Controls the availability message shown on your public tutor profile.</FormDescription>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="rounded-none border-border bg-transparent shadow-none h-10">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="rounded-none border-border shadow-md">
                        <SelectItem value="accepting" className="rounded-none">Accepting enquiries</SelectItem>
                        <SelectItem value="limited" className="rounded-none">Limited availability</SelectItem>
                        <SelectItem value="unavailable" className="rounded-none">Not currently accepting enquiries</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="profileSummary"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between gap-4">
                    <FormLabel className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Profile Summary</FormLabel>
                    <span className="text-xs text-muted-foreground">{field.value.length}/200</span>
                  </div>
                  <FormDescription className="text-xs">A short introduction shown beside your name. Keep it specific to you and your students.</FormDescription>
                  <FormControl>
                    <Textarea {...field} maxLength={200} placeholder="e.g. Maya helps students turn half-formed ideas into clear, confident arguments." className="min-h-[88px] rounded-none border-border bg-transparent shadow-none resize-y text-sm leading-relaxed" />
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />

            <div className="space-y-6 pt-4 border-t border-border">
              <FormField
                control={form.control}
                name="style"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Teaching Style</FormLabel>
                    <FormDescription className="text-xs">A short sentence describing your approach.</FormDescription>
                    <FormControl>
                      <Input {...field} placeholder="Patient, methodical, and focused on exam technique." className="rounded-none border-border bg-transparent shadow-none h-10" />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="teachingIntro"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between gap-4">
                      <FormLabel className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Teaching Approach</FormLabel>
                      <span className="text-xs text-muted-foreground">{field.value.length}/200</span>
                    </div>
                    <FormDescription className="text-xs">Describe what lessons feel like with you.</FormDescription>
                    <FormControl>
                      <Textarea {...field} maxLength={200} className="min-h-[120px] rounded-none border-border bg-transparent shadow-none resize-y text-sm leading-relaxed" />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
              <div className="space-y-5">
                <div>
                  <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Teaching Principles</h3>
                  <p className="mt-2 text-xs text-muted-foreground">Add the three ideas that define your approach.</p>
                </div>
                <div className="grid grid-cols-1 gap-5">
                  {([0, 1, 2] as const).map((index) => (
                    <div key={index} className="space-y-4 border border-border p-4">
                      <FormField
                        control={form.control}
                        name={`teachingPoints.${index}.title`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Point {index + 1} Title</FormLabel>
                            <FormControl>
                              <Input {...field} className="rounded-none border-border bg-transparent shadow-none h-10" />
                            </FormControl>
                            <FormMessage className="text-xs" />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`teachingPoints.${index}.body`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Description</FormLabel>
                            <FormControl>
                              <Textarea {...field} className="min-h-[120px] rounded-none border-border bg-transparent shadow-none resize-y text-sm leading-relaxed" />
                            </FormControl>
                            <FormMessage className="text-xs" />
                          </FormItem>
                        )}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <FormField
                control={form.control}
                name="bio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Biography</FormLabel>
                    <FormDescription className="text-xs">Your full background, experience, and academic journey.</FormDescription>
                    <FormControl>
                      <Textarea {...field} className="min-h-[150px] rounded-none border-border bg-transparent shadow-none resize-y" />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
            </div>

          </form>
        </Form>
      </div>
    </div>
  );
}
