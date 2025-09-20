import { z } from "zod";

import {
  createTRPCRouter,
  protectedProcedure,
} from "~/server/api/trpc";

export const invitationRouter = createTRPCRouter({
  accept: protectedProcedure
    .input(z.object({
      invitationId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Find the invitation
      const invitation = await ctx.db.invitation.findUnique({
        where: {
          id: input.invitationId,
        },
        include: {
          organization: true,
        },
      });

      if (!invitation) {
        throw new Error("Invitation not found");
      }

      // Check if the invitation is for the current user's email
      if (invitation.email !== (ctx.session.user.email ?? "")) {
        throw new Error("This invitation is not for your email address");
      }

      // Check if user is already a member
      const existingMembership = await ctx.db.membership.findUnique({
        where: {
          userId_organizationId: {
            userId: ctx.session.user.id,
            organizationId: invitation.organizationId,
          },
        },
      });

      if (existingMembership) {
        // Mark invitation as accepted and delete it
        await ctx.db.invitation.update({
          where: {
            id: input.invitationId,
          },
          data: {
            accepted: true,
            acceptedAt: new Date(),
          },
        });
        
        return {
          success: true,
          message: "You are already a member of this organization",
          organization: invitation.organization,
        };
      }

      // Create membership
      const membership = await ctx.db.membership.create({
        data: {
          userId: ctx.session.user.id,
          organizationId: invitation.organizationId,
          role: invitation.role,
        },
      });

      // Mark invitation as accepted
      await ctx.db.invitation.update({
        where: {
          id: input.invitationId,
        },
        data: {
          accepted: true,
          acceptedAt: new Date(),
        },
      });

      return {
        success: true,
        message: "You have been added to the organization",
        organization: invitation.organization,
        membership,
      };
    }),

  getPending: protectedProcedure
    .query(async ({ ctx }) => {
      // Find all pending invitations for the user's email
      const invitations = await ctx.db.invitation.findMany({
        where: {
          email: ctx.session.user.email ?? "",
          accepted: false,
        },
        include: {
          organization: true,
          invitedBy: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      });

      return invitations;
    }),
});