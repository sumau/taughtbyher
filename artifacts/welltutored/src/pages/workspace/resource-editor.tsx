import { useEffect, useRef, useState } from "react";
import { useLocation, useParams } from "wouter";
import { useListWorkspaceResources, useCreateWorkspaceResource, useUpdateWorkspaceResource, getListWorkspaceResourcesQueryKey, WorkspaceResourceStatus } from "@workspace/api-client-react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertCircle, Loader2, Plus, Trash2, Check } from "lucide-react";

const sectionSchema = z.object({
  id: z.string(),
  heading: z.string().min(2, "Heading required"),
  body: z.string().min(10, "Body content required"),
});

const resourceSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  subject: z.string().min(1, "Subject is required"),
  level: z.string().min(1, "Level is required"),
  type: z.enum(["Study note", "Guide", "Essay", "Revision notes"]),
  excerpt: z.string().min(10, "Excerpt is too short"),
  body: z.string().min(20, "Introduction must be at least 20 characters"),
  sections: z.array(sectionSchema),
  status: z.enum([WorkspaceResourceStatus.draft, WorkspaceResourceStatus.published]).optional(),
});
const draftSchema = resourceSchema.pick({ title: true });
type ResourceFormValues = z.infer<typeof resourceSchema>;
type ResourceDraftValues = Partial<ResourceFormValues> & Pick<ResourceFormValues, "title">;

export default function WorkspaceResourceEditor() {
  const [, setLocation] = useLocation();
  const params = useParams();
  const isNew = !params.id || params.id === "new";
  const resourceId = !isNew ? parseInt(params.id!, 10) : null;

  const { data: resources, isLoading: isLoadingResources } = useListWorkspaceResources({
    query: { enabled: !isNew, queryKey: getListWorkspaceResourcesQueryKey() }
  });
  
  const resource = resources?.find(item => item.id === resourceId);

  const createResource = useCreateWorkspaceResource();
  const updateResource = useUpdateWorkspaceResource();
  const queryClient = useQueryClient();
  const [saveFeedback, setSaveFeedback] = useState<"saved" | "error" | null>(null);
  const [saveMessage, setSaveMessage] = useState("");
  const [publishValidationMessage, setPublishValidationMessage] = useState<string | null>(null);
  const saveFeedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const form = useForm<z.infer<typeof resourceSchema>>({
    resolver: zodResolver(resourceSchema),
    defaultValues: {
      title: "",
      subject: "",
      level: "",
       type: "Study note",
      excerpt: "",
      body: "",
      sections: [],
      status: WorkspaceResourceStatus.draft
    }
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "sections"
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

  const showSaveFeedback = (status: "saved" | "error", message: string) => {
    setSaveFeedback(status);
    setSaveMessage(message);
    if (saveFeedbackTimer.current) {
      clearTimeout(saveFeedbackTimer.current);
    }
    saveFeedbackTimer.current = setTimeout(() => {
      setSaveFeedback(null);
      setSaveMessage("");
    }, 4000);
  };

  useEffect(() => {
    if (!isNew && resource && !isInitialized.current) {
      isInitialized.current = true;
      form.reset({
        title: resource.title,
        subject: resource.subject,
        level: resource.level,
        type: resource.type,
        excerpt: resource.excerpt,
        body: resource.body,
        sections: resource.sections,
        status: resource.status
      });
    }
  }, [isNew, resource, form]);

  const onSubmit = (data: ResourceDraftValues, statusOverride?: "draft" | "published") => {
    const finalData = { ...data, status: statusOverride || data.status };

    if (isNew) {
      const { status, ...createData } = finalData;
      createResource.mutate(
        { data: createData },
        {
          onSuccess: (newResource) => {
            if (statusOverride === "published") {
              updateResource.mutate({ id: newResource.id, data: { status: "published" } }, {
                onSuccess: () => {
                  toast.success("Resource created and published.");
                  queryClient.invalidateQueries({ queryKey: getListWorkspaceResourcesQueryKey() });
                  setLocation(`/workspace/resources/${newResource.id}`);
                }
              });
            } else {
              toast.success("Draft saved successfully.");
              queryClient.invalidateQueries({ queryKey: getListWorkspaceResourcesQueryKey() });
              setLocation(`/workspace/resources/${newResource.id}`);
            }
          },
          onError: () => toast.error("Failed to create resource.")
        }
      );
    } else if (resourceId) {
      updateResource.mutate(
        { id: resourceId, data: finalData as any },
        {
          onSuccess: () => {
            const message =
              statusOverride === "published"
                ? "Resource published just now."
                : "Draft saved successfully.";
            toast.success(message);
            form.reset(form.getValues());
            showSaveFeedback("saved", message);
            queryClient.invalidateQueries({ queryKey: getListWorkspaceResourcesQueryKey() });
          },
          onError: () => {
            const message =
              statusOverride === "published"
                ? "Complete the required fields before publishing."
                : "Couldn’t update resource. Try again.";
            toast.error(message);
            showSaveFeedback("error", message);
          }
        }
      );
    }
  };

  const saveDraft = () => {
    const values = form.getValues();
    const result = draftSchema.safeParse({ title: values.title });
    if (!result.success) {
      form.setError("title", {
        type: "manual",
        message: result.error.issues[0]?.message ?? "Title is required",
      });
      return;
    }
    form.clearErrors();
    onSubmit(values, "draft");
  };

  const publishResource = () => {
    const values = form.getValues();
    const missingFields = [
      values.title.trim().length < 3 ? "a title of at least 3 characters" : null,
      !values.subject.trim() ? "a subject" : null,
      !values.level.trim() ? "a level" : null,
      values.excerpt.trim().length < 10 ? "an excerpt of at least 10 characters" : null,
      values.body.trim().length < 20 ? "an introduction of at least 20 characters" : null,
    ].filter((field): field is string => field !== null);
    const incompleteSectionIndex = values.sections.findIndex(
      (section) =>
        section.heading.trim().length < 2 || section.body.trim().length < 10,
    );
    if (incompleteSectionIndex >= 0) {
      missingFields.push(`complete content for section ${incompleteSectionIndex + 1}`);
    }

    const firstInvalidField =
      values.title.trim().length < 3
        ? "title"
        : !values.subject.trim()
          ? "subject"
          : !values.level.trim()
            ? "level"
            : values.excerpt.trim().length < 10
              ? "excerpt"
              : values.body.trim().length < 20
                ? "body"
                : incompleteSectionIndex >= 0
                  ? `sections.${incompleteSectionIndex}.${values.sections[incompleteSectionIndex].heading.trim().length < 2 ? "heading" : "body"}`
                  : null;

    const result = resourceSchema.safeParse(values);
    if (!result.success) {
      form.clearErrors();
      for (const issue of result.error.issues) {
        const path = issue.path.join(".");
        if (path) {
          form.setError(path as keyof ResourceFormValues, {
            type: "manual",
            message: issue.message,
          });
        }
      }

      const message =
        missingFields.length > 0
          ? `Add ${missingFields.join(", ")} before publishing.`
          : "Check the highlighted fields before publishing.";
      setPublishValidationMessage(message);
      toast.error("Complete the resource before publishing", {
        description: message,
      });
      if (firstInvalidField) {
        window.requestAnimationFrame(() => {
          form.setFocus(firstInvalidField as keyof ResourceFormValues);
        });
      }
      return;
    }

    form.clearErrors();
    setPublishValidationMessage(null);
    onSubmit(result.data, "published");
  };

  if (!isNew && isLoadingResources) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[50vh]">
        <Loader2 className="animate-spin text-muted-foreground w-6 h-6" />
      </div>
    );
  }

  if (!isNew && !isLoadingResources && !resource) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[50vh]">
        <h2 className="text-xl font-serif mb-2">Resource not found</h2>
      </div>
    );
  }

  const currentStatus = form.watch("status");

  return (
    <div className="max-w-4xl mx-auto w-full p-6 md:p-12 pb-24">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-serif text-foreground">
            {isNew ? "New Draft" : "Edit Resource"}
          </h1>
          {!isNew && currentStatus && (
            <p className="text-sm text-muted-foreground mt-2">
              Status: <span className="font-medium text-foreground">{currentStatus === 'published' ? 'Published' : 'Draft'}</span>
            </p>
          )}
          {saveFeedback && (
            <p
              className={`mt-3 flex items-center gap-2 text-sm ${
                saveFeedback === "saved"
                  ? "text-emerald-700"
                  : "text-destructive"
              }`}
              role="status"
            >
              {saveFeedback === "saved" && <Check className="h-4 w-4" />}
              {saveMessage}
            </p>
          )}
          {publishValidationMessage && (
            <div
              className="mt-4 flex max-w-xl items-start gap-2 border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
              role="alert"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <p className="font-semibold">Almost ready to publish</p>
                <p>{publishValidationMessage}</p>
              </div>
            </div>
          )}
        </div>
        <div className="flex gap-3">
          <Button 
            type="button"
            variant="outline" 
            onClick={saveDraft}
            disabled={createResource.isPending || updateResource.isPending}
          >
            Save Draft
          </Button>
          <Button 
            type="button"
            onClick={publishResource}
            disabled={createResource.isPending || updateResource.isPending}
          >
            {currentStatus === 'published' ? 'Update Published' : 'Publish'}
          </Button>
        </div>
      </div>

      <Form {...form}>
        <form className="space-y-12">
          {/* Metadata Section */}
          <div className="bg-card border border-border p-6 md:p-8 space-y-6">
            <h2 className="text-lg font-serif mb-4">Metadata</h2>
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Title</FormLabel>
                  <FormControl>
                    <Input {...field} className="text-lg font-serif h-12 rounded-none border-border bg-transparent shadow-none" placeholder="Enter resource title..." />
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="subject"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Subject</FormLabel>
                    <FormControl>
                      <Input {...field} className="rounded-none border-border bg-transparent shadow-none h-10" placeholder="e.g. History" />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="level"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Level</FormLabel>
                    <FormControl>
                      <Input {...field} className="rounded-none border-border bg-transparent shadow-none h-10" placeholder="e.g. A-Level" />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                   <FormLabel className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Format</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="rounded-none border-border bg-transparent shadow-none h-10">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="rounded-none border-border shadow-md">
                         <SelectItem value="Study note" className="rounded-none">Study note</SelectItem>
                        <SelectItem value="Guide" className="rounded-none">Guide</SelectItem>
                        <SelectItem value="Essay" className="rounded-none">Essay</SelectItem>
                         <SelectItem value="Revision notes" className="rounded-none">Revision notes</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={form.control}
              name="excerpt"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Excerpt</FormLabel>
                   <FormDescription className="text-xs">A short summary for resource cards.</FormDescription>
                  <FormControl>
                    <Textarea {...field} className="min-h-[80px] rounded-none border-border bg-transparent shadow-none resize-y text-sm" />
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />
          </div>

          {/* Main Content Section */}
          <div className="space-y-6">
            <h2 className="text-xl font-serif border-b border-border pb-2">Content</h2>
            
            <FormField
              control={form.control}
              name="body"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Introduction</FormLabel>
                  <FormControl>
                    <Textarea {...field} className="min-h-[200px] rounded-none border-border bg-card shadow-none resize-y text-sm leading-relaxed" placeholder="Write the introduction here..." />
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />

            <div className="space-y-8 pt-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-serif">Sections</h3>
              </div>
              
              {fields.map((field, index) => (
                <div key={field.id} className="relative bg-card border border-border p-6 group">
                  <Button 
                    type="button"
                    variant="ghost" 
                    size="sm" 
                    className="absolute top-4 right-4 text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => remove(index)}
                  >
                    <Trash2 size={16} />
                  </Button>
                  
                  <div className="space-y-4 pr-12">
                    <FormField
                      control={form.control}
                      name={`sections.${index}.heading`}
                      render={({ field: inputField }) => (
                        <FormItem>
                          <FormLabel className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Section Heading</FormLabel>
                          <FormControl>
                            <Input {...inputField} className="text-base font-serif font-medium rounded-none border-border bg-transparent shadow-none" placeholder="Heading..." />
                          </FormControl>
                          <FormMessage className="text-xs" />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`sections.${index}.body`}
                      render={({ field: inputField }) => (
                        <FormItem>
                          <FormLabel className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Section Body</FormLabel>
                          <FormControl>
                            <Textarea {...inputField} className="min-h-[150px] rounded-none border-border bg-transparent shadow-none resize-y text-sm leading-relaxed" placeholder="Content..." />
                          </FormControl>
                          <FormMessage className="text-xs" />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              ))}

              <Button
                type="button"
                variant="outline"
                className="w-full py-8 border-dashed gap-2 text-muted-foreground hover:text-foreground hover:border-foreground transition-colors rounded-none bg-transparent"
                onClick={() => append({ id: crypto.randomUUID(), heading: "", body: "" })}
              >
                <Plus size={16} /> Add Section
              </Button>
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
}
