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
import { safeFormatDate, createLocalDate } from "@/utils/dateUtils";
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';
import logoSquare from "@/assets/logo-regimen-vertical-new.png";
import { PhotoPreviewModal } from "@/components/PhotoPreviewModal";
import { getSignedUrl } from "@/utils/storageUtils";

interface PhotoEntry {
  id: string;
  photo_url: string;
  entry_date: string;
  signedUrl?: string; // Cached signed URL
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
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [showAllPhotosView, setShowAllPhotosView] = useState(false);
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
      .order('entry_date', { ascending: true }); // Oldest to newest

    if (error) {
      console.error('Error fetching photos:', error);
      return;
    }

    // Generate signed URLs for all photos
    const photosWithUrls = await Promise.all(
      (data || []).map(async (photo) => ({
        ...photo,
        signedUrl: await getSignedUrl('progress-photos', photo.photo_url) || ''
      }))
    );

    setAvailablePhotos(photosWithUrls);
    
    // Auto-scroll to the right (newest photo) after loading
    setTimeout(() => {
      const container = document.querySelector('.overflow-x-auto');
      if (container) {
        container.scrollLeft = container.scrollWidth;
      }
    }, 100);
  };

  const getPhotoUrl = (photoPath: string) => {
    // Find cached signed URL
    const photo = availablePhotos.find(p => p.photo_url === photoPath);
    return photo?.signedUrl || '';
  };

  const handlePhotoSelection = async (photo: PhotoEntry, type: 'before' | 'after') => {
    const url = photo.signedUrl || '';
    const newSelection = {
      ...selectedPhotos, 
      [type]: { 
        url: url || '', 
        date: photo.entry_date 
      } 
    };
    setSelectedPhotos(newSelection);
    setShowPhotoSelector(null);
    
    // Generate preview if both photos are now selected
    if (newSelection.before && newSelection.after) {
      await generatePreview(newSelection);
    }
  };

  const generatePreview = async (photos: typeof selectedPhotos) => {
    if (!photos.before || !photos.after) return;
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const beforeImg = new Image();
    const afterImg = new Image();
    beforeImg.crossOrigin = "anonymous";
    afterImg.crossOrigin = "anonymous";

    beforeImg.src = photos.before.url;
    afterImg.src = photos.after.url;

    await Promise.all([
      new Promise(resolve => beforeImg.onload = resolve),
      new Promise(resolve => afterImg.onload = resolve)
    ]);

    // Create a side-by-side comparison - Instagram friendly 1080x1080
    const targetWidth = 1080;
    const targetHeight = 1080;
    
    const halfWidth = targetWidth / 2;
    const padding = 40;
    const labelSpace = 80;
    const bottomSpace = 50;
    
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    const beforeAspect = beforeImg.width / beforeImg.height;
    const afterAspect = afterImg.width / afterImg.height;
    
    const availableHeight = targetHeight - labelSpace - bottomSpace - padding;
    const availableWidth = halfWidth - padding;
    
    let beforeWidth = availableWidth;
    let beforeHeight = beforeWidth / beforeAspect;
    if (beforeHeight > availableHeight) {
      beforeHeight = availableHeight;
      beforeWidth = beforeHeight * beforeAspect;
    }
    
    let afterWidth = availableWidth;
    let afterHeight = afterWidth / afterAspect;
    if (afterHeight > availableHeight) {
      afterHeight = availableHeight;
      afterWidth = afterHeight * afterAspect;
    }
    
    const beforeX = (halfWidth - beforeWidth) / 2;
    const afterX = halfWidth + (halfWidth - afterWidth) / 2;
    const imageY = labelSpace + padding;
    
    ctx.drawImage(beforeImg, beforeX, imageY, beforeWidth, beforeHeight);
    ctx.drawImage(afterImg, afterX, imageY, afterWidth, afterHeight);
    
    ctx.strokeStyle = '#333333';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(halfWidth, labelSpace);
    ctx.lineTo(halfWidth, targetHeight - bottomSpace);
    ctx.stroke();
    
    ctx.fillStyle = '#FF6F61';
    ctx.font = 'bold 32px Inter, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('BEFORE', halfWidth / 2, 45);
    ctx.fillText('AFTER', halfWidth + halfWidth / 2, 45);
    
    ctx.fillStyle = '#AAAAAA';
    ctx.font = '18px Inter, -apple-system, sans-serif';
    ctx.fillText(safeFormatDate(photos.before.date, 'MMM d, yyyy'), halfWidth / 2, 72);
    ctx.fillText(safeFormatDate(photos.after.date, 'MMM d, yyyy'), halfWidth + halfWidth / 2, 72);
    
    const logo = new Image();
    logo.crossOrigin = "anonymous";
    logo.src = logoSquare;
    
    await new Promise(resolve => {
      logo.onload = () => {
        const logoSize = 80;
        const logoX = (canvas.width - logoSize) / 2;
        const logoY = canvas.height - logoSize - 30;
        
        ctx.globalAlpha = 0.9;
        ctx.drawImage(logo, logoX, logoY, logoSize, logoSize);
        ctx.globalAlpha = 1.0;
        resolve(true);
      };
      logo.onerror = () => {
        ctx.fillStyle = '#FFFFFF';
        ctx.globalAlpha = 0.7;
        ctx.font = 'bold 16px Inter, -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('REGIMEN', canvas.width / 2, canvas.height - 25);
        ctx.globalAlpha = 1.0;
        resolve(true);
      };
    });

    setPreviewImageUrl(canvas.toDataURL('image/png'));
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

    // Create a side-by-side comparison - Instagram friendly 1080x1080
    const targetWidth = 1080;
    const targetHeight = 1080;
    
    // Calculate dimensions
    const halfWidth = targetWidth / 2;
    const padding = 40; // Reduced padding for tighter layout
    const labelSpace = 80; // Reduced label space
    const bottomSpace = 60; // Reduced bottom space
    
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    
    // Black background to match logo
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Calculate image dimensions to fit in their half while maintaining aspect ratio
    const beforeAspect = beforeImg.width / beforeImg.height;
    const afterAspect = afterImg.width / afterImg.height;
    
    const availableHeight = targetHeight - labelSpace - bottomSpace - padding;
    const availableWidth = halfWidth - padding;
    
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
    
    // Add subtle vertical divider line
    ctx.strokeStyle = '#333333';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(halfWidth, labelSpace);
    ctx.lineTo(halfWidth, targetHeight - bottomSpace);
    ctx.stroke();
    
    // Add labels with dates at the top
    ctx.fillStyle = '#FF6F61';
    ctx.font = 'bold 32px Inter, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('BEFORE', halfWidth / 2, 45);
    ctx.fillText('AFTER', halfWidth + halfWidth / 2, 45);
    
    // Add date stamps
    ctx.fillStyle = '#AAAAAA';
    ctx.font = '18px Inter, -apple-system, sans-serif';
    ctx.fillText(safeFormatDate(selectedPhotos.before.date, 'MMM d, yyyy'), halfWidth / 2, 72);
    ctx.fillText(safeFormatDate(selectedPhotos.after.date, 'MMM d, yyyy'), halfWidth + halfWidth / 2, 72);
    
    // Add logo centered at the bottom between the two photos
    const logo = new Image();
    logo.crossOrigin = "anonymous";
    logo.src = logoSquare;
    
    await new Promise(resolve => {
      logo.onload = () => {
        const logoSize = 120;
        const logoX = (canvas.width - logoSize) / 2;
        const logoY = canvas.height - logoSize - 20;
        
        ctx.globalAlpha = 0.95;
        ctx.drawImage(logo, logoX, logoY, logoSize, logoSize);
        ctx.globalAlpha = 1.0;
        resolve(true);
      };
      // Fallback if logo doesn't load
      logo.onerror = () => {
        ctx.fillStyle = '#FFFFFF';
        ctx.globalAlpha = 0.7;
        ctx.font = 'bold 18px Inter, -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('REGIMEN', canvas.width / 2, canvas.height - 25);
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
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b border-border px-4 py-4 mt-5">
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
        {/* All Photos Gallery */}
        {availablePhotos.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold">All Photos</h2>
            <div className="grid grid-cols-3 gap-3">
              {availablePhotos.map((photo) => {
                const localDate = createLocalDate(photo.entry_date);
                if (!localDate) return null;
                
                return (
                  <div
                    key={photo.id}
                    className="relative group"
                  >
                    <div 
                      className="cursor-pointer"
                      onClick={() => setPreviewPhoto(photo.id)}
                    >
                      <img
                        src={getPhotoUrl(photo.photo_url)}
                        alt={`Progress photo from ${safeFormatDate(localDate, 'MMM d, yyyy')}`}
                        className="w-full aspect-square object-cover rounded-lg"
                      />
                      <div className="mt-1.5 text-center">
                        <p className="text-xs font-medium text-muted-foreground">
                          {safeFormatDate(localDate, 'MMM d, yyyy')}
                        </p>
                      </div>
                    </div>
                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        size="icon"
                        variant="secondary"
                        className="h-7 w-7 shadow-md bg-background/90 backdrop-blur-sm hover:bg-background"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownloadPhoto(getPhotoUrl(photo.photo_url), photo.entry_date);
                        }}
                      >
                        <Download className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="secondary"
                        className="h-7 w-7 shadow-md bg-background/90 backdrop-blur-sm hover:bg-destructive hover:text-destructive-foreground"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPhotoToDelete(photo);
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Compare Progress Header */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Compare Your Progress</h2>
          
          {/* Photo Selection or Preview */}
          {!previewImageUrl ? (
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
                      {safeFormatDate(selectedPhotos.before.date, 'MMM d, yyyy')}
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
                      {safeFormatDate(selectedPhotos.after.date, 'MMM d, yyyy')}
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
          ) : (
            <div className="space-y-4">
              <div>
                <img 
                  src={previewImageUrl} 
                  alt="Comparison preview" 
                  className="w-full rounded-lg border-2 border-border"
                />
              </div>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setPreviewImageUrl(null);
                    setSelectedPhotos({ before: null, after: null });
                  }}
                  className="flex-1"
                >
                  Change Photos
                </Button>
                <Button
                  onClick={handleShare}
                  className="flex-1"
                >
                  <Share2 className="h-5 w-5 mr-2" />
                  Share
                </Button>
              </div>
            </div>
          )}
        </div>
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
                const localDate = createLocalDate(photo.entry_date);
                if (!localDate) return null;
                
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
                        alt={`Progress photo from ${safeFormatDate(localDate, 'MMM d, yyyy')}`}
                        className="w-full h-48 object-cover rounded-t-lg"
                      />
                      <div className="p-3 text-center">
                        <p className="text-sm font-medium">
                          {safeFormatDate(localDate, 'MMM d, yyyy')}
                        </p>
                      </div>
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
              <Download className="h-5 w-5 mr-3 text-primary" />
              Download Image
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start h-14"
              onClick={() => handleShareOption('native')}
            >
              <Share2 className="h-5 w-5 mr-3 text-primary" />
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

      {/* All Photos View Dialog */}
      <Dialog open={showAllPhotosView} onOpenChange={setShowAllPhotosView}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>All Photos</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-3 gap-4 mt-4">
            {availablePhotos.map((photo) => {
              const localDate = createLocalDate(photo.entry_date);
              if (!localDate) return null;
              
              return (
                <Card
                  key={photo.id}
                  className="relative group overflow-hidden"
                >
                  <div 
                    className="cursor-pointer"
                    onClick={() => {
                      setPreviewPhoto(photo.id);
                      setShowAllPhotosView(false);
                    }}
                  >
                    <img
                      src={getPhotoUrl(photo.photo_url)}
                      alt={`Progress photo from ${safeFormatDate(localDate, 'MMM d, yyyy')}`}
                      className="w-full aspect-square object-cover"
                    />
                    <div className="p-3 text-center bg-card">
                      <p className="text-sm font-medium">
                        {safeFormatDate(localDate, 'MMM d, yyyy')}
                      </p>
                    </div>
                  </div>
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <Button
                      size="icon"
                      variant="secondary"
                      className="h-10 w-10 shadow-lg"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownloadPhoto(getPhotoUrl(photo.photo_url), photo.entry_date);
                      }}
                    >
                      <Download className="h-5 w-5 text-primary" />
                    </Button>
                    <Button
                      size="icon"
                      variant="destructive"
                      className="h-10 w-10 shadow-lg"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPhotoToDelete(photo);
                        setShowAllPhotosView(false);
                      }}
                    >
                      <Trash2 className="h-5 w-5" />
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
          {availablePhotos.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <Camera className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No photos yet. Add photos from the Progress screen to get started.</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
