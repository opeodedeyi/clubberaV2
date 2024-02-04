const bcrypt = require('bcrypt');


const securePassword = async (password) => {
    try {
        const hashedPassword = await bcrypt.hash(password, 8);
        return hashedPassword;
    } catch (error) {
        console.error('Hashing failed:', error);
        throw new Error('Hashing failed: ' + error.message);
    }
};

const comparePasswords = async (user, password) => {
    const isMatch = await bcrypt.compare(password, user.password);
    return isMatch;
}


module.exports = {
    securePassword,
    comparePasswords,
};
