DROP TABLE IF EXISTS invoice_items CASCADE;
DROP TABLE IF EXISTS invoices CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS companies CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- 1. Application user accounts.
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Hotels, customers, or suppliers for each user.
CREATE TABLE IF NOT EXISTS companies (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE, -- Link the company to its user.
    tax_id VARCHAR(50) NOT NULL,                        -- Tax registration number.
    name VARCHAR(255) NOT NULL,                        -- Company name.
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_user_tax_id UNIQUE (user_id, tax_id) -- Prevent duplicate companies per user.
);

-- 3. Canonical product names.
CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    clean_name VARCHAR(255) UNIQUE NOT NULL, -- Normalized product name.
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Invoices.
CREATE TABLE IF NOT EXISTS invoices (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,     -- Link the invoice to its owner.
    uuid VARCHAR(100) UNIQUE NOT NULL,                      -- Unified electronic number.
    internal_id VARCHAR(50),                                 -- Human-searchable internal number.
    issuer_id INT REFERENCES companies(id) ON DELETE CASCADE,   -- Seller or supplier.
    receiver_id INT REFERENCES companies(id) ON DELETE CASCADE, -- Buyer or hotel.
    invoice_date TIMESTAMP NOT NULL,                         -- Invoice issue date.
    total_amount DECIMAL(15, 2) NOT NULL,                    -- Invoice total.
    pdf_path VARCHAR(500),                                   -- PDF path on the server.
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP DEFAULT NULL                         -- NULL means the invoice is active.
);

-- 5. Detailed invoice items linked to each invoice.
CREATE TABLE IF NOT EXISTS invoice_items (
    id SERIAL PRIMARY KEY,
    invoice_id INT REFERENCES invoices(id) ON DELETE CASCADE,
    product_id INT REFERENCES products(id) ON DELETE RESTRICT,
    quantity DECIMAL(12, 3) NOT NULL,        -- Quantity or kilograms.
    unit_type VARCHAR(20) DEFAULT 'KGM',      -- Unit of measure.
    unit_price DECIMAL(12, 2) NOT NULL,       -- Unit price for this item.
    total_price DECIMAL(15, 2) NOT NULL       -- Quantity multiplied by unit price.
);
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id SERIAL PRIMARY KEY,                                       -- Token identifier.
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE, -- Token owner.
  token VARCHAR(500) NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE users ADD COLUMN tax_id VARCHAR(50);
