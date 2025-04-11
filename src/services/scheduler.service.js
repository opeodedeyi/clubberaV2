const cron = require("node-cron");
const communityService = require("../community/services/community.service");

class SchedulerService {
    initializeScheduler() {
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

        console.info("Scheduler initialized");
    }
}

module.exports = new SchedulerService();
