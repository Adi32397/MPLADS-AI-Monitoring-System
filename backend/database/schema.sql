CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role ENUM('mp', 'district_authority', 'ministry') NOT NULL
);

CREATE TABLE IF NOT EXISTS projects (
  id INT AUTO_INCREMENT PRIMARY KEY,
  project_id VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  state VARCHAR(100),
  district VARCHAR(100),
  constituency VARCHAR(100),
  category VARCHAR(100),
  sanctioned_amount DECIMAL(15, 2),
  estimated_cost DECIMAL(15, 2),
  actual_expenditure DECIMAL(15, 2),
  physical_progress INT,
  financial_progress INT,
  start_date DATE,
  expected_completion DATE,
  actual_completion DATE,
  implementing_agency VARCHAR(255),
  status ENUM('Completed', 'In Progress', 'Delayed', 'Pending', 'Under Verification') DEFAULT 'In Progress'
);

CREATE TABLE IF NOT EXISTS payments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  project_id VARCHAR(50) NOT NULL,
  payment_date DATE,
  amount DECIMAL(15, 2),
  payment_type VARCHAR(100),
  status VARCHAR(50),
  FOREIGN KEY (project_id) REFERENCES projects(project_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS anomalies (
  id INT AUTO_INCREMENT PRIMARY KEY,
  project_id VARCHAR(50) NOT NULL,
  anomaly_type VARCHAR(100),
  severity ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL'),
  description TEXT,
  score INT,
  detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status VARCHAR(50) DEFAULT 'Open',
  FOREIGN KEY (project_id) REFERENCES projects(project_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS risk_scores (
  id INT AUTO_INCREMENT PRIMARY KEY,
  project_id VARCHAR(50) UNIQUE NOT NULL,
  cost_overrun_score INT DEFAULT 0,
  delay_score INT DEFAULT 0,
  progress_mismatch_score INT DEFAULT 0,
  payment_anomaly_score INT DEFAULT 0,
  historical_deviation_score INT DEFAULT 0,
  duplicate_score INT DEFAULT 0,
  total_score INT DEFAULT 0,
  risk_level ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL'),
  FOREIGN KEY (project_id) REFERENCES projects(project_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS alerts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  project_id VARCHAR(50) NOT NULL,
  alert_type VARCHAR(100),
  severity ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL'),
  message TEXT,
  status VARCHAR(50) DEFAULT 'Pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  assigned_to VARCHAR(100),
  FOREIGN KEY (project_id) REFERENCES projects(project_id) ON DELETE CASCADE
);
