import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type CartItem = { product_id: string; name: string; price: number; size: string; quantity: number; image_url: string };
type CartCtx = {
  items: CartItem[];
  add: (i: CartItem) => void;
  remove: (product_id: string, size: string) => void;
  clear: () => void;
  open: boolean;
  setOpen: (o: boolean) => void;
};
const Ctx = createContext<CartCtx | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    try { setItems(JSON.parse(localStorage.getItem("gz-cart") || "[]")); } catch { /* ignore */ }
  }, []);
  const save = (next: CartItem[]) => { setItems(next); localStorage.setItem("gz-cart", JSON.stringify(next)); };
  return (
    <Ctx.Provider value={{
      items, open, setOpen,
      add: (i) => {
        const ex = items.find((x) => x.product_id === i.product_id && x.size === i.size);
        save(ex ? items.map((x) => (x === ex ? { ...x, quantity: x.quantity + i.quantity } : x)) : [...items, i]);
      },
      remove: (id, size) => save(items.filter((x) => !(x.product_id === id && x.size === size))),
      clear: () => save([]),
    }}>
      {children}
    </Ctx.Provider>
  );
}
export const useCart = () => useContext(Ctx)!;
export const q = (n: number) => `Q${n.toLocaleString("es-GT", { minimumFractionDigits: 2 })}`;
