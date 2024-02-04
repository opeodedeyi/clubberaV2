const { Pool } = require('pg')
require('dotenv').config()


const DB_PASSWORD = process.env.DB_PASSWORD;

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'clubbera',
    password: DB_PASSWORD,
    port: 5432,
})

module.exports = pool;