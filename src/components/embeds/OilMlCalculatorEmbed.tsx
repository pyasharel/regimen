import { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Copy } from "lucide-react";

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

export function OilMlCalculatorEmbed() {
  const [concentrationMgPerMl, setConcentrationMgPerMl] = useState("");
  const [doseMg, setDoseMg] = useState("");
  const [copied, setCopied] = useState(false);

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

  return (
    <Card className="w-full">
      <CardHeader className="space-y-2">
        <CardTitle className="text-xl">Oil-Based mL Calculator</CardTitle>
        <CardDescription>
          For oil-based compounds where your vial is labeled in <span className="font-medium text-foreground">mg/mL</span>.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Concentration (mg/mL)</Label>
            <div className="flex flex-wrap gap-2">
              {PRESET_CONC.map((c) => (
                <Button
                  key={c}
                  type="button"
                  variant={concentrationMgPerMl === String(c) ? "default" : "secondary"}
                  className="h-9"
                  onClick={() => setConcentrationMgPerMl(String(c))}
                >
                  {c}
                </Button>
              ))}
              <Input
                type="number"
                inputMode="decimal"
                min={0}
                placeholder="Other"
                value={PRESET_CONC.includes(Number(concentrationMgPerMl)) ? "" : concentrationMgPerMl}
                onChange={(e) => setConcentrationMgPerMl(e.target.value)}
                className="h-9 w-[96px]"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Dose (mg)</Label>
            <Input
              type="number"
              inputMode="decimal"
              min={0}
              placeholder="e.g. 200"
              value={doseMg}
              onChange={(e) => setDoseMg(e.target.value)}
            />
          </div>
        </div>

        <div className="rounded-xl border border-border bg-muted/20 p-4">
          <p className="text-sm text-muted-foreground">Output</p>
          {!result ? (
            <p className="mt-2 text-sm">Fill in the fields to see mL to draw.</p>
          ) : (
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm text-muted-foreground">Draw</p>
                <p className="text-2xl font-semibold text-foreground">{formatSmart(result.ml, 3)} mL</p>
              </div>
              <Button type="button" variant="secondary" className="h-9" onClick={copy}>
                <Copy className="mr-2 h-4 w-4" />
                {copied ? "Copied" : "Copy mL"}
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
