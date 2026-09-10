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
  Alert
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
  UpOutlined
} from '@ant-design/icons';
import { api, RecordItem, RecordHistoryItem } from '@/lib/api';
import { CrmDataTable } from '@/components/CrmDataTable';
import { useTheme } from '@/theme/ThemeContext';

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
      title: 'Historical Recorded At (UTC)',
      dataIndex: 'recordedAt',
      key: 'recordedAt',
      render: (dt: string) => (
        <span style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--text-secondary)' }}>
          <ClockCircleOutlined style={{ marginRight: 6, color: '#3b82f6' }} />
          {new Date(dt).toISOString()}
        </span>
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
      title: 'Superseded / Replaced At',
      dataIndex: 'replacedAt',
      key: 'replacedAt',
      render: (dt: string) => (
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
          {new Date(dt).toLocaleString()}
        </span>
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
              onClick={() => navigator.clipboard.writeText(id)}
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
      title: 'Recorded At (UTC)',
      dataIndex: 'recordedAt',
      key: 'recordedAt',
      render: (dt: string) => (
        <span style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--text-secondary)' }}>
          <ClockCircleOutlined style={{ marginRight: 6, color: '#3b82f6' }} />
          {new Date(dt).toISOString()}
        </span>
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
                <Text type="secondary" style={{ display: 'block', fontSize: 11 }}>Event Timestamp:</Text>
                <Text strong style={{ fontFamily: 'monospace' }}>{new Date(rec.recordedAt).toISOString()}</Text>
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
        subtitle="Explore, query, and trace normalized event records stored in PostgreSQL"
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
    </div>
  );
}
