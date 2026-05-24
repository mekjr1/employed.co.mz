"use client";

import type { AuthUser } from "@/lib/types";

type AdminUser = AuthUser & {
  _id?: string;
  id?: string;
  name?: string;
  email?: string;
  roles?: string[];
};

interface AdminUsersListProps {
  users: AdminUser[];
  onGrant: (user: AdminUser) => Promise<void>;
  onRevoke: (user: AdminUser) => Promise<void>;
}

function userId(user: AdminUser) {
  return user.id ?? user._id ?? "";
}

export function AdminUsersList({ users, onGrant, onRevoke }: AdminUsersListProps) {
  return (
    <section className="rounded-2xl border border-white/10 bg-[#16213e] p-5 shadow-lg shadow-black/20">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-[#e4e4e7]">Admin users</h2>
        <p className="text-sm text-[#a1a1aa]">Grant or revoke moderation access.</p>
      </div>
      <div className="space-y-3">
        {users.map((user) => {
          const isAdmin = user.roles?.includes("admin") ?? false;
          return (
            <div key={userId(user)} className="rounded-2xl border border-white/10 bg-[#0f172a]/50 p-4">
              <p className="font-medium text-[#e4e4e7]">{user.name ?? user.email ?? "Unnamed user"}</p>
              <p className="mt-1 text-sm text-[#a1a1aa]">{user.email ?? "No email"}</p>
              <div className="mt-3 flex gap-3">
                {isAdmin ? (
                  <button
                    type="button"
                    onClick={() => void onRevoke(user)}
                    className="rounded-xl border border-red-400/30 px-4 py-2 text-sm font-medium text-red-300 transition hover:bg-red-500/10"
                  >
                    Revoke admin
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => void onGrant(user)}
                    className="rounded-xl bg-[#4F46E5] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#4338ca]"
                  >
                    Grant admin
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
