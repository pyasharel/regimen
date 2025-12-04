import html2canvas from 'html2canvas';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';

/**
 * Capture a DOM element as an image and share it
 */
export const shareElementAsImage = async (
  element: HTMLElement,
  filename: string = 'share.png'
): Promise<boolean> => {
  try {
    // Generate canvas from element
    const canvas = await html2canvas(element, {
      backgroundColor: '#1a1a2e',
      scale: 2,
      useCORS: true,
      logging: false,
    });

    const dataUrl = canvas.toDataURL('image/png');
    const base64Data = dataUrl.split(',')[1];

    if (Capacitor.isNativePlatform()) {
      // Save to filesystem and share
      const result = await Filesystem.writeFile({
        path: filename,
        data: base64Data,
        directory: Directory.Cache,
      });

      await Share.share({
        files: [result.uri],
      });
    } else {
      // Web fallback - download the image
      const link = document.createElement('a');
      link.download = filename;
      link.href = dataUrl;
      link.click();
    }

    return true;
  } catch (error) {
    console.error('Error sharing element as image:', error);
    return false;
  }
};
