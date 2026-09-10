'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Card, 
  Form, 
  Input, 
  Button, 
  Alert, 
  Typography, 
  Space, 
  Tag, 
  Tooltip 
} from 'antd';
import { 
  MailOutlined, 
  LockOutlined, 
  LoginOutlined, 
  KeyOutlined, 
  SunOutlined, 
  MoonOutlined 
} from '@ant-design/icons';
import { api } from '@/lib/api';
import { useTheme } from '@/theme/ThemeContext';

const { Title, Text } = Typography;

export default function LoginPage() {
  const router = useRouter();
  const { isDark, toggleTheme } = useTheme();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onFinish = async (values: any) => {
    setLoading(true);
    setError(null);
    try {
      await api.login(values.email, values.password);
      router.push('/');
    } catch (err: any) {
      setError(err.message || 'Login failed. Ensure backend server is active.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        background: 'var(--bg-primary)',
        position: 'relative',
      }}
    >
      {/* Theme toggle in top right */}
      <div style={{ position: 'absolute', top: 24, right: 24 }}>
        <Tooltip title={`Switch to ${isDark ? 'Light' : 'Dark'} Mode`}>
          <Button
            icon={isDark ? <SunOutlined style={{ color: '#f59e0b' }} /> : <MoonOutlined style={{ color: '#4f46e5' }} />}
            onClick={toggleTheme}
            style={{ borderRadius: 0 }}
          />
        </Tooltip>
      </div>

      <Card
        bordered={false}
        style={{
          width: '100%',
          maxWidth: 440,
          borderRadius: 0,
          boxShadow: isDark ? '0 8px 32px rgba(0,0,0,0.5)' : '0 8px 32px rgba(0,0,0,0.06)',
          border: `1px solid var(--border-color)`,
          background: 'var(--bg-card)',
          padding: '12px 8px',
        }}
      >
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: 8 }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 0,
                background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                fontWeight: 800,
                fontSize: 20,
                margin: '0 auto 16px',
                boxShadow: '0 6px 18px rgba(79, 70, 229, 0.4)',
              }}
            >
              RI
            </div>
            <Title level={3} style={{ margin: 0, color: 'var(--text-primary)' }}>
              Sign In to Record CRM
            </Title>
            <Text type="secondary" style={{ fontSize: 13 }}>
              Enterprise data ingestion pipeline & audit control center
            </Text>
          </div>

          {error && (
            <Alert
              message={error}
              type="error"
              showIcon
              closable
              style={{ borderRadius: 0 }}
              onClose={() => setError(null)}
            />
          )}

          {/* Form */}
          <Form
            layout="vertical"
            initialValues={{
              email: 'admin@assessment.local',
              password: 'Admin123!',
            }}
            onFinish={onFinish}
            size="large"
          >
            <Form.Item
              name="email"
              label={<span style={{ fontWeight: 600, fontSize: 13 }}>Email Address</span>}
              rules={[{ required: true, message: 'Please enter your email' }, { type: 'email' }]}
            >
              <Input
                prefix={<MailOutlined style={{ color: 'var(--text-muted)' }} />}
                placeholder="admin@assessment.local"
                style={{ borderRadius: 0 }}
              />
            </Form.Item>

            <Form.Item
              name="password"
              label={<span style={{ fontWeight: 600, fontSize: 13 }}>Password</span>}
              rules={[{ required: true, message: 'Please enter your password' }]}
            >
              <Input.Password
                prefix={<LockOutlined style={{ color: 'var(--text-muted)' }} />}
                placeholder="••••••••"
                style={{ borderRadius: 0 }}
              />
            </Form.Item>

            {/* Pre-seeded Credentials Card */}
            <div
              style={{
                padding: '12px 14px',
                borderRadius: 0,
                background: isDark ? 'rgba(79, 70, 229, 0.1)' : '#f5f3ff',
                border: '1px solid rgba(79, 70, 229, 0.25)',
                marginBottom: 24,
                fontSize: 12,
              }}
            >
              <Space align="start">
                <KeyOutlined style={{ color: '#818cf8', fontSize: 14, marginTop: 2 }} />
                <div>
                  <Text strong style={{ color: 'var(--text-primary)', display: 'block' }}>
                    Pre-seeded Admin Account:
                  </Text>
                  <Text style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--text-secondary)' }}>
                    admin@assessment.local / Admin123!
                  </Text>
                </div>
              </Space>
            </div>

            <Form.Item style={{ marginBottom: 0 }}>
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                block
                icon={<LoginOutlined />}
                style={{
                  height: 44,
                  fontWeight: 600,
                  fontSize: 15,
                  boxShadow: '0 4px 14px rgba(79, 70, 229, 0.35)',
                }}
              >
                Sign In to CRM
              </Button>
            </Form.Item>
          </Form>
        </Space>
      </Card>
    </div>
  );
}
