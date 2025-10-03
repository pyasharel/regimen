import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { 
  TrendingDown, 
  Calendar, 
  Plus, 
  Camera,
  Sparkles,
  Lock
} from "lucide-react";

export const ProgressScreen = () => {
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState("weight-loss");
  const [dateRange, setDateRange] = useState("30");

  // Mock data
  const weightData = {
    start: 185,
    current: 178,
    change: -7,
  };

  const categories = [
    { id: "logs", label: "Logs" },
    { id: "journal", label: "Journal" },
    { id: "weight-loss", label: "Weight Loss" },
    { id: "muscle-recovery", label: "Muscle & Recovery" },
    { id: "energy", label: "Energy" },
    { id: "sleep", label: "Sleep" },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-background pb-20">
      {/* Header */}
      <header className="border-b border-border px-4 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">Progress</h1>
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-muted-foreground" />
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="bg-surface border-border rounded-lg border px-3 py-1.5 text-sm"
            >
              <option value="7">Last 7 Days</option>
              <option value="30">Last 30 Days</option>
              <option value="90">Last 90 Days</option>
              <option value="365">Last Year</option>
            </select>
          </div>
        </div>
      </header>

      {/* Category Tabs */}
      <div className="border-b border-border px-4 py-3">
        <div className="flex gap-2 overflow-x-auto pb-2">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setActiveCategory(category.id)}
              className={`rounded-full px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors ${
                activeCategory === category.id
                  ? "bg-secondary text-white"
                  : "bg-surface text-muted-foreground hover:bg-muted"
              }`}
            >
              {category.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 space-y-4 p-4">
        {activeCategory === "weight-loss" && (
          <>
            {/* Weight Stats Card */}
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-4">
                <TrendingDown className="h-5 w-5 text-success" />
                <h2 className="text-lg font-bold">Weight Tracking</h2>
              </div>

              {/* Stats Row */}
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div>
                  <p className="text-xs text-muted-foreground">Start</p>
                  <p className="text-lg font-bold">{weightData.start} lbs</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Current</p>
                  <p className="text-lg font-bold">{weightData.current} lbs</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Change</p>
                  <p className="text-lg font-bold text-success">
                    {weightData.change} lbs
                  </p>
                </div>
              </div>

              {/* Chart Placeholder */}
              <div className="h-[120px] bg-surface rounded-lg mb-4 flex items-center justify-center">
                <p className="text-sm text-muted-foreground">Chart visualization</p>
              </div>

              <Button variant="outline" className="w-full" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Weight Entry
              </Button>
            </Card>

            {/* Photo Progress Card (Premium) */}
            <Card className="p-4 bg-gradient-to-br from-primary/10 to-secondary/10 border-primary/20">
              <div className="flex items-center gap-2 mb-3">
                <Camera className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-bold">Photo Progress</h2>
                <Lock className="h-4 w-4 text-primary ml-auto" />
              </div>

              <p className="text-sm text-muted-foreground mb-4">
                Track visual changes with AI-powered analysis
              </p>

              {/* Photo Timeline Placeholder */}
              <div className="flex gap-2 overflow-x-auto mb-4">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="w-20 h-20 bg-surface rounded-lg flex-shrink-0 flex items-center justify-center"
                  >
                    <Camera className="h-6 w-6 text-muted-foreground" />
                  </div>
                ))}
                <button className="w-20 h-20 bg-primary/20 border-2 border-dashed border-primary rounded-lg flex-shrink-0 flex items-center justify-center">
                  <Plus className="h-6 w-6 text-primary" />
                </button>
              </div>

              {/* Compare Section */}
              <div className="bg-secondary/20 rounded-lg p-4 mb-4">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="h-4 w-4 text-secondary" />
                  <h3 className="font-semibold text-sm">Compare Any Two Dates</h3>
                </div>

                <div className="grid grid-cols-2 gap-2 mb-3">
                  <Button variant="outline" size="sm" className="text-xs">
                    Select Before
                  </Button>
                  <Button variant="outline" size="sm" className="text-xs">
                    Select After
                  </Button>
                </div>

                <div className="bg-surface/50 rounded-lg p-3 text-xs">
                  <p className="font-semibold mb-2">AI Analysis (Beta)</p>
                  <ul className="space-y-1 text-muted-foreground">
                    <li>• Body fat: 18% → 15% (-3%)</li>
                    <li>• Muscle: Improved in arms, shoulders</li>
                    <li>• Change: Noticeable lean muscle gain</li>
                    <li>• Confidence: 85%</li>
                  </ul>
                </div>
              </div>

              <Button className="w-full" size="sm">
                Unlock Premium
              </Button>
            </Card>

            {/* Journal Section */}
            <Card className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold">Journal</h2>
                <Button variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Note
                </Button>
              </div>

              {/* Journal Entries */}
              <div className="space-y-3">
                {[
                  { date: "Mar 15, 2025", note: "Feeling great, energy levels high" },
                  { date: "Mar 10, 2025", note: "Noticed visible changes in midsection" },
                ].map((entry, i) => (
                  <div key={i} className="border-l-2 border-primary pl-3 py-1">
                    <p className="text-xs text-muted-foreground mb-1">{entry.date}</p>
                    <p className="text-sm">{entry.note}</p>
                  </div>
                ))}
              </div>
            </Card>
          </>
        )}

        {activeCategory !== "weight-loss" && (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground mb-4">
              {categories.find((c) => c.id === activeCategory)?.label} tracking coming soon
            </p>
            <Button variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Add Entry
            </Button>
          </Card>
        )}
      </div>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 flex h-16 items-center justify-around border-t border-border bg-card/95 backdrop-blur-sm">
        {[
          { name: "Today", path: "/today", active: false },
          { name: "My Stack", path: "/stack", active: false },
          { name: "Progress", path: "/progress", active: true },
          { name: "Settings", path: "/settings", active: false },
        ].map((tab) => (
          <button
            key={tab.name}
            onClick={() => navigate(tab.path)}
            className={`flex flex-col items-center gap-1 transition-colors ${
              tab.active ? "text-primary" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <div className="h-1 w-1 rounded-full" />
            <span className="text-[11px] font-medium">{tab.name}</span>
          </button>
        ))}
      </nav>
    </div>
  );
};
