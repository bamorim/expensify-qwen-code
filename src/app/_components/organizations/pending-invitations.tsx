"use client";

import { api } from "~/trpc/react";

export function PendingInvitations({ organizationId }: { organizationId: string }) {
  const [invitations] = api.organization.getInvitations.useSuspenseQuery({ organizationId });

  if (invitations.length === 0) {
    return null;
  }

  return (
    <div className="rounded-lg bg-white/5 p-6">
      <h3 className="text-xl font-bold mb-4">Pending Invitations</h3>
      <div className="space-y-3">
        {invitations.map((invitation) => (
          <div key={invitation.id} className="flex items-center justify-between rounded-lg bg-white/5 p-3">
            <div>
              <div className="font-medium">{invitation.email}</div>
              <div className="text-sm text-gray-400">
                Invited as {invitation.role} by {invitation.invitedBy?.name ?? invitation.invitedBy?.email}
              </div>
            </div>
            <div className="text-sm text-gray-400">
              {invitation.createdAt.toLocaleDateString()}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}