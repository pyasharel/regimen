import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Download, Share2, Copy, Camera, Image as ImageIcon, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { format } from "date-fns";
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';
import logoGradient from "@/assets/logo-gradient.png";
import { PhotoPreviewModal } from "@/components/PhotoPreviewModal";

interface PhotoEntry {
  id: string;
  photo_url: string;
  entry_date: string;
}

export default function PhotoCompareScreen() {
  const navigate = useNavigate();
  const [selectedPhotos, setSelectedPhotos] = useState<{ 
    before: { url: string; date: string } | null; 
    after: { url: string; date: string } | null;
  }>({
    before: null,
    after: null,
  });
  const [availablePhotos, setAvailablePhotos] = useState<PhotoEntry[]>([]);
  const [showPhotoSelector, setShowPhotoSelector] = useState<'before' | 'after' | null>(null);
  const [showShareSheet, setShowShareSheet] = useState(false);
  const [photoToDelete, setPhotoToDelete] = useState<PhotoEntry | null>(null);
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);
  const comparisonRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchPhotos();
  }, []);

  const fetchPhotos = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('progress_entries')
      .select('id, photo_url, entry_date')
      .eq('user_id', user.id)
      .not('photo_url', 'is', null)
      .order('entry_date', { ascending: false });

    if (error) {
      console.error('Error fetching photos:', error);
      return;
    }

    setAvailablePhotos(data || []);
  };

  const getPhotoUrl = (photoPath: string) => {
    const { data } = supabase.storage
      .from('progress-photos')
      .getPublicUrl(photoPath);
    return data.publicUrl;
  };

  const handlePhotoSelection = (photo: PhotoEntry, type: 'before' | 'after') => {
    setSelectedPhotos(prev => ({ 
      ...prev, 
      [type]: { 
        url: getPhotoUrl(photo.photo_url), 
        date: photo.entry_date 
      } 
    }));
    setShowPhotoSelector(null);
  };

  const handleDeletePhoto = async () => {
    if (!photoToDelete) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('progress-photos')
        .remove([photoToDelete.photo_url]);

      if (storageError) throw storageError;

      // Delete from database
      const { error: dbError } = await supabase
        .from('progress_entries')
        .delete()
        .eq('id', photoToDelete.id);

      if (dbError) throw dbError;

      // Clear from selected photos if it was selected
      if (selectedPhotos.before?.url === getPhotoUrl(photoToDelete.photo_url)) {
        setSelectedPhotos(prev => ({ ...prev, before: null }));
      }
      if (selectedPhotos.after?.url === getPhotoUrl(photoToDelete.photo_url)) {
        setSelectedPhotos(prev => ({ ...prev, after: null }));
      }

      // Refresh photos list
      await fetchPhotos();
      
      toast.success("Photo deleted successfully");
      setPhotoToDelete(null);
    } catch (error) {
      console.error('Error deleting photo:', error);
      toast.error("Failed to delete photo");
    }
  };

  const handleDeletePhotoFromPreview = async (entryId: string) => {
    try {
      const photoEntry = availablePhotos.find(p => p.id === entryId);
      if (!photoEntry) return;

      // Delete from storage
      const { error: storageError } = await supabase
        .storage
        .from('progress-photos')
        .remove([photoEntry.photo_url]);

      if (storageError) throw storageError;

      // Delete from database
      const { error: dbError } = await supabase
        .from('progress_entries')
        .delete()
        .eq('id', entryId);

      if (dbError) throw dbError;

      // Clear from selected photos if it was selected
      if (selectedPhotos.before?.url === getPhotoUrl(photoEntry.photo_url)) {
        setSelectedPhotos(prev => ({ ...prev, before: null }));
      }
      if (selectedPhotos.after?.url === getPhotoUrl(photoEntry.photo_url)) {
        setSelectedPhotos(prev => ({ ...prev, after: null }));
      }

      // Refresh photos list
      await fetchPhotos();
      
      toast.success("Photo deleted successfully");
      setPreviewPhoto(null);
    } catch (error) {
      console.error('Error deleting photo:', error);
      toast.error("Failed to delete photo");
    }
  };

  const handleDownloadPhoto = async (photoUrl: string, date: string) => {
    try {
      const response = await fetch(photoUrl);
      const blob = await response.blob();
      
      if (Capacitor.isNativePlatform()) {
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = async () => {
          const base64Data = (reader.result as string).split(',')[1];
          const fileName = `regimen-photo-${date}.png`;
          
          await Filesystem.writeFile({
            path: fileName,
            data: base64Data,
            directory: Directory.Documents
          });
          
          toast.success("Photo saved to Documents!");
        };
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `regimen-photo-${date}.png`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success("Photo downloaded!");
      }
    } catch (error) {
      console.error('Error downloading photo:', error);
      toast.error("Failed to download photo");
    }
  };

  const createComparisonBlob = async (): Promise<Blob | null> => {
    if (!selectedPhotos.before || !selectedPhotos.after) {
      toast.error("Please select both before and after photos");
      return null;
    }

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const beforeImg = new Image();
    const afterImg = new Image();
    beforeImg.crossOrigin = "anonymous";
    afterImg.crossOrigin = "anonymous";

    beforeImg.src = selectedPhotos.before.url;
    afterImg.src = selectedPhotos.after.url;

    await Promise.all([
      new Promise(resolve => beforeImg.onload = resolve),
      new Promise(resolve => afterImg.onload = resolve)
    ]);

    // Create a side-by-side comparison with proper aspect ratios
    const targetWidth = 1080; // Instagram-friendly width
    const targetHeight = 1080; // Square format for best compatibility
    
    // Calculate dimensions to fit both images side by side
    const halfWidth = targetWidth / 2;
    const padding = 60;
    const labelSpace = 100;
    
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    
    // White background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Calculate image dimensions to fit in their half while maintaining aspect ratio
    const beforeAspect = beforeImg.width / beforeImg.height;
    const afterAspect = afterImg.width / afterImg.height;
    
    const availableHeight = targetHeight - labelSpace - padding * 2;
    const availableWidth = halfWidth - padding * 1.5;
    
    // Calculate dimensions for before image
    let beforeWidth = availableWidth;
    let beforeHeight = beforeWidth / beforeAspect;
    if (beforeHeight > availableHeight) {
      beforeHeight = availableHeight;
      beforeWidth = beforeHeight * beforeAspect;
    }
    
    // Calculate dimensions for after image
    let afterWidth = availableWidth;
    let afterHeight = afterWidth / afterAspect;
    if (afterHeight > availableHeight) {
      afterHeight = availableHeight;
      afterWidth = afterHeight * afterAspect;
    }
    
    // Center images in their respective halves
    const beforeX = (halfWidth - beforeWidth) / 2;
    const afterX = halfWidth + (halfWidth - afterWidth) / 2;
    const imageY = labelSpace + padding;
    
    // Draw images
    ctx.drawImage(beforeImg, beforeX, imageY, beforeWidth, beforeHeight);
    ctx.drawImage(afterImg, afterX, imageY, afterWidth, afterHeight);
    
    // Add vertical divider line
    ctx.strokeStyle = '#E0E0E0';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(halfWidth, labelSpace);
    ctx.lineTo(halfWidth, targetHeight - 80);
    ctx.stroke();
    
    // Add labels with dates at the top
    ctx.fillStyle = '#FF6F61';
    ctx.font = 'bold 36px Inter, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('BEFORE', halfWidth / 2, 50);
    ctx.fillText('AFTER', halfWidth + halfWidth / 2, 50);
    
    // Add date stamps
    ctx.fillStyle = '#666666';
    ctx.font = '20px Inter, -apple-system, sans-serif';
    ctx.fillText(format(new Date(selectedPhotos.before.date), 'MMM d, yyyy'), halfWidth / 2, 85);
    ctx.fillText(format(new Date(selectedPhotos.after.date), 'MMM d, yyyy'), halfWidth + halfWidth / 2, 85);
    
    // Add logo watermark in bottom right
    const logo = new Image();
    logo.crossOrigin = "anonymous";
    logo.src = logoGradient;
    
    await new Promise(resolve => {
      logo.onload = () => {
        const logoWidth = 120;
        const logoHeight = (logo.height / logo.width) * logoWidth;
        ctx.globalAlpha = 0.4;
        ctx.drawImage(logo, canvas.width - logoWidth - 30, canvas.height - logoHeight - 30, logoWidth, logoHeight);
        ctx.globalAlpha = 1.0;
        
        // Add text watermark
        ctx.fillStyle = '#000000';
        ctx.globalAlpha = 0.35;
        ctx.font = 'bold 18px Inter, -apple-system, sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText('getregimen.app', canvas.width - 30, canvas.height - 15);
        ctx.globalAlpha = 1.0;
        resolve(true);
      };
      // Fallback if logo doesn't load
      logo.onerror = () => {
        ctx.fillStyle = '#000000';
        ctx.globalAlpha = 0.35;
        ctx.font = 'bold 20px Inter, -apple-system, sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText('REGIMEN', canvas.width - 30, canvas.height - 30);
        ctx.fillText('getregimen.app', canvas.width - 30, canvas.height - 10);
        ctx.globalAlpha = 1.0;
        resolve(true);
      };
    });

    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob), 'image/png');
    });
  };

  const handleShare = async () => {
    setShowShareSheet(true);
  };

  const handleShareOption = async (option: 'download' | 'copy' | 'native') => {
    const blob = await createComparisonBlob();
    if (!blob) return;

    if (option === 'download') {
      if (Capacitor.isNativePlatform()) {
        // Native mobile download
        try {
          const reader = new FileReader();
          reader.readAsDataURL(blob);
          reader.onloadend = async () => {
            const base64Data = (reader.result as string).split(',')[1];
            const fileName = `regimen-transformation-${Date.now()}.png`;
            
            await Filesystem.writeFile({
              path: fileName,
              data: base64Data,
              directory: Directory.Documents
            });
            
            toast.success("Image saved to Documents folder!");
          };
        } catch (err) {
          console.error('Error saving file:', err);
          toast.error("Failed to save image");
        }
      } else {
        // Web download
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `regimen-transformation-${Date.now()}.png`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success("Comparison image downloaded!");
      }
    } else if (option === 'copy') {
      try {
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob })
        ]);
        toast.success("Image copied to clipboard!");
      } catch (err) {
        toast.error("Failed to copy image");
      }
    } else if (option === 'native') {
      if (Capacitor.isNativePlatform()) {
        // Use Capacitor Share plugin for native
        try {
          const reader = new FileReader();
          reader.readAsDataURL(blob);
          reader.onloadend = async () => {
            const base64Data = (reader.result as string).split(',')[1];
            const fileName = `regimen-transformation-${Date.now()}.png`;
            
            // Save temporarily
            const file = await Filesystem.writeFile({
              path: fileName,
              data: base64Data,
              directory: Directory.Cache
            });
            
            // Share the file
            await Share.share({
              title: 'My Transformation - REGIMEN',
              text: 'Check out my progress using REGIMEN!',
              url: file.uri,
            });
            
            toast.success("Shared successfully!");
          };
        } catch (err) {
          if ((err as Error).name !== 'AbortError') {
            console.error('Share error:', err);
            toast.error("Sharing failed");
          }
        }
      } else if (navigator.share) {
        // Web share
        try {
          const file = new File([blob], 'transformation.png', { type: 'image/png' });
          await navigator.share({
            files: [file],
            title: 'My Transformation - REGIMEN',
            text: 'Check out my progress using REGIMEN!',
          });
          toast.success("Shared successfully!");
        } catch (err) {
          if ((err as Error).name !== 'AbortError') {
            toast.error("Sharing failed");
          }
        }
      } else {
        toast.info("Share feature not supported on this device");
      }
    }
    
    setShowShareSheet(false);
  };


  return (
    <div className="min-h-screen bg-background pb-24 safe-top">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b border-border px-4 py-4 safe-top">
        <div className="flex items-center gap-3 max-w-2xl mx-auto">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/progress")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold">Photo Comparison</h1>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* All Photos Carousel */}
        {availablePhotos.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground">All Photos</h3>
            <div className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory">
              {availablePhotos.map((photo) => {
                // Parse as local date to avoid timezone shifts
                const [year, month, day] = photo.entry_date.split('-').map(Number);
                const localDate = new Date(year, month - 1, day);
                
                return (
                  <div 
                    key={photo.id} 
                    className="flex-shrink-0 snap-center cursor-pointer"
                    onClick={() => {
                      setPreviewPhoto(photo.id);
                    }}
                  >
                    <img
                      src={getPhotoUrl(photo.photo_url)}
                      alt={`Progress from ${format(localDate, 'MMM d, yyyy')}`}
                      className="h-32 w-32 object-cover rounded-lg border-2 border-border hover:border-primary transition-colors"
                    />
                    <p className="text-xs text-center text-muted-foreground mt-1">
                      {format(localDate, 'MMM d')}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Photo Selection */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="p-4">
            <h3 className="font-semibold text-center mb-3 text-foreground">Before</h3>
            {selectedPhotos.before ? (
              <div className="relative">
                <img 
                  src={selectedPhotos.before.url} 
                  alt="Before" 
                  className="w-full h-64 object-cover rounded-lg mb-2"
                />
                <p className="text-xs text-center text-muted-foreground mb-3">
                  {format(new Date(selectedPhotos.before.date), 'MMM d, yyyy')}
                </p>
              </div>
            ) : (
              <div className="w-full h-64 bg-muted rounded-lg mb-3 flex items-center justify-center text-muted-foreground text-sm">
                Select a photo
              </div>
            )}
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setShowPhotoSelector('before')}
            >
              {selectedPhotos.before ? 'Change Photo' : 'Select Photo'}
            </Button>
          </Card>

          <Card className="p-4">
            <h3 className="font-semibold text-center mb-3 text-foreground">After</h3>
            {selectedPhotos.after ? (
              <div className="relative">
                <img 
                  src={selectedPhotos.after.url} 
                  alt="After" 
                  className="w-full h-64 object-cover rounded-lg mb-2"
                />
                <p className="text-xs text-center text-muted-foreground mb-3">
                  {format(new Date(selectedPhotos.after.date), 'MMM d, yyyy')}
                </p>
              </div>
            ) : (
              <div className="w-full h-64 bg-muted rounded-lg mb-3 flex items-center justify-center text-muted-foreground text-sm">
                Select a photo
              </div>
            )}
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setShowPhotoSelector('after')}
            >
              {selectedPhotos.after ? 'Change Photo' : 'Select Photo'}
            </Button>
          </Card>
        </div>

        {/* Share Button */}
        {selectedPhotos.before && selectedPhotos.after && (
          <div className="space-y-3">
            <div className="text-center text-sm text-muted-foreground">
              Ready to share your transformation
            </div>
            <Button
              onClick={handleShare}
              className="w-full"
              size="lg"
            >
              <Share2 className="h-5 w-5 mr-2" />
              Share Comparison
            </Button>
          </div>
        )}
      </div>

      {/* Photo Selector Dialog */}
      <Dialog open={showPhotoSelector !== null} onOpenChange={() => setShowPhotoSelector(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Select {showPhotoSelector === 'before' ? 'Before' : 'After'} Photo
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 mt-4">
            {availablePhotos
              .filter(photo => {
                // Don't show already selected photos in the picker
                const isSelectedBefore = selectedPhotos.before?.url === getPhotoUrl(photo.photo_url);
                const isSelectedAfter = selectedPhotos.after?.url === getPhotoUrl(photo.photo_url);
                return !isSelectedBefore && !isSelectedAfter;
              })
              .map((photo) => {
                // Parse as local date to avoid timezone shifts
                const [year, month, day] = photo.entry_date.split('-').map(Number);
                const localDate = new Date(year, month - 1, day);
                
                return (
                  <Card
                    key={photo.id}
                    className="relative hover:ring-2 hover:ring-primary transition-all group"
                  >
                    <div 
                      className="cursor-pointer"
                      onClick={() => handlePhotoSelection(photo, showPhotoSelector!)}
                    >
                      <img
                        src={getPhotoUrl(photo.photo_url)}
                        alt={`Progress photo from ${format(localDate, 'MMM d, yyyy')}`}
                        className="w-full h-48 object-cover rounded-t-lg"
                      />
                      <div className="p-3 text-center">
                        <p className="text-sm font-medium">
                          {format(localDate, 'MMM d, yyyy')}
                        </p>
                      </div>
                    </div>
                  <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      size="icon"
                      variant="secondary"
                      className="h-8 w-8 shadow-lg"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownloadPhoto(getPhotoUrl(photo.photo_url), photo.entry_date);
                      }}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="destructive"
                      className="h-8 w-8 shadow-lg"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPhotoToDelete(photo);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
          {availablePhotos.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <p>No photos available. Upload photos from the Progress screen first.</p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Share Sheet */}
      <Sheet open={showShareSheet} onOpenChange={setShowShareSheet}>
        <SheetContent side="bottom" className="h-auto">
          <SheetHeader>
            <SheetTitle>Share Comparison</SheetTitle>
          </SheetHeader>
          <div className="grid gap-3 mt-6 pb-6">
            <Button
              variant="outline"
              className="w-full justify-start h-14"
              onClick={() => handleShareOption('download')}
            >
              <Download className="h-5 w-5 mr-3" />
              Download Image
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start h-14"
              onClick={() => handleShareOption('copy')}
            >
              <Copy className="h-5 w-5 mr-3" />
              Copy to Clipboard
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start h-14"
              onClick={() => handleShareOption('native')}
            >
              <Share2 className="h-5 w-5 mr-3" />
              Share to Apps
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation */}
      <AlertDialog open={!!photoToDelete} onOpenChange={() => setPhotoToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Photo?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this progress photo. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeletePhoto} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Photo Preview Modal */}
      {previewPhoto && (
        <PhotoPreviewModal
          open={!!previewPhoto}
          onClose={() => setPreviewPhoto(null)}
          photoUrl={getPhotoUrl(availablePhotos.find(p => p.id === previewPhoto)?.photo_url || '')}
          entryId={previewPhoto}
          onDelete={handleDeletePhotoFromPreview}
        />
      )}
    </div>
  );
}
