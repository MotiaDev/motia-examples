-- Supabase database schema for micro-actions like feed system

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Posts table
CREATE TABLE IF NOT EXISTS posts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT,
    author_id UUID NOT NULL,
    like_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Likes table
CREATE TABLE IF NOT EXISTS likes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    post_id TEXT NOT NULL, -- Using TEXT to match our API postId format
    user_id TEXT NOT NULL,
    liked_at TIMESTAMP WITH TIME ZONE NOT NULL,
    trace_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure one like per user per post
    UNIQUE(post_id, user_id)
);

-- Users table (for FCM tokens and notifications)
CREATE TABLE IF NOT EXISTS users (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id TEXT UNIQUE NOT NULL, -- External user ID
    fcm_token TEXT,
    notification_preferences JSONB DEFAULT '{"likes": true, "comments": true}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Real-time subscriptions table
CREATE TABLE IF NOT EXISTS realtime_subscriptions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id TEXT NOT NULL,
    post_id TEXT NOT NULL,
    subscription_type TEXT NOT NULL, -- 'websocket', 'push', 'email'
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_likes_post_id ON likes(post_id);
CREATE INDEX IF NOT EXISTS idx_likes_user_id ON likes(user_id);
CREATE INDEX IF NOT EXISTS idx_likes_created_at ON likes(created_at);
CREATE INDEX IF NOT EXISTS idx_users_user_id ON users(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_post ON realtime_subscriptions(user_id, post_id);

-- Function to increment like count
CREATE OR REPLACE FUNCTION increment_like_count(post_id TEXT)
RETURNS void AS $$
BEGIN
    -- This is a simplified version - in production you'd want to handle the posts table properly
    -- For now, we'll just log the increment
    RAISE NOTICE 'Incrementing like count for post: %', post_id;
END;
$$ LANGUAGE plpgsql;

-- Row Level Security (RLS) policies
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE realtime_subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS policies for likes table (secure but functional)
CREATE POLICY "Anyone can view likes" ON likes FOR SELECT USING (true);
CREATE POLICY "Anyone can insert likes" ON likes FOR INSERT WITH CHECK (true);
-- Note: In production, you'd want to restrict based on authenticated users

-- RLS policies for users table
CREATE POLICY "Users can view their own data" ON users FOR ALL USING (
  CASE 
    WHEN auth.uid() IS NULL THEN true  -- Allow anon access for demo
    ELSE auth.uid()::text = user_id 
  END
);

-- RLS policies for subscriptions
CREATE POLICY "Users can manage their subscriptions" ON realtime_subscriptions FOR ALL USING (
  CASE 
    WHEN auth.uid() IS NULL THEN true  -- Allow anon access for demo
    ELSE auth.uid()::text = user_id 
  END
);

-- Real-time subscriptions for Supabase
-- Enable real-time for likes table
ALTER PUBLICATION supabase_realtime ADD TABLE likes;

-- Trigger to update like count when likes are inserted
CREATE OR REPLACE FUNCTION update_like_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- In a real implementation, you'd update the posts table
        -- For now, we'll just log
        RAISE NOTICE 'Like added for post: %', NEW.post_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        RAISE NOTICE 'Like removed for post: %', OLD.post_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER likes_count_trigger
    AFTER INSERT OR DELETE ON likes
    FOR EACH ROW
    EXECUTE FUNCTION update_like_count();