import { useState } from "react";
import { PeptideReconstitutionCalculatorEmbed } from "./PeptideReconstitutionCalculatorEmbed";
import { OilMlCalculatorEmbed } from "./OilMlCalculatorEmbed";

/**
 * STANDALONE Calculator Tabs Wrapper
 * 
 * Use this if you want both calculators on a single page with tab navigation.
 * For separate dedicated pages, import the calculators individually.
 */
export function CalculatorEmbedTabs() {
  const [activeTab, setActiveTab] = useState<"peptide" | "oil">("peptide");

  return (
    <div style={{ width: "100%", maxWidth: "672px", margin: "0 auto" }}>
      {/* Tab Buttons */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "24px" }}>
        <button
          type="button"
          onClick={() => setActiveTab("peptide")}
          style={{
            flex: 1,
            padding: "12px 16px",
            borderRadius: "12px",
            fontWeight: 600,
            border: "none",
            cursor: "pointer",
            transition: "all 0.2s",
            backgroundColor: activeTab === "peptide" ? "#f97316" : "#f3f4f6",
            color: activeTab === "peptide" ? "#ffffff" : "#4b5563",
            boxShadow: activeTab === "peptide" ? "0 10px 25px -5px rgba(249, 115, 22, 0.4)" : "none"
          }}
        >
          Peptide Calculator
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("oil")}
          style={{
            flex: 1,
            padding: "12px 16px",
            borderRadius: "12px",
            fontWeight: 600,
            border: "none",
            cursor: "pointer",
            transition: "all 0.2s",
            backgroundColor: activeTab === "oil" ? "#3b82f6" : "#f3f4f6",
            color: activeTab === "oil" ? "#ffffff" : "#4b5563",
            boxShadow: activeTab === "oil" ? "0 10px 25px -5px rgba(59, 130, 246, 0.4)" : "none"
          }}
        >
          Oil-Based Calculator
        </button>
      </div>

      {/* Calculator Content */}
      {activeTab === "peptide" ? (
        <PeptideReconstitutionCalculatorEmbed />
      ) : (
        <OilMlCalculatorEmbed />
      )}
    </div>
  );
}
