import { Link } from "wouter";
import {
  getGetWorkspaceSessionQueryKey,
  getListWorkspaceAccountsQueryKey,
  getListWorkspaceTutorsQueryKey,
  getListWorkspaceResourcesQueryKey,
  useListWorkspaceAccounts,
  useDeleteWorkspaceAccount,
  useUpdateWorkspaceAccount,
} from "@workspace/api-client-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Trash2 } from "lucide-react";
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

export default function WorkspaceAccounts() {
  const { data: accounts, isLoading } = useListWorkspaceAccounts();
  const deleteAccount = useDeleteWorkspaceAccount();
  const updateAccount = useUpdateWorkspaceAccount();
  const queryClient = useQueryClient();

  const invalidateAccountViews = () => {
    queryClient.invalidateQueries({ queryKey: getListWorkspaceAccountsQueryKey() });
    queryClient.invalidateQueries({ queryKey: getListWorkspaceTutorsQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetWorkspaceSessionQueryKey() });
    queryClient.invalidateQueries({ queryKey: getListWorkspaceResourcesQueryKey() });
  };

  const handleRoleChange = (id: number, role: "tutor" | "pending") => {
    const account = accounts?.find((item) => item.id === id);
    updateAccount.mutate(
      {
        id,
        data: {
          role,
          ...(role === "tutor" ? { tutorId: account?.tutorId ?? null } : {}),
        },
      },
      {
        onSuccess: () => {
          toast.success("Account role updated");
          invalidateAccountViews();
        },
        onError: () => {
          toast.error("Failed to update account");
        }
      }
    );
  };

  const handleDeleteAccount = (id: number) => {
    deleteAccount.mutate(
      { id },
      {
        onSuccess: () => {
          toast.success("Workspace account removed");
          invalidateAccountViews();
        },
        onError: () => {
          toast.error("Failed to remove Workspace account");
        },
      },
    );
  };

  return (
    <div className="max-w-5xl mx-auto w-full p-6 md:p-12">
      <div className="mb-10">
        <div>
          <h1 className="text-3xl font-serif text-foreground mb-2">Workspace accounts</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Manage access for approved and pending users. Assign accounts to
            tutor profiles on the Tutor profiles page; use this page for roles
            and account removal.
          </p>
        </div>
      </div>

      <section aria-labelledby="workspace-accounts-heading">
        <div className="mb-5">
          <h2 id="workspace-accounts-heading" className="font-serif text-xl">Accounts</h2>
        </div>

        <div className="overflow-x-auto border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="w-[250px] font-semibold text-xs uppercase tracking-wider text-muted-foreground">Workspace account</TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">Access role</TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">Tutor profile</TableHead>
                <TableHead className="text-right font-semibold text-xs uppercase tracking-wider text-muted-foreground">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                [1, 2, 3].map(i => (
                  <TableRow key={i} className="border-border">
                    <TableCell><Skeleton className="mb-1 h-4 w-32" /><Skeleton className="h-3 w-48" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-40" /></TableCell>
                    <TableCell><Skeleton className="ml-auto h-8 w-20" /></TableCell>
                  </TableRow>
                ))
              ) : accounts && accounts.length > 0 ? (
                accounts.map((account) => (
                  <TableRow key={account.id} className="border-border">
                    <TableCell>
                      <div className="font-medium" data-testid={`text-workspace-account-${account.id}`}>{account.displayName}</div>
                      <div className="text-xs text-muted-foreground" data-testid={`text-workspace-account-email-${account.id}`}>{account.email}</div>
                    </TableCell>
                    <TableCell>
                      {account.role !== "owner" ? (
                        <Select
                          value={account.role}
                          onValueChange={(val: "tutor" | "pending") => handleRoleChange(account.id, val)}
                        >
                          <SelectTrigger
                            className="h-8 w-[150px] rounded-none border-border bg-transparent text-xs shadow-none"
                            data-testid={`select-account-role-${account.id}`}
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="rounded-none border-border shadow-md">
                            <SelectItem value="pending" className="rounded-none text-xs">Pending approval</SelectItem>
                            <SelectItem value="tutor" className="rounded-none text-xs">Tutor access</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge
                          variant="default"
                          className="rounded-none px-2 py-0.5 text-[11px] font-normal"
                          data-testid={`status-account-role-${account.id}`}
                        >
                          Owner access
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {account.tutorName ? (
                          <Link
                            href="/workspace/tutors"
                            className="text-sm underline-offset-4 hover:text-primary hover:underline"
                            data-testid={`link-account-tutor-profile-${account.id}`}
                          >
                            {account.tutorName}
                          </Link>
                        ) : account.role === "pending" ? (
                          <Badge
                            variant="outline"
                            className="rounded-none text-[10px] font-normal"
                          >
                            Starts after approval
                          </Badge>
                        ) : (
                          <span className="text-sm text-muted-foreground">
                            No profile linked
                          </span>
                        )}
                        {account.tutorProfileStatus && (
                          <Badge
                            variant={
                              account.tutorProfileStatus === "published"
                                ? "secondary"
                                : account.tutorProfileStatus === "archived"
                                  ? "destructive"
                                  : "outline"
                            }
                            className="rounded-none text-[10px] font-normal"
                            data-testid={`status-tutor-profile-${account.id}`}
                          >
                            {account.tutorProfileStatus === "published"
                              ? "Published"
                              : account.tutorProfileStatus === "archived"
                                ? "Archived"
                                : "Draft"}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {account.role !== "owner" && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <button
                              type="button"
                              className="inline-flex h-8 items-center gap-2 rounded-none px-2 text-xs text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                              data-testid={`button-remove-workspace-account-${account.id}`}
                            >
                              <Trash2 size={14} /> Remove
                            </button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="rounded-none border-border">
                            <AlertDialogHeader>
                              <AlertDialogTitle className="font-serif">
                                Remove {account.displayName}?
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                This removes the Workspace sign-in record but does
                                not delete the tutor profile or any resources. If
                                this person signs in again with a verified email,
                                they can create a new pending account.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel className="rounded-none">Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                className="rounded-none bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                onClick={() => handleDeleteAccount(account.id)}
                                data-testid={`button-confirm-remove-workspace-account-${account.id}`}
                              >
                                Remove account
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center text-sm text-muted-foreground">
                    No Workspace accounts found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </section>
    </div>
  );
}
