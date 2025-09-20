"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import Link from "next/link";

export default function InvitationsPage() {
  const { data: invitations, isLoading } = api.invitation.getPending.useQuery();
  const acceptInvitation = api.invitation.accept.useMutation();
  const utils = api.useUtils();
  const [processingInvitation, setProcessingInvitation] = useState<string | null>(null);

  const handleAccept = async (invitationId: string) => {
    setProcessingInvitation(invitationId);
    try {
      const result = await acceptInvitation.mutateAsync({ invitationId });
      await utils.invitation.getPending.invalidate();
      await utils.organization.getAll.invalidate();
      
      // Redirect to the organization page
      if (result.organization) {
        window.location.href = `/organizations/${result.organization.id}`;
      }
    } catch (error) {
      console.error("Failed to accept invitation:", error);
    } finally {
      setProcessingInvitation(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-[#2e026d] to-[#15162c] text-white">
        <div className="container flex flex-col items-center justify-center gap-12 px-4 py-16">
          <h1 className="text-3xl font-bold">Loading...</h1>
        </div>
      </div>
    );
  }

  if (!invitations || invitations.length === 0) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-[#2e026d] to-[#15162c] text-white">
        <div className="container flex flex-col items-center justify-center gap-12 px-4 py-16">
          <h1 className="text-3xl font-bold">No Pending Invitations</h1>
          <p className="text-xl">You don&apos;t have any pending invitations at this time.</p>
          <Link 
            href="/" 
            className="rounded-full bg-white/10 px-10 py-3 font-semibold no-underline transition hover:bg-white/20"
          >
            Back to Organizations
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center bg-gradient-to-b from-[#2e026d] to-[#15162c] text-white">
      <div className="container px-4 py-16">
        <h1 className="text-3xl font-bold mb-8">Pending Invitations</h1>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {invitations.map((invitation) => (
            <div key={invitation.id} className="rounded-lg bg-white/5 p-6">
              <h2 className="text-xl font-bold mb-2">{invitation.organization?.name ?? 'Unknown Organization'}</h2>
              <p className="text-gray-300 mb-4">
                Invited as {invitation.role} by {invitation.invitedBy?.name ?? invitation.invitedBy?.email ?? 'Unknown'}
              </p>
              <div className="flex justify-end">
                <button
                  onClick={() => handleAccept(invitation.id)}
                  disabled={processingInvitation === invitation.id}
                  className="rounded-lg bg-blue-600 px-4 py-2 font-semibold transition hover:bg-blue-700 disabled:opacity-50"
                >
                  {processingInvitation === invitation.id ? "Accepting..." : "Accept Invitation"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}