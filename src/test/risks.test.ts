import { describe, it, expect } from "vitest";
import { assessRisks } from "@/lib/risks";
const base = { checked_at: "", configured_pins: 0, locked_pins: 0, failed_24h: 0 };
describe("assessRisks", () => {
  it("PIN bloqueado es riesgo alto", () => expect(assessRisks({ ...base, locked_pins: 1 })[0]?.level).toBe("alto"));
  it("10 errores de PIN en 24 h es alto, menos es medio", () => {
    expect(assessRisks({ ...base, failed_24h: 10 })[0]?.level).toBe("alto");
    expect(assessRisks({ ...base, failed_24h: 3 })[0]?.level).toBe("medio");
  });
  it("sin señales no hay riesgos", () => expect(assessRisks(base)).toHaveLength(0));
});

import { pinEventsByDay } from "@/lib/risks";
describe("Gráfica de accesos con PIN", () => {
  it("cuenta fallos, bloqueos y cambios por día y descarta eventos antiguos", () => {
    const now = new Date(2026, 10, 16, 12);
    const r = pinEventsByDay([
      { event_type: "pin_failed", created_at: new Date(2026, 10, 16, 9).toISOString() },
      { event_type: "pin_failed", created_at: new Date(2026, 10, 16, 10).toISOString() },
      { event_type: "pin_locked", created_at: new Date(2026, 10, 15, 10).toISOString() },
      { event_type: "pin_changed", created_at: new Date(2026, 9, 1).toISOString() },
    ], 7, now);
    expect(r).toHaveLength(7);
    expect(r[6]).toMatchObject({ fallidos: 2, bloqueos: 0 });
    expect(r[5]).toMatchObject({ bloqueos: 1 });
    expect(r.reduce((s, d) => s + d.cambios, 0)).toBe(0);
  });
});
