import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Download, Share2 } from "lucide-react";
import { toast } from "sonner";
import logoMark from "@/assets/logo-regimen-mark.png";

export default function PhotoCompareScreen() {
  const navigate = useNavigate();
  const [selectedPhotos, setSelectedPhotos] = useState<{ before: string | null; after: string | null }>({
    before: null,
    after: null,
  });
  const comparisonRef = useRef<HTMLDivElement>(null);

  const handlePhotoSelect = (type: 'before' | 'after', event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedPhotos(prev => ({ ...prev, [type]: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleShare = async () => {
    if (!selectedPhotos.before || !selectedPhotos.after) {
      toast.error("Please select both before and after photos");
      return;
    }

    // For now, we'll use the Web Share API if available
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'My Transformation - REGIMEN',
          text: 'Check out my progress using REGIMEN!',
          url: 'https://regimen.app'
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
  };

  const handleDownload = async () => {
    if (!selectedPhotos.before || !selectedPhotos.after || !comparisonRef.current) {
      toast.error("Please select both before and after photos");
      return;
    }

    // Create a canvas to combine the images
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Load images
    const beforeImg = new Image();
    const afterImg = new Image();

    beforeImg.src = selectedPhotos.before;
    afterImg.src = selectedPhotos.after;

    await Promise.all([
      new Promise(resolve => beforeImg.onload = resolve),
      new Promise(resolve => afterImg.onload = resolve)
    ]);

    // Set canvas size (side by side comparison)
    const targetHeight = 800;
    const aspectBefore = beforeImg.width / beforeImg.height;
    const aspectAfter = afterImg.width / afterImg.height;
    const widthBefore = targetHeight * aspectBefore;
    const widthAfter = targetHeight * aspectAfter;
    const padding = 40;
    const watermarkHeight = 60;

    canvas.width = widthBefore + widthAfter + padding * 3;
    canvas.height = targetHeight + padding * 2 + watermarkHeight;

    // White background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw before image
    ctx.drawImage(beforeImg, padding, padding, widthBefore, targetHeight);

    // Draw after image
    ctx.drawImage(afterImg, widthBefore + padding * 2, padding, widthAfter, targetHeight);

    // Add labels
    ctx.fillStyle = '#FF6F61';
    ctx.font = 'bold 32px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('BEFORE', padding + widthBefore / 2, padding - 10);
    ctx.fillText('AFTER', widthBefore + padding * 2 + widthAfter / 2, padding - 10);

    // Add watermark at bottom
    ctx.fillStyle = '#000000';
    ctx.globalAlpha = 0.15;
    ctx.font = 'bold 20px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('REGIMEN • regimen.app', canvas.width / 2, canvas.height - 20);
    ctx.globalAlpha = 1.0;

    // Download
    canvas.toBlob((blob) => {
      if (blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `regimen-transformation-${Date.now()}.png`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success("Comparison image downloaded!");
      }
    }, 'image/png');
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
              <img 
                src={selectedPhotos.before} 
                alt="Before" 
                className="w-full h-64 object-cover rounded-lg mb-3"
              />
            ) : (
              <div className="w-full h-64 bg-muted rounded-lg mb-3 flex items-center justify-center text-muted-foreground">
                No photo selected
              </div>
            )}
            <Button
              variant="outline"
              className="w-full"
              onClick={() => document.getElementById('before-input')?.click()}
            >
              Select Before
            </Button>
            <input
              id="before-input"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handlePhotoSelect('before', e)}
            />
          </Card>

          <Card className="p-4">
            <h3 className="font-semibold text-center mb-3 text-foreground">After</h3>
            {selectedPhotos.after ? (
              <img 
                src={selectedPhotos.after} 
                alt="After" 
                className="w-full h-64 object-cover rounded-lg mb-3"
              />
            ) : (
              <div className="w-full h-64 bg-muted rounded-lg mb-3 flex items-center justify-center text-muted-foreground">
                No photo selected
              </div>
            )}
            <Button
              variant="outline"
              className="w-full"
              onClick={() => document.getElementById('after-input')?.click()}
            >
              Select After
            </Button>
            <input
              id="after-input"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handlePhotoSelect('after', e)}
            />
          </Card>
        </div>

        {/* Preview Comparison */}
        {selectedPhotos.before && selectedPhotos.after && (
          <Card className="p-6" ref={comparisonRef}>
            <h3 className="font-semibold mb-4 text-center">Preview</h3>
            <div className="relative">
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <p className="text-sm font-semibold text-primary text-center mb-2">BEFORE</p>
                  <img 
                    src={selectedPhotos.before} 
                    alt="Before comparison" 
                    className="w-full rounded-lg"
                  />
                </div>
                <div>
                  <p className="text-sm font-semibold text-primary text-center mb-2">AFTER</p>
                  <img 
                    src={selectedPhotos.after} 
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

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button
            onClick={handleDownload}
            disabled={!selectedPhotos.before || !selectedPhotos.after}
            className="flex-1"
          >
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>
          <Button
            onClick={handleShare}
            disabled={!selectedPhotos.before || !selectedPhotos.after}
            variant="outline"
            className="flex-1"
          >
            <Share2 className="h-4 w-4 mr-2" />
            Share
          </Button>
        </div>

        {/* Info */}
        <Card className="p-4 bg-muted/50">
          <p className="text-sm text-muted-foreground text-center">
            Your transformation images will include a subtle REGIMEN watermark. 
            Download or share your progress with pride!
          </p>
        </Card>
      </div>
    </div>
  );
}
