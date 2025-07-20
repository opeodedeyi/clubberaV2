// src/post/models/poll.model.js
const db = require("../../config/db");

class PollModel {
    async createPoll(postData) {
        const { communityId, userId, content, isSupportersOnly, pollData } =
            postData;

        // Validate poll data structure
        if (
            !pollData ||
            !pollData.options ||
            !Array.isArray(pollData.options) ||
            pollData.options.length < 2
        ) {
            throw new Error("Poll must have at least 2 options");
        }

        // Format poll data with votes initialized to 0
        const formattedPollData = {
            question: pollData.question || content,
            options: pollData.options.map((option) => ({
                text: option.text,
                votes: 0,
            })),
            settings: {
                allowMultipleVotes:
                    pollData.settings?.allowMultipleVotes || false,
                endDate: pollData.settings?.endDate || null,
            },
            voters: [],
        };

        const query = `
            INSERT INTO posts (
                community_id, 
                user_id, 
                content, 
                is_supporters_only, 
                content_type, 
                poll_data
            ) 
            VALUES ($1, $2, $3, $4, 'poll', $5) 
            RETURNING *`;

        const values = [
            communityId,
            userId,
            content || formattedPollData.question,
            isSupportersOnly || false,
            JSON.stringify(formattedPollData),
        ];

        const result = await db.query(query, values);
        return result.rows[0];
    }

    async votePoll(postId, userId, optionIndices) {
        // Start a transaction
        const client = await db.pool.connect();
        try {
            await client.query("BEGIN");

            // Get current poll data
            const pollQuery =
                "SELECT poll_data, user_id FROM posts WHERE id = $1 AND content_type = $2";
            const pollResult = await client.query(pollQuery, [postId, "poll"]);

            if (pollResult.rows.length === 0) {
                throw new Error("Poll not found");
            }

            const post = pollResult.rows[0];
            const pollData = post.poll_data;

            // Check if poll allows multiple votes
            const allowMultiple =
                pollData.settings?.allowMultipleVotes || false;

            // Check if poll has ended
            if (
                pollData.settings?.endDate &&
                new Date(pollData.settings.endDate) < new Date()
            ) {
                throw new Error("Poll has ended");
            }

            // Check if user has already voted
            const userVoted = pollData.voters.includes(userId);

            if (userVoted && !allowMultiple) {
                throw new Error(
                    "User has already voted and multiple votes are not allowed"
                );
            }

            // Validate option indices
            optionIndices = Array.isArray(optionIndices)
                ? optionIndices
                : [optionIndices];

            if (
                optionIndices.some(
                    (index) => index < 0 || index >= pollData.options.length
                )
            ) {
                throw new Error("Invalid option index");
            }

            if (!allowMultiple && optionIndices.length > 1) {
                throw new Error("Multiple votes not allowed");
            }

            // Update votes
            if (userVoted && allowMultiple) {
                // If user already voted and multiple votes allowed, don't add them to voters again
                optionIndices.forEach((index) => {
                    pollData.options[index].votes += 1;
                });
            } else {
                // Add votes and add user to voters
                optionIndices.forEach((index) => {
                    pollData.options[index].votes += 1;
                });
                pollData.voters.push(userId);
            }

            // Update the poll data
            const updateQuery = `
                UPDATE posts 
                SET poll_data = $1, updated_at = CURRENT_TIMESTAMP
                WHERE id = $2
                RETURNING *`;

            const updateResult = await client.query(updateQuery, [
                JSON.stringify(pollData),
                postId,
            ]);

            await client.query("COMMIT");
            return updateResult.rows[0];
        } catch (error) {
            await client.query("ROLLBACK");
            throw error;
        } finally {
            client.release();
        }
    }

    async getPollDetails(postId, userId) {
        const query = `
            SELECT 
                p.*,
                u.full_name as author_name,
                u.unique_url as author_url
            FROM posts p
            JOIN users u ON p.user_id = u.id
            WHERE p.id = $1 AND p.content_type = 'poll'`;

        const result = await db.query(query, [postId]);

        if (result.rows.length === 0) {
            return null;
        }

        const poll = result.rows[0];

        // Check if user has voted
        if (userId && poll.poll_data.voters) {
            poll.userHasVoted = poll.poll_data.voters.includes(userId);
        } else {
            poll.userHasVoted = false;
        }

        return poll;
    }

    async endPoll(postId, userId) {
        // Check if user is authorized to end poll (must be poll creator)
        const checkQuery =
            "SELECT user_id, poll_data FROM posts WHERE id = $1 AND content_type = $2";
        const checkResult = await db.query(checkQuery, [postId, "poll"]);

        if (checkResult.rows.length === 0) {
            return null;
        }

        const post = checkResult.rows[0];

        if (post.user_id !== userId) {
            throw new Error("Unauthorized to end this poll");
        }

        const pollData = post.poll_data;
        pollData.settings.endDate = new Date().toISOString();

        const updateQuery = `
            UPDATE posts 
            SET poll_data = $1, updated_at = CURRENT_TIMESTAMP
            WHERE id = $2
            RETURNING *`;

        const updateResult = await db.query(updateQuery, [
            JSON.stringify(pollData),
            postId,
        ]);
        return updateResult.rows[0];
    }
}

module.exports = new PollModel();
