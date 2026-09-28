import { useMutation } from "@tanstack/react-query";
import { Users } from "lucide-react";
import type { PublicUser } from "@shared/api";
import { USER_ROLES, type UserRole } from "@shared/constants";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Pager } from "@/components/Pager";
import { Pill } from "@/components/StatusBadge";
import { EmptyState, ErrorState, Spinner } from "@/components/states";
import { toast } from "@/hooks/use-toast";
import { api, errorMessage, queryClient } from "@/lib/api";
import { roleLabel, useAuth } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { AdminHeader } from "./AdminNav";
import { ListToolbar } from "./ListToolbar";
import { useAdminList } from "./useAdminList";

function RoleSelect({ user, disabled, onChange }: { user: PublicUser; disabled: boolean; onChange: (role: UserRole) => void }) {
  return (
    <select
      aria-label={`Role for ${user.name}`}
      value={user.role}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value as UserRole)}
      className="h-9 rounded-md border border-input bg-background px-2 text-sm disabled:opacity-60"
    >
      {USER_ROLES.map((r) => <option key={r} value={r}>{roleLabel[r]}</option>)}
    </select>
  );
}

export default function AdminUsersPage() {
  const { user: me } = useAuth();
  const list = useAdminList<PublicUser>("/api/admin/users", "role");
  const update = useMutation({
    mutationFn: ({ id, ...body }: { id: number; role?: UserRole; isActive?: boolean }) => api<PublicUser>("PATCH", `/api/admin/users/${id}`, body),
    onSuccess: (u) => {
      queryClient.invalidateQueries({ predicate: (q) => String(q.queryKey[0]).startsWith("/api/admin/") });
      toast({ title: "User updated", description: `${u.name} is now ${u.isActive ? roleLabel[u.role].toLowerCase() : "deactivated"}.` });
    },
    onError: (err) => toast({ variant: "destructive", title: "Couldn't update user", description: errorMessage(err) }),
  });
  const rows = list.query.data?.data ?? [];

  const actions = (u: PublicUser) => {
    const self = u.id === me?.id;
    return (
      <div className="flex flex-wrap items-center gap-2">
        <RoleSelect user={u} disabled={self || update.isPending} onChange={(role) => update.mutate({ id: u.id, role })} />
        {!self && (
          <ConfirmDialog
            trigger={<Button variant="ghost" size="sm" className={u.isActive ? "text-destructive hover:text-destructive" : ""} disabled={update.isPending}>{u.isActive ? "Deactivate" : "Reactivate"}</Button>}
            title={u.isActive ? `Deactivate ${u.name}?` : `Reactivate ${u.name}?`}
            description={u.isActive ? "They'll be signed out everywhere and can't sign in until reactivated. Their registrations are kept." : "They'll be able to sign in again."}
            confirmLabel={u.isActive ? "Deactivate" : "Reactivate"}
            destructive={u.isActive}
            onConfirm={() => update.mutate({ id: u.id, isActive: !u.isActive })}
          />
        )}
        {self && <span className="text-xs text-muted-foreground">You</span>}
      </div>
    );
  };

  return (
    <div className="container-page py-10">
      <AdminHeader title="Users" description="Grant organizer or admin access and manage accounts. Role changes sign the user out so new permissions apply immediately." />
      <ListToolbar
        search={list.search}
        onSearch={list.setSearch}
        placeholder="Search by name or email"
        filter={list.filter}
        onFilter={list.setFilter}
        filterLabel="Filter by role"
        options={USER_ROLES.map((r) => ({ value: r, label: roleLabel[r] }))}
      />
      <div className="mt-4">
        {list.query.isLoading ? (
          <Spinner />
        ) : list.query.error ? (
          <ErrorState error={list.query.error} onRetry={() => list.query.refetch()} />
        ) : !rows.length ? (
          <EmptyState icon={Users} title="No users found" />
        ) : (
          <>
            <ul className="grid gap-3 md:hidden">
              {rows.map((u) => (
                <li key={u.id} className="rounded-xl border bg-card p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{u.name}</p>
                      <p className="truncate text-sm text-muted-foreground">{u.email}</p>
                    </div>
                    {!u.isActive && <Pill variant="danger">Inactive</Pill>}
                  </div>
                  <div className="mt-3">{actions(u)}</div>
                </li>
              ))}
            </ul>
            <div className="hidden overflow-x-auto rounded-xl border bg-card md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Role & access</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell><p className="font-medium">{u.name}</p><p className="text-sm text-muted-foreground">{u.email}</p></TableCell>
                      <TableCell className="text-sm">{u.department ?? "—"}</TableCell>
                      <TableCell className="whitespace-nowrap text-sm">{formatDate(u.createdAt)}</TableCell>
                      <TableCell>{u.isActive ? <Pill variant="success">Active</Pill> : <Pill variant="danger">Inactive</Pill>}</TableCell>
                      <TableCell>{actions(u)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {list.query.data && <Pager meta={list.query.data.meta} onPage={list.setPage} />}
          </>
        )}
      </div>
    </div>
  );
}
