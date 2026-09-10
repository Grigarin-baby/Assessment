'use client';

import React from 'react';
import { 
  Table, 
  Card, 
  Input, 
  Button, 
  Space, 
  Typography, 
  Tooltip, 
  Empty 
} from 'antd';
import type { ColumnsType, TableProps } from 'antd/es/table';
import { 
  SearchOutlined, 
  ReloadOutlined, 
  FilterOutlined, 
  ClearOutlined 
} from '@ant-design/icons';
import { useTheme } from '@/theme/ThemeContext';

const { Title, Text } = Typography;

export interface CrmDataTablePagination {
  total: number;
  page: number;
  limit: number;
  totalPages?: number;
}

export interface CrmDataTableProps<T> {
  title?: string;
  subtitle?: string;
  icon?: React.ReactNode;
  columns: ColumnsType<T>;
  dataSource: T[];
  rowKey: string | ((record: T) => string);
  loading?: boolean;
  pagination: CrmDataTablePagination;
  onPageChange: (page: number, pageSize: number) => void;
  onRefresh?: () => void;
  // Search bar support
  searchValue?: string;
  onSearchChange?: (val: string) => void;
  searchPlaceholder?: string;
  // Extra filter controls slot
  filterControls?: React.ReactNode;
  onResetFilters?: () => void;
  hasActiveFilters?: boolean;
  // Expandable row support
  expandable?: TableProps<T>['expandable'];
  extraActions?: React.ReactNode;
}

export function CrmDataTable<T extends object>({
  title,
  subtitle,
  icon,
  columns,
  dataSource,
  rowKey,
  loading = false,
  pagination,
  onPageChange,
  onRefresh,
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Search by ID...',
  filterControls,
  onResetFilters,
  hasActiveFilters = false,
  expandable,
  extraActions,
}: CrmDataTableProps<T>) {
  const { isDark } = useTheme();

  return (
    <Card
      bordered={false}
      className="crm-table-container"
      style={{
        borderRadius: 0,
        boxShadow: isDark ? '0 4px 20px rgba(0,0,0,0.3)' : '0 4px 20px rgba(0,0,0,0.04)',
        background: 'var(--bg-card)',
        border: `1px solid var(--border-color)`,
        overflow: 'hidden',
      }}
      bodyStyle={{ padding: 0 }}
    >
      {/* Table Toolbar Header */}
      <div
        style={{
          padding: '18px 24px',
          borderBottom: `1px solid var(--border-color)`,
          background: 'var(--bg-secondary)',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Title Row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {icon && (
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 0,
                    background: 'var(--bg-hover)',
                    color: '#3b82f6',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 18,
                  }}
                >
                  {icon}
                </div>
              )}
              <div>
                {title && (
                  <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.2 }}>
                    {title}
                  </div>
                )}
                {subtitle && (
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {subtitle}
                  </Text>
                )}
              </div>
            </div>

            <Space wrap>
              {extraActions}
              {onRefresh && (
                <Tooltip title="Refresh dataset from PostgreSQL">
                  <Button
                    icon={<ReloadOutlined spin={loading} />}
                    onClick={onRefresh}
                    disabled={loading}
                    size="middle"
                    style={{ borderRadius: 0 }}
                  >
                    Refresh
                  </Button>
                </Tooltip>
              )}
            </Space>
          </div>

          {/* Search & Filters Row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', flex: 1 }}>
              {/* Optional Search Input */}
              {onSearchChange !== undefined && (
                <Input
                  prefix={<SearchOutlined style={{ color: 'var(--text-muted)' }} />}
                  placeholder={searchPlaceholder}
                  value={searchValue}
                  onChange={(e) => onSearchChange(e.target.value)}
                  style={{ width: 240, borderRadius: 0 }}
                  allowClear
                />
              )}

              {/* Page-Specific Filter Slots */}
              {filterControls}

              {/* Reset Filters */}
              {hasActiveFilters && onResetFilters && (
                <Button
                  type="link"
                  icon={<ClearOutlined />}
                  onClick={onResetFilters}
                  style={{ color: '#3b82f6', padding: '0 4px', fontSize: 12, borderRadius: 0 }}
                >
                  Reset Filters
                </Button>
              )}
            </div>

            {/* Total matching stats */}
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              Total: <strong style={{ color: 'var(--text-primary)' }}>{pagination.total}</strong> records
            </div>
          </div>
        </div>
      </div>

      {/* Ant Design Data Table - Isolated Body Scroll */}
      <Table<T>
        columns={columns}
        dataSource={dataSource}
        rowKey={rowKey}
        loading={loading}
        expandable={expandable}
        scroll={{ x: 1100, y: 'calc(100vh - 360px)' }}
        sticky
        locale={{
          emptyText: (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={<span style={{ color: 'var(--text-muted)' }}>No records match the current filters</span>}
            />
          ),
        }}
        pagination={{
          current: pagination.page,
          pageSize: pagination.limit,
          total: pagination.total,
          onChange: onPageChange,
          showSizeChanger: true,
          pageSizeOptions: ['10', '15', '25', '50'],
          showQuickJumper: true,
          showTotal: (total, range) => (
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              Showing {range[0]}-{range[1]} of {total} records
            </span>
          ),
          style: { padding: '14px 24px', margin: 0, borderTop: '1px solid var(--border-color)' },
        }}
      />
    </Card>
  );
}
