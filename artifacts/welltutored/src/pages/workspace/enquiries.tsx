import { format } from "date-fns";
import { Inbox, RefreshCw } from "lucide-react";
import {
  getListWorkspaceEnquiriesQueryKey,
  useListWorkspaceEnquiries,
  useRetryWorkspaceEnquiry,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const statusLabels = {
  delivered: "Delivered",
  pending: "Pending delivery",
  failed: "Delivery failed",
} as const;

export default function WorkspaceEnquiries() {
  const { data: enquiries, isLoading, isError, refetch } = useListWorkspaceEnquiries();
  const retryEnquiry = useRetryWorkspaceEnquiry();
  const queryClient = useQueryClient();

  const handleRetry = (id: number) => {
    retryEnquiry.mutate(
      { id },
      {
        onSuccess: () => {
          toast.success("Enquiry delivered");
          queryClient.invalidateQueries({ queryKey: getListWorkspaceEnquiriesQueryKey() });
        },
        onError: () => {
          toast.error("Delivery is still unavailable. Try again later.");
          queryClient.invalidateQueries({ queryKey: getListWorkspaceEnquiriesQueryKey() });
        },
      },
    );
  };

  return (
    <div className="max-w-6xl mx-auto w-full p-6 md:p-12">
      <div className="mb-10">
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary mb-3">Staff inbox</p>
        <h1 className="text-3xl font-serif text-foreground mb-2">Enquiries</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Review named-tutor enquiries. Tutor accounts see their assigned profile; owners see the full agency inbox.
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((item) => (
            <Card key={item} className="rounded-none border-border shadow-none">
              <CardHeader><Skeleton className="h-5 w-48" /><Skeleton className="h-4 w-72" /></CardHeader>
              <CardContent><Skeleton className="h-16 w-full" /></CardContent>
            </Card>
          ))}
        </div>
      ) : isError ? (
        <Card className="rounded-none border-border shadow-none">
          <CardHeader>
            <CardTitle className="font-serif">Inbox unavailable</CardTitle>
            <CardDescription>We could not load your enquiries.</CardDescription>
          </CardHeader>
          <CardContent><Button variant="outline" onClick={() => void refetch()}>Try again</Button></CardContent>
        </Card>
      ) : enquiries?.length ? (
        <div className="space-y-4">
          {enquiries.map((enquiry) => (
            <Card key={enquiry.id} className="rounded-none border-border shadow-none">
              <CardHeader className="pb-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <CardTitle className="text-xl font-serif">{enquiry.name}</CardTitle>
                    <CardDescription className="mt-1">
                      {enquiry.email} · For {enquiry.tutorName} · {format(new Date(enquiry.createdAt), "d MMM yyyy, HH:mm")}
                    </CardDescription>
                  </div>
                  <Badge variant={enquiry.deliveryStatus === "delivered" ? "default" : "secondary"} className="rounded-none">
                    {statusLabels[enquiry.deliveryStatus]}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-[180px_1fr_auto] border-t border-border pt-5">
                <div className="text-sm">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Student</p>
                  <p>{enquiry.studentName}, {enquiry.studentAge}</p>
                  <p className="text-muted-foreground">{enquiry.subjectLevel}</p>
                </div>
                <p className="text-sm leading-6 whitespace-pre-wrap">{enquiry.message}</p>
                {enquiry.deliveryStatus !== "delivered" && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 self-start"
                    disabled={retryEnquiry.isPending}
                    onClick={() => handleRetry(enquiry.id)}
                  >
                    <RefreshCw size={14} /> Retry delivery
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="border border-border border-dashed p-12 text-center flex flex-col items-center">
          <Inbox className="text-muted-foreground w-8 h-8 mb-4" />
          <h2 className="text-xl font-serif mb-2">No enquiries yet</h2>
          <p className="text-sm text-muted-foreground">New named-tutor enquiries will appear here.</p>
        </div>
      )}
    </div>
  );
}