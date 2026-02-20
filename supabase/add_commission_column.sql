-- Add commission_amount column to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS commission_amount DECIMAL(10, 2) DEFAULT 0;

-- Add index for commission queries
CREATE INDEX IF NOT EXISTS idx_orders_commission_amount ON orders(commission_amount);

