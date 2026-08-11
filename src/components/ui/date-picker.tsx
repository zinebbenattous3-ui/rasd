import React, { useState, useEffect, useRef } from "react";
import { Calendar as CalendarIcon, ChevronDown, X } from "lucide-react";
import { Calendar } from "./calendar";

export interface DatePickerProps {
  value?: string | undefined; // YYYY-MM-DD
  onChange: (dateStr: string) => void;
  placeholder?: string | undefined;
  minDate?: string | undefined;
  maxDate?: string | undefined;
  required?: boolean | undefined;
  disabled?: boolean | undefined;
  style?: React.CSSProperties | undefined;
}

export function DatePicker({
  value,
  onChange,
  placeholder = "Choisir une date...",
  minDate,
  maxDate,
  disabled = false,
  style
}: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const [dropUp, setDropUp] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (disabled) return;

    if (!open && wrapperRef.current) {
      const rect = wrapperRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      // If less than 350px below and enough space above, drop up
      if (spaceBelow < 350 && rect.top > 350) {
        setDropUp(true);
      } else {
        setDropUp(false);
      }
    }
    setOpen(!open);
  };

  const formatDisplayDate = (dateStr?: string) => {
    if (!dateStr) return "";
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const year = parseInt(parts[0] ?? "2026", 10);
        const month = parseInt(parts[1] ?? "1", 10) - 1;
        const day = parseInt(parts[2] ?? "1", 10);
        const d = new Date(year, month, day);
        return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
      }
    } catch (e) {
      return dateStr;
    }
    return dateStr;
  };

  return (
    <div
      ref={wrapperRef}
      className="shared-date-picker-wrapper"
      style={{ position: 'relative', width: '100%', ...style }}
    >
      <button
        type="button"
        disabled={disabled}
        onClick={handleToggle}
        style={{
          width: '100%',
          padding: '10px 14px',
          borderRadius: '10px',
          border: `1px solid ${value ? '#0fa29b' : '#e2e8f0'}`,
          backgroundColor: value ? '#e6f5f4' : 'white',
          color: value ? '#062C54' : '#718096',
          fontWeight: value ? '700' : '500',
          fontSize: '0.88rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: disabled ? 'not-allowed' : 'pointer',
          boxShadow: open ? '0 0 0 3px rgba(15,162,155,0.15)' : 'none',
          transition: 'all 0.15s ease'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '9px', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
          <CalendarIcon size={16} color={value ? '#0fa29b' : '#718096'} />
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{value ? formatDisplayDate(value) : placeholder}</span>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
          {value && (
            <X
              size={14}
              color="#718096"
              style={{ cursor: 'pointer' }}
              onClick={(e) => {
                e.stopPropagation();
                onChange("");
              }}
            />
          )}
          <ChevronDown size={16} color="#718096" style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
        </div>
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            left: 0,
            ...(dropUp
              ? { bottom: 'calc(100% + 6px)' }
              : { top: 'calc(100% + 6px)' }),
            zIndex: 999,
            animation: 'fadeIn 0.15s ease-out'
          }}
        >
          <Calendar
            value={value}
            minDate={minDate}
            maxDate={maxDate}
            onChange={(dateStr) => {
              onChange(dateStr);
              setOpen(false);
            }}
          />
        </div>
      )}
    </div>
  );
}
