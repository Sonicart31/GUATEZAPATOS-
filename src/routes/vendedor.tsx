import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { q } from "@/lib/cart";
import { STATUSES, StatusChip } from "@/components/OrderStatus";
import { ReportDownloads } from "@/components/ReportDownloads";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/vendedor")({
  head: () => ({
    meta: [
      { title: "Panel de vendedor — GuateZapatos" },
      { name: "description", content: "Gestiona inventario y pedidos de GuateZapatos." },
      { property: "og:title", content: "Panel de vendedor — GuateZapatos" },
      { property: "og:description", content: "Inventario y pedidos de clientes." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SellerPage,
});

function SellerPage() {
  const { user, role, loading } = useAuth();
  const [tab, setTab] = useState<"pedidos" | "inventario">("pedidos");
  if (loading) return null;
  if (!user || role !== "vendedor") return (
    <main className="mx-auto max-w-md px-4 py-16 text-center">
      <p className="mb-4">Esta sección es solo para el vendedor.</p>
      <Link to={user ? "/" : "/auth"} className="btn-primary">{user ? "Volver a la tienda" : "Ingresar"}</Link>
    </main>
  );
  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="mb-6 text-4xl">Panel de vendedor</h1>
      <div className="mb-6 flex gap-2">
        <button className={tab === "pedidos" ? "btn-ink" : "btn-ghost"} onClick={() => setTab("pedidos")}>Pedidos</button>
        <button className={tab === "inventario" ? "btn-ink" : "btn-ghost"} onClick={() => setTab("inventario")}>Inventario</button>
        <Button variant="outline" asChild><Link to="/riesgos">Riesgos de seguridad</Link></Button>
      </div>
      {tab === "pedidos" ? <Orders /> : <Inventory />}
    </main>
  );
}

function Orders() {
  const qc = useQueryClient();
  const { data: orders = [], isPending, isError } = useQuery({
    queryKey: ["seller-orders"],
    queryFn: async () => {
      const { data, error } = await supabase.from("orders").select("*, order_items(*)").order("created_at", { ascending: false });
      if (error) throw error;
      const ids = [...new Set(data.map((o) => o.customer_id))];
      const { data: profs } = await supabase.from("profiles").select("id, full_name").in("id", ids);
      const names = Object.fromEntries((profs ?? []).map((p) => [p.id, p.full_name]));
      return data.map((o) => ({ ...o, customer_name: names[o.customer_id] || "Cliente" }));
    },
  });
  const pending = orders.filter((o) => o.status === "pendiente").length;
  const sales = orders.filter((o) => o.status !== "cancelado").reduce((s, o) => s + Number(o.total), 0);
  const report = useMemo(() => ({
    title: "Pedidos", filename: "guatezapatos-pedidos",
    columns: ["Pedido", "Fecha", "Cliente", "Estado", "Total (Q)", "Teléfono", "Dirección", "Productos", "Mensaje del vendedor"],
    rows: orders.map(o => [o.id, new Date(o.created_at).toLocaleString("es-GT"), o.customer_name, o.status, Number(o.total), o.phone, o.address, o.order_items.map(i => `${i.quantity} × ${i.product_name} (talla ${i.size})`).join("; "), o.seller_note ?? ""]),
  }), [orders]);

  return (
    <div className="space-y-4">
      <ReportDownloads report={report} loading={isPending} error={isError} />
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Pedidos" value={String(orders.length)} />
        <Stat label="Pendientes" value={String(pending)} />
        <Stat label="Ventas" value={q(sales)} />
      </div>
      {orders.length === 0 && <p className="text-muted-foreground">Aún no hay pedidos.</p>}
      {orders.map((o) => <OrderRow key={o.id} o={o} onSaved={() => qc.invalidateQueries({ queryKey: ["seller-orders"] })} />)}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return <div className="panel p-4"><p className="text-sm text-muted-foreground">{label}</p><p className="font-display text-2xl">{value}</p></div>;
}

type OrderWithItems = { id: string; status: string; total: number; address: string; phone: string; seller_note: string | null; created_at: string; customer_name: string; order_items: { id: string; product_name: string; size: string; quantity: number }[] };

function OrderRow({ o, onSaved }: { o: OrderWithItems; onSaved: () => void }) {
  const [status, setStatus] = useState(o.status);
  const [note, setNote] = useState(o.seller_note ?? "");
  const save = async () => {
    const { error } = await supabase.from("orders").update({ status, seller_note: note || null }).eq("id", o.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Pedido actualizado; el cliente verá el mensaje");
    onSaved();
  };
  return (
    <div className="panel grid gap-4 p-4 md:grid-cols-[1fr_280px]">
      <div>
        <div className="flex items-center gap-2">
          <p className="font-semibold">{o.customer_name}</p><StatusChip status={o.status} />
        </div>
        <p className="text-sm text-muted-foreground">#{o.id.slice(0, 8)} · {new Date(o.created_at).toLocaleString("es-GT")} · Tel. {o.phone}</p>
        <p className="text-sm text-muted-foreground">Entrega: {o.address}</p>
        <ul className="mt-2 text-sm">{o.order_items.map((i) => <li key={i.id}>{i.quantity}× {i.product_name} — talla {i.size}</li>)}</ul>
        <p className="mt-2 font-display uppercase">{q(Number(o.total))}</p>
      </div>
      <div className="space-y-2">
        <select className="input capitalize" value={status} onChange={(e) => setStatus(e.target.value)}>
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <textarea className="input" rows={3} placeholder="Mensaje para el cliente (ej. tu pedido llega el viernes)" value={note} onChange={(e) => setNote(e.target.value)} />
        <button className="btn-primary w-full" onClick={save}>Guardar y avisar</button>
      </div>
    </div>
  );
}

type Product = { id: string; name: string; brand: string; description: string; price: number; stock: number; image_url: string; sizes: string; active: boolean };
const empty = { name: "", brand: "Nike", description: "", price: 0, stock: 0, image_url: "", sizes: "38,39,40,41,42,43", active: true };

function Inventory() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Partial<Product> | null>(null);
  const { data: products = [], isPending, isError } = useQuery({
    queryKey: ["seller-products"],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("*").order("created_at");
      if (error) throw error;
      return data as Product[];
    },
  });
  const refresh = () => { qc.invalidateQueries({ queryKey: ["seller-products"] }); qc.invalidateQueries({ queryKey: ["products"] }); };
  const report = useMemo(() => ({
    title: "Inventario", filename: "guatezapatos-inventario",
    columns: ["Producto", "Marca", "Precio (Q)", "Existencias", "Tallas", "Estado", "Descripción"],
    rows: products.map(p => [p.name, p.brand, Number(p.price), p.stock, p.sizes, p.active ? "Visible" : "Oculto", p.description]),
  }), [products]);

  const save = async () => {
    if (!editing?.name) { toast.error("Falta el nombre"); return; }
    const payload = { name: editing.name, brand: editing.brand ?? "Nike", description: editing.description ?? "", price: Number(editing.price) || 0, stock: Number(editing.stock) || 0, image_url: editing.image_url ?? "", sizes: editing.sizes ?? "", active: editing.active ?? true };
    const { error } = editing.id
      ? await supabase.from("products").update(payload).eq("id", editing.id)
      : await supabase.from("products").insert(payload);
    if (error) { toast.error(error.message); return; }
    toast.success("Producto guardado"); setEditing(null); refresh();
  };
  const del = async (id: string) => {
    if (!confirm("¿Eliminar este producto?")) return;
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    refresh();
  };

  return (
    <div className="space-y-4">
      <ReportDownloads report={report} loading={isPending} error={isError} />
      <button className="btn-primary" onClick={() => setEditing({ ...empty })}>+ Nuevo producto</button>
      {editing && (
        <div className="panel grid gap-3 p-4 sm:grid-cols-2">
          <input className="input" placeholder="Nombre" value={editing.name ?? ""} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
          <select className="input" value={editing.brand} onChange={(e) => setEditing({ ...editing, brand: e.target.value })}><option>Nike</option><option>Adidas</option></select>
          <label className="text-sm">Precio (Q)<input className="input" type="number" value={editing.price ?? 0} onChange={(e) => setEditing({ ...editing, price: Number(e.target.value) })} /></label>
          <label className="text-sm">Existencias<input className="input" type="number" value={editing.stock ?? 0} onChange={(e) => setEditing({ ...editing, stock: Number(e.target.value) })} /></label>
          <input className="input" placeholder="Tallas separadas por coma" value={editing.sizes ?? ""} onChange={(e) => setEditing({ ...editing, sizes: e.target.value })} />
          <input className="input" placeholder="Enlace de la foto" value={editing.image_url ?? ""} onChange={(e) => setEditing({ ...editing, image_url: e.target.value })} />
          <textarea className="input sm:col-span-2" placeholder="Descripción" value={editing.description ?? ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} />
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={editing.active ?? true} onChange={(e) => setEditing({ ...editing, active: e.target.checked })} /> Visible en tienda</label>
          <div className="flex justify-end gap-2"><button className="btn-ghost" onClick={() => setEditing(null)}>Cancelar</button><button className="btn-primary" onClick={save}>Guardar</button></div>
        </div>
      )}
      <div className="panel overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-secondary text-left"><tr><th className="p-3">Producto</th><th>Marca</th><th>Precio</th><th>Existencias</th><th>Estado</th><th></th></tr></thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id} className="border-t border-border">
                <td className="flex items-center gap-3 p-3"><img src={p.image_url} alt="" className="h-10 w-10 rounded object-cover" />{p.name}</td>
                <td>{p.brand}</td>
                <td>{q(Number(p.price))}</td>
                <td><span className={`chip ${p.stock <= 0 ? "bg-destructive text-destructive-foreground" : p.stock <= 5 ? "bg-primary text-primary-foreground" : "bg-secondary"}`}>{p.stock}</span></td>
                <td>{p.active ? "Visible" : "Oculto"}</td>
                <td className="space-x-2 pr-3 text-right whitespace-nowrap">
                  <button className="btn-ghost px-2 py-1" onClick={() => setEditing(p)}>Editar</button>
                  <button className="btn-ghost px-2 py-1 text-destructive" onClick={() => del(p.id)}>Eliminar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
