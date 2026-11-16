import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { canManageInventory } from "@/lib/permissions";
import { validStock } from "@/lib/inventory";
import { InventoryTable, type InventoryProduct } from "@/components/InventoryTable";
import { ReportDownloads } from "@/components/ReportDownloads";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Administración de inventario — GuateZapatos" },
      { name: "description", content: "Agrega productos y actualiza las existencias de GuateZapatos." },
      { property: "og:title", content: "Administración de inventario — GuateZapatos" },
      { property: "og:description", content: "Gestión administrativa de productos y existencias." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminPage,
});

const emptyProduct = {
  name: "",
  brand: "Nike",
  description: "",
  price: "",
  stock: "0",
  image_url: "",
  sizes: "38,39,40,41,42,43",
  active: true,
};

function AdminPage() {
  const { user, role, loading } = useAuth();
  if (loading) return null;
  if (!user || !canManageInventory(role)) {
    return (
      <main className="mx-auto max-w-md px-4 py-16 text-center">
        <h1 className="mb-4 text-3xl">Administración</h1>
        <p className="mb-4">Esta sección es solo para el administrador.</p>
        <Link to={user ? "/" : "/auth"} className="btn-primary">{user ? "Volver a la tienda" : "Ingresar"}</Link>
      </main>
    );
  }
  return <InventoryAdmin />;
}

function InventoryAdmin() {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState(emptyProduct);
  const [showNew, setShowNew] = useState(false);
  const [creating, setCreating] = useState(false);
  const [stockDrafts, setStockDrafts] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const { data: products = [], isPending, isError } = useQuery({
    queryKey: ["admin-products"],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("*").order("created_at");
      if (error) throw error;
      return data as InventoryProduct[];
    },
  });

  const report = useMemo(() => ({
    title: "Inventario",
    filename: "guatezapatos-inventario",
    columns: ["Producto", "Marca", "Precio (Q)", "Existencias", "Tallas", "Estado", "Descripción"],
    rows: products.map((product) => [product.name, product.brand, Number(product.price), product.stock, product.sizes, product.active ? "Visible" : "Oculto", product.description]),
  }), [products]);

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-products"] });
    queryClient.invalidateQueries({ queryKey: ["seller-products"] });
    queryClient.invalidateQueries({ queryKey: ["products"] });
  };

  const createProduct = async (event: FormEvent) => {
    event.preventDefault();
    const stock = validStock(draft.stock);
    const price = Number(draft.price);
    if (!draft.name.trim()) { toast.error("Ingresa el nombre del producto"); return; }
    if (!Number.isFinite(price) || price <= 0) { toast.error("Ingresa un precio mayor que cero"); return; }
    if (stock === null) { toast.error("Las existencias deben ser un número entero igual o mayor que cero"); return; }
    setCreating(true);
    const { error } = await supabase.from("products").insert({
      name: draft.name.trim(),
      brand: draft.brand,
      description: draft.description.trim(),
      price,
      stock,
      image_url: draft.image_url.trim(),
      sizes: draft.sizes,
      active: draft.active,
    });
    setCreating(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Producto agregado");
    setDraft(emptyProduct);
    setShowNew(false);
    refresh();
  };

  const saveStock = async (product: InventoryProduct) => {
    const stock = validStock(stockDrafts[product.id] ?? String(product.stock));
    if (stock === null) { toast.error("Las existencias deben ser un número entero igual o mayor que cero"); return; }
    setSavingId(product.id);
    const { error } = await supabase.from("products").update({ stock }).eq("id", product.id);
    setSavingId(null);
    if (error) { toast.error(error.message); return; }
    setStockDrafts((current) => ({ ...current, [product.id]: String(stock) }));
    toast.success(`Existencias de ${product.name} actualizadas`);
    refresh();
  };

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-4xl">Administración de inventario</h1>
          <p className="mt-2 text-muted-foreground">Agrega productos y actualiza sus existencias.</p>
        </div>
        <button className="btn-primary" onClick={() => setShowNew((visible) => !visible)}>
          {showNew ? "Cerrar formulario" : "+ Nuevo producto"}
        </button>
      </div>

      <ReportDownloads report={report} loading={isPending} error={isError} />

      {showNew && (
        <form className="panel my-5 grid gap-3 p-4 sm:grid-cols-2" onSubmit={createProduct}>
          <input className="input" aria-label="Nombre del producto" placeholder="Nombre" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
          <select className="input" aria-label="Marca" value={draft.brand} onChange={(event) => setDraft({ ...draft, brand: event.target.value })}>
            <option>Nike</option>
            <option>Adidas</option>
          </select>
          <label className="text-sm">Precio (Q)
            <input className="input" type="number" min="0.01" step="0.01" value={draft.price} onChange={(event) => setDraft({ ...draft, price: event.target.value })} />
          </label>
          <label className="text-sm">Existencias iniciales
            <input className="input" type="number" min="0" step="1" value={draft.stock} onChange={(event) => setDraft({ ...draft, stock: event.target.value })} />
          </label>
          <input className="input" aria-label="Tallas" placeholder="Tallas separadas por coma" value={draft.sizes} onChange={(event) => setDraft({ ...draft, sizes: event.target.value })} />
          <input className="input" aria-label="Enlace de la foto" placeholder="Enlace de la foto" value={draft.image_url} onChange={(event) => setDraft({ ...draft, image_url: event.target.value })} />
          <textarea className="input sm:col-span-2" aria-label="Descripción" placeholder="Descripción" value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={draft.active} onChange={(event) => setDraft({ ...draft, active: event.target.checked })} />
            Visible en tienda
          </label>
          <div className="flex justify-end">
            <button className="btn-primary" type="submit" disabled={creating}>{creating ? "Guardando…" : "Agregar producto"}</button>
          </div>
        </form>
      )}

      <div className="mt-5">
        <InventoryTable
          products={products}
          manageStock
          stockDrafts={stockDrafts}
          savingId={savingId}
          onStockChange={(id, value) => setStockDrafts((current) => ({ ...current, [id]: value }))}
          onSaveStock={saveStock}
        />
      </div>
    </main>
  );
}
