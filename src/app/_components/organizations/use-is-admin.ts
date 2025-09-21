"use client";

import { api } from "~/trpc/react";

/**
 * Helper hook to check if a user is an admin of an organization
 */
export function useIsOrganizationAdmin(organizationId: string) {
  // Using suspense query to properly handle SSR
  const [membership] = api.organization.getMembership.useSuspenseQuery({
    organizationId,
  });

  return {
    isAdmin: membership?.role === "ADMIN",
    membership,
  };
}
