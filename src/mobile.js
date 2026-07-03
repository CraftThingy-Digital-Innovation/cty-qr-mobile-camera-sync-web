/**
 * cty-qr-mobile-camera-sync-web
 * Mobile Client Helper Class MobileCameraScanner
 * Public-Source Corporate Royalty License (PSCRL)
 * Copyright (c) 2026 CraftThingy Digital Innovation & Alif Nurhidayat
 */

export class MobileCameraScanner extends EventTarget {
  constructor(options = {}) {
    super();
    this.token = options.token || '';
    this.uploadUrl = options.uploadUrl || '';
    this.pingUrl = options.pingUrl || '';
    this.autoResetDelay = options.autoResetDelay !== undefined ? options.autoResetDelay : 2500;
    
    this.videoStream = null;
    this.pingInterval = null;
    this.videoEl = null;
  }

  /**
   * Initializes the webcam stream on a target video element
   * @param {HTMLVideoElement} videoElement The target HTML video element
   * @param {string} facingMode Facing direction ('user' or 'environment' for rear camera)
   */
  async startCamera(videoElement, facingMode = 'environment') {
    if (!videoElement) {
      throw new Error("Target HTMLVideoElement is required.");
    }
    this.videoEl = videoElement;

    try {
      const constraints = {
        video: {
          facingMode: facingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: false
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.videoStream = stream;
      this.videoEl.srcObject = stream;
      this.videoEl.setAttribute('playsinline', 'true');
      this.videoEl.play();

      this.dispatchEvent(new CustomEvent('camera-started', { detail: { stream } }));
      return stream;
    } catch (err) {
      this.dispatchEvent(new CustomEvent('error', { detail: err }));
      throw err;
    }
  }

  /**
   * Stops the active webcam video stream
   */
  stopCamera() {
    if (this.videoStream) {
      this.videoStream.getTracks().forEach(track => track.stop());
      this.videoStream = null;
    }
    if (this.videoEl) {
      this.videoEl.srcObject = null;
    }
    this.dispatchEvent(new CustomEvent('camera-stopped'));
  }

  /**
   * Captures the current frame and uploads it to the backend session endpoint
   * @param {HTMLCanvasElement} canvasElement Temporary canvas element to draw frame on
   */
  async captureAndUpload(canvasElement) {
    if (!this.videoEl || !this.videoStream) {
      throw new Error("Camera stream is not active.");
    }
    if (!canvasElement) {
      throw new Error("Temporary HTMLCanvasElement is required.");
    }

    try {
      const videoWidth = this.videoEl.videoWidth;
      const videoHeight = this.videoEl.videoHeight;
      canvasElement.width = videoWidth;
      canvasElement.height = videoHeight;

      const ctx = canvasElement.getContext('2d');
      ctx.drawImage(this.videoEl, 0, 0, videoWidth, videoHeight);

      return new Promise((resolve, reject) => {
        canvasElement.toBlob(async (blob) => {
          if (!blob) {
            reject(new Error("Canvas blob extraction failed."));
            return;
          }

          try {
            const formData = new FormData();
            formData.append('image', blob, `capture_${Date.now()}.jpg`);

            this.dispatchEvent(new CustomEvent('upload-start'));

            const response = await fetch(`${this.uploadUrl}/${this.token}`, {
              method: 'POST',
              headers: { 'X-Requested-With': 'XMLHttpRequest' },
              body: formData
            });

            const result = await response.json();

            if (result.status === 'success') {
              this.dispatchEvent(new CustomEvent('upload-success', { detail: result }));
              resolve(result);
            } else {
              const err = new Error(result.message || "Upload failed.");
              this.dispatchEvent(new CustomEvent('upload-error', { detail: err }));
              reject(err);
            }
          } catch (err) {
            this.dispatchEvent(new CustomEvent('upload-error', { detail: err }));
            reject(err);
          }
        }, 'image/jpeg', 0.9);
      });
    } catch (err) {
      this.dispatchEvent(new CustomEvent('error', { detail: err }));
      throw err;
    }
  }

  /**
   * Starts sending a connection heartbeat to tell the PC client the phone is connected
   */
  startPing() {
    if (this.pingInterval) return;

    const performPing = async () => {
      if (!this.token) return;
      try {
        await fetch(`${this.pingUrl}/${this.token}`, {
          method: 'GET',
          headers: { 'X-Requested-With': 'XMLHttpRequest' }
        });
      } catch (err) {
        console.warn("Heartbeat ping failed:", err);
      }
    };

    performPing();
    this.pingInterval = setInterval(performPing, 3000);
  }

  /**
   * Stops sending the heartbeat ping
   */
  stopPing() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  /**
   * Simple callback binder
   * @param {string} event Event name
   * @param {Function} callback Callback receiver
   */
  on(event, callback) {
    this.addEventListener(event, (e) => callback(e.detail));
  }
}
