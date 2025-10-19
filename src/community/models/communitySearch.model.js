const db = require("../../config/db");

class CommunitySearchModel {
    async searchCommunities(options) {
        const {
            query,
            limit = 20,
            offset = 0,
            includePrivate = false,
        } = options;

        if (!query || query.trim() === "") {
            return { communities: [], total: 0 };
        }

        try {
            // Convert the search query to support full-text search + ILIKE fallback
            const searchPattern = `%${query.replace(/\s+/g, '%')}%`; // Match words regardless of spaces

            // Prepare tsquery - replace spaces with & for multi-word queries
            const tsQueryString = query.trim().replace(/\s+/g, ' & ');

            const searchQuery = `
                SELECT
                    c.id,
                    c.name,
                    c.unique_url,
                    c.tagline,
                    c.is_private,
                    c.is_active,
                    c.created_at,
                    CASE
                        WHEN c.search_document IS NOT NULL THEN
                            GREATEST(
                                ts_rank(c.search_document, websearch_to_tsquery('english', $1)),
                                ts_rank(c.search_document, plainto_tsquery('english', $1)) * 0.9,
                                ts_rank(c.search_document, to_tsquery('english', $6 || ':*')) * 0.8
                            )
                        ELSE 0
                    END +
                    CASE
                        WHEN c.name ILIKE $4 THEN 2.0
                        WHEN c.tagline ILIKE $4 THEN 1.5
                        WHEN c.description ILIKE $4 THEN 1.0
                        ELSE 0
                    END AS rank
                FROM communities c
                WHERE
                    c.is_active = true AND
                    (
                        (c.search_document IS NOT NULL AND (
                            c.search_document @@ websearch_to_tsquery('english', $1) OR
                            c.search_document @@ plainto_tsquery('english', $1) OR
                            c.search_document @@ to_tsquery('english', $6 || ':*')
                        )) OR
                        c.name ILIKE $4 OR
                        c.tagline ILIKE $4 OR
                        c.description ILIKE $4
                    ) AND
                    ($2 = true OR c.is_private = false)
                ORDER BY rank DESC
                LIMIT $3 OFFSET $5
            `;

            const communities = await db.query(searchQuery, [
                query,
                includePrivate,
                limit,
                searchPattern,
                offset,
                tsQueryString,
            ]);

            // Count total results with full-text search + ILIKE fallback
            const countQuery = `
                SELECT COUNT(*) FROM communities c
                WHERE
                    c.is_active = true AND
                    (
                        (c.search_document IS NOT NULL AND (
                            c.search_document @@ websearch_to_tsquery('english', $1) OR
                            c.search_document @@ plainto_tsquery('english', $1) OR
                            c.search_document @@ to_tsquery('english', $4 || ':*')
                        )) OR
                        c.name ILIKE $3 OR
                        c.tagline ILIKE $3 OR
                        c.description ILIKE $3
                    ) AND
                    ($2 = true OR c.is_private = false)
            `;

            const countResult = await db.query(countQuery, [
                query,
                includePrivate,
                searchPattern,
                tsQueryString,
            ]);
            const total = parseInt(countResult.rows[0].count);

            // For each community, get the profile image, cover image, and member count
            if (communities.rows.length > 0) {
                const communityIds = communities.rows.map((c) => c.id);

                // Get profile images
                const profileImagesQuery = `
                    SELECT entity_id, provider, key, alt_text
                    FROM images
                    WHERE entity_type = 'community'
                        AND image_type = 'profile'
                        AND entity_id = ANY($1)
                `;
                const profileImagesResult = await db.query(profileImagesQuery, [
                    communityIds,
                ]);

                // Create a map of community ID to profile image
                const profileImages = {};
                profileImagesResult.rows.forEach((img) => {
                    profileImages[img.entity_id] = {
                        provider: img.provider,
                        key: img.key,
                        alt_text: img.alt_text,
                    };
                });

                // Get cover images
                const coverImagesQuery = `
                    SELECT entity_id, provider, key, alt_text
                    FROM images
                    WHERE entity_type = 'community'
                        AND image_type = 'banner'
                        AND entity_id = ANY($1)
                `;
                const coverImagesResult = await db.query(coverImagesQuery, [
                    communityIds,
                ]);

                // Create a map of community ID to cover image
                const coverImages = {};
                coverImagesResult.rows.forEach((img) => {
                    coverImages[img.entity_id] = {
                        provider: img.provider,
                        key: img.key,
                        alt_text: img.alt_text,
                    };
                });

                // Get member counts
                const memberCountQuery = `
                    SELECT community_id, COUNT(*) as member_count
                    FROM community_members
                    WHERE community_id = ANY($1)
                    GROUP BY community_id
                `;
                const memberCountResult = await db.query(memberCountQuery, [
                    communityIds,
                ]);

                // Create a map of community ID to member count
                const memberCounts = {};
                memberCountResult.rows.forEach((row) => {
                    memberCounts[row.community_id] = parseInt(row.member_count);
                });

                // Get tags for each community
                const tagsQuery = `
                    SELECT ta.entity_id, array_agg(t.name) as tags
                    FROM tag_assignments ta
                    JOIN tags t ON ta.tag_id = t.id
                    WHERE ta.entity_type = 'community' AND ta.entity_id = ANY($1)
                    GROUP BY ta.entity_id
                `;
                const tagsResult = await db.query(tagsQuery, [communityIds]);

                // Create a map of community ID to tags
                const communityTags = {};
                tagsResult.rows.forEach((row) => {
                    communityTags[row.entity_id] = row.tags;
                });

                // Get locations for each community
                const locationsQuery = `
                    SELECT entity_id, name, lat, lng, address
                    FROM locations
                    WHERE entity_type = 'community' AND entity_id = ANY($1)
                `;
                const locationsResult = await db.query(locationsQuery, [
                    communityIds,
                ]);

                // Create a map of community ID to location
                const locations = {};
                locationsResult.rows.forEach((loc) => {
                    locations[loc.entity_id] = {
                        name: loc.name,
                        lat: loc.lat,
                        lng: loc.lng,
                        address: loc.address,
                    };
                });

                // Add profile images, cover images, member counts, tags, and locations to results
                for (const community of communities.rows) {
                    community.profile_image =
                        profileImages[community.id] || null;
                    community.cover_image = coverImages[community.id] || null;
                    community.member_count = memberCounts[community.id] || 0;
                    community.tags = communityTags[community.id] || [];
                    community.location = locations[community.id] || null;
                }
            }

            return {
                communities: communities.rows,
                total,
            };
        } catch (error) {
            console.error("Error in searchCommunities:", error);
            throw error;
        }
    }

    // NEW METHOD: Proximity search with optional text filtering
    async searchWithProximity(options) {
        const {
            query,
            lat,
            lng, 
            radius = 25,
            limit = 20,
            offset = 0,
            includePrivate = false,
        } = options;

        try {
            let searchQuery;
            let queryParams;
            
            if (query && query.trim()) {
                // Combined proximity + text search with ILIKE fallback
                const searchPattern = `%${query.replace(/\s+/g, '%')}%`;
                const tsQueryString = query.trim().replace(/\s+/g, ' & ');

                searchQuery = `
                    SELECT
                        c.id,
                        c.name,
                        c.unique_url,
                        c.tagline,
                        c.is_private,
                        c.is_active,
                        c.created_at,
                        ST_Distance(l.geom, ST_SetSRID(ST_MakePoint($1, $2), 4326)) * 69.0 AS distance_miles,
                        CASE
                            WHEN c.search_document IS NOT NULL THEN
                                GREATEST(
                                    ts_rank(c.search_document, websearch_to_tsquery('english', $3)),
                                    ts_rank(c.search_document, plainto_tsquery('english', $3)) * 0.9,
                                    ts_rank(c.search_document, to_tsquery('english', $9 || ':*')) * 0.8
                                )
                            ELSE 0
                        END +
                        CASE
                            WHEN c.name ILIKE $8 THEN 2.0
                            WHEN c.tagline ILIKE $8 THEN 1.5
                            WHEN c.description ILIKE $8 THEN 1.0
                            ELSE 0
                        END AS text_rank
                    FROM communities c
                    JOIN locations l ON l.entity_type = 'community' AND l.entity_id = c.id
                    WHERE
                        c.is_active = true AND
                        l.geom IS NOT NULL AND
                        ST_DWithin(l.geom, ST_SetSRID(ST_MakePoint($1, $2), 4326), $4 / 69.0) AND
                        (
                            (c.search_document IS NOT NULL AND (
                                c.search_document @@ websearch_to_tsquery('english', $3) OR
                                c.search_document @@ plainto_tsquery('english', $3) OR
                                c.search_document @@ to_tsquery('english', $9 || ':*')
                            )) OR
                            c.name ILIKE $8 OR
                            c.tagline ILIKE $8 OR
                            c.description ILIKE $8
                        ) AND
                        ($5 = true OR c.is_private = false)
                    ORDER BY distance_miles ASC, text_rank DESC
                    LIMIT $6 OFFSET $7
                `;
                queryParams = [lng, lat, query, radius, includePrivate, limit, offset, searchPattern, tsQueryString];
            } else {
                // Proximity only search
                searchQuery = `
                    SELECT 
                        c.id,
                        c.name,
                        c.unique_url,
                        c.tagline,
                        c.is_private,
                        c.is_active,
                        c.created_at,
                        ST_Distance(l.geom, ST_SetSRID(ST_MakePoint($1, $2), 4326)) * 69.0 AS distance_miles
                    FROM communities c
                    JOIN locations l ON l.entity_type = 'community' AND l.entity_id = c.id
                    WHERE 
                        c.is_active = true AND
                        l.geom IS NOT NULL AND
                        ST_DWithin(l.geom, ST_SetSRID(ST_MakePoint($1, $2), 4326), $3 / 69.0) AND
                        ($4 = true OR c.is_private = false)
                    ORDER BY distance_miles ASC
                    LIMIT $5 OFFSET $6
                `;
                queryParams = [lng, lat, radius, includePrivate, limit, offset];
            }

            const communities = await db.query(searchQuery, queryParams);

            // Count total results
            const countQuery = query && query.trim() ? `
                SELECT COUNT(*) FROM communities c
                JOIN locations l ON l.entity_type = 'community' AND l.entity_id = c.id
                WHERE
                    c.is_active = true AND
                    l.geom IS NOT NULL AND
                    ST_DWithin(l.geom, ST_SetSRID(ST_MakePoint($1, $2), 4326), $3 / 69.0) AND
                    (
                        (c.search_document IS NOT NULL AND (
                            c.search_document @@ websearch_to_tsquery('english', $4) OR
                            c.search_document @@ plainto_tsquery('english', $4) OR
                            c.search_document @@ to_tsquery('english', $7 || ':*')
                        )) OR
                        c.name ILIKE $6 OR
                        c.tagline ILIKE $6 OR
                        c.description ILIKE $6
                    ) AND
                    ($5 = true OR c.is_private = false)
            ` : `
                SELECT COUNT(*) FROM communities c
                JOIN locations l ON l.entity_type = 'community' AND l.entity_id = c.id
                WHERE
                    c.is_active = true AND
                    l.geom IS NOT NULL AND
                    ST_DWithin(l.geom, ST_SetSRID(ST_MakePoint($1, $2), 4326), $3 / 69.0) AND
                    ($4 = true OR c.is_private = false)
            `;

            const searchPattern = query && query.trim() ? `%${query.replace(/\s+/g, '%')}%` : null;
            const tsQueryString = query && query.trim() ? query.trim().replace(/\s+/g, ' & ') : null;
            const countParams = query && query.trim() ?
                [lng, lat, radius, query, includePrivate, searchPattern, tsQueryString] :
                [lng, lat, radius, includePrivate];

            const countResult = await db.query(countQuery, countParams);
            const total = parseInt(countResult.rows[0].count);

            // Get additional data (same as regular search)
            if (communities.rows.length > 0) {
                const communityIds = communities.rows.map((c) => c.id);

                // Get profile images
                const profileImagesQuery = `
                    SELECT entity_id, provider, key, alt_text
                    FROM images
                    WHERE entity_type = 'community'
                        AND image_type = 'profile'
                        AND entity_id = ANY($1)
                `;
                const profileImagesResult = await db.query(profileImagesQuery, [communityIds]);

                const profileImages = {};
                profileImagesResult.rows.forEach((img) => {
                    profileImages[img.entity_id] = {
                        provider: img.provider,
                        key: img.key,
                        alt_text: img.alt_text,
                    };
                });

                // Get cover images
                const coverImagesQuery = `
                    SELECT entity_id, provider, key, alt_text
                    FROM images
                    WHERE entity_type = 'community'
                        AND image_type = 'banner'
                        AND entity_id = ANY($1)
                `;
                const coverImagesResult = await db.query(coverImagesQuery, [communityIds]);

                const coverImages = {};
                coverImagesResult.rows.forEach((img) => {
                    coverImages[img.entity_id] = {
                        provider: img.provider,
                        key: img.key,
                        alt_text: img.alt_text,
                    };
                });

                // Get member counts
                const memberCountQuery = `
                    SELECT community_id, COUNT(*) as member_count
                    FROM community_members
                    WHERE community_id = ANY($1)
                    GROUP BY community_id
                `;
                const memberCountResult = await db.query(memberCountQuery, [communityIds]);

                const memberCounts = {};
                memberCountResult.rows.forEach((row) => {
                    memberCounts[row.community_id] = parseInt(row.member_count);
                });

                // Get tags
                const tagsQuery = `
                    SELECT ta.entity_id, array_agg(t.name) as tags
                    FROM tag_assignments ta
                    JOIN tags t ON ta.tag_id = t.id
                    WHERE ta.entity_type = 'community' AND ta.entity_id = ANY($1)
                    GROUP BY ta.entity_id
                `;
                const tagsResult = await db.query(tagsQuery, [communityIds]);

                const communityTags = {};
                tagsResult.rows.forEach((row) => {
                    communityTags[row.entity_id] = row.tags;
                });

                // Get locations
                const locationsQuery = `
                    SELECT entity_id, name, lat, lng, address
                    FROM locations
                    WHERE entity_type = 'community' AND entity_id = ANY($1)
                `;
                const locationsResult = await db.query(locationsQuery, [communityIds]);

                const locations = {};
                locationsResult.rows.forEach((loc) => {
                    locations[loc.entity_id] = {
                        name: loc.name,
                        lat: loc.lat,
                        lng: loc.lng,
                        address: loc.address,
                    };
                });

                // Add all data to results
                for (const community of communities.rows) {
                    community.profile_image = profileImages[community.id] || null;
                    community.cover_image = coverImages[community.id] || null;
                    community.member_count = memberCounts[community.id] || 0;
                    community.tags = communityTags[community.id] || [];
                    community.location = locations[community.id] || null;
                }
            }

            return {
                communities: communities.rows,
                total,
            };

        } catch (error) {
            console.error("Error in searchWithProximity:", error);
            throw error;
        }
    }
}

module.exports = new CommunitySearchModel();
