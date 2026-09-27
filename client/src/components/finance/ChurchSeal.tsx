import React, { useId } from "react";

interface ChurchSealProps {
  churchName: string;
  /** Word in the centre band, e.g. "ได้รับแล้ว" or "อนุมัติจ่าย". */
  label: string;
  /** Date line under the band. */
  date: string;
  className?: string;
}

/**
 * Round "rubber stamp" drawn in SVG: the church name runs around the ring,
 * a band across the middle carries the label, and the date sits below it.
 * It is a visual mark of the church on a printed document, not a signature
 * or a proof of authenticity.
 */
export const ChurchSeal: React.FC<ChurchSealProps> = ({
  churchName,
  label,
  date,
  className = "",
}) => {
  const pathId = useId();
  // Repeat the name until it wraps the ring. Glyphs past the end of the
  // path are not drawn, so an over-long string is safe; stretching a short
  // name with textLength spread its letters apart instead.
  const repeats = Math.max(2, Math.ceil(44 / (churchName.length + 3)));
  const ringText = Array.from({ length: repeats }, () => churchName).join(
    " • "
  );
  return (
    <svg
      viewBox="0 0 160 160"
      role="img"
      aria-label={`ตราประทับ ${churchName} ${label} ${date}`}
      className={`text-[#C94F16] [print-color-adjust:exact] ${className}`}
    >
      <defs>
        <path
          id={pathId}
          d="M 80,80 m -58,0 a 58,58 0 1,1 116,0 a 58,58 0 1,1 -116,0"
        />
      </defs>
      <g fill="none" stroke="currentColor">
        <circle cx="80" cy="80" r="76" strokeWidth="3" />
        <circle cx="80" cy="80" r="69" strokeWidth="1" />
        <circle cx="80" cy="80" r="44" strokeWidth="1" />
      </g>
      <text
        fill="currentColor"
        fontSize="11"
        fontWeight="700"
        letterSpacing="1"
      >
        <textPath href={`#${pathId}`} startOffset="0">
          {ringText}
        </textPath>
      </text>
      <rect x="18" y="66" width="124" height="28" rx="4" fill="currentColor" />
      <text
        x="80"
        y="85"
        textAnchor="middle"
        fill="#fff"
        fontSize="15"
        fontWeight="700"
      >
        {label}
      </text>
      <text
        x="80"
        y="112"
        textAnchor="middle"
        fill="currentColor"
        fontSize="10"
        fontWeight="600"
      >
        {date}
      </text>
      <text x="80" y="56" textAnchor="middle" fill="currentColor" fontSize="14">
        ✝
      </text>
    </svg>
  );
};
