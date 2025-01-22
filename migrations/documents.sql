-- Create documents table
CREATE TABLE IF NOT EXISTS documents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    broker_id UUID NOT NULL REFERENCES brokers(id) ON DELETE CASCADE,
    client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
    policy_id UUID REFERENCES policies(id) ON DELETE SET NULL,
    file_path TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_type TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    document_type TEXT NOT NULL,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_documents_broker_id ON documents(broker_id);
CREATE INDEX IF NOT EXISTS idx_documents_client_id ON documents(client_id);
CREATE INDEX IF NOT EXISTS idx_documents_policy_id ON documents(policy_id);
CREATE INDEX IF NOT EXISTS idx_documents_uploaded_at ON documents(uploaded_at DESC);

-- Add RLS policies
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Policy to allow brokers to see only their own documents
CREATE POLICY "Brokers can view their own documents"
    ON documents FOR SELECT
    TO authenticated
    USING (broker_id = auth.uid());

-- Policy to allow brokers to insert their own documents
CREATE POLICY "Brokers can insert their own documents"
    ON documents FOR INSERT
    TO authenticated
    WITH CHECK (broker_id = auth.uid());

-- Policy to allow brokers to update their own documents
CREATE POLICY "Brokers can update their own documents"
    ON documents FOR UPDATE
    TO authenticated
    USING (broker_id = auth.uid())
    WITH CHECK (broker_id = auth.uid());

-- Policy to allow brokers to delete their own documents
CREATE POLICY "Brokers can delete their own documents"
    ON documents FOR DELETE
    TO authenticated
    USING (broker_id = auth.uid());

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER documents_updated_at
    BEFORE UPDATE ON documents
    FOR EACH ROW
    EXECUTE FUNCTION update_documents_updated_at();
