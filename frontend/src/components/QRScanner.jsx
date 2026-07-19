import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Camera, CameraOff, RefreshCw } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';

/**
 * QRScanner — Student-facing camera QR scanner component.
 *
 * Uses html5-qrcode to access the device camera and scan the rotating
 * QR code displayed on faculty's screen. Calls onScan with the decoded payload.
 */
const QRScanner = ({ onScan, isLoading = false, disabled = false }) => {
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState(null);
  const [hasPermission, setHasPermission] = useState(null);
  const scannerRef = useRef(null);
  const html5QrcodeRef = useRef(null);
  const SCANNER_ID = 'qr-scanner-region';

  const startScanning = async () => {
    setError(null);
    try {
      const devices = await Html5Qrcode.getCameras();
      if (!devices || devices.length === 0) {
        throw new Error('No cameras found on this device.');
      }

      // Prefer rear/environment camera on mobile
      const backCamera = devices.find(
        (d) => d.label.toLowerCase().includes('back') ||
               d.label.toLowerCase().includes('rear') ||
               d.label.toLowerCase().includes('environment')
      ) || devices[devices.length - 1];

      const html5Qrcode = new Html5Qrcode(SCANNER_ID);
      html5QrcodeRef.current = html5Qrcode;

      await html5Qrcode.start(
        backCamera.id,
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
          disableFlip: false,
        },
        (decodedText) => {
          // Success callback
          onScan(decodedText);
          stopScanning();
        },
        () => {
          // Error callback — just continue scanning
        }
      );

      setIsScanning(true);
      setHasPermission(true);
    } catch (err) {
      if (err.name === 'NotAllowedError' || err.message?.includes('Permission denied')) {
        setHasPermission(false);
        setError('Camera access denied. Please allow camera permissions in your browser settings.');
      } else {
        setError(err.message || 'Failed to start camera scanner.');
      }
    }
  };

  const stopScanning = async () => {
    if (html5QrcodeRef.current) {
      try {
        await html5QrcodeRef.current.stop();
        html5QrcodeRef.current.clear();
      } catch {
        // Ignore cleanup errors
      }
      html5QrcodeRef.current = null;
    }
    setIsScanning(false);
  };

  useEffect(() => {
    return () => {
      stopScanning();
    };
  }, []);

  return (
    <div className="flex flex-col items-center gap-5">
      {/* Scanner viewport */}
      <div className="relative">
        <div
          id={SCANNER_ID}
          className="rounded-2xl overflow-hidden bg-black"
          style={{ width: '100%', maxWidth: '360px', minHeight: isScanning ? '300px' : '0px' }}
        />

        {!isScanning && !error && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center gap-4 py-10"
          >
            <div className="w-24 h-24 rounded-2xl bg-brand-500/20 border-2 border-brand-500/40 flex items-center justify-center">
              <Camera className="w-12 h-12 text-brand-400" />
            </div>
            <p className="text-slate-400 text-sm text-center max-w-xs">
              Point your camera at the QR code displayed in your classroom
            </p>
          </motion.div>
        )}

        {/* Scan overlay when scanning */}
        {isScanning && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <div className="relative w-56 h-56">
              {/* Corner brackets */}
              {['top-left', 'top-right', 'bottom-left', 'bottom-right'].map((corner) => (
                <div
                  key={corner}
                  className={`absolute w-8 h-8 border-brand-400 ${
                    corner.includes('top') ? 'top-0 border-t-[3px]' : 'bottom-0 border-b-[3px]'
                  } ${
                    corner.includes('left') ? 'left-0 border-l-[3px]' : 'right-0 border-r-[3px]'
                  }`}
                />
              ))}
              {/* Scan line animation */}
              <motion.div
                className="absolute left-1 right-1 h-0.5 bg-brand-400 rounded-full shadow-glow"
                animate={{ top: ['10%', '90%', '10%'] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Error message */}
      {error && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-start gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm max-w-sm"
        >
          <CameraOff className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <p>{error}</p>
        </motion.div>
      )}

      {/* Action buttons */}
      {!isScanning ? (
        <button
          onClick={startScanning}
          disabled={disabled || isLoading}
          className="btn-primary btn-lg gap-3"
          id="start-scanner-btn"
        >
          {isLoading ? (
            <>
              <div className="spinner" />
              Processing...
            </>
          ) : (
            <>
              <Camera className="w-5 h-5" />
              Start Camera Scanner
            </>
          )}
        </button>
      ) : (
        <button
          onClick={stopScanning}
          className="btn-secondary gap-3"
          id="stop-scanner-btn"
        >
          <RefreshCw className="w-4 h-4" />
          Stop Scanner
        </button>
      )}

      {/* Permission denied help */}
      {hasPermission === false && (
        <p className="text-xs text-slate-500 text-center max-w-xs">
          To enable camera access: open your browser settings → Site Settings → Camera → Allow for this site.
        </p>
      )}
    </div>
  );
};

export default QRScanner;
