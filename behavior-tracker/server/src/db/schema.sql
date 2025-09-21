-- HIPAA-Compliant Behavior Tracking Database Schema
-- Enable RLS and UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Organizations table
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Users table (no PHI)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    display_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('staff', 'supervisor')),
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT users_org_email_unique UNIQUE (org_id, email)
);

-- Clients table (de-identified)
CREATE TABLE clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    client_code VARCHAR(50) NOT NULL,
    display_name VARCHAR(100) NOT NULL, -- Only initials, no full names
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT clients_org_code_unique UNIQUE (org_id, client_code)
);

-- Behaviors table
CREATE TABLE behaviors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Behavior logs table
CREATE TABLE behavior_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    staff_id UUID NOT NULL REFERENCES users(id),
    behavior_id UUID NOT NULL REFERENCES behaviors(id),
    intensity SMALLINT NOT NULL CHECK (intensity >= 1 AND intensity <= 5),
    duration_min INTEGER,
    antecedent TEXT,
    behavior_observed TEXT,
    consequence TEXT,
    notes TEXT,
    incident BOOLEAN DEFAULT false,
    logged_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Audit log table (HIPAA compliance)
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    actor_id UUID NOT NULL REFERENCES users(id),
    action VARCHAR(50) NOT NULL,
    entity_type VARCHAR(100),
    entity_id UUID,
    ip_address INET,
    user_agent TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_users_org_id ON users(org_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_clients_org_id ON clients(org_id);
CREATE INDEX idx_behaviors_org_id ON behaviors(org_id);
CREATE INDEX idx_behavior_logs_org_id ON behavior_logs(org_id);
CREATE INDEX idx_behavior_logs_client_id ON behavior_logs(client_id);
CREATE INDEX idx_behavior_logs_staff_id ON behavior_logs(staff_id);
CREATE INDEX idx_behavior_logs_logged_at ON behavior_logs(logged_at);
CREATE INDEX idx_audit_logs_org_id ON audit_logs(org_id);
CREATE INDEX idx_audit_logs_actor_id ON audit_logs(actor_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);

-- Enable Row Level Security
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE behaviors ENABLE ROW LEVEL SECURITY;
ALTER TABLE behavior_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can only access data from their organization
CREATE POLICY org_isolation_policy ON users
    FOR ALL
    USING (org_id = current_setting('app.current_org_id')::UUID);

CREATE POLICY org_isolation_policy ON clients
    FOR ALL
    USING (org_id = current_setting('app.current_org_id')::UUID);

CREATE POLICY org_isolation_policy ON behaviors
    FOR ALL
    USING (org_id = current_setting('app.current_org_id')::UUID);

CREATE POLICY org_isolation_policy ON behavior_logs
    FOR ALL
    USING (org_id = current_setting('app.current_org_id')::UUID);

CREATE POLICY org_isolation_policy ON audit_logs
    FOR ALL
    USING (org_id = current_setting('app.current_org_id')::UUID);

-- Supervisors can access all org data, staff only their own entries
CREATE POLICY supervisor_access_policy ON behavior_logs
    FOR SELECT
    USING (
        current_setting('app.current_role') = 'supervisor'
        OR staff_id = current_setting('app.current_user_id')::UUID
    );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON clients
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_behaviors_updated_at BEFORE UPDATE ON behaviors
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();