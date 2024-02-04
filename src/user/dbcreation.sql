-- this file is what was used in the psql shell to crete the database and tables
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    unique_url VARCHAR(255) UNIQUE,
    bio TEXT,
    password VARCHAR(255) NOT NULL,
    gender VARCHAR(50),
    city VARCHAR(255),
    latitude NUMERIC,
    longitude NUMERIC,
    photo_provider VARCHAR(50),
    photo_key VARCHAR(255),
    photo_location TEXT,
    birthday DATE,
    is_email_confirmed BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    email_confirm_token VARCHAR(255),
    password_reset_token VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);