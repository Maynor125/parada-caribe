-- Create orders table to store order history (optional, for reference)
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  created_at timestamp with time zone default now(),
  items jsonb not null,
  total decimal(10, 2) not null
);

-- Create order_items to store individual items per order
create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid not null references public.products(id),
  quantity integer not null,
  price decimal(10, 2) not null,
  subtotal decimal(10, 2) not null,
  created_at timestamp with time zone default now()
);
