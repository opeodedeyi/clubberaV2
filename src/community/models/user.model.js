const db = require("../../config/db");

class UserModel {
    static async findById(id) {
        const query = {
            text: "SELECT * FROM users WHERE id = $1",
            values: [id],
        };

        const result = await db.query(query.text, query.values);
        return result.rows[0] || null;
    }
}

module.exports = UserModel;
