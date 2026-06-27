export function JobzLogo({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 110 88"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Jobz"
      role="img"
    >
      {/* Handle */}
      <path
        d="M 37 27 L 37 14 Q 37 6 55 6 Q 73 6 73 14 L 73 27"
        fill="none"
        stroke="#fbbf24"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Body */}
      <rect
        x="5"
        y="25"
        width="100"
        height="58"
        rx="7"
        fill="#111111"
        stroke="#fbbf24"
        strokeWidth="3.5"
      />
      {/* Jobz text — centered in body */}
      <text
        x="55"
        y="55"
        textAnchor="middle"
        dominantBaseline="middle"
        fontFamily="DM Sans, -apple-system, sans-serif"
        fontWeight="700"
        fontSize="36"
        fill="#fbbf24"
        letterSpacing="-1"
      >
        Jobz
      </text>
    </svg>
  );
}
