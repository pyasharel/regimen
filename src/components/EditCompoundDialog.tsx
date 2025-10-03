import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

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
}

interface EditCompoundDialogProps {
  compound: Compound | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const EditCompoundDialog = ({ compound, open, onOpenChange, onSuccess }: EditCompoundDialogProps) => {
  const { toast } = useToast();
  const [name, setName] = useState(compound?.name || "");
  const [dose, setDose] = useState(compound?.intended_dose.toString() || "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!compound) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from('compounds')
        .update({
          name,
          intended_dose: parseFloat(dose),
        })
        .eq('id', compound.id);

      if (error) throw error;

      toast({
        title: "Compound updated",
        description: "Your changes have been saved"
      });

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating compound:', error);
      toast({
        title: "Error",
        description: "Failed to update compound",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Compound</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Compound Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter compound name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="dose">Dose Amount</Label>
            <Input
              id="dose"
              type="number"
              value={dose}
              onChange={(e) => setDose(e.target.value)}
              placeholder="Enter dose"
            />
          </div>
        </div>
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};