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
  Tooltip 
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
  ExclamationCircleOutlined
} from '@ant-design/icons';
import { api, RejectionItem } from '@/lib/api';
import { CrmDataTable } from '@/components/CrmDataTable';
import { useTheme } from '@/theme/ThemeContext';

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

  const columns: ColumnsType<RejectionItem> = [
    {
      title: 'Audit Vault ID',
      dataIndex: 'id',
      key: 'id',
      render: (id: string) => (
        <Space orientation="horizontal" size={6}>
          <Text code style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            {id.slice(0, 8)}...
          </Text>
          <Tooltip title="Copy full Audit UUID">
            <Button
              type="text"
              size="small"
              icon={<CopyOutlined style={{ fontSize: 11, color: 'var(--text-muted)' }} />}
              onClick={() => navigator.clipboard.writeText(id)}
            />
          </Tooltip>
        </Space>
      ),
    },
    {
      title: 'Original Document ID',
      dataIndex: 'originalId',
      key: 'originalId',
      render: (id: string | null) => (
        id ? (
          <Text code strong style={{ fontSize: 12 }}>{id}</Text>
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
        <Tag color={getReasonColor(reason)} style={{ fontWeight: 600, fontSize: 11 }}>
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
            <Tag key={i} style={{ fontSize: 10, margin: 0 }}>
              {r}
            </Tag>
          ))}
        </Space>
      ),
    },
    {
      title: 'Quarantined At',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (dt: string) => (
        <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
          <ClockCircleOutlined style={{ marginRight: 6 }} />
          {new Date(dt).toLocaleString()}
        </span>
      ),
    },
    {
      title: 'Forensic Actions',
      key: 'actions',
      align: 'center',
      render: (_, rej) => (
        <Space size="small">
          {rej.acceptedRecord && (
            <Tag color="blue" icon={<SwapOutlined />} style={{ fontWeight: 600 }}>
              Duplicate Conflict (FK)
            </Tag>
          )}
          <Button
            size="small"
            icon={<CodeOutlined />}
            onClick={() => setInspectItem(rej)}
          >
            Inspect Raw
          </Button>
        </Space>
      ),
    },
  ];

  // Expandable row for Duplicate Conflict master comparison
  const renderMasterComparison = (rej: RejectionItem) => {
    if (!rej.acceptedRecord) return null;

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
              <SwapOutlined style={{ color: '#3b82f6', fontSize: 16 }} />
              <Text strong style={{ fontSize: 13, color: 'var(--text-primary)' }}>
                Duplicate Conflict Analysis: Candidate vs Database Master Record
              </Text>
              <Tag color="volcano" style={{ borderRadius: 0 }}>DUPLICATE_ID_CONFLICT</Tag>
            </Space>
            <Text type="secondary" style={{ fontSize: 11, fontFamily: 'monospace' }}>
              Nullable Relational FK: <code style={{ color: '#60a5fa' }}>rejected_records.acceptedRecordId = &quot;{rej.acceptedRecord.id}&quot;</code>
            </Text>
          </div>

          {/* Side-by-Side Comparison Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
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
                <Tag color="success" icon={<CheckCircleFilled />} style={{ borderRadius: 0 }}>
                  ACTIVE MASTER IN DATABASE (ACCEPTED)
                </Tag>
                <Text strong style={{ fontSize: 12, color: '#10b981' }}>
                  ID: {rej.acceptedRecord.id}
                </Text>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Text type="secondary">Source System:</Text>
                  <Tag color="blue" style={{ borderRadius: 0 }}>{rej.acceptedRecord.source}</Tag>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Text type="secondary">Recorded At:</Text>
                  <Text style={{ fontFamily: 'monospace' }}>{rej.acceptedRecord.recordedAt}</Text>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Text type="secondary">Stored Value:</Text>
                  <Text strong style={{ fontSize: 14, color: '#10b981' }}>{rej.acceptedRecord.value}</Text>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Text type="secondary">Status:</Text>
                  <Tag color="success" style={{ borderRadius: 0 }}>{rej.acceptedRecord.status}</Tag>
                </div>
              </div>
            </div>

            {/* Right: Quarantined Candidate in Dead-Letter Vault */}
            <div
              style={{
                padding: '14px',
                borderRadius: 0,
                background: isDark ? 'rgba(239, 68, 68, 0.08)' : '#fef2f2',
                border: '1px solid rgba(239, 68, 68, 0.3)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <Tag color="error" icon={<CloseCircleFilled />} style={{ borderRadius: 0 }}>
                  QUARANTINED DUPLICATE (REJECTED)
                </Tag>
                <Tag color="volcano" style={{ borderRadius: 0 }}>CONFLICT</Tag>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Text type="secondary">Candidate ID:</Text>
                  <Text strong code>{rej.originalId || 'N/A'}</Text>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Text type="secondary">Source System:</Text>
                  <Tag color="error" style={{ borderRadius: 0 }}>{rej.rawPayload?.source ?? 'N/A'}</Tag>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Text type="secondary">Recorded At:</Text>
                  <Text style={{ fontFamily: 'monospace' }}>{rej.rawPayload?.recordedAt ?? 'N/A'}</Text>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Text type="secondary">Conflicting Value:</Text>
                  <Text strong style={{ fontSize: 14, color: '#ef4444' }}>{rej.rawPayload?.value ?? 'N/A'}</Text>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Text type="secondary">Status:</Text>
                  <Tag color="error" style={{ borderRadius: 0 }}>{rej.rawPayload?.status ?? 'N/A'}</Tag>
                </div>
              </div>
            </div>
          </div>

          {/* Footnote */}
          <div
            style={{
              padding: '8px 12px',
              borderRadius: 0,
              background: 'var(--bg-card)',
              border: `1px solid var(--border-color)`,
              fontSize: 11,
              color: 'var(--text-muted)',
            }}
          >
            <strong style={{ color: 'var(--text-primary)' }}>Forensic Deduplication Rule:</strong> Candidate record arrived with identical document ID and identical timestamp but contradictory field payload. To prevent state corruption, the active master in PostgreSQL was preserved and the conflicting record was quarantined with a relational foreign key.
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
        subtitle="Forensic audit trail of all rejected records with untouched raw payloads and error taxonomy"
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
        filterControls={
          <Select
            placeholder="All Rejection Reasons"
            allowClear
            value={selectedReason}
            onChange={setSelectedReason}
            style={{ width: 220 }}
            options={reasons.map(r => ({ label: r, value: r }))}
          />
        }
        expandable={{
          expandedRowRender: renderMasterComparison,
          rowExpandable: (rej) => Boolean(rej.acceptedRecord),
        }}
      />

      {/* Raw JSON Payload Inspector Modal (Requirement R2) */}
      <Modal
        title={
          <Space>
            <CodeOutlined style={{ color: '#3b82f6' }} />
            <span>Forensic Payload Inspection (100% Recoverable)</span>
          </Space>
        }
        open={Boolean(inspectItem)}
        onCancel={() => setInspectItem(null)}
        footer={[
          <Button key="close" type="primary" onClick={() => setInspectItem(null)}>
            Close Inspector
          </Button>,
        ]}
        width={680}
      >
        {inspectItem && (
          <Space direction="vertical" style={{ width: '100%', marginTop: 12 }} size="middle">
            <div>
              <Text strong style={{ display: 'block', fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>
                ALL IDENTIFIED VIOLATIONS:
              </Text>
              <Space wrap size={[6, 6]}>
                {inspectItem.allReasons.map((r, i) => (
                  <Tag key={i} color="error" style={{ fontWeight: 600 }}>
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
                <Tag color="cyan">Immutable Audit Snapshot</Tag>
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
