import type { Express, Request, Response as ExpressResponse } from "express";
import multer from "multer";

const SARVAM_BASE_URL = "https://api.sarvam.ai";
const REQUEST_TIMEOUT_MS = 60_000;
const MAX_CHAT_CHARS = 2_000;
const MAX_SPEAK_CHARS = 2_000;
const MAX_AUDIO_BYTES = 12 * 1024 * 1024;

export const SAARAS_LANGUAGE_CODES = {
  auto: "unknown",
  hi: "hi-IN",
  bn: "bn-IN",
  kn: "kn-IN",
  ml: "ml-IN",
  mr: "mr-IN",
  od: "od-IN",
  pa: "pa-IN",
  ta: "ta-IN",
  te: "te-IN",
  en: "en-IN",
  gu: "gu-IN",
  as: "as-IN",
  ur: "ur-IN",
  ne: "ne-IN",
  kok: "kok-IN",
  ks: "ks-IN",
  sd: "sd-IN",
  sa: "sa-IN",
  sat: "sat-IN",
  mni: "mni-IN",
  brx: "brx-IN",
  mai: "mai-IN",
  doi: "doi-IN",
} as const;

export const BULBUL_LANGUAGE_CODES = {
  en: "en-IN",
  hi: "hi-IN",
  mr: "mr-IN",
  ta: "ta-IN",
  te: "te-IN",
  kn: "kn-IN",
  bn: "bn-IN",
  ml: "ml-IN",
  gu: "gu-IN",
  pa: "pa-IN",
  od: "od-IN",
} as const;

const SAARAS_ALLOWED = new Set(Object.values(SAARAS_LANGUAGE_CODES));
const BULBUL_ALLOWED = new Set(Object.values(BULBUL_LANGUAGE_CODES));
const BATTERY_KEYTERMS = ["Tata Nexon EV", "Battery Modules", "Battery Enclosure", "Wiring Harness", "Cooling Plates", "Battery Management System", "BMS", "Battery Pack Assembly", "Pune"];

let lastVerification: { verifiedAt: string; operation: string; httpStatus: number } | null = null;

function apiKey() {
  const value = process.env.SARVAM_API_KEY?.trim();
  return value && !value.startsWith("replace-me") ? value : undefined;
}

function authHeaders() {
  const key = apiKey() ?? "";
  return { "api-subscription-key": key, Authorization: `Bearer ${key}`, accept: "application/json" };
}

function errorMessage(payload: unknown, fallback: string) {
  if (payload && typeof payload === "object" && "error" in payload) {
    const error = (payload as { error?: unknown }).error;
    if (error && typeof error === "object" && "message" in error && typeof (error as { message?: unknown }).message === "string") {
      return (error as { message: string }).message;
    }
    if (typeof error === "string") return error;
  }
  return fallback;
}

async function readPayload(response: globalThis.Response) {
  const text = await response.text();
  if (!text) return null;
  try { return JSON.parse(text) as unknown; } catch { return text.slice(0, 4000); }
}

function safeUpstreamStatus(status: number) {
  if (status === 403) return "Sarvam rejected the API key or requested capability. Check the server-side key and account access.";
  if (status === 429) return "Sarvam rate limit reached. Wait and retry; no response was fabricated.";
  if (status >= 500) return "Sarvam is temporarily unavailable. Retry later or continue in Demo Mode.";
  return `Sarvam request failed with HTTP ${status}.`;
}

function demoResponse(res: ExpressResponse, operation: string) {
  return res.status(503).json({
    ok: false,
    mode: "demo",
    error: "SARVAM_NOT_CONFIGURED",
    message: `Demo Mode — configure SARVAM_API_KEY on the server before using ${operation}. No Sarvam success is being simulated.`,
  });
}

async function callSarvam(path: string, init: RequestInit, operation: string) {
  if (!apiKey()) throw new Error("SARVAM_NOT_CONFIGURED");
  const response = await fetch(`${SARVAM_BASE_URL}${path}`, {
    ...init,
    headers: { ...authHeaders(), ...(init.headers ?? {}) },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  const payload = await readPayload(response);
  if (!response.ok) {
    const error = new Error(safeUpstreamStatus(response.status));
    (error as Error & { status?: number; payload?: unknown }).status = response.status;
    (error as Error & { status?: number; payload?: unknown }).payload = payload;
    throw error;
  }
  lastVerification = { verifiedAt: new Date().toISOString(), operation, httpStatus: response.status };
  return { response, payload };
}

function sendAdapterError(res: ExpressResponse, error: unknown) {
  const typed = error as Error & { status?: number; payload?: unknown };
  if (typed.message === "SARVAM_NOT_CONFIGURED") return demoResponse(res, "this feature");
  const status = typed.status === 403 ? 403 : typed.status === 429 ? 429 : typed.status && typed.status >= 400 && typed.status < 500 ? 422 : 502;
  return res.status(status).json({ ok: false, mode: "error", error: "SARVAM_REQUEST_FAILED", message: typed.message || "Sarvam request failed.", upstream: typed.payload });
}

export function getSarvamStatus() {
  const configured = Boolean(apiKey());
  return lastVerification
    ? {
        ok: true,
        mode: "connected_verified" as const,
        label: "Sarvam Connected — Verified",
        message: `A real Sarvam ${lastVerification.operation} request succeeded during this server session.`,
        verifiedAt: lastVerification.verifiedAt,
        operation: lastVerification.operation,
        httpStatus: lastVerification.httpStatus,
      }
    : {
        ok: false,
        mode: configured ? "configured_pending_verification" as const : "demo" as const,
        label: configured ? "Sarvam Connection Not Verified" : "Sarvam Demo Mode",
        message: configured ? "A server-side key is present, but no successful Sarvam request has been verified in this session." : "No Sarvam API key is configured. The assistant remains in honest Demo Mode.",
      };
}

function scenarioContext() {
  return [
    "LineRescue AI is an independent prototype using synthetic demonstration data for an illustrative automobile assembly facility.",
    "The current synthetic case is an illustrative Tata Nexon EV battery-pack line in Pune, with Battery Modules as the primary signal and supporting Battery Enclosure, Wiring Harness, Cooling Plates, and BMS components.",
    "For Battery Modules, source on-hand is 860, reserved 180, committed 220, safety stock 300, proposed transfer 120, Bengaluru shortage 120, lead time 1 day, and required arrival 2 days. SafeStock transferable stock is max(0, on-hand - reserved - committed - safety stock) = 160 units.",
    "Never claim Tata Motors partnership, official affiliation, live plant inventory, live supplier data, or autonomous action. A human planner makes the final decision.",
  ].join(" ");
}

export async function sarvamChat(req: Request, res: ExpressResponse) {
  const message = typeof req.body?.message === "string" ? req.body.message.trim() : "";
  const languageCode = typeof req.body?.languageCode === "string" && BULBUL_ALLOWED.has(req.body.languageCode) ? req.body.languageCode : "en-IN";
  const language = languageCode === "hi-IN" ? "Hindi" : languageCode === "en-IN" ? "English" : `the selected Indian language (${languageCode})`;
  if (!message || message.length > MAX_CHAT_CHARS) return res.status(400).json({ ok: false, error: "INVALID_MESSAGE", message: `Message is required and must be under ${MAX_CHAT_CHARS} characters.` });
  try {
    const { payload } = await callSarvam("/v1/chat/completions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        model: "sarvam-105b",
          max_tokens: 3000,
          reasoning_effort: null,
          temperature: 0.2,
        messages: [
          { role: "system", content: `You are the LineRescue AI manufacturing assistant. Answer in ${language}. Be concise, explain calculations plainly, distinguish synthetic facts from estimates, and never claim live Tata Motors access or take action. Context: ${scenarioContext()}` },
          { role: "user", content: message },
        ],
      }),
    }, "chat");
    const content = payload && typeof payload === "object" && Array.isArray((payload as { choices?: unknown }).choices)
      ? ((payload as { choices: Array<{ message?: { content?: unknown } }> }).choices[0]?.message?.content ?? "")
      : "";
    return res.json({ ok: true, mode: "connected_verified", operation: "chat", answer: typeof content === "string" ? content : JSON.stringify(content), raw: payload });
  } catch (error) { return sendAdapterError(res, error); }
}

const upload = multer({ limits: { fileSize: MAX_AUDIO_BYTES }, storage: multer.memoryStorage() });
export const sarvamAudioUpload = upload.single("file");

export async function sarvamTranscribe(req: Request, res: ExpressResponse) {
  if (!req.file) return res.status(400).json({ ok: false, error: "AUDIO_FILE_REQUIRED", message: "Attach an audio file using the file field." });
  if (req.file.size === 0) return res.status(400).json({ ok: false, error: "AUDIO_FILE_EMPTY", message: "The uploaded audio file is empty." });
  try {
    if (!apiKey()) return demoResponse(res, "voice transcription");
    const requestedLanguage = typeof req.body?.languageCode === "string" && SAARAS_ALLOWED.has(req.body.languageCode) ? req.body.languageCode : "unknown";
    const form = new FormData();
    form.append("model", "saaras:v4");
    form.append("language_code", requestedLanguage);
    form.append("keyterms", JSON.stringify(BATTERY_KEYTERMS));
    form.append("file", new Blob([new Uint8Array(req.file.buffer)], { type: req.file.mimetype || "audio/wav" }), req.file.originalname || "shortage-report.wav");
    const { payload } = await callSarvam("/speech-to-text", { method: "POST", body: form }, "transcribe");
    const transcript = payload && typeof payload === "object" && typeof (payload as { transcript?: unknown }).transcript === "string" ? (payload as { transcript: string }).transcript : "";
    return res.json({ ok: true, mode: "connected_verified", operation: "transcribe", transcript, requestedLanguageCode: requestedLanguage, languageCode: payload && typeof payload === "object" ? (payload as { language_code?: unknown }).language_code : undefined, languageProbability: payload && typeof payload === "object" ? (payload as { language_probability?: unknown }).language_probability : undefined, raw: payload });
  } catch (error) { return sendAdapterError(res, error); }
}

export async function sarvamSpeak(req: Request, res: ExpressResponse) {
  const text = typeof req.body?.text === "string" ? req.body.text.trim() : "";
  const languageCode = typeof req.body?.languageCode === "string" && BULBUL_ALLOWED.has(req.body.languageCode) ? req.body.languageCode : "en-IN";
  if (!text || text.length > MAX_SPEAK_CHARS) return res.status(400).json({ ok: false, error: "INVALID_SPEECH_TEXT", message: `Text is required and must be under ${MAX_SPEAK_CHARS} characters.` });
  try {
    const { payload } = await callSarvam("/text-to-speech", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text, language_code: languageCode, model: "bulbul:v4-flash" }),
    }, "speak");
    const audios = payload && typeof payload === "object" && Array.isArray((payload as { audios?: unknown }).audios) ? (payload as { audios: unknown[] }).audios : [];
    return res.json({ ok: true, mode: "connected_verified", operation: "speak", audioBase64: audios.filter(audio => typeof audio === "string").join(""), mediaType: "audio/wav", raw: payload });
  } catch (error) { return sendAdapterError(res, error); }
}

export function registerSarvamRoutes(app: Express) {
  app.get("/api/sarvam/status", (_req, res) => res.json(getSarvamStatus()));
  app.post("/api/sarvam/chat", sarvamChat);
  app.post("/api/sarvam/transcribe", sarvamAudioUpload, sarvamTranscribe);
  app.post("/api/sarvam/speak", sarvamSpeak);
}

export function resetSarvamVerificationForTests() {
  lastVerification = null;
}

export const SARVAM_API_CONTRACT = {
  chat: { path: "/v1/chat/completions", model: "sarvam-105b" },
  transcribe: { path: "/speech-to-text", model: "saaras:v4", autoLanguageCode: "unknown", keyterms: true },
  speak: { path: "/text-to-speech", model: "bulbul:v4-flash", supportedLanguages: Object.values(BULBUL_LANGUAGE_CODES) },
} as const;


