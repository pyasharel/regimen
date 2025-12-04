import React from 'react';
import { Pill } from 'lucide-react';

interface ShareCardProps {
  title: string;
  subtitle?: string;
  items: Array<{
    name: string;
    detail: string;
  }>;
}

export const ShareCard = React.forwardRef<HTMLDivElement, ShareCardProps>(
  ({ title, subtitle, items }, ref) => {
    return (
      <div
        ref={ref}
        style={{
          width: '400px',
          padding: '32px',
          background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
          borderRadius: '24px',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          color: 'white',
        }}
      >
        {/* Header */}
        <div style={{ marginBottom: '24px', textAlign: 'center' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 600, margin: 0 }}>{title}</h2>
          {subtitle && (
            <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)', marginTop: '4px' }}>
              {subtitle}
            </p>
          )}
        </div>

        {/* Items */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {items.map((item, index) => (
            <div
              key={index}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '16px',
                background: 'rgba(255,255,255,0.1)',
                borderRadius: '12px',
              }}
            >
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Pill size={20} color="white" />
              </div>
              <div>
                <div style={{ fontWeight: 500, fontSize: '16px' }}>{item.name}</div>
                <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)' }}>
                  {item.detail}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div
          style={{
            marginTop: '24px',
            paddingTop: '16px',
            borderTop: '1px solid rgba(255,255,255,0.1)',
            textAlign: 'center',
          }}
        >
          <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>
            Tracked with Regimen
          </span>
        </div>
      </div>
    );
  }
);

ShareCard.displayName = 'ShareCard';
