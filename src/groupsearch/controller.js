const {searchGroupsQuery} = require('./queries')


exports.searchGroups = async (req, res) => {
    const { user } = req;
    
    try {
        const { searchText, sortBy, sortOrder, isPrivate, city, page = 1, limit = 10 } = req.query;

        if (!searchText) {
            return res.status(400).json({ error: 'Search text is required' });
        }

        const filters = {
            isPrivate: isPrivate === 'true' ? true : (isPrivate === 'false' ? false : null),
            city: city || null
        };

        const offset = (page - 1) * parseInt(limit);
        const parsedLimit = parseInt(limit);

        const groups = await searchGroupsQuery(
            searchText,
            sortBy,
            sortOrder,
            filters,
            offset,
            parsedLimit
        );

        // For now, we'll use the length of the returned groups as the total count
        // In a production environment, you should implement a separate count query for accurate pagination
        const totalGroups = groups.length;

        return res.status(200).json({
            message: `Retrieved ${groups.length} groups`,
            success: true,
            groups,
            pagination: {
                currentPage: parseInt(page),
                itemsPerPage: parsedLimit,
                totalItems: totalGroups,
                totalPages: Math.ceil(totalGroups / parsedLimit)
            }
        });
    } catch (error) {
        console.error('Error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal Server Error',
        });
    }
};
