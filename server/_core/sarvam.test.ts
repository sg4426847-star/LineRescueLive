import { afterEach, describe, expect, it, vi } from "vitest";
import { BULBUL_LANGUAGE_CODES, getSarvamStatus, resetSarvamVerificationForTests, SAARAS_LANGUAGE_CODES, SARVAM_API_CONTRACT, sarvamChat, sarvamSpeak, sarvamTranscribe } from "./sarvam";

afterEach(() => {
  vi.unstubAllEnvs();
  resetSarvamVerificationForTests();
});

describe("Sarvam adapter", () => {
  it("stays in Demo Mode without a server key", () => {
    vi.stubEnv("SARVAM_API_KEY", "");
    const status = getSarvamStatus();
    expect(status.mode).toBe("demo");
    expect(status.label).toBe("Sarvam Demo Mode");
    expect(status.ok).toBe(false);
  });

  it("uses the official current endpoint and model contract", () => {
    expect(SARVAM_API_CONTRACT.chat).toEqual({ path: "/v1/chat/completions", model: "sarvam-105b" });
    expect(SARVAM_API_CONTRACT.transcribe).toEqual({ path: "/speech-to-text", model: "saaras:v4", autoLanguageCode: "unknown", keyterms: true });
    expect(SARVAM_API_CONTRACT.speak.model).toBe("bulbul:v4-flash");
    expect(SAARAS_LANGUAGE_CODES.auto).toBe("unknown");
    expect(Object.keys(SAARAS_LANGUAGE_CODES)).toHaveLength(24);
    expect(Object.values(BULBUL_LANGUAGE_CODES)).toEqual(expect.arrayContaining(["en-IN", "hi-IN", "mr-IN", "ta-IN", "te-IN", "kn-IN", "bn-IN", "ml-IN", "gu-IN", "pa-IN", "od-IN"]));
    for (const code of ["hi-IN", "mr-IN", "kn-IN", "ta-IN", "te-IN"]) {
      expect(Object.values(SAARAS_LANGUAGE_CODES)).toContain(code);
      expect(Object.values(BULBUL_LANGUAGE_CODES)).toContain(code);
    }
  });

  it("returns an honest 503 instead of faking a chat response", async () => {
    vi.stubEnv("SARVAM_API_KEY", "");
    const response = { status: vi.fn().mockReturnThis(), json: vi.fn() } as any;
    await sarvamChat({ body: { message: "What is at risk?", language: "en" } } as any, response);
    expect(response.status).toHaveBeenCalledWith(503);
    expect(response.json).toHaveBeenCalledWith(expect.objectContaining({ ok: false, mode: "demo", error: "SARVAM_NOT_CONFIGURED" }));
  });

  it("sends authenticated Saaras and Bulbul requests through the backend", async () => {
    vi.stubEnv("SARVAM_API_KEY", "server-test-key");
    const calls: Array<{ url: string; init?: RequestInit }> = [];
    vi.stubGlobal("fetch", vi.fn(async (url: string, init?: RequestInit) => {
      calls.push({ url, init });
      return { ok: true, status: 200, text: async () => JSON.stringify(url.endsWith("speech-to-text") ? { transcript: "demo transcript", language_code: "hi-IN" } : { audios: ["base64-audio"] }) } as Response;
    }));
    const transcribeResponse = { status: vi.fn().mockReturnThis(), json: vi.fn() } as any;
    await sarvamTranscribe({ file: { size: 4, buffer: Buffer.from("wav"), mimetype: "audio/wav", originalname: "report.wav" }, body: { languageCode: "hi-IN" } } as any, transcribeResponse);
    const speakResponse = { status: vi.fn().mockReturnThis(), json: vi.fn() } as any;
    await sarvamSpeak({ body: { text: "Shortage confirmed", languageCode: "kn-IN" } } as any, speakResponse);

    expect(calls[0].url).toBe("https://api.sarvam.ai/speech-to-text");
    expect(calls[0].init?.headers).toMatchObject({ "api-subscription-key": "server-test-key", Authorization: "Bearer server-test-key" });
    expect(calls[1].url).toBe("https://api.sarvam.ai/text-to-speech");
    expect(JSON.parse(String(calls[1].init?.body))).toMatchObject({ text: "Shortage confirmed", language_code: "kn-IN", model: "bulbul:v4-flash" });
    expect(transcribeResponse.json).toHaveBeenCalledWith(expect.objectContaining({ ok: true, operation: "transcribe" }));
    expect(speakResponse.json).toHaveBeenCalledWith(expect.objectContaining({ ok: true, operation: "speak", audioBase64: "base64-audio" }));
  });
});
