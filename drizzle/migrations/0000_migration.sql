create type public.app_role as enum ('vendedor','cliente');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  phone text,
  address text,
  created_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create policy "own roles" on public.user_roles for select to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(),'vendedor'));
create policy "own profile read" on public.profiles for select to authenticated using (id = auth.uid() or public.has_role(auth.uid(),'vendedor'));
create policy "own profile update" on public.profiles for update to authenticated using (id = auth.uid());
create policy "own profile insert" on public.profiles for insert to authenticated with check (id = auth.uid());

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, phone)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name',''), new.raw_user_meta_data->>'phone');
  if not exists (select 1 from public.user_roles where role = 'vendedor') then
    insert into public.user_roles (user_id, role) values (new.id, 'vendedor');
  else
    insert into public.user_roles (user_id, role) values (new.id, 'cliente');
  end if;
  return new;
end; $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create table public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  brand text not null,
  description text not null default '',
  price numeric(10,2) not null,
  stock integer not null default 0,
  image_url text not null default '',
  sizes text not null default '38,39,40,41,42,43',
  active boolean not null default true,
  created_at timestamptz not null default now()
);
grant select on public.products to anon;
grant select, insert, update, delete on public.products to authenticated;
grant all on public.products to service_role;
alter table public.products enable row level security;
create policy "public read active" on public.products for select to anon, authenticated using (active or public.has_role(auth.uid(),'vendedor'));
create policy "seller insert" on public.products for insert to authenticated with check (public.has_role(auth.uid(),'vendedor'));
create policy "seller update" on public.products for update to authenticated using (public.has_role(auth.uid(),'vendedor'));
create policy "seller delete" on public.products for delete to authenticated using (public.has_role(auth.uid(),'vendedor'));

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null,
  status text not null default 'pendiente',
  total numeric(10,2) not null default 0,
  address text not null default '',
  phone text not null default '',
  seller_note text,
  created_at timestamptz not null default now()
);
grant select, update on public.orders to authenticated;
grant all on public.orders to service_role;
alter table public.orders enable row level security;
create policy "orders read" on public.orders for select to authenticated using (customer_id = auth.uid() or public.has_role(auth.uid(),'vendedor'));
create policy "orders seller update" on public.orders for update to authenticated using (public.has_role(auth.uid(),'vendedor'));

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_name text not null,
  size text not null,
  quantity integer not null,
  unit_price numeric(10,2) not null
);
grant select on public.order_items to authenticated;
grant all on public.order_items to service_role;
alter table public.order_items enable row level security;
create policy "items read" on public.order_items for select to authenticated using (
  exists (select 1 from public.orders o where o.id = order_id and (o.customer_id = auth.uid() or public.has_role(auth.uid(),'vendedor'))));

create or replace function public.place_order(_items jsonb, _address text, _phone text)
returns uuid language plpgsql security definer set search_path = public as $$
declare _order uuid; _it jsonb; _p public.products; _total numeric := 0;
begin
  if auth.uid() is null then raise exception 'Debes iniciar sesión'; end if;
  if jsonb_array_length(_items) = 0 then raise exception 'Carrito vacío'; end if;
  insert into public.orders (customer_id, address, phone) values (auth.uid(), _address, _phone) returning id into _order;
  for _it in select * from jsonb_array_elements(_items) loop
    select * into _p from public.products where id = (_it->>'product_id')::uuid and active for update;
    if not found then raise exception 'Producto no disponible'; end if;
    if _p.stock < (_it->>'quantity')::int or (_it->>'quantity')::int < 1 then raise exception 'Sin stock suficiente de %', _p.name; end if;
    update public.products set stock = stock - (_it->>'quantity')::int where id = _p.id;
    insert into public.order_items (order_id, product_id, product_name, size, quantity, unit_price)
      values (_order, _p.id, _p.name, coalesce(_it->>'size',''), (_it->>'quantity')::int, _p.price);
    _total := _total + _p.price * (_it->>'quantity')::int;
  end loop;
  update public.orders set total = _total where id = _order;
  return _order;
end; $$;
revoke all on function public.place_order(jsonb,text,text) from public, anon;
grant execute on function public.place_order(jsonb,text,text) to authenticated;

insert into public.products (name, brand, description, price, stock, image_url) values
('Air Max 90 Rojo', 'Nike', 'Clásico icónico con amortiguación Air visible.', 1199.00, 12, '/products/nike-airmax.jpg'),
('Air Force 1 Blanco', 'Nike', 'El tenis blanco que combina con todo.', 999.00, 20, '/products/nike-af1.jpg'),
('Ultraboost Negro', 'Adidas', 'Comodidad Boost para correr o caminar todo el día.', 1349.00, 8, '/products/adidas-ultraboost.jpg'),
('Samba Clásico', 'Adidas', 'Estilo retro de terraza, suela de goma.', 899.00, 15, '/products/adidas-samba.jpg');