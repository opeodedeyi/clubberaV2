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
            votes: [], // Array of {userId, optionIndices, votedAt}
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
                "SELECT poll_data, user_id, is_hidden FROM posts WHERE id = $1 AND content_type = $2";
            const pollResult = await client.query(pollQuery, [postId, "poll"]);

            if (pollResult.rows.length === 0) {
                throw new Error("Poll not found");
            }

            const post = pollResult.rows[0];
            const pollData = post.poll_data;

            // PROTECTION: Check if poll is hidden (deleted)
            if (post.is_hidden) {
                throw new Error("Poll has been deleted");
            }

            // PROTECTION RULE 1: Check if poll has ended
            if (
                pollData.settings?.endDate &&
                new Date(pollData.settings.endDate) < new Date()
            ) {
                throw new Error("Poll has ended");
            }

            // PROTECTION RULE 2: Validate option indices exist
            optionIndices = Array.isArray(optionIndices)
                ? optionIndices
                : [optionIndices];

            if (optionIndices.length === 0) {
                throw new Error("At least one option must be selected");
            }

            if (
                optionIndices.some(
                    (index) => index < 0 || index >= pollData.options.length
                )
            ) {
                throw new Error("Invalid option index");
            }

            // PROTECTION RULE 3: Check single vs multiple choice rules
            const allowMultiple =
                pollData.settings?.allowMultipleVotes || false;

            if (!allowMultiple && optionIndices.length > 1) {
                throw new Error("This poll only allows voting for one option");
            }

            // Check if user has already voted
            const existingVotes = pollData.votes.filter(v => v.userId === userId);
            const hasVoted = existingVotes.length > 0;

            // SMART HANDLING: Automatically change vote if user has already voted
            if (hasVoted) {
                // For single-choice polls, automatically change the vote
                if (!allowMultiple) {
                    // Remove old votes from counts
                    existingVotes.forEach(vote => {
                        vote.optionIndices.forEach(index => {
                            pollData.options[index].votes -= 1;
                        });
                    });

                    // Remove old vote records
                    pollData.votes = pollData.votes.filter(v => v.userId !== userId);

                    // Add new vote
                    optionIndices.forEach((index) => {
                        pollData.options[index].votes += 1;
                    });

                    pollData.votes.push({
                        userId,
                        optionIndices,
                        votedAt: new Date().toISOString()
                    });
                } else {
                    // For multiple-choice polls, add additional vote
                    optionIndices.forEach((index) => {
                        pollData.options[index].votes += 1;
                    });

                    pollData.votes.push({
                        userId,
                        optionIndices,
                        votedAt: new Date().toISOString()
                    });
                }
            } else {
                // First time voting - add votes
                optionIndices.forEach((index) => {
                    pollData.options[index].votes += 1;
                });

                pollData.votes.push({
                    userId,
                    optionIndices,
                    votedAt: new Date().toISOString()
                });
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
            return {
                poll: updateResult.rows[0],
                voteAction: hasVoted ? 'changed' : 'created'
            };
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

        // Check if user has voted and get their vote details
        if (userId && poll.poll_data.votes) {
            const userVotes = poll.poll_data.votes.filter(v => v.userId === userId);
            poll.userHasVoted = userVotes.length > 0;

            // For single-choice polls, return the user's vote
            // For multiple-choice polls, return all their votes
            if (userVotes.length > 0) {
                poll.userVote = {
                    optionIndices: userVotes.flatMap(v => v.optionIndices),
                    votedAt: userVotes[userVotes.length - 1].votedAt, // Most recent vote time
                    voteCount: userVotes.length
                };
            } else {
                poll.userVote = null;
            }
        } else {
            poll.userHasVoted = false;
            poll.userVote = null;
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
