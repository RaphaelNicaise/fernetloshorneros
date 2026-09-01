const mysql = require('mysql2/promise');
require('dotenv').config({ path: '../.env' });

async function createDb() {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      port: 3306,
      user: process.env.MYSQL_USER || 'root',
      password: process.env.MYSQL_ROOT_PASSWORD || '1234'
    });
    await connection.query('CREATE DATABASE IF NOT EXISTS fernetloshorneros_test;');
    console.log('Test database created or already exists');
    await connection.end();
  } catch (error) {
    console.error('Error creating database:', error);
  }
}

createDb();
