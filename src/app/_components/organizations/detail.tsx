"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import { InviteUserForm } from "./invite-user-form";
import { PendingInvitations } from "./pending-invitations";
import { OrganizationMembers } from "./organization-members";
import { IfAdmin } from "./if-admin";

export function OrganizationDetail({
  organizationId,
}: {
  organizationId: string;
}) {
  const [organization] = api.organization.getById.useSuspenseQuery({
    id: organizationId,
  });
  const [isEditing, setIsEditing] = useState(false);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [name, setName] = useState(organization?.name ?? "");
  const [description, setDescription] = useState(
    organization?.description ?? "",
  );
  const [error, setError] = useState<string | null>(null);

  const utils = api.useUtils();
  const updateOrganization = api.organization.update.useMutation({
    onSuccess: async () => {
      setIsEditing(false);
      setError(null);
      await utils.organization.invalidate();
    },
    onError: (error) => {
      setError(error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (organization) {
      updateOrganization.mutate({
        id: organization.id,
        name,
        description,
      });
    }
  };

  if (!organization) {
    return <div>Organization not found</div>;
  }

  return (
    <div className="w-full max-w-2xl">
      {isEditing ? (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="edit-name"
              className="mb-1 block text-sm font-medium"
            >
              Organization Name *
            </label>
            <input
              type="text"
              id="edit-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg bg-white/10 px-4 py-2 text-white"
              required
            />
          </div>

          <div>
            <label
              htmlFor="edit-description"
              className="mb-1 block text-sm font-medium"
            >
              Description
            </label>
            <textarea
              id="edit-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-lg bg-white/10 px-4 py-2 text-white"
              rows={3}
            />
          </div>

          {error && <div className="text-sm text-red-400">{error}</div>}

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => {
                setIsEditing(false);
                setName(organization.name);
                setDescription(organization.description ?? "");
                setError(null);
              }}
              className="rounded-lg bg-white/10 px-4 py-2 font-semibold transition hover:bg-white/20"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-blue-600 px-4 py-2 font-semibold transition hover:bg-blue-700"
              disabled={updateOrganization.isPending}
            >
              {updateOrganization.isPending ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      ) : (
        <div>
          <div className="mb-6 flex items-center justify-between">
            <h1 className="text-3xl font-bold">{organization.name}</h1>
            <div className="space-x-2">
              <IfAdmin organizationId={organizationId}>
                <button
                  onClick={() => setShowInviteForm(!showInviteForm)}
                  className="rounded-lg bg-white/10 px-4 py-2 font-semibold transition hover:bg-white/20"
                >
                  {showInviteForm ? "Cancel" : "Invite User"}
                </button>
                <button
                  onClick={() => setIsEditing(true)}
                  className="rounded-lg bg-white/10 px-4 py-2 font-semibold transition hover:bg-white/20"
                >
                  Edit
                </button>
              </IfAdmin>
            </div>
          </div>

          {organization.description && (
            <div className="mb-6">
              <p className="text-lg text-gray-300">
                {organization.description}
              </p>
            </div>
          )}

          <IfAdmin organizationId={organizationId}>
            {showInviteForm && (
              <div className="mb-6">
                <InviteUserForm
                  organizationId={organizationId}
                  onSuccess={() => setShowInviteForm(false)}
                />
              </div>
            )}
          </IfAdmin>

          <div className="space-y-6">
            <IfAdmin organizationId={organizationId}>
              <PendingInvitations organizationId={organizationId} />
            </IfAdmin>
            <OrganizationMembers organizationId={organizationId} />

            <div className="rounded-lg bg-white/5 p-6">
              <h2 className="mb-4 text-xl font-bold">Organization Details</h2>
              <div className="space-y-2">
                <div className="flex">
                  <span className="w-32 font-medium">ID:</span>
                  <span className="text-gray-300">{organization.id}</span>
                </div>
                <div className="flex">
                  <span className="w-32 font-medium">Created:</span>
                  <span className="text-gray-300">
                    {organization.createdAt.toLocaleDateString()}
                  </span>
                </div>
                <div className="flex">
                  <span className="w-32 font-medium">Last Updated:</span>
                  <span className="text-gray-300">
                    {organization.updatedAt.toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

