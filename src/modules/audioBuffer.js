/**
 * Audio Buffer Module
 * 
 * Manages continuous, gapless audio playback using Web Audio API.
 * Maintains a queue of audio clips and plays them sequentially.
 * 
 * Key concepts:
 * - Web Audio API: Low-level audio processing in browsers
 * - AudioContext: The audio processing graph
 * - AudioBufferSourceNode: One-shot audio playback
 * - Gain nodes: Volume control
 * - Queue management: Buffering ahead for smooth playback
 */

import { config } from '../utils/config.js';

class AudioBufferManager {
  constructor() {
    // Audio processing
    this.audioContext = null;
    this.gainNode = null;
    
    // Queue management
    this.queue = [];              // Array of prepared audio clips
    this.currentlyPlaying = null; // Currently playing clip info
    this.currentSource = null;    // Current AudioBufferSourceNode
    
    // State
    this.isPlaying = false;
    this.isPaused = false;
    this.isInitialized = false;
    
    // Callbacks for external listeners
    this.onClipStart = null;      // Called when a clip starts playing
    this.onClipEnd = null;        // Called when a clip finishes
    this.onBufferLow = null;      // Called when buffer needs more clips
    this.onBufferUpdate = null;   // Called when buffer status changes
    this.onError = null;          // Called on playback errors
  }

  /**
   * Initialize the Web Audio API context
   * MUST be called after a user interaction (click/tap)
   * 
   * Why? Browsers require user interaction before playing audio
   * to prevent annoying auto-playing websites.
   */
  async initialize() {
    if (this.isInitialized) return;
    
    // Create audio context (webkit prefix for older Safari)
    this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    
    // Create gain node for volume control
    this.gainNode = this.audioContext.createGain();
    this.gainNode.connect(this.audioContext.destination);
    
    // Resume context if suspended (required by some browsers)
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
    
    this.isInitialized = true;
    console.log('🎵 Audio context initialized');
  }

  /**
   * Add an audio clip to the playback queue
   * 
   * @param {AudioClip} clip - Audio clip from TTS module
   * 
   * The clip's blob is decoded into an AudioBuffer
   * which can be played by Web Audio API.
   */
  async addToQueue(clip) {
    if (!this.isInitialized) {
      throw new Error('Audio buffer not initialized. Call initialize() first.');
    }
    
    try {
      // Convert blob to ArrayBuffer
      const arrayBuffer = await clip.blob.arrayBuffer();
      
      // Decode to AudioBuffer (Web Audio API format)
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
      
      // Add to queue with all metadata
      this.queue.push({
        ...clip,
        audioBuffer,
        addedAt: Date.now(),
      });
      
      console.log(`📥 Queued clip (${clip.duration.toFixed(1)}s). Buffer: ${this.queue.length} clips`);
      
      // Notify listeners
      this.notifyBufferUpdate();
      
      // Trim queue if too long (drop oldest)
      while (this.queue.length > config.timing.maxBufferClips) {
        const dropped = this.queue.shift();
        console.log('📤 Dropped oldest clip from buffer');
      }
      
    } catch (error) {
      console.error('Failed to decode audio:', error);
      throw error;
    }
  }

  /**
   * Start continuous playback
   * Begins playing from the queue and continues until stopped
   */
  async play() {
    if (!this.isInitialized) {
      await this.initialize();
    }
    
    if (this.isPlaying && !this.isPaused) {
      console.log('Already playing');
      return;
    }
    
    // Resume audio context if suspended
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
    
    this.isPlaying = true;
    this.isPaused = false;
    console.log('▶️ Playback started');
    
    this.playNext();
  }

  /**
   * Play the next clip in the queue
   * This is the core playback loop
   */
  async playNext() {
    // Stop if not playing
    if (!this.isPlaying || this.isPaused) return;
    
    // Check if buffer is low - request more clips
    if (this.queue.length <= config.timing.minBufferClips) {
      console.log('⚠️ Buffer low, requesting more clips');
      this.onBufferLow?.();
    }
    
    // Wait if queue is empty
    if (this.queue.length === 0) {
      console.log('⏳ Buffer empty, waiting...');
      setTimeout(() => this.playNext(), 500);
      return;
    }
    
    // Get next clip from queue
    const clip = this.queue.shift();
    this.currentlyPlaying = clip;
    
    // Notify listeners that clip is starting
    this.onClipStart?.(clip);
    this.notifyBufferUpdate();
    
    // Create source node for this clip
    const source = this.audioContext.createBufferSource();
    source.buffer = clip.audioBuffer;
    source.connect(this.gainNode);
    this.currentSource = source;
    
    // Handle clip end
    source.onended = () => {
      this.currentSource = null;
      this.currentlyPlaying = null;
      
      // Notify listeners
      this.onClipEnd?.(clip);
      
      // Continue to next clip
      if (this.isPlaying && !this.isPaused) {
        this.playNext();
      }
    };
    
    // Start playback
    try {
      source.start(0);
      console.log(`🎵 Playing: "${clip.text.substring(0, 50)}..." (${clip.duration.toFixed(1)}s)`);
    } catch (error) {
      console.error('Playback error:', error);
      this.onError?.(error);
      // Try next clip
      this.playNext();
    }
  }

  /**
   * Pause playback
   * Stops current clip and saves position
   */
  pause() {
    if (!this.isPlaying) return;
    
    this.isPaused = true;
    
    // Stop current source
    if (this.currentSource) {
      try {
        this.currentSource.stop();
      } catch (e) {
        // Source might have already stopped
      }
      this.currentSource = null;
    }
    
    console.log('⏸️ Playback paused');
    this.notifyBufferUpdate();
  }

  /**
   * Resume playback after pause
   */
  resume() {
    if (!this.isPaused) return;
    
    this.isPaused = false;
    console.log('▶️ Playback resumed');
    this.playNext();
  }

  /**
   * Stop playback completely
   * Clears current playback but keeps queue
   */
  stop() {
    this.isPlaying = false;
    this.isPaused = false;
    
    if (this.currentSource) {
      try {
        this.currentSource.stop();
      } catch (e) {
        // Source might have already stopped
      }
      this.currentSource = null;
    }
    
    this.currentlyPlaying = null;
    console.log('⏹️ Playback stopped');
    this.notifyBufferUpdate();
  }

  /**
   * Set volume level
   * @param {number} level - Volume 0-1
   */
  setVolume(level) {
    if (this.gainNode) {
      // Clamp to valid range
      const volume = Math.max(0, Math.min(1, level));
      this.gainNode.gain.value = volume;
    }
  }

  /**
   * Get current volume
   * @returns {number} - Current volume 0-1
   */
  getVolume() {
    return this.gainNode?.gain.value ?? 1;
  }

  /**
   * Get total buffered duration
   * @returns {number} - Total seconds of audio in queue
   */
  getTotalBufferedSeconds() {
    return this.queue.reduce((total, clip) => total + clip.duration, 0);
  }

  /**
   * Get buffer status for UI display
   * @returns {BufferStatus}
   */
  getStatus() {
    return {
      queuedClips: this.queue.length,
      totalBufferedSeconds: this.getTotalBufferedSeconds(),
      isPlaying: this.isPlaying,
      isPaused: this.isPaused,
      currentlyPlaying: this.currentlyPlaying ? {
        text: this.currentlyPlaying.text,
        duration: this.currentlyPlaying.duration,
      } : null,
    };
  }

  /**
   * Clear the entire queue
   */
  clearQueue() {
    this.queue = [];
    console.log('🗑️ Queue cleared');
    this.notifyBufferUpdate();
  }

  /**
   * Notify listeners of buffer status change
   */
  notifyBufferUpdate() {
    this.onBufferUpdate?.(this.getStatus());
  }

  /**
   * Check if currently playing
   * @returns {boolean}
   */
  isCurrentlyPlaying() {
    return this.isPlaying && !this.isPaused && this.currentSource !== null;
  }
}

/**
 * @typedef {Object} BufferStatus
 * @property {number} queuedClips - Number of clips in queue
 * @property {number} totalBufferedSeconds - Total buffered duration
 * @property {boolean} isPlaying - Whether playback is active
 * @property {boolean} isPaused - Whether playback is paused
 * @property {Object|null} currentlyPlaying - Current clip info
 */

// Export singleton instance
export const audioBuffer = new AudioBufferManager();

