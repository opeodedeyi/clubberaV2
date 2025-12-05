const cron = require("node-cron");
const communityService = require("../community/services/community.service");
const idempotencyModel = require("../middleware/models/idempotency.model");

class SchedulerService {
    initializeScheduler() {
        // Clear expired community restrictions daily at 3:00 AM
        cron.schedule("0 3 * * *", async () => {
            console.info("Running scheduled task: clearExpiredRestrictions");

            try {
                const result =
                    await communityService.clearExpiredRestrictions();
                console.info(
                    `Task completed: Cleared ${result.length} expired restrictions`
                );
            } catch (error) {
                console.error("Task failed:", error);
            }
        });

        // Clear expired idempotency keys daily at 3:30 AM
        cron.schedule("30 3 * * *", async () => {
            console.info("Running scheduled task: clearExpiredIdempotencyKeys");

            try {
                const deletedCount = await idempotencyModel.deleteExpired(24);
                console.info(
                    `Task completed: Cleared ${deletedCount} expired idempotency keys`
                );
            } catch (error) {
                console.error("Task failed:", error);
            }
        });

        console.info("Scheduler initialized");
    }
}

module.exports = new SchedulerService();
