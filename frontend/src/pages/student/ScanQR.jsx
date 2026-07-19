import { useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { CheckCircle, XCircle, Clock, MapPin, Smartphone, AlertTriangle, QrCode } from 'lucide-react';
import { studentApi } from '@/api/student.api';
import QRScanner from '@/components/QRScanner';
import { useGeolocation } from '@/hooks/useGeolocation';
import { generateDeviceFingerprint } from '@/utils/deviceFingerprint';
import { formatPercent, getRateColor } from '@/utils/formatters';

const ScanQR = () => {
  const [scanResult, setScanResult] = useState(null); // null | 'success' | 'error'
  const [scanMessage, setScanMessage] = useState('');
  const { position, error: geoError, isLoading: geoLoading, getPosition } = useGeolocation();

  const { data: coursesRes } = useQuery({
    queryKey: ['my-courses'],
    queryFn: () => studentApi.getMyCourses(),
    select: (res) => res.data.data.courses,
  });

  const markAttendanceMutation = useMutation({
    mutationFn: (data) => studentApi.markAttendance(data),
    onSuccess: (res) => {
      setScanResult('success');
      setScanMessage(res.data.message);
      toast.success(res.data.message, { duration: 5000 });
    },
    onError: (err) => {
      setScanResult('error');
      setScanMessage(err.response?.data?.message || 'Failed to mark attendance.');
    },
  });

  const handleScan = async (payload) => {
    if (markAttendanceMutation.isPending) return;

    // Get device fingerprint
    const deviceFingerprint = await generateDeviceFingerprint();

    // Request geolocation if not already obtained
    if (!position) {
      getPosition();
    }

    markAttendanceMutation.mutate({
      qrPayload: payload,
      deviceFingerprint,
      geoLocation: position || undefined,
    });
  };

  const resetScan = () => {
    setScanResult(null);
    setScanMessage('');
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="page-header">
        <h1 className="page-title">Scan QR Code</h1>
        <p className="page-subtitle">Point your camera at the QR code displayed in your classroom</p>
      </div>

      {/* GPS Status Bar */}
      <div className={`flex items-center gap-3 p-4 rounded-xl mb-6 ${
        position ? 'bg-emerald-500/10 border border-emerald-500/20' :
        geoError ? 'bg-red-500/10 border border-red-500/20' :
        'bg-white/5 border border-white/10'
      }`}>
        <MapPin className={`w-5 h-5 flex-shrink-0 ${
          position ? 'text-emerald-400' : geoError ? 'text-red-400' : 'text-slate-400'
        }`} />
        <div className="flex-1">
          {position ? (
            <p className="text-sm text-emerald-400 font-medium">
              GPS acquired · ±{Math.round(position.accuracy)}m accuracy
            </p>
          ) : geoError ? (
            <p className="text-sm text-red-400">{geoError}</p>
          ) : (
            <p className="text-sm text-slate-400">GPS location not yet obtained</p>
          )}
        </div>
        {!position && !geoError && (
          <button
            onClick={getPosition}
            disabled={geoLoading}
            className="btn-secondary btn-sm"
          >
            {geoLoading ? <div className="spinner w-3 h-3" /> : 'Enable GPS'}
          </button>
        )}
      </div>

      {/* Result States */}
      {scanResult === 'success' && (
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="card p-8 text-center mb-6"
        >
          <div className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-10 h-10 text-emerald-400" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Attendance Marked!</h2>
          <p className="text-slate-400 text-sm mb-6">{scanMessage}</p>
          <button onClick={resetScan} className="btn-secondary">Scan Again</button>
        </motion.div>
      )}

      {scanResult === 'error' && (
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="card p-8 text-center mb-6"
        >
          <div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
            <XCircle className="w-10 h-10 text-red-400" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Attendance Failed</h2>
          <p className="text-slate-400 text-sm mb-6">{scanMessage}</p>
          <button onClick={resetScan} className="btn-secondary">Try Again</button>
        </motion.div>
      )}

      {/* Scanner */}
      {!scanResult && (
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-4">
            <QrCode className="w-5 h-5 text-brand-400" />
            <h2 className="font-semibold text-white">Camera Scanner</h2>
          </div>
          <QRScanner
            onScan={handleScan}
            isLoading={markAttendanceMutation.isPending}
          />
        </div>
      )}

      {/* Security Info */}
      <div className="mt-6 grid grid-cols-3 gap-3">
        {[
          { icon: QrCode, label: 'TOTP QR', desc: 'Rotates every 30s' },
          { icon: MapPin, label: 'GPS Verified', desc: 'Location required' },
          { icon: Smartphone, label: 'Device ID', desc: 'One device only' },
        ].map((item) => (
          <div key={item.label} className="card p-3 text-center">
            <item.icon className="w-5 h-5 text-brand-400 mx-auto mb-2" />
            <p className="text-xs font-semibold text-slate-300">{item.label}</p>
            <p className="text-xs text-slate-500 mt-0.5">{item.desc}</p>
          </div>
        ))}
      </div>

      {/* My Courses Quick Look */}
      {coursesRes?.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-semibold text-slate-400 mb-3">My Enrolled Courses</h3>
          <div className="space-y-2">
            {coursesRes.slice(0, 3).map((course) => (
              <div key={course._id} className="card p-3 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-brand-500/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold text-brand-300">{course.code?.slice(0, 2)}</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-200">{course.name}</p>
                  <p className="text-xs text-slate-500">{course.code}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ScanQR;
