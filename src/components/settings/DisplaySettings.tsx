import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Palette, Weight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useTheme } from "@/components/ThemeProvider";

export const DisplaySettings = () => {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();

  // TODO: Add user profile with weight unit preference
  const [weightUnit, setWeightUnit] = useState<"lbs" | "kg">("lbs");

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-border bg-card/95 backdrop-blur-sm px-4 py-4">
        <button onClick={() => navigate("/settings")} className="rounded-lg p-2 hover:bg-muted transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-xl font-bold">Display</h1>
      </header>

      <div className="p-4 space-y-6 max-w-2xl mx-auto">
        {/* Theme Section */}
        <div className="space-y-4 p-4 rounded-xl border border-border bg-card shadow-[var(--shadow-card)]">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
              <Palette className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-semibold">Theme</h2>
              <p className="text-sm text-muted-foreground">Choose your preferred theme</p>
            </div>
          </div>
          <div className="space-y-2">
            <button
              onClick={() => setTheme("light")}
              className={`w-full rounded-lg border p-4 text-left transition-all ${
                theme === "light" ? "border-primary bg-primary/10" : "border-border hover:bg-muted"
              }`}
            >
              <div className="font-semibold">Light</div>
              <div className="text-xs text-muted-foreground">Bright and clean</div>
            </button>
            <button
              onClick={() => setTheme("dark")}
              className={`w-full rounded-lg border p-4 text-left transition-all ${
                theme === "dark" ? "border-primary bg-primary/10" : "border-border hover:bg-muted"
              }`}
            >
              <div className="font-semibold">Dark</div>
              <div className="text-xs text-muted-foreground">Easy on the eyes</div>
            </button>
            <button
              onClick={() => setTheme("system")}
              className={`w-full rounded-lg border p-4 text-left transition-all ${
                theme === "system" ? "border-primary bg-primary/10" : "border-border hover:bg-muted"
              }`}
            >
              <div className="font-semibold">System</div>
              <div className="text-xs text-muted-foreground">Match device settings</div>
            </button>
          </div>
        </div>

        {/* Units Section */}
        <div className="space-y-4 p-4 rounded-xl border border-border bg-card shadow-[var(--shadow-card)]">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
              <Weight className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-semibold">Measurement Units</h2>
              <p className="text-sm text-muted-foreground">Your preferred units for weight tracking</p>
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium">Weight Unit</Label>
            <div className="flex gap-2">
              <button
                onClick={() => setWeightUnit("lbs")}
                className={`flex-1 rounded-lg border p-3 text-center transition-all ${
                  weightUnit === "lbs" ? "border-primary bg-primary/10 font-semibold" : "border-border hover:bg-muted"
                }`}
              >
                Pounds (lbs)
              </button>
              <button
                onClick={() => setWeightUnit("kg")}
                className={`flex-1 rounded-lg border p-3 text-center transition-all ${
                  weightUnit === "kg" ? "border-primary bg-primary/10 font-semibold" : "border-border hover:bg-muted"
                }`}
              >
                Kilograms (kg)
              </button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              This will be used as the default unit when tracking your weight in progress photos.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
