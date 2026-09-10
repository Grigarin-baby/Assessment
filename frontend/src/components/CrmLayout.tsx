'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Layout, 
  Menu, 
  Button, 
  Tooltip, 
  Avatar, 
  Space, 
  Tag, 
  Typography,
} from 'antd';
import {
  DashboardOutlined,
  DatabaseOutlined,
  AlertOutlined,
  SunOutlined,
  MoonOutlined,
  UserOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  CheckCircleFilled,
} from '@ant-design/icons';
import { useTheme } from '@/theme/ThemeContext';
import { api } from '@/lib/api';

const { Header, Sider, Content } = Layout;
const { Text } = Typography;

interface CrmLayoutProps {
  children: React.ReactNode;
}

export function CrmLayout({ children }: CrmLayoutProps) {
  const pathname = usePathname();
  const { mode, isDark, toggleTheme } = useTheme();
  const [collapsed, setCollapsed] = useState(false);

  // Skip CRM layout on login page
  if (pathname === '/login') {
    return <>{children}</>;
  }

  const menuItems = [
    {
      key: '/',
      icon: <DashboardOutlined style={{ fontSize: 16 }} />,
      label: <Link href="/">Dashboard</Link>,
    },
    {
      key: '/records',
      icon: <DatabaseOutlined style={{ fontSize: 16 }} />,
      label: <Link href="/records">Accepted Records</Link>,
    },
    {
      key: '/rejections',
      icon: <AlertOutlined style={{ fontSize: 16 }} />,
      label: <Link href="/rejections">Dead Vault</Link>,
    },
  ];

  const getPageTitle = () => {
    switch (pathname) {
      case '/':
        return 'Overview & Ingestion Hub';
      case '/records':
        return 'Accepted Records Explorer (R4)';
      case '/rejections':
        return 'Dead-Letter Audit Vault (R2)';
      default:
        return 'Record Ingestion CRM';
    }
  };

  const [health, setHealth] = useState<{
    server: 'online' | 'offline' | 'checking';
    database: 'connected' | 'disconnected' | 'unknown';
  }>({ server: 'checking', database: 'unknown' });

  const checkHealth = async () => {
    try {
      const res = await api.getHealth();
      if (res && res.server === 'online') {
        setHealth({
          server: 'online',
          database: res.database === 'connected' ? 'connected' : 'disconnected',
        });
      } else {
        setHealth({ server: 'offline', database: 'disconnected' });
      }
    } catch {
      setHealth({ server: 'offline', database: 'disconnected' });
    }
  };

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 8000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Layout style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
      {/* CRM Left Sidebar */}
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        width={250}
        collapsedWidth={76}
        style={{
          background: 'var(--sidebar-bg)',
          borderRight: `1px solid var(--border-color)`,
          position: 'sticky',
          top: 0,
          height: '100vh',
          zIndex: 100,
          display: 'flex',
          flexDirection: 'column',
          transition: 'all 0.25s ease',
        }}
      >
        {/* Brand Header */}
        <div
          style={{
            height: 64,
            display: 'flex',
            alignItems: 'center',
            padding: collapsed ? '0 16px' : '0 20px',
            gap: 12,
            borderBottom: `1px solid var(--border-color)`,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 0,
              background: isDark ? '#27272e' : '#18181b',
              border: '1px solid var(--border-color)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              fontWeight: 800,
              fontSize: 16,
              flexShrink: 0,
            }}
          >
            RI
          </div>
          {!collapsed && (
            <div style={{ overflow: 'hidden', whiteSpace: 'nowrap' }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)', lineHeight: 1.2 }}>
                Record CRM
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                <Tag style={{ margin: 0, fontSize: 10, lineHeight: '16px', padding: '0 5px', borderRadius: 0, background: 'var(--bg-hover)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)' }}>
                  Enterprise
                </Tag>
                <Text type="secondary" style={{ fontSize: 11 }}>v1.0</Text>
              </div>
            </div>
          )}
        </div>

        {/* Navigation Menu */}
        <div style={{ flex: 1, paddingTop: 12, overflowY: 'auto' }}>
          <Menu
            theme={isDark ? 'dark' : 'light'}
            mode="inline"
            selectedKeys={[pathname]}
            items={menuItems}
            style={{
              background: 'transparent',
              borderRight: 0,
              fontWeight: 500,
            }}
          />
        </div>

        {/* Sidebar Footer Info - Strictly Anchored to Bottom */}
        <div
          style={{
            marginTop: 'auto',
            padding: collapsed ? '14px 8px' : '16px 20px',
            borderTop: `1px solid var(--border-color)`,
            background: 'var(--sidebar-bg)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Avatar
              shape="square"
              style={{ backgroundColor: '#383842', flexShrink: 0, borderRadius: 0 }}
              icon={<UserOutlined />}
            />
            {!collapsed && (
              <div style={{ flex: 1, minWidth: 0 }}>
                <Text strong style={{ display: 'block', fontSize: 13, color: 'var(--text-primary)' }} ellipsis>
                  System Admin
                </Text>
                <Text type="secondary" style={{ fontSize: 11, display: 'block' }} ellipsis>
                  Active Operator
                </Text>
              </div>
            )}
          </div>
        </div>
      </Sider>

      {/* Main App Layout */}
      <Layout style={{ background: 'var(--bg-primary)', transition: 'all 0.25s ease' }}>
        {/* CRM Top Header */}
        <Header
          style={{
            height: 64,
            lineHeight: 'normal',
            padding: '0 24px',
            background: 'var(--header-bg)',
            borderBottom: `1px solid var(--border-color)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            position: 'sticky',
            top: 0,
            zIndex: 90,
            boxShadow: isDark ? '0 2px 8px rgba(0,0,0,0.4)' : '0 2px 8px rgba(0,0,0,0.03)',
            transition: 'all 0.25s ease',
          }}
        >
          {/* Left: Collapse Toggle & Aligned Header Title */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed(!collapsed)}
              style={{ fontSize: 16, width: 36, height: 36, minWidth: 36, padding: 0, borderRadius: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
            />
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <span style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, lineHeight: 1.3 }}>
                Data Management CRM
              </span>
              <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.3 }}>
                {getPageTitle()}
              </span>
            </div>
          </div>

          {/* Right: Dual Status Badges, Theme Toggle, Profile Indicator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* Backend API Server Status */}
            <Tooltip title={`NestJS API Server at http://localhost:4000 is ${health.server.toUpperCase()}`}>
              <div
                style={{
                  height: 36,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '0 12px',
                  borderRadius: 0,
                  background: health.server === 'online'
                    ? (isDark ? 'rgba(16, 185, 129, 0.12)' : '#ecfdf5')
                    : (isDark ? 'rgba(239, 68, 68, 0.12)' : '#fef2f2'),
                  border: `1px solid ${health.server === 'online' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                  color: health.server === 'online' ? '#10b981' : '#ef4444',
                  fontWeight: 600,
                  fontSize: 12,
                  boxSizing: 'border-box',
                }}
              >
                {health.server === 'online' ? (
                  <CheckCircleFilled style={{ color: '#10b981', fontSize: 13 }} />
                ) : (
                  <span style={{ display: 'inline-block', width: 8, height: 8, background: '#ef4444', marginRight: 2 }} />
                )}
                <span>Backend API: {health.server === 'online' ? 'Online' : 'Offline'}</span>
              </div>
            </Tooltip>

            {/* PostgreSQL Database Status */}
            <Tooltip title={`PostgreSQL Database connection is ${health.database.toUpperCase()}`}>
              <div
                style={{
                  height: 36,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '0 12px',
                  borderRadius: 0,
                  background: health.database === 'connected'
                    ? (isDark ? 'rgba(16, 185, 129, 0.12)' : '#ecfdf5')
                    : (isDark ? 'rgba(239, 68, 68, 0.12)' : '#fef2f2'),
                  border: `1px solid ${health.database === 'connected' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                  color: health.database === 'connected' ? '#10b981' : '#ef4444',
                  fontWeight: 600,
                  fontSize: 12,
                  boxSizing: 'border-box',
                }}
              >
                {health.database === 'connected' ? (
                  <CheckCircleFilled style={{ color: '#10b981', fontSize: 13 }} />
                ) : (
                  <span style={{ display: 'inline-block', width: 8, height: 8, background: '#ef4444', marginRight: 2 }} />
                )}
                <span>PostgreSQL: {health.database === 'connected' ? 'Connected' : 'Disconnected'}</span>
              </div>
            </Tooltip>

            {/* Dark / Light Mode Switcher */}
            <Tooltip title={`Switch to ${isDark ? 'Light' : 'Dark'} Mode`}>
              <Button
                icon={isDark ? <SunOutlined style={{ color: '#f59e0b', fontSize: 14 }} /> : <MoonOutlined style={{ color: '#3b82f6', fontSize: 14 }} />}
                onClick={toggleTheme}
                style={{
                  width: 36,
                  height: 36,
                  minWidth: 36,
                  padding: 0,
                  borderRadius: 0,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'var(--bg-hover)',
                  border: `1px solid var(--border-color)`,
                  boxSizing: 'border-box',
                }}
              />
            </Tooltip>

            {/* Header Profile Indicator */}
            <div
              style={{
                height: 36,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '0 12px',
                borderRadius: 0,
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                boxSizing: 'border-box',
              }}
            >
              <Avatar shape="square" size={20} style={{ backgroundColor: '#383842', borderRadius: 0 }} icon={<UserOutlined style={{ fontSize: 12 }} />} />
              <Text strong style={{ fontSize: 12, color: 'var(--text-primary)', lineHeight: 1 }}>
                System Admin
              </Text>
            </div>
          </div>
        </Header>

        {/* Content Area */}
        <Content
          style={{
            padding: '20px 24px',
            minHeight: 'calc(100vh - 64px)',
            maxWidth: 1440,
            width: '100%',
            margin: '0 auto',
          }}
        >
          {children}
        </Content>
      </Layout>
    </Layout>
  );
}
