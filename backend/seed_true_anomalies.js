const { pool } = require('./config/db');

async function seedTrueAnomalies() {
  try {
    await pool.query('TRUNCATE TABLE anomalies');

    const [projects] = await pool.query(
      'SELECT p.*, r.risk_level, r.total_score FROM projects p LEFT JOIN risk_scores r ON p.project_id = r.project_id'
    );

    let inserted = 0;
    for (const p of projects) {
      const st = (p.status || '').toLowerCase().trim();
      
      if (st === 'cost overrun') {
        const overrunPct = p.sanctioned_amount > 0 ? (((p.actual_expenditure - p.sanctioned_amount) / p.sanctioned_amount) * 100).toFixed(1) : '0';
        const diffLakh = ((p.actual_expenditure - p.sanctioned_amount) / 100000).toFixed(1);
        await pool.query(
          'INSERT INTO anomalies (project_id, anomaly_type, severity, description, score) VALUES (?, ?, ?, ?, ?)',
          [
            p.project_id,
            'Cost Overrun',
            'HIGH',
            'Expenditure exceeds sanctioned amount by ' + overrunPct + '% (+₹' + diffLakh + ' Lakhs)',
            85
          ]
        );
        inserted++;
      } else if (st === 'payment-progress mismatch') {
        const gap = (Number(p.financial_progress) || 0) - (Number(p.physical_progress) || 0);
        await pool.query(
          'INSERT INTO anomalies (project_id, anomaly_type, severity, description, score) VALUES (?, ?, ?, ?, ?)',
          [
            p.project_id,
            'Progress Mismatch',
            'HIGH',
            'Financial progress (' + p.financial_progress + '%) significantly exceeds physical progress (' + p.physical_progress + '%) by ' + gap + '%',
            85
          ]
        );
        inserted++;
      } else if (st === 'high risk' || p.risk_level === 'CRITICAL') {
        await pool.query(
          'INSERT INTO anomalies (project_id, anomaly_type, severity, description, score) VALUES (?, ?, ?, ?, ?)',
          [
            p.project_id,
            'Critical AI Risk Flag',
            'CRITICAL',
            'Severe anomaly detected: Combined financial deviation, progress lag, and abnormal expense trajectory',
            95
          ]
        );
        inserted++;
      }
    }

    console.log('Successfully inserted true anomalies into database. Count:', inserted);
    process.exit(0);
  } catch (err) {
    console.error('Error seeding true anomalies:', err);
    process.exit(1);
  }
}

seedTrueAnomalies();
