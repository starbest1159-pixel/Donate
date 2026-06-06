-- Multi-tenant schema: master admins, merchants, deposits, transactions, audit logs
-- Uses shared-table multi-tenancy via merchant_id FK

CREATE TABLE master_admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'ADMIN' CHECK (role IN ('SUPER_ADMIN', 'ADMIN')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE merchants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  business_name VARCHAR(255) NOT NULL,
  tax_id VARCHAR(50),
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'SUSPENDED', 'TERMINATED')),
  balance NUMERIC(19, 4) NOT NULL DEFAULT 0 CHECK (balance >= 0),
  locked_balance NUMERIC(19, 4) NOT NULL DEFAULT 0 CHECK (locked_balance >= 0),
  version INTEGER NOT NULL DEFAULT 1,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE merchant_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'CASHIER' CHECK (role IN ('OWNER', 'MANAGER', 'CASHIER')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(merchant_id, email)
);

CREATE TABLE merchant_deposit_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  bank_name VARCHAR(255) NOT NULL,
  account_number VARCHAR(100) NOT NULL,
  account_name VARCHAR(255) NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE deposits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL REFERENCES merchants(id),
  amount NUMERIC(19, 4) NOT NULL CHECK (amount > 0),
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED')),
  reference_code VARCHAR(100) UNIQUE NOT NULL,
  slip_url TEXT,
  verified_by UUID REFERENCES master_admins(id),
  verified_at TIMESTAMPTZ,
  notes TEXT,
  created_by UUID REFERENCES merchant_users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL REFERENCES merchants(id),
  type VARCHAR(10) NOT NULL CHECK (type IN ('CREDIT', 'DEBIT')),
  amount NUMERIC(19, 4) NOT NULL CHECK (amount > 0),
  balance_before NUMERIC(19, 4) NOT NULL,
  balance_after NUMERIC(19, 4) NOT NULL,
  reference_type VARCHAR(50),
  reference_id UUID,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID REFERENCES merchants(id),
  actor_id UUID NOT NULL,
  actor_type VARCHAR(50) NOT NULL,
  action VARCHAR(100) NOT NULL,
  metadata JSONB DEFAULT '{}',
  ip_address INET,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_merchants_status ON merchants(status);
CREATE INDEX idx_merchant_users_merchant_id ON merchant_users(merchant_id);
CREATE INDEX idx_deposits_merchant_id_status ON deposits(merchant_id, status);
CREATE INDEX idx_deposits_reference_code ON deposits(reference_code);
CREATE INDEX idx_transactions_merchant_id_created_at ON transactions(merchant_id, created_at);
CREATE INDEX idx_audit_logs_merchant_id_created_at ON audit_logs(merchant_id, created_at);
CREATE INDEX idx_audit_logs_actor_id ON audit_logs(actor_id);
