/**
 * Text-to-Speech Module
 * 
 * Converts poetry text into spoken audio using ElevenLabs API.
 * Returns audio as blobs that can be played via Web Audio API.
 * 
 * Key concepts:
 * - Fetch API: Making HTTP requests to external services
 * - Blob: Binary large object for handling audio data
 * - Object URLs: Creating playable URLs from binary data
 * - Voice settings: Controlling speech characteristics
 */

import { config } from '../utils/config.js';

class TTSModule {
  constructor() {
    this.baseUrl = 'https://api.elevenlabs.io/v1';
    this.voiceId = config.elevenlabs.voiceId;
  }

  /**
   * Convert text to speech audio
   * 
   * @param {string} text - Text to convert to speech
   * @returns {Promise<AudioClip>} - Audio clip with blob and metadata
   * 
   * Voice settings explained:
   * - stability: Higher = more consistent, lower = more expressive
   * - similarity_boost: How closely to match the voice model
   * - style: Amount of stylistic variation (0 = neutral)
   */
  async synthesize(text) {
    const startTime = Date.now();
    
    try {
      const response = await fetch(
        `${this.baseUrl}/text-to-speech/${this.voiceId}`,
        {
          method: 'POST',
          headers: {
            'Accept': 'audio/mpeg',
            'Content-Type': 'application/json',
            'xi-api-key': config.elevenlabs.apiKey,
          },
          body: JSON.stringify({
            text: text,
            model_id: config.elevenlabs.modelId,
            voice_settings: {
              stability: 0.5,           // Balanced - not too robotic, not too wild
              similarity_boost: 0.75,   // Clear voice matching
              style: 0.3,               // Slight expressiveness for poetry
              use_speaker_boost: true,  // Enhanced clarity
            },
          }),
        }
      );

      // Handle API errors
      if (!response.ok) {
        const errorText = await response.text();
        
        if (response.status === 401) {
          throw new Error('Invalid ElevenLabs API key. Check your .env file.');
        } else if (response.status === 429) {
          throw new Error('ElevenLabs rate limit reached. Please wait.');
        } else if (response.status === 400) {
          throw new Error(`ElevenLabs error: ${errorText}`);
        }
        
        throw new Error(`TTS API error (${response.status}): ${errorText}`);
      }

      // Get audio as blob (binary data)
      const audioBlob = await response.blob();
      
      // Create a URL that can be used for playback
      const audioUrl = URL.createObjectURL(audioBlob);
      
      // Get audio duration by loading it
      const duration = await this.getAudioDuration(audioUrl);
      
      const latency = Date.now() - startTime;
      console.log(`🔊 TTS (${latency}ms): ${duration.toFixed(1)}s audio generated`);
      
      return {
        blob: audioBlob,
        url: audioUrl,
        duration,
        text,
        latency,
        timestamp: Date.now(),
      };
      
    } catch (error) {
      console.error('TTS error:', error);
      throw error;
    }
  }

  /**
   * Get duration of audio from URL
   * 
   * @param {string} audioUrl - Object URL for audio blob
   * @returns {Promise<number>} - Duration in seconds
   * 
   * We need to load the audio into an Audio element
   * to read its duration metadata.
   */
  getAudioDuration(audioUrl) {
    return new Promise((resolve, reject) => {
      const audio = new Audio(audioUrl);
      
      audio.addEventListener('loadedmetadata', () => {
        resolve(audio.duration);
      });
      
      audio.addEventListener('error', (e) => {
        reject(new Error('Failed to load audio metadata'));
      });
      
      // Timeout after 10 seconds
      setTimeout(() => reject(new Error('Audio load timeout')), 10000);
    });
  }

  /**
   * Get list of available voices
   * Useful for building a voice selection UI
   * 
   * @returns {Promise<Voice[]>} - Array of available voices
   */
  async getVoices() {
    try {
      const response = await fetch(`${this.baseUrl}/voices`, {
        headers: {
          'xi-api-key': config.elevenlabs.apiKey,
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch voices');
      }
      
      const data = await response.json();
      return data.voices.map(voice => ({
        id: voice.voice_id,
        name: voice.name,
        category: voice.category,
        description: voice.description,
        previewUrl: voice.preview_url,
      }));
      
    } catch (error) {
      console.error('Failed to fetch voices:', error);
      return [];
    }
  }

  /**
   * Change the voice used for synthesis
   * @param {string} voiceId - ElevenLabs voice ID
   */
  setVoice(voiceId) {
    this.voiceId = voiceId;
    console.log(`🎤 Voice changed to: ${voiceId}`);
  }

  /**
   * Get current voice ID
   * @returns {string}
   */
  getVoiceId() {
    return this.voiceId;
  }

  /**
   * Clean up object URLs to free memory
   * Call this when done with an audio clip
   * 
   * @param {string} url - Object URL to revoke
   */
  revokeUrl(url) {
    URL.revokeObjectURL(url);
  }
}

/**
 * @typedef {Object} AudioClip
 * @property {Blob} blob - Raw audio data
 * @property {string} url - Playable object URL
 * @property {number} duration - Duration in seconds
 * @property {string} text - Original text
 * @property {number} latency - API response time (ms)
 * @property {number} timestamp - When generated
 */

/**
 * @typedef {Object} Voice
 * @property {string} id - Voice ID
 * @property {string} name - Voice name
 * @property {string} category - Voice category
 * @property {string} description - Voice description
 * @property {string} previewUrl - URL to preview audio
 */

// Export singleton instance
export const tts = new TTSModule();

