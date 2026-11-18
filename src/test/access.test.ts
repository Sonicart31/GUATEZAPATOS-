import { beforeEach, describe, expect, it, vi } from "vitest";
const { resetPasswordForEmail, verifyOtp } = vi.hoisted(() => ({ resetPasswordForEmail: vi.fn(), verifyOtp: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { auth: { resetPasswordForEmail, verifyOtp } } }));
import { emailsMatch, postAuthPath, sendRecovery, verifyRecovery } from "@/lib/access";

describe("Account confirmation and recovery", () => {
  beforeEach(() => vi.resetAllMocks());
  it("takes a confirmed security analyst directly to Riesgos", () => {
    expect(postAuthPath("analista")).toBe("/riesgos");
  });
  it("takes customers to the store after authentication", () => {
    expect(postAuthPath("cliente")).toBe("/");
  });
  it("requires both email entries to match", () => {
    expect(emailsMatch("cliente@example.com", "otro@example.com")).toBe(false);
    expect(emailsMatch(" Cliente@example.com ", "cliente@example.com")).toBe(true);
  });
  it("requests a recovery email pointing at the password reset page", async () => {
    resetPasswordForEmail.mockResolvedValue({ error: null });
    await sendRecovery("cliente@example.com", "https://kickspot-hub.lovable.app");
    expect(resetPasswordForEmail).toHaveBeenCalledWith("cliente@example.com", { redirectTo: "https://kickspot-hub.lovable.app/reset-password" });
  });
  it("verifies emailed PIN as recovery, not signup or login", async () => {
    verifyOtp.mockResolvedValue({ data: { session: {} }, error: null });
    await verifyRecovery("cliente@example.com", "123456");
    expect(verifyOtp).toHaveBeenCalledWith({ email: "cliente@example.com", token: "123456", type: "recovery" });
  });
  it("rejects an invalid PIN", async () => {
    verifyOtp.mockResolvedValue({ data: { session: null }, error: new Error("invalid OTP") });
    await expect(verifyRecovery("cliente@example.com", "000000")).rejects.toThrow("invalid OTP");
  });
  it("does not accept verification without a recovery session", async () => {
    verifyOtp.mockResolvedValue({ data: { session: null }, error: null });
    await expect(verifyRecovery("cliente@example.com", "123456")).rejects.toThrow("No recovery session");
  });
});