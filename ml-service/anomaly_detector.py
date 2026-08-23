import pandas as pd
import numpy as np
from sklearn.ensemble import IsolationForest

class AnomalyDetector:
    def __init__(self):
        # We use Isolation Forest for anomaly detection
        self.model = IsolationForest(contamination=0.1, random_state=42)

    def generate_risk_assessment(self, project_data):
        """
        Takes project data (dict or Series) and generates a risk score and explanation.
        """
        score = 0
        reasons = []

        # 1. Cost Overrun (max 25)
        sanctioned = float(project_data.get('sanctioned_amount') or 0)
        expenditure = float(project_data.get('actual_expenditure') or 0)
        
        if sanctioned > 0 and expenditure > sanctioned:
            overrun_pct = ((expenditure - sanctioned) / sanctioned) * 100
            score += min(25, int(overrun_pct))
            reasons.append(f"{int(overrun_pct)}% cost overrun")
        
        # 2. Progress Mismatch (max 20)
        fin_prog = float(project_data.get('financial_progress') or 0)
        phys_prog = float(project_data.get('physical_progress') or 0)
        
        if fin_prog > phys_prog + 10:  # Allow 10% variance
            mismatch = fin_prog - phys_prog
            score += min(20, int(mismatch))
            reasons.append(f"{int(mismatch)}% progress mismatch (Fin: {fin_prog}%, Phys: {phys_prog}%)")

        # 3. Delay Risk (max 20)
        # Simplified: If status is Delayed, add 18 points.
        status = project_data.get('status', '')
        if status == 'Delayed':
            score += 18
            reasons.append("Project is currently flagged as delayed")

        # Determine Risk Level
        if score <= 30:
            risk_level = "LOW"
        elif score <= 60:
            risk_level = "MEDIUM"
        elif score <= 80:
            risk_level = "HIGH"
        else:
            risk_level = "CRITICAL"

        recommendation = "Normal monitoring"
        if risk_level == "CRITICAL":
            recommendation = "Immediate district-level verification recommended."
        elif risk_level == "HIGH":
            recommendation = "Review financial records and seek clarification."

        return {
            "risk_score": score,
            "risk_level": risk_level,
            "reasons": reasons,
            "recommendation": recommendation
        }

    def train_and_predict(self, projects_df):
        """
        Trains Isolation Forest on batch project data and flags statistical anomalies.
        Expects a DataFrame with relevant numerical features.
        """
        features = ['sanctioned_amount', 'actual_expenditure', 'physical_progress', 'financial_progress']
        X = projects_df[features].fillna(0)
        
        # Fit model and predict (-1 for anomalies, 1 for normal)
        self.model.fit(X)
        predictions = self.model.predict(X)
        anomaly_scores = self.model.score_samples(X) # Lower score = more anomalous

        results = []
        for i, row in projects_df.iterrows():
            is_anomaly = predictions[i] == -1
            rule_based_result = self.generate_risk_assessment(row.to_dict())
            
            # Combine statistical anomaly with rule-based
            if is_anomaly and rule_based_result['risk_score'] < 60:
                rule_based_result['risk_score'] += 20
                rule_based_result['reasons'].append("Statistical spending pattern anomaly detected by ML model")
                
                # Re-evaluate risk level
                score = rule_based_result['risk_score']
                if score <= 30: rule_based_result['risk_level'] = "LOW"
                elif score <= 60: rule_based_result['risk_level'] = "MEDIUM"
                elif score <= 80: rule_based_result['risk_level'] = "HIGH"
                else: rule_based_result['risk_level'] = "CRITICAL"
                
            rule_based_result['project_id'] = str(row['project_id'])
            rule_based_result['is_statistical_anomaly'] = bool(is_anomaly)
            results.append(rule_based_result)
            
        return results
