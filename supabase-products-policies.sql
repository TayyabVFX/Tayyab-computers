-- Run this in Supabase Dashboard → SQL Editor
-- Fixes product add/edit/delete when orders work but products do not.
-- Orders already have insert policies; products often only have SELECT.

ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Remove old restrictive policies if they exist (ignore errors if names differ)
DROP POLICY IF EXISTS "Allow public read products" ON products;
DROP POLICY IF EXISTS "Allow public insert products" ON products;
DROP POLICY IF EXISTS "Allow public update products" ON products;
DROP POLICY IF EXISTS "Allow public delete products" ON products;
DROP POLICY IF EXISTS "Enable read access for all users" ON products;
DROP POLICY IF EXISTS "Enable insert for all users" ON products;
DROP POLICY IF EXISTS "Enable update for all users" ON products;
DROP POLICY IF EXISTS "Enable delete for all users" ON products;

CREATE POLICY "Allow public read products"
ON products FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Allow public insert products"
ON products FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Allow public update products"
ON products FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow public delete products"
ON products FOR DELETE
TO anon, authenticated
USING (true);
