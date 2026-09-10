'use client';

import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert,
  RefreshCw, 
  ChevronLeft, 
  ChevronRight, 
  Code2, 
  X,
  AlertCircle
} from 'lucide-react';
import { api, RejectionItem } from '@/lib/api';

export default function DeadLetterVaultPage() {
  const [rejections, setRejections] = useState<RejectionItem[]>([]);
  const [reasons, setReasons] = useState<string[]>([]);
  const [selectedReason, setSelectedReason] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 15, totalPages: 1 });
  const [inspectModal, setInspectModal] = useState<RejectionItem | null>(null);

  const loadReasons = async () => {
    try {
      const reasonList = await api.getReasons();
      setReasons(reasonList);
    } catch {}
  };

  const fetchRejections = async (page: number = 1) => {
    setLoading(true);
    try {
      const res = await api.getRejections({
        reason: selectedReason || undefined,
        page,
        limit: pagination.limit,
      });
      setRejections(res.data);
      setPagination(res.pagination);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReasons();
  }, []);

  useEffect(() => {
    fetchRejections(1);
  }, [selectedReason]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl flex items-center gap-2.5">
            <ShieldAlert className="w-7 h-7 text-rose-400" />
            Dead-Letter Audit Vault (R2)
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Forensic audit trail of all rejected records with untouched raw payloads and failure reasons.
          </p>
        </div>
        <button
          onClick={() => fetchRejections(pagination.page)}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Filter Bar */}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 shadow-sm flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 w-full max-w-sm">
          <label className="text-xs font-medium text-slate-400 whitespace-nowrap">Filter by Reason:</label>
          <select
            value={selectedReason}
            onChange={(e) => setSelectedReason(e.target.value)}
            className="w-full text-xs rounded-lg bg-slate-800 border border-slate-700 text-slate-200 px-3 py-2 focus:outline-none focus:ring-1 focus:ring-rose-500"
          >
            <option value="">All Rejection Reasons</option>
            {reasons.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>
        {selectedReason && (
          <button
            onClick={() => setSelectedReason('')}
            className="text-xs text-rose-400 hover:text-rose-300 font-medium"
          >
            Clear Filter
          </button>
        )}
      </div>

      {/* Rejections Table */}
      <div className="rounded-xl bg-slate-900 border border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-800/80 uppercase text-[10px] text-slate-400 border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Audit ID</th>
                <th className="py-3 px-4">Original ID</th>
                <th className="py-3 px-4">Primary Reason (R5)</th>
                <th className="py-3 px-4">All Detected Errors</th>
                <th className="py-3 px-4">Rejected At</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-rose-400 mb-2" />
                    Loading audit records from dead-letter vault...
                  </td>
                </tr>
              ) : rejections.length > 0 ? (
                rejections.map((rej) => (
                  <tr key={rej.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3 px-4 font-mono text-slate-400">
                      {rej.id.slice(0, 8)}...
                    </td>
                    <td className="py-3 px-4 font-mono font-medium text-slate-200">
                      {rej.originalId || <span className="text-slate-500 italic">None</span>}
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20 font-mono">
                        {rej.primaryReason}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-1">
                        {rej.allReasons.map((reason, idx) => (
                          <span
                            key={idx}
                            className="px-1.5 py-0.5 rounded text-[9px] bg-slate-800 text-slate-300 border border-slate-700 font-mono"
                          >
                            {reason}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-400">
                      {new Date(rej.createdAt).toLocaleTimeString()}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => setInspectModal(rej)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-indigo-400 hover:text-indigo-300 border border-slate-700 text-[11px] font-medium transition"
                      >
                        <Code2 className="w-3 h-3" />
                        Inspect Raw
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    No rejected records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="py-3 px-4 bg-slate-900 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div>
            Showing <span className="text-white font-medium">{rejections.length}</span> of{' '}
            <span className="text-white font-medium">{pagination.total}</span> rejected records
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchRejections(pagination.page - 1)}
              disabled={pagination.page <= 1 || loading}
              className="p-1.5 rounded-md bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:pointer-events-none text-slate-200"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs">
              Page {pagination.page} of {pagination.totalPages || 1}
            </span>
            <button
              onClick={() => fetchRejections(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages || loading}
              className="p-1.5 rounded-md bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:pointer-events-none text-slate-200"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Raw Payload Inspection Modal (Requirement R2 Forensic Recoverability) */}
      {inspectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 bg-slate-800/80 border-b border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-bold text-white">
                <AlertCircle className="w-4 h-4 text-rose-400" />
                <span>Forensic Inspection: Rejection #{inspectModal.id.slice(0, 8)}</span>
              </div>
              <button
                onClick={() => setInspectModal(null)}
                className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
              <div>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">All Identified Violations:</span>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {inspectModal.allReasons.map((r, i) => (
                    <span
                      key={i}
                      className="px-2.5 py-1 rounded text-xs bg-rose-500/10 text-rose-400 border border-rose-500/20 font-mono font-semibold"
                    >
                      {r}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Untouched Raw JSON Payload (100% Recoverable):
                  </span>
                  <span className="text-[10px] text-emerald-400 font-mono">Immutable Forensic Record</span>
                </div>
                <pre className="p-4 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-emerald-300 overflow-x-auto">
                  {JSON.stringify(inspectModal.rawPayload, null, 2)}
                </pre>
              </div>
            </div>
            <div className="p-3 bg-slate-800/60 border-t border-slate-800 text-right">
              <button
                onClick={() => setInspectModal(null)}
                className="px-4 py-1.5 text-xs font-medium rounded-lg bg-slate-700 hover:bg-slate-600 text-white"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
