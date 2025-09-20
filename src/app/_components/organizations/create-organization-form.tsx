"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import { useRouter } from "next/navigation";

export function CreateOrganizationForm({ onSuccess }: { onSuccess: () => void }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  
  const createOrganization = api.organization.create.useMutation({
    onSuccess: async (data) => {
      await onSuccess();
      // Redirect to the new organization page
      router.push(`/organizations/${data.id}`);
    },
    onError: (error) => {
      setError(error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    createOrganization.mutate({ name, description });
  };

  return (
    <div className="rounded-lg bg-white/5 p-6">
      <h3 className="text-xl font-bold mb-4">Create New Organization</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium mb-1">
            Organization Name *
          </label>
          <input
            type="text"
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg bg-white/10 px-4 py-2 text-white"
            placeholder="Acme Inc."
            required
          />
        </div>
        
        <div>
          <label htmlFor="description" className="block text-sm font-medium mb-1">
            Description
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full rounded-lg bg-white/10 px-4 py-2 text-white"
            placeholder="A brief description of your organization"
            rows={3}
          />
        </div>
        
        {error && (
          <div className="text-red-400 text-sm">{error}</div>
        )}
        
        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={onSuccess}
            className="rounded-lg bg-white/10 px-4 py-2 font-semibold transition hover:bg-white/20"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="rounded-lg bg-blue-600 px-4 py-2 font-semibold transition hover:bg-blue-700"
            disabled={createOrganization.isPending}
          >
            {createOrganization.isPending ? "Creating..." : "Create Organization"}
          </button>
        </div>
      </form>
    </div>
  );
}