const communityModel = require("../models/community.model");

class CommunityService {
    async clearExpiredRestrictions() {
        try {
            console.info("Processing expired community restrictions");

            const expiredRestrictions =
                await communityModel.clearExpiredRestrictions();

            console.info(
                `Cleared ${expiredRestrictions.length} expired restrictions`
            );
            return expiredRestrictions;
        } catch (error) {
            console.error("Error clearing expired restrictions:", error);
            throw error;
        }
    }
}

module.exports = new CommunityService();
