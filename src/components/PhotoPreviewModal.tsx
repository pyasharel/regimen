import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Download, Trash2, X, Calendar as CalendarIcon, Pencil } from "lucide-react";
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { createLocalDate } from "@/utils/dateUtils";

interface PhotoPreviewModalProps {
  open: boolean;
  onClose: () => void;
  photoUrl: string;
  entryId: string;
  onDelete: (entryId: string) => void;
  onDateUpdate?: () => void;
}

export const PhotoPreviewModal = ({ open, onClose, photoUrl, entryId, onDelete, onDateUpdate }: PhotoPreviewModalProps) => {
  const [editingDate, setEditingDate] = useState(false);
  const [photoDate, setPhotoDate] = useState<Date>(new Date());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && entryId) {
      fetchPhotoDate();
    }
  }, [open, entryId]);

  const fetchPhotoDate = async () => {
    try {
      const { data, error } = await supabase
        .from('progress_entries')
        .select('entry_date')
        .eq('id', entryId)
        .single();

      if (error) throw error;
      if (data) {
        // Parse as local date to avoid timezone shifts
        const localDate = createLocalDate(data.entry_date);
        if (localDate) {
          setPhotoDate(localDate);
        }
      }
    } catch (error) {
      console.error('Error fetching photo date:', error);
    }
  };

  const handleUpdateDate = async (newDate: Date) => {
    setLoading(true);
    try {
      // Format as local date string (YYYY-MM-DD) to avoid timezone conversion
      const year = newDate.getFullYear();
      const month = String(newDate.getMonth() + 1).padStart(2, '0');
      const day = String(newDate.getDate()).padStart(2, '0');
      const dateString = `${year}-${month}-${day}`;

      const { error } = await supabase
        .from('progress_entries')
        .update({ entry_date: dateString })
        .eq('id', entryId);

      if (error) throw error;

      setPhotoDate(newDate);
      setEditingDate(false);
      toast.success('Photo date updated');
      if (onDateUpdate) onDateUpdate();
    } catch (error) {
      console.error('Error updating photo date:', error);
      toast.error('Failed to update photo date');
    } finally {
      setLoading(false);
    }
  };

  const handleSavePhoto = async () => {
    if (Capacitor.isNativePlatform()) {
      try {
        // On mobile, use Share API to save to photos
        await Share.share({
          url: photoUrl,
        });
        toast.success("Saved to photos");
      } catch (error) {
        console.error("Error saving photo:", error);
        toast.error("Failed to save photo");
      }
    } else {
      // On web, download the image
      try {
        const response = await fetch(photoUrl);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `progress-${new Date().getTime()}.jpg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        toast.success("Photo downloaded");
      } catch (error) {
        console.error("Error downloading photo:", error);
        toast.error("Failed to download photo");
      }
    }
  };

  const handleDelete = () => {
    onDelete(entryId);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl p-0 overflow-hidden">
        <div className="relative">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 p-2 bg-background/80 backdrop-blur-sm rounded-full hover:bg-background transition-colors"
          >
            <X className="h-5 w-5" />
          </button>

          {/* Image */}
          <div className="w-full bg-black">
            <img
              src={photoUrl}
              alt="Progress photo"
              className="w-full h-auto max-h-[70vh] object-contain"
            />
          </div>

          {/* Photo info and action buttons */}
          <div className="p-4 bg-background border-t space-y-3">
            {/* Date section */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm">
                <CalendarIcon className="w-4 h-4" />
                Photo Date
              </Label>
              {editingDate ? (
                <div className="space-y-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-between text-left font-normal"
                        )}
                      >
                        <span className="text-muted-foreground">Select Date</span>
                        <span>
                          {photoDate.toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric', 
                            year: 'numeric' 
                          })}
                        </span>
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={photoDate}
                        onSelect={(date) => date && handleUpdateDate(date)}
                        disabled={(date) => date > new Date()}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditingDate(false)}
                    className="w-full"
                  >
                    Cancel
                  </Button>
                </div>
              ) : (
                <Button
                  variant="outline"
                  onClick={() => setEditingDate(true)}
                  className="w-full justify-between"
                  disabled={loading}
                >
                  <span>
                    {photoDate.toLocaleDateString('en-US', { 
                      month: 'long', 
                      day: 'numeric', 
                      year: 'numeric' 
                    })}
                  </span>
                  <Pencil className="h-4 w-4" />
                </Button>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex gap-2">
              <Button
                onClick={handleSavePhoto}
                variant="outline"
                className="flex-1"
              >
                <Download className="h-4 w-4 mr-2" />
                {Capacitor.isNativePlatform() ? 'Save' : 'Download'}
              </Button>
              <Button
                onClick={handleDelete}
                variant="destructive"
                className="flex-1"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
