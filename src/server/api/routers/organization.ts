import { z } from "zod";

import {
  createTRPCRouter,
  protectedProcedure,
} from "~/server/api/trpc";

export const organizationRouter = createTRPCRouter({
  create: protectedProcedure
    .input(z.object({ 
      name: z.string().min(1).max(50),
      description: z.string().max(255).optional()
    }))
    .mutation(async ({ ctx, input }) => {
      // Create the organization and membership atomically
      return ctx.db.$transaction(async (tx) => {
        // Create the organization
        const organization = await tx.organization.create({
          data: {
            name: input.name,
            description: input.description,
          },
        });

        // Create the membership for the creator with ADMIN role
        await tx.membership.create({
          data: {
            userId: ctx.session.user.id,
            organizationId: organization.id,
            role: "ADMIN",
          },
        });

        return organization;
      });
    }),

  getAll: protectedProcedure.query(async ({ ctx }) => {
    const memberships = await ctx.db.membership.findMany({
      where: {
        userId: ctx.session.user.id,
      },
      include: {
        organization: true,
      },
    });

    return memberships.map(membership => membership.organization);
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      // Check if user is a member of the organization
      const membership = await ctx.db.membership.findUnique({
        where: {
          userId_organizationId: {
            userId: ctx.session.user.id,
            organizationId: input.id,
          },
        },
      });

      if (!membership) {
        throw new Error("You are not a member of this organization");
      }

      return ctx.db.organization.findUnique({
        where: {
          id: input.id,
        },
      });
    }),

  update: protectedProcedure
    .input(z.object({ 
      id: z.string(),
      name: z.string().min(1).max(50),
      description: z.string().max(255).optional()
    }))
    .mutation(async ({ ctx, input }) => {
      // Check if user is an admin of the organization
      const membership = await ctx.db.membership.findUnique({
        where: {
          userId_organizationId: {
            userId: ctx.session.user.id,
            organizationId: input.id,
          },
        },
      });

      if (!membership || membership.role !== "ADMIN") {
        throw new Error("You must be an admin to update this organization");
      }

      return ctx.db.organization.update({
        where: {
          id: input.id,
        },
        data: {
          name: input.name,
          description: input.description,
        },
      });
    }),

  inviteUser: protectedProcedure
    .input(z.object({
      organizationId: z.string(),
      email: z.string().email(),
      role: z.enum(["ADMIN", "MEMBER"]).default("MEMBER"),
    }))
    .mutation(async ({ ctx, input }) => {
      // Check if user is an admin of the organization
      const membership = await ctx.db.membership.findUnique({
        where: {
          userId_organizationId: {
            userId: ctx.session.user.id,
            organizationId: input.organizationId,
          },
        },
      });

      if (!membership || membership.role !== "ADMIN") {
        throw new Error("You must be an admin to invite users to this organization");
      }

      // Check if user is already a member
      const existingUser = await ctx.db.user.findUnique({
        where: {
          email: input.email,
        },
      });

      if (existingUser) {
        const existingMembership = await ctx.db.membership.findUnique({
          where: {
            userId_organizationId: {
              userId: existingUser.id,
              organizationId: input.organizationId,
            },
          },
        });

        if (existingMembership) {
          throw new Error("User is already a member of this organization");
        }
      }

      // Check if invitation already exists
      const existingInvitation = await ctx.db.invitation.findUnique({
        where: {
          email_organizationId: {
            email: input.email,
            organizationId: input.organizationId,
          },
        },
      });

      if (existingInvitation) {
        throw new Error("User has already been invited to this organization");
      }

      // Create invitation
      const invitation = await ctx.db.invitation.create({
        data: {
          email: input.email,
          role: input.role,
          organizationId: input.organizationId,
          invitedById: ctx.session.user.id,
        },
      });

      return invitation;
    }),

  getInvitations: protectedProcedure
    .input(z.object({
      organizationId: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      // Check if user is a member of the organization
      const membership = await ctx.db.membership.findUnique({
        where: {
          userId_organizationId: {
            userId: ctx.session.user.id,
            organizationId: input.organizationId,
          },
        },
      });

      if (!membership) {
        throw new Error("You are not a member of this organization");
      }

      return ctx.db.invitation.findMany({
        where: {
          organizationId: input.organizationId,
        },
        include: {
          invitedBy: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      });
    }),

  getMembers: protectedProcedure
    .input(z.object({
      organizationId: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      // Check if user is a member of the organization
      const membership = await ctx.db.membership.findUnique({
        where: {
          userId_organizationId: {
            userId: ctx.session.user.id,
            organizationId: input.organizationId,
          },
        },
      });

      if (!membership) {
        throw new Error("You are not a member of this organization");
      }

      return ctx.db.membership.findMany({
        where: {
          organizationId: input.organizationId,
        },
        include: {
          user: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      });
    }),
});