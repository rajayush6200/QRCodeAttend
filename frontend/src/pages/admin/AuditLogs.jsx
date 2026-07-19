import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Shield, Search, Filter } from 'lucide-react';
import { adminApi } from '@/api/admin.api';
import { formatDateTime } from '@/utils/formatters';

const AuditLogs = () => {
  const [page, setPage] = useState(1);
  const [resourceType, setResourceType] = useState('');
  const [action, setAction] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-audit-logs', page, resourceType, action],
    queryFn: () => adminApi.getAuditLogs({ page, limit: 20, resourceType: resourceType || undefined, action: action || undefined }),
    select: (res) => res.data,
  });

  const logs = data?.data || [];
  const pagination = data?.pagination;

  const resourceOptions = ['User', 'Institution', 'Department', 'Course', 'Session', 'Attendance'];
  const actionOptions = ['CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'STARTED', 'ENDED', 'CANCELLED'];

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Audit Logs</h1>
        <p className="page-subtitle">Track system-wide mutations and sensitive actions</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <select className="input max-w-xs" value={resourceType} onChange={(e) => { setResourceType(e.target.value); setPage(1); }}>
          <option value="">All Resources</option>
          {resourceOptions.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        <select className="input max-w-xs" value={action} onChange={(e) => { setAction(e.target.value); setPage(1); }}>
          <option value="">All Actions</option>
          {actionOptions.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><div className="spinner" /></div>
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Action</th>
                <th>Resource</th>
                <th>User</th>
                <th>IP Address</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-16 text-slate-400">No logs found.</td></tr>
              ) : logs.map((log) => (
                <tr key={log._id}>
                  <td className="text-xs text-slate-400 font-mono">{formatDateTime(log.timestamp)}</td>
                  <td>
                    <span className="badge bg-white/10 text-slate-300 font-mono text-[10px]">
                      {log.action}
                    </span>
                  </td>
                  <td>
                    <p className="text-sm text-slate-200">{log.resourceType}</p>
                    <p className="text-xs text-slate-500 font-mono truncate max-w-[120px]">{log.resourceId}</p>
                  </td>
                  <td>
                    <p className="text-sm text-slate-200">{log.userId?.name || 'System'}</p>
                    <p className="text-xs text-slate-500">{log.userId?.email || '—'}</p>
                  </td>
                  <td className="text-xs text-slate-500 font-mono">{log.ipAddress || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pagination?.totalPages > 1 && (
        <div className="flex justify-between items-center mt-6">
          <p className="text-xs text-slate-500">Page {page} of {pagination.totalPages}</p>
          <div className="flex gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn-secondary btn-sm">Prev</button>
            <button onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))} disabled={page === pagination.totalPages} className="btn-secondary btn-sm">Next</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuditLogs;
