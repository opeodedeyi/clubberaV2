s/u\.full_name as author_name,/json_build_object('id', u.id, 'full_name', u.full_name, 'unique_url', u.unique_url, 'profile_image', (SELECT json_build_object('id', i.id, 'provider', i.provider, 'key', i.key, 'alt_text', i.alt_text) FROM images i WHERE i.entity_type = 'user' AND i.entity_id = u.id AND i.image_type = 'profile' LIMIT 1)) as user,/
/u\.unique_url as author_url,/d
/\($/,/author_image,$/d
