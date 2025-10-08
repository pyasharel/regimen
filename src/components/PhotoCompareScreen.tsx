import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Download, Share2, Copy, Camera, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { format } from "date-fns";
import logoMark from "@/assets/logo-regimen-mark.png";

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

    const targetHeight = 800;
    const aspectBefore = beforeImg.width / beforeImg.height;
    const aspectAfter = afterImg.width / afterImg.height;
    const widthBefore = targetHeight * aspectBefore;
    const widthAfter = targetHeight * aspectAfter;
    const padding = 40;
    const watermarkHeight = 80;

    canvas.width = widthBefore + widthAfter + padding * 3;
    canvas.height = targetHeight + padding * 2 + watermarkHeight;

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.drawImage(beforeImg, padding, padding, widthBefore, targetHeight);
    ctx.drawImage(afterImg, widthBefore + padding * 2, padding, widthAfter, targetHeight);

    // Add labels with dates
    ctx.fillStyle = '#FF6F61';
    ctx.font = 'bold 28px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('BEFORE', padding + widthBefore / 2, padding - 30);
    ctx.fillText('AFTER', widthBefore + padding * 2 + widthAfter / 2, padding - 30);

    // Add date stamps
    ctx.fillStyle = '#666666';
    ctx.font = '18px Inter, sans-serif';
    ctx.fillText(format(new Date(selectedPhotos.before.date), 'MMM d, yyyy'), padding + widthBefore / 2, padding - 5);
    ctx.fillText(format(new Date(selectedPhotos.after.date), 'MMM d, yyyy'), widthBefore + padding * 2 + widthAfter / 2, padding - 5);

    // Add watermark
    ctx.fillStyle = '#000000';
    ctx.globalAlpha = 0.15;
    ctx.font = 'bold 20px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('REGIMEN • regimen.app', canvas.width / 2, canvas.height - 30);
    ctx.globalAlpha = 1.0;

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
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `regimen-transformation-${Date.now()}.png`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Comparison image downloaded!");
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
      if (navigator.share) {
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
      <div className="sticky top-0 z-10 bg-background border-b border-border px-4 py-4">
        <div className="flex items-center gap-3">
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
        {/* Photo Selection */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="p-4">
            <h3 className="font-semibold text-center mb-3 text-foreground">Before</h3>
            {selectedPhotos.before ? (
              <div className="relative">
                <img 
                  src={selectedPhotos.before.url} 
                  alt="Before" 
                  className="w-full h-64 object-cover rounded-lg mb-3"
                />
                <p className="text-xs text-center text-muted-foreground mb-3">
                  {format(new Date(selectedPhotos.before.date), 'MMM d, yyyy')}
                </p>
              </div>
            ) : (
              <div className="w-full h-64 bg-muted rounded-lg mb-3 flex items-center justify-center text-muted-foreground">
                No photo selected
              </div>
            )}
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setShowPhotoSelector('before')}
            >
              Select Before
            </Button>
          </Card>

          <Card className="p-4">
            <h3 className="font-semibold text-center mb-3 text-foreground">After</h3>
            {selectedPhotos.after ? (
              <div className="relative">
                <img 
                  src={selectedPhotos.after.url} 
                  alt="After" 
                  className="w-full h-64 object-cover rounded-lg mb-3"
                />
                <p className="text-xs text-center text-muted-foreground mb-3">
                  {format(new Date(selectedPhotos.after.date), 'MMM d, yyyy')}
                </p>
              </div>
            ) : (
              <div className="w-full h-64 bg-muted rounded-lg mb-3 flex items-center justify-center text-muted-foreground">
                No photo selected
              </div>
            )}
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setShowPhotoSelector('after')}
            >
              Select After
            </Button>
          </Card>
        </div>

        {/* Preview Comparison */}
        {selectedPhotos.before && selectedPhotos.after && (
          <Card className="p-6" ref={comparisonRef}>
            <h3 className="font-semibold mb-4 text-center">Preview</h3>
            <div className="relative">
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <p className="text-sm font-semibold text-primary text-center mb-1">BEFORE</p>
                  <p className="text-xs text-muted-foreground text-center mb-2">
                    {format(new Date(selectedPhotos.before.date), 'MMM d, yyyy')}
                  </p>
                  <img 
                    src={selectedPhotos.before.url} 
                    alt="Before comparison" 
                    className="w-full rounded-lg"
                  />
                </div>
                <div>
                  <p className="text-sm font-semibold text-primary text-center mb-1">AFTER</p>
                  <p className="text-xs text-muted-foreground text-center mb-2">
                    {format(new Date(selectedPhotos.after.date), 'MMM d, yyyy')}
                  </p>
                  <img 
                    src={selectedPhotos.after.url} 
                    alt="After comparison" 
                    className="w-full rounded-lg"
                  />
                </div>
              </div>
              {/* Subtle watermark */}
              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground/40 pt-2 border-t border-border/30">
                <img src={logoMark} alt="" className="h-4 w-4 opacity-40" />
                <span>REGIMEN • regimen.app</span>
              </div>
            </div>
          </Card>
        )}

        {/* Share Button */}
        <Button
          onClick={handleShare}
          disabled={!selectedPhotos.before || !selectedPhotos.after}
          className="w-full"
          size="lg"
        >
          <Share2 className="h-5 w-5 mr-2" />
          Share Comparison
        </Button>
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
            {availablePhotos.map((photo) => (
              <Card
                key={photo.id}
                className="cursor-pointer hover:ring-2 hover:ring-primary transition-all"
                onClick={() => handlePhotoSelection(photo, showPhotoSelector!)}
              >
                <img
                  src={getPhotoUrl(photo.photo_url)}
                  alt={`Progress photo from ${format(new Date(photo.entry_date), 'MMM d, yyyy')}`}
                  className="w-full h-48 object-cover rounded-t-lg"
                />
                <div className="p-3 text-center">
                  <p className="text-sm font-medium">
                    {format(new Date(photo.entry_date), 'MMM d, yyyy')}
                  </p>
                </div>
              </Card>
            ))}
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
    </div>
  );
}
