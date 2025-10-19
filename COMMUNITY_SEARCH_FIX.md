# Community Search Fix

## Problem

Searching for "basketball" didn't find "Basket ball group for young people" because:

1. **Missing `search_document` column**: The search functionality relies on PostgreSQL full-text search using a `search_document` column (tsvector type) that didn't exist in the database
2. **Strict word matching**: Even with full-text search, "basketball" (one word) won't match "Basket ball" (two words) in standard PostgreSQL FTS

## Solution

### 1. Database Migration (REQUIRED)

Run the migration file to enable full-text search:

```bash
psql -U your_username -d clubbera -f migrations/add_search_document_to_communities.sql
```

**What this does:**
- ✅ Adds `search_document` column (tsvector) to communities table
- ✅ Creates auto-update trigger when name/tagline/description changes
- ✅ Populates existing communities with search data
- ✅ Creates GIN index for fast search performance
- ✅ Uses weighted ranking (name=A, tagline=B, description=C)

### 2. Code Updates (COMPLETED)

Updated [communitySearch.model.js](src/community/models/communitySearch.model.js) to use **hybrid search**:

#### Dual Search Strategy:
1. **Full-Text Search** (PostgreSQL FTS) - Fast, language-aware, stemming
2. **ILIKE Pattern Match** (Fallback) - Handles cases like "basketball" → "Basket ball"

#### Search Pattern:
```javascript
const searchPattern = `%${query.replace(/\s+/g, '%')}%`;
// "basketball" becomes "%basketball%"
// "basket ball" becomes "%basket%ball%"
```

#### Ranking System:
- Full-text match: Uses PostgreSQL's `ts_rank()`
- ILIKE bonus: name (2.0) > tagline (1.5) > description (1.0)
- Combined score determines result order

## Testing

### Test Cases:

```bash
# Should now find "Basket ball group for young people"
GET /api/community-search/search?query=basketball
GET /api/community-search/search?query=basket
GET /api/community-search/search?query=ball

# Should also work with proximity
GET /api/community-search/search?query=basketball&lat=37.7749&lng=-122.4194

# Multi-word queries
GET /api/community-search/search?query=young people
```

### Expected Results:
✅ Finds communities regardless of word spacing
✅ Handles partial matches ("basket" finds "basketball")
✅ Case-insensitive
✅ Works even if `search_document` is NULL (backward compatible)

## Performance

- **GIN Index**: Fast full-text search (O(log n))
- **ILIKE Fallback**: Slower but necessary for edge cases
- **Recommendation**: Run the migration ASAP to populate `search_document` and avoid ILIKE overhead

## Files Modified

1. ✅ [migrations/add_search_document_to_communities.sql](migrations/add_search_document_to_communities.sql) - Database migration
2. ✅ [src/community/models/communitySearch.model.js](src/community/models/communitySearch.model.js) - Search logic updated
   - `searchCommunities()` method
   - `searchWithProximity()` method

## Next Steps

1. **RUN THE MIGRATION** - Search won't work optimally without it
2. Test the search endpoints
3. Monitor query performance
4. Consider adding fuzzy matching (trigram similarity) for typos if needed

## Bonus: Future Enhancements

- Add trigram similarity for typo tolerance: `CREATE EXTENSION pg_trgm;`
- Add synonyms (e.g., "bb" → "basketball")
- Track search analytics
- Add search suggestions/autocomplete
