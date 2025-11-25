/**
 * Application Configuration
 * 
 * All settings and API keys are centralized here.
 * Keys are loaded from environment variables (set in .env file)
 */

export const config = {
  // OpenAI API settings
  openai: {
    apiKey: import.meta.env.VITE_OPENAI_API_KEY || '',
    model: 'gpt-4o',
  },
  
  // ElevenLabs TTS settings
  elevenlabs: {
    apiKey: import.meta.env.VITE_ELEVENLABS_API_KEY || '',
    voiceId: import.meta.env.VITE_ELEVENLABS_VOICE_ID || 'EXAVITQu4vr4xnSDxMaL', // "Sarah" voice
    modelId: 'eleven_monolingual_v1',
  },
  
  // Timing configuration
  timing: {
    frameCaptureInterval: 6000,   // How often to capture new frames (ms)
    minBufferClips: 2,            // Minimum clips to keep buffered
    maxBufferClips: 5,            // Maximum clips before dropping old ones
    crossfadeDuration: 500,       // Crossfade between clips (ms)
    bufferCheckInterval: 1000,    // How often to check buffer status (ms)
  },
  
  // Poetry generation settings
  poetry: {
    targetDuration: 10,           // Target seconds per poetry clip
    maxLines: 8,                  // Maximum lines per generation
    minLines: 4,                  // Minimum lines per generation
  },
  
  // Vision analysis settings
  vision: {
    imageQuality: 0.8,            // JPEG quality (0-1)
    imageDetail: 'low',           // 'low' for faster/cheaper, 'high' for detail
    maxTokens: 150,               // Max tokens for scene description
  },
};

// Validate required API keys and warn if missing
export function validateConfig() {
  const missing = [];
  
  if (!config.openai.apiKey) {
    missing.push('VITE_OPENAI_API_KEY');
  }
  if (!config.elevenlabs.apiKey) {
    missing.push('VITE_ELEVENLABS_API_KEY');
  }
  
  if (missing.length > 0) {
    console.error('⚠️ Missing required environment variables:', missing.join(', '));
    console.error('Create a .env file with these variables. See .env.example for reference.');
    return false;
  }
  
  console.log('✅ Configuration validated');
  return true;
}

