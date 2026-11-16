import { q } from "@/lib/cart";

export type InventoryProduct = {
  id: string;
  name: string;
  brand: string;
  description: string;
  price: number;
  stock: number;
  image_url: string;
  sizes: string;
  active: boolean;
};

type InventoryTableProps = {
  products: InventoryProduct[];
  manageStock?: boolean;
  stockDrafts?: Record<string, string>;
  savingId?: string | null;
  onStockChange?: (id: string, value: string) => void;
  onSaveStock?: (product: InventoryProduct) => void;
};

export function InventoryTable({
  products,
  manageStock = false,
  stockDrafts = {},
  savingId = null,
  onStockChange,
  onSaveStock,
}: InventoryTableProps) {
  return (
    <div className="panel overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-secondary text-left">
          <tr>
            <th className="p-3">Producto</th>
            <th>Marca</th>
            <th>Precio</th>
            <th>Existencias</th>
            <th>Tallas</th>
            <th>Estado</th>
            {manageStock && <th className="p-3">Modificar cantidad</th>}
          </tr>
        </thead>
        <tbody>
          {products.map((product) => (
            <tr key={product.id} className="border-t border-border">
              <td className="flex min-w-52 items-center gap-3 p-3">
                {product.image_url ? (
                  <img src={product.image_url} alt="" className="h-10 w-10 rounded object-cover" />
                ) : (
                  <span className="flex h-10 w-10 items-center justify-center rounded bg-secondary font-display">{product.name.charAt(0)}</span>
                )}
                {product.name}
              </td>
              <td>{product.brand}</td>
              <td>{q(Number(product.price))}</td>
              <td>
                <span className={`chip ${product.stock <= 0 ? "bg-destructive text-destructive-foreground" : product.stock <= 5 ? "bg-primary text-primary-foreground" : "bg-secondary"}`}>
                  {product.stock}
                </span>
              </td>
              <td>{product.sizes}</td>
              <td>{product.active ? "Visible" : "Oculto"}</td>
              {manageStock && (
                <td className="p-3">
                  <div className="flex min-w-56 items-center gap-2">
                    <input
                      className="input w-24"
                      aria-label={`Nueva cantidad de ${product.name}`}
                      type="number"
                      min="0"
                      step="1"
                      value={stockDrafts[product.id] ?? String(product.stock)}
                      onChange={(event) => onStockChange?.(product.id, event.target.value)}
                    />
                    <button
                      className="btn-primary px-3 py-2"
                      disabled={savingId === product.id}
                      onClick={() => onSaveStock?.(product)}
                    >
                      {savingId === product.id ? "Guardando…" : "Guardar"}
                    </button>
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      {products.length === 0 && <p className="p-6 text-center text-muted-foreground">No hay productos registrados.</p>}
    </div>
  );
}
