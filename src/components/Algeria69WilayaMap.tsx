import React, { useState } from 'react';
import { getWilayaByCode, getWilayaByName, Wilaya } from '@/lib/wilayas';
import wilayaPathsData from '@/lib/algeria69WilayaPaths.json';

export interface WilayaPathItem {
  code: string;
  name: string;
  nameAr: string;
  d: string;
}

export interface Algeria69WilayaMapProps {
  selectedWilaya?: string;
  onWilayaSelect?: (wilaya: Wilaya) => void;
  className?: string;
  style?: React.CSSProperties;
  fillColor?: string;
  strokeColor?: string;
  hoverColor?: string;
  selectedColor?: string;
  showTooltip?: boolean;
}

export const WILAYA_MAP_PATHS: WilayaPathItem[] = wilayaPathsData as WilayaPathItem[];

export function Algeria69WilayaMap({
  selectedWilaya,
  onWilayaSelect,
  className,
  style,
  fillColor = "rgba(6, 44, 84, 0.75)",
  strokeColor = "rgba(255, 255, 255, 0.35)",
  hoverColor = "#0fa29b",
  selectedColor = "#38BDF8",
  showTooltip = true,
}: Algeria69WilayaMapProps) {
  const [hoveredWilaya, setHoveredWilaya] = useState<Wilaya | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const activeWilayaObj = selectedWilaya 
    ? (getWilayaByCode(selectedWilaya) || getWilayaByName(selectedWilaya))
    : undefined;

  const handleMouseMove = (e: React.MouseEvent<SVGPathElement>, item: WilayaPathItem) => {
    const rect = e.currentTarget.ownerSVGElement?.getBoundingClientRect();
    if (rect) {
      setTooltipPos({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    }
    const wObj = getWilayaByCode(item.code);
    if (wObj) setHoveredWilaya(wObj);
  };

  const handleMouseLeave = () => {
    setHoveredWilaya(null);
  };

  const handleClick = (item: WilayaPathItem) => {
    const wObj = getWilayaByCode(item.code);
    if (wObj && onWilayaSelect) {
      onWilayaSelect(wObj);
    }
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: '380px', display: 'flex', alignItems: 'center', justifyContent: 'center', ...style }} className={className}>
      <svg
        id="algeria-map-69-wilaya"
        viewBox="0 0 9968 9644.45"
        style={{
          width: '100%',
          height: '100%',
          maxHeight: '100%',
          filter: 'drop-shadow(0 10px 25px rgba(6, 44, 84, 0.25))',
        }}
      >
        <g id="algeria-map-69-wilaya-group" transform="translate(-862.86 -943.66)">
          {WILAYA_MAP_PATHS.map((item) => {
            const isSelected = activeWilayaObj && activeWilayaObj.code === item.code;
            const isHovered = hoveredWilaya && hoveredWilaya.code === item.code;

            let fill = fillColor;
            if (isSelected) fill = selectedColor;
            else if (isHovered) fill = hoverColor;

            return (
              <path
                key={item.code}
                id={item.code}
                data-name={item.name}
                data-name-latin={item.name}
                data-name-ar={item.nameAr}
                d={item.d}
                style={{
                  fill: fill,
                  stroke: isSelected ? '#FFFFFF' : strokeColor,
                  strokeWidth: isSelected ? 12 : 4,
                  cursor: 'pointer',
                  transition: 'fill 0.2s ease, stroke 0.2s ease',
                }}
                onMouseMove={(e) => handleMouseMove(e, item)}
                onMouseLeave={handleMouseLeave}
                onClick={() => handleClick(item)}
              />
            );
          })}
        </g>
      </svg>

      {/* Floating Glassmorphic Tooltip */}
      {showTooltip && hoveredWilaya && (
        <div
          style={{
            position: 'absolute',
            left: `${tooltipPos.x + 15}px`,
            top: `${tooltipPos.y - 45}px`,
            backgroundColor: 'rgba(6, 44, 84, 0.95)',
            color: 'white',
            padding: '8px 14px',
            borderRadius: '12px',
            border: '1px solid rgba(15, 162, 155, 0.4)',
            boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
            backdropFilter: 'blur(8px)',
            pointerEvents: 'none',
            zIndex: 100,
            display: 'flex',
            flexDirection: 'column',
            gap: '2px',
            fontSize: '0.85rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ backgroundColor: '#0fa29b', color: 'white', fontWeight: '800', fontSize: '0.75rem', padding: '2px 6px', borderRadius: '4px' }}>
              Wilaya {hoveredWilaya.code}
            </span>
            <span style={{ fontWeight: '700', color: 'white' }}>{hoveredWilaya.name}</span>
          </div>
          <div style={{ fontSize: '0.8rem', color: '#38BDF8', textAlign: 'right', fontWeight: '600', fontFamily: 'system-ui, sans-serif' }}>
            {hoveredWilaya.nameAr}
          </div>
        </div>
      )}
    </div>
  );
}
