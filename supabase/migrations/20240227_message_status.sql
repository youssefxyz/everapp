-- Check if table exists and create if it doesn't
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'message_status') THEN
        CREATE TABLE message_status (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
            user_id UUID NOT NULL REFERENCES profiles(id),
            conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
            is_read BOOLEAN DEFAULT false,
            read_at TIMESTAMP WITH TIME ZONE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            UNIQUE(message_id, user_id)
        );

        -- Create indexes only if table is new
        CREATE INDEX idx_message_status_message_id ON message_status(message_id);
        CREATE INDEX idx_message_status_conversation_user ON message_status(conversation_id, user_id);
    END IF;
END $$;

-- Safely create or replace the trigger function
CREATE OR REPLACE FUNCTION update_message_status_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS message_status_updated_at ON message_status;
CREATE TRIGGER message_status_updated_at
    BEFORE UPDATE ON message_status
    FOR EACH ROW
    EXECUTE FUNCTION update_message_status_updated_at();