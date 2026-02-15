import { T } from "@/lib/constants";

export default function KaguLogo({ size = 42 }) {
  return <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
    <ellipse cx="48" cy="60" rx="20" ry="16" fill={T.accent} opacity=".85" />
    <circle cx="54" cy="36" r="11" fill={T.accent} />
    <circle cx="58" cy="34" r="3.5" fill="#1A1A1F" /><circle cx="59" cy="33.2" r="1.2" fill="#fff" />
    <path d="M65 35L82 31L65 38Z" fill="#FBBF24" />
    <path d="M47 27Q40 6 46 2" stroke="#9D90FF" strokeWidth="2.2" fill="none" strokeLinecap="round" />
    <path d="M50 26Q48 4 56 0" stroke={T.accent} strokeWidth="2.5" fill="none" strokeLinecap="round" />
    <path d="M53 27Q56 8 64 6" stroke="#7C6DF7" strokeWidth="2" fill="none" strokeLinecap="round" />
    <path d="M55 29Q62 14 68 14" stroke="#B8ADFF" strokeWidth="1.5" fill="none" strokeLinecap="round" />
    <path d="M28 56Q14 46 10 34" stroke="#9D90FF" strokeWidth="2.2" fill="none" strokeLinecap="round" />
    <path d="M28 60Q12 52 6 42" stroke={T.accent} strokeWidth="2" fill="none" strokeLinecap="round" />
    <line x1="40" y1="74" x2="36" y2="90" stroke={T.textSoft} strokeWidth="2.5" strokeLinecap="round" />
    <line x1="54" y1="74" x2="58" y2="90" stroke={T.textSoft} strokeWidth="2.5" strokeLinecap="round" />
    <path d="M30 90L36 90L40 87" stroke={T.textSoft} strokeWidth="2" fill="none" strokeLinecap="round" />
    <path d="M54 87L58 90L64 90" stroke={T.textSoft} strokeWidth="2" fill="none" strokeLinecap="round" />
  </svg>;
}
