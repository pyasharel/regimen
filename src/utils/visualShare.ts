import html2canvas from 'html2canvas';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';

/**
 * Capture a DOM element as an image and share via native share sheet
 */
export const shareElementAsImage = async (
  element: HTMLElement,
  filename: string = 'share.png'
): Promise<boolean> => {
  try {
    // Get computed styles to determine if dark mode
    const isDarkMode = document.documentElement.classList.contains('dark');
    
    // Get CSS variable values
    const styles = getComputedStyle(document.documentElement);
    const bgColor = isDarkMode ? '#0F0F0F' : '#FAFAFA';
    
    // Generate canvas from element
    const canvas = await html2canvas(element, {
      backgroundColor: bgColor,
      scale: 2,
      useCORS: true,
      logging: false,
    });

    const dataUrl = canvas.toDataURL('image/png');
    const base64Data = dataUrl.split(',')[1];

    if (Capacitor.isNativePlatform()) {
      // Save to cache directory
      const result = await Filesystem.writeFile({
        path: filename,
        data: base64Data,
        directory: Directory.Cache,
      });

      // Open native share sheet with the file
      await Share.share({
        files: [result.uri],
        dialogTitle: 'Share',
      });
      
      return true;
    } else {
      // Web: Create blob and use Web Share API if available, otherwise download
      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((b) => resolve(b!), 'image/png', 1.0);
      });
      
      const file = new File([blob], filename, { type: 'image/png' });
      
      // Try Web Share API first (supports share sheet on mobile browsers)
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
        });
        return true;
      }
      
      // Fallback: download
      const link = document.createElement('a');
      link.download = filename;
      link.href = dataUrl;
      link.click();
      return true;
    }
  } catch (error) {
    console.error('Error sharing element as image:', error);
    return false;
  }
};
