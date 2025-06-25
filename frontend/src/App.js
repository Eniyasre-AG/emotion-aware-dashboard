import React, { useState, useRef, useEffect } from "react";
import axios from "axios";
import Webcam from "react-webcam";
import { Line } from "react-chartjs-2";
import { ToastContainer, toast } from "react-toastify";
import {
  Chart as ChartJS,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Legend,
  Tooltip,
} from "chart.js";
import "bootstrap/dist/css/bootstrap.min.css";
import "react-toastify/dist/ReactToastify.css";
import "./App.css";

ChartJS.register(LineElement, PointElement, LinearScale, CategoryScale, Legend, Tooltip);

const App = () => {
  const [temp, setTemp] = useState(0);
  const [humidity, setHumidity] = useState(0);
  const [emotion, setEmotion] = useState("neutral");
  const [suggestion, setSuggestion] = useState("");
  const [emotionLog, setEmotionLog] = useState([]);
  const [risk, setRisk] = useState("");
  const [darkMode, setDarkMode] = useState(false);
  const [csvLogs, setCsvLogs] = useState([]);

  const webcamRef = useRef(null);

  const emotionIcons = {
    happy: "😊",
    sad: "😢",
    angry: "😠",
    fear: "😨",
    surprise: "😲",
    neutral: "😐",
    disgust: "🤢",
  };

  useEffect(() => {
    const interval = setInterval(fetchEnvironment, 5000);
    fetchEnvironment();
    fetchCsvLogs();
    return () => clearInterval(interval);
  }, []);

  const generateSuggestion = (emo, t, h) => {
    if (emo === "sad" && t > 30) return "It's hot and you're sad. Try music and a cold drink.";
    if (emo === "happy") return "You're doing great!";
    if (emo === "angry") return "Take a deep breath. Maybe step outside.";
    if (emo === "fear") return "You're safe. Try grounding yourself.";
    return "All clear. Stay hydrated.";
  };

  const fetchEnvironment = () => {
    axios.get("http://localhost:5000/get_environment").then((res) => {
      setTemp(res.data.temp);
      setHumidity(res.data.humidity);
      setSuggestion(generateSuggestion(emotion, res.data.temp, res.data.humidity));
    });
  };

  const detectEmotion = () => {
    const shot = webcamRef.current.getScreenshot();
    if (!shot) return alert("Camera not ready");

    axios
      .post("http://localhost:5000/detect_emotion", { image: shot })
      .then((res) => {
        const detected = res.data.emotion;
        setEmotion(detected);
        setSuggestion(generateSuggestion(detected, temp, humidity));
        setEmotionLog((prev) => [...prev.slice(-9), { time: new Date().toLocaleTimeString(), value: detected }]);
        toast.success(`Detected Emotion: ${detected}`);
      })
      .catch((err) => {
        toast.error("Emotion detection failed.");
        console.error(err);
      });
  };

  const predictRisk = () => {
    axios
      .post("http://localhost:5000/predict_risk", { emotion, temp, humidity })
      .then((res) => {
        setRisk(res.data.risk);
        toast.warn(`⚠️ Predicted Risk: ${res.data.risk.toUpperCase()}`);
        fetchCsvLogs();
      })
      .catch((err) => {
        toast.error("Risk prediction failed.");
        console.error(err);
      });
  };

  const downloadReport = () => {
    axios.get("http://localhost:5000/generate_report", { responseType: "blob" }).then((res) => {
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.download = "Emotion_Report.pdf";
      document.body.appendChild(link);
      link.click();
    });
  };

  const fetchCsvLogs = () => {
    axios.get("http://localhost:5000/log_csv").then((res) => setCsvLogs(res.data));
  };

  const emotionMap = {
    angry: 1,
    disgust: 2,
    fear: 3,
    happy: 4,
    neutral: 5,
    sad: 6,
    surprise: 7,
  };

  const chartData = {
    labels: emotionLog.map((e) => e.time),
    datasets: [
      {
        label: "Emotion Trend",
        data: emotionLog.map((e) => emotionMap[e.value] || 0),
        borderColor: "#007bff",
        backgroundColor: "rgba(0,123,255,0.1)",
        tension: 0.4,
        fill: true,
      },
    ],
  };

  return (
  <div className={darkMode ? "bg-dark text-light" : ""}>
    <ToastContainer position="top-center" />
    <div className="container-fixed">
      <button
        onClick={() => setDarkMode(!darkMode)}
        className="btn btn-outline-light btn-sm float-end mb-2"
      >
        {darkMode ? "🌞 Light Mode" : "🌙 Dark Mode"}
      </button>
      <h1 className="text-center mb-4">🧠 Emotion-Aware Dashboard</h1>

      <div className="dashboard-grid">
        {/* Left Panel */}
        <div className="left-panel">
          <div className="card shadow-lg equal-height">
            <h5 className="text-primary">🌡️ Environment</h5>
            <button onClick={fetchEnvironment} className="btn btn-primary btn-sm mb-2">
              Refresh Env
            </button>
            <p>Temp: <strong>{temp} °C</strong></p>
            <p>Humidity: <strong>{humidity} %</strong></p>
          </div>

          <div className="card shadow-lg chart-container equal-height">
            <h5 className="text-primary">📊 Emotion Trend</h5>
            <Line data={chartData} />
          </div>
        </div>

        {/* Right Panel */}
        <div className="right-panel">
          <div className="card shadow-lg webcam-container equal-height text-center">
            <h5 className="text-primary">📸 Detect & Predict</h5>
            <Webcam
              audio={false}
              ref={webcamRef}
              screenshotFormat="image/jpeg"
              className="img-fluid border mb-2"
              videoConstraints={{ width: 400, height: 300, facingMode: "user" }}
            />
            <div className="button-row">
              <button onClick={detectEmotion} className="btn btn-success">Capture</button>
              <button onClick={predictRisk} className="btn btn-danger">Predict Risk</button>
              <button onClick={downloadReport} className="btn btn-secondary">Download PDF</button>
            </div>
            <h6>🧠 Emotion: {emotionIcons[emotion] || "🤖"} <strong>{emotion}</strong></h6>
            <h6>💡 Suggestion: {suggestion}</h6>
            {risk && <h6 className="text-warning">⚠️ Risk: <strong>{risk.toUpperCase()}</strong></h6>}
          </div>

          <div className="card shadow-lg equal-height">
            <h5 className="text-primary">📄 CSV Log Viewer</h5>
            <div className="table-responsive">
              <table className="table table-hover table-bordered">
                <thead className="table-dark">
                  <tr>
                    <th>Time</th>
                    <th>Emotion</th>
                    <th>Temp</th>
                    <th>Humidity</th>
                    <th>Risk</th>
                  </tr>
                </thead>
                <tbody>
                  {csvLogs.map((r, i) => (
                    <tr key={i}>
                      <td>{r.timestamp}</td>
                      <td>{r.emotion}</td>
                      <td>{r.temp}</td>
                      <td>{r.humidity}</td>
                      <td>{r.risk}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);
};
export default App;
