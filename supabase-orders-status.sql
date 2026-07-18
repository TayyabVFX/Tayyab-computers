-- Run this in Supabase Dashboard → SQL Editor
-- This ensures the orders table has the status column to support pending, confirmed, shipped, delivered, completed, and cancelled statuses.

ALTER TABLE orders ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
