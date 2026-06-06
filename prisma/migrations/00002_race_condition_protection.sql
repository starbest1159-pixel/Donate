-- Race condition protection functions for merchant balance operations
-- Uses pessimistic locking (SELECT FOR UPDATE) + optimistic version check

CREATE OR REPLACE FUNCTION acquire_merchant_lock(p_merchant_id UUID)
RETURNS merchants AS $$
DECLARE
  v_merchant merchants%ROWTYPE;
BEGIN
  SELECT * INTO v_merchant
  FROM merchants
  WHERE id = p_merchant_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Merchant not found: %', p_merchant_id;
  END IF;

  RETURN v_merchant;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION credit_merchant_balance(
  p_merchant_id UUID,
  p_amount NUMERIC,
  p_reference_type TEXT DEFAULT NULL,
  p_reference_id UUID DEFAULT NULL,
  p_description TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_merchant merchants%ROWTYPE;
  v_transaction_id UUID;
  v_balance_before NUMERIC(19, 4);
  v_balance_after NUMERIC(19, 4);
  v_current_version INTEGER;
BEGIN
  -- Acquire pessimistic lock
  SELECT * INTO v_merchant
  FROM merchants
  WHERE id = p_merchant_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Merchant not found: %', p_merchant_id;
  END IF;

  v_current_version := v_merchant.version;
  v_balance_before := v_merchant.balance;
  v_balance_after := v_balance_before + p_amount;

  -- Insert transaction record
  INSERT INTO transactions (merchant_id, type, amount, balance_before, balance_after, reference_type, reference_id, description)
  VALUES (p_merchant_id, 'CREDIT', p_amount, v_balance_before, v_balance_after, p_reference_type, p_reference_id, p_description)
  RETURNING id INTO v_transaction_id;

  -- Update balance with optimistic version check
  UPDATE merchants
  SET balance = balance + p_amount,
      version = version + 1,
      updated_at = now()
  WHERE id = p_merchant_id AND version = v_current_version;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'OPTIMISTIC_LOCK_ERROR';
  END IF;

  RETURN v_transaction_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION debit_merchant_balance(
  p_merchant_id UUID,
  p_amount NUMERIC,
  p_reference_type TEXT DEFAULT NULL,
  p_reference_id UUID DEFAULT NULL,
  p_description TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_merchant merchants%ROWTYPE;
  v_transaction_id UUID;
  v_balance_before NUMERIC(19, 4);
  v_balance_after NUMERIC(19, 4);
  v_current_version INTEGER;
BEGIN
  -- Acquire pessimistic lock
  SELECT * INTO v_merchant
  FROM merchants
  WHERE id = p_merchant_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Merchant not found: %', p_merchant_id;
  END IF;

  -- Check sufficient balance
  IF v_merchant.balance < p_amount THEN
    RAISE EXCEPTION 'Insufficient balance: available %, requested %', v_merchant.balance, p_amount;
  END IF;

  v_current_version := v_merchant.version;
  v_balance_before := v_merchant.balance;
  v_balance_after := v_balance_before - p_amount;

  -- Insert transaction record
  INSERT INTO transactions (merchant_id, type, amount, balance_before, balance_after, reference_type, reference_id, description)
  VALUES (p_merchant_id, 'DEBIT', p_amount, v_balance_before, v_balance_after, p_reference_type, p_reference_id, p_description)
  RETURNING id INTO v_transaction_id;

  -- Update balance with optimistic version check
  UPDATE merchants
  SET balance = balance - p_amount,
      version = version + 1,
      updated_at = now()
  WHERE id = p_merchant_id AND version = v_current_version;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'OPTIMISTIC_LOCK_ERROR';
  END IF;

  RETURN v_transaction_id;
END;
$$ LANGUAGE plpgsql;
