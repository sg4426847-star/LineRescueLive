# Sarvam API implementation notes

The implementation uses official Sarvam REST documentation retrieved on 2026-11-06.

- Authentication: `api-subscription-key` header; API keys must remain server-side. HTTP 403 covers invalid/missing keys and forbidden requests.
  Source: https://docs.sarvam.ai/api-reference/authentication
- Chat Completion: `POST https://api.sarvam.ai/v1/chat/completions`, model `sarvam-105b`, OpenAI-compatible `messages` request.
  Source: https://docs.sarvam.ai/api/getting-started/quickstart
- Speech-to-Text REST: `POST https://api.sarvam.ai/speech-to-text`, multipart `file`, `model=saaras:v4`, `language_code`, and optional v4 `keyterms`. `unknown` enables automatic language detection. Saaras v4 supports English plus the 22 requested Indic languages, and the response returns the detected `language_code` and optional probability.
  Source: https://docs.sarvam.ai/api-reference/speech-to-text/transcribe and https://docs.sarvam.ai/api/api-guides-tutorials/speech-to-text/how-to/specify-language-codes
- Text-to-Speech: `POST https://api.sarvam.ai/text-to-speech`, JSON fields `text`, `language_code`, and `model=bulbul:v4-flash`; response contains base64 `audios`. The UI exposes only English plus the 10 supported Indian TTS languages.
  Source: https://docs.sarvam.ai/api-reference/text-to-speech/convert
- Current model overview: Saaras v4 is the recommended STT model, Bulbul v4 Flash is the recommended TTS model, and Sarvam-105B is an active chat model.
  Source: https://docs.sarvam.ai/api/getting-started/models
- Current reference pages: https://docs.sarvam.ai/api-reference/chat/chat-completions-v1, https://docs.sarvam.ai/api-reference/speech-to-text/transcribe, and https://docs.sarvam.ai/api-reference/text-to-speech/convert

The project does not claim live integration unless a real authorized request succeeds. Without `SARVAM_API_KEY`, the server returns Demo Mode / 503 and the frontend uses clearly labelled synthetic fallbacks.

The project contains contract and allowlist tests for all supported language codes, automatic detection, and the five Nexon EV battery-pack keyterms. No real audio-language verification is claimed in this environment because no authorized Sarvam key and test audio corpus were provided; language coverage should be promoted to verified only after live Saaras/Bulbul requests are exercised per language.
