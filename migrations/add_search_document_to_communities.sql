-- Migration: Add full-text search support to communities table
-- This enables searching communities by name, tagline, and description

-- Step 1: Add the search_document column (tsvector type for full-text search)
ALTER TABLE communities
ADD COLUMN IF NOT EXISTS search_document tsvector;

-- Step 2: Create a function to update the search_document
CREATE OR REPLACE FUNCTION update_community_search_document()
RETURNS TRIGGER AS $$
BEGIN
    NEW.search_document :=
        setweight(to_tsvector('english', COALESCE(NEW.name, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(NEW.tagline, '')), 'B') ||
        setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'C');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 3: Create a trigger to automatically update search_document on INSERT/UPDATE
DROP TRIGGER IF EXISTS communities_search_document_update ON communities;

CREATE TRIGGER communities_search_document_update
    BEFORE INSERT OR UPDATE OF name, tagline, description
    ON communities
    FOR EACH ROW
    EXECUTE FUNCTION update_community_search_document();

-- Step 4: Populate search_document for existing communities
UPDATE communities
SET search_document =
    setweight(to_tsvector('english', COALESCE(name, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(tagline, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(description, '')), 'C');

-- Step 5: Create a GIN index on search_document for fast full-text search
CREATE INDEX IF NOT EXISTS communities_search_document_idx
ON communities
USING gin(search_document);

-- Step 6: Analyze the table to update statistics
ANALYZE communities;

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Full-text search successfully enabled for communities table!';
    RAISE NOTICE 'Search capabilities:';
    RAISE NOTICE '  - Name (weight A - highest priority)';
    RAISE NOTICE '  - Tagline (weight B)';
    RAISE NOTICE '  - Description (weight C)';
END $$;
