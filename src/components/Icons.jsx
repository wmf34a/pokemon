// 구조적 아이콘(내비게이션/버튼/상태 표시)용 손으로 그린 SVG 세트.
// 이모지는 폰트/플랫폼마다 렌더링이 달라 디자인 토큰으로 제어할 수 없으므로 사용하지 않는다.

function Base({ size = 20, strokeWidth = 1.75, children, ...rest }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {children}
    </svg>
  );
}

export function HomeIcon(props) {
  return (
    <Base {...props}>
      <path d="M4 11.5 12 4l8 7.5" />
      <path d="M6 10v9a1 1 0 0 0 1 1h4v-6h2v6h4a1 1 0 0 0 1-1v-9" />
    </Base>
  );
}

export function BookIcon(props) {
  return (
    <Base {...props}>
      <path d="M5 4.5c1.6-.7 3.6-1 7-1v15c-3.4 0-5.4.3-7 1z" />
      <path d="M19 4.5c-1.6-.7-3.6-1-7-1v15c3.4 0 5.4.3 7 1z" />
    </Base>
  );
}

export function GamepadIcon(props) {
  return (
    <Base {...props}>
      <rect x="2.5" y="8" width="19" height="10" rx="5" />
      <path d="M7 11v4M5 13h4" />
      <circle cx="15.5" cy="12" r=".9" fill="currentColor" stroke="none" />
      <circle cx="18" cy="14.5" r=".9" fill="currentColor" stroke="none" />
    </Base>
  );
}

export function SearchIcon(props) {
  return (
    <Base {...props}>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="m20 20-4.8-4.8" />
    </Base>
  );
}

export function XIcon(props) {
  return (
    <Base {...props}>
      <path d="M5 5l14 14M19 5 5 19" />
    </Base>
  );
}

export function ChevronLeftIcon(props) {
  return (
    <Base {...props}>
      <path d="M15 5l-7 7 7 7" />
    </Base>
  );
}

export function LightbulbIcon(props) {
  return (
    <Base {...props}>
      <path d="M9 18h6M10 21h4" />
      <path d="M12 3a6 6 0 0 0-3.5 10.9c.6.45 1 1.2 1 2.1h5c0-.9.4-1.65 1-2.1A6 6 0 0 0 12 3Z" />
    </Base>
  );
}

export function GlassesIcon(props) {
  return (
    <Base {...props}>
      <circle cx="6" cy="14" r="3.2" />
      <circle cx="18" cy="14" r="3.2" />
      <path d="M9.2 14h5.6M2.5 12 5 7h1.5M21.5 12 19 7h-1.5" />
    </Base>
  );
}

export function VolumeIcon(props) {
  return (
    <Base {...props}>
      <path d="M4 10v4h3.5L12 17.5v-11L7.5 10z" />
      <path d="M16.2 9.2a4.2 4.2 0 0 1 0 5.6M18.8 6.8a8 8 0 0 1 0 10.4" />
    </Base>
  );
}

export function RepeatIcon(props) {
  return (
    <Base {...props}>
      <path d="M4 12a7 7 0 0 1 7-7h7M18 5l-2.5-2.5M18 5l-2.5 2.5" />
      <path d="M20 12a7 7 0 0 1-7 7H6M6 19l2.5 2.5M6 19l2.5-2.5" />
    </Base>
  );
}

export function PuzzleIcon(props) {
  return (
    <Base {...props}>
      <path d="M9 4.5h3a1.5 1.5 0 0 1 0 3 1.7 1.7 0 0 0 0 3.4h3.5V14H12a1.7 1.7 0 0 0 0 3.4 1.5 1.5 0 0 1 0 3H9v-4a1.7 1.7 0 0 0-3.4 0v.6H4v-3.5a1.7 1.7 0 0 0 0-3.4H4V6.5h1.6A1.7 1.7 0 0 0 9 6.5z" />
    </Base>
  );
}

export function SwordsIcon(props) {
  return (
    <Base {...props}>
      <path d="M5 4l7 7M19 4l-7 7M5 20l6-6M19 20l-6-6" />
      <path d="M4 4h3v3M20 4h-3v3M5 17v3h3M19 17v3h-3" />
    </Base>
  );
}

export function ShuffleIcon(props) {
  return (
    <Base {...props}>
      <path d="M4 6h3.5L16 18h4M17.5 6H20M14 6h2M4 18h3.5L11 12" />
      <path d="M17 3.5 20 6l-3 2.5M17 15.5l3 2.5-3 2.5" />
    </Base>
  );
}

export function HashIcon(props) {
  return (
    <Base {...props}>
      <path d="M9 3 7 21M17 3l-2 18M4 8.5h16M3.5 15.5h16" />
    </Base>
  );
}

export function PlayIcon(props) {
  return (
    <Base {...props}>
      <path d="M7 4.5v15l13-7.5z" fill="currentColor" stroke="none" />
    </Base>
  );
}

export function PauseIcon(props) {
  return (
    <Base {...props}>
      <rect x="6.5" y="4.5" width="4" height="15" rx="1" fill="currentColor" stroke="none" />
      <rect x="13.5" y="4.5" width="4" height="15" rx="1" fill="currentColor" stroke="none" />
    </Base>
  );
}

export function CheckIcon(props) {
  return (
    <Base {...props}>
      <path d="M4.5 12.5 9.5 17.5 19.5 6.5" />
    </Base>
  );
}

export function XCircleIcon(props) {
  return (
    <Base {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="m9 9 6 6M15 9l-6 6" />
    </Base>
  );
}

export function PaletteIcon(props) {
  return (
    <Base {...props}>
      <path d="M12 3.5a8.5 8 0 1 0 0 16c1.1 0 1.8-.9 1.8-1.8 0-.5-.2-.9-.5-1.2-.3-.4-.5-.8-.5-1.3 0-.9.7-1.6 1.6-1.6H16a4.5 4 0 0 0 4.5-4C20.5 6 16.7 3.5 12 3.5Z" />
      <circle cx="8" cy="11" r="1" fill="currentColor" stroke="none" />
      <circle cx="11" cy="8" r="1" fill="currentColor" stroke="none" />
      <circle cx="15" cy="8.5" r="1" fill="currentColor" stroke="none" />
    </Base>
  );
}

export function GlobeIcon(props) {
  return (
    <Base {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M3.5 12h17M12 3.5c2.2 2.3 3.3 5.1 3.3 8.5S14.2 18.2 12 20.5C9.8 18.2 8.7 15.4 8.7 12S9.8 5.8 12 3.5Z" />
    </Base>
  );
}

export function TrophyIcon(props) {
  return (
    <Base {...props}>
      <path d="M8 4.5h8v5a4 4 0 0 1-8 0z" />
      <path d="M8 5.5H5.5a2.5 2.5 0 0 0 2.5 3.5M16 5.5h2.5a2.5 2.5 0 0 1-2.5 3.5" />
      <path d="M12 13.5v3M9 20h6M9.5 20c-.3-1.2-.3-2 0-3h5c.3 1 .3 1.8 0 3" />
    </Base>
  );
}

export function SparklesIcon(props) {
  return (
    <Base {...props}>
      <path d="M11 3.5 12.3 8l4.2 1.3-4.2 1.3L11 15l-1.3-4.4L5.5 9.3l4.2-1.3z" />
      <path d="M17.5 15 18.2 17l2 .8-2 .8-.7 2-.7-2-2-.8 2-.8z" />
    </Base>
  );
}
