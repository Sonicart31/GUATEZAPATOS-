import { describe, expect, it } from "vitest";
import { csvCell, reportCsv } from "@/lib/reports";

describe("report CSV data", () => {
  it("preserves quotes, commas, newlines and Spanish characters", () => {
    expect(reportCsv({ title: "Pedidos", filename: "pedidos", columns: ["Cliente"], rows: [['José, "Álvarez"\nGuatemala']] })).toBe('\uFEFF"Cliente"\r\n"José, ""Álvarez""\nGuatemala"');
  });
  it("neutralizes spreadsheet formulas in user text", () => {
    expect(csvCell("=HYPERLINK(1)")).toBe('"\'=HYPERLINK(1)"');
    expect(csvCell("  @SUM(1)")).toBe('"\'  @SUM(1)"');
    expect(csvCell(-10)).toBe('"-10"');
  });
  it("keeps headers in an empty report", () => {
    expect(reportCsv({ title: "Inventario", filename: "inventario", columns: ["Producto", "Precio (Q)"], rows: [] })).toBe('\uFEFF"Producto","Precio (Q)"');
  });
});