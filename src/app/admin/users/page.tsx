import Link from "next/link";
import { prisma } from "@/lib/db";
import { ResetPasswordForm } from "@/components/admin/reset-password-form";

const ROLE_LABELS: Record<string, string> = { citizen: "Citizen", officer: "Officer", admin: "Admin" };

export default async function AdminUsersPage({ searchParams }: PageProps<"/admin/users">) {
  const sp = await searchParams;
  const roleFilter = typeof sp.role === "string" && sp.role.length > 0 ? sp.role : undefined;

  const users = await prisma.user.findMany({
    where: roleFilter ? { role: roleFilter } : undefined,
    include: { assignedServiceType: true, _count: { select: { requestsSubmitted: true } } },
    orderBy: [{ role: "asc" }, { name: "asc" }],
  });

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">Users</h1>
          <p className="mt-1 text-sm text-ink-soft">
            Every citizen, officer, and admin account. Resetting a password takes effect immediately — there&apos;s
            no email link, so relay the new password to them directly.
          </p>
        </div>
      </div>

      <form className="mt-6 flex flex-wrap items-end gap-4 border border-line bg-paper-raised p-4 text-sm">
        <label className="flex flex-col gap-1">
          <span className="text-xs tracking-wide text-ink-soft uppercase">Role</span>
          <select name="role" defaultValue={roleFilter ?? ""} className="border border-line bg-paper px-2 py-1.5 text-ink">
            <option value="">All</option>
            <option value="citizen">Citizen</option>
            <option value="officer">Officer</option>
            <option value="admin">Admin</option>
          </select>
        </label>
        <button type="submit" className="rounded-sm bg-accent px-4 py-1.5 font-semibold text-paper hover:opacity-90">
          Apply
        </button>
        {roleFilter && (
          <Link href="/admin/users" className="pb-2 text-xs text-ink-soft hover:text-accent">
            Clear filter
          </Link>
        )}
      </form>

      <div className="mt-6 overflow-x-auto border border-line">
        <table className="w-full text-left text-sm">
          <thead className="bg-paper-raised text-xs tracking-wide text-ink-soft uppercase">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Detail</th>
              <th className="px-4 py-3">Joined</th>
              <th className="px-4 py-3">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {users.map((u) => (
              <tr key={u.id}>
                <td className="px-4 py-3 font-medium text-ink">{u.name}</td>
                <td className="px-4 py-3 text-ink-soft">{u.email}</td>
                <td className="px-4 py-3">
                  <span className="text-xs font-semibold tracking-wide text-brass uppercase">
                    {ROLE_LABELS[u.role] ?? u.role}
                  </span>
                </td>
                <td className="px-4 py-3 text-ink-soft tabular-nums">
                  {u.role === "officer" && (u.assignedServiceType?.name ?? "Unassigned")}
                  {u.role === "citizen" &&
                    `${u._count.requestsSubmitted} request${u._count.requestsSubmitted === 1 ? "" : "s"} submitted`}
                  {u.role === "admin" && "—"}
                </td>
                <td className="px-4 py-3 text-ink-soft tabular-nums">{u.createdAt.toLocaleDateString()}</td>
                <td className="px-4 py-3">
                  <ResetPasswordForm userId={u.id} userName={u.name} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
