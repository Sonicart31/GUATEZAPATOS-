import { Link, useNavigate } from "@tanstack/react-router";
import { ShoppingBag, LogOut, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { useCart, q } from "@/lib/cart";
import { supabase } from "@/integrations/supabase/client";

export function SiteHeader() {
  const { user, role, signOut } = useAuth();
  const { items, setOpen } = useCart();
  const navigate = useNavigate();
  const count = items.reduce((s, i) => s + i.quantity, 0);
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link to="/" className="font-display text-xl uppercase tracking-tight">
          Guate<span className="text-primary">Zapatos</span>
        </Link>
        <nav className="flex items-center gap-2 text-sm">
          <Link to="/" className="px-2 py-1 font-semibold hover:text-primary">Tienda</Link>
          {user && <Link to="/pedidos" className="px-2 py-1 font-semibold hover:text-primary">Mis pedidos</Link>}
          {role === "vendedor" && <Link to="/vendedor" className="chip bg-accent text-accent-foreground">Panel vendedor</Link>}
          {user ? (
            <button className="btn-ghost px-3" onClick={async () => { await signOut(); navigate({ to: "/", replace: true }); }} aria-label="Cerrar sesión">
              <LogOut className="h-4 w-4" />
            </button>
          ) : (
            <Link to="/auth" className="btn-ghost">Ingresar</Link>
          )}
          <button className="btn-ink relative" onClick={() => setOpen(true)} aria-label="Carrito">
            <ShoppingBag className="h-4 w-4" />
            {count > 0 && <span className="chip absolute -right-2 -top-2 bg-primary text-primary-foreground">{count}</span>}
          </button>
        </nav>
      </div>
      <CartDrawer />
    </header>
  );
}

function CartDrawer() {
  const { items, open, setOpen, remove, clear } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const total = items.reduce((s, i) => s + i.price * i.quantity, 0);
  if (!open) return null;

  const checkout = async () => {
    if (!user) { setOpen(false); navigate({ to: "/auth" }); return; }
    if (!address || !phone) { toast.error("Ingresa dirección y teléfono"); return; }
    setBusy(true);
    const { error } = await supabase.rpc("place_order", {
      _items: items.map((i) => ({ product_id: i.product_id, size: i.size, quantity: i.quantity })),
      _address: address, _phone: phone,
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    clear(); setOpen(false);
    toast.success("¡Pedido realizado! El vendedor lo revisará pronto.");
    navigate({ to: "/pedidos" });
  };

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-ink/40" onClick={() => setOpen(false)}>
      <aside className="flex h-full w-full max-w-md flex-col bg-background p-5" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl">Tu carrito</h2>
          <button onClick={() => setOpen(false)} aria-label="Cerrar"><X /></button>
        </div>
        <div className="flex-1 space-y-3 overflow-y-auto">
          {items.length === 0 && <p className="text-muted-foreground">Tu carrito está vacío.</p>}
          {items.map((i) => (
            <div key={i.product_id + i.size} className="panel flex items-center gap-3 p-2">
              <img src={i.image_url} alt={i.name} className="h-16 w-16 rounded-md object-cover" />
              <div className="flex-1 text-sm">
                <p className="font-semibold">{i.name}</p>
                <p className="text-muted-foreground">Talla {i.size} · x{i.quantity}</p>
              </div>
              <p className="font-semibold">{q(i.price * i.quantity)}</p>
              <button onClick={() => remove(i.product_id, i.size)} aria-label="Quitar"><X className="h-4 w-4" /></button>
            </div>
          ))}
        </div>
        {items.length > 0 && (
          <div className="space-y-3 border-t border-border pt-4">
            {user && (
              <>
                <input className="input" placeholder="Dirección de entrega" value={address} onChange={(e) => setAddress(e.target.value)} />
                <input className="input" placeholder="Teléfono" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </>
            )}
            <div className="flex justify-between font-display text-lg uppercase"><span>Total</span><span>{q(total)}</span></div>
            <button className="btn-primary w-full py-3" disabled={busy} onClick={checkout}>
              {user ? (busy ? "Procesando…" : "Realizar pedido") : "Ingresa para comprar"}
            </button>
          </div>
        )}
      </aside>
    </div>
  );
}
