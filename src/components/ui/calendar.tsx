import React, { useState } from "react";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, RotateCcw } from "lucide-react";

export interface CustomCalendarProps {
  value?: string | undefined; // YYYY-MM-DD
  onChange?: ((dateStr: string) => void) | undefined;
  minDate?: string | undefined;
  maxDate?: string | undefined;
  className?: string | undefined;
  style?: React.CSSProperties | undefined;
}

const MONTHS_FR = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
];

const DAYS_FR = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

export function Calendar({ value, onChange, minDate, maxDate, style }: CustomCalendarProps) {
  const initialDate = value ? new Date(value) : new Date();
  const [viewDate, setViewDate] = useState<Date>(isNaN(initialDate.getTime()) ? new Date() : initialDate);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const handlePrevMonth = () => {
    setViewDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setViewDate(new Date(year, month + 1, 1));
  };

  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setViewDate(new Date(parseInt(e.target.value, 10), month, 1));
  };

  const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setViewDate(new Date(year, parseInt(e.target.value, 10), 1));
  };

  // Generate days grid
  const firstDayOfMonth = new Date(year, month, 1);
  let startingDayOfWeek = firstDayOfMonth.getDay() - 1; // Monday = 0
  if (startingDayOfWeek === -1) startingDayOfWeek = 6; // Sunday = 6

  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const selectedDateStr = value || "";

  // Year options (1920 to 2035)
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 115 }, (_, i) => currentYear - 100 + i);

  return (
    <div
      style={{
        backgroundColor: "white",
        borderRadius: "16px",
        border: "1px solid #e2e8f0",
        boxShadow: "0 12px 30px -4px rgba(6, 44, 84, 0.12)",
        padding: "16px",
        width: "310px",
        fontFamily: "'Inter', sans-serif",
        userSelect: "none",
        ...style
      }}
    >
      {/* Month & Year Navigation Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
        <button
          type="button"
          onClick={handlePrevMonth}
          style={{ background: "none", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "6px", cursor: "pointer", color: "#062C54", display: "flex", alignItems: "center" }}
        >
          <ChevronLeft size={16} />
        </button>

        <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
          <select
            value={month}
            onChange={handleMonthChange}
            style={{ fontWeight: "700", color: "#062C54", fontSize: "0.88rem", border: "none", background: "#f8fafc", padding: "4px 8px", borderRadius: "6px", cursor: "pointer", outline: "none" }}
          >
            {MONTHS_FR.map((m, idx) => (
              <option key={m} value={idx}>{m}</option>
            ))}
          </select>

          <select
            value={year}
            onChange={handleYearChange}
            style={{ fontWeight: "700", color: "#062C54", fontSize: "0.88rem", border: "none", background: "#f8fafc", padding: "4px 8px", borderRadius: "6px", cursor: "pointer", outline: "none" }}
          >
            {years.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={handleNextMonth}
          style={{ background: "none", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "6px", cursor: "pointer", color: "#062C54", display: "flex", alignItems: "center" }}
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Weekdays Header */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", textAlign: "center", marginBottom: "8px" }}>
        {DAYS_FR.map((day) => (
          <span key={day} style={{ fontSize: "0.75rem", fontWeight: "700", color: "#718096", textTransform: "uppercase" }}>
            {day}
          </span>
        ))}
      </div>

      {/* Days Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "4px" }}>
        {/* Empty cells for padding */}
        {Array.from({ length: startingDayOfWeek }).map((_, i) => (
          <div key={`empty-${i}`} />
        ))}

        {/* Day buttons */}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const dayNum = i + 1;
          const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
          
          const isSelected = selectedDateStr === dateString;
          const isToday = todayStr === dateString;

          const isDisabled = Boolean(
            (minDate && dateString < minDate) || (maxDate && dateString > maxDate)
          );

          return (
            <button
              key={dayNum}
              type="button"
              disabled={isDisabled}
              onClick={() => {
                if (!isDisabled && onChange) onChange(dateString);
              }}
              style={{
                height: "36px",
                width: "36px",
                borderRadius: "10px",
                border: isToday && !isSelected ? "1px solid #0fa29b" : "none",
                backgroundColor: isSelected ? "#0fa29b" : isToday ? "#e6f5f4" : "transparent",
                color: isSelected ? "white" : isToday ? "#0fa29b" : isDisabled ? "#cbd5e1" : "#062C54",
                fontWeight: isSelected || isToday ? "800" : "500",
                fontSize: "0.85rem",
                cursor: isDisabled ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "all 0.15s ease"
              }}
              onMouseEnter={(e) => {
                if (!isSelected && !isDisabled) {
                  e.currentTarget.style.backgroundColor = "#e6f5f4";
                }
              }}
              onMouseLeave={(e) => {
                if (!isSelected && !isDisabled) {
                  e.currentTarget.style.backgroundColor = isToday ? "#e6f5f4" : "transparent";
                }
              }}
            >
              {dayNum}
            </button>
          );
        })}
      </div>

      {/* Quick Footer Shortcuts */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "14px", paddingTop: "10px", borderTop: "1px solid #e2e8f0" }}>
        <button
          type="button"
          onClick={() => {
            if (onChange) onChange(todayStr);
            setViewDate(today);
          }}
          style={{ background: "none", border: "none", color: "#0fa29b", fontSize: "0.8rem", fontWeight: "700", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}
        >
          <CalendarIcon size={14} /> Aujourd'hui
        </button>

        {value && (
          <button
            type="button"
            onClick={() => {
              if (onChange) onChange("");
            }}
            style={{ background: "none", border: "none", color: "#718096", fontSize: "0.8rem", fontWeight: "600", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}
          >
            <RotateCcw size={13} /> Effacer
          </button>
        )}
      </div>
    </div>
  );
}
