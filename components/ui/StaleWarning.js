import { T } from "@/lib/constants";

export default function StaleWarning({ msg }) {
  return <div style={{ background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.25)", borderRadius: 10, padding: "10px 14px", margin: "0 0 16px", fontSize: 13, color: T.amber }}>⚠ {msg}</div>;
}
