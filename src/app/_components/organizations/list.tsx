"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import { CreateOrganizationForm } from "./create-organization-form";
import { OrganizationCard } from "./organization-card";

export function OrganizationList() {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [organizations] = api.organization.getAll.useSuspenseQuery();
  const utils = api.useUtils();

  const handleCreateSuccess = async () => {
    setShowCreateForm(false);
    await utils.organization.invalidate();
  };

  return (
    <div className="w-full">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-bold">Organizations</h2>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="rounded-full bg-white/10 px-4 py-2 font-semibold transition hover:bg-white/20"
        >
          {showCreateForm ? "Cancel" : "Create Organization"}
        </button>
      </div>

      {showCreateForm && (
        <div className="mb-6">
          <CreateOrganizationForm onSuccess={handleCreateSuccess} />
        </div>
      )}

      {organizations.length === 0 ? (
        <div className="rounded-lg bg-white/5 p-6 text-center">
          <p className="text-lg">You don't belong to any organizations yet.</p>
          <button
            onClick={() => setShowCreateForm(true)}
            className="mt-4 rounded-full bg-white/10 px-4 py-2 font-semibold transition hover:bg-white/20"
          >
            Create your first organization
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {organizations.map((organization) => (
            <OrganizationCard key={organization.id} organization={organization} />
          ))}
        </div>
      )}
    </div>
  );
}