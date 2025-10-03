import { useNavigate } from "react-router-dom";
import { Plus, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";

export const MyStackScreen = () => {
  const navigate = useNavigate();

  // Mock data - will be replaced with real data later
  const activeCompounds = [
    {
      id: 1,
      name: "BPC-157",
      dose: "250 mcg",
      iu: "25 IU",
      schedule: "Morning, Evening",
      frequency: "Daily",
      activeDays: 23,
    },
    {
      id: 2,
      name: "TB-500",
      dose: "5 mg",
      iu: "50 IU",
      schedule: "Morning",
      frequency: "Weekdays",
      activeDays: 15,
    },
  ];

  const completedCompounds = [
    {
      id: 3,
      name: "Semaglutide",
      dose: "0.5 mg",
      completedDate: "2024-01-15",
    },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-background pb-20">
      {/* Header */}
      <header className="border-b border-border px-4 py-4">
        <h1 className="text-xl font-bold">My Stack</h1>
      </header>

      {/* Active Compounds */}
      <div className="flex-1 space-y-4 p-4">
        <div className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Active
          </h2>
          
          {activeCompounds.map((compound) => (
            <div
              key={compound.id}
              className="overflow-hidden rounded-2xl border border-border bg-card shadow-lg transition-all hover:shadow-xl animate-slide-up"
            >
              <div className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="mt-1 h-2 w-2 rounded-full bg-success" />
                    <div>
                      <h3 className="text-lg font-bold">{compound.name}</h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {compound.dose} • {compound.iu} • {compound.schedule}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {compound.frequency} • Active for {compound.activeDays} days
                      </p>
                    </div>
                  </div>
                  <button className="rounded-lg p-2 hover:bg-muted transition-colors">
                    <MoreVertical className="h-5 w-5 text-muted-foreground" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Completed Compounds */}
        <div className="space-y-3 pt-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Completed ({completedCompounds.length})
          </h2>
          
          {completedCompounds.map((compound) => (
            <div
              key={compound.id}
              className="overflow-hidden rounded-2xl border border-border bg-card/60 opacity-60"
            >
              <div className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="mt-1 h-2 w-2 rounded-full bg-muted-foreground" />
                    <div>
                      <h3 className="font-bold">{compound.name}</h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {compound.dose}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Completed on {new Date(compound.completedDate).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* FAB Button */}
      <button
        onClick={() => navigate("/add-compound")}
        className="fixed bottom-24 right-5 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-2xl shadow-primary/40 transition-transform hover:scale-105 active:scale-95"
      >
        <Plus className="h-6 w-6" />
      </button>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 flex h-16 items-center justify-around border-t border-border bg-card/95 backdrop-blur-sm">
        {[
          { name: "Today", path: "/today", active: false },
          { name: "My Stack", path: "/stack", active: true },
          { name: "Progress", path: "/progress", active: false },
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
