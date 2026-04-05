interface HalfCircleGaugeProps {
  value: number; // percentage 0-100+
  color: string; // e.g. "#3B82F6"
  trackColor?: string;
  size?: number; // svg width in px
}

const HalfCircleGauge = ({ value, color, trackColor = "#E5E7EB", size = 120 }: HalfCircleGaugeProps) => {
  const clampedValue = Math.min(Math.max(value, 0), 100);
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = Math.PI * radius; // half circle
  const offset = circumference - (clampedValue / 100) * circumference;

  return (
    <svg width={size} height={size / 2 + strokeWidth / 2} viewBox={`0 0 ${size} ${size / 2 + strokeWidth / 2}`}>
      {/* Track */}
      <path
        d={`M ${strokeWidth / 2} ${size / 2} A ${radius} ${radius} 0 0 1 ${size - strokeWidth / 2} ${size / 2}`}
        fill="none"
        stroke={trackColor}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
      {/* Fill */}
      <path
        d={`M ${strokeWidth / 2} ${size / 2} A ${radius} ${radius} 0 0 1 ${size - strokeWidth / 2} ${size / 2}`}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        style={{ transition: "stroke-dashoffset 0.6s ease" }}
      />
    </svg>
  );
};

export default HalfCircleGauge;
