export type AppRole = "vendedor" | "analista" | "cliente" | "administrador" | null;

export function canListInventory(role: AppRole) {
  return role === "vendedor" || role === "administrador";
}

export function canManageInventory(role: AppRole) {
  return role === "administrador";
}
