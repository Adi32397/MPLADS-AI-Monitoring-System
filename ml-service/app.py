from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
from anomaly_detector import AnomalyDetector

app = Flask(__name__)
CORS(app)

detector = AnomalyDetector()

@app.route('/api/ml/analyze', methods=['POST'])
def analyze_projects():
    try:
        data = request.json
        if not data or not isinstance(data, list):
            return jsonify({"error": "Expected a list of projects in the request body"}), 400
            
        df = pd.DataFrame(data)
        
        # Require minimal features for prediction
        required_features = ['project_id', 'sanctioned_amount', 'actual_expenditure', 'physical_progress', 'financial_progress']
        missing = [f for f in required_features if f not in df.columns]
        if missing:
            return jsonify({"error": f"Missing required features: {missing}"}), 400
            
        results = detector.train_and_predict(df)
        return jsonify({"success": True, "data": results})
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/ml/analyze/single', methods=['POST'])
def analyze_single():
    try:
        data = request.json
        if not data:
            return jsonify({"error": "Expected project data"}), 400
            
        result = detector.generate_risk_assessment(data)
        return jsonify({"success": True, "data": result})
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "ok", "service": "CivicShield ML Service"})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8000, debug=True)
