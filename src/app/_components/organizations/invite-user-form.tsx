"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import { type Role } from "@prisma/client";

export function InviteUserForm({ 
  organizationId,
  onSuccess 
}: { 
  organizationId: string;
  onSuccess: () => void;
}) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("MEMBER");
  const [error, setError] = useState<string | null>(null);
  
  const utils = api.useUtils();
  const inviteUser = api.organization.inviteUser.useMutation({
    onSuccess: async () => {
      setEmail("");
      setError(null);
      await utils.organization.getInvitations.invalidate({ organizationId });
      onSuccess();
    },
    onError: (error) => {
      setError(error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    inviteUser.mutate({ organizationId, email, role });
  };

  return (
    <div className="rounded-lg bg-white/5 p-6">
      <h3 className="text-xl font-bold mb-4">Invite User</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium mb-1">
            Email Address *
          </label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg bg-white/10 px-4 py-2 text-white"
            placeholder="user@example.com"
            required
          />
        </div>
        
        <div>
          <label htmlFor="role" className="block text-sm font-medium mb-1">
            Role
          </label>
          <select
            id="role"
            value={role}
            onChange={(e) => setRole(e.target.value as Role)}
            className="w-full rounded-lg bg-white/10 px-4 py-2 text-white"
          >
            <option value="MEMBER">Member</option>
            <option value="ADMIN">Admin</option>
          </select>
        </div>
        
        {error && (
          <div className="text-red-400 text-sm">{error}</div>
        )}
        
        <div className="flex justify-end">
          <button
            type="submit"
            className="rounded-lg bg-blue-600 px-4 py-2 font-semibold transition hover:bg-blue-700"
            disabled={inviteUser.isPending}
          >
            {inviteUser.isPending ? "Sending..." : "Send Invitation"}
          </button>
        </div>
      </form>
    </div>
  );
}