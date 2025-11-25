export const config = {
  openai: {
    apiKey: import.meta.env.VITE_OPENAI_API_KEY || "",
    model: "gpt-4o",
  },

  elevenlabs: {
    apiKey: import.meta.env.VITE_ELEVENLABS_API_KEY || "",
    voiceId: import.meta.env.VITE_ELEVENLABS_VOICE_ID || "EXAVITQu4vr4xnSDxMaL",
    modelId: "eleven_turbo_v2_5",
  },

  timing: {
    frameCaptureInterval: 6000, // How often to capture new frames (ms)
    minBufferClips: 1, // Minimum clips to keep buffered
    maxBufferClips: 2, // Maximum clips before dropping old ones
    crossfadeDuration: 500, // Crossfade between clips (ms)
    bufferCheckInterval: 1000, // How often to check buffer status (ms)
  },

  vision: {
    imageQuality: 0.8, // JPEG quality (0-1)
    imageDetail: "low", // 'low' for faster/cheaper, 'high' for detail
    maxTokens: 150, // Max tokens for scene description
  },
};

export function validateConfig() {
  const missing = [];

  if (!config.openai.apiKey) missing.push("VITE_OPENAI_API_KEY");
  if (!config.elevenlabs.apiKey) missing.push("VITE_ELEVENLABS_API_KEY");
  if (missing.length > 0) return false;

  return true;
}
