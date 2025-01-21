-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum types
CREATE TYPE user_status AS ENUM ('pending_verification', 'active', 'suspended');
CREATE TYPE policy_status AS ENUM ('draft', 'active', 'expired', 'cancelled');
CREATE TYPE task_status AS ENUM ('pending', 'in_progress', 'completed', 'cancelled');
CREATE TYPE client_status AS ENUM ('active', 'inactive');

-- Create brokers table
CREATE TABLE IF NOT EXISTS brokers (
    id UUID PRIMARY KEY REFERENCES auth.users(id),
    email TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    phone TEXT,
    company_name TEXT,
    license_number TEXT,
    status user_status DEFAULT 'pending_verification',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create clients table
CREATE TABLE IF NOT EXISTS clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    broker_id UUID NOT NULL REFERENCES brokers(id),
    email TEXT NOT NULL,
    full_name TEXT NOT NULL,
    phone TEXT,
    address TEXT,
    date_of_birth DATE,
    status client_status DEFAULT 'active',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(broker_id, email)
);

-- Create policies table
CREATE TABLE IF NOT EXISTS policies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    broker_id UUID NOT NULL REFERENCES brokers(id),
    client_id UUID NOT NULL REFERENCES clients(id),
    policy_number TEXT NOT NULL UNIQUE,
    policy_type TEXT NOT NULL,
    provider TEXT NOT NULL,
    premium_amount DECIMAL(10,2) NOT NULL,
    start_date DATE NOT NULL,
    expiry_date DATE NOT NULL,
    status policy_status DEFAULT 'draft',
    coverage_details JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create tasks table
CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    broker_id UUID NOT NULL REFERENCES brokers(id),
    client_id UUID REFERENCES clients(id),
    policy_id UUID REFERENCES policies(id),
    title TEXT NOT NULL,
    description TEXT,
    due_date TIMESTAMPTZ,
    priority INTEGER DEFAULT 1,
    status task_status DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create activity_logs table
CREATE TABLE IF NOT EXISTS activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    broker_id UUID NOT NULL REFERENCES brokers(id),
    client_id UUID REFERENCES clients(id),
    policy_id UUID REFERENCES policies(id),
    type TEXT NOT NULL,
    description TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_clients_broker_id ON clients(broker_id);
CREATE INDEX IF NOT EXISTS idx_policies_broker_id ON policies(broker_id);
CREATE INDEX IF NOT EXISTS idx_policies_client_id ON policies(client_id);
CREATE INDEX IF NOT EXISTS idx_tasks_broker_id ON tasks(broker_id);
CREATE INDEX IF NOT EXISTS idx_tasks_client_id ON tasks(client_id);
CREATE INDEX IF NOT EXISTS idx_tasks_policy_id ON tasks(policy_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_broker_id ON activity_logs(broker_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at DESC);

-- Create function for dashboard stats
CREATE OR REPLACE FUNCTION get_broker_dashboard_stats(broker_id UUID)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    WITH client_stats AS (
        SELECT 
            COUNT(*) as total,
            COUNT(*) FILTER (WHERE status = 'active') as active
        FROM clients
        WHERE broker_id = $1
    ),
    policy_stats AS (
        SELECT 
            COUNT(*) as total,
            COUNT(*) FILTER (WHERE status = 'active') as active,
            COUNT(*) FILTER (WHERE status = 'active' AND expiry_date <= NOW() + INTERVAL '30 days') as expiring_soon
        FROM policies
        WHERE broker_id = $1
    ),
    task_stats AS (
        SELECT 
            COUNT(*) as total,
            COUNT(*) FILTER (WHERE status = 'pending') as pending,
            COUNT(*) FILTER (WHERE status = 'pending' AND due_date < NOW()) as overdue
        FROM tasks
        WHERE broker_id = $1
    ),
    recent_activity AS (
        SELECT json_agg(activity_logs.*) as logs
        FROM (
            SELECT id, type, description, created_at
            FROM activity_logs
            WHERE broker_id = $1
            ORDER BY created_at DESC
            LIMIT 5
        ) activity_logs
    )
    SELECT json_build_object(
        'clients', (SELECT json_build_object('total', total, 'active', active) FROM client_stats),
        'policies', (SELECT json_build_object('total', total, 'active', active, 'expiring_soon', expiring_soon) FROM policy_stats),
        'tasks', (SELECT json_build_object('total', total, 'pending', pending, 'overdue', overdue) FROM task_stats),
        'recent_activity', COALESCE((SELECT logs FROM recent_activity), '[]'::json)
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable Row Level Security
ALTER TABLE brokers ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Brokers can only access their own profile
CREATE POLICY brokers_policy ON brokers
    FOR ALL USING (auth.uid() = id);

-- Brokers can only access their own clients
CREATE POLICY clients_policy ON clients
    FOR ALL USING (auth.uid() = broker_id);

-- Brokers can only access their own policies
CREATE POLICY policies_policy ON policies
    FOR ALL USING (auth.uid() = broker_id);

-- Brokers can only access their own tasks
CREATE POLICY tasks_policy ON tasks
    FOR ALL USING (auth.uid() = broker_id);

-- Brokers can only access their own activity logs
CREATE POLICY activity_logs_policy ON activity_logs
    FOR ALL USING (auth.uid() = broker_id);

-- Create triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_brokers_updated_at
    BEFORE UPDATE ON brokers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_clients_updated_at
    BEFORE UPDATE ON clients
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_policies_updated_at
    BEFORE UPDATE ON policies
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_tasks_updated_at
    BEFORE UPDATE ON tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();
