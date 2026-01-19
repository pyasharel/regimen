import { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown, Copy } from "lucide-react";

type MassUnit = "mg" | "mcg";

type SyringeOption = { unitsMax: number; label: string };
const SYRINGE_OPTIONS: SyringeOption[] = [
  { unitsMax: 30, label: "0.3 mL (30u)" },
  { unitsMax: 50, label: "0.5 mL (50u)" },
  { unitsMax: 100, label: "1.0 mL (100u)" },
];

const toMcg = (value: number, unit: MassUnit) => (unit === "mg" ? value * 1000 : value);

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

export function PeptideReconstitutionCalculatorEmbed() {
  const [vialSize, setVialSize] = useState("");
  const [vialUnit, setVialUnit] = useState<MassUnit>("mg");
  const [bacWaterMl, setBacWaterMl] = useState("");
  const [dose, setDose] = useState("");
  const [doseUnit, setDoseUnit] = useState<MassUnit>("mg");

  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [syringeUnitsMax, setSyringeUnitsMax] = useState<number>(100);
  const [copied, setCopied] = useState<"units" | "ml" | null>(null);

  const result = useMemo(() => {
    const vialNum = parsePositive(vialSize);
    const bacNum = parsePositive(bacWaterMl);
    const doseNum = parsePositive(dose);
    if (!vialNum || !bacNum || !doseNum) return null;

    const vialMcg = toMcg(vialNum, vialUnit);
    const doseMcg = toMcg(doseNum, doseUnit);

    const concentrationMcgPerMl = vialMcg / bacNum;
    const mlToDraw = doseMcg / concentrationMcgPerMl;
    const unitsToDraw = mlToDraw * 100; // 1u = 0.01 mL (always)

    if (!Number.isFinite(mlToDraw) || mlToDraw <= 0) return null;

    return {
      concentrationMcgPerMl,
      mlToDraw,
      unitsToDraw,
      exceedsSyringe: unitsToDraw > syringeUnitsMax,
    };
  }, [vialSize, vialUnit, bacWaterMl, dose, doseUnit, syringeUnitsMax]);

  const copy = async (text: string, which: "units" | "ml") => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(which);
      window.setTimeout(() => setCopied(null), 1200);
    } catch {
      // ignore
    }
  };

  return (
    <Card className="w-full">
      <CardHeader className="space-y-2">
        <CardTitle className="text-xl">Peptide Reconstitution Calculator</CardTitle>
        <CardDescription>
          Enter your vial size, BAC water, and dose. Assumes an insulin syringe where <span className="font-medium text-foreground">1 unit = 0.01 mL</span>.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Vial size</Label>
            <div className="flex gap-2">
              <Input
                type="number"
                inputMode="decimal"
                min={0}
                placeholder="e.g. 10"
                value={vialSize}
                onChange={(e) => setVialSize(e.target.value)}
              />
              <Select value={vialUnit} onValueChange={(v) => setVialUnit(v as MassUnit)}>
                <SelectTrigger className="w-[96px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mg">mg</SelectItem>
                  <SelectItem value="mcg">mcg</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>BAC water added (mL)</Label>
            <Input
              type="number"
              inputMode="decimal"
              min={0}
              placeholder="e.g. 2"
              value={bacWaterMl}
              onChange={(e) => setBacWaterMl(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Dose</Label>
            <div className="flex gap-2">
              <Input
                type="number"
                inputMode="decimal"
                min={0}
                placeholder="e.g. 1"
                value={dose}
                onChange={(e) => setDose(e.target.value)}
              />
              <Select value={doseUnit} onValueChange={(v) => setDoseUnit(v as MassUnit)}>
                <SelectTrigger className="w-[96px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mg">mg</SelectItem>
                  <SelectItem value="mcg">mcg</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-muted/20 p-4">
            <p className="text-sm text-muted-foreground">Output</p>
            {!result ? (
              <p className="mt-2 text-sm">Fill in the fields to see units to draw.</p>
            ) : (
              <div className="mt-3 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm text-muted-foreground">Draw</p>
                    <p className="text-2xl font-semibold text-foreground">{formatSmart(result.unitsToDraw, 1)}u</p>
                    <p className="text-xs text-muted-foreground">({formatSmart(result.mlToDraw, 3)} mL)</p>
                    {result.exceedsSyringe && (
                      <p className="mt-1 text-xs text-destructive">
                        Exceeds a {syringeUnitsMax}u insulin syringe.
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      className="h-9"
                      onClick={() => copy(`${formatSmart(result.unitsToDraw, 1)}u`, "units")}
                    >
                      <Copy className="mr-2 h-4 w-4" />
                      {copied === "units" ? "Copied" : "Copy units"}
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      className="h-9"
                      onClick={() => copy(`${formatSmart(result.mlToDraw, 3)} mL`, "ml")}
                    >
                      <Copy className="mr-2 h-4 w-4" />
                      {copied === "ml" ? "Copied" : "Copy mL"}
                    </Button>
                  </div>
                </div>

                <div className="rounded-lg border border-border bg-background/40 p-3">
                  <p className="text-xs text-muted-foreground">Concentration</p>
                  <p className="text-sm font-medium">
                    {formatSmart(result.concentrationMcgPerMl, 0)} mcg/mL
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="flex w-full items-center justify-between rounded-lg border border-border bg-background px-4 py-3 text-sm"
            >
              <span className="text-muted-foreground">Advanced (optional)</span>
              <ChevronDown
                className={`h-4 w-4 text-muted-foreground transition-transform ${advancedOpen ? "rotate-180" : ""}`}
              />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Insulin syringe capacity</Label>
                <Select
                  value={String(syringeUnitsMax)}
                  onValueChange={(v) => setSyringeUnitsMax(Number(v))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SYRINGE_OPTIONS.map((o) => (
                      <SelectItem key={o.unitsMax} value={String(o.unitsMax)}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  This is only used for the “exceeds syringe capacity” warning.
                </p>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}
