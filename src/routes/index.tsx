import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useCart, q } from "@/lib/cart";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "GuateZapatos — Tenis Nike y Adidas en Guatemala" },
      { name: "description", content: "Compra tenis Nike y Adidas originales en línea con entrega en Guatemala." },
      { property: "og:title", content: "GuateZapatos — Tenis Nike y Adidas" },
      { property: "og:description", content: "Tenis Nike y Adidas con entrega en Guatemala." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Shop,
});

type Product = { id: string; name: string; brand: string; description: string; price: number; stock: number; image_url: string; sizes: string };

function Shop() {
  const [brand, setBrand] = useState<"Todas" | "Nike" | "Adidas">("Todas");
  const { data: products = [], isLoading } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("*").eq("active", true).order("created_at");
      if (error) throw error;
      return data as Product[];
    },
  });
  const list = products.filter((p) => brand === "Todas" || p.brand === brand);

  return (
    <main>
      <section className="bg-ink text-ink-foreground">
        <div className="mx-auto max-w-6xl px-4 py-16 md:py-24">
          <p className="chip mb-4 bg-accent text-accent-foreground">Envíos a toda Guatemala</p>
          <h1 className="max-w-3xl text-5xl leading-none md:text-7xl">
            Pisa fuerte.<br /><span className="text-primary">Nike & Adidas</span>
          </h1>
          <p className="mt-4 max-w-md text-ink-foreground/70">Los tenis que buscas, en tu talla, directo a tu puerta.</p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-10">
        <div className="mb-6 flex flex-wrap items-center gap-2">
          {(["Todas", "Nike", "Adidas"] as const).map((b) => (
            <button key={b} onClick={() => setBrand(b)} className={brand === b ? "btn-ink" : "btn-ghost"}>{b}</button>
          ))}
        </div>
        {isLoading && <p className="text-muted-foreground">Cargando…</p>}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((p) => <ProductCard key={p.id} p={p} />)}
        </div>
        {!isLoading && list.length === 0 && <p className="text-muted-foreground">No hay productos disponibles.</p>}
      </section>
    </main>
  );
}

function ProductCard({ p }: { p: Product }) {
  const sizes = p.sizes.split(",").map((s) => s.trim()).filter(Boolean);
  const [size, setSize] = useState(sizes[0] ?? "");
  const { add, setOpen } = useCart();
  const out = p.stock <= 0;
  return (
    <article className="panel group overflow-hidden">
      <div className="relative aspect-square overflow-hidden bg-muted">
        <img src={p.image_url} alt={p.name} loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
        <span className="chip absolute left-3 top-3 bg-ink text-ink-foreground">{p.brand}</span>
        {p.stock > 0 && p.stock <= 5 && <span className="chip absolute right-3 top-3 bg-primary text-primary-foreground">¡Quedan {p.stock}!</span>}
      </div>
      <div className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-lg leading-tight">{p.name}</h3>
          <p className="font-display text-lg">{q(Number(p.price))}</p>
        </div>
        <p className="text-sm text-muted-foreground">{p.description}</p>
        <div className="flex flex-wrap gap-1">
          {sizes.map((s) => (
            <button key={s} onClick={() => setSize(s)}
              className={`h-9 w-10 rounded-md border text-sm font-semibold ${size === s ? "border-ink bg-ink text-ink-foreground" : "border-border hover:border-ink"}`}>{s}</button>
          ))}
        </div>
        <button className="btn-primary w-full" disabled={out}
          onClick={() => { add({ product_id: p.id, name: p.name, price: Number(p.price), size, quantity: 1, image_url: p.image_url }); toast.success("Agregado al carrito"); setOpen(true); }}>
          {out ? "Agotado" : "Agregar al carrito"}
        </button>
      </div>
    </article>
  );
}
