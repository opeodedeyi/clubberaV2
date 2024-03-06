const { OAuth2Client } = require('google-auth-library');


const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const client = new OAuth2Client(CLIENT_ID);
const oAuth2Client = new OAuth2Client(
    CLIENT_ID,
    CLIENT_SECRET,
    'postmessage',
);


const getGoogleIdToken = async (code) => {
    const { tokens } = await oAuth2Client.getToken(code);
    return tokens.id_token;
};

const verifyGoogleToken = async (idToken) => {
    const ticket = await client.verifyIdToken({
        idToken,
        audience: CLIENT_ID,
    });
    return ticket.getPayload();
};

module.exports = {
    getGoogleIdToken,
    verifyGoogleToken
};
