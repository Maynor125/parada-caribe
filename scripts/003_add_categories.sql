-- Update products table to include category
ALTER TABLE public.products ADD COLUMN category text DEFAULT 'Comida';

-- Update existing products with categories
UPDATE public.products SET category = 'Comida' WHERE name IN ('Producto A', 'Producto C');
UPDATE public.products SET category = 'Bebidas' WHERE name IN ('Producto B', 'Producto D');

-- Add sample Caribbean food products
INSERT INTO public.products (name, price, category) VALUES
  ('Tostones', 4.50, 'Comida'),
  ('Ropa Vieja', 12.99, 'Comida'),
  ('Ceviche', 10.50, 'Comida'),
  ('Arroz con Pollo', 11.99, 'Comida'),
  ('Mofongo', 8.99, 'Comida'),
  ('Picadillo', 9.99, 'Comida'),
  ('Ron Supremo', 6.99, 'Bebidas'),
  ('Refresco de Piña', 3.50, 'Bebidas'),
  ('Cerveza Fría', 5.99, 'Bebidas'),
  ('Mojito', 7.50, 'Bebidas'),
  ('Jugo Natural', 4.00, 'Bebidas'),
  ('Agua de Coco', 5.50, 'Bebidas');
