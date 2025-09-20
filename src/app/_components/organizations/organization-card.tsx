"use client";

import { type Organization } from "@prisma/client";
import Link from "next/link";

export function OrganizationCard({ organization }: { organization: Organization }) {
  return (
    <div className="rounded-lg bg-white/5 p-4 transition hover:bg-white/10">
      <h3 className="text-lg font-semibold">{organization.name}</h3>
      {organization.description && (
        <p className="mt-2 text-sm text-gray-300">{organization.description}</p>
      )}
      <div className="mt-4">
        <Link
          href={`/organizations/${organization.id}`}
          className="text-sm font-medium text-blue-400 hover:text-blue-300"
        >
          View details →
        </Link>
      </div>
    </div>
  );
}