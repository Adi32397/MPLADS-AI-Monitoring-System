const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const generateData = async () => {
  console.log('Starting database seeding...');
  
  try {
    // 0. Initialize DB and create tables
    const initConn = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
    });
    await initConn.query(`CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME}\`;`);
    await initConn.end();

    const pool = mysql.createPool({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      multipleStatements: true
    });

    const schemaPath = path.join(__dirname, '../database/schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    await pool.query(schemaSql);
    console.log('Database and tables initialized.');
    // 1. Clear existing data
    await pool.query('SET FOREIGN_KEY_CHECKS = 0');
    await pool.query('TRUNCATE TABLE alerts');
    await pool.query('TRUNCATE TABLE anomalies');
    await pool.query('TRUNCATE TABLE payments');
    await pool.query('TRUNCATE TABLE risk_scores');
    await pool.query('TRUNCATE TABLE projects');
    await pool.query('TRUNCATE TABLE users');
    await pool.query('SET FOREIGN_KEY_CHECKS = 1');

    // 2. Insert Users
    await pool.query(`
      INSERT INTO users (name, email, password, role) VALUES 
      ('District Authority', 'district.demo@example.com', 'demo123', 'district_authority'),
      ('Ministry', 'ministry.demo@example.com', 'demo123', 'ministry'),
      ('Member of Parliament', 'mp.demo@example.com', 'demo123', 'mp')
    `);

    // 3. Generate Projects
    const districts = ['Dehradun', 'Haridwar', 'Nainital', 'Almora', 'Udham Singh Nagar'];
    const categories = ['Infrastructure', 'Education', 'Health', 'Sanitation', 'Water Supply'];
    
    // Specifically insert the demo project requested: MPL-2026-00452
    await pool.query(`
      INSERT INTO projects (project_id, name, state, district, constituency, category, sanctioned_amount, estimated_cost, actual_expenditure, physical_progress, financial_progress, start_date, expected_completion, actual_completion, implementing_agency, status)
      VALUES (
        'MPL-2026-00452', 'Rural Road Construction', 'Uttarakhand', 'Dehradun', 'Dehradun Cantt', 'Infrastructure', 
        1850000, 1850000, 2520000, 61, 82, '2025-01-10', '2026-08-31', NULL, 'PWD Dehradun', 'Delayed'
      )
    `);

    await pool.query(`
      INSERT INTO risk_scores (project_id, cost_overrun_score, delay_score, progress_mismatch_score, payment_anomaly_score, historical_deviation_score, duplicate_score, total_score, risk_level)
      VALUES ('MPL-2026-00452', 25, 18, 20, 15, 11, 0, 89, 'CRITICAL')
    `);

    await pool.query(`
      INSERT INTO anomalies (project_id, anomaly_type, severity, description, score) VALUES 
      ('MPL-2026-00452', 'Cost Overrun', 'CRITICAL', 'Expenditure is approximately 36% above the sanctioned amount.', 25),
      ('MPL-2026-00452', 'Progress Mismatch', 'HIGH', '82% financial utilization but only 61% physical progress.', 20),
      ('MPL-2026-00452', 'Delay Risk', 'HIGH', 'Project is significantly behind the expected timeline.', 18),
      ('MPL-2026-00452', 'Payment Anomaly', 'MEDIUM', 'Recent payment significantly deviates from the projects historical payment pattern.', 15),
      ('MPL-2026-00452', 'Historical Deviation', 'LOW', 'Spending pattern differs from similar projects.', 11)
    `);
    
    await pool.query(`
      INSERT INTO payments (project_id, payment_date, amount, payment_type, status) VALUES 
      ('MPL-2026-00452', '2025-02-01', 300000, 'Advance', 'Completed'),
      ('MPL-2026-00452', '2025-06-15', 500000, 'Milestone 1', 'Completed'),
      ('MPL-2026-00452', '2026-01-20', 740000, 'Milestone 2', 'Completed'),
      ('MPL-2026-00452', '2026-07-05', 980000, 'Final', 'Completed') -- The anomalous payment
    `);

    // Insert 50 more generic projects for stats
    for(let i = 1; i <= 50; i++) {
      const pid = `MPL-2026-${1000 + i}`;
      const isHighRisk = i % 5 === 0;
      const sancAmt = Math.floor(Math.random() * 4000000) + 1000000;
      let expAmt = isHighRisk ? sancAmt * (1 + (Math.random() * 0.5)) : sancAmt * Math.random();
      const dist = districts[i % districts.length];
      const cat = categories[i % categories.length];
      
      await pool.query(`
        INSERT INTO projects (project_id, name, state, district, constituency, category, sanctioned_amount, estimated_cost, actual_expenditure, physical_progress, financial_progress, start_date, expected_completion, implementing_agency, status)
        VALUES (?, ?, 'Uttarakhand', ?, ?, ?, ?, ?, ?, ?, ?, '2025-05-01', '2026-12-31', 'Local Agency', ?)
      `, [
        pid, 
        `${cat} Project ${i}`,
        dist, 
        `Constituency ${i % 3}`, 
        cat, 
        sancAmt, 
        sancAmt, 
        expAmt,
        isHighRisk ? 40 : 80,
        isHighRisk ? 90 : 75,
        isHighRisk ? 'Delayed' : 'In Progress'
      ]);

      const totalScore = isHighRisk ? Math.floor(Math.random() * 30) + 65 : Math.floor(Math.random() * 30);
      let rLevel = 'LOW';
      if(totalScore > 80) rLevel = 'CRITICAL';
      else if(totalScore > 60) rLevel = 'HIGH';
      else if(totalScore > 30) rLevel = 'MEDIUM';

      await pool.query(`
        INSERT INTO risk_scores (project_id, total_score, risk_level)
        VALUES (?, ?, ?)
      `, [pid, totalScore, rLevel]);
      
      // Potential Duplicate Pair
      if (i === 10) {
        await pool.query(`
          INSERT INTO projects (project_id, name, state, district, constituency, category, sanctioned_amount, estimated_cost, actual_expenditure, physical_progress, financial_progress, start_date, expected_completion, implementing_agency, status)
          VALUES ('MPL-2026-0321', 'Community Hall Construction', 'Uttarakhand', 'Dehradun', 'Constituency 1', 'Infrastructure', 2000000, 2000000, 1000000, 50, 50, '2025-05-01', '2026-12-31', 'Local Agency', 'In Progress')
        `);
        await pool.query(`
          INSERT INTO projects (project_id, name, state, district, constituency, category, sanctioned_amount, estimated_cost, actual_expenditure, physical_progress, financial_progress, start_date, expected_completion, implementing_agency, status)
          VALUES ('MPL-2026-0322', 'Construction of Community Hall', 'Uttarakhand', 'Dehradun', 'Constituency 1', 'Infrastructure', 1980000, 1980000, 800000, 40, 40, '2025-06-01', '2026-12-31', 'Local Agency', 'In Progress')
        `);
      }
    }

    console.log('Database seeded successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  }
};

generateData();
