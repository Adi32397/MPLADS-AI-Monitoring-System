# CivicShield AI — MPLADS Monitoring & Intelligence Platform

This project is a highly convincing, production-style hackathon prototype for the MoSPI Problem Statement 26102. It uses AI, machine learning, and rule-based risk scoring to monitor MPLADS projects and identify financial anomalies.

## Architecture
The platform is built with a microservices-inspired architecture:
- **Frontend**: React.js with Vite, Tailwind CSS, Recharts.
- **Backend**: Node.js with Express.js and MySQL (fallback rule-based analysis).
- **ML Service**: Python with Flask, Pandas, and Scikit-learn (Isolation Forest).
- **Database**: MySQL.

## Setup Instructions

### 1. Database Setup (MySQL)
Ensure you have MySQL running on your local machine.
1. Start MySQL Server.
2. Ensure the credentials match the `backend/.env` file:
   - `DB_USER=root`
   - `DB_PASSWORD=` (Empty by default, change if you have a password)
3. Note: The backend will automatically create the `civicshield` database if it doesn't exist and the `npm run seed` command will populate it.

### 2. Backend Setup
1. Open a terminal and navigate to the `backend` directory.
2. Run `npm install` to install dependencies.
3. Run `npm run seed` to generate the demo database tables and seed data.
4. Run `npm start` (or `npm run dev`) to start the backend API on port 5000.

### 3. ML Service Setup (Optional but recommended)
1. Open a terminal and navigate to the `ml-service` directory.
2. Ensure you have Python installed.
3. Run `pip install -r requirements.txt`.
4. Run `python app.py` to start the Flask service on port 8000.

### 4. Frontend Setup
1. Open a terminal and navigate to the `frontend` directory.
2. Run `npm install` to install dependencies.
3. Run `npm run dev` to start the React application.
4. Open the provided localhost URL in your browser.

## Demo Credentials
Use these accounts to test the application:
- **District Authority**: `district.demo` (Password: `demo123`)
- **Ministry Official**: `ministry.demo` (Password: `demo123`)
- **Member of Parliament**: `mp.demo` (Password: `demo123`)

## Fallback Mode
If the backend or ML service is temporarily down, the frontend is built with a fallback behavior to load deterministic mock data, ensuring that your hackathon presentation flow is never interrupted.
