-- Create database schema for subscription system

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'proprietario' CHECK (role IN ('proprietario', 'admin')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Properties table
CREATE TABLE IF NOT EXISTS properties (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    address TEXT NOT NULL,
    city VARCHAR(255) NOT NULL,
    state VARCHAR(2) NOT NULL,
    zip_code VARCHAR(10) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Plans table
CREATE TABLE IF NOT EXISTS plans (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    price_per_property DECIMAL(10,2) NOT NULL,
    items_included JSONB NOT NULL DEFAULT '[]',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    plan_id INTEGER REFERENCES plans(id) ON DELETE RESTRICT,
    status VARCHAR(50) NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'ativo', 'inativo', 'cancelado')),
    total_amount DECIMAL(10,2) NOT NULL,
    pagarme_subscription_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Junction table for subscriptions and properties
CREATE TABLE IF NOT EXISTS subscription_properties (
    subscription_id INTEGER REFERENCES subscriptions(id) ON DELETE CASCADE,
    property_id INTEGER REFERENCES properties(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (subscription_id, property_id)
);

-- Shipments table
CREATE TABLE IF NOT EXISTS shipments (
    id SERIAL PRIMARY KEY,
    subscription_id INTEGER REFERENCES subscriptions(id) ON DELETE CASCADE,
    property_id INTEGER REFERENCES properties(id) ON DELETE CASCADE,
    address TEXT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'em_transporte', 'entregue', 'cancelado')),
    tracking_code VARCHAR(255),
    shipping_service VARCHAR(100),
    shipped_at TIMESTAMP,
    delivered_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_properties_user_id ON properties(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_shipments_subscription_id ON shipments(subscription_id);
CREATE INDEX IF NOT EXISTS idx_shipments_status ON shipments(status);
CREATE INDEX IF NOT EXISTS idx_shipments_tracking_code ON shipments(tracking_code);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_properties_updated_at BEFORE UPDATE ON properties FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_plans_updated_at BEFORE UPDATE ON plans FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_shipments_updated_at BEFORE UPDATE ON shipments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

