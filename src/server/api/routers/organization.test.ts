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
async function createTestUserAndCaller() {
  const user = await db.user.create({
    data: {
      name: "Test User",
      email: faker.internet.email(),
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
      ).rejects.toThrow("You must be an admin to update this organization");
    });
  });
});
