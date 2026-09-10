'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Row, 
  Col, 
  Card, 
  Statistic, 
  Progress, 
  Button, 
  Upload, 
  Alert, 
  Table, 
  Tag, 
  Space, 
  Typography, 
  Tooltip,
  Modal,
  Spin,
  message
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { 
  CheckCircleFilled, 
  CloseCircleFilled, 
  DatabaseOutlined, 
  RocketOutlined, 
  PlayCircleOutlined, 
  InboxOutlined, 
  ReloadOutlined, 
  ArrowRightOutlined, 
  AlertOutlined,
  ClockCircleOutlined,
  FileTextOutlined,
  DeleteOutlined,
  ExclamationCircleFilled,
  SyncOutlined,
  SafetyCertificateOutlined,
  BranchesOutlined,
  CheckCircleOutlined
} from '@ant-design/icons';
import { api, OverallStats, IngestRunItem } from '@/lib/api';
import { useTheme } from '@/theme/ThemeContext';

const { Title, Text, Paragraph } = Typography;
const { Dragger } = Upload;

export default function DashboardPage() {
  const { isDark } = useTheme();
  const [stats, setStats] = useState<OverallStats | null>(null);
  const [runs, setRuns] = useState<IngestRunItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastResult, setLastResult] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Database Wipe State
  const [wipeModalOpen, setWipeModalOpen] = useState(false);
  const [wiping, setWiping] = useState(false);

  // Ingestion Animated Status State
  const [ingesting, setIngesting] = useState(false);
  const [ingestModalOpen, setIngestModalOpen] = useState(false);
  const [ingestStage, setIngestStage] = useState<number>(0); // 0=idle, 1=reading, 2=validation, 3=dedup, 4=persisting, 5=complete, -1=error
  const [ingestProgress, setIngestProgress] = useState<number>(0);
  const [ingestStatusText, setIngestStatusText] = useState<string>('');
  const [ingestSummary, setIngestSummary] = useState<any | null>(null);

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

  const handleConfirmWipe = async () => {
    setWiping(true);
    try {
      const res = await api.cleanDatabase();
      message.success(
        `Database wiped: cleared ${res.deleted?.acceptedRecords ?? 0} accepted records, ${res.deleted?.rejectedRecords ?? 0} rejections, and ${res.deleted?.recordHistory ?? 0} history logs.`
      );
      setLastResult(null);
      setWipeModalOpen(false);
      await fetchData();
    } catch (err: any) {
      message.error(err.message || 'Failed to wipe database');
    } finally {
      setWiping(false);
    }
  };

  const executeIngestWithAnimation = async (
    action: () => Promise<any>,
    datasetName: string
  ) => {
    setIngesting(true);
    setIngestModalOpen(true);
    setIngestStage(1);
    setIngestProgress(22);
    setIngestStatusText(`Reading and parsing ${datasetName} payload stream...`);
    setIngestSummary(null);

    // Timed stage advancements to provide transparent real-time feedback
    const t1 = setTimeout(() => {
      setIngestStage(2);
      setIngestProgress(50);
      setIngestStatusText('Executing Section 3 Modular Rule Engine (UUID, ISO timestamps, value [0-100], status enum)...');
    }, 280);

    const t2 = setTimeout(() => {
      setIngestStage(3);
      setIngestProgress(75);
      setIngestStatusText('Evaluating Deduplication, SHA-256 payload hashes & Foreign Key revision relationships...');
    }, 620);

    const t3 = setTimeout(() => {
      setIngestStage(4);
      setIngestProgress(90);
      setIngestStatusText('Committing atomic PostgreSQL transactions across tables...');
    }, 950);

    try {
      const res = await action();
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);

      setIngestStage(5);
      setIngestProgress(100);
      setIngestStatusText('Batch Ingestion & Relational Persistence Completed Successfully!');
      setIngestSummary(res);
      setLastResult(res);
      message.success(`Ingested: ${res.accepted} accepted, ${res.rejected} sent to Dead Vault`);
      await fetchData();
    } catch (err: any) {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      setIngestStage(-1);
      setIngestStatusText(err.message || 'Ingestion encountered an unexpected pipeline error');
      message.error(err.message || 'Ingestion failed');
    } finally {
      setIngesting(false);
    }
  };

  const handleRunSample = () => {
    executeIngestWithAnimation(
      () => api.runSampleIngestion(),
      'Standard 247 Sample Records'
    );
  };

  const handleCustomUpload = (file: File) => {
    executeIngestWithAnimation(
      () => api.uploadFile(file),
      `Uploaded File (${file.name})`
    );
    return false; // prevent default upload POST
  };

  const acceptRate = stats && stats.totalProcessed > 0
    ? Number(((stats.totalAccepted / stats.totalProcessed) * 100).toFixed(1))
    : 0;

  const rejectRate = stats && stats.totalProcessed > 0
    ? Number(((stats.totalRejected / stats.totalProcessed) * 100).toFixed(1))
    : 0;

  const runColumns: ColumnsType<IngestRunItem> = [
    {
      title: 'Run ID',
      dataIndex: 'id',
      key: 'id',
      render: (id: string) => (
        <Text code style={{ fontSize: 11 }}>{id.slice(0, 8)}...</Text>
      ),
    },
    {
      title: 'Source Target',
      dataIndex: 'sourceFile',
      key: 'sourceFile',
      ellipsis: true,
      render: (src: string) => (
        <Tooltip title={src}>
          <Text strong style={{ fontSize: 12 }}>
            {src.split(/[\\/]/).pop() || src}
          </Text>
        </Tooltip>
      ),
    },
    {
      title: 'Total Records',
      dataIndex: 'totalRecords',
      key: 'totalRecords',
      align: 'center',
      render: (total: number) => <Text strong>{total}</Text>,
    },
    {
      title: 'Accepted',
      dataIndex: 'acceptedCount',
      key: 'acceptedCount',
      align: 'center',
      render: (count: number) => (
        <Tag color="success" style={{ fontWeight: 600, borderRadius: 0 }}>
          {count}
        </Tag>
      ),
    },
    {
      title: 'Rejected',
      dataIndex: 'rejectedCount',
      key: 'rejectedCount',
      align: 'center',
      render: (count: number) => (
        <Tag color={count > 0 ? 'error' : 'default'} style={{ fontWeight: 600, borderRadius: 0 }}>
          {count}
        </Tag>
      ),
    },
    {
      title: 'Started At',
      dataIndex: 'startedAt',
      key: 'startedAt',
      render: (dt: string) => (
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
          {new Date(dt).toLocaleTimeString()}
        </span>
      ),
    },
  ];

  const pipelineStages = [
    {
      key: 1,
      title: 'Payload Stream & Parsing',
      desc: 'Ingesting raw JSON / NDJSON buffer into memory',
      icon: <DatabaseOutlined />,
    },
    {
      key: 2,
      title: 'Section 3 Modular Rule Engine',
      desc: 'Validating UUID, ISO timestamp, numeric ranges, status enum',
      icon: <SafetyCertificateOutlined />,
    },
    {
      key: 3,
      title: 'Deduplication & Revisions',
      desc: 'Payload hash collisions, version increment, foreign key history',
      icon: <BranchesOutlined />,
    },
    {
      key: 4,
      title: 'Atomic PostgreSQL Persistence',
      desc: 'Writing accepted_records, rejected_records, record_history',
      icon: <RocketOutlined />,
    },
  ];

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      {/* Top Banner & Actions Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <Title level={3} style={{ margin: 0, color: 'var(--text-primary)' }}>
            Enterprise Ingestion Dashboard
          </Title>
          <Text type="secondary" style={{ fontSize: 13 }}>
            Continuous ingestion pipeline metrics, Section 3 validation breakdown, and Dead-Letter forensics.
          </Text>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Wipe Database Button */}
          <Button
            danger
            icon={<DeleteOutlined />}
            onClick={() => setWipeModalOpen(true)}
            size="middle"
            style={{ borderRadius: 0 }}
          >
            Wipe Database
          </Button>

          {/* Refresh Button */}
          <Button
            icon={<ReloadOutlined spin={loading} />}
            onClick={fetchData}
            disabled={loading}
            size="middle"
            style={{ borderRadius: 0 }}
          >
            Refresh Metrics
          </Button>
        </div>
      </div>

      {error && (
        <Alert
          message="System Notice"
          description={error}
          type="error"
          showIcon
          closable
          onClose={() => setError(null)}
          style={{ borderRadius: 0 }}
        />
      )}

      {/* KPI Cards Row */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card
            bordered={false}
            style={{
              borderRadius: 0,
              border: `1px solid var(--border-color)`,
              background: 'var(--bg-card)',
              boxShadow: isDark ? '0 4px 12px rgba(0,0,0,0.3)' : '0 2px 8px rgba(0,0,0,0.03)',
            }}
          >
            <Statistic
              title={<span style={{ color: 'var(--text-muted)', fontSize: 12, fontWeight: 600 }}>TOTAL INGESTED RECORDS</span>}
              value={stats?.totalProcessed ?? 0}
              prefix={<DatabaseOutlined style={{ color: '#3b82f6', marginRight: 6 }} />}
              valueStyle={{ color: 'var(--text-primary)', fontWeight: 800 }}
            />
            <div style={{ marginTop: 8, fontSize: 11, color: 'var(--text-muted)' }}>
              Processed across {stats?.totalRuns ?? 0} batch runs
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card
            bordered={false}
            style={{
              borderRadius: 0,
              border: `1px solid var(--border-color)`,
              background: 'var(--bg-card)',
              boxShadow: isDark ? '0 4px 12px rgba(0,0,0,0.3)' : '0 2px 8px rgba(0,0,0,0.03)',
            }}
          >
            <Statistic
              title={<span style={{ color: 'var(--text-muted)', fontSize: 12, fontWeight: 600 }}>ACCEPTED RECORDS (R1)</span>}
              value={stats?.totalAccepted ?? 0}
              suffix={<span style={{ fontSize: 13, color: '#10b981', fontWeight: 600 }}>({acceptRate}%)</span>}
              prefix={<CheckCircleFilled style={{ color: '#10b981', marginRight: 6 }} />}
              valueStyle={{ color: '#10b981', fontWeight: 800 }}
            />
            <Progress percent={acceptRate} strokeColor="#10b981" showInfo={false} size="small" style={{ marginTop: 8 }} />
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card
            bordered={false}
            style={{
              borderRadius: 0,
              border: `1px solid var(--border-color)`,
              background: 'var(--bg-card)',
              boxShadow: isDark ? '0 4px 12px rgba(0,0,0,0.3)' : '0 2px 8px rgba(0,0,0,0.03)',
            }}
          >
            <Statistic
              title={<span style={{ color: 'var(--text-muted)', fontSize: 12, fontWeight: 600 }}>DEAD-LETTER REJECTIONS (R2)</span>}
              value={stats?.totalRejected ?? 0}
              suffix={<span style={{ fontSize: 13, color: '#ef4444', fontWeight: 600 }}>({rejectRate}%)</span>}
              prefix={<CloseCircleFilled style={{ color: '#ef4444', marginRight: 6 }} />}
              valueStyle={{ color: '#ef4444', fontWeight: 800 }}
            />
            <Progress percent={rejectRate} strokeColor="#ef4444" showInfo={false} size="small" style={{ marginTop: 8 }} />
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card
            bordered={false}
            style={{
              borderRadius: 0,
              border: `1px solid var(--border-color)`,
              background: 'var(--bg-card)',
              boxShadow: isDark ? '0 4px 12px rgba(0,0,0,0.3)' : '0 2px 8px rgba(0,0,0,0.03)',
            }}
          >
            <Statistic
              title={<span style={{ color: 'var(--text-muted)', fontSize: 12, fontWeight: 600 }}>PIPELINE STATUS</span>}
              value="Operational"
              prefix={<RocketOutlined style={{ color: '#3b82f6', marginRight: 6 }} />}
              valueStyle={{ color: '#3b82f6', fontWeight: 700, fontSize: 20 }}
            />
            <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Tag color="success" style={{ margin: 0, fontSize: 11, borderRadius: 0 }}>Rule Engine Active</Tag>
              <Tag color="blue" style={{ margin: 0, fontSize: 11, borderRadius: 0 }}>FK History Enabled</Tag>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Middle Row: Ingestion Runner + Rejection Distribution */}
      <Row gutter={[16, 16]}>
        {/* Left: Interactive Ingestion Runner */}
        <Col xs={24} lg={12}>
          <Card
            title={
              <Space>
                <PlayCircleOutlined style={{ color: '#3b82f6' }} />
                <span>Pipeline Ingestion Runner</span>
              </Space>
            }
            bordered={false}
            style={{
              borderRadius: 0,
              border: `1px solid var(--border-color)`,
              background: 'var(--bg-card)',
              height: '100%',
            }}
          >
            <Paragraph type="secondary" style={{ fontSize: 13, marginBottom: 16 }}>
              Execute ingestion runs against synthetic or dirty production datasets (JSON arrays or NDJSON).
            </Paragraph>

            {/* Quick Sample Button */}
            <div
              style={{
                padding: '16px',
                borderRadius: 0,
                background: isDark ? 'rgba(59, 130, 246, 0.08)' : '#eff6ff',
                border: '1px solid rgba(59, 130, 246, 0.25)',
                marginBottom: 20,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 12,
              }}
            >
              <div>
                <Text strong style={{ display: 'block', fontSize: 13, color: 'var(--text-primary)' }}>
                  Standard Sample Dataset (247 Dirty Records)
                </Text>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Tests UUIDs, duplicate collisions, out-of-order dates, floats, and bad enums.
                </Text>
              </div>
              <Button
                type="primary"
                icon={<PlayCircleOutlined />}
                loading={ingesting}
                onClick={handleRunSample}
                style={{ borderRadius: 0 }}
              >
                Run Ingestion
              </Button>
            </div>

            {/* File Drag & Drop */}
            <Dragger
              name="file"
              multiple={false}
              showUploadList={false}
              beforeUpload={(file) => handleCustomUpload(file)}
              disabled={ingesting}
              style={{
                padding: '16px 0',
                background: 'var(--bg-secondary)',
                borderRadius: 0,
                borderColor: 'var(--border-color)',
              }}
            >
              <p className="ant-upload-drag-icon">
                <InboxOutlined style={{ color: '#3b82f6', fontSize: 36 }} />
              </p>
              <p style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)', margin: 0 }}>
                Click or drag custom JSON / NDJSON file here
              </p>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '4px 0 0' }}>
                Files are streamed through the modular Ingestion Rule Engine directly into PostgreSQL.
              </p>
            </Dragger>

            {/* Last Result Summary Alert */}
            {lastResult && (
              <div style={{ marginTop: 16 }}>
                <Alert
                  message={
                    <span style={{ fontWeight: 700 }}>
                      Latest Ingest Run Complete ({lastResult.durationMs} ms)
                    </span>
                  }
                  description={
                    <div style={{ fontSize: 12, marginTop: 4 }}>
                      <div>• Total Processed: <strong>{lastResult.totalProcessed}</strong> records</div>
                      <div>• Accepted & Stored: <strong style={{ color: '#10b981' }}>{lastResult.accepted}</strong></div>
                      <div>• Quarantined into Vault: <strong style={{ color: '#ef4444' }}>{lastResult.rejected}</strong></div>
                      {lastResult.skippedDuplicates > 0 && (
                        <div>• Idempotently Skipped Duplicates: <strong>{lastResult.skippedDuplicates}</strong></div>
                      )}
                    </div>
                  }
                  type="success"
                  showIcon
                  style={{ borderRadius: 0 }}
                />
              </div>
            )}
          </Card>
        </Col>

        {/* Right: Rejection Breakdown Distribution (R5) */}
        <Col xs={24} lg={12}>
          <Card
            title={
              <Space>
                <AlertOutlined style={{ color: '#ef4444' }} />
                <span>Rejection Reason Distribution (Requirement R5)</span>
              </Space>
            }
            extra={
              <Link href="/rejections">
                <Button type="link" size="small" icon={<ArrowRightOutlined />} style={{ color: '#3b82f6', borderRadius: 0 }}>
                  Dead Vault
                </Button>
              </Link>
            }
            bordered={false}
            style={{
              borderRadius: 0,
              border: `1px solid var(--border-color)`,
              background: 'var(--bg-card)',
              height: '100%',
            }}
          >
            <Paragraph type="secondary" style={{ fontSize: 13, marginBottom: 16 }}>
              Aggregated distribution of rule failures categorized by the Section 3 error taxonomy.
            </Paragraph>

            {stats && stats.rejectionBreakdown && Object.keys(stats.rejectionBreakdown).length > 0 ? (
              <Space direction="vertical" style={{ width: '100%' }} size="middle">
                {Object.entries(stats.rejectionBreakdown).map(([reason, count]) => {
                  const pct = stats.totalRejected > 0 ? Number(((count / stats.totalRejected) * 100).toFixed(1)) : 0;
                  return (
                    <div key={reason}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <Text strong style={{ fontSize: 12, fontFamily: 'monospace' }}>
                          {reason}
                        </Text>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {count} failures ({pct}%)
                        </Text>
                      </div>
                      <Progress
                        percent={pct}
                        strokeColor={
                          reason === 'DUPLICATE_ID_CONFLICT'
                            ? '#f97316'
                            : reason === 'MISSING_FIELD'
                            ? '#ec4899'
                            : '#ef4444'
                        }
                        size="small"
                        showInfo={false}
                      />
                    </div>
                  );
                })}
              </Space>
            ) : (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
                <CheckCircleFilled style={{ fontSize: 32, color: '#10b981', marginBottom: 8 }} />
                <div>Zero rejections recorded. Run an ingestion batch to observe R5 analytics.</div>
              </div>
            )}
          </Card>
        </Col>
      </Row>

      {/* Bottom Row: Recent Runs Audit Table */}
      <Card
        title={
          <Space>
            <FileTextOutlined style={{ color: '#3b82f6' }} />
            <span>Recent Ingestion Runs Activity</span>
          </Space>
        }
        bordered={false}
        style={{
          borderRadius: 0,
          border: `1px solid var(--border-color)`,
          background: 'var(--bg-card)',
        }}
        bodyStyle={{ padding: 0 }}
      >
        <Table<IngestRunItem>
          columns={runColumns}
          dataSource={runs}
          rowKey="id"
          pagination={false}
          size="middle"
          scroll={{ x: 'max-content' }}
        />
      </Card>

      {/* WIPE DATABASE CONFIRMATION MODAL */}
      <Modal
        open={wipeModalOpen}
        onCancel={() => !wiping && setWipeModalOpen(false)}
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <ExclamationCircleFilled style={{ color: '#ef4444', fontSize: 20 }} />
            <span style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-primary)' }}>
              Confirm Database Wipe & Factory Reset
            </span>
          </div>
        }
        footer={[
          <Button
            key="cancel"
            disabled={wiping}
            onClick={() => setWipeModalOpen(false)}
            style={{ borderRadius: 0 }}
          >
            Cancel
          </Button>,
          <Button
            key="confirm"
            type="primary"
            danger
            loading={wiping}
            icon={<DeleteOutlined />}
            onClick={handleConfirmWipe}
            style={{ borderRadius: 0 }}
          >
            Yes, Wipe All Records
          </Button>,
        ]}
        width={560}
        centered
        destroyOnClose
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingTop: 10 }}>
          <Alert
            type="error"
            showIcon
            message={<span style={{ fontWeight: 700 }}>Irreversible Purge Warning</span>}
            description="This action cannot be undone. All ingested records, historical child revisions, dead vault logs, and batch run histories will be immediately deleted from PostgreSQL."
            style={{ borderRadius: 0 }}
          />

          <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>
              The following database tables will be truncated:
            </div>
            <ul style={{ margin: 0, paddingLeft: 22, fontFamily: 'monospace', fontSize: 12 }}>
              <li><code>accepted_records</code> — All master processed event records</li>
              <li><code>rejected_records</code> — Quarantined Dead-Letter Vault records</li>
              <li><code>record_history</code> — Child revisions & foreign key audit history</li>
              <li><code>ingest_runs</code> — Batch execution audit logs & summaries</li>
            </ul>
            <div style={{ marginTop: 12, padding: '10px 14px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', fontSize: 12, color: 'var(--text-muted)' }}>
              🔒 <strong>Safe Operation:</strong> User authentication credentials and database schemas are preserved. Dashboard metrics and data tables will safely reset to zero.
            </div>
          </div>
        </div>
      </Modal>

      {/* LIVE INGESTION LOADING & PIPELINE STATUS MODAL */}
      <Modal
        open={ingestModalOpen}
        closable={!ingesting}
        maskClosable={!ingesting}
        onCancel={() => !ingesting && setIngestModalOpen(false)}
        footer={
          ingesting ? null : (
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <Button onClick={() => setIngestModalOpen(false)} style={{ borderRadius: 0 }}>
                Dismiss
              </Button>
              {ingestSummary && (
                <Link href="/records">
                  <Button type="primary" style={{ borderRadius: 0 }}>
                    Explore Accepted Records
                  </Button>
                </Link>
              )}
            </div>
          )
        }
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {ingesting ? (
              <SyncOutlined spin style={{ color: '#3b82f6', fontSize: 18 }} />
            ) : ingestStage === 5 ? (
              <CheckCircleFilled style={{ color: '#10b981', fontSize: 18 }} />
            ) : (
              <CloseCircleFilled style={{ color: '#ef4444', fontSize: 18 }} />
            )}
            <span style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-primary)' }}>
              {ingesting
                ? 'Processing Pipeline Ingestion...'
                : ingestStage === 5
                ? 'Ingestion Run Succeeded'
                : 'Ingestion Encountered Error'}
            </span>
          </div>
        }
        width={640}
        centered
        destroyOnClose
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, paddingTop: 8 }}>
          {/* Progress Bar with Live Percentage */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <Text strong style={{ fontSize: 13, color: 'var(--text-primary)' }}>
                {ingestStatusText}
              </Text>
              <Text code style={{ fontSize: 12, fontWeight: 700 }}>
                {ingestProgress}%
              </Text>
            </div>
            <Progress
              percent={ingestProgress}
              status={ingesting ? 'active' : ingestStage === 5 ? 'success' : 'exception'}
              strokeColor={ingestStage === 5 ? '#10b981' : ingestStage === -1 ? '#ef4444' : '#3b82f6'}
              showInfo={false}
              strokeWidth={8}
            />
          </div>

          {/* Pipeline Stage Steps Breakdown */}
          <div
            style={{
              padding: '16px',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}
          >
            <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', fontWeight: 700 }}>
              Live Pipeline Stages & Execution State
            </div>

            {pipelineStages.map((st) => {
              const isDone = ingestStage > st.key || ingestStage === 5;
              const isCurrent = ingestStage === st.key && ingesting;

              return (
                <div
                  key={st.key}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    background: isCurrent
                      ? (isDark ? 'rgba(59, 130, 246, 0.15)' : '#eff6ff')
                      : isDone
                      ? (isDark ? 'rgba(16, 185, 129, 0.08)' : '#f0fdf4')
                      : 'transparent',
                    border: `1px solid ${
                      isCurrent
                        ? '#3b82f6'
                        : isDone
                        ? 'rgba(16, 185, 129, 0.25)'
                        : 'var(--border-color)'
                    }`,
                    transition: 'all 0.2s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span
                      style={{
                        fontSize: 16,
                        color: isCurrent ? '#3b82f6' : isDone ? '#10b981' : 'var(--text-muted)',
                      }}
                    >
                      {st.icon}
                    </span>
                    <div>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          color: isCurrent
                            ? '#3b82f6'
                            : isDone
                            ? 'var(--text-primary)'
                            : 'var(--text-muted)',
                        }}
                      >
                        {st.title}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        {st.desc}
                      </div>
                    </div>
                  </div>

                  <div>
                    {isCurrent ? (
                      <Tag color="processing" icon={<SyncOutlined spin />} style={{ margin: 0, borderRadius: 0 }}>
                        Active
                      </Tag>
                    ) : isDone ? (
                      <Tag color="success" icon={<CheckCircleFilled />} style={{ margin: 0, borderRadius: 0 }}>
                        Done
                      </Tag>
                    ) : (
                      <Tag style={{ margin: 0, borderRadius: 0, color: 'var(--text-muted)', border: '1px solid var(--border-color)' }}>
                        Pending
                      </Tag>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Post-Ingestion Metric Cards Summary */}
          {ingestSummary && (
            <Row gutter={[12, 12]}>
              <Col span={8}>
                <div
                  style={{
                    padding: '12px',
                    textAlign: 'center',
                    background: isDark ? 'rgba(16, 185, 129, 0.1)' : '#ecfdf5',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                  }}
                >
                  <div style={{ fontSize: 11, color: '#10b981', fontWeight: 600 }}>ACCEPTED & STORED</div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: '#10b981' }}>{ingestSummary.accepted}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>In accepted_records</div>
                </div>
              </Col>
              <Col span={8}>
                <div
                  style={{
                    padding: '12px',
                    textAlign: 'center',
                    background: isDark ? 'rgba(239, 68, 68, 0.1)' : '#fef2f2',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                  }}
                >
                  <div style={{ fontSize: 11, color: '#ef4444', fontWeight: 600 }}>DEAD VAULT REJECTIONS</div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: '#ef4444' }}>{ingestSummary.rejected}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>In rejected_records</div>
                </div>
              </Col>
              <Col span={8}>
                <div
                  style={{
                    padding: '12px',
                    textAlign: 'center',
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-color)',
                  }}
                >
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>EXECUTION DURATION</div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)' }}>{ingestSummary.durationMs} <span style={{ fontSize: 13, fontWeight: 500 }}>ms</span></div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Total: {ingestSummary.totalProcessed} records</div>
                </div>
              </Col>
            </Row>
          )}
        </div>
      </Modal>
    </Space>
  );
}
