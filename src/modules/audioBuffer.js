import { config } from "../utils/config.js";

class AudioBufferManager {
  constructor() {
    this.audioContext = null;
    this.gainNode = null;

    this.queue = [];
    this.currentlyPlaying = null;
    this.currentSource = null;

    this.isPlaying = false;
    this.isPaused = false;
    this.isInitialized = false;

    this.onClipStart = null;
    this.onClipEnd = null;
    this.onBufferLow = null;
    this.onBufferUpdate = null;
    this.onError = null;
  }

  async initialize() {
    if (this.isInitialized) return;

    // Create audio context (webkit prefix for older Safari)
    this.audioContext = new (window.AudioContext ||
      window.webkitAudioContext)();

    // Create gain node for volume control
    this.gainNode = this.audioContext.createGain();
    this.gainNode.connect(this.audioContext.destination);

    // Resume context if suspended (required by some browsers)
    if (this.audioContext.state === "suspended") {
      await this.audioContext.resume();
    }

    this.isInitialized = true;
    console.log("🎵 Audio context initialized");
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
      throw new Error("Audio buffer not initialized. Call initialize() first.");
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

      console.log(
        `📥 Queued clip (${clip.duration.toFixed(1)}s). Buffer: ${
          this.queue.length
        } clips`
      );

      // Notify listeners
      this.notifyBufferUpdate();

      // Trim queue if too long (drop oldest)
      while (this.queue.length > config.timing.maxBufferClips) {
        const dropped = this.queue.shift();
        console.log("📤 Dropped oldest clip from buffer");
      }
    } catch (error) {
      console.error("Failed to decode audio:", error);
      throw error;
    }
  }

  async play() {
    if (!this.isInitialized) await this.initialize();

    if (this.isPlaying && !this.isPaused) return;

    if (this.audioContext.state === "suspended") {
      await this.audioContext.resume();
    }

    this.isPlaying = true;
    this.isPaused = false;

    this.playNext();
  }

  async playNext() {
    if (!this.isPlaying || this.isPaused) return;

    if (this.queue.length <= config.timing.minBufferClips) {
      this.onBufferLow?.();
    }

    if (this.queue.length === 0) {
      setTimeout(() => this.playNext(), 500);
      return;
    }

    const clip = this.queue.shift();
    this.currentlyPlaying = clip;

    this.onClipStart?.(clip);
    this.notifyBufferUpdate();

    const source = this.audioContext.createBufferSource();
    source.buffer = clip.audioBuffer;
    source.connect(this.gainNode);
    this.currentSource = source;

    source.onended = () => {
      this.currentSource = null;
      this.currentlyPlaying = null;

      this.onClipEnd?.(clip);

      if (this.isPlaying && !this.isPaused) {
        this.playNext();
      }
    };

    // Start playback
    try {
      source.start(0);
    } catch (error) {
      console.error("Playback error:", error);
      this.onError?.(error);

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

    console.log("⏸️ Playback paused");
    this.notifyBufferUpdate();
  }

  /**
   * Resume playback after pause
   */
  resume() {
    if (!this.isPaused) return;

    this.isPaused = false;
    console.log("▶️ Playback resumed");
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
    console.log("⏹️ Playback stopped");
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

  getStatus() {
    return {
      queuedClips: this.queue.length,
      totalBufferedSeconds: this.getTotalBufferedSeconds(),
      isPlaying: this.isPlaying,
      isPaused: this.isPaused,
      currentlyPlaying: this.currentlyPlaying
        ? {
            text: this.currentlyPlaying.text,
            duration: this.currentlyPlaying.duration,
          }
        : null,
    };
  }

  /**
   * Clear the entire queue
   */
  clearQueue() {
    this.queue = [];
    console.log("🗑️ Queue cleared");
    this.notifyBufferUpdate();
  }

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

export const audioBuffer = new AudioBufferManager();
