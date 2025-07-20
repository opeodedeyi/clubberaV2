const db = require("../../config/db");

class CommunityAdminModel {
    // Role Management
    async updateMemberRole(communityId, userId, newRole, updatedBy) {
        // Get current role for audit logging
        const getMemberQuery = {
            text: `SELECT * FROM community_members 
                   WHERE community_id = $1 AND user_id = $2`,
            values: [communityId, userId],
        };

        const memberResult = await db.query(
            getMemberQuery.text,
            getMemberQuery.values
        );
        const currentRole = memberResult.rows[0]?.role;

        // Update role
        const query = {
            text: `
                UPDATE community_members
                SET role = $1, joined_at = joined_at
                WHERE community_id = $2 AND user_id = $3
                RETURNING *
            `,
            values: [newRole, communityId, userId],
        };

        const result = await db.query(query.text, query.values);

        if (result.rows.length > 0 && currentRole) {
            // Log the role update in audit log
            await this.createAuditLog({
                community_id: communityId,
                user_id: updatedBy,
                action_type: "role_update",
                previous_state: { user_id: userId, role: currentRole },
                new_state: { user_id: userId, role: newRole },
            });
        }

        return result.rows[0] || null;
    }

    // Ownership Transfer
    async createOwnershipTransfer(data) {
        const { community_id, current_owner_id, target_user_id } = data;

        // Calculate expiration (48 hours from now)
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 48);

        const query = {
            text: `
                INSERT INTO community_ownership_transfers 
                (community_id, current_owner_id, target_user_id, status, expires_at)
                VALUES ($1, $2, $3, 'pending', $4)
                RETURNING *
            `,
            values: [community_id, current_owner_id, target_user_id, expiresAt],
        };

        const result = await db.query(query.text, query.values);
        return result.rows[0];
    }

    async getOwnershipTransfer(transferId) {
        const query = {
            text: `
                SELECT t.*, 
                    c.name as community_name, 
                    c.unique_url as community_url,
                    u1.full_name as current_owner_name,
                    u1.email as current_owner_email,
                    u2.full_name as target_user_name,
                    u2.email as target_user_email
                FROM community_ownership_transfers t
                JOIN communities c ON t.community_id = c.id
                JOIN users u1 ON t.current_owner_id = u1.id
                JOIN users u2 ON t.target_user_id = u2.id
                WHERE t.id = $1
            `,
            values: [transferId],
        };

        const result = await db.query(query.text, query.values);
        return result.rows[0] || null;
    }

    async getPendingOwnershipTransfer(communityId) {
        const query = {
            text: `
                SELECT t.*, 
                    c.name as community_name, 
                    c.unique_url as community_url
                FROM community_ownership_transfers t
                JOIN communities c ON t.community_id = c.id
                WHERE t.community_id = $1 AND t.status = 'pending' AND t.expires_at > NOW()
            `,
            values: [communityId],
        };

        const result = await db.query(query.text, query.values);
        return result.rows[0] || null;
    }

    async updateOwnershipTransferStatus(transferId, status) {
        const query = {
            text: `
                UPDATE community_ownership_transfers
                SET status = $1, updated_at = NOW()
                WHERE id = $2 AND status = 'pending' AND expires_at > NOW()
                RETURNING *
            `,
            values: [status, transferId],
        };

        const result = await db.query(query.text, query.values);
        return result.rows[0] || null;
    }

    async executeOwnershipTransfer(transferId) {
        // Get the transfer details
        const transfer = await this.getOwnershipTransfer(transferId);
        if (
            !transfer ||
            transfer.status !== "pending" ||
            new Date(transfer.expires_at) < new Date()
        ) {
            return null;
        }

        // Create operations for transaction
        const operations = [
            {
                text: `UPDATE community_members 
                       SET role = 'organizer' 
                       WHERE community_id = $1 AND user_id = $2`,
                values: [transfer.community_id, transfer.current_owner_id],
            },
            {
                text: `UPDATE community_members 
                       SET role = 'owner' 
                       WHERE community_id = $1 AND user_id = $2`,
                values: [transfer.community_id, transfer.target_user_id],
            },
            {
                text: `UPDATE community_ownership_transfers 
                       SET status = 'accepted', updated_at = NOW() 
                       WHERE id = $1`,
                values: [transferId],
            },
            {
                text: `INSERT INTO community_audit_logs 
                       (community_id, user_id, action_type, previous_state, new_state) 
                       VALUES ($1, $2, 'ownership_transfer', $3, $4)`,
                values: [
                    transfer.community_id,
                    transfer.target_user_id,
                    JSON.stringify({ owner_id: transfer.current_owner_id }),
                    JSON.stringify({ owner_id: transfer.target_user_id }),
                ],
            },
        ];

        // Execute transaction
        await db.executeTransaction(operations);

        return {
            transferId,
            communityId: transfer.community_id,
            communityName: transfer.community_name,
            previousOwnerId: transfer.current_owner_id,
            previousOwnerName: transfer.current_owner_name,
            previousOwnerEmail: transfer.current_owner_email,
            newOwnerId: transfer.target_user_id,
            newOwnerName: transfer.target_user_name,
            newOwnerEmail: transfer.target_user_email,
            status: "accepted",
        };
    }

    // Audit Logging
    async createAuditLog(data) {
        const {
            community_id,
            user_id,
            action_type,
            previous_state,
            new_state,
            ip_address,
            metadata,
        } = data;

        const query = {
            text: `
                INSERT INTO community_audit_logs 
                (community_id, user_id, action_type, previous_state, new_state, ip_address, metadata)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                RETURNING *
            `,
            values: [
                community_id,
                user_id,
                action_type,
                previous_state ? JSON.stringify(previous_state) : null,
                new_state ? JSON.stringify(new_state) : null,
                ip_address || null,
                metadata ? JSON.stringify(metadata) : null,
            ],
        };

        const result = await db.query(query.text, query.values);
        return result.rows[0];
    }

    async getAuditLogs(communityId, filters = {}) {
        const { action_type, limit = 50, offset = 0 } = filters;

        const params = [communityId];
        let query = `
            SELECT al.*, u.full_name as user_name
            FROM community_audit_logs al
            JOIN users u ON al.user_id = u.id
            WHERE al.community_id = $1
        `;

        if (action_type) {
            query += ` AND al.action_type = $${params.length + 1}`;
            params.push(action_type);
        }

        query += ` ORDER BY al.created_at DESC LIMIT $${
            params.length + 1
        } OFFSET $${params.length + 2}`;
        params.push(limit, offset);

        const result = await db.query(query, params);
        return result.rows;
    }
}

module.exports = new CommunityAdminModel();
