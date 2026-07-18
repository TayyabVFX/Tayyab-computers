-- Run this in Supabase Dashboard → SQL Editor
-- This ensures the admin panel can update order statuses, search orders, and register profiles.

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Drop old policies if they exist to avoid duplicates
DROP POLICY IF EXISTS "Allow public read orders" ON orders;
DROP POLICY IF EXISTS "Allow public insert orders" ON orders;
DROP POLICY IF EXISTS "Allow public update orders" ON orders;
DROP POLICY IF EXISTS "Allow public delete orders" ON orders;

-- Create full permissions policies for the orders table
CREATE POLICY "Allow public read orders"
ON orders FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Allow public insert orders"
ON orders FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Allow public update orders"
ON orders FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow public delete orders"
ON orders FOR DELETE
TO anon, authenticated
USING (true);
