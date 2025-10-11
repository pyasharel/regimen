import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Trash2, X } from "lucide-react";
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';
import { toast } from "sonner";

interface PhotoPreviewModalProps {
  open: boolean;
  onClose: () => void;
  photoUrl: string;
  entryId: string;
  onDelete: (entryId: string) => void;
}

export const PhotoPreviewModal = ({ open, onClose, photoUrl, entryId, onDelete }: PhotoPreviewModalProps) => {
  const handleDownload = async () => {
    if (Capacitor.isNativePlatform()) {
      try {
        // On mobile, use Share API to save to camera roll
        await Share.share({
          url: photoUrl,
        });
        toast.success("Photo shared");
      } catch (error) {
        console.error("Error sharing photo:", error);
        toast.error("Failed to share photo");
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

          {/* Action buttons */}
          <div className="flex gap-2 p-4 bg-background border-t">
            <Button
              onClick={handleDownload}
              variant="outline"
              className="flex-1"
            >
              <Download className="h-4 w-4 mr-2" />
              {Capacitor.isNativePlatform() ? 'Share' : 'Download'}
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
      </DialogContent>
    </Dialog>
  );
};
