// const { Pool } = require('pg')
// require('dotenv').config()


// const DB_PASSWORD = process.env.DB_PASSWORD;
// const DB_DATABASE = process.env.DB_DATABASE;
// const DB_USER = process.env.DB_USER;
// const DB_HOST = process.env.DB_HOST;
// const DB_PORT = process.env.DB_PORT;


// const pool = new Pool({
//     user: DB_USER,
//     host: DB_HOST,
//     database: DB_DATABASE,
//     password: DB_PASSWORD,
//     port: DB_PORT,
//     // ssl: {
//     //     rejectUnauthorized: false
//     // }
// })

// module.exports = pool;

const { Pool } = require('pg');
require('dotenv').config();

const DB_PASSWORD = process.env.DB_PASSWORD;
const DB_DATABASE = process.env.DB_DATABASE;
const DB_USER = process.env.DB_USER;
const DB_HOST = process.env.DB_HOST;
const DB_PORT = process.env.DB_PORT;

const pool = new Pool({
    user: DB_USER,
    host: DB_HOST,
    database: DB_DATABASE,
    password: DB_PASSWORD,
    port: DB_PORT,
    // ssl: {
    //     rejectUnauthorized: false
    // }
});

// Test the connection and log a message
pool.connect((err, client, release) => {
    if (err) {
        return console.error('Error acquiring client', err.stack);
    }
    console.log('Database connected successfully');
    release(); // Release the client back to the pool
});

module.exports = pool;
