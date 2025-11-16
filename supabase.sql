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

