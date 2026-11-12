export type Overview = { checked_at: string; configured_pins: number; locked_pins: number; failed_24h: number; cancelled_24h?: number; stale_pending?: number; out_of_stock?: number; low_stock?: number; customers_without_pin?: number };
export type Risk = { level: "alto" | "medio" | "bajo"; title: string; detail: string; suggestion: string };

export function assessRisks(d: Overview): Risk[] {
  const r: Risk[] = [];
  if (d.locked_pins > 0) r.push({ level: "alto", title: "Cuentas con PIN bloqueado", detail: `${d.locked_pins} cuenta(s) bloqueadas por errores repetidos.`, suggestion: "Contacta al titular para confirmar su identidad y revisa si hubo intentos de compra no autorizados." });
  if (d.failed_24h >= 10) r.push({ level: "alto", title: "Muchos intentos de PIN fallidos", detail: `${d.failed_24h} errores de PIN en 24 horas.`, suggestion: "Posible intento de adivinar PIN. Revisa los eventos y pide a los clientes afectados cambiar su PIN y contraseña." });
  else if (d.failed_24h > 0) r.push({ level: "medio", title: "Intentos de PIN fallidos", detail: `${d.failed_24h} errores de PIN en 24 horas.`, suggestion: "Vigila si se repiten en la misma cuenta." });
  if ((d.cancelled_24h ?? 0) >= 5) r.push({ level: "medio", title: "Cancelaciones inusuales", detail: `${d.cancelled_24h} pedidos cancelados en 24 horas.`, suggestion: "Verifica si son clientes reales y si el stock se devolvió correctamente." });
  if ((d.stale_pending ?? 0) > 0) r.push({ level: "medio", title: "Pedidos sin atender", detail: `${d.stale_pending} pedido(s) pendientes por más de 48 horas.`, suggestion: "Pide al vendedor confirmarlos o cancelarlos para no perder clientes." });
  if ((d.out_of_stock ?? 0) > 0) r.push({ level: "medio", title: "Productos agotados visibles", detail: `${d.out_of_stock} producto(s) activos sin existencias.`, suggestion: "Reponer inventario u ocultar el producto en el panel del vendedor." });
  if ((d.low_stock ?? 0) > 0) r.push({ level: "bajo", title: "Existencias bajas", detail: `${d.low_stock} producto(s) con 3 unidades o menos.`, suggestion: "Planifica reabastecimiento." });
  if ((d.customers_without_pin ?? 0) > 0) r.push({ level: "bajo", title: "Clientes sin PIN", detail: `${d.customers_without_pin} cliente(s) no han creado su PIN.`, suggestion: "Recuérdales crear su PIN en “Mi PIN” para proteger sus compras." });
  return r;
}
