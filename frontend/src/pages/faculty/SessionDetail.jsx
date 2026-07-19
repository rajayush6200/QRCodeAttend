import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  Play, Square, Users, Clock, MapPin, Download,
  BarChart2, RefreshCw, UserCheck, AlertTriangle,
} from 'lucide-react';
import { facultyApi } from '@/api/faculty.api';
import QRDisplay from '@/components/QRDisplay';
import AttendanceTable from '@/components/AttendanceTable';
import { useSocket } from '@/hooks/useSocket';
import { formatDateTime, formatPercent, downloadBlob } from '@/utils/formatters';

const SessionDetail = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { joinSession, on, off } = useSocket();
  const [qrData, setQrData] = useState(null);
  const [liveAttendance, setLiveAttendance] = useState([]);
  const [activeTab, setActiveTab] = useState('qr');

  const { data: sessionRes, isLoading } = useQuery({
    queryKey: ['session', sessionId],
    queryFn: () => facultyApi.getSessionById(sessionId),
    select: (res) => res.data.data,
    refetchInterval: 30000,
  });

  const { data: attendanceRes } = useQuery({
    queryKey: ['session-attendance', sessionId],
    queryFn: () => facultyApi.getSessionAttendance(sessionId),
    select: (res) => res.data.data,
    refetchInterval: session?.status === 'active' ? 30000 : false,
  });

  const session = sessionRes?.session;
  const attendance = attendanceRes?.attendance || [];
  const summary = attendanceRes?.summary || {};

  // Join Socket.IO session room
  useEffect(() => {
    if (session?.status === 'active') {
      joinSession(sessionId);
    }
  }, [session?.status, sessionId, joinSession]);

  // Listen for live attendance updates
  useEffect(() => {
    const handleAttendance = (studentInfo) => {
      setLiveAttendance((prev) => {
        const exists = prev.find((s) => s._id === studentInfo._id);
        if (exists) return prev;
        return [studentInfo, ...prev];
      });
      queryClient.invalidateQueries({ queryKey: ['session-attendance', sessionId] });
      toast.success(`${studentInfo.name} marked ${studentInfo.status}!`, { icon: '✅', duration: 3000 });
    };
    on('attendance:marked', handleAttendance);
    return () => off('attendance:marked', handleAttendance);
  }, [on, off, queryClient, sessionId]);

  const startMutation = useMutation({
    mutationFn: () => facultyApi.startSession(sessionId),
    onSuccess: (res) => {
      setQrData(res.data.data.qr);
      queryClient.invalidateQueries({ queryKey: ['session', sessionId] });
      toast.success('Session started! QR code is live.');
    },
  });

  const endMutation = useMutation({
    mutationFn: () => facultyApi.endSession(sessionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['session', sessionId] });
      setQrData(null);
      toast.success('Session ended. Absent students auto-marked.');
    },
  });

  const exportPdf = useMutation({
    mutationFn: () => facultyApi.exportPdf(sessionId),
    onSuccess: (res) => downloadBlob(res.data, `attendance_${sessionId}.pdf`),
  });

  const exportExcel = useMutation({
    mutationFn: () => facultyApi.exportExcel(sessionId),
    onSuccess: (res) => downloadBlob(res.data, `attendance_${sessionId}.xlsx`),
  });

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <div className="spinner" />
    </div>
  );

  if (!session) return (
    <div className="text-center py-20 text-slate-400">Session not found.</div>
  );

  const attendanceRate = summary.total
    ? Math.round(((summary.present + (summary.late || 0)) / summary.total) * 100)
    : 0;

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <p className="text-slate-400 text-sm mb-1">Session Details</p>
          <h1 className="text-2xl font-bold text-white">{session.title}</h1>
          <p className="text-slate-400 text-sm mt-1">
            {session.courseId?.name} · {formatDateTime(session.scheduledAt)}
          </p>
        </div>
        <div className="flex gap-3 flex-wrap">
          {session.status === 'scheduled' && (
            <button
              onClick={() => startMutation.mutate()}
              disabled={startMutation.isPending}
              className="btn-primary gap-2"
              id="start-session-btn"
            >
              {startMutation.isPending ? <div className="spinner" /> : <Play className="w-4 h-4" />}
              Start Session
            </button>
          )}
          {session.status === 'active' && (
            <button
              onClick={() => {
                if (window.confirm('End this session? Absent students will be auto-marked.')) {
                  endMutation.mutate();
                }
              }}
              disabled={endMutation.isPending}
              className="btn-danger gap-2"
              id="end-session-btn"
            >
              {endMutation.isPending ? <div className="spinner" /> : <Square className="w-4 h-4" />}
              End Session
            </button>
          )}
          {session.status === 'completed' && (
            <>
              <button onClick={() => exportPdf.mutate()} disabled={exportPdf.isPending} className="btn-secondary gap-2" id="export-pdf-btn">
                {exportPdf.isPending ? <div className="spinner" /> : <Download className="w-4 h-4" />}
                PDF
              </button>
              <button onClick={() => exportExcel.mutate()} disabled={exportExcel.isPending} className="btn-secondary gap-2" id="export-excel-btn">
                {exportExcel.isPending ? <div className="spinner" /> : <Download className="w-4 h-4" />}
                Excel
              </button>
            </>
          )}
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Enrolled', value: summary.total || session.totalStudents || 0, icon: Users, color: 'text-brand-400', bg: 'bg-brand-500/10' },
          { label: 'Present', value: summary.present || 0, icon: UserCheck, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
          { label: 'Late', value: summary.late || 0, icon: Clock, color: 'text-amber-400', bg: 'bg-amber-500/10' },
          { label: 'Attendance Rate', value: `${attendanceRate}%`, icon: BarChart2, color: attendanceRate >= 75 ? 'text-emerald-400' : 'text-red-400', bg: attendanceRate >= 75 ? 'bg-emerald-500/10' : 'bg-red-500/10' },
        ].map((stat) => (
          <div key={stat.label} className="card p-4">
            <div className={`w-9 h-9 rounded-lg ${stat.bg} flex items-center justify-center mb-3`}>
              <stat.icon className={`w-5 h-5 ${stat.color}`} />
            </div>
            <p className="text-2xl font-bold text-white">{stat.value}</p>
            <p className="text-xs text-slate-400 mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: QR Code */}
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-6">
            <div className={`w-2.5 h-2.5 rounded-full ${session.status === 'active' ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
            <h2 className="font-semibold text-white">
              {session.status === 'active' ? 'Live QR Code' : session.status === 'completed' ? 'Session Completed' : 'Session Not Started'}
            </h2>
            <span className={`ml-auto badge ${session.status === 'active' ? 'badge-active' : session.status === 'completed' ? 'badge-completed' : 'badge-scheduled'}`}>
              {session.status}
            </span>
          </div>

          {session.status === 'active' && (
            <QRDisplay sessionId={sessionId} initialQr={qrData} />
          )}

          {session.status === 'scheduled' && (
            <div className="text-center py-10">
              <div className="w-16 h-16 rounded-2xl bg-slate-500/10 flex items-center justify-center mx-auto mb-4">
                <Play className="w-8 h-8 text-slate-500" />
              </div>
              <p className="text-slate-400">Start the session to generate the QR code</p>
            </div>
          )}

          {session.status === 'completed' && (
            <div className="text-center py-10">
              <div className="text-5xl mb-4">✅</div>
              <p className="text-slate-300 font-medium">Session completed</p>
              <p className="text-slate-500 text-sm mt-1">
                {summary.present} students marked present out of {summary.total}
              </p>
            </div>
          )}

          {/* Session Info */}
          <div className="mt-6 pt-4 border-t border-white/5 space-y-2">
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <MapPin className="w-4 h-4 text-brand-400" />
              <span>Geo-fence radius: {session.geoLocation?.radius}m</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <RefreshCw className="w-4 h-4 text-brand-400" />
              <span>QR rotation: every {session.qrRotationInterval}s</span>
            </div>
          </div>
        </div>

        {/* Right: Live Attendance */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-white">
              {session.status === 'active' ? 'Live Attendance' : 'Attendance Record'}
            </h2>
            {session.status === 'active' && (
              <div className="flex items-center gap-2 text-xs text-emerald-400">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Real-time
              </div>
            )}
          </div>
          <AttendanceTable
            records={attendance}
            showStudent={true}
            isLive={session.status === 'active'}
            emptyMessage={
              session.status === 'active'
                ? 'Waiting for students to scan QR...'
                : 'No attendance records.'
            }
          />
        </div>
      </div>
    </div>
  );
};

export default SessionDetail;
