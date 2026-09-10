'use client';

import React, { useState, useEffect } from 'react';
import { 
  Select, 
  DatePicker, 
  Tag, 
  Typography, 
  Space, 
  Button, 
  Spin, 
  Card, 
  Tooltip, 
  Table, 
  Alert,
  Modal,
  Dropdown,
  message
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { 
  DatabaseOutlined, 
  HistoryOutlined, 
  ClockCircleOutlined, 
  BranchesOutlined, 
  CheckCircleOutlined, 
  ExclamationCircleOutlined, 
  CloseCircleOutlined, 
  CopyOutlined, 
  DownOutlined, 
  UpOutlined,
  EyeOutlined,
  DownloadOutlined,
  FileExcelOutlined,
  FileTextOutlined,
  CodeOutlined,
  CheckOutlined
} from '@ant-design/icons';
import { api, RecordItem, RecordHistoryItem } from '@/lib/api';
import { CrmDataTable } from '@/components/CrmDataTable';
import { useTheme } from '@/theme/ThemeContext';
import { formatToIST } from '@/lib/dateUtils';
import { exportToCsv, exportToJson } from '@/lib/exportUtils';

const { Text } = Typography;
const { RangePicker } = DatePicker;

export default function RecordsExplorerPage() {
  const { isDark } = useTheme();
  const [records, setRecords] = useState<RecordItem[]>([]);
  const [sources, setSources] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 15, totalPages: 1 });

  // Filters
  const [selectedSource, setSelectedSource] = useState<string | undefined>(undefined);
  const [selectedStatus, setSelectedStatus] = useState<string | undefined>(undefined);
  const [dateRange, setDateRange] = useState<[any, any] | null>(null);
  const [searchId, setSearchId] = useState<string>('');
  const [versionFilter, setVersionFilter] = useState<'all' | 'multi' | 'single'>('all');

  // Viewing Record Details Modal (Requirement 3 - Viewable in Accepted)
  const [viewingRecord, setViewingRecord] = useState<RecordItem | null>(null);

  // Expanded row keys for parent dropdowns
  const [expandedRowKeys, setExpandedRowKeys] = useState<string[]>([]);

  // History cache for expanded rows
  const [historyCache, setHistoryCache] = useState<Record<string, RecordHistoryItem[]>>({});
  const [loadingHistory, setLoadingHistory] = useState<Record<string, boolean>>({});

  const loadSources = async () => {
    try {
      const list = await api.getSources();
      setSources(list);
    } catch {}
  };

  const fetchRecords = async (page: number = 1, pageSize: number = pagination.limit) => {
    setLoading(true);
    try {
      const from = dateRange?.[0] ? dateRange[0].toISOString() : undefined;
      const to = dateRange?.[1] ? dateRange[1].toISOString() : undefined;
      const hasHistoryParam = versionFilter === 'multi' ? 'true' : versionFilter === 'single' ? 'false' : undefined;

      const res = await api.getRecords({
        source: selectedSource,
        status: selectedStatus,
        from,
        to,
        hasHistory: hasHistoryParam,
        page,
        limit: pageSize,
      });

      // Filter locally by searchId if specified
      let items = res.data;
      if (searchId.trim()) {
        const q = searchId.trim().toLowerCase();
        items = items.filter(r => r.id.toLowerCase().includes(q));
      }

      setRecords(items);
      setPagination({
        total: res.pagination.total,
        page: res.pagination.page,
        limit: res.pagination.limit,
        totalPages: res.pagination.totalPages,
      });
    } catch (err) {
      console.error('Failed to fetch records:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSources();
  }, []);

  useEffect(() => {
    fetchRecords(1, pagination.limit);
  }, [selectedSource, selectedStatus, dateRange, searchId, versionFilter]);

  const resetFilters = () => {
    setSelectedSource(undefined);
    setSelectedStatus(undefined);
    setDateRange(null);
    setSearchId('');
    setVersionFilter('all');
  };

  const fetchHistoryForRecord = async (recordId: string) => {
    if (historyCache[recordId] || loadingHistory[recordId]) return;
    setLoadingHistory(prev => ({ ...prev, [recordId]: true }));
    try {
      const res = await api.getRecordHistory(recordId);
      setHistoryCache(prev => ({ ...prev, [recordId]: res.history || [] }));
    } catch (err) {
      console.error('Failed to fetch history:', err);
    } finally {
      setLoadingHistory(prev => ({ ...prev, [recordId]: false }));
    }
  };

  const toggleExpandRow = (id: string) => {
    if (expandedRowKeys.includes(id)) {
      setExpandedRowKeys(prev => prev.filter(k => k !== id));
    } else {
      setExpandedRowKeys(prev => [...prev, id]);
      fetchHistoryForRecord(id);
    }
  };

  // Requirement 4: Export to CSV and JSON
  const handleExportCsv = () => {
    const exportData = records.map(r => ({
      id: r.id,
      source: r.source,
      recordedAt_IST: formatToIST(r.recordedAt),
      recordedAt_UTC: r.recordedAt,
      value: r.value,
      status: r.status,
      version: r.version,
      childHistoryCount: r._count?.history ?? 0,
      createdAt_IST: formatToIST(r.createdAt),
    }));

    exportToCsv(exportData, 'accepted_records', [
      { key: 'id', label: 'Record ID' },
      { key: 'source', label: 'Source System' },
      { key: 'recordedAt_IST', label: 'Recorded At (IST)' },
      { key: 'recordedAt_UTC', label: 'Recorded At (UTC)' },
      { key: 'value', label: 'Value (0-100)' },
      { key: 'status', label: 'Status' },
      { key: 'version', label: 'Version' },
      { key: 'childHistoryCount', label: 'Child History Versions' },
      { key: 'createdAt_IST', label: 'Ingested At (IST)' },
    ]);
    message.success(`Exported ${records.length} records as CSV`);
  };

  const handleExportJson = () => {
    exportToJson(records, 'accepted_records');
    message.success(`Exported ${records.length} records as JSON`);
  };

  const getStatusTag = (status: string) => {
    switch (status) {
      case 'OK':
        return <Tag icon={<CheckCircleOutlined />} color="success" style={{ borderRadius: 0 }}>OK</Tag>;
      case 'WARN':
        return <Tag icon={<ExclamationCircleOutlined />} color="warning" style={{ borderRadius: 0 }}>WARN</Tag>;
      case 'FAIL':
        return <Tag icon={<CloseCircleOutlined />} color="error" style={{ borderRadius: 0 }}>FAIL</Tag>;
      default:
        return <Tag color="default" style={{ borderRadius: 0 }}>{status}</Tag>;
    }
  };

  // Columns for the Accepted Child Revisions sub-table inside the parent dropdown
  const childColumns: ColumnsType<RecordHistoryItem> = [
    {
      title: 'Child Revision',
      dataIndex: 'version',
      key: 'version',
      width: 140,
      render: (v: number) => (
        <Tag color="blue" icon={<BranchesOutlined />} style={{ fontWeight: 600, borderRadius: 0 }}>
          v{v} (Child Revision)
        </Tag>
      ),
    },
    {
      title: 'Historical Recorded At (IST)',
      dataIndex: 'recordedAt',
      key: 'recordedAt',
      render: (dt: string) => (
        <Tooltip title={`UTC: ${new Date(dt).toISOString()}`}>
          <span style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--text-secondary)' }}>
            <ClockCircleOutlined style={{ marginRight: 6, color: '#3b82f6' }} />
            {formatToIST(dt)}
          </span>
        </Tooltip>
      ),
    },
    {
      title: 'Source System',
      dataIndex: 'source',
      key: 'source',
      render: (src: string) => (
        <Tag color="geekblue" style={{ fontSize: 11, fontWeight: 600, borderRadius: 0 }}>
          {src.toUpperCase()}
        </Tag>
      ),
    },
    {
      title: 'Metric Value',
      dataIndex: 'value',
      key: 'value',
      align: 'center',
      render: (val: number) => (
        <span
          style={{
            fontWeight: 700,
            fontSize: 12,
            padding: '2px 8px',
            borderRadius: 0,
            background: val > 80 ? 'rgba(239, 68, 68, 0.1)' : val > 50 ? 'rgba(245, 158, 11, 0.1)' : 'rgba(16, 185, 129, 0.1)',
            color: val > 80 ? '#ef4444' : val > 50 ? '#f59e0b' : '#10b981',
            border: `1px solid ${val > 80 ? 'rgba(239, 68, 68, 0.25)' : val > 50 ? 'rgba(245, 158, 11, 0.25)' : 'rgba(16, 185, 129, 0.25)'}`,
          }}
        >
          {val}
        </span>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      align: 'center',
      render: (status: string) => getStatusTag(status),
    },
    {
      title: 'Superseded / Replaced At (IST)',
      dataIndex: 'replacedAt',
      key: 'replacedAt',
      render: (dt: string) => (
        <Tooltip title={`UTC: ${new Date(dt).toISOString()}`}>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            {formatToIST(dt)}
          </span>
        </Tooltip>
      ),
    },
    {
      title: 'Payload Hash (SHA-256)',
      dataIndex: 'payloadHash',
      key: 'payloadHash',
      ellipsis: true,
      render: (hash: string) => (
        <Tooltip title={hash}>
          <Text code style={{ fontSize: 11 }}>{hash ? hash.slice(0, 16) + '...' : 'N/A'}</Text>
        </Tooltip>
      ),
    },
  ];

  const columns: ColumnsType<RecordItem> = [
    {
      title: 'Record ID (UUID / String)',
      dataIndex: 'id',
      key: 'id',
      render: (id: string) => (
        <Space orientation="horizontal" size={6}>
          <Text code style={{ fontSize: 12, fontWeight: 600 }}>{id}</Text>
          <Tooltip title="Copy ID">
            <Button
              type="text"
              size="small"
              icon={<CopyOutlined style={{ fontSize: 11, color: 'var(--text-muted)' }} />}
              onClick={() => {
                navigator.clipboard.writeText(id);
                message.success('ID copied to clipboard');
              }}
              style={{ width: 24, height: 24, padding: 0 }}
            />
          </Tooltip>
        </Space>
      ),
    },
    {
      title: 'Source System',
      dataIndex: 'source',
      key: 'source',
      render: (src: string) => (
        <Tag color="geekblue" style={{ fontWeight: 600, textTransform: 'uppercase', fontSize: 11, borderRadius: 0 }}>
          {src}
        </Tag>
      ),
    },
    {
      title: 'Recorded At (IST)',
      dataIndex: 'recordedAt',
      key: 'recordedAt',
      render: (dt: string) => (
        <Tooltip title={`UTC: ${new Date(dt).toISOString()}`}>
          <span style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--text-secondary)' }}>
            <ClockCircleOutlined style={{ marginRight: 6, color: '#3b82f6' }} />
            {formatToIST(dt)}
          </span>
        </Tooltip>
      ),
    },
    {
      title: 'Value (0–100)',
      dataIndex: 'value',
      key: 'value',
      align: 'center',
      render: (val: number) => (
        <span
          style={{
            fontWeight: 700,
            fontSize: 13,
            padding: '2px 8px',
            borderRadius: 0,
            background: val > 80 ? 'rgba(239, 68, 68, 0.1)' : val > 50 ? 'rgba(245, 158, 11, 0.1)' : 'rgba(16, 185, 129, 0.1)',
            color: val > 80 ? '#ef4444' : val > 50 ? '#f59e0b' : '#10b981',
            border: `1px solid ${val > 80 ? 'rgba(239, 68, 68, 0.25)' : val > 50 ? 'rgba(245, 158, 11, 0.25)' : 'rgba(16, 185, 129, 0.25)'}`,
          }}
        >
          {val}
        </span>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      align: 'center',
      render: (status: string) => getStatusTag(status),
    },
    {
      title: 'Parent / Child Revisions',
      key: 'revisions',
      align: 'center',
      render: (_, rec) => {
        const count = rec._count?.history || 0;
        const isExpanded = expandedRowKeys.includes(rec.id);
        if (count > 0) {
          return (
            <Tag 
              color={isExpanded ? 'geekblue' : 'blue'} 
              icon={<BranchesOutlined />}
              style={{ fontWeight: 600, cursor: 'pointer', padding: '3px 10px', borderRadius: 0, fontSize: 12 }}
              onClick={(e) => {
                e.stopPropagation();
                toggleExpandRow(rec.id);
              }}
            >
              v{rec.version} ({count} accepted {count === 1 ? 'child' : 'children'}) {isExpanded ? <UpOutlined style={{ fontSize: 10, marginLeft: 4 }} /> : <DownOutlined style={{ fontSize: 10, marginLeft: 4 }} />}
            </Tag>
          );
        }
        return (
          <Tag color="default" style={{ fontSize: 11, borderRadius: 0 }}>
            v{rec.version} (Single Version)
          </Tag>
        );
      },
    },
    {
      title: 'Action',
      key: 'action',
      align: 'center',
      width: 90,
      render: (_, rec) => (
        <Button
          size="small"
          icon={<EyeOutlined />}
          onClick={() => setViewingRecord(rec)}
          style={{ borderRadius: 0, fontSize: 12 }}
        >
          View
        </Button>
      ),
    },
  ];

  // Expandable row rendering all child records that were accepted under this parent
  const renderRevisionHistory = (rec: RecordItem) => {
    const historyList = historyCache[rec.id] || [];
    const isLoading = loadingHistory[rec.id];

    return (
      <Card
        size="small"
        bordered
        style={{
          margin: '8px 0',
          background: 'var(--bg-secondary)',
          borderColor: 'var(--border-color)',
          borderRadius: 0,
        }}
      >
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            <Space>
              <BranchesOutlined style={{ color: '#3b82f6', fontSize: 16 }} />
              <Text strong style={{ fontSize: 13, color: 'var(--text-primary)' }}>
                Parent & Child Revisions Breakdown (ID: {rec.id})
              </Text>
              <Tag color="blue" style={{ fontSize: 11, borderRadius: 0 }}>
                Total {1 + historyList.length} Revisions (1 Active Master + {historyList.length} Child)
              </Tag>
            </Space>
            <Text type="secondary" style={{ fontSize: 11, fontFamily: 'monospace' }}>
              Foreign Key: <code style={{ color: '#60a5fa' }}>record_history.acceptedRecordId REFERENCES accepted_records(id)</code>
            </Text>
          </div>

          {/* Active Master Card */}
          <div
            style={{
              padding: '12px 16px',
              borderRadius: 0,
              background: isDark ? 'rgba(16, 185, 129, 0.08)' : '#ecfdf5',
              border: '1px solid rgba(16, 185, 129, 0.3)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <Tag color="success" style={{ fontWeight: 700, borderRadius: 0 }}>
                ● ACTIVE MASTER (PARENT) — v{rec.version}
              </Tag>
              <Text type="secondary" style={{ fontSize: 11 }}>
                Stored in <code>accepted_records</code> (Latest Event Timestamp)
              </Text>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, fontSize: 12 }}>
              <div>
                <Text type="secondary" style={{ display: 'block', fontSize: 11 }}>Event Timestamp (IST):</Text>
                <Text strong style={{ fontFamily: 'monospace' }}>{formatToIST(rec.recordedAt)}</Text>
              </div>
              <div>
                <Text type="secondary" style={{ display: 'block', fontSize: 11 }}>Source System:</Text>
                <Tag color="geekblue" style={{ borderRadius: 0 }}>{rec.source.toUpperCase()}</Tag>
              </div>
              <div>
                <Text type="secondary" style={{ display: 'block', fontSize: 11 }}>Metric Value:</Text>
                <Text strong>{rec.value}</Text>
              </div>
              <div>
                <Text type="secondary" style={{ display: 'block', fontSize: 11 }}>Status:</Text>
                {getStatusTag(rec.status)}
              </div>
            </div>
          </div>

          {/* Historical Child Revisions Table */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>
                <ClockCircleOutlined style={{ marginRight: 6, color: '#3b82f6' }} />
                Accepted Child Revisions Stored in <code>record_history</code> ({historyList.length} total)
              </span>
              <Tag color="cyan" style={{ fontSize: 11, borderRadius: 0 }}>
                Relational Integrity Maintained
              </Tag>
            </div>

            {isLoading ? (
              <div style={{ textAlign: 'center', padding: '24px 0' }}>
                <Spin tip="Loading child records from PostgreSQL..." />
              </div>
            ) : historyList.length > 0 ? (
              <Table<RecordHistoryItem>
                columns={childColumns}
                dataSource={historyList}
                rowKey="id"
                pagination={false}
                size="small"
                bordered
                style={{ background: 'var(--bg-card)', borderRadius: 0 }}
              />
            ) : (
              <Alert
                type="info"
                showIcon
                message="No prior child versions found for this record."
                style={{ borderRadius: 0 }}
              />
            )}
          </div>
        </Space>
      </Card>
    );
  };

  const hasFilters = Boolean(selectedSource || selectedStatus || dateRange || searchId || versionFilter !== 'all');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <CrmDataTable<RecordItem>
        title="Accepted Records Explorer (Requirement R4)"
        subtitle="Explore, query, view full payloads, and export normalized event records (Times in IST)"
        icon={<DatabaseOutlined />}
        columns={columns}
        dataSource={records}
        rowKey="id"
        loading={loading}
        pagination={pagination}
        onPageChange={(page, pageSize) => fetchRecords(page, pageSize)}
        onRefresh={() => fetchRecords(pagination.page, pagination.limit)}
        searchValue={searchId}
        onSearchChange={setSearchId}
        searchPlaceholder="Filter by Document ID..."
        hasActiveFilters={hasFilters}
        onResetFilters={resetFilters}
        extraActions={
          <Dropdown
            menu={{
              items: [
                {
                  key: 'csv',
                  icon: <FileExcelOutlined style={{ color: '#10b981' }} />,
                  label: 'Export Dataset as CSV (.csv)',
                  onClick: handleExportCsv,
                },
                {
                  key: 'json',
                  icon: <FileTextOutlined style={{ color: '#3b82f6' }} />,
                  label: 'Export Dataset as JSON (.json)',
                  onClick: handleExportJson,
                },
              ],
            }}
          >
            <Button icon={<DownloadOutlined />} style={{ borderRadius: 0 }}>
              Export Data <DownOutlined style={{ fontSize: 10 }} />
            </Button>
          </Dropdown>
        }
        filterControls={
          <Space wrap size="small">
            {/* Version / Revision Filter */}
            <Select
              placeholder="All Versions"
              value={versionFilter}
              onChange={setVersionFilter}
              style={{ width: 175 }}
              options={[
                { label: 'All Records', value: 'all' },
                { label: 'Has Child Revisions', value: 'multi' },
                { label: 'Master Only (Single)', value: 'single' },
              ]}
            />

            {/* Source Filter */}
            <Select
              placeholder="All Sources"
              allowClear
              value={selectedSource}
              onChange={setSelectedSource}
              style={{ width: 140 }}
              options={sources.map(s => ({ label: s.toUpperCase(), value: s }))}
            />

            {/* Status Filter */}
            <Select
              placeholder="All Statuses"
              allowClear
              value={selectedStatus}
              onChange={setSelectedStatus}
              style={{ width: 130 }}
              options={[
                { label: 'OK', value: 'OK' },
                { label: 'WARN', value: 'WARN' },
                { label: 'FAIL', value: 'FAIL' },
              ]}
            />

            {/* Date Range Filter */}
            <RangePicker
              value={dateRange}
              onChange={(dates) => setDateRange(dates as any)}
              style={{ width: 240 }}
            />
          </Space>
        }
        expandable={{
          expandedRowRender: renderRevisionHistory,
          expandedRowKeys: expandedRowKeys,
          onExpandedRowsChange: (keys) => setExpandedRowKeys(keys as string[]),
          onExpand: (expanded, record) => {
            if (expanded) {
              fetchHistoryForRecord(record.id);
            }
          },
          rowExpandable: (rec) => (rec._count?.history ?? 0) > 0,
        }}
      />

      {/* VIEWABLE IN ACCEPTED INSPECTOR MODAL (Requirement 3) */}
      <Modal
        open={Boolean(viewingRecord)}
        onCancel={() => setViewingRecord(null)}
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <EyeOutlined style={{ color: '#3b82f6', fontSize: 18 }} />
            <span style={{ fontWeight: 700, fontSize: 16 }}>
              Accepted Master Record Forensic Inspector
            </span>
          </div>
        }
        footer={[
          <Button
            key="copy"
            icon={<CopyOutlined />}
            onClick={() => {
              if (viewingRecord) {
                navigator.clipboard.writeText(JSON.stringify(viewingRecord, null, 2));
                message.success('Full Record JSON copied to clipboard');
              }
            }}
            style={{ borderRadius: 0 }}
          >
            Copy Record JSON
          </Button>,
          <Button
            key="close"
            type="primary"
            onClick={() => setViewingRecord(null)}
            style={{ borderRadius: 0 }}
          >
            Close Inspector
          </Button>,
        ]}
        width={720}
        destroyOnClose
        centered
      >
        {viewingRecord && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingTop: 10 }}>
            {/* Top Key Metadata Grid */}
            <div
              style={{
                padding: 16,
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: 14,
                fontSize: 12,
              }}
            >
              <div>
                <Text type="secondary" style={{ display: 'block', fontSize: 11 }}>DOCUMENT ID:</Text>
                <Text code strong style={{ fontSize: 12 }}>{viewingRecord.id}</Text>
              </div>

              <div>
                <Text type="secondary" style={{ display: 'block', fontSize: 11 }}>SOURCE SYSTEM:</Text>
                <Tag color="geekblue" style={{ borderRadius: 0, fontWeight: 700 }}>
                  {viewingRecord.source.toUpperCase()}
                </Tag>
              </div>

              <div>
                <Text type="secondary" style={{ display: 'block', fontSize: 11 }}>ACTIVE VERSION:</Text>
                <Tag color="blue" style={{ borderRadius: 0, fontWeight: 700 }}>
                  v{viewingRecord.version} (Active Master)
                </Tag>
              </div>

              <div>
                <Text type="secondary" style={{ display: 'block', fontSize: 11 }}>STATUS HEALTH:</Text>
                {getStatusTag(viewingRecord.status)}
              </div>

              <div>
                <Text type="secondary" style={{ display: 'block', fontSize: 11 }}>METRIC VALUE:</Text>
                <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)' }}>
                  {viewingRecord.value} <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>/ 100</span>
                </span>
              </div>

              <div>
                <Text type="secondary" style={{ display: 'block', fontSize: 11 }}>CHILD REVISIONS:</Text>
                <Text strong>{viewingRecord._count?.history ?? 0} historical versions</Text>
              </div>

              <div>
                <Text type="secondary" style={{ display: 'block', fontSize: 11 }}>EVENT TIMESTAMP (IST):</Text>
                <Text strong style={{ fontFamily: 'monospace' }}>{formatToIST(viewingRecord.recordedAt)}</Text>
              </div>

              <div>
                <Text type="secondary" style={{ display: 'block', fontSize: 11 }}>FIRST INGESTED (IST):</Text>
                <Text style={{ fontFamily: 'monospace', color: 'var(--text-muted)' }}>{formatToIST(viewingRecord.createdAt)}</Text>
              </div>
            </div>

            {/* Raw JSON payload representation */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <Text strong style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  NORMALIZED POSTGRESQL RECORD PAYLOAD:
                </Text>
                <Tag color="green" style={{ borderRadius: 0 }}>Validated & Normalized</Tag>
              </div>
              <pre
                style={{
                  padding: 16,
                  borderRadius: 0,
                  background: isDark ? '#18181b' : '#f8fafc',
                  border: `1px solid var(--border-color)`,
                  color: isDark ? '#38bdf8' : '#0369a1',
                  fontFamily: 'monospace',
                  fontSize: 12,
                  overflowX: 'auto',
                  maxHeight: 280,
                  margin: 0,
                }}
              >
                {JSON.stringify(viewingRecord, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
