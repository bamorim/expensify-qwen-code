import Link from "next/link";

import { OrganizationDetail } from "~/app/_components/organizations/detail";
import { auth } from "~/server/auth";
import { api, HydrateClient } from "~/trpc/server";

export default async function OrganizationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  
  if (!session?.user) {
    // Redirect to sign in if not authenticated
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-[#2e026d] to-[#15162c] text-white">
        <div className="container flex flex-col items-center justify-center gap-12 px-4 py-16">
          <h1 className="text-3xl font-bold">Access Denied</h1>
          <p className="text-xl">You must be signed in to view this page.</p>
          <Link
            href="/api/auth/signin"
            className="rounded-full bg-white/10 px-10 py-3 font-semibold no-underline transition hover:bg-white/20"
          >
            Sign in
          </Link>
        </div>
      </div>
    );
  }

  // Prefetch the organization data
  void api.organization.getById.prefetch({ id });

  return (
    <HydrateClient>
      <main className="flex min-h-screen flex-col items-center bg-gradient-to-b from-[#2e026d] to-[#15162c] text-white">
        <div className="container px-4 py-16">
          <div className="mb-8">
            <Link 
              href="/" 
              className="text-blue-400 hover:text-blue-300"
            >
              ← Back to Organizations
            </Link>
          </div>
          <OrganizationDetail organizationId={id} />
        </div>
      </main>
    </HydrateClient>
  );
}