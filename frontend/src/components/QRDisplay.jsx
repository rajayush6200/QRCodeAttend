import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSocket } from '@/hooks/useSocket';

/**
 * QRDisplay — Faculty-facing live QR code component.
 *
 * Receives initial QR data as prop and subscribes to Socket.IO
 * 'qr:updated' events for real-time rotation without polling.
 * Shows a countdown ring to indicate time until next rotation.
 */
const QRDisplay = ({ sessionId, initialQr }) => {
  const [qrData, setQrData] = useState(initialQr);
  const [timeLeft, setTimeLeft] = useState(initialQr?.expiresIn || 30);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { on, off, joinSession } = useSocket();

  useEffect(() => {
    if (!sessionId) return;
    joinSession(sessionId);
  }, [sessionId, joinSession]);

  useEffect(() => {
    const handleQrUpdate = (data) => {
      if (data.sessionId === sessionId) {
        setIsRefreshing(true);
        setTimeout(() => {
          setQrData(data.qr);
          setTimeLeft(data.qr.expiresIn || data.qr.rotationInterval);
          setIsRefreshing(false);
        }, 300);
      }
    };

    on('qr:updated', handleQrUpdate);
    return () => off('qr:updated', handleQrUpdate);
  }, [sessionId, on, off]);

  // Countdown timer
  useEffect(() => {
    if (!qrData) return;
    setTimeLeft(qrData.expiresIn || qrData.rotationInterval || 30);

    const interval = setInterval(() => {
      setTimeLeft((t) => Math.max(0, t - 1));
    }, 1000);

    return () => clearInterval(interval);
  }, [qrData]);

  if (!qrData) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400">
        <div className="text-center">
          <div className="spinner mb-3" />
          <p>Generating QR code...</p>
        </div>
      </div>
    );
  }

  const rotationInterval = qrData.rotationInterval || 30;
  const progress = timeLeft / rotationInterval;
  const circumference = 2 * Math.PI * 54; // radius = 54
  const strokeDashoffset = circumference * (1 - progress);

  return (
    <div className="flex flex-col items-center gap-6">
      {/* QR Code with spin border */}
      <AnimatePresence mode="wait">
        <motion.div
          key={qrData.token}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.05 }}
          transition={{ duration: 0.3 }}
          className={`relative transition-opacity duration-300 ${isRefreshing ? 'opacity-30' : 'opacity-100'}`}
        >
          {/* Spinning gradient border */}
          <div className="relative p-[3px] rounded-2xl overflow-hidden">
            <div
              className="absolute inset-0 rounded-2xl animate-spin-slow"
              style={{
                background: 'conic-gradient(from 0deg, #6366f1, #8b5cf6, #06b6d4, #10b981, #6366f1)',
              }}
            />
            <div className="relative bg-white rounded-xl p-3 z-10">
              <img
                src={qrData.qrDataUrl}
                alt="Attendance QR Code"
                className="w-56 h-56 object-contain"
                draggable={false}
              />
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Countdown Ring */}
      <div className="flex flex-col items-center gap-3">
        <div className="relative">
          <svg width="128" height="128" className="-rotate-90">
            {/* Background circle */}
            <circle
              cx="64"
              cy="64"
              r="54"
              fill="none"
              stroke="rgba(99,102,241,0.15)"
              strokeWidth="8"
            />
            {/* Progress circle */}
            <circle
              cx="64"
              cy="64"
              r="54"
              fill="none"
              stroke={timeLeft <= 5 ? '#ef4444' : timeLeft <= 10 ? '#f59e0b' : '#6366f1'}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              className="countdown-ring transition-all duration-1000"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span
              className={`text-3xl font-bold font-mono transition-colors duration-300 ${
                timeLeft <= 5 ? 'text-red-400' : timeLeft <= 10 ? 'text-amber-400' : 'text-brand-300'
              }`}
            >
              {timeLeft}
            </span>
            <span className="text-xs text-slate-400">seconds</span>
          </div>
        </div>

        <div className="text-center">
          <p className="text-sm text-slate-400">
            QR refreshes every{' '}
            <span className="text-brand-300 font-semibold">{rotationInterval}s</span>
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Generated at {new Date(qrData.generatedAt).toLocaleTimeString()}
          </p>
        </div>
      </div>

      {/* Security badge */}
      <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20">
        <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        <span className="text-xs text-emerald-400 font-medium">
          TOTP-Secured · GPS Verified · Device Fingerprinted
        </span>
      </div>
    </div>
  );
};

export default QRDisplay;
