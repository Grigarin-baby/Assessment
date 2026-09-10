'use client';

import React, { useState, useEffect } from 'react';
import { 
  Filter, 
  RefreshCw, 
  Calendar, 
  ChevronLeft, 
  ChevronRight,
  Database,
  Search
} from 'lucide-react';
import { api, RecordItem } from '@/lib/api';

export default function RecordsExplorerPage() {
  const [records, setRecords] = useState<RecordItem[]>([]);
  const [sources, setSources] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 15, totalPages: 1 });

  // Filter states
  const [selectedSource, setSelectedSource] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');

  const loadSources = async () => {
    try {
      const srcList = await api.getSources();
      setSources(srcList);
    } catch {}
  };

  const fetchRecords = async (page: number = 1) => {
    setLoading(true);
    try {
      const res = await api.getRecords({
        source: selectedSource || undefined,
        status: selectedStatus || undefined,
        from: fromDate ? new Date(fromDate).toISOString() : undefined,
        to: toDate ? new Date(toDate).toISOString() : undefined,
        page,
        limit: pagination.limit,
      });
      setRecords(res.data);
      setPagination(res.pagination);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSources();
  }, []);

  useEffect(() => {
    fetchRecords(1);
  }, [selectedSource, selectedStatus, fromDate, toDate]);

  const clearFilters = () => {
    setSelectedSource('');
    setSelectedStatus('');
    setFromDate('');
    setToDate('');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'OK':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'WARN':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'FAIL':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      default:
        return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl flex items-center gap-2.5">
            <Database className="w-7 h-7 text-indigo-400" />
            Accepted Records Explorer (R4)
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Query, filter, and inspect normalized records stored in PostgreSQL.
          </p>
        </div>
        <button
          onClick={() => fetchRecords(pagination.page)}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Filter Control Bar (Requirement R4) */}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-indigo-400" />
            R4 Query Filters
          </span>
          {(selectedSource || selectedStatus || fromDate || toDate) && (
            <button
              onClick={clearFilters}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-medium"
            >
              Reset Filters
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Source Filter */}
          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">Source System</label>
            <select
              value={selectedSource}
              onChange={(e) => setSelectedSource(e.target.value)}
              className="w-full text-xs rounded-lg bg-slate-800 border border-slate-700 text-slate-200 px-3 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="">All Sources</option>
              {sources.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">Status</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full text-xs rounded-lg bg-slate-800 border border-slate-700 text-slate-200 px-3 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="">All Statuses (OK, WARN, FAIL)</option>
              <option value="OK">OK</option>
              <option value="WARN">WARN</option>
              <option value="FAIL">FAIL</option>
            </select>
          </div>

          {/* From Date */}
          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">From Date</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full text-xs rounded-lg bg-slate-800 border border-slate-700 text-slate-200 px-3 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {/* To Date */}
          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">To Date</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full text-xs rounded-lg bg-slate-800 border border-slate-700 text-slate-200 px-3 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* Results Table */}
      <div className="rounded-xl bg-slate-900 border border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-800/80 uppercase text-[10px] text-slate-400 border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Record ID (UUID / String)</th>
                <th className="py-3 px-4">Source</th>
                <th className="py-3 px-4">Recorded At (UTC)</th>
                <th className="py-3 px-4 text-center">Value (0-100)</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-center">Version</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-indigo-400 mb-2" />
                    Loading records from database...
                  </td>
                </tr>
              ) : records.length > 0 ? (
                records.map((rec) => (
                  <tr key={rec.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3 px-4 font-mono font-medium text-slate-200">
                      {rec.id}
                    </td>
                    <td className="py-3 px-4 font-semibold text-indigo-300">
                      {rec.source}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-400">
                      {new Date(rec.recordedAt).toISOString()}
                    </td>
                    <td className="py-3 px-4 text-center font-bold text-white">
                      {rec.value}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getStatusBadge(rec.status)}`}>
                        {rec.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center font-mono text-slate-500">
                      v{rec.version}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    No records match the selected query filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="py-3 px-4 bg-slate-900 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div>
            Showing <span className="text-white font-medium">{records.length}</span> of{' '}
            <span className="text-white font-medium">{pagination.total}</span> matching records
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchRecords(pagination.page - 1)}
              disabled={pagination.page <= 1 || loading}
              className="p-1.5 rounded-md bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:pointer-events-none text-slate-200"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs">
              Page {pagination.page} of {pagination.totalPages || 1}
            </span>
            <button
              onClick={() => fetchRecords(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages || loading}
              className="p-1.5 rounded-md bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:pointer-events-none text-slate-200"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
