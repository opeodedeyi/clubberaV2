# Database Schema

## Tables

### Users

```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    unique_url VARCHAR(255) UNIQUE,
    bio TEXT,
    gender VARCHAR(50),
    birthday DATE,
    preferences JSONB DEFAULT '{}'::jsonb,
    is_email_confirmed BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    role VARCHAR(50) DEFAULT 'user', -- e.g., "superuser", "staff", "user"
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_preferences ON users USING gin (preferences);
```

### User Tokens

```sql
CREATE TABLE user_tokens (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token TEXT NOT NULL,
    purpose VARCHAR(50) NOT NULL CHECK (purpose IN (
        'email_confirmation',
        'password_reset',
        'api_access',
        'google_auth',
        'passwordless_login',
        'email_verification_code'
    )),
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_user_tokens_token ON user_tokens(token);
CREATE INDEX idx_user_tokens_user_id ON user_tokens(user_id);
```

### Locations

```sql
CREATE TABLE locations (
    id SERIAL PRIMARY KEY,
    entity_type VARCHAR(50) NOT NULL,
    entity_id INTEGER NOT NULL,
    name VARCHAR(255),
    location_type VARCHAR(50) NOT NULL,
    lat NUMERIC(9,6),
    lng NUMERIC(9,6),
    address TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_locations_entity ON locations(entity_type, entity_id);
```

### Images

```sql
CREATE TABLE images (
    id SERIAL PRIMARY KEY,
    entity_type VARCHAR(50) NOT NULL,
    entity_id INTEGER NOT NULL,
    image_type VARCHAR(50) NOT NULL,
    position INTEGER DEFAULT 0,
    provider VARCHAR(255) NOT NULL,
    key VARCHAR(255) NOT NULL,
    alt_text VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Create the partial unique index separately
CREATE UNIQUE INDEX unique_profile_images
ON images (entity_type, entity_id, image_type)
WHERE entity_type IN ('user', 'community');
```

### Tags

```sql
CREATE TABLE tags (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL, -- e.g., "React", "Cooking"
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE tag_assignments (
    id SERIAL PRIMARY KEY,
    tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    entity_type VARCHAR(50) NOT NULL, -- 'user', 'community', 'event'
    entity_id INTEGER NOT NULL,
    assignment_type VARCHAR(50) NOT NULL, -- 'interest', 'skill', 'category'
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (tag_id, entity_type, entity_id, assignment_type)
);
```

```sql
-- Communities table
CREATE TABLE communities (
    id SERIAL PRIMARY KEY,
    unique_url VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(50) NOT NULL,
    tagline VARCHAR(150),
    description TEXT,
    guidelines TEXT,
    is_private BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_by INT REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    search_document tsvector
);

-- Community members table
CREATE TABLE community_members (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    community_id INT REFERENCES communities(id) ON DELETE CASCADE,
    role VARCHAR(50) CHECK (role IN ('owner', 'organizer', 'moderator', 'member')) DEFAULT 'member',
    is_premium BOOLEAN DEFAULT false,
    joined_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, community_id)
);

-- Community restrictions table (for mutes and bans)
CREATE TABLE community_restrictions (
    id SERIAL PRIMARY KEY,
    community_id INT REFERENCES communities(id) ON DELETE CASCADE,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) CHECK (type IN ('mute', 'ban')) NOT NULL,
    reason TEXT,
    applied_by INT REFERENCES users(id),
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Create the partial unique index separately
CREATE UNIQUE INDEX idx_community_restrictions_active_unique
ON community_restrictions (community_id, user_id, type)
WHERE expires_at IS NULL;

-- Join requests for private communities
CREATE TABLE community_join_requests (
    id SERIAL PRIMARY KEY,
    community_id INT REFERENCES communities(id) ON DELETE CASCADE,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    message TEXT,
    status VARCHAR(50) CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
    responded_by INT REFERENCES users(id),
    responded_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Then create the partial unique index separately
CREATE UNIQUE INDEX idx_unique_pending_join_requests
ON community_join_requests(community_id, user_id)
WHERE status = 'pending';

-- Indexes for better performance {may be an error as it says index already exist}
CREATE INDEX idx_community_members_community_id ON community_members(community_id);
CREATE INDEX idx_community_members_user_id ON community_members(user_id);
CREATE INDEX idx_communities_created_by ON communities(created_by);
CREATE INDEX idx_communities_is_active ON communities(is_active);


-- Subscription plans table
CREATE TABLE subscription_plans (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(50) NOT NULL UNIQUE, -- 'free', 'pro_monthly', 'pro_yearly', etc.
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    billing_interval VARCHAR(20) NOT NULL, -- 'monthly', 'yearly', 'one_time'
    features JSONB DEFAULT '{}'::jsonb, -- Store features as JSON
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Price history for subscription plans
CREATE TABLE subscription_price_history (
    id SERIAL PRIMARY KEY,
    plan_id INT REFERENCES subscription_plans(id),
    price DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    effective_from TIMESTAMPTZ NOT NULL,
    effective_to TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Updated community subscriptions table
CREATE TABLE community_subscriptions (
    id SERIAL PRIMARY KEY,
    community_id INT REFERENCES communities(id) ON DELETE CASCADE,
    plan_id INT REFERENCES subscription_plans(id),
    status VARCHAR(50) NOT NULL CHECK (status IN ('active', 'past_due', 'canceled', 'expired')),
    starts_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    current_period_start TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    current_period_end TIMESTAMPTZ,
    canceled_at TIMESTAMPTZ,
    cancel_at_period_end BOOLEAN DEFAULT false,
    provider VARCHAR(50), -- 'stripe', 'paypal', etc.
    provider_subscription_id VARCHAR(255),
    created_by INT REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(community_id)
);

-- Subscription payment history
CREATE TABLE subscription_payments (
    id SERIAL PRIMARY KEY,
    subscription_id INT REFERENCES community_subscriptions(id),
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    payment_method VARCHAR(50), -- 'credit_card', 'paypal', etc.
    payment_provider VARCHAR(50), -- 'stripe', 'paypal', etc.
    provider_transaction_id VARCHAR(255),
    status VARCHAR(50) NOT NULL, -- 'succeeded', 'failed', 'pending', etc.
    billing_period_start TIMESTAMPTZ,
    billing_period_end TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Add initial subscription plans
INSERT INTO subscription_plans (name, code, description, price, billing_interval, features)
VALUES
('Free Plan', 'free', 'Basic community features', 0.00, 'monthly',
    '{"pro_features": false, "emails": 0}'::jsonb),
('Pro Monthly', 'pro_monthly', 'Advanced community features with monthly billing', 9.99, 'monthly',
    '{"pro_features": true, "emails": 1000}'::jsonb),
('Pro Yearly', 'pro_yearly', 'Advanced community features with yearly billing', 99.99, 'yearly',
    '{"pro_features": true, "emails": 1000}'::jsonb);

-- Initialize price history
INSERT INTO subscription_price_history (plan_id, price, currency, effective_from)
VALUES
(1, 0.00, 'USD', CURRENT_TIMESTAMP),
(2, 9.99, 'USD', CURRENT_TIMESTAMP),
(3, 99.99, 'USD', CURRENT_TIMESTAMP);

-- Create indexes for better performance
CREATE INDEX idx_community_subscriptions_plan_id ON community_subscriptions(plan_id);
CREATE INDEX idx_subscription_payments_subscription_id ON subscription_payments(subscription_id);
CREATE INDEX idx_subscription_price_history_plan_id ON subscription_price_history(plan_id);


-- Add tables for ownership transfer and audit logs
-- Track ownership transfer requests
CREATE TABLE community_ownership_transfers (
    id SERIAL PRIMARY KEY,
    community_id INTEGER NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
    current_owner_id INTEGER NOT NULL REFERENCES users(id),
    target_user_id INTEGER NOT NULL REFERENCES users(id),
    status VARCHAR(50) NOT NULL CHECK (status IN ('pending', 'accepted', 'rejected', 'canceled', 'expired')),
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Then create the partial unique index separately
CREATE UNIQUE INDEX idx_unique_pending_transfer
ON community_ownership_transfers(community_id)
WHERE status = 'pending';

CREATE INDEX idx_ownership_transfers_community ON community_ownership_transfers(community_id);
CREATE INDEX idx_ownership_transfers_status ON community_ownership_transfers(status);

-- Track administrative actions for audit purposes
CREATE TABLE community_audit_logs (
    id SERIAL PRIMARY KEY,
    community_id INTEGER NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id),
    action_type VARCHAR(50) NOT NULL,
    previous_state JSONB,
    new_state JSONB,
    ip_address VARCHAR(50),
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_logs_community ON community_audit_logs(community_id);
CREATE INDEX idx_audit_logs_action_type ON community_audit_logs(action_type);



-- Community Support Plans table
CREATE TABLE community_support_plans (
    id SERIAL PRIMARY KEY,
    community_id INTEGER NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    monthly_price DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    is_active BOOLEAN DEFAULT true,
    benefits TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(community_id) -- Ensures one plan per community
);

-- User Community Support table (tracks active supports)
CREATE TABLE user_community_supports (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    community_id INTEGER NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
    plan_id INTEGER NOT NULL REFERENCES community_support_plans(id),
    status VARCHAR(50) NOT NULL CHECK (status IN ('active', 'past_due', 'canceled', 'expired')),
    starts_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    current_period_start TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    current_period_end TIMESTAMPTZ NOT NULL,
    canceled_at TIMESTAMPTZ,
    cancel_at_period_end BOOLEAN DEFAULT false,
    provider VARCHAR(50), -- 'stripe', 'paypal', etc.
    provider_subscription_id VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, community_id) -- One active support per user per community
);

-- Community Support Payments table
CREATE TABLE community_support_payments (
    id SERIAL PRIMARY KEY,
    support_id INTEGER NOT NULL REFERENCES user_community_supports(id) ON DELETE CASCADE,
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    payment_method VARCHAR(50), -- 'credit_card', 'paypal', etc.
    payment_provider VARCHAR(50), -- 'stripe', 'paypal', etc.
    provider_transaction_id VARCHAR(255),
    status VARCHAR(50) NOT NULL, -- 'succeeded', 'failed', 'pending', etc.
    billing_period_start TIMESTAMPTZ,
    billing_period_end TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for better performance
CREATE INDEX idx_community_support_plans_community_id ON community_support_plans(community_id);
CREATE INDEX idx_user_community_supports_user_id ON user_community_supports(user_id);
CREATE INDEX idx_user_community_supports_community_id ON user_community_supports(community_id);
CREATE INDEX idx_community_support_payments_support_id ON community_support_payments(support_id);


-- Posts table (base content type)
CREATE TABLE posts (
    id SERIAL PRIMARY KEY,
    community_id INTEGER NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT,
    is_supporters_only BOOLEAN DEFAULT false,
    is_hidden BOOLEAN DEFAULT false,
    content_type VARCHAR(50) NOT NULL CHECK (content_type IN ('post', 'event', 'poll')),
    parent_id INTEGER REFERENCES posts(id) ON DELETE CASCADE, -- For replies
    poll_data JSONB DEFAULT NULL, -- For polls
    is_edited BOOLEAN DEFAULT false,
    edited_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    search_document tsvector
);

-- Post reactions (likes)
CREATE TABLE post_reactions (
    id SERIAL PRIMARY KEY,
    post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reaction_type VARCHAR(50) NOT NULL DEFAULT 'like' CHECK (reaction_type IN ('like')),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(post_id, user_id, reaction_type)
);

-- Indexes
CREATE INDEX idx_posts_community_id ON posts(community_id);
CREATE INDEX idx_posts_user_id ON posts(user_id);
CREATE INDEX idx_posts_parent_id ON posts(parent_id);
CREATE INDEX idx_posts_content_type ON posts(content_type);
CREATE INDEX idx_posts_search ON posts USING GIN (search_document);
CREATE INDEX idx_post_reactions_post_id ON post_reactions(post_id);
CREATE INDEX idx_post_reactions_user_id ON post_reactions(user_id);

-- Create a function to update the search document
CREATE OR REPLACE FUNCTION update_post_search_document() RETURNS TRIGGER AS $$
BEGIN
    -- Update the search document to include content
    NEW.search_document := to_tsvector('english', COALESCE(NEW.content, ''));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to automatically update the search document
CREATE TRIGGER trigger_update_post_search_document
BEFORE INSERT OR UPDATE ON posts
FOR EACH ROW EXECUTE FUNCTION update_post_search_document();


-- Events table (extends posts for event-specific data)
CREATE TABLE events (
    id SERIAL PRIMARY KEY,
    post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    unique_url VARCHAR(255) NOT NULL UNIQUE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    event_type VARCHAR(50) NOT NULL DEFAULT 'physical' CHECK (event_type IN ('physical', 'online')),
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ,
    timezone VARCHAR(50) DEFAULT 'UTC',
    location_details TEXT, -- For meeting instructions and details
    max_attendees INTEGER,
    current_attendees INTEGER DEFAULT 0, -- Maintained by model code
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(post_id)
);

-- Event attendees
CREATE TABLE event_attendees (
    id SERIAL PRIMARY KEY,
    event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL CHECK (status IN ('attending', 'not_attending', 'maybe', 'waitlisted')),
    attended BOOLEAN DEFAULT NULL, -- Tracks if user actually attended the event
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(event_id, user_id)
);

CREATE INDEX idx_events_post_id ON events(post_id);
CREATE INDEX idx_events_start_time ON events(start_time);
CREATE INDEX idx_events_timezone ON events(timezone);
CREATE INDEX idx_events_unique_url ON events(unique_url);
CREATE INDEX idx_event_attendees_event_id ON event_attendees(event_id);
CREATE INDEX idx_event_attendees_user_id ON event_attendees(user_id);
CREATE INDEX idx_event_attendees_status ON event_attendees(status);

CREATE INDEX idx_tag_assignments_events ON tag_assignments(entity_type, entity_id) WHERE entity_type = 'event';


------- search indexes for community
-- Create indexes for search performance
CREATE INDEX idx_communities_search ON communities USING GIN (search_document);

-- Create a function to update the search document
CREATE OR REPLACE FUNCTION update_community_search_document() RETURNS TRIGGER AS $$
DECLARE
    location_text TEXT;
    tag_names TEXT;
BEGIN
    -- Get location data
    SELECT COALESCE(l.name, '') || ' ' || COALESCE(l.address, '')
    INTO location_text
    FROM locations l
    WHERE l.entity_type = 'community' AND l.entity_id = NEW.id
    LIMIT 1;

    -- Get tag names
    SELECT string_agg(t.name, ' ')
    INTO tag_names
    FROM tags t
    JOIN tag_assignments ta ON t.id = ta.tag_id
    WHERE ta.entity_type = 'community' AND ta.entity_id = NEW.id;

    -- Update the search document to include name, tagline, description, location, and tags
    NEW.search_document :=
        setweight(to_tsvector('english', COALESCE(NEW.name, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(NEW.tagline, '')), 'B') ||
        setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'C') ||
        setweight(to_tsvector('english', COALESCE(location_text, '')), 'C') ||
        setweight(to_tsvector('english', COALESCE(tag_names, '')), 'B');

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to automatically update the search document
CREATE TRIGGER trigger_update_community_search_document
BEFORE INSERT OR UPDATE ON communities
FOR EACH ROW EXECUTE FUNCTION update_community_search_document();

-- Create a function to update search document when tags change
CREATE OR REPLACE FUNCTION update_community_search_document_on_tag_change() RETURNS TRIGGER AS $$
BEGIN
    -- If a tag was added or removed, update the community's search document
    IF TG_OP = 'INSERT' OR TG_OP = 'DELETE' THEN
        UPDATE communities
        SET updated_at = CURRENT_TIMESTAMP
        WHERE id =
            CASE
                WHEN TG_OP = 'INSERT' THEN NEW.entity_id
                WHEN TG_OP = 'DELETE' THEN OLD.entity_id
            END
        AND NEW.entity_type = 'community' OR OLD.entity_type = 'community';
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for tag changes
CREATE TRIGGER trigger_update_community_search_on_tag_change
AFTER INSERT OR DELETE ON tag_assignments
FOR EACH ROW EXECUTE FUNCTION update_community_search_document_on_tag_change();

-- Create a function to update search document when location changes
CREATE OR REPLACE FUNCTION update_community_search_document_on_location_change() RETURNS TRIGGER AS $$
BEGIN
    -- If location was added, updated, or removed, update the community's search document
    IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE' OR TG_OP = 'DELETE') AND
       (NEW.entity_type = 'community' OR OLD.entity_type = 'community') THEN
        UPDATE communities
        SET updated_at = CURRENT_TIMESTAMP
        WHERE id =
            CASE
                WHEN TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN NEW.entity_id
                WHEN TG_OP = 'DELETE' THEN OLD.entity_id
            END;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for location changes
CREATE TRIGGER trigger_update_community_search_on_location_change
AFTER INSERT OR UPDATE OR DELETE ON locations
FOR EACH ROW EXECUTE FUNCTION update_community_search_document_on_location_change();


-- ========================================================================
-- PROXIMITY SEARCH ENHANCEMENTS (PostGIS)
-- ========================================================================
-- The following additions enable geographic proximity search functionality
-- while maintaining all existing functionality. No breaking changes.

-- 1. Enable PostGIS extension for advanced geographic functions
CREATE EXTENSION IF NOT EXISTS postgis;

-- 2. Add geometry column to locations table for efficient spatial queries
ALTER TABLE locations ADD COLUMN geom geometry(POINT, 4326);

-- 3. Create spatial index for fast proximity searches
CREATE INDEX CONCURRENTLY idx_locations_geom ON locations USING GIST (geom);

-- 4. Create trigger function to auto-populate geom column from lat/lng
CREATE OR REPLACE FUNCTION update_location_geom() RETURNS TRIGGER AS $$
BEGIN
    -- Auto-populate geom field when lat/lng are provided
    IF NEW.lat IS NOT NULL AND NEW.lng IS NOT NULL THEN
        NEW.geom := ST_SetSRID(ST_MakePoint(NEW.lng, NEW.lat), 4326);
    ELSE
        NEW.geom := NULL;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Create trigger to automatically maintain geom column
CREATE TRIGGER trigger_update_location_geom
    BEFORE INSERT OR UPDATE ON locations
    FOR EACH ROW EXECUTE FUNCTION update_location_geom();

-- 6. Populate geom column for existing location data (one-time migration)
UPDATE locations
SET geom = ST_SetSRID(ST_MakePoint(lng, lat), 4326)
WHERE lat IS NOT NULL AND lng IS NOT NULL AND geom IS NULL;

-- ========================================================================
-- NOTES:
-- - All existing location creation/update code continues to work unchanged
-- - The geom column is automatically populated via database trigger
-- - No breaking changes to existing API functionality
-- - Enables new proximity search capabilities: "find communities near me"
-- ========================================================================

-- ========================================================================
-- PAID EVENTS PROVISIONS (Future Implementation)
-- ========================================================================
-- The following additions prepare the database for paid events functionality
-- while maintaining all existing free event functionality.

-- 1. Add pricing columns to events table
ALTER TABLE events ADD COLUMN is_paid BOOLEAN DEFAULT false;
ALTER TABLE events ADD COLUMN price DECIMAL(10,2) DEFAULT 0.00;
ALTER TABLE events ADD COLUMN currency VARCHAR(3) DEFAULT 'USD';

-- 2. Add payment tracking to event attendees
ALTER TABLE event_attendees ADD COLUMN payment_status VARCHAR(50) DEFAULT 'free'
    CHECK (payment_status IN ('free', 'pending', 'completed', 'failed', 'refunded', 'waived'));
ALTER TABLE event_attendees ADD COLUMN payment_amount DECIMAL(10,2) DEFAULT 0.00;
ALTER TABLE event_attendees ADD COLUMN payment_date TIMESTAMPTZ;

-- 3. Event payments table (similar to community_support_payments)
CREATE TABLE event_payments (
    id SERIAL PRIMARY KEY,
    event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    attendee_record_id INTEGER REFERENCES event_attendees(id),
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    payment_method VARCHAR(50), -- 'credit_card', 'paypal', etc.
    payment_provider VARCHAR(50), -- 'stripe', 'paypal', etc.
    provider_transaction_id VARCHAR(255),
    status VARCHAR(50) NOT NULL CHECK (status IN ('succeeded', 'failed', 'pending', 'refunded')),
    refund_amount DECIMAL(10,2) DEFAULT 0.00,
    refund_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 4. Revenue sharing configuration (optional)
CREATE TABLE event_revenue_sharing (
    id SERIAL PRIMARY KEY,
    community_id INTEGER NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
    platform_fee_percentage DECIMAL(5,2) DEFAULT 2.50, -- Platform takes 2.5%
    processing_fee_percentage DECIMAL(5,2) DEFAULT 2.90, -- Stripe processing fee
    community_percentage DECIMAL(5,2) DEFAULT 94.60, -- Community gets the rest (100 - 2.5 - 2.9)
    minimum_payout DECIMAL(10,2) DEFAULT 20.00,
    payout_schedule VARCHAR(20) DEFAULT 'weekly' CHECK (payout_schedule IN ('daily', 'weekly', 'monthly')),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(community_id)
);

-- 5. Community payouts tracking
CREATE TABLE community_event_payouts (
    id SERIAL PRIMARY KEY,
    community_id INTEGER NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
    payout_period_start TIMESTAMPTZ NOT NULL,
    payout_period_end TIMESTAMPTZ NOT NULL,
    total_revenue DECIMAL(10,2) NOT NULL,
    platform_fees DECIMAL(10,2) NOT NULL,
    processing_fees DECIMAL(10,2) NOT NULL,
    payout_amount DECIMAL(10,2) NOT NULL,
    status VARCHAR(50) NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    provider VARCHAR(50), -- 'stripe', 'paypal', etc.
    provider_payout_id VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 6. Indexes for performance
CREATE INDEX idx_events_is_paid ON events(is_paid);
CREATE INDEX idx_events_price ON events(price);
CREATE INDEX idx_event_attendees_payment_status ON event_attendees(payment_status);
CREATE INDEX idx_event_payments_event_id ON event_payments(event_id);
CREATE INDEX idx_event_payments_user_id ON event_payments(user_id);
CREATE INDEX idx_event_payments_status ON event_payments(status);
CREATE INDEX idx_community_event_payouts_community_id ON community_event_payouts(community_id);
CREATE INDEX idx_community_event_payouts_status ON community_event_payouts(status);

-- ========================================================================
-- PAID EVENTS NOTES:
-- - All existing free event functionality remains unchanged
-- - is_paid defaults to false, so all current events remain free
-- - payment_status defaults to 'free' for existing attendees
-- - Revenue sharing table allows per-community fee configuration
-- - Payout system tracks earnings and transfers to communities
-- - Can be implemented incrementally without breaking changes
-- ========================================================================
```
