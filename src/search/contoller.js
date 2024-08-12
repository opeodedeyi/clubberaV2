const { searchMeetings } = require('./queries');

exports.searchMeetings = async (req, res) => {
    const { user } = req;
    
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
            parseInt(limit),
            user ? user.id : null  // Pass null if user is not defined
        );

        const formattedMeetings = meetings.map(meeting => ({
            id: meeting.id,
            unique_url: meeting.unique_url,
            title: meeting.title,
            description: meeting.description,
            date_of_meeting: meeting.date_of_meeting,
            time_of_meeting: meeting.time_of_meeting,
            capacity: meeting.capacity,
            group_title: meeting.group_title,
            location: meeting.location,
            banner: meeting.banner,
            attendee_count: meeting.attendee_count,
            attendees_avatar: meeting.attendees_avatar,
            status: meeting.status
        }));

        return res.status(200).json({
            message: `Retrieved ${formattedMeetings.length} meetings`,
            success: true,
            meetings: formattedMeetings,
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