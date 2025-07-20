// src/user/utils/urlGenerator.js
const UserModel = require("../models/user.model");

class UrlGenerator {
    static generateBaseUrl(fullName) {
        return fullName
            .toLowerCase()
            .replace(/[^a-z0-9]/g, "-")
            .replace(/-+/g, "-")
            .replace(/^-|-$/g, "");
    }

    static async generateUniqueUserUrl(fullName) {
        let baseUrl = this.generateBaseUrl(fullName);
        let uniqueUrl = baseUrl;
        let counter = 1;

        // Check if URL exists and generate variations if needed
        while (await this.urlExists(uniqueUrl)) {
            uniqueUrl = `${baseUrl}-${counter}`;
            counter++;
        }

        return uniqueUrl;
    }

    static async urlExists(url) {
        const result = await UserModel.findByUniqueUrl(url);
        return !!result;
    }
}

module.exports = UrlGenerator;
