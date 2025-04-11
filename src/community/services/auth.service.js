const bcrypt = require("bcrypt");

class AuthService {
    static async verifyPassword(password, hash) {
        return bcrypt.compare(password, hash);
    }
}

module.exports = AuthService;
