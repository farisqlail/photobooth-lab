import { useState } from "react";
import { SupabaseClient } from "@supabase/supabase-js";
import { TemplateOption } from "../types";
import { loadImage, getSlotPercentages } from "../utils";

export function useImageProcessing(supabase: SupabaseClient | null) {
  const [finalPreviewUrl, setFinalPreviewUrl] = useState<string | null>(null);
  const [storageUrl, setStorageUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const uploadFinalImage = async (dataUrl: string, transactionId?: string) => {
    if (!supabase) {
       // Supabase not configured, strictly use dataUrl as fallback (no local storage)
       console.warn("Supabase not configured, skipping upload.");
       setStorageUrl(dataUrl);
       return dataUrl;
    }
    setIsUploading(true);
    try {
      const response = await fetch(dataUrl);
      const blob = await response.blob();
      const filePath = transactionId
        ? `transactions/${transactionId}/final.png`
        : `temp/${Date.now()}.png`;

      const { error: uploadError } = await supabase.storage
        .from("captures") 
        .upload(filePath, blob, {
          contentType: "image/png",
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const { data } = await supabase.storage
        .from("captures")
        .createSignedUrl(filePath, 3600 * 24 * 7); // 1 week

      setStorageUrl(data?.signedUrl ?? null);
      return data?.signedUrl ?? null;
    } catch (error) {
      console.error("Supabase Upload failed:", error);
      
      // Removed local storage fallback to prevent storage usage
      // Final fallback to data URL (offline mode)
      setStorageUrl(dataUrl);
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  const generateFinalImage = async ({
    capturedPhotos,
    selectedTemplate,
    templateImage,
    selectedFilter,
    transactionId,
  }: {
    capturedPhotos: string[];
    selectedTemplate: TemplateOption | null;
    templateImage: HTMLImageElement | null;
    selectedFilter: string;
    transactionId?: string;
  }) => {
    if (capturedPhotos.length === 0) {
      return null;
    }

    const canvas = document.createElement("canvas");
    let width = 0;
    let height = 0;
    
    if (templateImage) {
      width = templateImage.naturalWidth;
      height = templateImage.naturalHeight;
    } else {
      const base = await loadImage(capturedPhotos[0]);
      width = base.naturalWidth;
      height = base.naturalHeight;
    }

    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return null;
    }

    // Fill white background
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);

    ctx.filter = selectedFilter;

    // Draw photos
    for (let i = 0; i < capturedPhotos.length; i++) {
      const photoUrl = capturedPhotos[i];
      const img = await loadImage(photoUrl);

      let slot = selectedTemplate?.slots_config?.[i];
      let slotX = 0;
      let slotY = 0;
      let slotWidth = width;
      let slotHeight = height;

      if (slot) {
        // Calculate dimensions based on percentages if available, or fall back to absolute
        // We use the canvas width/height (which matches template natural size) as the reference
        const { x, y, width: w, height: h } = getSlotPercentages(slot, width, height);
        
        slotX = (x / 100) * width;
        slotY = (y / 100) * height;
        slotWidth = (w / 100) * width;
        slotHeight = (h / 100) * height;
      } else if (i === 0 && selectedTemplate?.photo_x !== undefined) {
         // Legacy single photo fallback
         slotX = selectedTemplate.photo_x ?? 0;
         slotY = selectedTemplate.photo_y ?? 0;
         slotWidth = selectedTemplate.photo_width ?? width;
         slotHeight = selectedTemplate.photo_height ?? height;
      } else {
        // No slot config found for this index
        continue; 
      }

      // Draw with object-fit: cover to ensure it fills the slot
      const aspectSlot = slotWidth / slotHeight;
      const aspectImg = img.width / img.height;
      
      let sWidth = img.width;
      let sHeight = img.height;
      let sx = 0;
      let sy = 0;

      if (aspectImg > aspectSlot) {
        // Image is wider than slot
        sHeight = img.height;
        sWidth = sHeight * aspectSlot;
        sx = (img.width - sWidth) / 2;
      } else {
        // Image is taller than slot
        sWidth = img.width;
        sHeight = sWidth / aspectSlot;
        sy = (img.height - sHeight) / 2;
      }

      ctx.drawImage(img, sx, sy, sWidth, sHeight, slotX, slotY, slotWidth, slotHeight);
    }

    ctx.filter = "none";
    if (templateImage) {
      ctx.drawImage(templateImage, 0, 0, canvas.width, canvas.height);
    }
    const dataUrl = canvas.toDataURL("image/png");
    setFinalPreviewUrl(dataUrl);
    
    const uploadedUrl = await uploadFinalImage(dataUrl, transactionId);
    return { finalUrl: dataUrl, uploadedUrl };
  };

  const resetImages = () => {
    setFinalPreviewUrl(null);
    setStorageUrl(null);
    setIsUploading(false);
  };

  return {
    finalPreviewUrl,
    storageUrl,
    isUploading,
    generateFinalImage,
    uploadFinalImage,
    setFinalPreviewUrl,
    setStorageUrl,
    resetImages,
  };
}
