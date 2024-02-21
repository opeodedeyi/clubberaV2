-- this file is what was used in the psql shell to crete the database and tables
CREATE TABLE discussions (
    id SERIAL PRIMARY KEY,
    owner_id INTEGER NOT NULL REFERENCES users(id),
    entity_type VARCHAR(255),
    entity_id INTEGER,
    parent_id INTEGER,
    comment TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (parent_id) REFERENCES discussions(id) ON DELETE CASCADE
);