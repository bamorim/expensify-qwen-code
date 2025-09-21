import { describe, it, expect, vi, beforeEach } from "vitest";
import { invitationRouter } from "./invitation";
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

  const invitationCaller = invitationRouter.createCaller({
    db: db,
    session: mockSession,
    headers: new Headers(),
  });

  const organizationCaller = organizationRouter.createCaller({
    db: db,
    session: mockSession,
    headers: new Headers(),
  });

  return { user, invitationCaller, organizationCaller, mockSession };
}

describe("InvitationRouter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("accept", () => {
    it("should accept an invitation successfully", async () => {
      const email = faker.internet.email();
      const { user, invitationCaller } = await createTestUserAndCaller(email);

      // Create an organization
      const organization = await db.organization.create({
        data: {
          name: "Test Organization",
          description: "Test Description",
        },
      });

      // Create an admin user for the organization
      const adminUser = await db.user.create({
        data: {
          name: "Admin User",
          email: faker.internet.email(),
        },
      });

      await db.membership.create({
        data: {
          userId: adminUser.id,
          organizationId: organization.id,
          role: "ADMIN",
        },
      });

      // Create an invitation
      const invitation = await db.invitation.create({
        data: {
          email,
          role: "MEMBER",
          organizationId: organization.id,
          invitedById: adminUser.id,
        },
      });

      // Accept the invitation
      const result = await invitationCaller.accept({
        invitationId: invitation.id,
      });

      expect(result.success).toBe(true);
      expect(result.message).toBe("You have been added to the organization");
      expect(result.organization.id).toBe(organization.id);

      // Check that membership was created
      const membership = await db.membership.findUnique({
        where: {
          userId_organizationId: {
            userId: user.id,
            organizationId: organization.id,
          },
        },
      });

      expect(membership).toBeDefined();
      expect(membership?.role).toBe("MEMBER");

      // Check that invitation was marked as accepted
      const updatedInvitation = await db.invitation.findUnique({
        where: {
          id: invitation.id,
        },
      });

      expect(updatedInvitation?.accepted).toBe(true);
      expect(updatedInvitation?.acceptedAt).toBeDefined();
    });

    it("should throw error when invitation is not found", async () => {
      const { invitationCaller } = await createTestUserAndCaller();

      await expect(
        invitationCaller.accept({ invitationId: "invalid-id" }),
      ).rejects.toThrow("Invitation not found");
    });

    it("should throw error when invitation is not for the user's email", async () => {
      const { invitationCaller } = await createTestUserAndCaller();

      // Create an organization
      const organization = await db.organization.create({
        data: {
          name: "Test Organization",
          description: "Test Description",
        },
      });

      // Create an admin user for the organization
      const adminUser = await db.user.create({
        data: {
          name: "Admin User",
          email: faker.internet.email(),
        },
      });

      await db.membership.create({
        data: {
          userId: adminUser.id,
          organizationId: organization.id,
          role: "ADMIN",
        },
      });

      // Create an invitation for a different email
      const invitation = await db.invitation.create({
        data: {
          email: faker.internet.email(),
          role: "MEMBER",
          organizationId: organization.id,
          invitedById: adminUser.id,
        },
      });

      await expect(
        invitationCaller.accept({ invitationId: invitation.id }),
      ).rejects.toThrow("This invitation is not for your email address");
    });
  });

  describe("getPending", () => {
    it("should return pending invitations for the user", async () => {
      const email = faker.internet.email();
      const { invitationCaller } = await createTestUserAndCaller(email);

      // Create an organization
      const organization = await db.organization.create({
        data: {
          name: "Test Organization",
          description: "Test Description",
        },
      });

      // Create an admin user for the organization
      const adminUser = await db.user.create({
        data: {
          name: "Admin User",
          email: faker.internet.email(),
        },
      });

      await db.membership.create({
        data: {
          userId: adminUser.id,
          organizationId: organization.id,
          role: "ADMIN",
        },
      });

      // Create an invitation
      const invitation = await db.invitation.create({
        data: {
          email,
          role: "MEMBER",
          organizationId: organization.id,
          invitedById: adminUser.id,
        },
      });

      const result = await invitationCaller.getPending();

      expect(result).toHaveLength(1);
      expect(result[0]?.id).toBe(invitation.id);
      expect(result[0]?.email).toBe(email);
      expect(result[0]?.organization.id).toBe(organization.id);
    });
  });
});

describe("OrganizationRouter - Invitations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("inviteUser", () => {
    it("should create an invitation successfully", async () => {
      const { organizationCaller, user } = await createTestUserAndCaller();

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
      const result = await organizationCaller.inviteUser({
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
      const { organizationCaller, user } = await createTestUserAndCaller();

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
        organizationCaller.inviteUser({
          organizationId: organization.id,
          email: inviteeEmail,
          role: "MEMBER",
        }),
      ).rejects.toThrow("You must be an admin to perform this action");
    });

    it("should throw error when user is already a member", async () => {
      const { organizationCaller, user } = await createTestUserAndCaller();

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
        organizationCaller.inviteUser({
          organizationId: organization.id,
          email: existingUser.email!,
          role: "MEMBER",
        }),
      ).rejects.toThrow("User is already a member of this organization");
    });
  });

  describe("getInvitations", () => {
    it("should return invitations for the organization", async () => {
      const { organizationCaller, user } = await createTestUserAndCaller();

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

      const result = await organizationCaller.getInvitations({
        organizationId: organization.id,
      });

      expect(result).toHaveLength(1);
      expect(result[0]?.id).toBe(invitation?.id);
      expect(result[0]?.organizationId).toBe(organization.id);
    });

    it("should throw error when user is not a member", async () => {
      const { organizationCaller } = await createTestUserAndCaller();

      // Create an organization without membership for this user
      const organization = await db.organization.create({
        data: {
          name: "Test Organization",
          description: "Test Description",
        },
      });

      await expect(
        organizationCaller.getInvitations({
          organizationId: organization.id,
        }),
      ).rejects.toThrow("You are not a member of this organization");
    });
  });

  describe("getMembers", () => {
    it("should return members for the organization", async () => {
      const { organizationCaller, user } = await createTestUserAndCaller();

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

      const result = await organizationCaller.getMembers({
        organizationId: organization.id,
      });

      expect(result).toHaveLength(2);
      expect(result.some((m) => m.id === member.id)).toBe(true);
    });

    it("should throw error when user is not a member", async () => {
      const { organizationCaller } = await createTestUserAndCaller();

      // Create an organization without membership for this user
      const organization = await db.organization.create({
        data: {
          name: "Test Organization",
          description: "Test Description",
        },
      });

      await expect(
        organizationCaller.getMembers({
          organizationId: organization.id,
        }),
      ).rejects.toThrow("You are not a member of this organization");
    });
  });
});

