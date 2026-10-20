import React, { useState, useRef, useEffect } from "react";
import { Mic, Loader2, Sparkles, Send, VolumeX, Globe, Radio, MessageCircle } from "lucide-react";
import VoiceVisualizer from "./VoiceVisualizer";

export default function VoiceAssistant() {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState("");
  const [detectedLang, setDetectedLang] = useState("ml"); // 'ml' | 'en'
  const [status, setStatus] = useState({
    type: "idle",
    text: "സംസാരിക്കാൻ മൈക്ക് അമർത്തൂ • Tap mic to start speaking",
    emotion: "warm",
  });
  const [inputText, setInputText] = useState("");
  const [voices, setVoices] = useState([]);

  const recognitionRef = useRef(null);
  const currentUtteranceRef = useRef(null);
  const currentAudioRef = useRef(null);
  const silenceTimerRef = useRef(null);
  const fullTranscriptRef = useRef("");
  const isListeningRef = useRef(false);
  const isLiveVoiceModeRef = useRef(false);

  // Load available speech synthesis voices (fixes Edge / Chrome audio output issues)
  useEffect(() => {
    if ("speechSynthesis" in window) {
      const updateVoices = () => {
        const availableVoices = window.speechSynthesis.getVoices();
        setVoices(availableVoices);
      };
      updateVoices();
      window.speechSynthesis.onvoiceschanged = updateVoices;
    }
  }, []);

  // Initialize Speech Recognition with Robust Bilingual Support
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setStatus({
        type: "error",
        text: "Speech Recognition is not supported on this browser. You can type below!",
        emotion: "neutral",
      });
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-IN"; // en-IN seamlessly captures both English and Malayalam loan/common words in Chrome/Edge

    recognition.onstart = () => {
      setIsListening(true);
      isListeningRef.current = true;
      fullTranscriptRef.current = "";
      setLiveTranscript("");
      setStatus({
        type: "listening",
        text: "കേൾക്കുന്നു... സംസാരിക്കൂ (Listening live... Speak now)",
        emotion: "warm",
      });
    };

    recognition.onresult = (event) => {
      let interim = "";
      let final = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const item = event.results[i];
        if (item.isFinal) {
          final += item[0].transcript + " ";
        } else {
          interim += item[0].transcript;
        }
      }

      if (final) {
        fullTranscriptRef.current += final;
      }

      const currentSpoken = (fullTranscriptRef.current + interim).trim();
      if (currentSpoken) {
        setLiveTranscript(currentSpoken);
        setStatus({
          type: "user",
          text: currentSpoken,
          emotion: "neutral",
        });

        // Fast Voice Activity Detection (700ms silence triggers ultra-fast auto-send)
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = setTimeout(() => {
          if (fullTranscriptRef.current.trim() || currentSpoken) {
            const queryToSend = (fullTranscriptRef.current || currentSpoken).trim();
            fullTranscriptRef.current = "";
            setLiveTranscript("");
            stopListeningCleanly();
            handleAIResponse(queryToSend);
          }
        }, 700);
      }
    };

    recognition.onerror = (event) => {
      if (event.error === "no-speech") return;

      if (event.error === "not-allowed") {
        setIsListening(false);
        isListeningRef.current = false;
        isLiveVoiceModeRef.current = false;
        setStatus({
          type: "error",
          text: "Microphone permission denied. Please allow mic access in browser.",
          emotion: "neutral",
        });
      } else if (event.error === "network") {
        if (isListeningRef.current) {
          try {
            recognition.stop();
            setTimeout(() => {
              if (isListeningRef.current) recognition.start();
            }, 200);
          } catch {
            // ignore
          }
        }
      }
    };

    recognition.onend = () => {
      if (isListeningRef.current) {
        try {
          recognition.start();
        } catch {
          setIsListening(false);
          isListeningRef.current = false;
        }
      } else {
        setIsListening(false);
      }
    };

    recognitionRef.current = recognition;

    return () => {
      isListeningRef.current = false;
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      try {
        recognition.stop();
      } catch {
        // ignore
      }
    };
  }, []);

  const stopListeningCleanly = () => {
    isListeningRef.current = false;
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    try {
      recognitionRef.current?.stop();
    } catch {
      // ignore
    }
    setIsListening(false);
  };

  const startListeningCleanly = () => {
    stopCurrentAudio();
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    fullTranscriptRef.current = "";
    setLiveTranscript("");
    isListeningRef.current = true;
    try {
      recognitionRef.current?.start();
      setIsListening(true);
    } catch {
      setIsListening(true);
    }
  };

  const toggleListening = () => {
    if (isSpeaking) {
      stopCurrentAudio();
      isLiveVoiceModeRef.current = true;
      startListeningCleanly();
      return;
    }

    if (isListening) {
      isLiveVoiceModeRef.current = false;
      stopListeningCleanly();
      if (liveTranscript) {
        handleAIResponse(liveTranscript);
        setLiveTranscript("");
      } else {
        setStatus({
          type: "idle",
          text: "മൈക്ക് നിർത്തി. സംസാരിക്കാൻ വീണ്ടും അമർത്തൂ (Tap mic to speak)",
          emotion: "warm",
        });
      }
    } else {
      isLiveVoiceModeRef.current = true;
      startListeningCleanly();
    }
  };

  const stopCurrentAudio = () => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    currentUtteranceRef.current = null;
    setIsSpeaking(false);
  };

  // Play Native Audio if provided by backend
  const playNativeAudio = (wavBase64) => {
    return new Promise((resolve, reject) => {
      try {
        stopCurrentAudio();
        const audio = new Audio("data:audio/wav;base64," + wavBase64);
        currentAudioRef.current = audio;

        audio.onplay = () => setIsSpeaking(true);
        audio.onended = () => {
          setIsSpeaking(false);
          currentAudioRef.current = null;
          resolve();
          if (isLiveVoiceModeRef.current) {
            startListeningCleanly();
          }
        };
        audio.onerror = (e) => {
          setIsSpeaking(false);
          currentAudioRef.current = null;
          reject(e);
        };
        audio.play().catch(reject);
      } catch (err) {
        reject(err);
      }
    });
  };

  // Ultra-Fast Browser Speech Synthesis with Human Voice Tuning for Edge & Chrome
  const speakTextSynthesis = (text, emotion = "warm", langCode = "ml") => {
    if (!("speechSynthesis" in window)) return;

    try {
      stopCurrentAudio();

      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }

      const cleanText = text.replace(/[*_#`~[\]()<>]/g, "").trim();
      if (!cleanText) return;

      const utterance = new SpeechSynthesisUtterance(cleanText);
      currentUtteranceRef.current = utterance;

      // Natural Human Emotional Tuning
      utterance.rate = 1.02;
      utterance.pitch = emotion === "happy" ? 1.08 : emotion === "caring" ? 0.94 : 1.0;

      // Robust Voice Matching for Malayalam and English across browsers (Edge/Chrome)
      const allVoices = voices.length > 0 ? voices : window.speechSynthesis.getVoices();
      if (langCode === "ml") {
        utterance.lang = "ml-IN";
        const mlVoice = allVoices.find(
          (v) =>
            v.lang.toLowerCase().includes("ml") ||
            v.name.toLowerCase().includes("malayalam") ||
            v.name.toLowerCase().includes("india"),
        );
        utterance.voice = mlVoice || allVoices[0] || null;
      } else {
        utterance.lang = "en-IN";
        const enVoice = allVoices.find(
          (v) =>
            v.lang.toLowerCase().includes("en") ||
            v.name.toLowerCase().includes("natural") ||
            v.name.toLowerCase().includes("india"),
        );
        utterance.voice = enVoice || allVoices[0] || null;
      }

      utterance.onstart = () => setIsSpeaking(true);

      utterance.onend = () => {
        setIsSpeaking(false);
        currentUtteranceRef.current = null;
        if (isLiveVoiceModeRef.current) {
          startListeningCleanly();
        }
      };

      utterance.onerror = () => {
        setIsSpeaking(false);
        currentUtteranceRef.current = null;
        if (isLiveVoiceModeRef.current) {
          startListeningCleanly();
        }
      };

      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.error("SpeechSynthesis error:", err);
      setIsSpeaking(false);
    }
  };

  // Fast AI Response Handler
  const handleAIResponse = async (userText) => {
    if (!userText || !userText.trim()) return;

    try {
      setIsProcessing(true);
      stopCurrentAudio();
      setStatus({
        type: "processing",
        text: "അഥർവ് AI ചിന്തിക്കുന്നു... (Thinking...)",
        emotion: "warm",
      });

      const API_URL =
        window.location.hostname === "localhost" ? "http://localhost:5000" : "https://ai-backend-1-m5n7.onrender.com";

      const res = await fetch(`${API_URL}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userText.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to get AI response");
      }

      const aiReply = data.reply || "എനിക്ക് മനസ്സിലായില്ല, ദയവായി വീണ്ടും പറയൂ.";
      const activeLang = data.detectedLanguage || "ml";
      const activeEmotion = data.emotion || "warm";

      setDetectedLang(activeLang);
      setStatus({
        type: "ai",
        text: aiReply,
        emotion: activeEmotion,
      });

      if (data.audio) {
        try {
          await playNativeAudio(data.audio);
        } catch {
          speakTextSynthesis(aiReply, activeEmotion, activeLang);
        }
      } else {
        speakTextSynthesis(aiReply, activeEmotion, activeLang);
      }
    } catch (err) {
      console.error("Chat error:", err);
      setStatus({
        type: "error",
        text: "സെർവർ കണക്ഷൻ ലഭ്യമല്ല. backend റൺ ചെയ്യുന്നുണ്ടെന്ന് ഉറപ്പാക്കുക.",
        emotion: "neutral",
      });
      if (isLiveVoiceModeRef.current) {
        setTimeout(startListeningCleanly, 1500);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSubmitText = (e) => {
    e.preventDefault();
    if (!inputText.trim() || isProcessing) return;
    const msg = inputText.trim();
    setInputText("");
    setStatus({
      type: "user",
      text: msg,
      emotion: "neutral",
    });
    handleAIResponse(msg);
  };

  return (
    <div className="assistant-card">
      {/* Header Section */}
      <div className="header-section">
        <div className="header-badge">
          <div className="pulsing-dot"></div>
          <span>ATHARV LIVE VOICE AI</span>
          <Sparkles style={{ width: "13px", height: "13px", color: "#60a5fa" }} />
        </div>

        <h1 className="title-text">Atharv Voice AI</h1>
        <p className="subtitle-text">Natural Bilingual Voice Assistant (Malayalam & English)</p>

        {/* Auto Language Status Bar */}
        <div className="auto-detect-bar">
          <div className="auto-detect-pill">
            <Radio style={{ width: "14px", height: "14px", color: "#38bdf8", animation: "dotPulse 1.5s infinite" }} />
            <span>Auto Language Detect Active</span>
          </div>

          <div className={`detected-lang-chip ${detectedLang}`}>
            <Globe style={{ width: "13px", height: "13px" }} />
            <span>{detectedLang === "en" ? "English" : "മലയാളം (Malayalam)"}</span>
          </div>

          {isSpeaking && (
            <button type="button" onClick={stopCurrentAudio} className="stop-audio-btn" title="Stop audio playback">
              <VolumeX style={{ width: "14px", height: "14px" }} />
              <span>Stop Audio</span>
            </button>
          )}
        </div>
      </div>

      {/* Visualizer Sphere */}
      <VoiceVisualizer isConnected={isListening || isSpeaking} isSpeaking={isSpeaking} />

      {/* Controls & Status */}
      <div className="controls-center">
        {/* Dynamic Status Card */}
        <div className="status-card">
          <div style={{ display: "flex", flexDirection: "column", gap: "6px", width: "100%" }}>
            <p className="status-text">
              {status.type === "listening" && (
                <span style={{ color: "#ef4444", fontWeight: 700 }}>
                  ● ലൈവായി കേൾക്കുന്നു... സംസാരിക്കൂ (Listening live...)
                </span>
              )}
              {status.type === "processing" && <span style={{ color: "#38bdf8", fontWeight: 600 }}>{status.text}</span>}
              {status.type === "user" && (
                <>
                  <span className="user-badge">You: </span>
                  <span style={{ color: "#ffffff" }}>"{status.text}"</span>
                </>
              )}
              {status.type === "ai" && (
                <>
                  <span className="ai-badge">Atharv AI: </span>
                  <span style={{ color: "#ffffff", fontSize: "1.05rem" }}>"{status.text}"</span>
                </>
              )}
              {status.type === "error" && <span style={{ color: "#f87171", fontWeight: 600 }}>{status.text}</span>}
              {status.type === "idle" && <span style={{ color: "#cbd5e1" }}>{status.text}</span>}
            </p>
          </div>
        </div>

        {/* Central Glowing Mic Button */}
        <button
          onClick={toggleListening}
          disabled={isProcessing}
          className={`mic-action-btn ${
            isListening ? "mic-btn-listening" : isSpeaking ? "mic-btn-speaking" : "mic-btn-idle"
          }`}
          aria-label={isListening ? "Stop listening" : "Start speaking"}
          title={
            isListening
              ? "Listening live... Tap to pause"
              : isSpeaking
                ? "Speaking... Tap to interrupt"
                : "Tap to speak live"
          }
        >
          {isProcessing ? (
            <Loader2 className="spin-anim" style={{ width: "36px", height: "36px", color: "#ffffff" }} />
          ) : isListening ? (
            <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <div className="sound-bar"></div>
              <div className="sound-bar"></div>
              <div className="sound-bar"></div>
              <div className="sound-bar"></div>
              <div className="sound-bar"></div>
            </div>
          ) : isSpeaking ? (
            <VolumeX style={{ width: "36px", height: "36px", color: "#ffffff" }} />
          ) : (
            <Mic style={{ width: "36px", height: "36px", color: "#ffffff" }} />
          )}
        </button>

        <p className="mic-hint-text">
          {isListening
            ? "🔴 സംസാരിച്ചുകൊണ്ടിരിക്കൂ (Live listening... pause to send)"
            : isSpeaking
              ? "🔊 സംസാരിക്കുന്നു... (Tap mic to interrupt)"
              : isProcessing
                ? "ചിന്തിക്കുന്നു... (Processing response...)"
                : "മൈക്ക് അമർത്തി സംസാരിക്കൂ (Tap mic for hands-free live chat)"}
        </p>

        {/* Text Input Option */}
        <form onSubmit={handleSubmitText} className="input-form">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Type in Malayalam or English (ഉദാ: സുഖമാണോ? / How are you?)..."
            disabled={isProcessing}
            className="chat-input"
          />
          <button type="submit" disabled={isProcessing || !inputText.trim()} className="send-btn" title="Send text">
            <Send style={{ width: "18px", height: "18px" }} />
          </button>
        </form>

        <p className="footer-text">Auto Bilingual Malayalam & English AI • Ultra-Fast Real-Time Voice</p>
      </div>
    </div>
  );
}
