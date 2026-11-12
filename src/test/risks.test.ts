import { describe, it, expect } from "vitest";
import { assessRisks } from "@/lib/risks";
const base = { checked_at: "", configured_pins: 0, locked_pins: 0, failed_24h: 0 };
describe("assessRisks", () => {
  it("PIN bloqueado es riesgo alto", () => expect(assessRisks({ ...base, locked_pins: 1 })[0].level).toBe("alto"));
  it("10 errores de PIN en 24 h es alto, menos es medio", () => {
    expect(assessRisks({ ...base, failed_24h: 10 })[0].level).toBe("alto");
    expect(assessRisks({ ...base, failed_24h: 3 })[0].level).toBe("medio");
  });
  it("sin señales no hay riesgos", () => expect(assessRisks(base)).toHaveLength(0));
});
