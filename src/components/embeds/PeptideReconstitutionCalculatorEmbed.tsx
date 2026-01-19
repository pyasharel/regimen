import { useMemo, useState } from "react";

const parsePositive = (s: string): number | null => {
  if (!s) return null;
  const n = Number(s);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
};

const formatSmart = (n: number, maxDecimals: number) => {
  const fixed = n.toFixed(maxDecimals);
  return fixed.replace(/\.0+$/, "").replace(/(\.\d*[1-9])0+$/, "$1");
};

const PRESET_VIAL = [5, 10, 15, 20];
const PRESET_BAC = [1, 2, 3];

const CopyIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
  </svg>
);

const CheckIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);

export function PeptideReconstitutionCalculatorEmbed() {
  const [vialMg, setVialMg] = useState("");
  const [bacMl, setBacMl] = useState("");
  const [doseMcg, setDoseMcg] = useState("");
  const [copied, setCopied] = useState(false);
  const [showFaq, setShowFaq] = useState(false);

  const result = useMemo(() => {
    const vial = parsePositive(vialMg);
    const bac = parsePositive(bacMl);
    const dose = parsePositive(doseMcg);
    if (!vial || !bac || !dose) return null;
    const concentrationMcgPerMl = (vial * 1000) / bac;
    const mlToDraw = dose / concentrationMcgPerMl;
    const unitsToDraw = mlToDraw * 100;
    if (!Number.isFinite(unitsToDraw) || unitsToDraw <= 0) return null;
    return { units: unitsToDraw, ml: mlToDraw, concentrationMcgPerMl };
  }, [vialMg, bacMl, doseMcg]);

  const copy = async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(`${formatSmart(result.units, 1)} units`);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch { /* ignore */ }
  };

  const QuickButton = ({ value, current, onClick, unit }: { value: number; current: string; onClick: () => void; unit: string }) => (
    <button type="button" onClick={onClick} style={{ padding: "8px 16px", borderRadius: "8px", fontSize: "14px", fontWeight: 500, border: "none", cursor: "pointer", backgroundColor: current === String(value) ? "#f97316" : "#f3f4f6", color: current === String(value) ? "#fff" : "#374151", boxShadow: current === String(value) ? "0 4px 6px -1px rgba(249,115,22,0.3)" : "none" }}>{value}{unit}</button>
  );

  return (
    <div style={{ width: "100%", maxWidth: "672px", margin: "0 auto" }}>
      <div style={{ backgroundColor: "#fff", borderRadius: "16px", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)", border: "1px solid #f3f4f6", overflow: "hidden" }}>
        <div style={{ background: "linear-gradient(to right, #f97316, #ea580c)", padding: "20px 24px" }}>
          <h2 style={{ fontSize: "24px", fontWeight: "bold", color: "#fff", margin: 0 }}>Peptide Reconstitution Calculator</h2>
          <p style={{ color: "#fed7aa", marginTop: "4px", fontSize: "14px" }}>Calculate exactly how many units to draw for your peptide dose</p>
        </div>
        <div style={{ padding: "16px 24px", backgroundColor: "#fff7ed", borderBottom: "1px solid #fed7aa" }}>
          <h3 style={{ fontWeight: 600, color: "#1f2937", marginBottom: "12px", display: "flex", alignItems: "center", gap: "8px", fontSize: "14px" }}>
            <span style={{ width: "24px", height: "24px", borderRadius: "50%", backgroundColor: "#f97316", color: "#fff", fontSize: "12px", display: "flex", alignItems: "center", justifyContent: "center" }}>?</span>How to Use
          </h3>
          <ol style={{ fontSize: "14px", color: "#4b5563", marginLeft: "32px", lineHeight: 1.8 }}>
            <li><span style={{ fontWeight: 500, color: "#ea580c" }}>Step 1:</span> Enter your vial size (mg)</li>
            <li><span style={{ fontWeight: 500, color: "#ea580c" }}>Step 2:</span> Enter BAC water added (mL)</li>
            <li><span style={{ fontWeight: 500, color: "#ea580c" }}>Step 3:</span> Enter desired dose (mcg)</li>
            <li><span style={{ fontWeight: 500, color: "#ea580c" }}>Step 4:</span> Read units to draw</li>
          </ol>
        </div>
        <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "24px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <label style={{ fontSize: "14px", fontWeight: 600, color: "#374151" }}>Vial Size (mg)</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              {PRESET_VIAL.map((v) => <QuickButton key={v} value={v} current={vialMg} onClick={() => setVialMg(String(v))} unit="mg" />)}
              <input type="number" min={0} placeholder="Other" value={PRESET_VIAL.includes(Number(vialMg)) ? "" : vialMg} onChange={(e) => setVialMg(e.target.value)} style={{ width: "96px", padding: "8px 12px", borderRadius: "8px", border: "1px solid #d1d5db", fontSize: "14px" }} />
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <label style={{ fontSize: "14px", fontWeight: 600, color: "#374151" }}>BAC Water (mL)</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              {PRESET_BAC.map((b) => <QuickButton key={b} value={b} current={bacMl} onClick={() => setBacMl(String(b))} unit="mL" />)}
              <input type="number" min={0} placeholder="Other" value={PRESET_BAC.includes(Number(bacMl)) ? "" : bacMl} onChange={(e) => setBacMl(e.target.value)} style={{ width: "96px", padding: "8px 12px", borderRadius: "8px", border: "1px solid #d1d5db", fontSize: "14px" }} />
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <label style={{ fontSize: "14px", fontWeight: 600, color: "#374151" }}>Desired Dose (mcg)</label>
            <input type="number" min={0} placeholder="e.g. 250" value={doseMcg} onChange={(e) => setDoseMcg(e.target.value)} style={{ width: "100%", padding: "12px 16px", borderRadius: "8px", border: "1px solid #d1d5db", fontSize: "16px" }} />
          </div>
          <div style={{ borderRadius: "12px", padding: "20px", backgroundColor: result ? "#f0fdf4" : "#f9fafb", border: result ? "2px solid #bbf7d0" : "1px solid #e5e7eb" }}>
            <p style={{ fontSize: "14px", fontWeight: 500, color: "#6b7280", marginBottom: "8px" }}>Your Result</p>
            {!result ? <p style={{ color: "#9ca3af" }}>Fill in all fields above</p> : (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
                <div>
                  <p style={{ fontSize: "14px", color: "#6b7280" }}>Draw:</p>
                  <p style={{ fontSize: "36px", fontWeight: "bold", color: "#16a34a" }}>{formatSmart(result.units, 1)} units</p>
                  <p style={{ fontSize: "14px", color: "#6b7280" }}>({formatSmart(result.ml, 3)} mL)</p>
                </div>
                <button type="button" onClick={copy} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 16px", backgroundColor: "#fff", border: "1px solid #d1d5db", borderRadius: "8px", cursor: "pointer" }}>{copied ? <CheckIcon /> : <CopyIcon />}{copied ? "Copied!" : "Copy"}</button>
              </div>
            )}
          </div>
        </div>
        <div style={{ padding: "16px 24px", backgroundColor: "#eff6ff", borderTop: "1px solid #bfdbfe" }}>
          <h3 style={{ fontWeight: 600, color: "#1e40af", marginBottom: "8px", fontSize: "14px" }}>📝 Example</h3>
          <p style={{ fontSize: "14px", color: "#1d4ed8" }}>10mg vial + 2mL BAC = 5000 mcg/mL → 250mcg dose = <strong>5 units</strong></p>
        </div>
        <div style={{ borderTop: "1px solid #e5e7eb" }}>
          <button type="button" onClick={() => setShowFaq(!showFaq)} style={{ width: "100%", padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", backgroundColor: "transparent", border: "none", cursor: "pointer" }}>
            <span style={{ fontWeight: 600, color: "#1f2937" }}>FAQ</span><span style={{ transform: showFaq ? "rotate(180deg)" : "none" }}>▼</span>
          </button>
          {showFaq && <div style={{ padding: "0 24px 24px", fontSize: "14px", color: "#4b5563" }}><p><strong>What is BAC water?</strong> Sterile water with benzyl alcohol to prevent bacteria.</p><p style={{ marginTop: "8px" }}><strong>Units vs mL?</strong> 100 units = 1mL on standard insulin syringes.</p></div>}
        </div>
      </div>
      <div style={{ marginTop: "24px", textAlign: "center" }}><p style={{ color: "#4b5563", marginBottom: "12px" }}>Need to track doses?</p><a href="https://regimen.lovable.app" target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "12px 24px", backgroundColor: "#f97316", color: "#fff", fontWeight: 600, borderRadius: "12px", textDecoration: "none" }}>Download Regimen →</a></div>
    </div>
  );
}
