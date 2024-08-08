const { searchMeetings } = require('./queries');

exports.searchMeetings = async (req, res) => {
    try {
        const { searchText, sortBy, userLat, userLng, fromDate, toDate, minCapacity, maxCapacity, upcoming, page = 1, limit = 10 } = req.query;

        if (!searchText) {
            return res.status(400).json({ error: 'Search text is required' });
        }

        const filters = {
            fromDate,
            toDate,
            minCapacity: minCapacity ? parseInt(minCapacity) : null,
            maxCapacity: maxCapacity ? parseInt(maxCapacity) : null,
            upcoming: upcoming === 'true' ? true : (upcoming === 'false' ? false : null)
        };
        const offset = (page - 1) * limit;

        const { meetings, totalCount } = await searchMeetings(
            searchText, 
            sortBy, 
            userLat ? parseFloat(userLat) : null, 
            userLng ? parseFloat(userLng) : null, 
            filters,
            offset,
            parseInt(limit)
        );

        return res.status(200).json({
            message: `Retrieved ${meetings.length} meetings`,
            success: true,
            meetings,
            pagination: {
                currentPage: parseInt(page),
                itemsPerPage: parseInt(limit),
                totalItems: totalCount,
                totalPages: Math.ceil(totalCount / parseInt(limit))
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