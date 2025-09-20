"use client";

import { api } from "~/trpc/react";

export function OrganizationMembers({ organizationId }: { organizationId: string }) {
  const [memberships] = api.organization.getMembers.useSuspenseQuery({ organizationId });

  return (
    <div className="rounded-lg bg-white/5 p-6">
      <h3 className="text-xl font-bold mb-4">Members</h3>
      <div className="space-y-3">
        {memberships.map((membership) => (
          <div key={membership.id} className="flex items-center justify-between rounded-lg bg-white/5 p-3">
            <div>
              <div className="font-medium">
                {membership.user.name ?? membership.user.email}
              </div>
              <div className="text-sm text-gray-400">
                {membership.role}
              </div>
            </div>
            <div className="text-sm text-gray-400">
              Joined {membership.createdAt.toLocaleDateString()}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}