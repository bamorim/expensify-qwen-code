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
});