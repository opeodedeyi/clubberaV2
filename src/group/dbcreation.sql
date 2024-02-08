-- this file is what was used in the psql shell to crete the database and tables
CREATE TABLE groups (
    id SERIAL PRIMARY KEY,
    unique_url VARCHAR(255) UNIQUE,
    owner_id INTEGER NOT NULL REFERENCES users(id),
    title VARCHAR(50) NOT NULL,
    tagline VARCHAR(150),
    description TEXT,
    banner_provider VARCHAR(255),
    banner_key VARCHAR(255),
    banner_location TEXT,
    city VARCHAR(255),
    latitude NUMERIC,
    longitude NUMERIC,
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

-- Not Done

CREATE TABLE group_topics (
id SERIAL PRIMARY KEY,
group_id INTEGER NOT NULL REFERENCES groups(id),
topic VARCHAR(255) NOT NULL,
created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
UNIQUE (group_id, topic));

CREATE TABLE group_banned_users (
id SERIAL PRIMARY KEY,
group_id INTEGER NOT NULL REFERENCES groups(id),
user_id INTEGER NOT NULL REFERENCES users(id),
created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP);