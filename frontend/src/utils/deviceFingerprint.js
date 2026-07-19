/**
 * Device Fingerprint Utility
 *
 * Generates a stable, privacy-respecting device fingerprint using:
 * - Canvas API rendering (unique per GPU/driver)
 * - WebGL renderer info
 * - Screen resolution + pixel ratio
 * - Timezone
 * - Language
 * - Platform
 * - Installed plugin count
 *
 * The result is hashed to SHA-256 for consistent comparison.
 * This does NOT use cookies or localStorage — it is recomputed on each call.
 */

/**
 * Get Canvas fingerprint.
 */
const getCanvasFingerprint = () => {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 200;
    canvas.height = 50;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    ctx.textBaseline = 'top';
    ctx.font = "14px 'Arial'";
    ctx.fillStyle = '#6366f1';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#fff';
    ctx.fillText('QRCodeAttend🔐', 2, 4);
    ctx.fillStyle = 'rgba(99,102,241,0.5)';
    ctx.fillRect(20, 0, 80, 20);

    return canvas.toDataURL();
  } catch {
    return 'canvas-unavailable';
  }
};

/**
 * Get WebGL renderer info.
 */
const getWebGLFingerprint = () => {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) return 'webgl-unavailable';

    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    if (!debugInfo) return 'webgl-debug-unavailable';

    return [
      gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL),
      gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL),
    ].join('|');
  } catch {
    return 'webgl-error';
  }
};

/**
 * Collect all fingerprint components.
 */
const collectComponents = () => {
  const components = [
    navigator.userAgent,
    navigator.language,
    navigator.languages?.join(',') || '',
    navigator.platform || '',
    String(navigator.hardwareConcurrency || ''),
    String(navigator.deviceMemory || ''),
    String(screen.width),
    String(screen.height),
    String(screen.colorDepth),
    String(screen.pixelDepth),
    String(window.devicePixelRatio || ''),
    Intl.DateTimeFormat().resolvedOptions().timeZone,
    String(new Date().getTimezoneOffset()),
    String(navigator.plugins?.length || 0),
    getWebGLFingerprint(),
    getCanvasFingerprint(),
  ];

  return components.join('###');
};

/**
 * Hash a string using SHA-256.
 * @param {string} message
 * @returns {Promise<string>} Hex digest
 */
const sha256 = async (message) => {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
};

/**
 * Generate a stable device fingerprint.
 * @returns {Promise<string>} 64-character hex hash
 */
const generateDeviceFingerprint = async () => {
  try {
    const components = collectComponents();
    const hash = await sha256(components);
    return hash;
  } catch (err) {
    // Fallback: use a partial fingerprint
    const fallback = `${navigator.userAgent}-${screen.width}x${screen.height}-${navigator.language}`;
    return sha256(fallback);
  }
};

export { generateDeviceFingerprint };
