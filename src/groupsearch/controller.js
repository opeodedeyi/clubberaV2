const {searchGroupsQuery} = require('./queries')


exports.searchGroups = async (req, res) => {
    try {
        const { searchText, sortBy, sortOrder, isPrivate, city, page = 1, limit = 10  } = req.query;

        if (!searchText) {
            return res.status(400).json({ error: 'Search text is required' });
        }

        const filters = {
            isPrivate: isPrivate === 'true' ? true : (isPrivate === 'false' ? false : null),
            city: city || null
        };

        const offset = (page - 1) * limit;

        const groups = await searchGroupsQuery(
            searchText,
            sortBy,
            sortOrder,
            filters,
            offset,
            limit
        );

        const totalGroups = parseInt(groups.length);
        
        return res.status(200).json({
            message: `Retrieved ${groups.length} groups`,
            success: true,
            groups,
            pagination: {
                currentPage: parseInt(page),
                itemsPerPage: parseInt(limit),
                totalItems: totalGroups,
                totalPages: Math.ceil(totalGroups / limit)
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
