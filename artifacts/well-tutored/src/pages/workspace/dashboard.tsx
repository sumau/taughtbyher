import { Link, useLocation } from "wouter";
import { useGetWorkspaceSession, useListWorkspaceResources, useDeleteWorkspaceResource, getListWorkspaceResourcesQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Trash2, Edit } from "lucide-react";
import { format } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
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
import { useClerk } from "@clerk/react";

export default function WorkspaceDashboard() {
  const { data: session, isError: sessionError } = useGetWorkspaceSession();
  const { data: resources, isLoading } = useListWorkspaceResources();
  const deleteResource = useDeleteWorkspaceResource();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const { signOut } = useClerk();
  const hasTutorProfile = Boolean(session?.tutor);
  const firstName =
    session?.tutor?.firstName?.trim() ||
    session?.displayName?.trim().split(/\s+/)[0] ||
    "there";

  const handleDelete = (id: number) => {
    deleteResource.mutate(
      { id },
      {
        onSuccess: () => {
          toast.success("Resource deleted");
          queryClient.invalidateQueries({ queryKey: getListWorkspaceResourcesQueryKey() });
        },
        onError: () => {
          toast.error("Failed to delete resource");
        }
      }
    );
  };

  if (sessionError) {
    return (
      <div className="max-w-xl mx-auto w-full p-6 md:p-12 flex-1 flex flex-col justify-center">
        <Card className="rounded-none border-border shadow-none">
          <CardHeader>
            <CardTitle className="text-3xl font-serif">Workspace access is by invitation.</CardTitle>
            <CardDescription>
              This email address is not approved for a workspace account, or its email ownership has not been verified.
            </CardDescription>
          </CardHeader>
          <CardFooter className="gap-3">
            <Button variant="outline" onClick={() => signOut()}>Sign out</Button>
            <Link href="/">
              <Button>Back to site</Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto w-full p-6 md:p-12">
      <div className="mb-12">
        <div>
          <h1 className="text-3xl font-serif text-foreground mb-2">
            Welcome, {firstName}.
          </h1>
          <p className="text-muted-foreground text-sm">
            {session?.role === "owner" 
              ? "Manage tutors and review content across the agency." 
              : "Manage your profile and publish resources"}
          </p>
        </div>
      </div>

      <div className="mb-8 flex items-center justify-between">
        <h2 className="text-xl font-serif">Your Resources</h2>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <Card key={i} className="rounded-none border-border shadow-none">
              <CardHeader>
                <Skeleton className="h-6 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-16 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : resources && resources.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {resources.map((resource) => (
            <Card key={resource.id} className="rounded-none border-border shadow-none flex flex-col group">
              <CardHeader className="pb-3 flex-1">
                <div className="flex justify-between items-start gap-4 mb-2">
                  <Badge variant={resource.status === "published" ? "default" : "secondary"} className="rounded-none font-normal text-[11px] px-2 py-0.5 tracking-wide">
                    {resource.status === "published" ? "Published" : "Draft"}
                  </Badge>
                  {resource.status === "published" && resource.publishedAt && (
                    <span className="text-[11px] text-muted-foreground">
                      {format(new Date(resource.publishedAt), "MMM d, yyyy")}
                    </span>
                  )}
                </div>
                <CardTitle className="text-lg font-serif line-clamp-2 leading-tight group-hover:text-primary transition-colors cursor-pointer" onClick={() => setLocation(`/workspace/resources/${resource.id}`)}>
                  {resource.title}
                </CardTitle>
                <CardDescription className="text-xs">
                  {resource.subject} • {resource.level}
                </CardDescription>
              </CardHeader>
              
              <CardContent className="text-sm text-muted-foreground line-clamp-3 pb-4">
                {resource.excerpt || "No excerpt written yet."}
              </CardContent>

              <CardFooter className="pt-4 border-t border-border flex justify-between gap-2">
                <Link href={`/workspace/resources/${resource.id}`} className="flex-1">
                  <Button variant="ghost" size="sm" className="w-full gap-2 text-xs font-semibold justify-start text-muted-foreground hover:text-foreground">
                    <Edit size={14} /> Edit
                  </Button>
                </Link>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="sm" className="text-xs text-destructive hover:bg-destructive/10 hover:text-destructive">
                      <Trash2 size={14} />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="rounded-none border-border">
                    <AlertDialogHeader>
                      <AlertDialogTitle className="font-serif">Delete Resource</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete the resource "{resource.title}". This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel className="rounded-none">Cancel</AlertDialogCancel>
                      <AlertDialogAction className="rounded-none bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => handleDelete(resource.id)}>
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <div className="border border-border border-dashed p-12 text-center flex flex-col items-center">
          <div className="w-12 h-12 bg-muted flex items-center justify-center rounded-full mb-4">
            <FileText className="text-muted-foreground w-6 h-6" />
          </div>
          <h3 className="text-lg font-serif mb-2">No resources yet</h3>
          <p className="text-sm text-muted-foreground mb-6 max-w-sm">
             {hasTutorProfile
               ? "You haven't written any resources yet. Create a draft to get started."
                : "There are no resources in the workspace yet."}
          </p>
          {hasTutorProfile && (
            <Link href="/workspace/resources/new">
              <Button>Create First Draft</Button>
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
