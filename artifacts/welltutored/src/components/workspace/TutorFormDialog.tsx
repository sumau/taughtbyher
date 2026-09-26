import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  useCreateWorkspaceTutor,
  type TutorStubInput,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

const tutorStubSchema = z.object({
  name: z.string().min(2, "Name is required"),
});

type TutorStubValues = z.infer<typeof tutorStubSchema>;

const defaultValues: TutorStubValues = {
  name: "",
};

interface TutorFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

export function TutorFormDialog({
  open,
  onOpenChange,
  onCreated,
}: TutorFormDialogProps) {
  const createTutor = useCreateWorkspaceTutor();
  const form = useForm<TutorStubValues>({
    resolver: zodResolver(tutorStubSchema),
    defaultValues,
  });

  const onSubmit = (values: TutorStubValues) => {
    const tutorInput: TutorStubInput = {
      name: values.name,
    };

    createTutor.mutate(
      { data: tutorInput },
      {
        onSuccess: () => {
          toast.success("Tutor profile stub created");
          form.reset(defaultValues);
          onOpenChange(false);
          onCreated();
        },
        onError: () => {
          toast.error("Failed to create tutor profile stub");
        },
      },
    );
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) form.reset(defaultValues);
        onOpenChange(nextOpen);
      }}
    >
      <DialogContent className="max-w-lg rounded-none border-border">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl">
            Create tutor profile stub
          </DialogTitle>
          <DialogDescription>
             Create a draft profile for a tutor, then assign it to their workspace
            account. They will complete the public profile themselves.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tutor name</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="e.g. Maya Shah"
                      className="rounded-none"
                      autoFocus
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
              This creates a private draft. Assign the profile to the tutor’s
               workspace account from the account management table so they can add
              their biography, teaching approach, availability, and other
              public details.
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                className="rounded-none"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="rounded-none"
                disabled={createTutor.isPending}
              >
                {createTutor.isPending ? "Creating..." : "Create draft"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}