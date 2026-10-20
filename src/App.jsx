import React from "react";
import VoiceAssistant from "./components/VoiceAssistant";
import "./App.css";

export default function App() {
  return (
    <div className="app-container">
      {/* Background ambient lighting */}
      <div className="ambient-glow-1"></div>
      <div className="ambient-glow-2"></div>
      
      {/* Main Voice Assistant Card */}
      <VoiceAssistant />
    </div>
  );
}
