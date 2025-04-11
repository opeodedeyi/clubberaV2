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
            // Convert the search query to a tsquery that PostgreSQL can use
            const searchQuery = `
                SELECT 
                    c.id,
                    c.name,
                    c.unique_url,
                    c.tagline,
                    c.is_private,
                    c.is_active,
                    c.created_at,
                    ts_rank(c.search_document, websearch_to_tsquery('english', $1)) AS rank
                FROM communities c
                WHERE 
                    c.is_active = true AND
                    c.search_document @@ websearch_to_tsquery('english', $1) AND
                    ($2 = true OR c.is_private = false)
                ORDER BY rank DESC
                LIMIT $3 OFFSET $4
            `;

            const communities = await db.query(searchQuery, [
                query,
                includePrivate,
                limit,
                offset,
            ]);

            // Count total results
            const countQuery = `
                SELECT COUNT(*) FROM communities c
                WHERE 
                    c.is_active = true AND
                    c.search_document @@ websearch_to_tsquery('english', $1) AND
                    ($2 = true OR c.is_private = false)
            `;

            const countResult = await db.query(countQuery, [
                query,
                includePrivate,
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
}

module.exports = new CommunitySearchModel();
