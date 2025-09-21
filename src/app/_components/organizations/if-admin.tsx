"use client";

import { useIsOrganizationAdmin } from "./use-is-admin";

interface IfAdminProps {
  organizationId: string;
  children: React.ReactNode;
}

export function IfAdmin({ organizationId, children }: IfAdminProps) {
  const { isAdmin } = useIsOrganizationAdmin(organizationId);

  if (!isAdmin) {
    return null;
  }

  return <>{children}</>;
}

