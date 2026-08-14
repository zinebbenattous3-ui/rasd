import React, { useState, useEffect, useRef } from "react";
import { ChevronDown, Check, Search, LucideIcon } from "lucide-react";

export interface SelectOption {
  value: string;
  label: string;
  sublabel?: React.ReactNode;
  icon?: LucideIcon;
}

export interface SelectDropdownProps {
  value: string;
  onChange: (val: string) => void;
  options: SelectOption[];
  placeholder?: string;
  icon?: LucideIcon | undefined;
  searchable?: boolean;
  disabled?: boolean;
  style?: React.CSSProperties | undefined;
}

export function SelectDropdown({
  value,
  onChange,
  options,
  placeholder = "Sélectionner...",
  icon: Icon,
  searchable = false,
  disabled = false,
  style
}: SelectDropdownProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [dropUp, setDropUp] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((o) => o.value === value);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (disabled) return;

    if (!open && wrapperRef.current) {
      const rect = wrapperRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      if (spaceBelow < 280 && rect.top > 280) {
        setDropUp(true);
      } else {
        setDropUp(false);
      }
    }
    setOpen(!open);
    setSearchQuery("");
  };

  const filteredOptions = searchable && searchQuery
    ? options.filter((o) =>
        o.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (typeof o.sublabel === 'string' && o.sublabel.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : options;

  return (
    <div
      ref={wrapperRef}
      className="custom-select-dropdown-wrapper"
      style={{ position: "relative", width: "100%", ...style }}
    >
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={handleToggle}
        style={{
          width: "100%",
          padding: "11px 14px",
          borderRadius: "10px",
          border: `1px solid ${selectedOption ? "#0fa29b" : "#e2e8f0"}`,
          backgroundColor: selectedOption ? "#e6f5f4" : "#ffffff",
          color: selectedOption ? "#062C54" : "#718096",
          fontWeight: selectedOption ? "700" : "500",
          fontSize: "0.88rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          cursor: disabled ? "not-allowed" : "pointer",
          boxShadow: open ? "0 0 0 3px rgba(15,162,155,0.15)" : "0 2px 5px rgba(0,0,0,0.02)",
          transition: "all 0.15s ease",
          userSelect: "none"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "9px", overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>
          {Icon && <Icon size={16} color={selectedOption ? "#0fa29b" : "#718096"} />}
          <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </div>

        <ChevronDown
          size={16}
          color="#718096"
          style={{
            transform: open ? "rotate(180deg)" : "none",
            transition: "transform 0.2s",
            flexShrink: 0
          }}
        />
      </button>

      {/* Popover Dropdown */}
      {open && (
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            ...(dropUp ? { bottom: "calc(100% + 6px)" } : { top: "calc(100% + 6px)" }),
            backgroundColor: "white",
            borderRadius: "14px",
            border: "1px solid #e2e8f0",
            boxShadow: "0 12px 30px -4px rgba(6, 44, 84, 0.18)",
            zIndex: 999,
            padding: "8px",
            maxHeight: "280px",
            display: "flex",
            flexDirection: "column",
            gap: "4px"
          }}
        >
          {/* Search Box if Searchable */}
          {searchable && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "8px 12px",
                backgroundColor: "#f8fafc",
                borderRadius: "8px",
                border: "1px solid #e2e8f0",
                marginBottom: "4px"
              }}
            >
              <Search size={14} color="#718096" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher..."
                autoFocus
                onClick={(e) => e.stopPropagation()}
                style={{
                  border: "none",
                  background: "transparent",
                  outline: "none",
                  fontSize: "0.85rem",
                  width: "100%",
                  color: "#062C54"
                }}
              />
            </div>
          )}

          {/* Options List */}
          <div style={{ overflowY: "auto", display: "flex", flexDirection: "column", gap: "2px", maxHeight: "220px" }}>
            {filteredOptions.length === 0 ? (
              <div style={{ padding: "12px", textAlign: "center", color: "#718096", fontSize: "0.85rem" }}>
                Aucun résultat trouvé
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = value === opt.value;
                const OptIcon = opt.icon;

                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      onChange(opt.value);
                      setOpen(false);
                    }}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      borderRadius: "8px",
                      border: "none",
                      backgroundColor: isSelected ? "#e6f5f4" : "transparent",
                      color: isSelected ? "#062C54" : "#475569",
                      fontWeight: isSelected ? "700" : "500",
                      fontSize: "0.88rem",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      cursor: "pointer",
                      textAlign: "left",
                      transition: "all 0.12s ease"
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) e.currentTarget.style.backgroundColor = "#f8fafc";
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) e.currentTarget.style.backgroundColor = "transparent";
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", overflow: "hidden" }}>
                      {OptIcon && <OptIcon size={16} color={isSelected ? "#0fa29b" : "#718096"} />}
                      <div>
                        <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {opt.label}
                        </div>
                        {opt.sublabel && (
                          <div style={{ fontSize: "0.75rem", color: "#718096", fontWeight: "400" }}>
                            {opt.sublabel}
                          </div>
                        )}
                      </div>
                    </div>

                    {isSelected && <Check size={15} color="#0fa29b" strokeWidth={2.5} />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
