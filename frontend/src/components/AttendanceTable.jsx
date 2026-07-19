import { motion, AnimatePresence } from 'framer-motion';
import { formatDateTime, getStatusBadgeClass, getInitials } from '@/utils/formatters';
import { CheckCircle, Clock, XCircle, MapPin, Smartphone } from 'lucide-react';

/**
 * AttendanceTable — Reusable attendance records table.
 * Used in both faculty session detail view (live) and student history view.
 */
const AttendanceTable = ({
  records = [],
  showStudent = true,
  showCourse = false,
  isLive = false,
  emptyMessage = 'No attendance records found.',
}) => {
  const statusIcon = {
    present: <CheckCircle className="w-4 h-4 text-emerald-400" />,
    late: <Clock className="w-4 h-4 text-amber-400" />,
    absent: <XCircle className="w-4 h-4 text-red-400" />,
    excused: <CheckCircle className="w-4 h-4 text-purple-400" />,
  };

  return (
    <div className="table-container">
      <table className="table">
        <thead>
          <tr>
            <th className="rounded-tl-xl">#</th>
            {showStudent && <th>Student</th>}
            {showCourse && <th>Course</th>}
            {isLive ? null : <th>Session</th>}
            <th>Status</th>
            <th>Marked At</th>
            <th>Verification</th>
            <th className="rounded-tr-xl">Distance</th>
          </tr>
        </thead>
        <tbody>
          <AnimatePresence initial={false}>
            {records.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="py-16 text-center text-slate-400"
                >
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center">
                      <CheckCircle className="w-6 h-6 text-slate-500" />
                    </div>
                    <p className="text-sm">{emptyMessage}</p>
                  </div>
                </td>
              </tr>
            ) : (
              records.map((record, idx) => (
                <motion.tr
                  key={record._id || idx}
                  initial={isLive ? { opacity: 0, x: -20, backgroundColor: 'rgba(99,102,241,0.15)' } : {}}
                  animate={{ opacity: 1, x: 0, backgroundColor: 'transparent' }}
                  transition={{ duration: 0.4 }}
                >
                  <td className="text-slate-500 text-xs font-mono">{idx + 1}</td>

                  {showStudent && (
                    <td>
                      <div className="flex items-center gap-3">
                        {/* Avatar */}
                        <div className="w-8 h-8 rounded-full bg-brand-500/20 flex items-center justify-center text-brand-300 text-xs font-semibold flex-shrink-0">
                          {record.studentId?.profilePhoto ? (
                            <img
                              src={record.studentId.profilePhoto}
                              alt=""
                              className="w-full h-full rounded-full object-cover"
                            />
                          ) : (
                            getInitials(record.studentId?.name || '?')
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-slate-200 text-sm font-medium truncate">
                            {record.studentId?.name || 'Unknown'}
                          </p>
                          <p className="text-slate-500 text-xs font-mono">
                            {record.studentId?.enrollmentNumber || '—'}
                          </p>
                        </div>
                      </div>
                    </td>
                  )}

                  {showCourse && (
                    <td>
                      <p className="text-slate-200 text-sm">
                        {record.courseId?.name || '—'}
                      </p>
                      <p className="text-slate-500 text-xs font-mono">
                        {record.courseId?.code}
                      </p>
                    </td>
                  )}

                  {!isLive && (
                    <td>
                      <p className="text-slate-300 text-sm truncate max-w-[160px]">
                        {record.sessionId?.title || '—'}
                      </p>
                    </td>
                  )}

                  <td>
                    <span className={getStatusBadgeClass(record.status)}>
                      {statusIcon[record.status]}
                      {record.status}
                    </span>
                  </td>

                  <td className="text-slate-400 text-xs">
                    {formatDateTime(record.markedAt)}
                  </td>

                  <td>
                    <div className="flex items-center gap-1">
                      {record.verificationMethod === 'qr+gps' ? (
                        <span className="flex items-center gap-1 text-emerald-400 text-xs">
                          <MapPin className="w-3 h-3" />
                          QR + GPS
                        </span>
                      ) : (
                        <span className="text-amber-400 text-xs">QR Only</span>
                      )}
                      {record.isManualOverride && (
                        <span className="ml-1 text-purple-400 text-xs">(Override)</span>
                      )}
                    </div>
                    {record.deviceFingerprint && (
                      <div className="flex items-center gap-1 mt-0.5">
                        <Smartphone className="w-3 h-3 text-slate-500" />
                        <span className="text-slate-500 text-xs">Device verified</span>
                      </div>
                    )}
                  </td>

                  <td className="text-xs font-mono">
                    {record.geoLocation?.distanceFromSession != null ? (
                      <span className={
                        record.geoLocation.distanceFromSession <= 50 ? 'text-emerald-400' :
                        record.geoLocation.distanceFromSession <= 100 ? 'text-amber-400' :
                        'text-red-400'
                      }>
                        {record.geoLocation.distanceFromSession}m
                      </span>
                    ) : (
                      <span className="text-slate-500">—</span>
                    )}
                  </td>
                </motion.tr>
              ))
            )}
          </AnimatePresence>
        </tbody>
      </table>
    </div>
  );
};

export default AttendanceTable;
