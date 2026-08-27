const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Helper to initialize DB if it doesn't exist
const initDb = async () => {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
    });
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME}\`;`);
    await connection.query(`USE \`${process.env.DB_NAME}\`;`);
    
    await connection.query(`
      CREATE TABLE IF NOT EXISTS verification_workflow (
        project_id VARCHAR(50) PRIMARY KEY,
        status VARCHAR(50) DEFAULT 'Pending Verification',
        assigned_officer VARCHAR(100),
        priority VARCHAR(20),
        due_date DATETIME,
        findings TEXT,
        officer_remarks TEXT,
        inspection_result VARCHAR(100),
        final_decision VARCHAR(100),
        checklist JSON,
        evidence JSON,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      );
    `);
    await connection.end();
    console.log('Database initialized successfully.');
  } catch (error) {
    console.error('Database initialization failed:', error.message);
  }
};

module.exports = {
  pool,
  initDb
};
