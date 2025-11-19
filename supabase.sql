CREATE TABLE IF NOT EXISTS user_profiles (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    wa_id TEXT NOT NULL UNIQUE,  -- The user's WhatsApp ID
    
    -- For Dashboard Metrics
    -- 'onboarding_started', 'waitlist_completed', 'deleted'
    status TEXT NOT NULL DEFAULT 'onboarding_started',
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ, -- Set when status becomes 'waitlist_completed'
    deleted_at TIMESTAMPTZ,   -- Set when status becomes 'deleted'
    
    -- For Notification System
    last_notified_at TIMESTAMPTZ, -- Tracks the last weekly drip
    
    -- The actual profile data
    profile_data JSONB DEFAULT '{}'
);

-- Create an index for fast lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_wa_id ON user_profiles(wa_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_status ON user_profiles(status);



CREATE TABLE IF NOT EXISTS suggestions (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    user_wa_id TEXT, -- Not unique, a user can have many ideas
    suggestion_text TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    FOREIGN KEY (user_wa_id) REFERENCES user_profiles(wa_id)
);

// AI persona database script 
-- Update existing user_profiles to support new JSONB structure better
COMMENT ON COLUMN user_profiles.profile_data IS 'Stores: age, city, job, denomination, kids, interests, photo_id';

-- Create the Matches/Connections table
CREATE TABLE IF NOT EXISTS connections (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    user_a_id TEXT NOT NULL, -- Initiator (WhatsApp ID)
    user_b_id TEXT NOT NULL, -- Receiver (WhatsApp ID)
    status TEXT DEFAULT 'pending', -- pending, accepted, rejected, bridge_open
    match_score FLOAT, -- e.g., 0.89
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create an index for fast match lookups
CREATE INDEX IF NOT EXISTS idx_connections_users ON connections(user_a_id, user_b_id);


-- Stores the active conversation state and history
CREATE TABLE IF NOT EXISTS chat_sessions (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    wa_id TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    session_data JSONB DEFAULT '{}'
);

-- Create an index for fast lookups
CREATE INDEX IF NOT EXISTS idx_chat_sessions_wa_id ON chat_sessions(wa_id);

