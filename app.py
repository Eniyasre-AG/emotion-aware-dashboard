from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import random, base64, cv2, csv, os, pickle
import numpy as np
from datetime import datetime
from deepface import DeepFace
from fpdf import FPDF

app = Flask(__name__)
CORS(app)

# Load ML risk model
risk_model = pickle.load(open('risk_model.pkl','rb'))
risk_labels = pickle.load(open('risk_labels.pkl','rb'))
emotion_labels = pickle.load(open('emotion_labels.pkl','rb'))
emotion_reverse = {v:k for k,v in emotion_labels.items()}

@app.route('/')
def home():
    return "SENSE360 Server Running"

@app.route('/get_environment')
def get_env_data():
    return jsonify({"temp": round(random.uniform(24,36),2),
                    "humidity": round(random.uniform(40,85),2)})

@app.route('/detect_emotion', methods=['POST'])
def detect_emotion():
    try:
        img_data = request.json['image']
        _, encoded = img_data.split(",",1)
        img_bytes = base64.b64decode(encoded)
        arr = np.frombuffer(img_bytes, np.uint8)
        img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
        res = DeepFace.analyze(img, actions=["emotion"], enforce_detection=False)
        return jsonify({"emotion": res[0]['dominant_emotion']})
    except Exception as e:
        return jsonify({"emotion": "error", "error":str(e)})

@app.route('/predict_risk', methods=['POST'])
def predict_risk():
    data = request.json
    emo = data['emotion']
    t = float(data['temp'])
    h = float(data['humidity'])
    code = emotion_reverse.get(emo,0)
    pred = risk_model.predict([[code,t,h]])[0]
    r = risk_labels[pred]
    log_risk(emo,t,h,r)
    return jsonify({"risk": r})

def log_risk(emo,t,h,r):
    with open('log.csv','a', newline='') as f:
        csv.writer(f).writerow([datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                                 emo, t, h, r])

@app.route('/log_csv')
def log_csv():
    logs=[]
    if os.path.exists('log.csv'):
        with open('log.csv') as f:
            for line in f:
                ts,emo,t,h,r = line.strip().split(',')
                logs.append({"timestamp":ts,"emotion":emo,"temp":t,"humidity":h,"risk":r})
    return jsonify(logs)

@app.route('/generate_report')
def generate_report():
    pdf = FPDF(); pdf.add_page(); pdf.set_font("Arial",size=12)
    pdf.cell(200,10,txt="Emotion & Environment Report",ln=1,align='C')
    pdf.ln(5)
    if os.path.exists('log.csv'):
        with open('log.csv') as f:
            for line in f:
                pdf.cell(200,8,txt=line.strip(),ln=1)
    else:
        pdf.cell(200,8,txt="No logs found.",ln=1)
    pdf_path="report.pdf"
    pdf.output(pdf_path)
    return send_file(pdf_path, as_attachment=True)

if __name__=='__main__':
    app.run(debug=True)
