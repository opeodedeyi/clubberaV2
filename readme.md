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
    role VARCHAR(50) DEFAULT 'user'; -- e.g., "superuser", "staff", "user"
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
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_profile_images UNIQUE (entity_type, entity_id, image_type)
    WHERE (entity_type IN ('user', 'community'))
);
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
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Community members table
CREATE TABLE community_members (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    community_id INT REFERENCES communities(id) ON DELETE CASCADE,
    role VARCHAR(50) CHECK (role IN ('owner', 'organizer', 'moderator', 'member')) DEFAULT 'member',
    is_premium BOOLEAN DEFAULT false;
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
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(community_id, user_id, type) WHERE expires_at IS NULL OR expires_at > NOW()
);

-- Join requests for private communities
CREATE TABLE community_join_requests (
    id SERIAL PRIMARY KEY,
    community_id INT REFERENCES communities(id) ON DELETE CASCADE,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    message TEXT,
    status VARCHAR(50) CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
    responded_by INT REFERENCES users(id),
    responded_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(community_id, user_id, status) WHERE status = 'pending'
);

-- Indexes for better performance
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
```
