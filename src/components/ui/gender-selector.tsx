import React from "react";
import { Check } from "lucide-react";

export interface GenderSelectorProps {
  value: string; // 'M' | 'F'
  onChange: (value: string) => void;
  disabled?: boolean;
  style?: React.CSSProperties;
}

export function GenderSelector({ value, onChange, disabled = false, style }: GenderSelectorProps) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', ...style }}>
      {/* Homme Option */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange('M')}
        style={{
          padding: '12px 16px',
          borderRadius: '12px',
          border: `2px solid ${value === 'M' ? '#0284C7' : '#E2E8F0'}`,
          backgroundColor: value === 'M' ? '#F0F9FF' : '#FFFFFF',
          color: value === 'M' ? '#0369A1' : '#475569',
          cursor: disabled ? 'not-allowed' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          boxShadow: value === 'M' ? '0 4px 12px rgba(2, 132, 199, 0.15)' : 'none',
          position: 'relative',
          userSelect: 'none'
        }}
        onMouseEnter={(e) => {
          if (value !== 'M' && !disabled) {
            e.currentTarget.style.borderColor = '#BAE6FD';
            e.currentTarget.style.backgroundColor = '#F8FAFC';
          }
        }}
        onMouseLeave={(e) => {
          if (value !== 'M' && !disabled) {
            e.currentTarget.style.borderColor = '#E2E8F0';
            e.currentTarget.style.backgroundColor = '#FFFFFF';
          }
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              backgroundColor: value === 'M' ? '#E0F2FE' : '#F1F5F9',
              color: value === 'M' ? '#0284C7' : '#64748B',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.2rem',
              fontWeight: '800'
            }}
          >
            ♂
          </div>
          <span style={{ fontWeight: value === 'M' ? '800' : '600', fontSize: '0.92rem' }}>
            Homme
          </span>
        </div>

        {value === 'M' && (
          <div
            style={{
              width: '20px',
              height: '20px',
              borderRadius: '999px',
              backgroundColor: '#0284C7',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Check size={12} strokeWidth={3} />
          </div>
        )}
      </button>

      {/* Femme Option */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange('F')}
        style={{
          padding: '12px 16px',
          borderRadius: '12px',
          border: `2px solid ${value === 'F' ? '#DB2777' : '#E2E8F0'}`,
          backgroundColor: value === 'F' ? '#FDF2F8' : '#FFFFFF',
          color: value === 'F' ? '#BE185D' : '#475569',
          cursor: disabled ? 'not-allowed' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          boxShadow: value === 'F' ? '0 4px 12px rgba(219, 39, 119, 0.15)' : 'none',
          position: 'relative',
          userSelect: 'none'
        }}
        onMouseEnter={(e) => {
          if (value !== 'F' && !disabled) {
            e.currentTarget.style.borderColor = '#FBCFE8';
            e.currentTarget.style.backgroundColor = '#F8FAFC';
          }
        }}
        onMouseLeave={(e) => {
          if (value !== 'F' && !disabled) {
            e.currentTarget.style.borderColor = '#E2E8F0';
            e.currentTarget.style.backgroundColor = '#FFFFFF';
          }
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              backgroundColor: value === 'F' ? '#FCE7F3' : '#F1F5F9',
              color: value === 'F' ? '#DB2777' : '#64748B',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.2rem',
              fontWeight: '800'
            }}
          >
            ♀
          </div>
          <span style={{ fontWeight: value === 'F' ? '800' : '600', fontSize: '0.92rem' }}>
            Femme
          </span>
        </div>

        {value === 'F' && (
          <div
            style={{
              width: '20px',
              height: '20px',
              borderRadius: '999px',
              backgroundColor: '#DB2777',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Check size={12} strokeWidth={3} />
          </div>
        )}
      </button>
    </div>
  );
}
