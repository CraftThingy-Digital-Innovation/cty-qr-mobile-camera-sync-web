/**
 * cty-qr-mobile-camera-sync-web
 * PC Client Class QrMobileSync
 * Public-Source Corporate Royalty License (PSCRL)
 * Copyright (c) 2026 CraftThingy Digital Innovation & Alif Nurhidayat
 */

export class QrMobileSync extends EventTarget {
  constructor(options = {}) {
    super();
    this.apiUrl = options.apiUrl || '';
    this.pollInterval = options.pollInterval || 2000;
    this.sessionToken = options.sessionToken || this.generateUUID();
    this.pollingTimer = null;
    this.connected = false;
    this.seenImages = new Set();
  }

  /**
   * Generates a unique UUID v4 token
   */
  generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  /**
   * Builds the target URL containing session token to open on mobile
   * @param {string} mobilePageUrl Base URL of the mobile scanner page
   */
  getQrUrl(mobilePageUrl) {
    const url = new URL(mobilePageUrl);
    url.searchParams.set('token', this.sessionToken);
    return url.toString();
  }

  /**
   * Starts polling the backend for camera status and uploaded images
   */
  startPolling() {
    if (this.pollingTimer) return;
    
    this.pollingTimer = setInterval(async () => {
      try {
        const response = await fetch(`${this.apiUrl}/ocr-phone/check/${this.sessionToken}`, {
          headers: { 'X-Requested-With': 'XMLHttpRequest' }
        });
        const result = await response.json();
        
        if (result.status === 'success') {
          // Handle connection status changes
          if (this.connected !== !!result.connected) {
            this.connected = !!result.connected;
            this.dispatchEvent(new CustomEvent('connection-change', {
              detail: { connected: this.connected }
            }));
          }

          // Single image legacy mode support
          if (result.has_image && result.image_url) {
            const filename = result.image_url.split('/').pop();
            if (!this.seenImages.has(filename)) {
              this.seenImages.add(filename);
              this.dispatchEvent(new CustomEvent('image', {
                detail: {
                  filename: filename,
                  imageUrl: result.image_url,
                  legacy: true
                }
              }));
            }
          }

          // Multi-photo queue support
          if (result.images && Array.isArray(result.images)) {
            result.images.forEach(img => {
              if (!this.seenImages.has(img.filename)) {
                this.seenImages.add(img.filename);
                this.dispatchEvent(new CustomEvent('image', {
                  detail: {
                    filename: img.filename,
                    imageUrl: img.image_url
                  }
                }));
              }
            });
          }
        }
      } catch (err) {
        this.dispatchEvent(new CustomEvent('error', { detail: err }));
      }
    }, this.pollInterval);
  }

  /**
   * Stops the polling runner
   */
  stopPolling() {
    if (this.pollingTimer) {
      clearInterval(this.pollingTimer);
      this.pollingTimer = null;
    }
  }

  /**
   * Clears a specific uploaded image file from the server
   * @param {string} filename The filename of the temporary image
   */
  async clearFile(filename) {
    try {
      const response = await fetch(`${this.apiUrl}/ocr-phone/clear-file/${filename}`);
      return await response.json();
    } catch (err) {
      console.error('Failed to clear file:', err);
      throw err;
    }
  }

  /**
   * Clears all session files and resets polling tracker cache
   */
  async clearSession() {
    try {
      const response = await fetch(`${this.apiUrl}/ocr-phone/clear/${this.sessionToken}`);
      this.seenImages.clear();
      return await response.json();
    } catch (err) {
      console.error('Failed to clear session:', err);
      throw err;
    }
  }

  /**
   * Callback binder helper (syntactic sugar)
   * @param {string} event Event name ('connection-change', 'image', 'error')
   * @param {Function} callback Callback receiver
   */
  on(event, callback) {
    this.addEventListener(event, (e) => callback(e.detail));
  }
}

if (typeof window !== 'undefined') {
  window.QrMobileSync = QrMobileSync;
}

