function getTimeDifference(date) {
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
        return `${days} d`;
    } else if (hours > 0) {
        return `${hours} h`;
    } else {
        return `${minutes} m`;
    }
}

module.exports = { getTimeDifference };