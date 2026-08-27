import React, { useEffect, useRef, useState } from "react";
import SmilesDrawer from "smiles-drawer";
import { copyToClipboard } from "../lib/clipboard";
import { I } from "../ui/Icons";

const MOLECULES: Record<string, string> = {
  benzene: "c1ccccc1",
  toluene: "Cc1ccccc1",
  phenol: "Oc1ccccc1",
  aniline: "Nc1ccccc1",
  aspirin: "CC(=O)Oc1ccccc1C(=O)O",
  acetylsalicylic_acid: "CC(=O)Oc1ccccc1C(=O)O",
  caffeine: "CN1C=NC2=C1C(=O)N(C(=O)N2C)C",
  water: "O",
  ethanol: "CCO",
  methanol: "CO",
  acetone: "CC(=O)C",
  acetic_acid: "CC(=O)O",
  glucose: "C(C1C(C(C(C(O1)O)O)O)O)O",
  dopamine: "C1=CC(=C(C=C1CCN)O)O",
  serotonin: "C1=CC2=C(C=C1O)C(=CN2)CCN",
  adrenaline: "CNC[C@H](C1=CC(=C(C=C1)O)O)O",
  epinephrine: "CNC[C@H](C1=CC(=C(C=C1)O)O)O",
  paracetamol: "CC(=O)Nc1ccc(O)cc1",
  acetaminophen: "CC(=O)Nc1ccc(O)cc1",
  ibuprofen: "CC(C)Cc1ccc(C(C)C(=O)O)cc1",
  penicillin: "CC1(C(N2C(S1)C(C2=O)NC(=O)Cc3ccccc3)C(=O)O)C",
  nicotine: "CN1CCCC1c2cccnc2",
  cholesterol: "CC(C)CCCC(C)C1CCC2C1(CCC3C2CC=C4C3(CCC(C4)O)C)C",
  vanillin: "COc1cc(C=O)ccc1O",
  thc: "CCCCCC1=CC(=C2C(=C1)OC(C3C2C=C(CC3)C)(C)C)O",
  citric_acid: "C(C(=O)O)C(CC(=O)O)(C(=O)O)O",
  methane: "C",
  ethane: "CC",
  propane: "CCC",
  butane: "CCCC",
  dna_adenine: "Nc1ncnc2[nH]cnc12",
  dna_thymine: "Cc1cn([H])c(=O)[nH]c1=O",
  dna_guanine: "Nc1nc2[nH]cnc2c(=O)[nH]1",
  dna_cytosine: "Nc1ccn([H])c(=O)n1",
};

export interface ChemistryProps {
  smiles?: string;
  formula?: string;
  molecule?: string;
  name?: string;
  structure?: string;
  title?: string;
  caption?: string;
  theme?: "light" | "dark" | "auto";
}

export function ChemistryBlock({ b }: { b: ChemistryProps | any }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Resolve SMILES from common names or properties
  const query = (b.smiles || b.structure || b.formula || b.molecule || b.name || "").trim();
  const normalizedKey = query.toLowerCase().replace(/[\s-_]+/g, "_");
  const smiles = MOLECULES[normalizedKey] || (query.includes("=") || query.includes("(") || query.includes("c") || query.includes("C") ? query : query);
  const displayName = b.title || b.name || (MOLECULES[normalizedKey] ? query.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "Molecular Structure");

  useEffect(() => {
    if (!smiles) {
      setError("No chemical formula or SMILES provided");
      return;
    }

    try {
      const SD: any = (SmilesDrawer as any)?.default || SmilesDrawer || (window as any).SmilesDrawer;
      if (!SD || typeof SD.parse !== "function") {
        setError("Chemical structure parser unavailable");
        return;
      }

      setError(null);
      SD.parse(
        smiles,
        (tree: any) => {
          if (!containerRef.current) return;
          try {
            const isDark = document.documentElement.dataset.theme !== "light";
            const drawer = new SD.SvgDrawer({
              width: 340,
              height: 220,
              bondThickness: 1.3,
              bondLength: 15,
              shortBondLength: 0.85,
              bondSpacing: 0.18 * 15,
              fontSizeLarge: 7,
              fontSizeSmall: 5,
              padding: 14,
            });

            const svg = drawer.draw(tree, null, isDark ? "dark" : "light");
            if (svg && containerRef.current) {
              containerRef.current.innerHTML = "";
              svg.style.width = "100%";
              svg.style.height = "auto";
              svg.style.maxHeight = "240px";
              svg.style.display = "block";
              svg.style.margin = "0 auto";
              containerRef.current.appendChild(svg);
            }
          } catch (renderErr: any) {
            setError(`Render error: ${renderErr?.message || renderErr}`);
          }
        },
        (parseErr: any) => {
          setError(`Invalid SMILES syntax: ${parseErr?.message || parseErr}`);
        }
      );
    } catch (e: any) {
      setError(`Chemistry error: ${e?.message || e}`);
    }
  }, [smiles]);

  const handleCopySmiles = async () => {
    if (!smiles) return;
    const ok = await copyToClipboard(smiles);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    }
  };

  return (
    <div className="canvas-card chemistry-card" style={{ gap: 8 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 6 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ color: "var(--accent)", display: "inline-flex", alignItems: "center" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="6" cy="6" r="3" />
              <circle cx="18" cy="6" r="3" />
              <circle cx="18" cy="18" r="3" />
              <line x1="8.5" y1="7.5" x2="15.5" y2="16.5" />
              <line x1="8.5" y1="6" x2="15.5" y2="6" />
            </svg>
          </span>
          <span style={{ fontWeight: 550, fontSize: "var(--fs-xs)", color: "var(--text)" }}>
            {displayName}
          </span>
        </div>
        {smiles && (
          <button
            type="button"
            className="comp-action-btn"
            onClick={handleCopySmiles}
            title="Copy SMILES string"
            style={{ display: "inline-flex", alignItems: "center", gap: 4, height: 22, fontSize: 11 }}
          >
            {copied ? <I.check size={11} /> : <I.copy size={11} />}
            <span style={{ fontFamily: "var(--mono)", fontSize: 10 }}>{smiles.length > 20 ? smiles.slice(0, 18) + "…" : smiles}</span>
          </button>
        )}
      </div>

      <div
        ref={containerRef}
        style={{
          width: "100%",
          minHeight: 180,
          background: "var(--surface)",
          border: "1px solid var(--line-soft)",
          borderRadius: "var(--r-sm)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 8,
          overflow: "hidden",
        }}
      >
        {error ? (
          <div style={{ fontSize: "var(--fs-xs)", color: "var(--text-faint)", textAlign: "center", padding: 12 }}>
            <div style={{ color: "var(--warn)", marginBottom: 4 }}>Molecular preview unavailable</div>
            <div style={{ fontFamily: "var(--mono)", fontSize: 11 }}>{error}</div>
          </div>
        ) : (
          <span className="spinner sm" />
        )}
      </div>

      {(b.caption || b.formula) && (
        <div style={{ fontSize: "var(--fs-xs)", color: "var(--text-faint)", lineHeight: 1.4 }}>
          {b.caption || `Chemical Formula / SMILES: ${smiles}`}
        </div>
      )}
    </div>
  );
}
