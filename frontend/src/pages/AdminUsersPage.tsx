import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { authService } from "@/services/authService";
import { User, SystemRole } from "@/types/auth";
import {
  Users,
  Search,
  CheckCircle2,
  XCircle,
  Shield,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
  Mail,
} from "lucide-react";

export function AdminUsersPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [filterActive, setFilterActive] = useState<boolean | undefined>(undefined);
  const [editingRolesUser, setEditingRolesUser] = useState<User | null>(null);
  const [selectedRole, setSelectedRole] = useState<string>("STUDENT");
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Fetch Users
  const {
    data: paginatedData,
    isLoading,
    isFetching,
  } = useQuery({
    queryKey: ["admin_users", page, search, filterActive],
    queryFn: () =>
      authService.listUsers({
        page,
        page_size: 10,
        search: search.trim() || undefined,
        is_active: filterActive,
      }),
  });

  // Toggle User Status Mutation
  const toggleStatusMutation = useMutation({
    mutationFn: async ({ userId, activate }: { userId: string; activate: boolean }) => {
      return authService.adminSetUserStatus(userId, activate);
    },
    onSuccess: (updatedUser) => {
      queryClient.invalidateQueries({ queryKey: ["admin_users"] });
      setActionSuccess(
        `User ${updatedUser.email} has been ${updatedUser.is_active ? "activated" : "deactivated"}.`
      );
      setTimeout(() => setActionSuccess(null), 4000);
    },
    onError: (err: Error) => {
      setActionError(err.message || "Failed to update user status.");
    },
  });

  // Assign Role Mutation
  const assignRoleMutation = useMutation({
    mutationFn: async ({ userId, roleNames }: { userId: string; roleNames: string[] }) => {
      return authService.adminSetUserRoles(userId, roleNames);
    },
    onSuccess: (updatedUser) => {
      queryClient.invalidateQueries({ queryKey: ["admin_users"] });
      setEditingRolesUser(null);
      setActionSuccess(`Assigned roles [${updatedUser.roles.join(", ")}] to ${updatedUser.email}.`);
      setTimeout(() => setActionSuccess(null), 4000);
    },
    onError: (err: Error) => {
      setActionError(err.message || "Failed to assign roles.");
    },
  });

  const availableRoles: SystemRole[] = ["SUPER_ADMIN", "ADMIN", "INSTRUCTOR", "STUDENT"];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              User Management
            </h1>
            <p className="text-slate-400 text-sm mt-0.5">
              Platform administration, account status, and role-based access control
            </p>
          </div>
        </div>
      </div>

      {/* Notifications */}
      {actionSuccess && (
        <div
          role="alert"
          className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-sm flex items-center gap-3 animate-in fade-in"
        >
          <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-400" />
          <p className="font-medium">{actionSuccess}</p>
        </div>
      )}

      {actionError && (
        <div
          role="alert"
          className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm flex items-center gap-3 animate-in fade-in"
        >
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-400" />
          <p className="font-medium">{actionError}</p>
        </div>
      )}

      {/* Filters Bar */}
      <div className="bg-slate-900/80 border border-slate-800 backdrop-blur-xl rounded-2xl p-4 shadow-lg flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-10 pr-4 py-2 bg-slate-800/80 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => {
              setFilterActive(undefined);
              setPage(1);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              filterActive === undefined
                ? "bg-indigo-600 text-white"
                : "bg-slate-800 text-slate-400 hover:text-white"
            }`}
          >
            All Users
          </button>
          <button
            type="button"
            onClick={() => {
              setFilterActive(true);
              setPage(1);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              filterActive === true
                ? "bg-emerald-600 text-white"
                : "bg-slate-800 text-slate-400 hover:text-white"
            }`}
          >
            Active
          </button>
          <button
            type="button"
            onClick={() => {
              setFilterActive(false);
              setPage(1);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              filterActive === false
                ? "bg-rose-600 text-white"
                : "bg-slate-800 text-slate-400 hover:text-white"
            }`}
          >
            Suspended
          </button>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-slate-900/80 border border-slate-800 backdrop-blur-xl rounded-2xl shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-800/60 border-b border-slate-800 text-slate-400 uppercase tracking-wider font-semibold">
              <tr>
                <th className="px-6 py-3.5">User</th>
                <th className="px-6 py-3.5">Assigned Roles</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5">Verification</th>
                <th className="px-6 py-3.5">Registered</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-slate-400">
                    <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mx-auto mb-2" />
                    <span>Loading platform users...</span>
                  </td>
                </tr>
              ) : paginatedData?.items?.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-slate-400">
                    No users matching the criteria.
                  </td>
                </tr>
              ) : (
                paginatedData?.items?.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-indigo-600/20 text-indigo-300 font-bold flex items-center justify-center border border-indigo-500/30">
                          {u.first_name?.[0]}
                          {u.last_name?.[0]}
                        </div>
                        <div>
                          <p className="font-semibold text-white text-sm">{u.full_name}</p>
                          <p className="text-slate-400 text-[11px] flex items-center gap-1">
                            <Mail className="w-3 h-3 text-slate-400" />
                            <span>{u.email}</span>
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {u.roles.map((r) => (
                          <span
                            key={r}
                            className="px-2 py-0.5 rounded bg-indigo-950/70 border border-indigo-800/60 text-indigo-300 font-mono text-[10px] font-bold"
                          >
                            {r}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                          u.is_active
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                        }`}
                      >
                        {u.is_active ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                        <span>{u.is_active ? "Active" : "Suspended"}</span>
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1 text-[11px] font-medium ${
                          u.is_verified ? "text-emerald-400" : "text-amber-400"
                        }`}
                      >
                        {u.is_verified ? <ShieldCheck className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                        <span>{u.is_verified ? "Verified" : "Unverified"}</span>
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-400 font-mono text-[11px]">
                      {new Date(u.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingRolesUser(u);
                          setSelectedRole(u.roles[0] || "STUDENT");
                        }}
                        title="Manage Roles"
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
                      >
                        <Shield className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          toggleStatusMutation.mutate({
                            userId: u.id,
                            activate: !u.is_active,
                          })
                        }
                        disabled={toggleStatusMutation.isPending}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-colors ${
                          u.is_active
                            ? "bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border-rose-500/20"
                            : "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/20"
                        }`}
                      >
                        {u.is_active ? "Suspend" : "Activate"}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {paginatedData && (
          <div className="p-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <div>
              Showing <span className="text-white font-medium">{paginatedData.items.length}</span> of{" "}
              <span className="text-white font-medium">{paginatedData.total}</span> total users
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1 || isFetching}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-2 font-mono text-xs text-white">
                {paginatedData.page} / {paginatedData.total_pages || 1}
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => (p < paginatedData.total_pages ? p + 1 : p))}
                disabled={page >= paginatedData.total_pages || isFetching}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 disabled:opacity-40"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Role Management Modal */}
      {editingRolesUser && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-5 animate-in fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Shield className="w-5 h-5 text-indigo-400" />
                <span>Assign Roles</span>
              </h3>
              <button
                type="button"
                onClick={() => setEditingRolesUser(null)}
                className="text-slate-400 hover:text-white text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-300">
              Update authorization role for{" "}
              <span className="text-white font-semibold">{editingRolesUser.email}</span>:
            </p>

            <div className="space-y-2">
              {availableRoles.map((role) => (
                <label
                  key={role}
                  className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-colors ${
                    selectedRole === role
                      ? "bg-indigo-600/10 border-indigo-500 text-white"
                      : "bg-slate-800/40 border-slate-700/60 text-slate-400 hover:border-slate-600"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <input
                      type="radio"
                      name="role"
                      value={role}
                      checked={selectedRole === role}
                      onChange={() => setSelectedRole(role)}
                      className="text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="font-semibold text-xs font-mono">{role}</span>
                  </div>
                  <span className="text-[10px] text-slate-400">
                    {role === "SUPER_ADMIN"
                      ? "Full system control"
                      : role === "ADMIN"
                      ? "Admin governance"
                      : role === "INSTRUCTOR"
                      ? "Course creation & analytics"
                      : "Learner access"}
                  </span>
                </label>
              ))}
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setEditingRolesUser(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() =>
                  assignRoleMutation.mutate({
                    userId: editingRolesUser.id,
                    roleNames: [selectedRole],
                  })
                }
                disabled={assignRoleMutation.isPending}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 disabled:opacity-50"
              >
                {assignRoleMutation.isPending ? "Assigning..." : "Confirm Role"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
