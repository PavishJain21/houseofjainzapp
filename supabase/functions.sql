-- Thread-safe stock management functions for Supabase
-- These functions ensure atomic operations for concurrent stock updates

-- Function to atomically reduce stock
CREATE OR REPLACE FUNCTION reduce_product_stock(
  p_product_id UUID,
  p_quantity INTEGER
) RETURNS JSON AS $$
DECLARE
  current_stock INTEGER;
  new_stock INTEGER;
  product_name VARCHAR;
BEGIN
  -- Get current stock with row-level lock (prevents concurrent reads)
  SELECT stock, name INTO current_stock, product_name
  FROM products
  WHERE id = p_product_id AND is_active = true
  FOR UPDATE; -- Row-level lock for this transaction
  
  -- Check if product exists
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Product not found or inactive'
    );
  END IF;
  
  -- Check stock availability
  IF current_stock < p_quantity THEN
    RETURN json_build_object(
      'success', false,
      'error', format('Insufficient stock. Available: %s, Required: %s', current_stock, p_quantity),
      'available_stock', current_stock
    );
  END IF;
  
  -- Calculate new stock
  new_stock := current_stock - p_quantity;
  
  -- Update stock atomically
  UPDATE products
  SET stock = new_stock,
      updated_at = NOW()
  WHERE id = p_product_id;
  
  RETURN json_build_object(
    'success', true,
    'new_stock', new_stock,
    'product_name', product_name
  );
END;
$$ LANGUAGE plpgsql;

-- Function to atomically restore stock
CREATE OR REPLACE FUNCTION restore_product_stock(
  p_product_id UUID,
  p_quantity INTEGER
) RETURNS JSON AS $$
DECLARE
  current_stock INTEGER;
  new_stock INTEGER;
BEGIN
  -- Get current stock
  SELECT stock INTO current_stock
  FROM products
  WHERE id = p_product_id
  FOR UPDATE; -- Row-level lock
  
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Product not found'
    );
  END IF;
  
  -- Calculate new stock
  new_stock := current_stock + p_quantity;
  
  -- Update stock atomically
  UPDATE products
  SET stock = new_stock,
      updated_at = NOW()
  WHERE id = p_product_id;
  
  RETURN json_build_object(
    'success', true,
    'new_stock', new_stock
  );
END;
$$ LANGUAGE plpgsql;

-- Function to atomically update stock with validation
CREATE OR REPLACE FUNCTION update_product_stock(
  p_product_id UUID,
  p_quantity_change INTEGER
) RETURNS JSON AS $$
DECLARE
  current_stock INTEGER;
  new_stock INTEGER;
  product_name VARCHAR;
BEGIN
  -- Get current stock with row-level lock
  SELECT stock, name INTO current_stock, product_name
  FROM products
  WHERE id = p_product_id AND is_active = true
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Product not found or inactive'
    );
  END IF;
  
  -- Calculate new stock
  new_stock := current_stock + p_quantity_change;
  
  -- Validate stock doesn't go negative
  IF new_stock < 0 THEN
    RETURN json_build_object(
      'success', false,
      'error', format('Insufficient stock. Available: %s, Required: %s', current_stock, ABS(p_quantity_change)),
      'available_stock', current_stock
    );
  END IF;
  
  -- Update stock atomically
  UPDATE products
  SET stock = new_stock,
      updated_at = NOW()
  WHERE id = p_product_id;
  
  RETURN json_build_object(
    'success', true,
    'new_stock', new_stock,
    'product_name', product_name
  );
END;
$$ LANGUAGE plpgsql;

