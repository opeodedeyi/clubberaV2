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
        'passwordless_login'
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