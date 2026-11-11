import { describe, expect, it } from "vitest";
import { canCancelOrder, pinSchema, pinSetupSchema, requirePinResult } from "@/lib/pin";

describe("Personal purchase PIN", () => {
  it("requires a six-digit personal PIN", () => {
    expect(pinSchema.safeParse("123456").success).toBe(true);
    for (const value of ["12345", "1234567", "abcdef"]) expect(pinSchema.safeParse(value).success).toBe(false);
  });
  it("requires repeated PIN confirmation", () => {
    expect(pinSetupSchema.safeParse({ pin: "123456", confirmation: "654321" }).success).toBe(false);
    expect(pinSetupSchema.safeParse({ pin: "123456", confirmation: "123456" }).success).toBe(true);
  });
  it("does not accept a rejected transaction", () => {
    expect(() => requirePinResult({ ok: false, message: "PIN incorrecto" })).toThrow("PIN incorrecto");
    expect(() => requirePinResult({ ok: true })).not.toThrow();
  });
  it("only permits cancellation before shipping", () => {
    expect(canCancelOrder("pendiente")).toBe(true);
    expect(canCancelOrder("confirmado")).toBe(true);
    for (const status of ["enviado", "entregado", "cancelado"]) expect(canCancelOrder(status)).toBe(false);
  });
});