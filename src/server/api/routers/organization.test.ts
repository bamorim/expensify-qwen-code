import { describe, it, expect, vi, beforeEach } from "vitest";
import { organizationRouter } from "./organization";
import { db } from "~/server/db";
import { faker } from "@faker-js/faker";

// Mock the database to use the transactional testing wrapper
vi.mock("~/server/db");

// Mock the auth module
vi.mock("~/server/auth", () => ({
  auth: vi.fn(),
}));

// Helper function to create a test user and caller
async function createTestUserAndCaller(email?: string) {
  const user = await db.user.create({
    data: {
      name: "Test User",
      email: email ?? faker.internet.email(),
    },
  });

  const mockSession = {
    user,
    expires: "2030-12-31T23:59:59.999Z",
  };

  const caller = organizationRouter.createCaller({
    db: db,
    session: mockSession,
    headers: new Headers(),
  });

  return { user, caller, mockSession };
}

describe("OrganizationRouter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("create", () => {
    it("should create an organization and membership successfully", async () => {
      const { caller, user } = await createTestUserAndCaller();

      const result = await caller.create({
        name: "Test Organization",
        description: "Test Description",
      });

      expect(result.name).toEqual("Test Organization");
      expect(result.description).toEqual("Test Description");

      const organization = await db.organization.findUnique({
        where: {
          id: result.id,
        },
      });

      expect(organization).toBeDefined();
      expect(organization?.name).toEqual("Test Organization");

      // Check that the membership was created with ADMIN role
      const membership = await db.membership.findUnique({
        where: {
          userId_organizationId: {
            userId: user.id,
            organizationId: result.id,
          },
        },
      });

      expect(membership).toBeDefined();
      expect(membership?.role).toEqual("ADMIN");
    });
  });

  describe("getAll", () => {
    it("should return organizations for the user", async () => {
      const { caller, user } = await createTestUserAndCaller();

      // Create an organization and membership
      const organization = await db.organization.create({
        data: {
          name: "Test Organization",
          description: "Test Description",
        },
      });

      await db.membership.create({
        data: {
          userId: user.id,
          organizationId: organization.id,
          role: "ADMIN",
        },
      });

      const result = await caller.getAll();

      expect(result).toHaveLength(1);
      expect(result[0]?.name).toEqual("Test Organization");
    });
  });

  describe("getById", () => {
    it("should return organization when user is a member", async () => {
      const { caller, user } = await createTestUserAndCaller();

      // Create an organization and membership
      const organization = await db.organization.create({
        data: {
          name: "Test Organization",
          description: "Test Description",
        },
      });

      await db.membership.create({
        data: {
          userId: user.id,
          organizationId: organization.id,
          role: "ADMIN",
        },
      });

      const result = await caller.getById({ id: organization.id });

      expect(result).toBeDefined();
      expect(result?.name).toEqual("Test Organization");
    });

    it("should throw error when user is not a member", async () => {
      const { caller } = await createTestUserAndCaller();

      // Create an organization without membership for this user
      const organization = await db.organization.create({
        data: {
          name: "Test Organization",
          description: "Test Description",
        },
      });

      await expect(caller.getById({ id: organization.id })).rejects.toThrow(
        "You are not a member of this organization",
      );
    });
  });

  describe("update", () => {
    it("should update organization when user is admin", async () => {
      const { caller, user } = await createTestUserAndCaller();

      // Create an organization and membership with ADMIN role
      const organization = await db.organization.create({
        data: {
          name: "Test Organization",
          description: "Test Description",
        },
      });

      await db.membership.create({
        data: {
          userId: user.id,
          organizationId: organization.id,
          role: "ADMIN",
        },
      });

      const result = await caller.update({
        id: organization.id,
        name: "Updated Organization",
        description: "Updated Description",
      });

      expect(result.name).toEqual("Updated Organization");
      expect(result.description).toEqual("Updated Description");

      const updatedOrganization = await db.organization.findUnique({
        where: {
          id: organization.id,
        },
      });

      expect(updatedOrganization?.name).toEqual("Updated Organization");
    });

    it("should throw error when user is not admin", async () => {
      const { caller, user } = await createTestUserAndCaller();

      // Create an organization and membership with MEMBER role
      const organization = await db.organization.create({
        data: {
          name: "Test Organization",
          description: "Test Description",
        },
      });

      await db.membership.create({
        data: {
          userId: user.id,
          organizationId: organization.id,
          role: "MEMBER",
        },
      });

      await expect(
        caller.update({
          id: organization.id,
          name: "Updated Organization",
          description: "Updated Description",
        }),
      ).rejects.toThrow("You must be an admin to perform this action");
    });
  });

  describe("inviteUser", () => {
    it("should create an invitation successfully when user is admin", async () => {
      const { caller, user } = await createTestUserAndCaller();

      // Create an organization with the user as admin
      const organization = await db.organization.create({
        data: {
          name: "Test Organization",
          description: "Test Description",
        },
      });

      await db.membership.create({
        data: {
          userId: user.id,
          organizationId: organization.id,
          role: "ADMIN",
        },
      });

      const inviteeEmail = faker.internet.email();
      const result = await caller.inviteUser({
        organizationId: organization.id,
        email: inviteeEmail,
        role: "MEMBER",
      });

      expect(result.email).toBe(inviteeEmail);
      expect(result.role).toBe("MEMBER");
      expect(result.organizationId).toBe(organization.id);
      expect(result.invitedById).toBe(user.id);

      // Check that invitation was created in database
      const invitation = await db.invitation.findUnique({
        where: {
          id: result.id,
        },
      });

      expect(invitation).toBeDefined();
      expect(invitation?.email).toBe(inviteeEmail);
    });

    it("should throw error when user is not an admin", async () => {
      const { caller, user } = await createTestUserAndCaller();

      // Create an organization with the user as member
      const organization = await db.organization.create({
        data: {
          name: "Test Organization",
          description: "Test Description",
        },
      });

      await db.membership.create({
        data: {
          userId: user.id,
          organizationId: organization.id,
          role: "MEMBER",
        },
      });

      const inviteeEmail = faker.internet.email();
      await expect(
        caller.inviteUser({
          organizationId: organization.id,
          email: inviteeEmail,
          role: "MEMBER",
        }),
      ).rejects.toThrow("You must be an admin to perform this action");
    });

    it("should throw error when user is already a member", async () => {
      const { caller, user } = await createTestUserAndCaller();

      // Create an organization with the user as admin
      const organization = await db.organization.create({
        data: {
          name: "Test Organization",
          description: "Test Description",
        },
      });

      await db.membership.create({
        data: {
          userId: user.id,
          organizationId: organization.id,
          role: "ADMIN",
        },
      });

      // Create another user
      const existingUser = await db.user.create({
        data: {
          name: "Existing User",
          email: faker.internet.email(),
        },
      });

      // Make the user a member of the organization
      await db.membership.create({
        data: {
          userId: existingUser.id,
          organizationId: organization.id,
          role: "MEMBER",
        },
      });

      await expect(
        caller.inviteUser({
          organizationId: organization.id,
          email: existingUser.email!,
          role: "MEMBER",
        }),
      ).rejects.toThrow("User is already a member of this organization");
    });
  });

  describe("getInvitations", () => {
    it("should return invitations for the organization when user is a member", async () => {
      const { caller, user } = await createTestUserAndCaller();

      // Create an organization with the user as admin
      const organization = await db.organization.create({
        data: {
          name: "Test Organization",
          description: "Test Description",
        },
      });

      await db.membership.create({
        data: {
          userId: user.id,
          organizationId: organization.id,
          role: "ADMIN",
        },
      });

      // Create an admin user for inviting
      const adminUser = await db.user.create({
        data: {
          name: "Admin User",
          email: faker.internet.email(),
        },
      });

      // Create an invitation
      const invitation = await db.invitation.create({
        data: {
          email: faker.internet.email(),
          role: "MEMBER",
          organizationId: organization.id,
          invitedById: adminUser.id,
        },
      });

      const result = await caller.getInvitations({
        organizationId: organization.id,
      });

      expect(result).toHaveLength(1);
      expect(result[0]?.id).toBe(invitation?.id);
      expect(result[0]?.organizationId).toBe(organization.id);
    });

    it("should throw error when user is not a member", async () => {
      const { caller } = await createTestUserAndCaller();

      // Create an organization without membership for this user
      const organization = await db.organization.create({
        data: {
          name: "Test Organization",
          description: "Test Description",
        },
      });

      await expect(
        caller.getInvitations({
          organizationId: organization.id,
        }),
      ).rejects.toThrow("You are not a member of this organization");
    });
  });

  describe("getMembers", () => {
    it("should return members for the organization when user is a member", async () => {
      const { caller, user } = await createTestUserAndCaller();

      // Create an organization with the user as admin
      const organization = await db.organization.create({
        data: {
          name: "Test Organization",
          description: "Test Description",
        },
      });

      await db.membership.create({
        data: {
          userId: user.id,
          organizationId: organization.id,
          role: "ADMIN",
        },
      });

      // Create another user
      const memberUser = await db.user.create({
        data: {
          name: "Member User",
          email: faker.internet.email(),
        },
      });

      // Make the user a member of the organization
      const member = await db.membership.create({
        data: {
          userId: memberUser.id,
          organizationId: organization.id,
          role: "MEMBER",
        },
      });

      const result = await caller.getMembers({
        organizationId: organization.id,
      });

      expect(result).toHaveLength(2);
      expect(result.some((m) => m.id === member.id)).toBe(true);
    });

    it("should throw error when user is not a member", async () => {
      const { caller } = await createTestUserAndCaller();

      // Create an organization without membership for this user
      const organization = await db.organization.create({
        data: {
          name: "Test Organization",
          description: "Test Description",
        },
      });

      await expect(
        caller.getMembers({
          organizationId: organization.id,
        }),
      ).rejects.toThrow("You are not a member of this organization");
    });
  });
});
