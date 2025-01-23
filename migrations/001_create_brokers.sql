-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create brokers table
CREATE TABLE IF NOT EXISTS brokers (
    id UUID PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    phone TEXT,
    company_name TEXT,
    license_number TEXT,
    status TEXT NOT NULL DEFAULT 'pending_verification',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_brokers_email ON brokers(email);
CREATE INDEX IF NOT EXISTS idx_brokers_status ON brokers(status);
CREATE INDEX IF NOT EXISTS idx_brokers_created_at ON brokers(created_at DESC);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at (only if it doesn't exist)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_trigger
        WHERE tgname = 'update_brokers_updated_at'
    ) THEN
        CREATE TRIGGER update_brokers_updated_at
            BEFORE UPDATE ON brokers
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
END
$$;

-- Create RLS policies (dropping existing ones first to avoid conflicts)
ALTER TABLE brokers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS brokers_select_own ON brokers;
DROP POLICY IF EXISTS brokers_update_own ON brokers;
DROP POLICY IF EXISTS brokers_service_role ON brokers;

-- Allow brokers to read their own profile
CREATE POLICY brokers_select_own ON brokers
    FOR SELECT
    USING (auth.uid() = id);

-- Allow brokers to update their own profile
CREATE POLICY brokers_update_own ON brokers
    FOR UPDATE
    USING (auth.uid() = id);

-- Allow service role to manage all broker records
CREATE POLICY brokers_service_role ON brokers
    FOR ALL
    USING (auth.role() = 'service_role');

-- Grant necessary permissions to authenticated users
GRANT SELECT, UPDATE ON brokers TO authenticated;

-- Grant all permissions to service role
GRANT ALL ON brokers TO service_role;
