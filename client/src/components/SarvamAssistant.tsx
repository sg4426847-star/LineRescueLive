
import { useEffect, useMemo, useRef, useState } from "react";
import { AudioLines, Bot, Languages, Mic, Play, Send, Square, Sparkles, UploadCloud, Volume2 } from "lucide-react";
import { Panel, StatusPill } from "@/components/LineRescueShell";
import { DEFAULT_MANUFACTURING_SCENARIO, predictShortage } from "@/lib/manufacturing";

type SarvamStatus = { ok: boolean; mode: string; label: string; message: string; verifiedAt?: string };
export type Report = { component: string; quantity: string; issueType: string; location: string; urgency: string };

type LanguageOption = { code: string; label: string; native: string };

export const SAARAS_LANGUAGE_OPTIONS: LanguageOption[] = [
  { code: "unknown", label: "Auto Detect", native: "Auto" },
  { code: "hi-IN", label: "Hindi", native: "हिन्दी" },
  { code: "mr-IN", label: "Marathi", native: "मराठी" },
  { code: "ta-IN", label: "Tamil", native: "தமிழ்" },
  { code: "te-IN", label: "Telugu", native: "తెలుగు" },
  { code: "kn-IN", label: "Kannada", native: "ಕನ್ನಡ" },
  { code: "bn-IN", label: "Bengali", native: "বাংলা" },
  { code: "ml-IN", label: "Malayalam", native: "മലയാളം" },
  { code: "gu-IN", label: "Gujarati", native: "ગુજરાતી" },
  { code: "pa-IN", label: "Punjabi", native: "ਪੰਜਾਬੀ" },
  { code: "od-IN", label: "Odia", native: "ଓଡ଼ିଆ" },
  { code: "as-IN", label: "Assamese", native: "অসমীয়া" },
  { code: "ur-IN", label: "Urdu", native: "اردو" },
  { code: "ne-IN", label: "Nepali", native: "नेपाली" },
  { code: "kok-IN", label: "Konkani", native: "कोंकणी" },
  { code: "ks-IN", label: "Kashmiri", native: "कॉशुर" },
  { code: "sd-IN", label: "Sindhi", native: "سنڌी" },
  { code: "sa-IN", label: "Sanskrit", native: "संस्कृतम्" },
  { code: "sat-IN", label: "Santali", native: "ᱥᱟᱱᱛᱟᱲᱤ" },
  { code: "mni-IN", label: "Manipuri", native: "মৈতৈলোন্" },
  { code: "brx-IN", label: "Bodo", native: "बड़ो" },
  { code: "mai-IN", label: "Maithili", native: "मैथिली" },
  { code: "doi-IN", label: "Dogri", native: "डोगरी" },
  { code: "en-IN", label: "English", native: "English" },
];

export const BULBUL_LANGUAGE_OPTIONS = SAARAS_LANGUAGE_OPTIONS.filter(option =>
  ["en-IN", "hi-IN", "mr-IN", "ta-IN", "te-IN", "kn-IN", "bn-IN", "ml-IN", "gu-IN", "pa-IN", "od-IN"].includes(option.code)
);

const COMPONENT_NAMES = [
  "Battery Management System (BMS)",
  "Battery Modules",
  "Battery Enclosure",
  "Wiring Harness",
  "Cooling Plates"
];

const demoAnswer = (message: string, languageCode: string) => {
  const prediction = predictShortage(DEFAULT_MANUFACTURING_SCENARIO);
  const prefix = languageCode === "hi-IN" ? "डेमो मोड" : "Demo Mode";
  return `${prefix}: the illustrative Tata Nexon EV battery-pack line has ${prediction.transferable} transferable ${DEFAULT_MANUFACTURING_SCENARIO.component} under SafeStock guardrails. Current forecast risk is ${prediction.risk}. Your question was “${message}”. This is synthetic data; a planner makes the final decision.`;
};

export function parseReport(transcript: string): Report {
  const normalized = transcript.trim();
  const quantity = normalized.match(/\b(\d[\d,]*)\s*(?:units?|pieces?|pcs?|यूनिट|नग)\b/i)?.[1]?.replace(/,/g, "") ?? "120";
  const matchedComponent = COMPONENT_NAMES.find(component =>
    normalized.toLowerCase().includes(component.toLowerCase())
  );
  const component = matchedComponent ?? (
    /\b(?:component|module|part)\s*[:\-]?\s*([A-Za-z][A-Za-z0-9 ()-]{2,60})/i.exec(normalized)?.[1]?.replace(/[.,]$/, "") ?? "Battery Modules"
  );
  const location = /(?:at|near|from|location|plant|line)\s+([^.,;]+)/i.exec(normalized)?.[1]?.trim() ?? "Tata Nexon EV Battery Pack Assembly";
  const issueType = /quality|damaged|damage|गुणवत्ता|खराब/i.test(normalized)
    ? "Quality / damage"
    : /delay|late|देरी/i.test(normalized)
      ? "Supplier delay"
      : /missing|shortage|short|कम|कमी/i.test(normalized)
        ? "Shortage"
        : "Availability check";
  const urgency = /urgent|critical|immediately|तुरंत|आपात/i.test(normalized) ? "Urgent" : "Normal";

  return { component, quantity, issueType, location, urgency };
}

export function SarvamAssistant({
  focus = "all",
  onReport,
  onConnectionChange
}: {
  focus?: "all" | "chat" | "voice";
  onReport?: (report: Report) => void;
  onConnectionChange?: (connected: boolean) => void;
}) {
  const [status, setStatus] = useState<SarvamStatus | null>(null);
  const [inputLanguage, setInputLanguage] = useState("unknown");
  const [responseLanguage, setResponseLanguage] = useState("en-IN");
  const [message, setMessage] = useState("");
  const [answer, setAnswer] = useState("");
  const [chatMode, setChatMode] = useState("demo");
  const [sending, setSending] = useState(false);
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [detectedLanguage, setDetectedLanguage] = useState("");
  const [transcriptionMode, setTranscriptionMode] = useState<"none" | "connected_verified" | "demo" | "error">("none");
  const [report, setReport] = useState<Report | null>(null);
  const [reportConfirmed, setReportConfirmed] = useState(false);
  const [speakError, setSpeakError] = useState("");
  const [speaking, setSpeaking] = useState(false);
  const [speakSuccess, setSpeakSuccess] = useState("");
  const [audioUrl, setAudioUrl] = useState("");

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    fetch("/api/sarvam/status")
      .then(response => response.json())
      .then(nextStatus => {
        setStatus(nextStatus);
        onConnectionChange?.(nextStatus.mode === "connected_verified");
      })
      .catch(() => {
        setStatus({
          ok: false,
          mode: "demo",
          label: "Sarvam Demo Mode",
          message: "The Sarvam status endpoint could not be reached."
        });
        onConnectionChange?.(false);
      });
  }, [onConnectionChange]);

  const connected = status?.mode === "connected_verified";
  const prediction = useMemo(() => predictShortage(DEFAULT_MANUFACTURING_SCENARIO), []);
  const selectedInput = SAARAS_LANGUAGE_OPTIONS.find(option => option.code === inputLanguage);
  const selectedResponse = BULBUL_LANGUAGE_OPTIONS.find(option => option.code === responseLanguage);

  const askAssistant = async () => {
    const trimmed = message.trim();
    if (!trimmed || sending) return;

    setSending(true);
    setSpeakError("");
    setSpeakSuccess("");
    setAudioUrl("");

    try {
      const response = await fetch("/api/sarvam/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: trimmed, languageCode: responseLanguage })
      });

      const payload = await response.json();

      if (payload.ok) {
        setAnswer(payload.answer);
        setChatMode(payload.mode);
      } else {
        setAnswer(demoAnswer(trimmed, responseLanguage));
        setChatMode("demo");
      }

      const nextStatus = await fetch("/api/sarvam/status").then(result => result.json());
      setStatus(nextStatus);
      onConnectionChange?.(nextStatus.mode === "connected_verified");
    } catch {
      setAnswer(demoAnswer(trimmed, responseLanguage));
      setChatMode("demo");
    } finally {
      setSending(false);
    }
  };

  const startRecording = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setSpeakError("This browser does not expose microphone capture. Use the demo report or upload an audio file.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);

      chunksRef.current = [];
      recorder.ondataavailable = event => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach(track => track.stop());
        await transcribe(new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" }));
      };

      recorderRef.current = recorder;
      recorder.start();
      setRecording(true);
      setSpeakError("");
    } catch {
      setSpeakError("Microphone permission was not granted. No audio was sent.");
    }
  };

  const stopRecording = () => {
    recorderRef.current?.stop();
    setRecording(false);
  };

  const transcribe = async (blob: Blob) => {
    setTranscribing(true);

    const form = new FormData();
    form.append("file", blob, "shortage-report.webm");
    form.append("languageCode", inputLanguage);

    try {
      const response = await fetch("/api/sarvam/transcribe", {
        method: "POST",
        body: form
      });

      const payload = await response.json();

      if (payload.ok && payload.transcript) {
        setTranscript(payload.transcript);
        setDetectedLanguage(payload.languageCode || inputLanguage);
        setReport(parseReport(payload.transcript));
        setReportConfirmed(false);
        setTranscriptionMode(payload.mode === "connected_verified" ? "connected_verified" : "error");
      } else {
        setTranscriptionMode(payload.mode === "demo" ? "demo" : "error");
        setSpeakError(payload.message ?? "Sarvam transcription is unavailable.");
      }

      const nextStatus = await fetch("/api/sarvam/status").then(result => result.json());
      setStatus(nextStatus);
      onConnectionChange?.(nextStatus.mode === "connected_verified");
    } catch {
      setSpeakError("The transcription request could not be completed.");
    } finally {
      setTranscribing(false);
    }
  };

  const useDemoReport = () => {
    const sample = "Urgent shortage: Battery Modules, 120 units missing at Tata Nexon EV Battery Pack Assembly.";
    setTranscript(sample);
    setDetectedLanguage("demo");
    setTranscriptionMode("demo");
    setReport(parseReport(sample));
    setReportConfirmed(false);
    setSpeakError("");
  };

  const updateTranscript = (value: string) => {
    setTranscript(value);
    setReport(parseReport(value));
    setReportConfirmed(false);
  };

  const updateReport = (key: keyof Report, value: string) => {
    setReport(current => current ? { ...current, [key]: value } : current);
    setReportConfirmed(false);
  };

  const confirmReport = () => {
    if (report) {
      setReportConfirmed(true);
      onReport?.(report);
      setSpeakError("Shortage report confirmed for planner review. No production change was submitted.");
    }
  };

  const speakAnswer = async () => {
    if (!answer || speaking) return;

    setSpeaking(true);
    setSpeakError("");
    setSpeakSuccess("");
    setAudioUrl("");

    try {
      const response = await fetch("/api/sarvam/speak", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text: answer, languageCode: responseLanguage })
      });

      const payload = await response.json();

      if (!response.ok || !payload.ok || !payload.audioBase64) {
        setSpeakError(payload.message ?? "Speech generation failed.");
        return;
      }

      setAudioUrl(`data:${payload.mediaType || "audio/wav"};base64,${payload.audioBase64}`);
      setSpeakSuccess(`${selectedResponse?.label ?? "Selected language"} audio is ready. Click Play Audio.`);
    } catch {
      setSpeakError("Text-to-speech could not be completed.");
    } finally {
      setSpeaking(false);
    }
  };

  return (
    <div className="assistant-grid">
      <div className="assistant-language-bar">
        <div>
          <Languages size={15} />
          <strong>Worker input language</strong>
          <select value={inputLanguage} onChange={event => setInputLanguage(event.target.value)}>
            {SAARAS_LANGUAGE_OPTIONS.map(option => (
              <option key={option.code} value={option.code}>{option.label} · {option.native}</option>
            ))}
          </select>
          <small>Saaras v4 · 22 Indian languages + English · code-mix ready</small>
        </div>

        <div>
          <Volume2 size={15} />
          <strong>Response language</strong>
          <select value={responseLanguage} onChange={event => setResponseLanguage(event.target.value)}>
            {BULBUL_LANGUAGE_OPTIONS.map(option => (
              <option key={option.code} value={option.code}>{option.label} · {option.native}</option>
            ))}
          </select>
          <small>Bulbul v4 Flash · supported TTS languages only</small>
        </div>
      </div>

      {focus !== "voice" && (
        <Panel
          title="Multilingual production assistant"
          eyebrow="SARVAM AI · SAARAS + BULBUL"
          action={
            <StatusPill tone={connected ? "green" : "amber"}>
              <span>{status?.label ?? "Checking status"}</span>
            </StatusPill>
          }
        >
          <div className="assistant-status">
            <Sparkles size={15} />
            <span>{status?.message ?? "Checking server-side Sarvam configuration."}</span>
          </div>

          <div className="assistant-context">
            <span>Context attached</span>
            <strong>{DEFAULT_MANUFACTURING_SCENARIO.component} · {DEFAULT_MANUFACTURING_SCENARIO.line} · {prediction.risk} forecast</strong>
            <small>Synthetic demonstration data · deterministic SafeStock + forecast estimate</small>
          </div>

          <div className="assistant-input">
            <textarea
              value={message}
              onChange={event => setMessage(event.target.value)}
              placeholder={`Ask in ${selectedResponse?.label ?? "your selected language"} about a shortage, order, or recovery path…`}
              rows={3}
            />
            <button className="button button-primary" onClick={askAssistant} disabled={sending || !message.trim()}>
              {sending ? "Thinking…" : <><Send size={15} />Ask assistant</>}
            </button>
          </div>

          {answer && (
            <div className="assistant-answer">
              <div className="answer-heading">
                <Bot size={15} />
                <strong>{chatMode === "demo" ? "Demo explanation" : "Sarvam response"}</strong>
                <StatusPill tone={chatMode === "demo" ? "amber" : "green"}>
                  {chatMode === "demo" ? "Demo Mode" : "Connected"}
                </StatusPill>
              </div>

              <p>{answer}</p>

              <button className="text-button" onClick={speakAnswer} disabled={speaking}>
                <Play size={14} />
                {speaking ? "Generating audio…" : `Generate ${selectedResponse?.label ?? responseLanguage} audio`}
              </button>

              {audioUrl && (
                <audio
                  controls
                  src={audioUrl}
                  style={{ width: "100%", marginTop: "12px" }}
                />
              )}

              {speakSuccess && <div className="assistant-status">{speakSuccess}</div>}
              {speakError && <div className="assistant-error">{speakError}</div>}
            </div>
          )}
        </Panel>
      )}

      {focus !== "chat" && (
        <Panel title="Voice-based shortage reporting" eyebrow="WORKER INPUT · REVIEW + CONFIRM">
          <p className="panel-copy">
            Record naturally in any Saaras-supported Indian language or English. Auto Detect supports unknown and code-mixed speech. Review and edit the transcript and extracted fields before confirming a planner-ready report. No inventory mutation happens here.
          </p>

          <div className="voice-actions">
            {recording ? (
              <button className="button button-primary" onClick={stopRecording}>
                <Square size={15} />Stop and transcribe
              </button>
            ) : (
              <button className="button button-ghost" onClick={startRecording}>
                <Mic size={15} />Record shortage
              </button>
            )}

            <button className="button button-ghost" onClick={useDemoReport}>
              <UploadCloud size={15} />Use demo report
            </button>
          </div>

          {transcribing && (
            <div className="assistant-status">
              <AudioLines size={15} />Transcribing through Saaras v4 via the protected backend…
            </div>
          )}

          {transcript && (
            <div className="transcript-card">
              <span>
                Editable transcript {detectedLanguage ? `· detected ${detectedLanguage}` : ""}
                {transcriptionMode === "demo"
                  ? "· synthetic demo"
                  : transcriptionMode === "connected_verified"
                    ? "· Sarvam Saaras v4 verified · review required"
                    : transcriptionMode === "error"
                      ? "· transcription failed"
                      : ""}
              </span>
              <textarea value={transcript} onChange={event => updateTranscript(event.target.value)} rows={3} />
            </div>
          )}

          {report && (
            <div className="report-review">
              <label>
                <span>Component</span>
                <input value={report.component} onChange={event => updateReport("component", event.target.value)} />
              </label>
              <label>
                <span>Quantity</span>
                <input value={report.quantity} onChange={event => updateReport("quantity", event.target.value)} />
              </label>
              <label>
                <span>Issue type</span>
                <input value={report.issueType} onChange={event => updateReport("issueType", event.target.value)} />
              </label>
              <label>
                <span>Location</span>
                <input value={report.location} onChange={event => updateReport("location", event.target.value)} />
              </label>
              <label>
                <span>Urgency</span>
                <input value={report.urgency} onChange={event => updateReport("urgency", event.target.value)} />
              </label>

              <button className="button button-primary" onClick={confirmReport} disabled={reportConfirmed}>
                {reportConfirmed ? "Report confirmed" : "Confirm shortage report"}
              </button>
            </div>
          )}

          {speakError && <div className="assistant-error">{speakError}</div>}
        </Panel>
      )}
    </div>
  );
}
