/**
 * Joe Jackson Memorabilia Museum - Watermarking Engine
 * Automatically applies a discrete, high-quality watermark badge "JJ Memorabilia Museum"
 * onto ticket, poster, and program scans.
 */

(function(global) {
  'use strict';

  /**
   * Applies watermark "JJ Memorabilia Museum" to an image file, blob, or HTMLImageElement
   * @param {File|Blob|HTMLImageElement|string} source - Input image
   * @param {Object} options - Customization options
   * @returns {Promise<{blob: Blob, dataUrl: string, width: number, height: number, fileName: string}>}
   */
  async function applyWatermark(source, options = {}) {
    const {
      text = 'JJ Memorabilia Museum',
      subtext = 'Joe Jackson Archive • joejackson.band',
      position = 'bottom-right',
      badge = '🎫',
      maxDimension = 1600,
      quality = 0.92,
      outputFormat = 'image/jpeg'
    } = options;

    let originalFileName = 'watermarked_scan.jpg';
    if (source instanceof File) {
      const baseName = source.name.replace(/\.[^/.]+$/, '');
      originalFileName = `${baseName}_watermarked.jpg`;
    }

    // Load image
    let img;
    let tempObjectUrl = null;

    if (source instanceof HTMLImageElement) {
      img = source;
    } else {
      img = new Image();
      if (typeof source === 'string') {
        img.src = source;
      } else {
        tempObjectUrl = URL.createObjectURL(source);
        img.src = tempObjectUrl;
      }
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = () => reject(new Error('Failed to load image for watermarking'));
      });
    }

    // Clean up object URL if created
    if (tempObjectUrl) {
      URL.revokeObjectURL(tempObjectUrl);
    }

    // Calculate dimensions strictly respecting original aspect ratio
    const origW = img.naturalWidth || img.width;
    const origH = img.naturalHeight || img.height;

    if (!origW || !origH) {
      throw new Error('Invalid image dimensions');
    }

    let w = origW;
    let h = origH;

    // Scale proportionally if either dimension exceeds maxDimension
    if (maxDimension && (w > maxDimension || h > maxDimension)) {
      const scaleFactor = Math.min(maxDimension / origW, maxDimension / origH);
      w = Math.round(origW * scaleFactor);
      h = Math.round(origH * scaleFactor);
    }

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');

    // Draw base image cleanly at full canvas size
    ctx.drawImage(img, 0, 0, w, h);

    // Calculate dynamic scaling according to image resolution
    const baseDim = Math.max(w, h);
    const scale = Math.max(0.55, baseDim / 1300);

    const fontSize = Math.max(13, Math.round(18 * scale));
    const subFontSize = Math.max(8, Math.round(10 * scale));
    const paddingX = Math.max(8, Math.round(14 * scale));
    const paddingY = Math.max(6, Math.round(10 * scale));
    const margin = Math.max(10, Math.round(16 * scale));
    const iconOffset = Math.round(24 * scale);

    ctx.save();

    // Set semi-transparent opacity so watermark does not obscure ticket dates or details
    const watermarkOpacity = typeof options.opacity === 'number' ? options.opacity : 0.52;
    ctx.globalAlpha = Math.max(0.1, Math.min(1.0, watermarkOpacity));

    // Measure text
    ctx.font = `700 ${fontSize}px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`;
    const mainMetrics = ctx.measureText(text);
    ctx.font = `600 ${subFontSize}px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`;
    const subMetrics = ctx.measureText(subtext);

    const contentWidth = Math.max(mainMetrics.width, subMetrics.width);
    const boxWidth = contentWidth + (paddingX * 2) + iconOffset;
    const boxHeight = fontSize + subFontSize + (paddingY * 2) + Math.round(3 * scale);

    // Determine watermark coordinates
    let x = w - boxWidth - margin;
    let y = h - boxHeight - margin;

    if (position === 'bottom-left') {
      x = margin;
      y = h - boxHeight - margin;
    } else if (position === 'top-right') {
      x = w - boxWidth - margin;
      y = margin;
    } else if (position === 'top-left') {
      x = margin;
      y = margin;
    } else if (position === 'center') {
      x = Math.round((w - boxWidth) / 2);
      y = Math.round((h - boxHeight) / 2);
    }

    // Ensure bounds
    x = Math.max(margin, Math.min(x, w - boxWidth - margin));
    y = Math.max(margin, Math.min(y, h - boxHeight - margin));

    // Draw subtle semi-transparent background pill
    const borderRadius = Math.max(6, Math.round(8 * scale));
    ctx.fillStyle = 'rgba(15, 23, 42, 0.65)'; // Translucent Slate / Navy
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.lineWidth = Math.max(1, Math.round(1.2 * scale));

    if (typeof ctx.roundRect === 'function') {
      ctx.beginPath();
      ctx.roundRect(x, y, boxWidth, boxHeight, borderRadius);
      ctx.fill();
      ctx.stroke();
    } else {
      ctx.fillRect(x, y, boxWidth, boxHeight);
      ctx.strokeRect(x, y, boxWidth, boxHeight);
    }

    // Draw Badge Icon
    const iconX = x + paddingX;
    const iconY = y + paddingY + fontSize - Math.round(2 * scale);
    ctx.font = `${Math.round(fontSize * 1.05)}px sans-serif`;
    ctx.fillStyle = '#f59e0b'; // Gold / Amber
    ctx.fillText(badge, iconX, iconY);

    // Text Position
    const textX = iconX + iconOffset;

    // Draw Main Text "JJ Memorabilia Museum"
    ctx.font = `700 ${fontSize}px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(text, textX, y + paddingY + fontSize - Math.round(2 * scale));

    // Draw Subtitle "Joe Jackson Archive • joejackson.band"
    ctx.font = `600 ${subFontSize}px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.88)';
    ctx.fillText(subtext, textX, y + paddingY + fontSize + subFontSize + Math.round(2 * scale));

    ctx.restore();
    ctx.globalAlpha = 1.0;

    // Export output
    const dataUrl = canvas.toDataURL(outputFormat, quality);
    const blob = await new Promise(resolve => canvas.toBlob(resolve, outputFormat, quality));

    return {
      blob,
      dataUrl,
      width: w,
      height: h,
      fileName: originalFileName
    };
  }

  // Export functions globally
  global.JJWatermark = {
    apply: applyWatermark
  };

})(typeof window !== 'undefined' ? window : this);
