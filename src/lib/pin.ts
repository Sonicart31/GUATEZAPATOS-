import { z } from "zod";

export const pinSchema = z.string().regex(/^\d{6}$/, "El PIN debe tener 6 dígitos.");
export const pinSetupSchema = z.object({ pin: pinSchema, confirmation: pinSchema }).refine(v => v.pin === v.confirmation, { message: "Los PIN no coinciden." });
export const canCancelOrder = (status: string) => status === "pendiente" || status === "confirmado";

export function requirePinResult(result: unknown) {
  if (!result || typeof result !== "object" || !("ok" in result) || result.ok !== true) {
    const message = result && typeof result === "object" && "message" in result && typeof result.message === "string" ? result.message : "No se pudo confirmar la operación.";
    throw new Error(message);
  }
}