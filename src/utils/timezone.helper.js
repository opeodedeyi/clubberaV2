// src/utils/timezone.helper.js

class TimezoneHelper {
    /**
     * Convert UTC date to specific timezone
     * @param {Date|string} utcDate - UTC date
     * @param {string} timezone - IANA timezone (e.g., "America/New_York")
     * @returns {string} - Formatted date string in target timezone
     */
    static convertToTimezone(utcDate, timezone) {
        const date = new Date(utcDate);
        return new Intl.DateTimeFormat('en-US', {
            timeZone: timezone,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        }).format(date);
    }

    /**
     * Get timezone offset for a specific timezone
     * @param {string} timezone - IANA timezone
     * @returns {string} - Timezone offset (e.g., "-05:00")
     */
    static getTimezoneOffset(timezone) {
        const date = new Date();
        const utc = new Date(date.getTime() + date.getTimezoneOffset() * 60000);
        const targetTime = new Date(utc.toLocaleString("en-US", { timeZone: timezone }));
        const offset = (targetTime.getTime() - utc.getTime()) / (1000 * 60 * 60);
        
        const sign = offset >= 0 ? '+' : '-';
        const hours = Math.floor(Math.abs(offset));
        const minutes = Math.floor((Math.abs(offset) % 1) * 60);
        
        return `${sign}${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    }

    /**
     * Validate timezone using Intl API
     * @param {string} timezone - IANA timezone to validate
     * @returns {boolean} - Whether timezone is valid
     */
    static isValidTimezone(timezone) {
        try {
            Intl.DateTimeFormat(undefined, { timeZone: timezone });
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Convert local time in specified timezone to UTC
     * @param {string|Date} localTime - Local time (ISO string without Z or Date object)
     * @param {string} timezone - IANA timezone
     * @returns {Date} - UTC Date object
     */
    static convertLocalToUTC(localTime, timezone) {
        if (!this.isValidTimezone(timezone)) {
            throw new Error('Invalid timezone');
        }

        // Parse the local time string if it's a string
        let timeString;
        if (typeof localTime === 'string') {
            // Ensure the string doesn't have timezone info (no Z or offset)
            timeString = localTime.replace(/[Z]|[+-]\d{2}:?\d{2}$/, '');
        } else {
            // Convert Date to ISO string without timezone
            const date = new Date(localTime);
            if (isNaN(date.getTime())) {
                throw new Error('Invalid date format');
            }
            timeString = date.toISOString().replace('Z', '');
        }

        // Validate the time format
        if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?$/.test(timeString)) {
            throw new Error('Invalid time format. Expected: YYYY-MM-DDTHH:mm:ss or YYYY-MM-DDTHH:mm:ss.sss');
        }

        try {
            // Use a more reliable method to convert local time to UTC
            // Create a Date object assuming the time is in the target timezone
            const parts = timeString.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{3}))?$/);
            if (!parts) {
                throw new Error('Failed to parse time string');
            }

            const [, year, month, day, hours, minutes, seconds, ms] = parts;
            
            // Create date components
            const dateInTargetTimezone = new Date(
                parseInt(year),
                parseInt(month) - 1, // Month is 0-indexed
                parseInt(day),
                parseInt(hours),
                parseInt(minutes),
                parseInt(seconds),
                parseInt(ms || '0')
            );

            // Get the timezone offset for this specific date/time
            // This accounts for DST transitions
            const offsetFormatter = new Intl.DateTimeFormat('en', {
                timeZone: timezone,
                timeZoneName: 'longOffset'
            });
            
            const offsetString = offsetFormatter.formatToParts(dateInTargetTimezone)
                .find(part => part.type === 'timeZoneName')?.value;
            
            if (!offsetString) {
                throw new Error('Could not determine timezone offset');
            }

            // Parse offset string (e.g., "GMT-4" or "GMT+5:30")
            const offsetMatch = offsetString.match(/GMT([+-])(\d{1,2})(?::?(\d{2}))?/);
            if (!offsetMatch) {
                // Fallback: use a different approach
                return this._convertLocalToUTCFallback(timeString, timezone);
            }

            const [, sign, offsetHours, offsetMinutes = '0'] = offsetMatch;
            const totalOffsetMinutes = (parseInt(offsetHours) * 60 + parseInt(offsetMinutes)) * (sign === '+' ? 1 : -1);

            // Convert to UTC by subtracting the offset
            const utcTime = new Date(dateInTargetTimezone.getTime() - (totalOffsetMinutes * 60000));
            
            return utcTime;

        } catch (error) {
            // Fallback method
            return this._convertLocalToUTCFallback(timeString, timezone);
        }
    }

    /**
     * Fallback method for local to UTC conversion
     * @private
     */
    static _convertLocalToUTCFallback(timeString, timezone) {
        // Create a temporary date as if it's in UTC
        const tempDate = new Date(timeString + 'Z');
        
        // Format this date in the target timezone to see what time it would be
        const targetTimeString = tempDate.toLocaleString('sv-SE', { 
            timeZone: timezone,
            year: 'numeric',
            month: '2-digit', 
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        }).replace(' ', 'T');

        // Calculate the difference between what we want and what we got
        const targetTime = new Date(targetTimeString);
        const wantedTime = new Date(timeString);
        const difference = wantedTime.getTime() - targetTime.getTime();
        
        // Apply the correction
        return new Date(tempDate.getTime() + difference);
    }

    /**
     * Get human-readable timezone info
     * @param {string} timezone - IANA timezone
     * @returns {object} - Timezone information
     */
    static getTimezoneInfo(timezone) {
        if (!this.isValidTimezone(timezone)) {
            throw new Error('Invalid timezone');
        }

        const now = new Date();
        const formatter = new Intl.DateTimeFormat('en-US', {
            timeZone: timezone,
            timeZoneName: 'long'
        });

        const parts = formatter.formatToParts(now);
        const timeZoneName = parts.find(part => part.type === 'timeZoneName')?.value;

        return {
            timezone,
            name: timeZoneName,
            offset: this.getTimezoneOffset(timezone),
            currentTime: this.convertToTimezone(now, timezone)
        };
    }
}

module.exports = TimezoneHelper;