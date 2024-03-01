-- this file is what was used in the psql shell to crete the database and tables
CREATE TABLE meetings (
    id SERIAL PRIMARY KEY,
    unique_url VARCHAR(255) UNIQUE;
    group_id INTEGER NOT NULL REFERENCES groups(id),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    date_of_meeting DATE,
    time_of_meeting TIMESTAMP WITH TIME ZONE,
    duration INTERVAL,
    capacity INTEGER CHECK (capacity >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
