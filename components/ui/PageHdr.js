import { T, imgName, imgFmt, pageNum } from "@/lib/constants";
import Pill from "./Pill";

export default function PageHdr({ idx, titleShort }) {
  const pn = pageNum(idx);
  return <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8, flexWrap: "wrap" }}>
    <span style={{ fontSize: 14, fontWeight: 700, color: T.text, marginRight: 2 }}>{idx + 1}. {titleShort || imgName(idx)}</span>
    <Pill>{imgFmt(idx)}</Pill>
    {pn && <Pill color={T.accent}>{pn}</Pill>}
  </div>;
}
