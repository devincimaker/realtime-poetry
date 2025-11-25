# Implementation Plan: Mil4dy Camera-Reactive Poetry Generator

This guide walks you through building the poetry generator step-by-step. Each phase builds on the previous one, with clear milestones and testing checkpoints.

---

## Overview

```
Phase 0: Project Setup                    [~1 hour]
Phase 1: Camera Input Module              [~2-3 hours]
Phase 2: Vision API Integration           [~2-3 hours]
Phase 3: Poetry Generation Pipeline       [~2-3 hours]
Phase 4: Text-to-Speech Integration       [~2-3 hours]
Phase 5: Audio Buffer & Playback System   [~4-6 hours]
Phase 6: UI & Visual Design               [~4-6 hours]
Phase 7: Integration & Polish             [~4-6 hours]
                                          ─────────────
                                Total:    ~3-4 days focused work
```

---

## Phase 0: Project Setup

### Goal

Set up a modern frontend project with the tooling we'll need.

### Steps

#### 0.1 Initialize Vite Project

```bash
# Create a new Vite project with vanilla JS
npm create vite@latest mil4dy-app -- --template vanilla

# Navigate into it
cd mil4dy-app

# Install dependencies
npm install
```

**Why Vite?** It's fast, has hot module reloading, and handles modern JS well. Perfect for rapid iteration.

#### 0.2 Install Dependencies

```bash
# API clients
npm install openai

# Environment variable handling
npm install dotenv
```

#### 0.3 Project Structure

Create this folder structure:

```
mil4dy-app/
├── src/
│   ├── modules/
│   │   ├── camera.js         # Camera capture
│   │   ├── vision.js         # Scene description (GPT-4o Vision)
│   │   ├── poetry.js         # Poetry generation (GPT-4o)
│   │   ├── tts.js            # Text-to-speech (ElevenLabs)
│   │   └── audioBuffer.js    # Audio queue management
│   ├── utils/
│   │   └── config.js         # Configuration & constants
│   ├── main.js               # Entry point & orchestration
│   └── style.css             # Styles
├── index.html
├── .env                      # API keys (DO NOT COMMIT)
└── .env.example              # Template for .env
```

#### 0.4 Environment Setup

Create `.env.example`:

```env
VITE_OPENAI_API_KEY=your_openai_key_here
VITE_ELEVENLABS_API_KEY=your_elevenlabs_key_here
```

Create `.env` with your actual keys (add to `.gitignore`).

#### 0.5 Basic HTML Shell

Update `index.html`:

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Mil4dy - Poetry Generator</title>
    <link rel="stylesheet" href="/src/style.css" />
  </head>
  <body>
    <div id="app">
      <video id="camera-feed" autoplay playsinline muted></video>
      <div id="poetry-overlay"></div>
      <div id="controls">
        <button id="start-btn">Start</button>
        <div id="buffer-indicator"></div>
      </div>
    </div>
    <script type="module" src="/src/main.js"></script>
  </body>
</html>
```

### Checkpoint ✅

- [ ] `npm run dev` starts the dev server
- [ ] Page loads without errors
- [ ] You see the basic HTML structure

---

## Phase 1: Camera Input Module

### Goal

Capture video from the webcam and extract frames as base64 images.

### Steps

#### 1.1 Create the Camera Module

Create `src/modules/camera.js`:

```javascript
/**
 * Camera Module
 * Handles webcam access and frame capture
 */

class CameraModule {
  constructor() {
    this.videoElement = null;
    this.stream = null;
    this.canvas = document.createElement("canvas");
    this.ctx = this.canvas.getContext("2d");
  }

  /**
   * Initialize camera access
   * @param {HTMLVideoElement} videoElement - The video element to display feed
   */
  async initialize(videoElement) {
    this.videoElement = videoElement;

    try {
      // Request camera access
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: "user", // Front camera
        },
        audio: false,
      });

      // Connect stream to video element
      this.videoElement.srcObject = this.stream;

      // Wait for video to be ready
      await new Promise((resolve) => {
        this.videoElement.onloadedmetadata = () => {
          this.canvas.width = this.videoElement.videoWidth;
          this.canvas.height = this.videoElement.videoHeight;
          resolve();
        };
      });

      console.log("📷 Camera initialized");
      return true;
    } catch (error) {
      console.error("Camera access denied:", error);
      throw new Error("Camera access is required for this app to work.");
    }
  }

  /**
   * Capture current frame as base64 JPEG
   * @returns {string} Base64 encoded image (without data URL prefix)
   */
  captureFrame() {
    if (!this.videoElement || !this.stream) {
      throw new Error("Camera not initialized");
    }

    // Draw current video frame to canvas
    this.ctx.drawImage(
      this.videoElement,
      0,
      0,
      this.canvas.width,
      this.canvas.height
    );

    // Convert to base64 JPEG (quality 0.8 for smaller size)
    const dataUrl = this.canvas.toDataURL("image/jpeg", 0.8);

    // Remove the "data:image/jpeg;base64," prefix
    const base64 = dataUrl.split(",")[1];

    return base64;
  }

  /**
   * Stop camera stream
   */
  stop() {
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
      console.log("📷 Camera stopped");
    }
  }
}

// Export singleton instance
export const camera = new CameraModule();
```

#### 1.2 Test the Camera Module

Update `src/main.js` temporarily to test:

```javascript
import { camera } from "./modules/camera.js";

async function init() {
  const videoElement = document.getElementById("camera-feed");

  try {
    await camera.initialize(videoElement);
    console.log("Camera ready!");

    // Test frame capture after 2 seconds
    setTimeout(() => {
      const frame = camera.captureFrame();
      console.log("Captured frame, length:", frame.length, "chars");
      // You should see a large base64 string in console
    }, 2000);
  } catch (error) {
    console.error("Failed to init camera:", error);
  }
}

init();
```

### Key Learning Points 📚

1. **`getUserMedia`** is the Web API for accessing camera/microphone
2. **Canvas** is used to capture video frames as images
3. **Base64 encoding** lets us send images as text to APIs
4. The **quality parameter** (0.8) in `toDataURL` balances size vs. quality

### Checkpoint ✅

- [ ] Camera permission prompt appears
- [ ] Video feed shows in the browser
- [ ] Console shows captured frame base64 length (~50,000-100,000 chars)

---

## Phase 2: Vision API Integration

### Goal

Send camera frames to GPT-4o Vision and get scene descriptions.

### Steps

#### 2.1 Create Configuration

Create `src/utils/config.js`:

```javascript
/**
 * Application Configuration
 */

export const config = {
  // API Keys (loaded from environment)
  openai: {
    apiKey: import.meta.env.VITE_OPENAI_API_KEY,
    model: "gpt-4o",
  },
  elevenlabs: {
    apiKey: import.meta.env.VITE_ELEVENLABS_API_KEY,
    voiceId: "EXAVITQu4vr4xnSDxMaL", // "Sarah" - warm, clear voice
  },

  // Timing settings
  timing: {
    frameCaptureInterval: 6000, // Capture new frame every 6 seconds
    minBufferClips: 2, // Minimum clips to keep buffered
    maxBufferClips: 5, // Maximum clips before dropping old ones
    crossfadeDuration: 500, // Milliseconds of crossfade between clips
  },

  // Poetry settings
  poetry: {
    targetDuration: 10, // Target seconds per poetry clip
    maxLines: 8, // Maximum lines per generation
  },
};

// Validate required keys
if (!config.openai.apiKey) {
  console.error("⚠️ Missing VITE_OPENAI_API_KEY in .env");
}
if (!config.elevenlabs.apiKey) {
  console.error("⚠️ Missing VITE_ELEVENLABS_API_KEY in .env");
}
```

#### 2.2 Create Vision Module

Create `src/modules/vision.js`:

```javascript
/**
 * Vision Module
 * Analyzes camera frames using GPT-4o Vision
 */

import OpenAI from "openai";
import { config } from "../utils/config.js";

class VisionModule {
  constructor() {
    this.client = new OpenAI({
      apiKey: config.openai.apiKey,
      dangerouslyAllowBrowser: true, // Note: In production, use a backend proxy
    });
  }

  /**
   * Analyze a frame and return a scene description
   * @param {string} imageBase64 - Base64 encoded image
   * @returns {Promise<object>} Scene description object
   */
  async analyzeFrame(imageBase64) {
    const startTime = Date.now();

    try {
      const response = await this.client.chat.completions.create({
        model: config.openai.model,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `You are an observant poet's eye. Describe what you see in this image in 2-3 sentences.

Focus on:
- The main subject or action
- Notable details that could inspire reflection
- The mood or atmosphere

Be specific and evocative, but concise. This description will inspire poetry.`,
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${imageBase64}`,
                  detail: "low", // Use 'low' for faster, cheaper processing
                },
              },
            ],
          },
        ],
        max_tokens: 150,
      });

      const description = response.choices[0].message.content;
      const latency = Date.now() - startTime;

      console.log(`👁️ Vision analysis complete (${latency}ms):`, description);

      return {
        description,
        timestamp: Date.now(),
        latency,
      };
    } catch (error) {
      console.error("Vision API error:", error);
      throw error;
    }
  }
}

export const vision = new VisionModule();
```

#### 2.3 Test Vision + Camera Together

Update `src/main.js`:

```javascript
import { camera } from "./modules/camera.js";
import { vision } from "./modules/vision.js";

async function init() {
  const videoElement = document.getElementById("camera-feed");

  try {
    await camera.initialize(videoElement);
    console.log("Camera ready!");

    // Test the full flow after 2 seconds
    setTimeout(async () => {
      console.log("Capturing frame...");
      const frame = camera.captureFrame();

      console.log("Sending to Vision API...");
      const scene = await vision.analyzeFrame(frame);

      console.log("Scene description:", scene.description);
    }, 2000);
  } catch (error) {
    console.error("Error:", error);
  }
}

init();
```

### Key Learning Points 📚

1. **`dangerouslyAllowBrowser: true`** - We're calling OpenAI directly from the browser. In production, you'd proxy through a backend to hide your API key.
2. **`detail: 'low'`** - GPT-4o Vision has detail levels. 'low' is faster and cheaper, good for our use case.
3. **Token limits** - We cap at 150 tokens to keep descriptions concise and costs low.

### Checkpoint ✅

- [ ] No API key errors in console
- [ ] After 2 seconds, you see a scene description in console
- [ ] Description accurately reflects what camera sees
- [ ] Latency is under 3 seconds

---

## Phase 3: Poetry Generation Pipeline

### Goal

Transform scene descriptions into meaningful poetry.

### Steps

#### 3.1 Create Poetry Module

Create `src/modules/poetry.js`:

```javascript
/**
 * Poetry Module
 * Generates contemplative poetry from scene descriptions
 */

import OpenAI from "openai";
import { config } from "../utils/config.js";

class PoetryModule {
  constructor() {
    this.client = new OpenAI({
      apiKey: config.openai.apiKey,
      dangerouslyAllowBrowser: true,
    });

    // Keep track of previous lines for continuity
    this.previousLines = [];
    this.maxPreviousLines = 12; // Keep last ~3 stanzas
  }

  /**
   * Generate poetry from a scene description
   * @param {string} sceneDescription - What the camera sees
   * @returns {Promise<object>} Poetry object with text and metadata
   */
  async generate(sceneDescription) {
    const startTime = Date.now();

    const systemPrompt = `You are a contemplative poet who finds meaning in ordinary moments.

Your style:
- Begin with observation, end with meaning
- Find love, lessons, or beauty in the mundane
- Use accessible, flowing language
- Avoid clichés; find fresh perspectives
- Create natural rhythms (not strict meter)

The poetry will be spoken aloud, so:
- Use natural pause points (line breaks)
- Avoid tongue-twisters
- 4-8 lines per response
- Each stanza should feel complete yet connected to a larger journey`;

    const previousContext =
      this.previousLines.length > 0
        ? `\n\nPrevious verses (for continuity):\n${this.previousLines.join(
            "\n"
          )}`
        : "";

    try {
      const response = await this.client.chat.completions.create({
        model: config.openai.model,
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `What I see: ${sceneDescription}${previousContext}\n\nWrite the next verses.`,
          },
        ],
        max_tokens: 200,
        temperature: 0.8, // Slightly creative
      });

      const poetry = response.choices[0].message.content.trim();
      const latency = Date.now() - startTime;

      // Update context for next generation
      this.addToHistory(poetry);

      console.log(`✨ Poetry generated (${latency}ms):\n${poetry}`);

      return {
        text: poetry,
        timestamp: Date.now(),
        latency,
        lineCount: poetry.split("\n").filter((l) => l.trim()).length,
      };
    } catch (error) {
      console.error("Poetry generation error:", error);
      throw error;
    }
  }

  /**
   * Add poetry to history for continuity
   */
  addToHistory(poetry) {
    const lines = poetry.split("\n").filter((l) => l.trim());
    this.previousLines.push(...lines);

    // Keep only recent history
    if (this.previousLines.length > this.maxPreviousLines) {
      this.previousLines = this.previousLines.slice(-this.maxPreviousLines);
    }
  }

  /**
   * Clear history (for starting fresh)
   */
  clearHistory() {
    this.previousLines = [];
  }
}

export const poetry = new PoetryModule();
```

#### 3.2 Test the Full Pipeline (Camera → Vision → Poetry)

Update `src/main.js`:

```javascript
import { camera } from "./modules/camera.js";
import { vision } from "./modules/vision.js";
import { poetry } from "./modules/poetry.js";

async function generatePoetryFromCamera() {
  console.log("📷 Capturing frame...");
  const frame = camera.captureFrame();

  console.log("👁️ Analyzing scene...");
  const scene = await vision.analyzeFrame(frame);

  console.log("✨ Generating poetry...");
  const poem = await poetry.generate(scene.description);

  return { scene, poem };
}

async function init() {
  const videoElement = document.getElementById("camera-feed");

  try {
    await camera.initialize(videoElement);
    console.log("Camera ready!");

    // Generate poetry once after 2 seconds
    setTimeout(async () => {
      const result = await generatePoetryFromCamera();
      console.log("\n=== RESULT ===");
      console.log("Scene:", result.scene.description);
      console.log("Poetry:\n", result.poem.text);
    }, 2000);
  } catch (error) {
    console.error("Error:", error);
  }
}

init();
```

### Key Learning Points 📚

1. **Context/History** - We keep previous lines to maintain thematic continuity
2. **Temperature** - 0.8 gives creative but not random output
3. **System prompts** - Define the "personality" and constraints of the AI
4. **Prompt engineering** - Being specific about style, length, and purpose improves output

### Checkpoint ✅

- [ ] Poetry generates from scene description
- [ ] Poetry is 4-8 lines
- [ ] Poetry reflects what the camera sees
- [ ] Total latency (vision + poetry) is under 5 seconds

---

## Phase 4: Text-to-Speech Integration

### Goal

Convert generated poetry into spoken audio using ElevenLabs.

### Steps

#### 4.1 Create TTS Module

Create `src/modules/tts.js`:

```javascript
/**
 * TTS Module
 * Converts text to speech using ElevenLabs API
 */

import { config } from "../utils/config.js";

class TTSModule {
  constructor() {
    this.apiKey = config.elevenlabs.apiKey;
    this.voiceId = config.elevenlabs.voiceId;
    this.baseUrl = "https://api.elevenlabs.io/v1";
  }

  /**
   * Convert text to speech
   * @param {string} text - Text to convert
   * @returns {Promise<object>} Audio clip object with blob and duration
   */
  async synthesize(text) {
    const startTime = Date.now();

    try {
      const response = await fetch(
        `${this.baseUrl}/text-to-speech/${this.voiceId}`,
        {
          method: "POST",
          headers: {
            Accept: "audio/mpeg",
            "Content-Type": "application/json",
            "xi-api-key": this.apiKey,
          },
          body: JSON.stringify({
            text: text,
            model_id: "eleven_monolingual_v1",
            voice_settings: {
              stability: 0.5, // Balanced stability
              similarity_boost: 0.75, // Clear voice matching
              style: 0.4, // Some expressiveness
              use_speaker_boost: true,
            },
          }),
        }
      );

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`ElevenLabs API error: ${error}`);
      }

      // Get audio as blob
      const audioBlob = await response.blob();

      // Create object URL for playback
      const audioUrl = URL.createObjectURL(audioBlob);

      // Get duration by loading into audio element
      const duration = await this.getAudioDuration(audioUrl);

      const latency = Date.now() - startTime;
      console.log(
        `🔊 TTS complete (${latency}ms), duration: ${duration.toFixed(1)}s`
      );

      return {
        blob: audioBlob,
        url: audioUrl,
        duration,
        text,
        latency,
        timestamp: Date.now(),
      };
    } catch (error) {
      console.error("TTS error:", error);
      throw error;
    }
  }

  /**
   * Get duration of audio file
   */
  getAudioDuration(audioUrl) {
    return new Promise((resolve, reject) => {
      const audio = new Audio(audioUrl);
      audio.addEventListener("loadedmetadata", () => {
        resolve(audio.duration);
      });
      audio.addEventListener("error", reject);
    });
  }

  /**
   * List available voices (useful for selection UI later)
   */
  async getVoices() {
    try {
      const response = await fetch(`${this.baseUrl}/voices`, {
        headers: { "xi-api-key": this.apiKey },
      });
      const data = await response.json();
      return data.voices;
    } catch (error) {
      console.error("Failed to fetch voices:", error);
      return [];
    }
  }

  /**
   * Change voice
   */
  setVoice(voiceId) {
    this.voiceId = voiceId;
    console.log(`🎤 Voice changed to: ${voiceId}`);
  }
}

export const tts = new TTSModule();
```

#### 4.2 Test Full Pipeline (Camera → Vision → Poetry → TTS)

Update `src/main.js`:

```javascript
import { camera } from "./modules/camera.js";
import { vision } from "./modules/vision.js";
import { poetry } from "./modules/poetry.js";
import { tts } from "./modules/tts.js";

async function generateAndSpeak() {
  console.log("📷 Capturing frame...");
  const frame = camera.captureFrame();

  console.log("👁️ Analyzing scene...");
  const scene = await vision.analyzeFrame(frame);

  console.log("✨ Generating poetry...");
  const poem = await poetry.generate(scene.description);

  console.log("🔊 Synthesizing speech...");
  const audio = await tts.synthesize(poem.text);

  // Play the audio
  const audioElement = new Audio(audio.url);
  audioElement.play();

  console.log("\n=== COMPLETE ===");
  console.log(
    "Total pipeline time:",
    scene.latency + poem.latency + audio.latency,
    "ms"
  );

  return { scene, poem, audio };
}

async function init() {
  const videoElement = document.getElementById("camera-feed");

  // Add click handler for start button (needed for audio playback)
  document.getElementById("start-btn").addEventListener("click", async () => {
    await generateAndSpeak();
  });

  try {
    await camera.initialize(videoElement);
    console.log('Camera ready! Click "Start" to generate poetry.');
  } catch (error) {
    console.error("Error:", error);
  }
}

init();
```

### Key Learning Points 📚

1. **Audio playback requires user interaction** - Browsers block autoplay; we need a button click first
2. **Blob URLs** - `URL.createObjectURL()` creates a playable URL from binary data
3. **Voice settings** - Stability, similarity, and style control the voice characteristics
4. **Cleanup** - In production, call `URL.revokeObjectURL()` when done to free memory

### Checkpoint ✅

- [ ] Click "Start" triggers the full pipeline
- [ ] You hear the poetry spoken aloud
- [ ] Audio quality is clear and natural
- [ ] Total time from click to audio is under 10 seconds

---

## Phase 5: Audio Buffer & Playback System

### Goal

Create a buffer system that generates poetry ahead of time, ensuring continuous playback.

### Steps

#### 5.1 Create Audio Buffer Module

Create `src/modules/audioBuffer.js`:

```javascript
/**
 * Audio Buffer Module
 * Manages continuous, gapless audio playback
 */

import { config } from "../utils/config.js";

class AudioBufferManager {
  constructor() {
    this.queue = []; // Array of audio clips
    this.currentlyPlaying = null; // Currently playing clip
    this.isPlaying = false;
    this.audioContext = null; // Web Audio API context
    this.gainNode = null; // For volume control

    // Callbacks
    this.onClipStart = null; // Called when a clip starts playing
    this.onClipEnd = null; // Called when a clip ends
    this.onBufferLow = null; // Called when buffer needs more clips
    this.onBufferUpdate = null; // Called when buffer status changes
  }

  /**
   * Initialize audio context (must be called after user interaction)
   */
  async initialize() {
    this.audioContext = new (window.AudioContext ||
      window.webkitAudioContext)();
    this.gainNode = this.audioContext.createGain();
    this.gainNode.connect(this.audioContext.destination);
    console.log("🎵 Audio context initialized");
  }

  /**
   * Add a clip to the queue
   * @param {object} clip - Audio clip from TTS module
   */
  async addToQueue(clip) {
    // Decode audio data for Web Audio API
    const arrayBuffer = await clip.blob.arrayBuffer();
    const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);

    this.queue.push({
      ...clip,
      audioBuffer,
    });

    console.log(
      `📥 Added to queue. Buffer: ${
        this.queue.length
      } clips (${this.getTotalBufferedSeconds().toFixed(1)}s)`
    );

    this.notifyBufferUpdate();

    // Trim queue if too long
    while (this.queue.length > config.timing.maxBufferClips) {
      const dropped = this.queue.shift();
      console.log("📤 Dropped old clip from buffer");
    }
  }

  /**
   * Start continuous playback
   */
  async play() {
    if (this.isPlaying) return;

    this.isPlaying = true;
    console.log("▶️ Playback started");

    this.playNext();
  }

  /**
   * Play the next clip in queue
   */
  async playNext() {
    if (!this.isPlaying) return;

    // Check if we need more clips
    if (this.queue.length <= config.timing.minBufferClips) {
      this.onBufferLow?.();
    }

    // Wait if queue is empty
    if (this.queue.length === 0) {
      console.log("⏳ Buffer empty, waiting for clips...");
      setTimeout(() => this.playNext(), 500);
      return;
    }

    // Get next clip
    const clip = this.queue.shift();
    this.currentlyPlaying = clip;

    // Notify listeners
    this.onClipStart?.(clip);
    this.notifyBufferUpdate();

    // Create audio source
    const source = this.audioContext.createBufferSource();
    source.buffer = clip.audioBuffer;
    source.connect(this.gainNode);

    // Handle clip end
    source.onended = () => {
      this.onClipEnd?.(clip);
      this.currentlyPlaying = null;

      // Play next clip
      if (this.isPlaying) {
        this.playNext();
      }
    };

    // Start playback
    source.start();
    console.log(`🎵 Playing clip (${clip.duration.toFixed(1)}s)`);
  }

  /**
   * Pause playback
   */
  pause() {
    this.isPlaying = false;
    console.log("⏸️ Playback paused");
  }

  /**
   * Get total buffered seconds
   */
  getTotalBufferedSeconds() {
    return this.queue.reduce((total, clip) => total + clip.duration, 0);
  }

  /**
   * Get buffer status
   */
  getStatus() {
    return {
      queuedClips: this.queue.length,
      totalBufferedSeconds: this.getTotalBufferedSeconds(),
      isPlaying: this.isPlaying,
      currentlyPlaying: this.currentlyPlaying,
    };
  }

  /**
   * Set volume (0-1)
   */
  setVolume(level) {
    if (this.gainNode) {
      this.gainNode.gain.value = Math.max(0, Math.min(1, level));
    }
  }

  /**
   * Notify buffer update
   */
  notifyBufferUpdate() {
    this.onBufferUpdate?.(this.getStatus());
  }

  /**
   * Clear queue
   */
  clear() {
    this.queue = [];
    this.notifyBufferUpdate();
  }
}

export const audioBuffer = new AudioBufferManager();
```

#### 5.2 Create the Orchestrator

Update `src/main.js` to orchestrate everything:

```javascript
/**
 * Main Orchestrator
 * Coordinates all modules for continuous poetry generation
 */

import { camera } from "./modules/camera.js";
import { vision } from "./modules/vision.js";
import { poetry } from "./modules/poetry.js";
import { tts } from "./modules/tts.js";
import { audioBuffer } from "./modules/audioBuffer.js";
import { config } from "./utils/config.js";

class Mil4dy {
  constructor() {
    this.isRunning = false;
    this.isGenerating = false;
    this.generateInterval = null;

    // DOM elements
    this.videoElement = null;
    this.poetryOverlay = null;
    this.startBtn = null;
    this.bufferIndicator = null;
  }

  async initialize() {
    // Get DOM elements
    this.videoElement = document.getElementById("camera-feed");
    this.poetryOverlay = document.getElementById("poetry-overlay");
    this.startBtn = document.getElementById("start-btn");
    this.bufferIndicator = document.getElementById("buffer-indicator");

    // Initialize camera
    await camera.initialize(this.videoElement);

    // Set up audio buffer callbacks
    audioBuffer.onClipStart = (clip) => this.displayPoetry(clip.text);
    audioBuffer.onBufferLow = () => this.generateClip();
    audioBuffer.onBufferUpdate = (status) => this.updateBufferUI(status);

    // Set up button
    this.startBtn.addEventListener("click", () => this.toggle());

    console.log("🎭 Mil4dy initialized. Click Start to begin.");
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
    this.startBtn.textContent = "Stop";

    // Initialize audio (requires user interaction)
    await audioBuffer.initialize();

    // Generate initial buffer
    console.log("🚀 Building initial buffer...");
    await this.generateClip();
    await this.generateClip();

    // Start playback
    audioBuffer.play();

    // Continue generating at intervals
    this.generateInterval = setInterval(
      () => this.checkAndGenerate(),
      config.timing.frameCaptureInterval
    );
  }

  stop() {
    this.isRunning = false;
    this.startBtn.textContent = "Start";

    audioBuffer.pause();

    if (this.generateInterval) {
      clearInterval(this.generateInterval);
      this.generateInterval = null;
    }

    console.log("🛑 Stopped");
  }

  /**
   * Check buffer and generate if needed
   */
  async checkAndGenerate() {
    const status = audioBuffer.getStatus();

    if (status.queuedClips < config.timing.minBufferClips + 1) {
      await this.generateClip();
    }
  }

  /**
   * Generate a single poetry clip
   */
  async generateClip() {
    if (this.isGenerating) {
      console.log("⏳ Already generating, skipping...");
      return;
    }

    this.isGenerating = true;

    try {
      console.log("🔄 Generating new clip...");

      // Capture and analyze
      const frame = camera.captureFrame();
      const scene = await vision.analyzeFrame(frame);

      // Generate poetry
      const poem = await poetry.generate(scene.description);

      // Synthesize speech
      const audio = await tts.synthesize(poem.text);

      // Add to buffer
      await audioBuffer.addToQueue(audio);

      console.log("✅ Clip added to buffer");
    } catch (error) {
      console.error("Generation error:", error);
    } finally {
      this.isGenerating = false;
    }
  }

  /**
   * Display poetry on screen
   */
  displayPoetry(text) {
    this.poetryOverlay.innerHTML = text
      .split("\n")
      .map((line) => `<p>${line}</p>`)
      .join("");
  }

  /**
   * Update buffer indicator UI
   */
  updateBufferUI(status) {
    const bars =
      "█".repeat(status.queuedClips) +
      "░".repeat(config.timing.maxBufferClips - status.queuedClips);
    this.bufferIndicator.textContent = `Buffer: ${bars} (${status.totalBufferedSeconds.toFixed(
      0
    )}s)`;
  }
}

// Initialize on page load
const app = new Mil4dy();
app.initialize().catch(console.error);
```

### Key Learning Points 📚

1. **Web Audio API** - More powerful than `<audio>` elements, allows precise control
2. **AudioContext** - Must be created after user interaction (browser policy)
3. **Buffer management** - Always generate ahead to prevent gaps
4. **State management** - Track `isGenerating` to prevent overlapping requests

### Checkpoint ✅

- [ ] Click "Start" begins continuous generation
- [ ] Poetry plays continuously without gaps
- [ ] Buffer indicator shows clip count
- [ ] New clips generate as old ones play
- [ ] Click "Stop" pauses everything

---

## Phase 6: UI & Visual Design

### Goal

Create a beautiful, immersive interface.

### Steps

#### 6.1 Update HTML Structure

Update `index.html`:

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Mil4dy - Poetry from Sight</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;1,400&family=DM+Sans:wght@400;500&display=swap"
      rel="stylesheet"
    />
    <link rel="stylesheet" href="/src/style.css" />
  </head>
  <body>
    <div id="app">
      <!-- Camera Feed (background) -->
      <video id="camera-feed" autoplay playsinline muted></video>

      <!-- Overlay gradient -->
      <div id="overlay"></div>

      <!-- Poetry Display -->
      <div id="poetry-container">
        <div id="poetry-overlay"></div>
      </div>

      <!-- Controls -->
      <div id="controls">
        <button id="start-btn" class="control-btn">
          <span class="play-icon">▶</span>
          <span class="stop-icon">■</span>
          <span class="btn-text">Begin</span>
        </button>

        <div id="status">
          <div id="buffer-indicator">
            <div id="buffer-fill"></div>
          </div>
          <span id="buffer-text">Ready</span>
        </div>

        <input
          type="range"
          id="volume"
          min="0"
          max="100"
          value="80"
          title="Volume"
        />
      </div>

      <!-- Loading State -->
      <div id="loading" class="hidden">
        <div class="spinner"></div>
        <p>Awakening the poet's eye...</p>
      </div>
    </div>

    <script type="module" src="/src/main.js"></script>
  </body>
</html>
```

#### 6.2 Create Styles

Update `src/style.css`:

```css
/**
 * Mil4dy - Poetry from Sight
 * Visual Design
 */

/* Reset & Base */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

:root {
  /* Color palette - warm, contemplative */
  --bg-dark: #0a0a0f;
  --text-primary: #f5f0e8;
  --text-secondary: rgba(245, 240, 232, 0.6);
  --accent: #c9a87c;
  --accent-glow: rgba(201, 168, 124, 0.3);

  /* Typography */
  --font-poetry: "Cormorant Garamond", serif;
  --font-ui: "DM Sans", sans-serif;
}

body {
  font-family: var(--font-ui);
  background: var(--bg-dark);
  color: var(--text-primary);
  min-height: 100vh;
  overflow: hidden;
}

/* App Container */
#app {
  position: relative;
  width: 100vw;
  height: 100vh;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
}

/* Camera Feed */
#camera-feed {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  transform: scaleX(-1); /* Mirror for natural feel */
  filter: saturate(0.8) brightness(0.7);
}

/* Dark overlay gradient */
#overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(
    to top,
    rgba(10, 10, 15, 0.95) 0%,
    rgba(10, 10, 15, 0.7) 30%,
    rgba(10, 10, 15, 0.3) 60%,
    rgba(10, 10, 15, 0.1) 100%
  );
  pointer-events: none;
}

/* Poetry Container */
#poetry-container {
  position: relative;
  z-index: 10;
  padding: 2rem 3rem;
  min-height: 40vh;
  display: flex;
  align-items: flex-end;
}

#poetry-overlay {
  font-family: var(--font-poetry);
  font-size: clamp(1.5rem, 4vw, 2.5rem);
  font-weight: 400;
  line-height: 1.6;
  color: var(--text-primary);
  text-shadow: 0 2px 20px rgba(0, 0, 0, 0.5);
  max-width: 800px;
}

#poetry-overlay p {
  margin-bottom: 0.5em;
  opacity: 0;
  transform: translateY(10px);
  animation: fadeInUp 0.6s ease forwards;
}

#poetry-overlay p:nth-child(1) {
  animation-delay: 0s;
}
#poetry-overlay p:nth-child(2) {
  animation-delay: 0.15s;
}
#poetry-overlay p:nth-child(3) {
  animation-delay: 0.3s;
}
#poetry-overlay p:nth-child(4) {
  animation-delay: 0.45s;
}
#poetry-overlay p:nth-child(5) {
  animation-delay: 0.6s;
}
#poetry-overlay p:nth-child(6) {
  animation-delay: 0.75s;
}
#poetry-overlay p:nth-child(7) {
  animation-delay: 0.9s;
}
#poetry-overlay p:nth-child(8) {
  animation-delay: 1.05s;
}

@keyframes fadeInUp {
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Controls */
#controls {
  position: relative;
  z-index: 20;
  display: flex;
  align-items: center;
  gap: 1.5rem;
  padding: 1.5rem 2rem;
  background: rgba(10, 10, 15, 0.8);
  backdrop-filter: blur(10px);
  border-top: 1px solid rgba(255, 255, 255, 0.05);
}

/* Start/Stop Button */
.control-btn {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1.5rem;
  background: var(--accent);
  color: var(--bg-dark);
  border: none;
  border-radius: 100px;
  font-family: var(--font-ui);
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.control-btn:hover {
  background: #d4b88a;
  transform: scale(1.02);
}

.control-btn .stop-icon {
  display: none;
}

.control-btn.playing .play-icon {
  display: none;
}

.control-btn.playing .stop-icon {
  display: inline;
}

.control-btn.playing .btn-text::after {
  content: "Pause";
}

.control-btn.playing .btn-text {
  font-size: 0;
}

/* Buffer Indicator */
#status {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex: 1;
}

#buffer-indicator {
  width: 150px;
  height: 4px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
  overflow: hidden;
}

#buffer-fill {
  height: 100%;
  width: 0%;
  background: linear-gradient(90deg, var(--accent), #e0c9a0);
  border-radius: 2px;
  transition: width 0.3s ease;
}

#buffer-text {
  font-size: 0.75rem;
  color: var(--text-secondary);
  min-width: 80px;
}

/* Volume Slider */
#volume {
  width: 100px;
  height: 4px;
  -webkit-appearance: none;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
  cursor: pointer;
}

#volume::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 14px;
  height: 14px;
  background: var(--text-primary);
  border-radius: 50%;
  cursor: pointer;
}

/* Loading State */
#loading {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: var(--bg-dark);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1.5rem;
  z-index: 100;
  transition: opacity 0.5s ease;
}

#loading.hidden {
  opacity: 0;
  pointer-events: none;
}

#loading p {
  font-family: var(--font-poetry);
  font-size: 1.25rem;
  font-style: italic;
  color: var(--text-secondary);
}

.spinner {
  width: 40px;
  height: 40px;
  border: 2px solid rgba(255, 255, 255, 0.1);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* Responsive */
@media (max-width: 768px) {
  #poetry-overlay {
    font-size: 1.25rem;
  }

  #controls {
    flex-wrap: wrap;
    justify-content: center;
  }

  #status {
    order: 3;
    width: 100%;
    justify-content: center;
  }
}
```

#### 6.3 Update Main.js for New UI

Add these methods to your `Mil4dy` class in `src/main.js`:

```javascript
// Add to initialize()
this.loadingElement = document.getElementById('loading');
this.bufferFill = document.getElementById('buffer-fill');
this.bufferText = document.getElementById('buffer-text');
this.volumeSlider = document.getElementById('volume');

// Volume control
this.volumeSlider.addEventListener('input', (e) => {
  audioBuffer.setVolume(e.target.value / 100);
});

// Update the toggle() method
async toggle() {
  if (this.isRunning) {
    this.stop();
    this.startBtn.classList.remove('playing');
  } else {
    await this.start();
    this.startBtn.classList.add('playing');
  }
}

// Update the updateBufferUI method
updateBufferUI(status) {
  const percentage = (status.queuedClips / config.timing.maxBufferClips) * 100;
  this.bufferFill.style.width = `${percentage}%`;

  if (status.isPlaying) {
    this.bufferText.textContent = `${status.totalBufferedSeconds.toFixed(0)}s buffered`;
  } else {
    this.bufferText.textContent = 'Paused';
  }
}

// Add loading state management
showLoading() {
  this.loadingElement.classList.remove('hidden');
}

hideLoading() {
  this.loadingElement.classList.add('hidden');
}
```

### Key Learning Points 📚

1. **CSS Custom Properties** - Use `--variables` for consistent theming
2. **`clamp()`** - Responsive typography without media queries
3. **Staggered animations** - `animation-delay` creates elegant reveals
4. **`backdrop-filter`** - Glass morphism effect for modern UI

### Checkpoint ✅

- [ ] UI looks polished and professional
- [ ] Poetry text animates in line-by-line
- [ ] Buffer indicator shows fill level
- [ ] Volume slider works
- [ ] Responsive on smaller screens

---

## Phase 7: Integration & Polish

### Goal

Tie everything together, handle edge cases, and polish the experience.

### Steps

#### 7.1 Error Handling

Add error handling throughout. Example additions:

```javascript
// In vision.js - retry logic
async analyzeFrame(imageBase64, retries = 2) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      // ... existing code ...
    } catch (error) {
      if (attempt === retries) throw error;
      console.log(`Retrying vision analysis (${attempt + 1}/${retries})...`);
      await new Promise(r => setTimeout(r, 1000));
    }
  }
}
```

#### 7.2 Graceful Degradation

Handle cases where buffer runs empty:

```javascript
// In audioBuffer.js - add silence filler
async playNext() {
  if (this.queue.length === 0 && this.isPlaying) {
    // Show "thinking" state in UI
    this.onBufferEmpty?.();

    // Wait and retry
    await new Promise(r => setTimeout(r, 1000));
    return this.playNext();
  }
  // ... rest of method
}
```

#### 7.3 Add Scene Change Detection (Optional Enhancement)

Only generate new poetry when scene changes significantly:

```javascript
// In vision.js
class VisionModule {
  constructor() {
    // ... existing code ...
    this.lastDescription = "";
  }

  async analyzeFrame(imageBase64) {
    // ... existing code to get description ...

    // Check if scene changed
    const similarity = this.calculateSimilarity(
      description,
      this.lastDescription
    );
    this.lastDescription = description;

    return {
      description,
      isNewScene: similarity < 0.7, // Threshold
      // ... rest
    };
  }

  calculateSimilarity(a, b) {
    // Simple word overlap similarity
    const wordsA = new Set(a.toLowerCase().split(/\s+/));
    const wordsB = new Set(b.toLowerCase().split(/\s+/));
    const intersection = [...wordsA].filter((w) => wordsB.has(w));
    return intersection.length / Math.max(wordsA.size, wordsB.size);
  }
}
```

#### 7.4 Final Testing Checklist

Test these scenarios:

- [ ] Cold start: Click Start, poetry should begin within 15-20 seconds
- [ ] Continuous play: Let it run for 5+ minutes without gaps
- [ ] Scene changes: Move camera to different scenes, poetry should adapt
- [ ] Pause/Resume: Pause and resume should work smoothly
- [ ] Volume: Volume slider affects audio output
- [ ] Error recovery: Disconnect/reconnect WiFi, app should recover
- [ ] Memory: Check memory usage doesn't grow unbounded over time

### Final Project Structure

```
mil4dy-app/
├── src/
│   ├── modules/
│   │   ├── camera.js         ✅ Camera capture
│   │   ├── vision.js         ✅ GPT-4o Vision
│   │   ├── poetry.js         ✅ Poetry generation
│   │   ├── tts.js            ✅ ElevenLabs TTS
│   │   └── audioBuffer.js    ✅ Buffer management
│   ├── utils/
│   │   └── config.js         ✅ Configuration
│   ├── main.js               ✅ Orchestrator
│   └── style.css             ✅ Styling
├── index.html                ✅ HTML shell
├── .env                      ✅ API keys
├── .env.example              ✅ Template
├── .gitignore                ✅ Ignore .env
└── package.json              ✅ Dependencies
```

---

## Summary

You've built a complete real-time poetry generation system! Here's what each phase taught you:

| Phase     | Key Skills Learned                                  |
| --------- | --------------------------------------------------- |
| 0. Setup  | Vite, project structure, environment variables      |
| 1. Camera | WebRTC, `getUserMedia`, Canvas API, base64 encoding |
| 2. Vision | OpenAI API, multimodal prompts, API error handling  |
| 3. Poetry | Prompt engineering, context management, creative AI |
| 4. TTS    | ElevenLabs API, audio blobs, URL.createObjectURL    |
| 5. Buffer | Web Audio API, AudioContext, queue management       |
| 6. UI     | CSS animations, responsive design, glass morphism   |
| 7. Polish | Error handling, edge cases, performance             |

---

## Next Steps (When Ready)

When you want to add ambient music (Phase 3 in PRD):

1. Create `src/modules/music.js` using Tone.js
2. Add subtle parameter mapping from vision analysis
3. Create an audio mixer to blend poetry and music
4. Add volume controls for each

Good luck, and enjoy watching your creation turn the world into poetry! 🎭✨
