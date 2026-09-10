'use client';

import React, { useState, useEffect } from 'react';
import { 
  Play, 
  UploadCloud, 
  CheckCircle2, 
  XCircle, 
  FileText, 
  Clock, 
  RefreshCw,
  AlertTriangle,
  ArrowRight
} from 'lucide-react';
import { api, OverallStats, IngestRunItem } from '@/lib/api';
import Link from 'next/link';

export default function DashboardPage() {
  const [stats, setStats] = useState<OverallStats | null>(null);
  const [runs, setRuns] = useState<IngestRunItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [ingesting, setIngesting] = useState(false);
  const [lastResult, setLastResult] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsData, runsData] = await Promise.all([
        api.getStats(),
        api.getRuns(),
      ]);
      setStats(statsData);
      setRuns(runsData);
    } catch (err: any) {
      setError(err.message || 'Failed to connect to backend API');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRunSample = async () => {
    setIngesting(true);
    setError(null);
    try {
      const res = await api.runSampleIngestion();
      setLastResult(res);
      await fetchData();
    } catch (err: any) {
      setError(err.message || 'Sample ingestion failed');
    } finally {
      setIngesting(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIngesting(true);
    setError(null);
    try {
      const res = await api.uploadFile(file);
      setLastResult(res);
      await fetchData();
    } catch (err: any) {
      setError(err.message || 'File upload failed');
    } finally {
      setIngesting(false);
    }
  };

  const acceptRate = stats && stats.totalProcessed > 0
    ? ((stats.totalAccepted / stats.totalProcessed) * 100).toFixed(1)
    : '0';

  const rejectRate = stats && stats.totalProcessed > 0
    ? ((stats.totalRejected / stats.totalProcessed) * 100).toFixed(1)
    : '0';

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Ingestion & Reporting Overview
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Automated validation pipeline, idempotent deduplication, and forensic audit log.
          </p>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh Stats
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <span>{error} (Ensure the NestJS backend is running on port 4000)</span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-400">Total Processed</span>
            <FileText className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="mt-3 text-3xl font-bold text-white">
            {stats ? stats.totalProcessed.toLocaleString() : '0'}
          </div>
          <p className="mt-1 text-xs text-slate-400">Across {stats ? stats.totalRuns : 0} ingestion runs</p>
        </div>

        <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-400">Accepted Records</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-emerald-400">
              {stats ? stats.totalAccepted.toLocaleString() : '0'}
            </span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              {acceptRate}%
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-400">Clean, usable and indexed in store</p>
        </div>

        <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-400">Rejected (Dead-Letter)</span>
            <XCircle className="w-4 h-4 text-rose-400" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-rose-400">
              {stats ? stats.totalRejected.toLocaleString() : '0'}
            </span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">
              {rejectRate}%
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-400">Recoverable with full error reasons</p>
        </div>

        <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-400">Pipeline Mode</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-3 text-lg font-bold text-white flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
            Dual (CLI & API)
          </div>
          <p className="mt-1 text-xs text-slate-400">Idempotency & conflict strategy active</p>
        </div>
      </div>

      {/* Trigger & Actions Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Run Ingestion Card */}
        <div className="lg:col-span-2 p-6 rounded-xl bg-slate-900 border border-slate-800 shadow-sm space-y-5">
          <div>
            <h2 className="text-lg font-bold text-white">Execute Ingestion Pipeline</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Trigger ingestion on the bundled 247+ record dirty dataset or upload a new JSON file.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-lg bg-slate-800/60 border border-slate-700/60 flex flex-col justify-between">
              <div>
                <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">Option A: Bundled Sample</span>
                <p className="text-xs text-slate-300 mt-1">
                  Executes <code className="text-amber-300 bg-slate-900 px-1 py-0.5 rounded">records_sample_250.json</code> containing all PDF edge cases (duplicates, bad dates, out-of-range values, missing fields).
                </p>
              </div>
              <button
                onClick={handleRunSample}
                disabled={ingesting}
                className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold shadow-md transition disabled:opacity-50"
              >
                <Play className="w-4 h-4 fill-current" />
                {ingesting ? 'Processing Records...' : 'Run Bundled Sample File'}
              </button>
            </div>

            <div className="p-4 rounded-lg bg-slate-800/60 border border-slate-700/60 flex flex-col justify-between">
              <div>
                <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Option B: Upload File</span>
                <p className="text-xs text-slate-300 mt-1">
                  Upload any external JSON array or NDJSON (newline-delimited) file for automated validation.
                </p>
              </div>
              <label className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-sm font-semibold cursor-pointer border border-slate-600 transition">
                <UploadCloud className="w-4 h-4" />
                <span>Upload JSON File</span>
                <input
                  type="file"
                  accept=".json,.ndjson"
                  onChange={handleFileUpload}
                  disabled={ingesting}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {lastResult && (
            <div className="p-4 rounded-lg bg-slate-800/80 border border-slate-700 space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-300">
                <span className="font-semibold text-emerald-400">Ingestion Execution Completed</span>
                <span>Duration: {lastResult.durationMs}ms</span>
              </div>
              <div className="grid grid-cols-4 gap-2 text-center text-xs pt-1">
                <div className="p-2 rounded bg-slate-900/60">
                  <div className="text-slate-400">Total</div>
                  <div className="font-bold text-white text-sm">{lastResult.totalProcessed}</div>
                </div>
                <div className="p-2 rounded bg-slate-900/60">
                  <div className="text-emerald-400">Accepted</div>
                  <div className="font-bold text-emerald-400 text-sm">{lastResult.accepted}</div>
                </div>
                <div className="p-2 rounded bg-slate-900/60">
                  <div className="text-rose-400">Rejected</div>
                  <div className="font-bold text-rose-400 text-sm">{lastResult.rejected}</div>
                </div>
                <div className="p-2 rounded bg-slate-900/60">
                  <div className="text-amber-400">Skipped (R3)</div>
                  <div className="font-bold text-amber-400 text-sm">{lastResult.skippedDuplicates}</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Rejection Categorization Breakdown Card (R5) */}
        <div className="p-6 rounded-xl bg-slate-900 border border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-white">Rejection Breakdown (R5)</h2>
              <p className="text-xs text-slate-400">Grouped by primary failure reason</p>
            </div>
            <Link
              href="/rejections"
              className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-medium"
            >
              Vault <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {stats && Object.keys(stats.rejectionBreakdown).length > 0 ? (
            <div className="space-y-3 pt-1">
              {Object.entries(stats.rejectionBreakdown)
                .sort((a, b) => b[1] - a[1])
                .map(([reason, count]) => {
                  const pct = stats.totalRejected > 0 ? ((count / stats.totalRejected) * 100).toFixed(0) : '0';
                  return (
                    <div key={reason} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-mono text-slate-300">{reason}</span>
                        <span className="font-semibold text-slate-200">{count} ({pct}%)</span>
                      </div>
                      <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-rose-500 h-1.5 rounded-full"
                          style={{ width: `${pct}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
            </div>
          ) : (
            <div className="py-8 text-center text-xs text-slate-500">
              No rejected records recorded yet. Run ingestion to view breakdown.
            </div>
          )}
        </div>
      </div>

      {/* Recent Ingestion Runs Table */}
      <div className="p-6 rounded-xl bg-slate-900 border border-slate-800 shadow-sm space-y-4">
        <h2 className="text-lg font-bold text-white">Ingestion History & Audit Runs</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-800/60 uppercase text-[10px] text-slate-400">
              <tr>
                <th className="py-2.5 px-3">Run ID</th>
                <th className="py-2.5 px-3">Source File</th>
                <th className="py-2.5 px-3">Started At</th>
                <th className="py-2.5 px-3 text-right">Total</th>
                <th className="py-2.5 px-3 text-right text-emerald-400">Accepted</th>
                <th className="py-2.5 px-3 text-right text-rose-400">Rejected</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {runs.length > 0 ? (
                runs.map((run) => (
                  <tr key={run.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-2.5 px-3 font-mono text-slate-400">{run.id.slice(0, 8)}...</td>
                    <td className="py-2.5 px-3 text-slate-200 truncate max-w-xs">{run.sourceFile}</td>
                    <td className="py-2.5 px-3 text-slate-400">{new Date(run.startedAt).toLocaleString()}</td>
                    <td className="py-2.5 px-3 text-right font-medium text-white">{run.totalRecords}</td>
                    <td className="py-2.5 px-3 text-right font-semibold text-emerald-400">{run.acceptedCount}</td>
                    <td className="py-2.5 px-3 text-right font-semibold text-rose-400">{run.rejectedCount}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-slate-500">
                    No ingestion runs recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
