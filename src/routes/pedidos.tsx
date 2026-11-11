import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { canCancelOrder, pinSchema, requirePinResult } from "@/lib/pin";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { q } from "@/lib/cart";
import { StatusChip } from "@/components/OrderStatus";

export const Route = createFileRoute("/pedidos")({
  head: () => ({
    meta: [
      { title: "Mis pedidos — GuateZapatos" },
      { name: "description", content: "Consulta el estado de tus pedidos en GuateZapatos." },
      { property: "og:title", content: "Mis pedidos — GuateZapatos" },
      { property: "og:description", content: "Seguimiento de tus pedidos." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MyOrders,
});

function MyOrders() {
  const { user, loading } = useAuth();
  const qc = useQueryClient();
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  async function cancelOrder(id: string) {
    if (busy) return;
    if (!pinSchema.safeParse(pin).success) { toast.error("Ingresa tu PIN de 6 dígitos"); return; }
    setBusy(true);
    try {
      const { data, error } = await supabase.rpc("cancel_order_with_pin", { _order_id: id, _pin: pin });
      if (error) throw error;
      requirePinResult(data); setCancelling(null); toast.success("Pedido cancelado");
      await qc.invalidateQueries({ queryKey: ["my-orders"] });
      await qc.invalidateQueries({ queryKey: ["products"] });
    } catch (error) { toast.error(error instanceof Error ? error.message : "No se pudo cancelar"); }
    finally { setPin(""); setBusy(false); }
  }
  const { data: orders = [] } = useQuery({
    queryKey: ["my-orders", user?.id],
    enabled: !!user,
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase.from("orders").select("*, order_items(*)").eq("customer_id", user.id).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  if (loading) return null;
  if (!user) return (
    <main className="mx-auto max-w-md px-4 py-16 text-center">
      <p className="mb-4">Ingresa para ver tus pedidos.</p>
      <Link to="/auth" className="btn-primary">Ingresar</Link>
    </main>
  );

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="mb-6 text-4xl">Mis pedidos</h1>
      {orders.length === 0 && <p className="text-muted-foreground">Aún no tienes pedidos.</p>}
      <div className="space-y-4">
        {orders.map((o) => (
          <div key={o.id} className="panel p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">#{o.id.slice(0, 8)} · {new Date(o.created_at).toLocaleString("es-GT")}</p>
              <StatusChip status={o.status} />
            </div>
            <ul className="my-3 text-sm">
              {o.order_items.map((i) => <li key={i.id}>{i.quantity}× {i.product_name} (talla {i.size}) — {q(Number(i.unit_price) * i.quantity)}</li>)}
            </ul>
            {o.seller_note && <p className="rounded-md bg-accent/40 p-3 text-sm"><b>Mensaje del vendedor:</b> {o.seller_note}</p>}
            <p className="mt-3 text-right font-display uppercase">Total {q(Number(o.total))}</p>
            {canCancelOrder(o.status) && (cancelling === o.id ? <div className="mt-4 space-y-3 border-t border-border pt-4"><label className="block text-sm">PIN para cancelar<input className="input mt-1" aria-label="PIN para cancelar" type="password" inputMode="numeric" maxLength={6} autoComplete="off" value={pin} onChange={e => setPin(e.target.value)} /></label><div className="flex flex-wrap gap-2"><Button variant="destructive" disabled={busy} onClick={() => cancelOrder(o.id)}>{busy ? "Cancelando…" : "Confirmar cancelación"}</Button><Button variant="outline" disabled={busy} onClick={() => { setCancelling(null); setPin(""); }}>Volver</Button></div></div> : <Button variant="outline" className="mt-4" onClick={() => { setCancelling(o.id); setPin(""); }}>Cancelar pedido</Button>)}
          </div>
        ))}
      </div>
    </main>
  );
}
