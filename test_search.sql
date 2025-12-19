-- Test the exact search query that the code uses
SELECT 
    e.id,
    e.title,
    e.start_time,
    c.name as community_name,
    c.is_private,
    -- This is exactly what the search code does
    CASE 
        WHEN e.title ILIKE '%clubbera%' THEN 'MATCHES title'
        WHEN e.description ILIKE '%clubbera%' THEN 'MATCHES description'
        WHEN c.name ILIKE '%clubbera%' THEN 'MATCHES community name'
        ELSE 'NO MATCH'
    END as match_result
FROM events e
JOIN posts p ON e.post_id = p.id
JOIN communities c ON p.community_id = c.id
WHERE e.title = 'Clubbera is officially launching - Monday, December 22'
AND e.start_time >= NOW()
AND c.is_private = false;
