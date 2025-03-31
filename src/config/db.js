const { Pool } = require('pg');
require('dotenv').config();

const DB_PASSWORD = process.env.DB_PASSWORD;
const DB_DATABASE = process.env.DB_DATABASE;
const DB_USER = process.env.DB_USER;
const DB_HOST = process.env.DB_HOST;
const DB_PORT = process.env.DB_PORT;
const NODE_ENV = process.env.NODE_ENV;

const pool = new Pool({
    user: DB_USER,
    host: DB_HOST,
    database: DB_DATABASE,
    password: DB_PASSWORD,
    port: DB_PORT,
    ssl: NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});


// pool.connect((err, client, release) => {
//     if (err) {
//         return console.error('Error acquiring client', err.stack);
//     }
//     console.log('Database connected successfully');
//     release(); 
// });

// module.exports = pool;


const executeTransaction = async (operations) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const results = [];
        
        for await (const operation of operations) {
            const result = await client.query(operation.text, operation.values);
            results.push(result);
        }
        
        await client.query('COMMIT');
        return results;
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

module.exports = {
    query: (text, params) => pool.query(text, params),
    executeTransaction
};