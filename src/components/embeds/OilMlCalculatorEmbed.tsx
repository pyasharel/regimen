import { useMemo, useState } from "react";

/**
 * STANDALONE Oil-Based mL Calculator
 * 
 * DEPENDENCIES NEEDED IN YOUR PROJECT:
 * - React 18+
 * - Tailwind CSS is NOT required - uses inline styles
 * 
 * HOW TO USE:
 * 1. Copy this file to your project's components folder
 * 2. Import and use: <OilMlCalculatorEmbed />
 * 
 * NOTE: This uses inline styles intentionally so it's portable
 * to any React project without needing Tailwind or a design system.
 */

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

const PRESET_CONC = [100, 200, 250, 300];

// Simple Copy Icon
const CopyIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="14" height="14" x="8" y="8" rx="2" ry="2"/>
    <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
  </svg>
);

// Simple Check Icon
const CheckIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);

export function OilMlCalculatorEmbed() {
  const [concentrationMgPerMl, setConcentrationMgPerMl] = useState("");
  const [doseMg, setDoseMg] = useState("");
  const [copied, setCopied] = useState(false);
  const [showFaq, setShowFaq] = useState(false);

  const result = useMemo(() => {
    const conc = parsePositive(concentrationMgPerMl);
    const dose = parsePositive(doseMg);
    if (!conc || !dose) return null;

    const ml = dose / conc;
    if (!Number.isFinite(ml) || ml <= 0) return null;

    return { ml };
  }, [concentrationMgPerMl, doseMg]);

  const copy = async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(`${formatSmart(result.ml, 3)} mL`);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      // ignore
    }
  };

  const QuickButton = ({ 
    value, 
    current, 
    onClick
  }: { 
    value: number; 
    current: string; 
    onClick: () => void;
  }) => (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: "8px 16px",
        borderRadius: "8px",
        fontSize: "14px",
        fontWeight: 500,
        transition: "all 0.2s",
        border: "none",
        cursor: "pointer",
        backgroundColor: current === String(value) ? "#3b82f6" : "#f3f4f6",
        color: current === String(value) ? "#ffffff" : "#374151",
        boxShadow: current === String(value) ? "0 4px 6px -1px rgba(59, 130, 246, 0.3)" : "none",
      }}
    >
      {value}
    </button>
  );

  return (
    <div style={{ width: "100%", maxWidth: "672px", margin: "0 auto" }}>
      {/* Main Calculator Card */}
      <div style={{ 
        backgroundColor: "#ffffff", 
        borderRadius: "16px", 
        boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
        border: "1px solid #f3f4f6",
        overflow: "hidden"
      }}>
        {/* Header */}
        <div style={{ 
          background: "linear-gradient(to right, #3b82f6, #2563eb)", 
          padding: "20px 24px"
        }}>
          <h2 style={{ fontSize: "24px", fontWeight: "bold", color: "#ffffff", margin: 0 }}>
            Oil-Based mL Calculator
          </h2>
          <p style={{ color: "#bfdbfe", marginTop: "4px", fontSize: "14px" }}>
            Calculate how many mL to draw for testosterone, nandrolone, and other oil-based compounds
          </p>
        </div>

        {/* Step-by-Step Instructions */}
        <div style={{ 
          padding: "16px 24px", 
          backgroundColor: "#eff6ff", 
          borderBottom: "1px solid #bfdbfe"
        }}>
          <h3 style={{ 
            fontWeight: 600, 
            color: "#1f2937", 
            marginBottom: "12px", 
            display: "flex", 
            alignItems: "center", 
            gap: "8px",
            fontSize: "14px"
          }}>
            <span style={{ 
              width: "24px", 
              height: "24px", 
              borderRadius: "50%", 
              backgroundColor: "#3b82f6", 
              color: "#ffffff", 
              fontSize: "12px", 
              display: "flex", 
              alignItems: "center", 
              justifyContent: "center"
            }}>?</span>
            How to Use
          </h3>
          <ol style={{ fontSize: "14px", color: "#4b5563", marginLeft: "32px", lineHeight: 1.8 }}>
            <li><span style={{ fontWeight: 500, color: "#2563eb" }}>Step 1:</span> Find the concentration on your vial label (e.g., "250mg/mL")</li>
            <li><span style={{ fontWeight: 500, color: "#2563eb" }}>Step 2:</span> Enter your prescribed dose in mg</li>
            <li><span style={{ fontWeight: 500, color: "#2563eb" }}>Step 3:</span> Read the mL to draw into your syringe</li>
          </ol>
        </div>

        {/* Calculator Form */}
        <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "24px" }}>
          {/* Concentration */}
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <label style={{ fontSize: "14px", fontWeight: 600, color: "#374151" }}>
              Concentration (mg/mL)
              <span style={{ fontWeight: "normal", color: "#6b7280", marginLeft: "8px" }}>— shown on your vial label</span>
            </label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              {PRESET_CONC.map((c) => (
                <QuickButton
                  key={c}
                  value={c}
                  current={concentrationMgPerMl}
                  onClick={() => setConcentrationMgPerMl(String(c))}
                />
              ))}
              <input
                type="number"
                inputMode="decimal"
                min={0}
                placeholder="Other"
                value={PRESET_CONC.includes(Number(concentrationMgPerMl)) ? "" : concentrationMgPerMl}
                onChange={(e) => setConcentrationMgPerMl(e.target.value)}
                style={{
                  width: "96px",
                  padding: "8px 12px",
                  borderRadius: "8px",
                  border: "1px solid #d1d5db",
                  fontSize: "14px",
                  outline: "none"
                }}
              />
            </div>
            <p style={{ fontSize: "12px", color: "#6b7280" }}>
              Common: Test Cyp/E (200-250mg/mL), Test Prop (100mg/mL)
            </p>
          </div>

          {/* Dose */}
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <label style={{ fontSize: "14px", fontWeight: 600, color: "#374151" }}>
              Desired Dose (mg)
              <span style={{ fontWeight: "normal", color: "#6b7280", marginLeft: "8px" }}>— your prescribed amount per injection</span>
            </label>
            <input
              type="number"
              inputMode="decimal"
              min={0}
              placeholder="e.g. 200"
              value={doseMg}
              onChange={(e) => setDoseMg(e.target.value)}
              style={{
                width: "100%",
                padding: "12px 16px",
                borderRadius: "8px",
                border: "1px solid #d1d5db",
                fontSize: "16px",
                outline: "none"
              }}
            />
          </div>

          {/* Result */}
          <div style={{ 
            borderRadius: "12px", 
            padding: "20px",
            transition: "all 0.2s",
            backgroundColor: result ? "#f0fdf4" : "#f9fafb",
            border: result ? "2px solid #bbf7d0" : "1px solid #e5e7eb"
          }}>
            <p style={{ fontSize: "14px", fontWeight: 500, color: "#6b7280", marginBottom: "8px" }}>Your Result</p>
            {!result ? (
              <p style={{ color: "#9ca3af" }}>Fill in both fields above to see your calculation</p>
            ) : (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
                <div>
                  <p style={{ fontSize: "14px", color: "#6b7280" }}>Draw this amount:</p>
                  <p style={{ fontSize: "36px", fontWeight: "bold", color: "#16a34a" }}>{formatSmart(result.ml, 3)} mL</p>
                </div>
                <button
                  type="button"
                  onClick={copy}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "8px 16px",
                    backgroundColor: "#ffffff",
                    border: "1px solid #d1d5db",
                    borderRadius: "8px",
                    cursor: "pointer"
                  }}
                >
                  {copied ? <CheckIcon /> : <CopyIcon />}
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Example Calculation */}
        <div style={{ 
          padding: "16px 24px", 
          backgroundColor: "#fffbeb", 
          borderTop: "1px solid #fde68a"
        }}>
          <h3 style={{ fontWeight: 600, color: "#92400e", marginBottom: "8px", fontSize: "14px" }}>📝 Example Calculation</h3>
          <div style={{ fontSize: "14px", color: "#a16207", lineHeight: 1.6 }}>
            <p><strong>Scenario:</strong> Testosterone Cypionate 200mg/mL, prescribed 160mg per injection</p>
            <p><strong>Math:</strong> 160mg ÷ 200mg/mL = <strong>0.8 mL</strong></p>
          </div>
        </div>

        {/* Visual Syringe Guide */}
        <div style={{ 
          padding: "16px 24px", 
          backgroundColor: "#f9fafb", 
          borderTop: "1px solid #e5e7eb"
        }}>
          <h3 style={{ fontWeight: 600, color: "#1f2937", marginBottom: "12px", fontSize: "14px" }}>💉 Reading Your Syringe</h3>
          <div style={{ 
            backgroundColor: "#ffffff", 
            borderRadius: "8px", 
            padding: "16px", 
            border: "1px solid #e5e7eb"
          }}>
            <div style={{ 
              height: "32px", 
              background: "linear-gradient(to right, #e5e7eb, #f3f4f6)", 
              borderRadius: "16px", 
              position: "relative", 
              overflow: "hidden",
              border: "1px solid #d1d5db"
            }}>
              <div style={{ 
                position: "absolute", 
                top: 0, 
                bottom: 0, 
                left: 0, 
                width: "50%", 
                backgroundColor: "rgba(251, 191, 36, 0.5)", 
                borderTopLeftRadius: "16px", 
                borderBottomLeftRadius: "16px"
              }}></div>
              <div style={{ 
                position: "absolute", 
                top: 0, 
                bottom: 0, 
                left: 0, 
                right: 0, 
                display: "flex", 
                alignItems: "center", 
                justifyContent: "space-between", 
                padding: "0 8px",
                fontSize: "12px",
                fontFamily: "monospace",
                color: "#4b5563"
              }}>
                <span>0</span>
                <span>0.5</span>
                <span>1mL</span>
              </div>
            </div>
            <p style={{ fontSize: "12px", color: "#6b7280", marginTop: "8px" }}>
              Most 3mL syringes have markings every 0.1mL. A 1mL syringe has finer markings (every 0.01-0.02mL) for more precise measurements.
            </p>
          </div>
        </div>

        {/* FAQ Section */}
        <div style={{ borderTop: "1px solid #e5e7eb" }}>
          <button
            type="button"
            onClick={() => setShowFaq(!showFaq)}
            style={{
              width: "100%",
              padding: "16px 24px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              textAlign: "left",
              backgroundColor: "transparent",
              border: "none",
              cursor: "pointer"
            }}
          >
            <span style={{ fontWeight: 600, color: "#1f2937" }}>Frequently Asked Questions</span>
            <span style={{ transform: showFaq ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>▼</span>
          </button>
          
          {showFaq && (
            <div style={{ padding: "0 24px 24px", display: "flex", flexDirection: "column", gap: "16px" }}>
              <div>
                <h4 style={{ fontWeight: 500, color: "#1f2937", marginBottom: "4px" }}>What syringe should I use for oil-based injections?</h4>
                <p style={{ fontSize: "14px", color: "#4b5563" }}>For intramuscular (IM) injections, use a 3mL syringe with a 22-25 gauge needle, 1-1.5" long. For subcutaneous, a 1mL syringe with 27-30 gauge needle works well.</p>
              </div>
              <div>
                <h4 style={{ fontWeight: 500, color: "#1f2937", marginBottom: "4px" }}>Why is my oil thick and hard to draw?</h4>
                <p style={{ fontSize: "14px", color: "#4b5563" }}>Oil-based compounds are viscous by nature. Warm the vial in your hands or briefly in warm water. Use a larger gauge needle (18-21g) to draw, then switch for injection.</p>
              </div>
              <div>
                <h4 style={{ fontWeight: 500, color: "#1f2937", marginBottom: "4px" }}>What's the difference between Test Cypionate and Enanthate?</h4>
                <p style={{ fontSize: "14px", color: "#4b5563" }}>Both are long-acting testosterone esters with similar half-lives (~8 days). They're functionally interchangeable at equal mg doses.</p>
              </div>
              <div>
                <h4 style={{ fontWeight: 500, color: "#1f2937", marginBottom: "4px" }}>How do I store oil-based compounds?</h4>
                <p style={{ fontSize: "14px", color: "#4b5563" }}>Store at room temperature (15-30°C / 59-86°F) away from direct light. Don't refrigerate as this can cause crystallization.</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* CTA Section */}
      <div style={{ marginTop: "24px", textAlign: "center" }}>
        <p style={{ color: "#4b5563", marginBottom: "12px" }}>Need to track your doses consistently?</p>
        <a
          href="https://regimen.lovable.app"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            padding: "12px 24px",
            backgroundColor: "#3b82f6",
            color: "#ffffff",
            fontWeight: 600,
            borderRadius: "12px",
            textDecoration: "none",
            boxShadow: "0 10px 25px -5px rgba(59, 130, 246, 0.4)"
          }}
        >
          Download Regimen App
          <span>→</span>
        </a>
      </div>
    </div>
  );
}
