-- =====================================================
-- MARKETPLACE PAYMENT SYSTEM WITH ESCROW
-- =====================================================
-- This schema supports:
-- 1. Order payments with Razorpay
-- 2. Escrow-like payment holding
-- 3. Seller payouts with commission deduction
-- 4. Transaction tracking
-- =====================================================

-- Update orders table to add payment and escrow fields
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS payment_status VARCHAR(50) DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS razorpay_order_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS razorpay_payment_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS razorpay_signature VARCHAR(500),
ADD COLUMN IF NOT EXISTS escrow_status VARCHAR(50) DEFAULT 'held',
ADD COLUMN IF NOT EXISTS escrow_release_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS payout_status VARCHAR(50) DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS seller_amount DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS platform_commission DECIMAL(10, 2) DEFAULT 0;

-- Comment: 
-- payment_status: 'pending', 'processing', 'completed', 'failed', 'refunded'
-- escrow_status: 'held', 'released', 'refunded'
-- payout_status: 'pending', 'processing', 'completed', 'failed'

-- Order Payments table - tracks all payment attempts for orders
CREATE TABLE IF NOT EXISTS order_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'INR',
    razorpay_order_id VARCHAR(255) NOT NULL,
    razorpay_payment_id VARCHAR(255),
    razorpay_signature VARCHAR(500),
    payment_method VARCHAR(50),
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    error_message TEXT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(razorpay_order_id)
);

-- Seller Payouts table - tracks payouts to sellers
CREATE TABLE IF NOT EXISTS seller_payouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    shop_id UUID REFERENCES shops(id) ON DELETE SET NULL,
    amount DECIMAL(10, 2) NOT NULL,
    commission_amount DECIMAL(10, 2) DEFAULT 0,
    net_amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'INR',
    status VARCHAR(50) DEFAULT 'pending',
    payment_method VARCHAR(50) DEFAULT 'bank_transfer',
    bank_account_number VARCHAR(100),
    ifsc_code VARCHAR(20),
    upi_id VARCHAR(100),
    transaction_reference VARCHAR(255),
    notes TEXT,
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Comment: 
-- status: 'pending', 'processing', 'completed', 'failed', 'cancelled'

-- Payout Order Mapping - links orders to payouts
CREATE TABLE IF NOT EXISTS payout_order_mapping (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payout_id UUID NOT NULL REFERENCES seller_payouts(id) ON DELETE CASCADE,
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    amount DECIMAL(10, 2) NOT NULL,
    commission_amount DECIMAL(10, 2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(payout_id, order_id)
);

-- Seller Bank Details table
CREATE TABLE IF NOT EXISTS seller_bank_details (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    account_holder_name VARCHAR(255) NOT NULL,
    bank_account_number VARCHAR(100) NOT NULL,
    ifsc_code VARCHAR(20) NOT NULL,
    bank_name VARCHAR(255),
    branch_name VARCHAR(255),
    account_type VARCHAR(50) DEFAULT 'savings',
    upi_id VARCHAR(100),
    is_verified BOOLEAN DEFAULT false,
    is_primary BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(seller_id, bank_account_number)
);

-- Platform Transactions table - for audit trail
CREATE TABLE IF NOT EXISTS platform_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_type VARCHAR(50) NOT NULL,
    reference_id UUID,
    reference_type VARCHAR(50),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    amount DECIMAL(10, 2) NOT NULL,
    commission_amount DECIMAL(10, 2) DEFAULT 0,
    currency VARCHAR(10) DEFAULT 'INR',
    status VARCHAR(50) NOT NULL,
    payment_gateway VARCHAR(50),
    gateway_transaction_id VARCHAR(255),
    description TEXT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Comment:
-- transaction_type: 'order_payment', 'seller_payout', 'refund', 'commission', 'subscription'
-- reference_type: 'order', 'payout', 'subscription', etc.
-- status: 'pending', 'processing', 'completed', 'failed', 'cancelled'

-- Platform Settings table - for configuring escrow and commission
CREATE TABLE IF NOT EXISTS platform_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT NOT NULL,
    data_type VARCHAR(50) DEFAULT 'string',
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default platform settings
INSERT INTO platform_settings (setting_key, setting_value, data_type, description) VALUES
('escrow_hold_days', '7', 'integer', 'Number of days to hold payment in escrow before releasing to seller'),
('platform_commission_percentage', '5', 'decimal', 'Platform commission percentage on each sale'),
('minimum_payout_amount', '100', 'decimal', 'Minimum amount required for seller to request payout'),
('auto_release_escrow', 'true', 'boolean', 'Automatically release escrow funds after hold period'),
('auto_payout_enabled', 'false', 'boolean', 'Automatically process payouts when escrow is released')
ON CONFLICT (setting_key) DO NOTHING;

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_order_payments_order_id ON order_payments(order_id);
CREATE INDEX IF NOT EXISTS idx_order_payments_user_id ON order_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_order_payments_status ON order_payments(status);
CREATE INDEX IF NOT EXISTS idx_order_payments_razorpay_order_id ON order_payments(razorpay_order_id);
CREATE INDEX IF NOT EXISTS idx_order_payments_created_at ON order_payments(created_at);

CREATE INDEX IF NOT EXISTS idx_seller_payouts_seller_id ON seller_payouts(seller_id);
CREATE INDEX IF NOT EXISTS idx_seller_payouts_shop_id ON seller_payouts(shop_id);
CREATE INDEX IF NOT EXISTS idx_seller_payouts_status ON seller_payouts(status);
CREATE INDEX IF NOT EXISTS idx_seller_payouts_created_at ON seller_payouts(created_at);

CREATE INDEX IF NOT EXISTS idx_payout_order_mapping_payout_id ON payout_order_mapping(payout_id);
CREATE INDEX IF NOT EXISTS idx_payout_order_mapping_order_id ON payout_order_mapping(order_id);

CREATE INDEX IF NOT EXISTS idx_seller_bank_details_seller_id ON seller_bank_details(seller_id);
CREATE INDEX IF NOT EXISTS idx_seller_bank_details_is_primary ON seller_bank_details(is_primary);

CREATE INDEX IF NOT EXISTS idx_platform_transactions_transaction_type ON platform_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_platform_transactions_reference_id ON platform_transactions(reference_id);
CREATE INDEX IF NOT EXISTS idx_platform_transactions_user_id ON platform_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_platform_transactions_status ON platform_transactions(status);
CREATE INDEX IF NOT EXISTS idx_platform_transactions_created_at ON platform_transactions(created_at);

CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_escrow_status ON orders(escrow_status);
CREATE INDEX IF NOT EXISTS idx_orders_payout_status ON orders(payout_status);
CREATE INDEX IF NOT EXISTS idx_orders_escrow_release_date ON orders(escrow_release_date);

-- Triggers for updated_at
CREATE TRIGGER update_order_payments_updated_at BEFORE UPDATE ON order_payments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_seller_payouts_updated_at BEFORE UPDATE ON seller_payouts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_seller_bank_details_updated_at BEFORE UPDATE ON seller_bank_details
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_platform_transactions_updated_at BEFORE UPDATE ON platform_transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_platform_settings_updated_at BEFORE UPDATE ON platform_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to calculate seller earnings (available for payout)
CREATE OR REPLACE FUNCTION get_seller_available_earnings(seller_uuid UUID)
RETURNS DECIMAL(10, 2) AS $$
DECLARE
    total_earnings DECIMAL(10, 2);
BEGIN
    SELECT COALESCE(SUM(seller_amount), 0)
    INTO total_earnings
    FROM orders
    WHERE shop_id IN (SELECT id FROM shops WHERE owner_id = seller_uuid)
    AND payment_status = 'completed'
    AND escrow_status = 'released'
    AND payout_status = 'pending';
    
    RETURN total_earnings;
END;
$$ LANGUAGE plpgsql;

-- Function to get seller total lifetime earnings
CREATE OR REPLACE FUNCTION get_seller_total_earnings(seller_uuid UUID)
RETURNS DECIMAL(10, 2) AS $$
DECLARE
    total_earnings DECIMAL(10, 2);
BEGIN
    SELECT COALESCE(SUM(seller_amount), 0)
    INTO total_earnings
    FROM orders
    WHERE shop_id IN (SELECT id FROM shops WHERE owner_id = seller_uuid)
    AND payment_status = 'completed';
    
    RETURN total_earnings;
END;
$$ LANGUAGE plpgsql;

-- Function to automatically release escrow funds
CREATE OR REPLACE FUNCTION auto_release_escrow()
RETURNS void AS $$
BEGIN
    UPDATE orders
    SET 
        escrow_status = 'released',
        updated_at = NOW()
    WHERE 
        escrow_status = 'held'
        AND payment_status = 'completed'
        AND status = 'delivered'
        AND escrow_release_date <= NOW();
END;
$$ LANGUAGE plpgsql;

-- View for seller earnings dashboard
CREATE OR REPLACE VIEW seller_earnings_dashboard AS
SELECT 
    s.owner_id as seller_id,
    s.id as shop_id,
    s.name as shop_name,
    COUNT(DISTINCT o.id) as total_orders,
    COALESCE(SUM(CASE WHEN o.payment_status = 'completed' THEN o.total_amount ELSE 0 END), 0) as total_sales,
    COALESCE(SUM(CASE WHEN o.payment_status = 'completed' THEN o.seller_amount ELSE 0 END), 0) as total_earnings,
    COALESCE(SUM(CASE WHEN o.payment_status = 'completed' THEN o.platform_commission ELSE 0 END), 0) as total_commission_paid,
    COALESCE(SUM(CASE WHEN o.escrow_status = 'held' AND o.payment_status = 'completed' THEN o.seller_amount ELSE 0 END), 0) as escrow_held_amount,
    COALESCE(SUM(CASE WHEN o.escrow_status = 'released' AND o.payout_status = 'pending' AND o.payment_status = 'completed' THEN o.seller_amount ELSE 0 END), 0) as available_for_payout,
    COALESCE(SUM(CASE WHEN o.payout_status IN ('completed', 'processing') AND o.payment_status = 'completed' THEN o.seller_amount ELSE 0 END), 0) as paid_out_amount
FROM shops s
LEFT JOIN orders o ON s.id = o.shop_id
GROUP BY s.owner_id, s.id, s.name;

-- Comments:
-- escrow_held_amount: Money held in escrow (waiting for delivery confirmation + hold period)
-- available_for_payout: Money ready to be paid out to seller
-- paid_out_amount: Money already paid out to seller


