import { act } from "react-test-renderer";

import { renderHook } from "@/test-utils/renderHook";
import { useAuthStore } from "@/store/authStore";
import { useAuthController } from "./useAuthController";

jest.mock("../services/SupabaseService", () => ({
  SupabaseService: {
    signUp: jest.fn(),
    signIn: jest.fn(),
    signOut: jest.fn(),
    getSession: jest.fn(),
    resendSignUpConfirmation: jest.fn(),
  },
}));

jest.mock("../utils/logger", () => {
  const mockAuthLogger = {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    child: jest.fn(),
  };

  return {
    createLogger: jest.fn(() => mockAuthLogger),
    mockAuthLogger,
  };
});

jest.mock("../models/repositories/PendingSignupRepository", () => {
  const mockPendingSignupRepository = {
    get: jest.fn(),
    save: jest.fn(),
    clear: jest.fn(),
  };
  return {
    PendingSignupRepository: jest.fn(() => mockPendingSignupRepository),
    mockPendingSignupRepository,
  };
});

const { SupabaseService } = jest.requireMock("../services/SupabaseService");
const { mockPendingSignupRepository } = jest.requireMock(
  "../models/repositories/PendingSignupRepository",
);
const { mockAuthLogger } = jest.requireMock("../utils/logger");

const fakeSession = { user: { id: "user-1", email: "cook@example.com" } };

const oldIso = "2020-01-01T00:00:00.000Z";
const freshIso = () => new Date().toISOString();

describe("useAuthController pending confirmation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPendingSignupRepository.get.mockResolvedValue(null);
    mockPendingSignupRepository.save.mockResolvedValue(undefined);
    mockPendingSignupRepository.clear.mockResolvedValue(undefined);
    useAuthStore.setState({
      session: null,
      user: null,
      status: "idle",
      lastBackupAt: null,
    });
  });

  it("hydrates pending signup from the repository on mount", async () => {
    const pending = { email: "cook@example.com", lastSentAt: oldIso };
    mockPendingSignupRepository.get.mockResolvedValue(pending);

    const { result } = renderHook(() => useAuthController());
    await act(async () => {});

    expect(result.current.pendingSignup).toEqual(pending);
  });

  it("persists pending on signUp when no session is returned", async () => {
    SupabaseService.signUp.mockResolvedValue(null);
    const { result } = renderHook(() => useAuthController());
    await act(async () => {});

    await act(async () => {
      await result.current.signUp("cook@example.com", "hunter22");
    });

    expect(mockPendingSignupRepository.save).toHaveBeenCalledWith({
      email: "cook@example.com",
      lastSentAt: expect.any(String),
    });
    expect(result.current.pendingSignup?.email).toBe("cook@example.com");
  });

  it("logs the underlying signUp failure for diagnostic exports", async () => {
    const error = new Error(
      "SupabaseService signUp failed: Email signups are disabled",
    );
    SupabaseService.signUp.mockRejectedValue(error);
    const { result } = renderHook(() => useAuthController());
    await act(async () => {});

    await act(async () => {
      await result.current.signUp("cook@example.com", "hunter22");
    });

    expect(result.current.error).toBe("Could not create account.");
    expect(mockAuthLogger.error).toHaveBeenCalledWith(
      "Sign up failed",
      error,
    );
  });

  it("clears pending when signUp returns a live session", async () => {
    mockPendingSignupRepository.get.mockResolvedValue({
      email: "cook@example.com",
      lastSentAt: oldIso,
    });
    SupabaseService.signUp.mockResolvedValue(fakeSession);
    const { result } = renderHook(() => useAuthController());
    await act(async () => {});

    await act(async () => {
      await result.current.signUp("cook@example.com", "hunter22");
    });

    expect(mockPendingSignupRepository.clear).toHaveBeenCalled();
    expect(result.current.pendingSignup).toBeNull();
  });

  it("clears pending on successful signIn", async () => {
    mockPendingSignupRepository.get.mockResolvedValue({
      email: "cook@example.com",
      lastSentAt: oldIso,
    });
    SupabaseService.signIn.mockResolvedValue(fakeSession);
    const { result } = renderHook(() => useAuthController());
    await act(async () => {});

    await act(async () => {
      await result.current.signIn("cook@example.com", "hunter22");
    });

    expect(mockPendingSignupRepository.clear).toHaveBeenCalled();
    expect(result.current.pendingSignup).toBeNull();
  });

  it("resendConfirmation is a no-op inside the grace period", async () => {
    mockPendingSignupRepository.get.mockResolvedValue({
      email: "cook@example.com",
      lastSentAt: freshIso(),
    });
    const { result } = renderHook(() => useAuthController());
    await act(async () => {});

    await act(async () => {
      await result.current.resendConfirmation();
    });

    expect(SupabaseService.resendSignUpConfirmation).not.toHaveBeenCalled();
  });

  it("resendConfirmation resends and re-stamps after the grace period", async () => {
    mockPendingSignupRepository.get.mockResolvedValue({
      email: "cook@example.com",
      lastSentAt: oldIso,
    });
    SupabaseService.resendSignUpConfirmation.mockResolvedValue(undefined);
    const { result } = renderHook(() => useAuthController());
    await act(async () => {});

    await act(async () => {
      await result.current.resendConfirmation();
    });

    expect(SupabaseService.resendSignUpConfirmation).toHaveBeenCalledWith(
      "cook@example.com",
    );
    expect(mockPendingSignupRepository.save).toHaveBeenCalledWith({
      email: "cook@example.com",
      lastSentAt: expect.any(String),
    });
    expect(result.current.pendingSignup?.lastSentAt).not.toBe(oldIso);
  });
});
