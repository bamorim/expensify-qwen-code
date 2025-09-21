import { TRPCError } from "@trpc/server";
import { db } from "~/server/db";
import { type Membership } from "@prisma/client";

/**
 * Guard function to check if user is a member of an organization
 * Throws TRPCError if user is not a member
 * @param userId - The user's ID
 * @param organizationId - The organization's ID
 * @returns Promise<Membership> - The membership record
 */
export async function requireOrganizationMembership(
  userId: string,
  organizationId: string,
): Promise<Membership> {
  const membership = await db.membership.findUnique({
    where: {
      userId_organizationId: {
        userId,
        organizationId,
      },
    },
  });

  if (!membership) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You are not a member of this organization",
    });
  }

  return membership;
}

/**
 * Guard function to check if user is an admin of an organization
 * Throws TRPCError if user is not an admin
 * @param userId - The user's ID
 * @param organizationId - The organization's ID
 * @returns Promise<Membership> - The membership record
 */
export async function requireOrganizationAdmin(
  userId: string,
  organizationId: string,
): Promise<Membership> {
  const membership = await requireOrganizationMembership(
    userId,
    organizationId,
  );

  if (membership.role !== "ADMIN") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You must be an admin to perform this action",
    });
  }

  return membership;
}

