import { describe, it, expect, beforeAll } from "vitest";
import { createCaller } from "./routers";
import type { TrpcContext } from "./_core/context";
import { createMockRequest, createMockResponse } from "./_core/testHelpers";

describe("Auth SignIn", () => {
  let caller: ReturnType<typeof createCaller>;
  let mockContext: TrpcContext;

  beforeAll(() => {
    // Create mock request/response
    const req = createMockRequest();
    const res = createMockResponse();

    mockContext = {
      req,
      res,
      user: null,
    };

    caller = createCaller(mockContext);
  });

  it("should sign in with correct credentials", async () => {
    const result = await caller.auth.signin({
      username: "AdminTavani",
      password: "Fizz7718!!!!",
    });

    expect(result).toBeDefined();
    expect(result.success).toBe(true);
    expect(result.userId).toBe(1);
  });

  it("should reject invalid username", async () => {
    try {
      await caller.auth.signin({
        username: "InvalidUser",
        password: "Fizz7718!!!!",
      });
      expect.fail("Should have thrown an error");
    } catch (error: any) {
      expect(error.message).toContain("Invalid username or password");
    }
  });

  it("should reject invalid password", async () => {
    try {
      await caller.auth.signin({
        username: "AdminTavani",
        password: "WrongPassword123",
      });
      expect.fail("Should have thrown an error");
    } catch (error: any) {
      expect(error.message).toContain("Invalid username or password");
    }
  });
});
