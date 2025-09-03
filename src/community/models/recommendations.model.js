const db = require("../../config/db");

class RecommendationsModel {
    async getRecommendations(userId, limit = 6) {
        const recommendations = [];
        const strategiesUsed = [];
        const strategiesFailed = [];
        
        // Note: Don't exit early - let strategies run and determine the actual reason

        // Strategy 1: Interest and skill-based matching (highest priority)
        if (recommendations.length < limit) {
            const interestBased = await this.getInterestBasedRecommendations(
                userId, 
                Math.min(4, limit - recommendations.length)
            );
            if (interestBased.length > 0) {
                strategiesUsed.push('interest');
                recommendations.push(...interestBased);
            } else {
                strategiesFailed.push('interest');
            }
        }

        // Strategy 2: Geographic proximity (if user has location)
        if (recommendations.length < limit) {
            const geoBased = await this.getGeographicRecommendations(
                userId, 
                Math.min(2, limit - recommendations.length)
            );
            if (geoBased.length > 0) {
                strategiesUsed.push('geographic');
                recommendations.push(...geoBased);
            } else {
                strategiesFailed.push('geographic');
            }
        }

        // Strategy 3: Collaborative filtering - "Users like you"
        if (recommendations.length < limit) {
            const collaborative = await this.getCollaborativeRecommendations(
                userId, 
                Math.min(2, limit - recommendations.length)
            );
            if (collaborative.length > 0) {
                strategiesUsed.push('collaborative');
                recommendations.push(...collaborative);
            } else {
                strategiesFailed.push('collaborative');
            }
        }

        // Strategy 4: Trending/Popular communities
        if (recommendations.length < limit) {
            const trending = await this.getTrendingRecommendations(
                userId, 
                Math.min(3, limit - recommendations.length)
            );
            if (trending.length > 0) {
                strategiesUsed.push('trending');
                recommendations.push(...trending);
            } else {
                strategiesFailed.push('trending');
            }
        }

        // Strategy 5: Random fallback (ensures we always have results)
        if (recommendations.length < limit) {
            const random = await this.getRandomRecommendations(
                userId, 
                limit - recommendations.length
            );
            if (random.length > 0) {
                strategiesUsed.push('random');
                recommendations.push(...random);
            } else {
                strategiesFailed.push('random');
            }
        }

        // Remove duplicates and return requested number
        const uniqueRecommendations = this.removeDuplicates(recommendations);
        const finalRecommendations = uniqueRecommendations.slice(0, limit);

        // Add strategy failure reasons after trying all strategies
        if (finalRecommendations.length === 0) {
            // Check if user is actually in all communities
            const totalCommunities = await this.getTotalAvailableCommunities(userId);
            console.log(`Debug - User ${userId}: Found ${totalCommunities} available communities`);
            if (totalCommunities === 0) {
                strategiesFailed.push('all_communities_joined');
            } else {
                // There are communities available, but our strategies failed to find them
                strategiesFailed.push('strategies_failed');
                console.log(`Debug - User ${userId}: ${totalCommunities} communities available but strategies failed`);
            }
        } else if (finalRecommendations.length < limit) {
            strategiesFailed.push('limited_communities');
        }

        return {
            communities: finalRecommendations,
            strategiesUsed,
            strategiesFailed
        };
    }

    async getInterestBasedRecommendations(userId, limit) {
        try {
            const query = `
                SELECT DISTINCT
                    c.id,
                    c.name,
                    c.unique_url,
                    c.tagline,
                    c.description,
                    c.is_private,
                    c.created_at,
                    COUNT(matching_tags.tag_id) as relevance_score,
                    'Based on your interests' as recommendation_reason
                FROM communities c
                JOIN tag_assignments ca ON c.id = ca.entity_id AND ca.entity_type = 'community'
                JOIN (
                    SELECT tag_id FROM tag_assignments 
                    WHERE entity_type = 'user' AND entity_id = $1 
                    AND assignment_type IN ('interest', 'skill')
                ) matching_tags ON ca.tag_id = matching_tags.tag_id
                WHERE c.is_active = true 
                    AND c.id NOT IN (
                        SELECT community_id FROM community_members WHERE user_id = $1
                    )
                GROUP BY c.id, c.name, c.unique_url, c.tagline, c.description, c.is_private, c.created_at
                ORDER BY relevance_score DESC, c.created_at DESC
                LIMIT $2
            `;

            const result = await db.query(query, [userId, limit]);
            return await this.enrichCommunityData(result.rows);
        } catch (error) {
            console.error("Error in getInterestBasedRecommendations:", error);
            return [];
        }
    }

    async getGeographicRecommendations(userId, limit) {
        try {
            // Check if user has location data
            const userLocationQuery = `
                SELECT geom FROM locations 
                WHERE entity_type = 'user' AND entity_id = $1 
                AND geom IS NOT NULL
                LIMIT 1
            `;
            const userLocationResult = await db.query(userLocationQuery, [userId]);
            
            if (!userLocationResult.rows.length) {
                return []; // No location data for user
            }

            const query = `
                SELECT DISTINCT
                    c.id,
                    c.name,
                    c.unique_url,
                    c.tagline,
                    c.description,
                    c.is_private,
                    c.created_at,
                    ST_Distance(ul.geom, cl.geom) * 69.0 AS distance_miles,
                    ROUND((100 / (1 + ST_Distance(ul.geom, cl.geom) * 69.0))::numeric, 1) as relevance_score,
                    'Near your location' as recommendation_reason
                FROM communities c
                JOIN locations cl ON cl.entity_type = 'community' AND cl.entity_id = c.id
                JOIN locations ul ON ul.entity_type = 'user' AND ul.entity_id = $1
                WHERE c.is_active = true 
                    AND c.id NOT IN (
                        SELECT community_id FROM community_members WHERE user_id = $1
                    )
                    AND cl.geom IS NOT NULL
                    AND ul.geom IS NOT NULL
                    AND ST_DWithin(ul.geom, cl.geom, 25 / 69.0) -- Within 25 miles
                ORDER BY distance_miles ASC
                LIMIT $2
            `;

            const result = await db.query(query, [userId, limit]);
            return await this.enrichCommunityData(result.rows);
        } catch (error) {
            console.error("Error in getGeographicRecommendations:", error);
            return [];
        }
    }

    async getCollaborativeRecommendations(userId, limit) {
        try {
            const query = `
                WITH similar_users AS (
                    SELECT DISTINCT ua2.entity_id as similar_user_id,
                           COUNT(*) as shared_interests
                    FROM tag_assignments ua1
                    JOIN tag_assignments ua2 ON ua1.tag_id = ua2.tag_id
                    WHERE ua1.entity_type = 'user' AND ua1.entity_id = $1
                      AND ua2.entity_type = 'user' AND ua2.entity_id != $1
                      AND ua1.assignment_type IN ('interest', 'skill')
                      AND ua2.assignment_type IN ('interest', 'skill')
                    GROUP BY ua2.entity_id
                    HAVING COUNT(*) >= 2
                )
                SELECT DISTINCT
                    c.id,
                    c.name,
                    c.unique_url,
                    c.tagline,
                    c.description,
                    c.is_private,
                    c.created_at,
                    COUNT(DISTINCT su.similar_user_id) as relevance_score,
                    'Popular with users like you' as recommendation_reason
                FROM communities c
                JOIN community_members cm ON c.id = cm.community_id
                JOIN similar_users su ON cm.user_id = su.similar_user_id
                WHERE c.is_active = true 
                    AND c.id NOT IN (
                        SELECT community_id FROM community_members WHERE user_id = $1
                    )
                GROUP BY c.id, c.name, c.unique_url, c.tagline, c.description, c.is_private, c.created_at
                ORDER BY relevance_score DESC, c.created_at DESC
                LIMIT $2
            `;

            const result = await db.query(query, [userId, limit]);
            return await this.enrichCommunityData(result.rows);
        } catch (error) {
            console.error("Error in getCollaborativeRecommendations:", error);
            return [];
        }
    }

    async getTrendingRecommendations(userId, limit) {
        try {
            const query = `
                SELECT DISTINCT
                    c.id,
                    c.name,
                    c.unique_url,
                    c.tagline,
                    c.description,
                    c.is_private,
                    c.created_at,
                    COALESCE(recent_activity.activity_score, 0) * 0.6 +
                    COALESCE(member_counts.member_count, 0) * 0.4 as relevance_score,
                    'Trending community' as recommendation_reason
                FROM communities c
                LEFT JOIN (
                    SELECT community_id, 
                           COUNT(*) as activity_score
                    FROM posts 
                    WHERE created_at > NOW() - INTERVAL '30 days'
                    GROUP BY community_id
                ) recent_activity ON c.id = recent_activity.community_id
                LEFT JOIN (
                    SELECT community_id, COUNT(*) as member_count
                    FROM community_members GROUP BY community_id
                ) member_counts ON c.id = member_counts.community_id
                WHERE c.is_active = true 
                    AND c.id NOT IN (
                        SELECT community_id FROM community_members WHERE user_id = $1
                    )
                    AND (recent_activity.activity_score > 0 OR member_counts.member_count > 5)
                ORDER BY relevance_score DESC, c.created_at DESC
                LIMIT $2
            `;

            const result = await db.query(query, [userId, limit]);
            return await this.enrichCommunityData(result.rows);
        } catch (error) {
            console.error("Error in getTrendingRecommendations:", error);
            return [];
        }
    }

    async getRandomRecommendations(userId, limit) {
        try {
            const query = `
                SELECT 
                    c.id,
                    c.name,
                    c.unique_url,
                    c.tagline,
                    c.description,
                    c.is_private,
                    c.created_at,
                    1 as relevance_score,
                    'Discover new communities' as recommendation_reason,
                    RANDOM() as random_order
                FROM communities c
                WHERE c.is_active = true 
                    AND c.is_private = false
                    AND c.id NOT IN (
                        SELECT COALESCE(community_id, -1) FROM community_members WHERE user_id = $1
                    )
                ORDER BY random_order
                LIMIT $2
            `;

            const result = await db.query(query, [userId, limit]);
            return await this.enrichCommunityData(result.rows);
        } catch (error) {
            console.error("Error in getRandomRecommendations:", error);
            return [];
        }
    }

    async enrichCommunityData(communities) {
        if (!communities.length) return [];

        const communityIds = communities.map(c => c.id);

        try {
            // Get member counts
            const memberCountQuery = `
                SELECT community_id, COUNT(*) as member_count
                FROM community_members
                WHERE community_id = ANY($1)
                GROUP BY community_id
            `;
            const memberCountResult = await db.query(memberCountQuery, [communityIds]);
            const memberCounts = {};
            memberCountResult.rows.forEach(row => {
                memberCounts[row.community_id] = parseInt(row.member_count);
            });

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
            profileImagesResult.rows.forEach(img => {
                profileImages[img.entity_id] = {
                    provider: img.provider,
                    key: img.key,
                    alt_text: img.alt_text
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
            coverImagesResult.rows.forEach(img => {
                coverImages[img.entity_id] = {
                    provider: img.provider,
                    key: img.key,
                    alt_text: img.alt_text
                };
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
            tagsResult.rows.forEach(row => {
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
            locationsResult.rows.forEach(loc => {
                locations[loc.entity_id] = {
                    name: loc.name,
                    lat: loc.lat,
                    lng: loc.lng,
                    address: loc.address
                };
            });

            // Enrich communities with additional data
            return communities.map(community => ({
                ...community,
                member_count: memberCounts[community.id] || 0,
                profile_image: profileImages[community.id] || null,
                cover_image: coverImages[community.id] || null,
                tags: communityTags[community.id] || [],
                location: locations[community.id] || null
            }));

        } catch (error) {
            console.error("Error enriching community data:", error);
            return communities; // Return basic data if enrichment fails
        }
    }

    async getTotalAvailableCommunities(userId) {
        try {
            const query = `
                SELECT COUNT(*) as total
                FROM communities c
                WHERE c.is_active = true 
                    AND c.is_private = false
                    AND c.id NOT IN (
                        SELECT COALESCE(community_id, -1) FROM community_members WHERE user_id = $1
                    )
            `;
            const result = await db.query(query, [userId]);
            return parseInt(result.rows[0].total);
        } catch (error) {
            console.error("Error in getTotalAvailableCommunities:", error);
            return 0;
        }
    }

    async getPopularCommunities(limit = 6) {
        try {
            const query = `
                SELECT DISTINCT
                    c.id,
                    c.name,
                    c.unique_url,
                    c.tagline,
                    c.description,
                    c.is_private,
                    c.created_at,
                    COALESCE(member_counts.member_count, 0) * 0.7 +
                    COALESCE(recent_activity.activity_score, 0) * 0.3 as popularity_score,
                    'Popular community' as recommendation_reason
                FROM communities c
                LEFT JOIN (
                    SELECT community_id, COUNT(*) as member_count
                    FROM community_members GROUP BY community_id
                ) member_counts ON c.id = member_counts.community_id
                LEFT JOIN (
                    SELECT community_id, COUNT(*) as activity_score
                    FROM posts 
                    WHERE created_at > NOW() - INTERVAL '30 days'
                    GROUP BY community_id
                ) recent_activity ON c.id = recent_activity.community_id
                WHERE c.is_active = true 
                    AND c.is_private = false
                    AND COALESCE(member_counts.member_count, 0) > 0
                ORDER BY popularity_score DESC, c.created_at DESC
                LIMIT $1
            `;

            const result = await db.query(query, [limit]);
            const enrichedCommunities = await this.enrichCommunityData(result.rows);

            return {
                communities: enrichedCommunities,
                strategiesUsed: ['popular'],
                strategiesFailed: []
            };
        } catch (error) {
            console.error("Error in getPopularCommunities:", error);
            return {
                communities: [],
                strategiesUsed: [],
                strategiesFailed: ['popular']
            };
        }
    }

    removeDuplicates(recommendations) {
        const seen = new Set();
        return recommendations.filter(community => {
            if (seen.has(community.id)) {
                return false;
            }
            seen.add(community.id);
            return true;
        });
    }
}

module.exports = new RecommendationsModel();