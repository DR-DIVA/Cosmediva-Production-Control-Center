import React from 'react';

// Code 128 Pattern Table (Subset B)
const CODE128_PATTERNS = [
  '212222', '222122', '222221', '121223', '121322', '131222', '122213', '122312', '132212', '221213',
  '221312', '231212', '112232', '122132', '122231', '113222', '123122', '123221', '223211', '221132',
  '221231', '213212', '223112', '312131', '311222', '321122', '321221', '312212', '322112', '322211',
  '212123', '212321', '232121', '111323', '131123', '131321', '112313', '132113', '132311', '211313',
  '231113', '231311', '112133', '112331', '132131', '113123', '113321', '133121', '313121', '211331',
  '231131', '213113', '213311', '213131', '311123', '311321', '331121', '312113', '312311', '332111',
  '314111', '221411', '431111', '111224', '111422', '121124', '121421', '141122', '141221', '112214',
  '112412', '122114', '122411', '142112', '142211', '241211', '221114', '413111', '241112', '134111',
  '111242', '121142', '121241', '114212', '124112', '124211', '411212', '421112', '421211', '212141',
  '214121', '412121', '111143', '111341', '131141', '114113', '114311', '411113', '411311', '113141',
  '114131', '311141', '411131', '211412', '211214', '211232', '2331112'
];

export function getCode128Bars(text: string) {
  if (!text) return { totalWidth: 0, rects: [] };

  const cleanText = text.trim();
  const startCode = 104; // Start B
  let checksum = startCode;
  const codes = [startCode];

  for (let i = 0; i < cleanText.length; i++) {
    const code = cleanText.charCodeAt(i) - 32;
    if (code >= 0 && code <= 94) {
      codes.push(code);
      checksum += code * (i + 1);
    }
  }

  codes.push(checksum % 103);
  codes.push(106); // Stop symbol

  let patternStr = '';
  for (const c of codes) {
    if (c >= 0 && c < CODE128_PATTERNS.length) {
      patternStr += CODE128_PATTERNS[c];
    }
  }

  let x = 10; // Left quiet zone
  const rects: { x: number; width: number }[] = [];
  for (let i = 0; i < patternStr.length; i++) {
    const w = parseInt(patternStr[i], 10);
    if (i % 2 === 0) {
      rects.push({ x, width: w });
    }
    x += w;
  }
  x += 10; // Right quiet zone

  return { totalWidth: x, rects };
}

export interface BarcodeProps {
  value: string;
  height?: number;
  width?: number | string;
  className?: string;
  showText?: boolean;
}

export function Code128Barcode({
  value,
  height = 34,
  width = '100%',
  className = '',
  showText = false
}: BarcodeProps) {
  const { totalWidth, rects } = getCode128Bars(value);

  if (!value || rects.length === 0) {
    return null;
  }

  return (
    <div className={`inline-flex flex-col items-center justify-center ${className}`}>
      <svg
        viewBox={`0 0 ${totalWidth} ${height}`}
        style={{ width: typeof width === 'number' ? `${width}px` : width, height: `${height}px` }}
        className="overflow-visible"
        shapeRendering="crispEdges"
      >
        {rects.map((r, i) => (
          <rect
            key={i}
            x={r.x}
            y={0}
            width={r.width}
            height={height}
            fill="#000000"
          />
        ))}
      </svg>
      {showText && (
        <span className="font-mono text-[10px] tracking-wider text-black font-semibold mt-0.5">
          {value}
        </span>
      )}
    </div>
  );
}
