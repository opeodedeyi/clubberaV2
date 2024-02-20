-- this file is what was used in the psql shell to crete the database and tables
CREATE TABLE meetings (
    id SERIAL PRIMARY KEY,
    group_id INTEGER NOT NULL REFERENCES groups(id),
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    date_of_meeting DATE NOT NULL,
    time_of_meeting TIME WITHOUT TIME ZONE NOT NULL,
    capacity INTEGER NOT NULL,
    banner_id INTEGER REFERENCES banners(id),
    location_id INTEGER REFERENCES locations(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE meeting_attendees (
    id SERIAL PRIMARY KEY,
    meeting_id INTEGER NOT NULL REFERENCES meetings(id),
    user_id INTEGER NOT NULL REFERENCES users(id),
    attended BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (meeting_id, user_id)
);

CREATE TABLE meeting_waitlist (
    id SERIAL PRIMARY KEY,
    meeting_id INTEGER NOT NULL REFERENCES meetings(id),
    user_id INTEGER NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (meeting_id, user_id)
);

