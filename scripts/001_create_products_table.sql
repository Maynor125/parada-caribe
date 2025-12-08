-- Create products table for static product list
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  price decimal(10, 2) not null,
  created_at timestamp with time zone default now()
);

-- Insert sample products (you can update these)
insert into public.products (name, price) values
  ('Producto A', 10.50),
  ('Producto B', 25.00),
  ('Producto C', 15.75),
  ('Producto D', 8.99);
