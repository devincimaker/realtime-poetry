/**
 * Camera Module
 *
 * Handles webcam access and frame capture using WebRTC.
 * Captures frames as base64-encoded JPEG images for API consumption.
 *
 * Key concepts:
 * - getUserMedia: Browser API for accessing camera/microphone
 * - Canvas: Used to capture video frames as images
 * - Base64: Encoding format to send images as text to APIs
 */

import { config } from "../utils/config.js";

class CameraModule {
  constructor() {
    this.videoElement = null;
    this.stream = null;
    this.canvas = document.createElement("canvas");
    this.ctx = this.canvas.getContext("2d");
    this.isInitialized = false;
  }

  /**
   * Initialize camera access and connect to video element
   *
   * @param {HTMLVideoElement} videoElement - The video element to display the feed
   * @returns {Promise<boolean>} - True if successful
   * @throws {Error} - If camera access is denied
   *
   * How it works:
   * 1. Request camera permission via getUserMedia
   * 2. Connect the media stream to a <video> element
   * 3. Set up canvas dimensions to match video
   */
  async initialize(videoElement) {
    this.videoElement = videoElement;

    try {
      // Request camera access with preferred settings
      // facingMode: 'user' = front camera, 'environment' = back camera
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: "user",
        },
        audio: false, // We don't need audio from camera
      });

      // Connect stream to video element for display
      this.videoElement.srcObject = this.stream;

      // Wait for video metadata to load (dimensions, etc.)
      await new Promise((resolve, reject) => {
        this.videoElement.onloadedmetadata = () => {
          // Set canvas size to match video
          this.canvas.width = this.videoElement.videoWidth;
          this.canvas.height = this.videoElement.videoHeight;
          resolve();
        };
        this.videoElement.onerror = reject;
      });

      this.isInitialized = true;
      console.log(
        `📷 Camera initialized (${this.canvas.width}x${this.canvas.height})`
      );
      return true;
    } catch (error) {
      // Handle common camera errors
      if (error.name === "NotAllowedError") {
        throw new Error(
          "Camera permission denied. Please allow camera access to use this app."
        );
      } else if (error.name === "NotFoundError") {
        throw new Error(
          "No camera found. Please connect a camera and refresh."
        );
      } else {
        throw new Error(`Camera error: ${error.message}`);
      }
    }
  }

  /**
   * Capture current video frame as base64 JPEG
   *
   * @returns {string} - Base64 encoded image (without data URL prefix)
   * @throws {Error} - If camera not initialized
   *
   * How it works:
   * 1. Draw current video frame onto hidden canvas
   * 2. Convert canvas to data URL (base64)
   * 3. Strip the prefix to get raw base64
   */
  captureFrame() {
    if (!this.isInitialized) {
      throw new Error("Camera not initialized. Call initialize() first.");
    }

    // Draw current video frame to canvas
    this.ctx.drawImage(
      this.videoElement,
      0,
      0,
      this.canvas.width,
      this.canvas.height
    );

    // Convert to base64 JPEG
    // Quality 0.8 balances file size (~50-100KB) vs image quality
    const dataUrl = this.canvas.toDataURL(
      "image/jpeg",
      config.vision.imageQuality
    );

    // Remove "data:image/jpeg;base64," prefix - APIs want raw base64
    const base64 = dataUrl.split(",")[1];

    return base64;
  }

  /**
   * Get the raw media stream (useful for advanced use cases)
   * @returns {MediaStream|null}
   */
  getStream() {
    return this.stream;
  }

  /**
   * Switch between front and back camera (mobile devices)
   * @returns {Promise<void>}
   */
  async switchCamera() {
    if (!this.stream) return;

    // Get current facing mode
    const currentTrack = this.stream.getVideoTracks()[0];
    const currentSettings = currentTrack.getSettings();
    const newFacingMode =
      currentSettings.facingMode === "user" ? "environment" : "user";

    // Stop current stream
    this.stop();

    // Restart with new facing mode
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: newFacingMode,
        },
        audio: false,
      });

      this.videoElement.srcObject = this.stream;
      console.log(`📷 Switched to ${newFacingMode} camera`);
    } catch (error) {
      console.error("Failed to switch camera:", error);
      // Try to restore original camera
      await this.initialize(this.videoElement);
    }
  }

  /**
   * Stop camera stream and release resources
   */
  stop() {
    if (this.stream) {
      // Stop all tracks to release camera
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
      this.isInitialized = false;
      console.log("📷 Camera stopped");
    }
  }

  /**
   * Check if camera is currently active
   * @returns {boolean}
   */
  isActive() {
    return this.isInitialized && this.stream !== null;
  }
}

// Export singleton instance
// Singleton pattern ensures only one camera instance exists
export const camera = new CameraModule();
