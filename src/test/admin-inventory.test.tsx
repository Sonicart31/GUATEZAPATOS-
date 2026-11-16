import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Route } from "@/routes/admin";

const database = vi.hoisted(() => ({
  from: vi.fn(),
  select: vi.fn(),
  order: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
  eq: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  useAuth: () => ({ user: { id: "admin-user" }, role: "administrador", loading: false }),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: database.from },
}));

vi.mock("@/components/ReportDownloads", () => ({
  ReportDownloads: () => null,
}));

const product = {
  id: "product-1",
  name: "Air Max de prueba",
  brand: "Nike",
  description: "Producto de prueba",
  price: 1000,
  stock: 8,
  image_url: "",
  sizes: "38,39,40",
  active: true,
};

function renderAdmin() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const AdminPage = Route.options.component!;
  return render(
    <QueryClientProvider client={queryClient}>
      <AdminPage />
    </QueryClientProvider>,
  );
}

describe("Administración de inventario", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    database.order.mockResolvedValue({ data: [product], error: null });
    database.select.mockReturnValue({ order: database.order });
    database.insert.mockResolvedValue({ error: null });
    database.eq.mockResolvedValue({ error: null });
    database.update.mockReturnValue({ eq: database.eq });
    database.from.mockReturnValue({ select: database.select, insert: database.insert, update: database.update });
  });

  it("el administrador agrega un producto con precio y existencias", async () => {
    renderAdmin();
    expect(await screen.findByText(product.name)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "+ Nuevo producto" }));
    fireEvent.change(screen.getByLabelText("Nombre del producto"), { target: { value: "Samba nueva" } });
    fireEvent.change(screen.getByLabelText(/Precio/), { target: { value: "950" } });
    fireEvent.change(screen.getByLabelText(/Existencias iniciales/), { target: { value: "12" } });
    fireEvent.click(screen.getByRole("button", { name: "Agregar producto" }));

    await waitFor(() => expect(database.insert).toHaveBeenCalledWith(expect.objectContaining({
      name: "Samba nueva",
      price: 950,
      stock: 12,
    })));
  });

  it("el administrador modifica la cantidad de un producto existente", async () => {
    renderAdmin();
    expect(await screen.findByText(product.name)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(`Nueva cantidad de ${product.name}`), { target: { value: "30" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));

    await waitFor(() => expect(database.update).toHaveBeenCalledWith({ stock: 30 }));
    expect(database.eq).toHaveBeenCalledWith("id", product.id);
  });
});
