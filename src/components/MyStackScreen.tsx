import { useNavigate } from "react-router-dom";
import { Plus, MoreVertical, Pencil, Trash2, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EditCompoundDialog } from "./EditCompoundDialog";

interface Compound {
  id: string;
  name: string;
  intended_dose: number;
  dose_unit: string;
  calculated_iu: number | null;
  schedule_type: string;
  time_of_day: string[];
  start_date: string;
  is_active: boolean;
  created_at: string;
}

export const MyStackScreen = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [compounds, setCompounds] = useState<Compound[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingCompound, setEditingCompound] = useState<Compound | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  useEffect(() => {
    loadCompounds();
  }, []);

  const loadCompounds = async () => {
    try {
      const { data, error } = await supabase
        .from('compounds')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCompounds(data || []);
    } catch (error) {
      console.error('Error loading compounds:', error);
    } finally {
      setLoading(false);
    }
  };

  const markComplete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('compounds')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Compound completed",
        description: "Moved to completed section"
      });

      loadCompounds();
    } catch (error) {
      console.error('Error marking complete:', error);
      toast({
        title: "Error",
        description: "Failed to update compound",
        variant: "destructive"
      });
    }
  };

  const deleteCompound = async (id: string) => {
    if (!confirm('Are you sure you want to delete this compound?')) return;

    try {
      const { error } = await supabase
        .from('compounds')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Compound deleted",
        description: "Successfully removed from your stack"
      });

      loadCompounds();
    } catch (error) {
      console.error('Error deleting compound:', error);
      toast({
        title: "Error",
        description: "Failed to delete compound",
        variant: "destructive"
      });
    }
  };

  const activeCompounds = compounds.filter(c => c.is_active);
  const completedCompounds = compounds.filter(c => !c.is_active);

  const getDaysActive = (startDate: string) => {
    const start = new Date(startDate);
    const now = new Date();
    const diff = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const handleEdit = (compound: Compound) => {
    setEditingCompound(compound);
    setEditDialogOpen(true);
  };

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
                        {compound.intended_dose} {compound.dose_unit}
                        {compound.calculated_iu && ` • ${compound.calculated_iu} IU`}
                        {' • '}{compound.time_of_day.join(', ')}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {compound.schedule_type} • Active for {getDaysActive(compound.start_date)} days
                      </p>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="rounded-lg p-2 hover:bg-muted transition-colors">
                        <MoreVertical className="h-5 w-5 text-muted-foreground" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleEdit(compound)}>
                        <Pencil className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => markComplete(compound.id)}>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Mark Complete
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => deleteCompound(compound.id)}
                        className="text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
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
                        {compound.intended_dose} {compound.dose_unit}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Completed
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

      {/* Edit Dialog */}
      <EditCompoundDialog
        compound={editingCompound}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onSuccess={loadCompounds}
      />
    </div>
  );
};
