-- this file is what was used in the psql shell to crete the database and tables
CREATE TABLE groups (
    id SERIAL PRIMARY KEY,
    unique_url VARCHAR(255) UNIQUE,
    owner_id INTEGER NOT NULL REFERENCES users(id),
    title VARCHAR(50) NOT NULL,
    tagline VARCHAR(150),
    description TEXT,
    is_private BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE group_members (
    id SERIAL PRIMARY KEY,
    group_id INTEGER NOT NULL REFERENCES groups(id),
    user_id INTEGER NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (group_id, user_id)
);

CREATE TABLE group_requests (
    id SERIAL PRIMARY KEY,
    group_id INTEGER NOT NULL REFERENCES groups(id),
    user_id INTEGER NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (group_id, user_id)
);

-- created
-- Not Done

CREATE TABLE group_banned_users (
id SERIAL PRIMARY KEY,
group_id INTEGER NOT NULL REFERENCES groups(id),
user_id INTEGER NOT NULL REFERENCES users(id),
created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP);