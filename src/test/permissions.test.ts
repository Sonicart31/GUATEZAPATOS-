import { describe, expect, it } from "vitest";
import { canListInventory, canManageInventory } from "@/lib/permissions";

describe("Permisos de inventario", () => {
  it("el vendedor puede listar productos pero no modificarlos", () => {
    expect(canListInventory("vendedor")).toBe(true);
    expect(canManageInventory("vendedor")).toBe(false);
  });

  it("el administrador puede listar productos y modificarlos", () => {
    expect(canListInventory("administrador")).toBe(true);
    expect(canManageInventory("administrador")).toBe(true);
  });

  it("el cliente no puede consultar el inventario completo ni modificarlo", () => {
    expect(canListInventory("cliente")).toBe(false);
    expect(canManageInventory("cliente")).toBe(false);
  });

  it("el analista no recibe permisos de inventario", () => {
    expect(canListInventory("analista")).toBe(false);
    expect(canManageInventory("analista")).toBe(false);
  });
});
