import { config } from "../utils/config.js";

class CameraModule {
  constructor() {
    this.videoElement = null;
    this.stream = null;
    this.canvas = document.createElement("canvas");
    this.ctx = this.canvas.getContext("2d");
    this.isInitialized = false;
  }

  async initialize(videoElement) {
    this.videoElement = videoElement;

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: "user",
        },
        audio: false,
      });

      this.videoElement.srcObject = this.stream;

      await new Promise((resolve, reject) => {
        this.videoElement.onloadedmetadata = () => {
          this.canvas.width = this.videoElement.videoWidth;
          this.canvas.height = this.videoElement.videoHeight;
          resolve();
        };
        this.videoElement.onerror = reject;
      });

      this.isInitialized = true;

      return true;
    } catch (error) {
      throw new Error(`Camera error: ${error.message}`);
    }
  }

  captureFrame() {
    if (!this.isInitialized) {
      throw new Error("Camera not initialized. Call initialize() first.");
    }

    this.ctx.drawImage(
      this.videoElement,
      0,
      0,
      this.canvas.width,
      this.canvas.height
    );

    const dataUrl = this.canvas.toDataURL(
      "image/jpeg",
      config.vision.imageQuality
    );

    return dataUrl.split(",")[1];
  }
}

export const camera = new CameraModule();
