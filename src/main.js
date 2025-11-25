import { camera } from "./modules/camera.js";
import { vision } from "./modules/vision.js";
import { poetry } from "./modules/poetry.js";
import { tts } from "./modules/tts.js";
import { audioBuffer } from "./modules/audioBuffer.js";
import { config, validateConfig } from "./utils/config.js";

class Mil4dy {
  constructor() {
    this.isRunning = false;
    this.isGenerating = false;
    this.generationLoop = null;

    this.stats = {
      clipsGenerated: 0,
      totalLatency: 0,
      errors: 0,
    };

    this.elements = {};
  }

  async initialize() {
    this.cacheElements();

    if (!validateConfig()) {
      this.showError("Missing API keys. Please check your .env file.");
      this.hideLoading();
      return false;
    }

    try {
      this.updateStatus("Accessing camera...");
      await camera.initialize(this.elements.cameraFeed);

      this.setupEventListeners();
      this.setupAudioCallbacks();

      // Ready!
      this.hideLoading();
      this.updateStatus("Ready");
      console.log('🎭 Mil4dy ready. Click "Begin" to start.');

      return true;
    } catch (error) {
      console.error("Initialization error:", error);
      this.showError(error.message);
      this.hideLoading();
      return false;
    }
  }

  cacheElements() {
    this.elements = {
      cameraFeed: document.getElementById("camera-feed"),
      poetryOverlay: document.getElementById("poetry-overlay"),
      startBtn: document.getElementById("start-btn"),
      bufferFill: document.getElementById("buffer-fill"),
      bufferText: document.getElementById("buffer-text"),
      volumeSlider: document.getElementById("volume-slider"),
      statusBar: document.getElementById("status-bar"),
      statusText: document.getElementById("status-text"),
      loadingOverlay: document.getElementById("loading-overlay"),
      loadingText: document.getElementById("loading-text"),
      errorToast: document.getElementById("error-toast"),
      errorMessage: document.getElementById("error-message"),
      errorDismiss: document.getElementById("error-dismiss"),
    };
  }

  setupEventListeners() {
    this.elements.startBtn.addEventListener("click", () => this.toggle());

    this.elements.volumeSlider.addEventListener("input", (e) => {
      audioBuffer.setVolume(e.target.value / 100);
    });

    this.elements.errorDismiss.addEventListener("click", () => {
      this.elements.errorToast.classList.add("hidden");
    });
  }

  setupAudioCallbacks() {
    audioBuffer.onClipStart = (clip) => this.displayPoetry(clip.text);

    audioBuffer.onBufferLow = () => {
      if (this.isRunning && !this.isGenerating) {
        this.generateClip();
      }
    };

    audioBuffer.onBufferUpdate = (status) => this.updateBufferUI(status);

    audioBuffer.onError = (error) => {
      console.error("Playback error:", error);
      this.stats.errors++;
    };
  }

  async toggle() {
    if (this.isRunning) {
      this.stop();
    } else {
      await this.start();
    }
  }

  async start() {
    this.isRunning = true;
    this.elements.startBtn.classList.add("playing");
    this.elements.statusBar.classList.add("active");

    try {
      await audioBuffer.initialize();

      // Show loading while building initial buffer
      this.updateStatus("Building buffer...");
      this.elements.statusBar.classList.add("generating");

      // Generate initial clips (build buffer)
      // We want 2-3 clips before starting playback
      await this.generateClip();
      await this.generateClip();

      // Start playback
      this.updateStatus("Playing");
      this.elements.statusBar.classList.remove("generating");
      audioBuffer.play();

      // Start the continuous generation loop
      this.startGenerationLoop();
    } catch (error) {
      console.error("Start error:", error);
      this.showError(error.message);
      this.stop();
    }
  }

  /**
   * Stop the poetry generation
   */
  stop() {
    console.log("🛑 Stopping...");

    this.isRunning = false;
    this.elements.startBtn.classList.remove("playing");
    this.elements.statusBar.classList.remove("active", "generating");

    // Stop the generation loop
    this.stopGenerationLoop();

    // Pause audio playback
    audioBuffer.pause();

    this.updateStatus("Paused");
  }

  /**
   * Start the continuous generation loop
   *
   * This checks the buffer periodically and generates new clips as needed.
   * The timing is crucial: we must stay ahead of playback.
   */
  startGenerationLoop() {
    // Check and generate at intervals
    this.generationLoop = setInterval(() => {
      const status = audioBuffer.getStatus();

      // Generate if buffer is getting low
      if (status.queuedClips < config.timing.minBufferClips + 1) {
        if (!this.isGenerating) {
          this.generateClip();
        }
      }
    }, config.timing.bufferCheckInterval);
  }

  /**
   * Stop the generation loop
   */
  stopGenerationLoop() {
    if (this.generationLoop) {
      clearInterval(this.generationLoop);
      this.generationLoop = null;
    }
  }

  /**
   * Generate a single poetry clip
   *
   * Pipeline: Camera → Vision → Poetry → TTS → Buffer
   *
   * This is the core creative pipeline.
   */
  async generateClip() {
    if (this.isGenerating) {
      console.log("⏳ Already generating, skipping...");
      return;
    }

    this.isGenerating = true;
    this.elements.statusBar.classList.add("generating");

    const startTime = Date.now();

    try {
      // Step 1: Capture camera frame
      console.log("📷 Capturing frame...");
      const frame = camera.captureFrame();

      // Step 2: Analyze scene with Vision API
      console.log("👁️ Analyzing scene...");
      const scene = await vision.analyzeFrame(frame);

      // Step 3: Generate poetry from description
      console.log("✨ Generating poetry...");
      const poem = await poetry.generate(scene.description);

      // Step 4: Convert to speech
      console.log("🔊 Synthesizing speech...");
      const audio = await tts.synthesize(poem.text);

      // Step 5: Add to playback buffer
      await audioBuffer.addToQueue(audio);

      // Update statistics
      const totalLatency = Date.now() - startTime;
      this.stats.clipsGenerated++;
      this.stats.totalLatency += totalLatency;

      console.log(
        `✅ Clip generated in ${totalLatency}ms (avg: ${Math.round(
          this.stats.totalLatency / this.stats.clipsGenerated
        )}ms)`
      );
    } catch (error) {
      console.error("❌ Generation error:", error);
      this.stats.errors++;

      // Show error but don't stop - try to continue
      if (this.stats.errors > 3) {
        this.showError("Multiple errors occurred. Check console for details.");
      }
    } finally {
      this.isGenerating = false;
      this.elements.statusBar.classList.remove("generating");
    }
  }

  /**
   * Display poetry on screen with animation
   *
   * @param {string} text - Poetry text to display
   */
  displayPoetry(text) {
    // Split into lines and wrap each in a <p> tag
    const lines = text.split("\n").filter((line) => line.trim());

    this.elements.poetryOverlay.innerHTML = lines
      .map((line) => `<p>${line}</p>`)
      .join("");
  }

  /**
   * Update buffer UI indicator
   *
   * @param {BufferStatus} status - Current buffer status
   */
  updateBufferUI(status) {
    // Update fill bar
    const percentage =
      (status.queuedClips / config.timing.maxBufferClips) * 100;
    this.elements.bufferFill.style.width = `${percentage}%`;

    // Update text
    if (status.isPlaying) {
      const seconds = status.totalBufferedSeconds.toFixed(0);
      this.elements.bufferText.textContent = `Buffer: ${seconds}s`;
    } else if (status.isPaused) {
      this.elements.bufferText.textContent = "Paused";
    } else {
      this.elements.bufferText.textContent = "Buffer: Empty";
    }
  }

  updateStatus(text) {
    this.elements.statusText.textContent = text;
  }

  showLoading(text = "Loading...") {
    this.elements.loadingText.textContent = text;
    this.elements.loadingOverlay.classList.remove("hidden");
  }

  hideLoading() {
    this.elements.loadingOverlay.classList.add("hidden");
  }

  showError(message) {
    this.elements.errorMessage.textContent = message;
    this.elements.errorToast.classList.remove("hidden");

    setTimeout(() => {
      this.elements.errorToast.classList.add("hidden");
    }, 5000);
  }

  getStats() {
    return {
      ...this.stats,
      averageLatency:
        this.stats.clipsGenerated > 0
          ? Math.round(this.stats.totalLatency / this.stats.clipsGenerated)
          : 0,
      bufferStatus: audioBuffer.getStatus(),
    };
  }
}

const app = new Mil4dy();

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => app.initialize());
} else {
  app.initialize();
}

window.mil4dy = app;
