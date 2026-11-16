import { describe, expect, it } from "vitest";
import { validStock } from "@/lib/inventory";

describe("Existencias de productos", () => {
  it("permite cero y cantidades enteras positivas", () => {
    expect(validStock("0")).toBe(0);
    expect(validStock("25")).toBe(25);
  });

  it("rechaza cantidades negativas, decimales o vacías", () => {
    expect(validStock("-1")).toBeNull();
    expect(validStock("1.5")).toBeNull();
    expect(validStock("")).toBeNull();
  });
});
