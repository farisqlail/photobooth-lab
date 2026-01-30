import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Loader2, Mail, Printer, QrCode, Download, Camera, Video, Film, Images } from "lucide-react";
import { QRCodeCanvas } from "qrcode.react";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Step, TransactionData } from "./types";
import { mergeVideos } from "@/lib/video-utils";
import { createGif } from "@/lib/gif-utils";
import { SupabaseClient } from "@supabase/supabase-js";

interface DeliveryStepProps {
  finalPreviewUrl: string | null;
  storageUrl: string | null;
  transaction: TransactionData;
  onSetEmail: (email: string) => void;
  onGoToStep: (step: Step) => void;
  isUploading: boolean;
  capturedPhotos?: string[];
  capturedVideos?: string[];
  supabase: SupabaseClient | null;
}

export function DeliveryStep({
  finalPreviewUrl,
  storageUrl,
  transaction,
  onSetEmail,
  onGoToStep,
  isUploading,
  capturedPhotos = [],
  capturedVideos = [],
  supabase,
}: DeliveryStepProps) {
  const [isMerging, setIsMerging] = useState(false);
  const [localQrUrl, setLocalQrUrl] = useState<string | null>(null);
  const [gifUrl, setGifUrl] = useState<string | null>(null);
  const [isGeneratingGif, setIsGeneratingGif] = useState(false);
  
  // State for email assets
  const [videoDownloadUrl, setVideoDownloadUrl] = useState<string | null>(null);
  const [gifDownloadUrl, setGifDownloadUrl] = useState<string | null>(null);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailStatus, setEmailStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [emailErrorMessage, setEmailErrorMessage] = useState<string>("");

  // Helper to generate a landing page for both photo and video
  const generateLandingPage = async (photoUrl: string, videoUrl: string | null, gifDownloadUrl: string | null) => {
    try {
       // Create HTML content
       const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Photobooth Download</title>
    <style>
        body { font-family: system-ui, -apple-system, sans-serif; background: #000; color: #fff; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; text-align: center; }
        .container { max-width: 600px; width: 100%; background: #111; border-radius: 20px; padding: 20px; border: 1px solid #333; }
        img { width: 100%; border-radius: 12px; margin-bottom: 20px; }
        .btn { display: block; width: 100%; padding: 16px; background: #fff; color: #000; text-decoration: none; border-radius: 12px; font-weight: bold; margin-bottom: 12px; font-size: 16px; box-sizing: border-box; }
        .btn.secondary { background: #333; color: #fff; }
        h1 { margin-bottom: 20px; font-size: 24px; }
        p { color: #888; margin-bottom: 30px; font-size: 14px; }
    </style>
</head>
<body>
    <div class="container">
        <h1>Your Photos are Ready!</h1>
        <img src="${photoUrl}" alt="Photo">
        <a href="${photoUrl}" download="photo.png" class="btn">Download Photo</a>
        ${gifDownloadUrl ? `<a href="${gifDownloadUrl}" download="animation.gif" class="btn secondary">Download GIF</a>` : ''}
        ${videoUrl ? `<a href="${videoUrl}" download="video.webm" class="btn secondary">Download Live Video</a>` : ''}
        <p>Thank you for visiting!</p>
    </div>
</body>
</html>
       `;
       
       const blob = new Blob([html], { type: 'text/html' });
       
       if (supabase && transaction.id) {
          const filePath = `transactions/${transaction.id}/index.html`;
          const { error } = await supabase.storage
              .from("captures")
              .upload(filePath, blob, { contentType: "text/html", upsert: true });

          if (!error) {
             const { data } = await supabase.storage
                .from("captures")
                .createSignedUrl(filePath, 3600 * 24 * 7); // 1 week
             return data?.signedUrl ?? null;
          } else {
             console.error("Failed to upload landing page to Supabase", error);
          }
       }
    } catch (e) {
      console.error("Failed to generate landing page", e);
    }
    return null;
  };

  // Generate GIF on mount
  useEffect(() => {
    if (capturedPhotos.length > 0 && !gifUrl && !isGeneratingGif) {
        setIsGeneratingGif(true);
        createGif(capturedPhotos)
            .then(url => {
                setGifUrl(url);
            })
            .catch(e => console.error("GIF generation failed", e))
            .finally(() => setIsGeneratingGif(false));
    }
  }, [capturedPhotos, gifUrl, isGeneratingGif]);

  // Handle auto-upload for QR code generation
  useEffect(() => {
    const prepareDownload = async () => {
        // If no storageUrl or it is a data url (meaning no upload happened yet or failed)
        if (!storageUrl || storageUrl.startsWith("data:")) return;
        if (localQrUrl) return; // Already generated

        // If we have captured videos, let's merge and upload them too (if not already done)
        let videoDownloadUrl: string | null = null;
        
        if (capturedVideos.length > 0) {
            try {
                // Check if we need to merge locally
                const mergedUrl = await mergeVideos(capturedVideos); // This returns blob url
                const response = await fetch(mergedUrl);
                const blob = await response.blob();
                
                if (supabase && transaction.id) {
                    const filePath = `transactions/${transaction.id}/video.webm`;
                    await supabase.storage.from("captures").upload(filePath, blob, { contentType: "video/webm", upsert: true });
                    const { data } = await supabase.storage.from("captures").createSignedUrl(filePath, 3600 * 24 * 7); // 1 week
                    videoDownloadUrl = data?.signedUrl ?? null;
                    setVideoDownloadUrl(videoDownloadUrl);
                }
            } catch (e) {
                console.error("Background video merge failed", e);
            }
        }

        // Upload GIF if available
        let gifDownloadUrl: string | null = null;
        if (gifUrl) {
             try {
                const response = await fetch(gifUrl);
                const blob = await response.blob();
                
                if (supabase && transaction.id) {
                    const filePath = `transactions/${transaction.id}/animation.gif`;
                    await supabase.storage.from("captures").upload(filePath, blob, { contentType: "image/gif", upsert: true });
                    const { data } = await supabase.storage.from("captures").createSignedUrl(filePath, 3600 * 24 * 7); // 1 week
                    gifDownloadUrl = data?.signedUrl ?? null;
                    setGifDownloadUrl(gifDownloadUrl);
                }
             } catch (e) {
                 console.error("GIF upload failed", e);
             }
        } else if (capturedPhotos.length > 0) {
             // GIF not ready yet? If capturedPhotos exist, we should probably wait for GIF.
             // But to avoid blocking, maybe we skip it for now?
             // Or we can create it on the fly here if not ready?
             // Let's create it here if gifUrl is null
             try {
                const url = await createGif(capturedPhotos);
                setGifUrl(url); // Update state too
                const response = await fetch(url);
                const blob = await response.blob();
                
                if (supabase && transaction.id) {
                    const filePath = `transactions/${transaction.id}/animation.gif`;
                    await supabase.storage.from("captures").upload(filePath, blob, { contentType: "image/gif", upsert: true });
                    const { data } = await supabase.storage.from("captures").createSignedUrl(filePath, 3600 * 24 * 7); // 1 week
                    gifDownloadUrl = data?.signedUrl ?? null;
                    setGifDownloadUrl(gifDownloadUrl);
                }
             } catch (e) {
                 console.error("Just-in-time GIF generation failed", e);
             }
        }

        // Now generate the landing page
        const landingPageUrl = await generateLandingPage(storageUrl, videoDownloadUrl, gifDownloadUrl);
        if (landingPageUrl) {
            setLocalQrUrl(landingPageUrl);
        } else {
            // Fallback to just photo URL
            setLocalQrUrl(storageUrl);
        }
    };
    
    if (capturedVideos.length > 0 || capturedPhotos.length > 0) {
        prepareDownload();
    } else {
        // No extra media, just generate landing page or use photo url
        if (storageUrl && !storageUrl.startsWith("data:") && !localQrUrl) {
            generateLandingPage(storageUrl, null, null).then(url => {
                 setLocalQrUrl(url || storageUrl);
            });
        }
    }
  }, [storageUrl, capturedVideos, capturedPhotos, localQrUrl, gifUrl, supabase, transaction.id]);

  const handleSendEmail = async () => {
    if (!transaction.email || !storageUrl) return;

    setIsSendingEmail(true);
    setEmailStatus('idle');
    setEmailErrorMessage("");

    try {
        const response = await fetch('/api/send-email', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email: transaction.email,
                photoUrl: storageUrl,
                videoUrl: videoDownloadUrl,
                gifUrl: gifDownloadUrl,
            }),
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || 'Failed to send email');
        }

        setEmailStatus('success');
    } catch (error) {
        console.error("Failed to send email", error);
        setEmailStatus('error');
        if (error instanceof Error) {
           setEmailErrorMessage(error.message);
        } else {
           setEmailErrorMessage("Gagal mengirim email.");
        }
    } finally {
        setIsSendingEmail(false);
    }
  };

  const downloadPhoto = (url: string, index: number) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = `photo-session-${index + 1}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadVideo = (url: string, index: number) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = `live-photo-${index + 1}.webm`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadMergedVideo = async () => {
    if (capturedVideos.length === 0) return;
    
    try {
      setIsMerging(true);
      const mergedUrl = await mergeVideos(capturedVideos);
      
      const link = document.createElement('a');
      link.href = mergedUrl;
      link.download = `photobooth-session-video.webm`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Failed to merge videos:", error);
      alert("Gagal menggabungkan video. Silakan coba lagi.");
    } finally {
      setIsMerging(false);
    }
  };

  return (
    <motion.section
      key="delivery"
      className="flex min-h-[calc(100vh-14rem)] flex-col items-center justify-center gap-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="w-full max-w-5xl">
        <CardContent className="grid gap-6 p-6 md:grid-cols-[1.2fr_0.8fr]">
          <div className="flex flex-col gap-4">
            <div className="print-area relative w-full overflow-hidden rounded-2xl border border-border bg-black aspect-[3/4]">
              {finalPreviewUrl ? (
                <Image
                  src={finalPreviewUrl}
                  alt="Final"
                  fill
                  unoptimized
                  className="object-contain"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  Memproses hasil foto.
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <QrCode className="h-4 w-4" />
              Scan QR untuk Download
            </div>
            {localQrUrl ? (
               <QRCodeCanvas value={localQrUrl} size={180} />
            ) : storageUrl ? (
              storageUrl.startsWith("data:") ? (
                <div className="flex h-[180px] w-[180px] flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-muted-foreground/25 bg-muted/50 p-4 text-center text-sm text-muted-foreground">
                  <QrCode className="h-8 w-8 opacity-20" />
                  <p>QR Code tidak tersedia (Offline)</p>
                </div>
              ) : (
                <div className="flex h-[180px] w-[180px] items-center justify-center gap-2 text-sm text-muted-foreground">
                   <Loader2 className="h-4 w-4 animate-spin" />
                   Generating Link...
                </div>
              )
            ) : isUploading ? (
              <div className="flex h-[180px] w-[180px] items-center justify-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Menyiapkan file...
              </div>
            ) : (
              <div className="flex h-[180px] w-[180px] items-center justify-center gap-2 rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-center text-sm text-destructive">
                Gagal memuat QR Code
              </div>
            )}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Mail className="h-4 w-4" />
              Kirim lewat Email
            </div>
            <div className="flex w-full max-w-sm items-center space-x-2">
                <Input
                  placeholder="Email pelanggan"
                  value={transaction.email ?? ""}
                  onChange={(event) => onSetEmail(event.target.value)}
                />
                <Button 
                    onClick={handleSendEmail} 
                    disabled={isSendingEmail || !transaction.email}
                    size="icon"
                >
                    {isSendingEmail ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                        <Mail className="h-4 w-4" />
                    )}
                </Button>
            </div>
            {emailStatus === 'success' && (
                <p className="text-sm text-green-500">Email berhasil dikirim!</p>
            )}
            {emailStatus === 'error' && (
                <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                   <p className="font-medium">Gagal mengirim email</p>
                   <p className="mt-1 text-xs opacity-90">{emailErrorMessage}</p>
                </div>
            )}
            <Button onClick={() => window.print()}>
              <Printer className="h-4 w-4" />
              Cetak Foto
            </Button>
            {capturedVideos.length > 0 && (
              <Button 
                variant="outline" 
                onClick={handleDownloadMergedVideo}
                disabled={isMerging}
              >
                {isMerging ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Film className="h-4 w-4" />
                )}
                {isMerging ? "Menggabungkan..." : "Download Live Video (All)"}
              </Button>
            )}
            {(gifUrl || isGeneratingGif) && (
              <Button 
                variant="outline" 
                onClick={() => {
                  if (gifUrl) {
                    const link = document.createElement('a');
                    link.href = gifUrl;
                    link.download = `photobooth-animation.gif`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  }
                }}
                disabled={isGeneratingGif}
              >
                {isGeneratingGif ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Images className="h-4 w-4" />
                )}
                {isGeneratingGif ? "Membuat GIF..." : "Download GIF Animation"}
              </Button>
            )}
            <Button variant="secondary" onClick={() => onGoToStep("finish")}>
              Selesai
            </Button>
            {isUploading && (
              <span className="text-xs text-muted-foreground">
                Mengunggah ke Supabase...
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.section>
  );
}
