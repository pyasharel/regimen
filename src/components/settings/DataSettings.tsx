import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Download, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { trackDataExported, trackDataCleared } from "@/utils/analytics";
import { useSwipeBack } from "@/hooks/useSwipeBack";
import { Capacitor } from "@capacitor/core";
import { Filesystem, Directory } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";

export const DataSettings = () => {
  const navigate = useNavigate();
  const swipeBack = useSwipeBack();
  const [loading, setLoading] = useState(false);

  const handleExportData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Fetch all user data
      const { data: compounds } = await supabase
        .from('compounds')
        .select('*')
        .eq('user_id', user.id);

      const { data: doses } = await supabase
        .from('doses')
        .select('*')
        .eq('user_id', user.id);

      // Create CSV content
      const csvContent = [
        "Compounds:",
        "Name,Dose,Unit,Schedule,Start Date,End Date,Notes",
        ...(compounds || []).map(c => 
          `"${c.name}",${c.intended_dose},"${c.dose_unit}","${c.schedule_type}","${c.start_date}","${c.end_date || ''}","${c.notes || ''}"`
        ),
        "",
        "Doses:",
        "Compound ID,Scheduled Date,Scheduled Time,Dose Amount,Unit,Taken,Skipped",
        ...(doses || []).map(d => 
          `"${d.compound_id}","${d.scheduled_date}","${d.scheduled_time}",${d.dose_amount},"${d.dose_unit}",${d.taken},${d.skipped}`
        )
      ].join("\n");

      // Export the CSV
      if (Capacitor.isNativePlatform()) {
        const fileName = `regimen-data-${new Date().toISOString().split('T')[0]}.csv`;
        const fileResult = await Filesystem.writeFile({
          path: fileName,
          data: csvContent,
          directory: Directory.Cache,
          encoding: 'utf8' as any,
        });
        await Share.share({ url: fileResult.uri });
        trackDataExported();
        toast.success("Data ready to share");
      } else {
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `regimen-data-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        trackDataExported();
        toast.success("Data exported successfully");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to export data");
    } finally {
      setLoading(false);
    }
  };

  const handleClearData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Delete all user data
      await supabase.from('compounds').delete().eq('user_id', user.id);
      await supabase.from('doses').delete().eq('user_id', user.id);

      trackDataCleared();
      toast.success("All data cleared successfully");
      navigate("/today");
    } catch (error: any) {
      toast.error(error.message || "Failed to clear data");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      
      <header className="sticky top-0 z-10 border-b border-border bg-card/95 backdrop-blur-sm safe-top">
        <div className="flex items-center gap-3 px-4 py-4">
          <button
            onClick={() => navigate("/settings")}
            className="rounded-lg p-2 hover:bg-muted transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-xl font-bold">Data</h1>
        </div>
      </header>

      <div className="p-6 space-y-6 max-w-2xl mx-auto">
        {/* Export Data Section */}
        <div className="space-y-4 p-6 rounded-xl border border-border bg-card shadow-[var(--shadow-card)]">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
              <Download className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Export Data</h2>
              <p className="text-sm text-muted-foreground">Download all your compounds and doses as CSV</p>
            </div>
          </div>
          <Button onClick={handleExportData} disabled={loading} className="w-full gap-2">
            <Download className="h-4 w-4" />
            {loading ? "Exporting..." : "Export Data"}
          </Button>
        </div>

        {/* Clear Data Section - de-emphasized */}
        <div className="pt-4">
          <Separator className="mb-6" />
          <div className="space-y-3 px-1">
            <h3 className="text-sm font-medium text-muted-foreground">Clear All Data</h3>
            <p className="text-xs text-muted-foreground">
              Permanently delete all compounds and doses. This cannot be undone.
            </p>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" className="text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive">
                  <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                  Clear All Data
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete all your compounds, doses, and tracking data. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleClearData}>
                    Clear All Data
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </div>
    </div>
  );
};
