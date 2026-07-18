-- Run this in Supabase Dashboard → SQL Editor
-- This ensures the products table has the variants column to support customizable item options.

ALTER TABLE products ADD COLUMN IF NOT EXISTS variants TEXT DEFAULT '';
