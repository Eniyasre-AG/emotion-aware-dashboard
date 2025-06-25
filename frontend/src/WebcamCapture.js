import React, { useRef, useState } from "react";
import Webcam from "react-webcam";
import axios from "axios";

function WebcamCapture({ onEmotionDetected }) {
  const webcamRef = useRef(null);
  const [capturing, setCapturing] = useState(false);

  const captureAndSend = async () => {
    setCapturing(true);
    const imageSrc = webcamRef.current.getScreenshot();

    try {
      const res = await axios.post("http://localhost:5000/analyze_emotion", {
        image: imageSrc
      });

      onEmotionDetected(res.data.emotion);
    } catch (error) {
      console.error("Error analyzing emotion:", error);
      onEmotionDetected("unknown");
    } finally {
      setCapturing(false);
    }
  };

  return (
    <div>
      <Webcam
        audio={false}
        ref={webcamRef}
        screenshotFormat="image/jpeg"
        width={300}
      />
      <br />
      <button onClick={captureAndSend} disabled={capturing}>
        {capturing ? "Analyzing..." : "Capture Emotion"}
      </button>
    </div>
  );
}

export default WebcamCapture;
