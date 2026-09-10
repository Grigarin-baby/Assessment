'use client';

import React, { useState, useEffect } from 'react';
import { 
  Select, 
  Tag, 
  Typography, 
  Space, 
  Button, 
  Modal, 
  Card, 
  Tooltip,
  Dropdown,
  Alert,
  message
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { 
  AlertOutlined, 
  CodeOutlined, 
  SwapOutlined, 
  CheckCircleFilled, 
  CloseCircleFilled,
  CopyOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  DownloadOutlined,
  DownOutlined,
  FileExcelOutlined,
  FileTextOutlined,
  DiffOutlined
} from '@ant-design/icons';
import { api, RejectionItem } from '@/lib/api';
import { CrmDataTable } from '@/components/CrmDataTable';
import { useTheme } from '@/theme/ThemeContext';
import { formatToIST } from '@/lib/dateUtils';
import { exportToCsv, exportToJson } from '@/lib/exportUtils';

const { Text } = Typography;

export default function DeadLetterVaultPage() {
  const { isDark } = useTheme();
  const [rejections, setRejections] = useState<RejectionItem[]>([]);
  const [reasons, setReasons] = useState<string[]>([]);
  const [selectedReason, setSelectedReason] = useState<string | undefined>(undefined);
  const [searchId, setSearchId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 15, totalPages: 1 });

  // Inspection modal state
  const [inspectItem, setInspectItem] = useState<RejectionItem | null>(null);

  // Expanded row keys for duplicate conflict comparison
  const [expandedRowKeys, setExpandedRowKeys] = useState<string[]>([]);

  const loadReasons = async () => {
    try {
      const list = await api.getReasons();
      setReasons(list);
    } catch {}
  };

  const fetchRejections = async (page: number = 1, pageSize: number = pagination.limit) => {
    setLoading(true);
    try {
      const res = await api.getRejections({
        reason: selectedReason,
        page,
        limit: pageSize,
      });

      let items = res.data;
      if (searchId.trim()) {
        const q = searchId.trim().toLowerCase();
        items = items.filter(r => 
          (r.originalId && r.originalId.toLowerCase().includes(q)) || 
          r.id.toLowerCase().includes(q)
        );
      }

      setRejections(items);
      setPagination({
        total: res.pagination.total,
        page: res.pagination.page,
        limit: res.pagination.limit,
        totalPages: res.pagination.totalPages,
      });
    } catch (err) {
      console.error('Failed to fetch rejections:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReasons();
  }, []);

  useEffect(() => {
    fetchRejections(1, pagination.limit);
  }, [selectedReason, searchId]);

  const resetFilters = () => {
    setSelectedReason(undefined);
    setSearchId('');
  };

  const toggleExpandRow = (id: string) => {
    if (expandedRowKeys.includes(id)) {
      setExpandedRowKeys(prev => prev.filter(k => k !== id));
    } else {
      setExpandedRowKeys(prev => [...prev, id]);
    }
  };

  // Requirement 4: Export Dead Vault to CSV and JSON
  const handleExportCsv = () => {
    const exportData = rejections.map(r => ({
      originalId: r.originalId || 'N/A',
      primaryReason: r.primaryReason,
      allReasons: (r.allReasons || []).join('; '),
      quarantinedAt_IST: formatToIST(r.createdAt),
      hasAcceptedConflict: Boolean(r.acceptedRecord),
      acceptedRecordId: r.acceptedRecordId || 'N/A',
      rawPayload: JSON.stringify(r.rawPayload),
    }));

    exportToCsv(exportData, 'dead_vault_rejections', [
      { key: 'originalId', label: 'Original Document ID' },
      { key: 'primaryReason', label: 'Primary Error Reason' },
      { key: 'allReasons', label: 'All Failure Reasons' },
      { key: 'quarantinedAt_IST', label: 'Quarantined At (IST)' },
      { key: 'hasAcceptedConflict', label: 'Has Conflict Master' },
      { key: 'acceptedRecordId', label: 'Accepted Master ID' },
      { key: 'rawPayload', label: 'Raw Payload JSON' },
    ]);
    message.success(`Exported ${rejections.length} dead vault records as CSV`);
  };

  const handleExportJson = () => {
    exportToJson(rejections, 'dead_vault_rejections');
    message.success(`Exported ${rejections.length} dead vault records as JSON`);
  };

  const getReasonColor = (reason: string) => {
    switch (reason) {
      case 'DUPLICATE_ID_CONFLICT':
        return 'volcano';
      case 'MISSING_FIELD':
        return 'magenta';
      case 'VALUE_OUT_OF_RANGE':
        return 'orange';
      case 'VALUE_NOT_AN_INTEGER':
        return 'gold';
      case 'INVALID_STATUS':
        return 'geekblue';
      case 'INVALID_DATE_FORMAT':
        return 'cyan';
      default:
        return 'red';
    }
  };

  // Requirement 6: Removed Audit Vault ID column
  // Requirement 7: Added copy button next to Original Document ID
  const columns: ColumnsType<RejectionItem> = [
    {
      title: 'Original Document ID',
      dataIndex: 'originalId',
      key: 'originalId',
      render: (id: string | null) => (
        id ? (
          <Space size={6}>
            <Text code strong style={{ fontSize: 12 }}>{id}</Text>
            <Tooltip title="Copy Document ID">
              <Button
                type="text"
                size="small"
                icon={<CopyOutlined style={{ fontSize: 11, color: 'var(--text-muted)' }} />}
                onClick={() => {
                  navigator.clipboard.writeText(id);
                  message.success('Document ID copied to clipboard');
                }}
                style={{ width: 22, height: 22, padding: 0 }}
              />
            </Tooltip>
          </Space>
        ) : (
          <Text type="secondary" italic style={{ fontSize: 11 }}>Missing / None</Text>
        )
      ),
    },
    {
      title: 'Primary Rejection Reason (R5)',
      dataIndex: 'primaryReason',
      key: 'primaryReason',
      render: (reason: string) => (
        <Tag color={getReasonColor(reason)} style={{ fontWeight: 600, fontSize: 11, borderRadius: 0 }}>
          {reason}
        </Tag>
      ),
    },
    {
      title: 'All Detected Failures',
      dataIndex: 'allReasons',
      key: 'allReasons',
      render: (reasons: string[]) => (
        <Space wrap size={[4, 4]}>
          {(reasons || []).map((r, i) => (
            <Tag key={i} style={{ fontSize: 10, margin: 0, borderRadius: 0 }}>
              {r}
            </Tag>
          ))}
        </Space>
      ),
    },
    {
      title: 'Quarantined At (IST)',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (dt: string) => (
        <Tooltip title={`UTC: ${new Date(dt).toISOString()}`}>
          <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
            <ClockCircleOutlined style={{ marginRight: 6, color: '#ef4444' }} />
            {formatToIST(dt)}
          </span>
        </Tooltip>
      ),
    },
    {
      title: 'Forensic Actions',
      key: 'actions',
      align: 'center',
      render: (_, rej) => {
        const isConflict = rej.primaryReason === 'DUPLICATE_ID_CONFLICT' || Boolean(rej.acceptedRecord);
        const isExpanded = expandedRowKeys.includes(rej.id);

        return (
          <Space size="small">
            {/* Requirement 5: DUPLICATE_ID_CONFLICT Compare Button */}
            {isConflict && (
              <Button
                size="small"
                type={isExpanded ? 'primary' : 'default'}
                icon={<SwapOutlined />}
                onClick={() => toggleExpandRow(rej.id)}
                style={{
                  borderRadius: 0,
                  fontSize: 11,
                  borderColor: isExpanded ? undefined : '#f97316',
                  color: isExpanded ? undefined : '#f97316',
                }}
              >
                {isExpanded ? 'Hide Diff' : 'Compare Conflict'}
              </Button>
            )}
            <Button
              size="small"
              icon={<CodeOutlined />}
              onClick={() => setInspectItem(rej)}
              style={{ borderRadius: 0, fontSize: 11 }}
            >
              Inspect Raw
            </Button>
          </Space>
        );
      },
    },
  ];

  // Expandable row for Duplicate Conflict master comparison (Requirement 5)
  const renderMasterComparison = (rej: RejectionItem) => {
    const master = rej.acceptedRecord;
    const raw = rej.rawPayload;

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
              <SwapOutlined style={{ color: '#f97316', fontSize: 16 }} />
              <Text strong style={{ fontSize: 13, color: 'var(--text-primary)' }}>
                DUPLICATE_ID_CONFLICT Analysis: Quarantined Candidate vs Accepted Database Master
              </Text>
              <Tag color="volcano" style={{ borderRadius: 0, fontWeight: 700 }}>DUPLICATE_ID_CONFLICT</Tag>
            </Space>
            <Text type="secondary" style={{ fontSize: 11, fontFamily: 'monospace' }}>
              Nullable FK Relation: <code style={{ color: '#60a5fa' }}>rejected_records.acceptedRecordId = &quot;{rej.acceptedRecordId || 'N/A'}&quot;</code>
            </Text>
          </div>

          <Alert
            type="warning"
            showIcon
            message="Unresolvable Conflict Resolution (Section 3)"
            description="The candidate record presented an identical document ID and identical timestamp as an existing database record, but contained a conflicting payload. Under Section 3 business rules, the existing master is preserved while the competing candidate is safely quarantined in the Dead-Letter Vault."
            style={{ borderRadius: 0 }}
          />

          {/* Side-by-Side Comparison Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
            {/* Left: Active Master in PostgreSQL */}
            <div
              style={{
                padding: '14px',
                borderRadius: 0,
                background: isDark ? 'rgba(16, 185, 129, 0.08)' : '#ecfdf5',
                border: '1px solid rgba(16, 185, 129, 0.3)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <Tag color="success" icon={<CheckCircleFilled />} style={{ borderRadius: 0, fontWeight: 700 }}>
                  ACTIVE MASTER IN DATABASE (ACCEPTED)
                </Tag>
                <Text strong style={{ fontSize: 12, color: '#10b981' }}>
                  {master ? `v${master.version}` : 'Preserved Master'}
                </Text>
              </div>

              {master ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12 }}>
                  <div>
                    <Text type="secondary" style={{ display: 'block', fontSize: 11 }}>DOCUMENT ID:</Text>
                    <Text strong style={{ fontFamily: 'monospace' }}>{master.id}</Text>
                  </div>
                  <div>
                    <Text type="secondary" style={{ display: 'block', fontSize: 11 }}>RECORDED AT (IST):</Text>
                    <Text strong style={{ fontFamily: 'monospace' }}>{formatToIST(master.recordedAt)}</Text>
                  </div>
                  <div>
                    <Text type="secondary" style={{ display: 'block', fontSize: 11 }}>SOURCE SYSTEM:</Text>
                    <Tag color="geekblue" style={{ borderRadius: 0 }}>{master.source.toUpperCase()}</Tag>
                  </div>
                  <div>
                    <Text type="secondary" style={{ display: 'block', fontSize: 11 }}>ACCEPTED VALUE:</Text>
                    <span style={{ fontSize: 16, fontWeight: 800, color: '#10b981' }}>{master.value}</span>
                  </div>
                  <div>
                    <Text type="secondary" style={{ display: 'block', fontSize: 11 }}>ACCEPTED STATUS:</Text>
                    <Tag color="success" style={{ borderRadius: 0 }}>{master.status}</Tag>
                  </div>
                </div>
              ) : (
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  Original master was previously purged or modified.
                </div>
              )}
            </div>

            {/* Right: Competing Rejected Candidate */}
            <div
              style={{
                padding: '14px',
                borderRadius: 0,
                background: isDark ? 'rgba(239, 68, 68, 0.08)' : '#fef2f2',
                border: '1px solid rgba(239, 68, 68, 0.3)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <Tag color="error" icon={<CloseCircleFilled />} style={{ borderRadius: 0, fontWeight: 700 }}>
                  COMPETING CANDIDATE (QUARANTINED)
                </Tag>
                <Tag color="volcano" style={{ borderRadius: 0 }}>
                  CONFLICT REJECTED
                </Tag>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12 }}>
                <div>
                  <Text type="secondary" style={{ display: 'block', fontSize: 11 }}>ORIGINAL DOCUMENT ID:</Text>
                  <Text strong style={{ fontFamily: 'monospace' }}>{rej.originalId || raw?.id || 'N/A'}</Text>
                </div>
                <div>
                  <Text type="secondary" style={{ display: 'block', fontSize: 11 }}>RECORDED AT (IST):</Text>
                  <Text strong style={{ fontFamily: 'monospace' }}>{raw?.recordedAt ? formatToIST(raw.recordedAt) : 'N/A'}</Text>
                </div>
                <div>
                  <Text type="secondary" style={{ display: 'block', fontSize: 11 }}>SOURCE SYSTEM:</Text>
                  <Tag color="geekblue" style={{ borderRadius: 0 }}>{String(raw?.source || 'N/A').toUpperCase()}</Tag>
                </div>
                <div>
                  <Text type="secondary" style={{ display: 'block', fontSize: 11 }}>CONFLICTING VALUE:</Text>
                  <span style={{ fontSize: 16, fontWeight: 800, color: '#ef4444' }}>
                    {raw?.value !== undefined ? String(raw.value) : 'N/A'} (Differs from Master)
                  </span>
                </div>
                <div>
                  <Text type="secondary" style={{ display: 'block', fontSize: 11 }}>CANDIDATE STATUS:</Text>
                  <Tag color="error" style={{ borderRadius: 0 }}>{raw?.status || 'N/A'}</Tag>
                </div>
              </div>
            </div>
          </div>
        </Space>
      </Card>
    );
  };

  const hasFilters = Boolean(selectedReason || searchId);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <CrmDataTable<RejectionItem>
        title="Dead-Letter Audit Vault (Requirement R2)"
        subtitle="Forensic audit trail of all rejected records with untouched raw payloads and error taxonomy (Times in IST)"
        icon={<AlertOutlined style={{ color: '#ef4444' }} />}
        columns={columns}
        dataSource={rejections}
        rowKey="id"
        loading={loading}
        pagination={pagination}
        onPageChange={(page, pageSize) => fetchRejections(page, pageSize)}
        onRefresh={() => fetchRejections(pagination.page, pagination.limit)}
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
                  label: 'Export Dead Vault as CSV (.csv)',
                  onClick: handleExportCsv,
                },
                {
                  key: 'json',
                  icon: <FileTextOutlined style={{ color: '#3b82f6' }} />,
                  label: 'Export Dead Vault as JSON (.json)',
                  onClick: handleExportJson,
                },
              ],
            }}
          >
            <Button icon={<DownloadOutlined />} style={{ borderRadius: 0 }}>
              Export Vault <DownOutlined style={{ fontSize: 10 }} />
            </Button>
          </Dropdown>
        }
        filterControls={
          <Space wrap size="small">
            <Select
              placeholder="All Rejection Reasons"
              allowClear
              value={selectedReason}
              onChange={setSelectedReason}
              style={{ width: 230 }}
              options={reasons.map(r => ({ label: r, value: r }))}
            />

            {/* Quick Conflict Filter Button */}
            <Button
              type={selectedReason === 'DUPLICATE_ID_CONFLICT' ? 'primary' : 'default'}
              icon={<DiffOutlined />}
              onClick={() => {
                if (selectedReason === 'DUPLICATE_ID_CONFLICT') {
                  setSelectedReason(undefined);
                } else {
                  setSelectedReason('DUPLICATE_ID_CONFLICT');
                }
              }}
              style={{ borderRadius: 0, fontSize: 12 }}
            >
              Duplicate Conflicts Only
            </Button>
          </Space>
        }
        expandable={{
          expandedRowRender: renderMasterComparison,
          expandedRowKeys: expandedRowKeys,
          onExpandedRowsChange: (keys) => setExpandedRowKeys(keys as string[]),
          rowExpandable: (rej) => Boolean(rej.acceptedRecord || rej.primaryReason === 'DUPLICATE_ID_CONFLICT'),
        }}
      />

      {/* Raw JSON Payload Inspector Modal (Requirement R2) */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <CodeOutlined style={{ color: '#3b82f6' }} />
            <span>Forensic Payload Inspection (100% Recoverable)</span>
          </div>
        }
        open={Boolean(inspectItem)}
        onCancel={() => setInspectItem(null)}
        footer={[
          <Button
            key="copy"
            icon={<CopyOutlined />}
            onClick={() => {
              if (inspectItem) {
                navigator.clipboard.writeText(JSON.stringify(inspectItem.rawPayload, null, 2));
                message.success('Raw Payload JSON copied to clipboard');
              }
            }}
            style={{ borderRadius: 0 }}
          >
            Copy Raw JSON
          </Button>,
          <Button
            key="close"
            type="primary"
            onClick={() => setInspectItem(null)}
            style={{ borderRadius: 0 }}
          >
            Close Inspector
          </Button>,
        ]}
        width={680}
        destroyOnClose
        centered
      >
        {inspectItem && (
          <Space direction="vertical" style={{ width: '100%', marginTop: 12 }} size="middle">
            <div>
              <Text strong style={{ display: 'block', fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>
                ALL IDENTIFIED VIOLATIONS:
              </Text>
              <Space wrap size={[6, 6]}>
                {inspectItem.allReasons.map((r, i) => (
                  <Tag key={i} color="error" style={{ fontWeight: 600, borderRadius: 0 }}>
                    {r}
                  </Tag>
                ))}
              </Space>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <Text strong style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  UNTOUCHED RAW JSON PAYLOAD:
                </Text>
                <Tag color="cyan" style={{ borderRadius: 0 }}>Immutable Audit Snapshot</Tag>
              </div>
              <pre
                style={{
                  padding: 16,
                  borderRadius: 0,
                  background: isDark ? '#18181b' : '#f1f5f9',
                  border: `1px solid var(--border-color)`,
                  color: isDark ? '#34d399' : '#047857',
                  fontFamily: 'monospace',
                  fontSize: 12,
                  overflowX: 'auto',
                  maxHeight: 340,
                  margin: 0,
                }}
              >
                {JSON.stringify(inspectItem.rawPayload, null, 2)}
              </pre>
            </div>
          </Space>
        )}
      </Modal>
    </div>
  );
}
