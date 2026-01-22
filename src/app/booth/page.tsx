"use client";

import Image from "next/image";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { motion } from "framer-motion";
import {
  Camera,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Printer,
  QrCode,
  Sparkles,
} from "lucide-react";
import { QRCodeCanvas } from "qrcode.react";
import { createSupabaseBrowserClient } from "../../lib/supabase/client";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";

type Step = "landing" | "camera" | "filters" | "templates" | "post";

type TemplateOption = {
  id: string;
  name: string;
  file_path: string;
  url: string;
};

const filters = [
  { id: "none", label: "Original", value: "none" },
  { id: "grayscale", label: "Grayscale", value: "grayscale(100%)" },
  { id: "sepia", label: "Sepia", value: "sepia(80%)" },
  { id: "brighten", label: "Brighten", value: "brightness(1.2)" },
  {
    id: "vintage",
    label: "Vintage",
    value: "sepia(30%) contrast(1.1) saturate(0.8)",
  },
];

export default function BoothPage() {
  const [step, setStep] = useState<Step>("landing");
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [selectedFilter, setSelectedFilter] = useState(filters[0].value);
  const [templates, setTemplates] = useState<TemplateOption[]>([]);
  const [selectedTemplate, setSelectedTemplate] =
    useState<TemplateOption | null>(null);
  const [captureUrl, setCaptureUrl] = useState<string | null>(null);
  const [storageUrl, setStorageUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const countdownTimerRef = useRef<number | null>(null);

  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const supabaseEnabled = useMemo(
    () =>
      Boolean(
        process.env.NEXT_PUBLIC_SUPABASE_URL &&
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      ),
    []
  );

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: false,
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setIsCameraReady(true);
      }
    } catch {
      setIsCameraReady(false);
    }
  }, []);

  const stopCameraStream = useCallback(() => {
    const stream = videoRef.current?.srcObject as MediaStream | null;
    stream?.getTracks().forEach((track) => track.stop());
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const stopCamera = useCallback(() => {
    stopCameraStream();
    setIsCameraReady(false);
  }, [stopCameraStream]);

  useEffect(() => {
    return () => {
      if (countdownTimerRef.current) {
        window.clearInterval(countdownTimerRef.current);
      }
      stopCameraStream();
    };
  }, [stopCameraStream]);

  useEffect(() => {
    if (!supabaseEnabled) {
      return;
    }
    const loadTemplates = async () => {
      const { data } = await supabase
        .from("templates")
        .select("id,name,file_path,created_at")
        .order("created_at", { ascending: false });
      if (!data) {
        return;
      }
      const mapped = data.map((template) => {
        const publicUrl =
          template.file_path.startsWith("http")
            ? template.file_path
            : supabase.storage
                .from("templates")
                .getPublicUrl(template.file_path).data.publicUrl;
        return {
          id: template.id,
          name: template.name,
          file_path: template.file_path,
          url: publicUrl,
        };
      });
      setTemplates(mapped);
      setSelectedTemplate(mapped[0] ?? null);
    };
    loadTemplates();
  }, [supabase, supabaseEnabled]);

  const loadImage = useCallback((src: string) => {
    return new Promise<HTMLImageElement>((resolve, reject) => {
      const image = document.createElement("img");
      image.crossOrigin = "anonymous";
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("Image load failed"));
      image.src = src;
    });
  }, []);

  const uploadCapture = useCallback(
    async (dataUrl: string) => {
      if (!supabaseEnabled) {
        setStorageUrl(dataUrl);
        return;
      }
      setIsUploading(true);
      const response = await fetch(dataUrl);
      const blob = await response.blob();
      const filePath = `sessions/${crypto.randomUUID()}.png`;
      const { error } = await supabase.storage
        .from("captures")
        .upload(filePath, blob, { contentType: "image/png", upsert: true });
      if (error) {
        setStorageUrl(dataUrl);
        setIsUploading(false);
        return;
      }
      const publicUrl = supabase.storage
        .from("captures")
        .getPublicUrl(filePath).data.publicUrl;
      setStorageUrl(publicUrl || dataUrl);
      setIsUploading(false);
    },
    [supabase, supabaseEnabled]
  );

  const capturePhoto = useCallback(async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) {
      return;
    }
    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }
    ctx.filter = selectedFilter;
    ctx.drawImage(video, 0, 0, width, height);
    ctx.filter = "none";
    if (selectedTemplate?.url) {
      try {
        const overlay = await loadImage(selectedTemplate.url);
        ctx.drawImage(overlay, 0, 0, width, height);
      } catch {}
    }
    const dataUrl = canvas.toDataURL("image/png");
    setCaptureUrl(dataUrl);
    await uploadCapture(dataUrl);
    stopCamera();
    setStep("post");
  }, [loadImage, selectedFilter, selectedTemplate, stopCamera, uploadCapture]);

  const startCountdown = () => {
    if (countdownTimerRef.current) {
      return;
    }
    let value = 3;
    setCountdown(value);
    countdownTimerRef.current = window.setInterval(() => {
      value -= 1;
      if (value <= 0) {
        window.clearInterval(countdownTimerRef.current ?? 0);
        countdownTimerRef.current = null;
        setCountdown(null);
        capturePhoto();
        return;
      }
      setCountdown(value);
    }, 1000);
  };

  const handleRetake = () => {
    setCaptureUrl(null);
    setStorageUrl(null);
    setStep("camera");
    startCamera();
  };

  const stepLabel = useMemo(() => {
    switch (step) {
      case "camera":
        return "Camera View";
      case "filters":
        return "Filter Selection";
      case "templates":
        return "Template Overlay";
      case "post":
        return "Post-Processing";
      default:
        return "Landing";
    }
  }, [step]);

  const showVideo = step === "camera" || step === "filters" || step === "templates";
  const photoUrl = storageUrl ?? captureUrl ?? "";

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        <span className="inline-flex w-fit items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs uppercase tracking-[0.2em] text-muted-foreground">
          <Sparkles className="h-3 w-3 text-primary" />
          Booth Flow
        </span>
        <h1 className="text-3xl font-semibold text-foreground md:text-4xl">
          {stepLabel}
        </h1>
        <p className="text-sm text-muted-foreground">
          Guide guests through capture, filters, templates, and instant delivery.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_0.6fr]">
        <Card className="overflow-hidden">
          <CardContent className="p-6">
            {step === "landing" && (
              <motion.div
                className="flex min-h-[420px] flex-col items-center justify-center gap-6 text-center"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
              >
                <motion.div
                  className="flex flex-col items-center gap-3"
                  animate={{ scale: [1, 1.02, 1] }}
                  transition={{ repeat: Infinity, duration: 2.4 }}
                >
                  <Button
                    size="lg"
                    onClick={async () => {
                      setStep("camera");
                      await startCamera();
                    }}
                  >
                    <Camera className="h-5 w-5" />
                    Start
                  </Button>
                </motion.div>
                <p className="max-w-md text-sm text-muted-foreground">
                  Tap start to enable the camera and begin the booth experience.
                </p>
              </motion.div>
            )}

            {showVideo && (
              <div className="relative overflow-hidden rounded-2xl border border-border bg-black">
                <video
                  ref={videoRef}
                  className="h-[420px] w-full object-cover"
                  style={{ filter: selectedFilter }}
                  playsInline
                  muted
                />
                {step === "templates" && selectedTemplate?.url && (
                  <Image
                    src={selectedTemplate.url}
                    alt={selectedTemplate.name}
                    fill
                    unoptimized
                    className="pointer-events-none object-cover"
                  />
                )}
                {!isCameraReady && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-sm text-muted-foreground">
                    Allow camera access to continue.
                  </div>
                )}
                {countdown !== null && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-6xl font-semibold text-white">
                    {countdown}
                  </div>
                )}
              </div>
            )}

            {step === "post" && (
              <div className="flex flex-col items-center gap-6">
                <div className="print-area relative w-full overflow-hidden rounded-2xl border border-border bg-black">
                  {captureUrl ? (
                    <Image
                      src={captureUrl}
                      alt="Captured"
                      fill
                      unoptimized
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-[420px] items-center justify-center text-sm text-muted-foreground">
                      Capture a photo to preview it here.
                    </div>
                  )}
                </div>
                <canvas ref={canvasRef} className="hidden" />
              </div>
            )}

            {step !== "post" && <canvas ref={canvasRef} className="hidden" />}
          </CardContent>
        </Card>

        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Flow Controls</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {step === "camera" && (
                <div className="flex items-center justify-between">
                  <Button
                    variant="ghost"
                    onClick={() => {
                      stopCamera();
                      setStep("landing");
                    }}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Back
                  </Button>
                  <Button onClick={() => setStep("filters")}>
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
              {step === "filters" && (
                <div className="flex items-center justify-between">
                  <Button variant="ghost" onClick={() => setStep("camera")}>
                    <ChevronLeft className="h-4 w-4" />
                    Back
                  </Button>
                  <Button onClick={() => setStep("templates")}>
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
              {step === "templates" && (
                <div className="flex items-center justify-between">
                  <Button variant="ghost" onClick={() => setStep("filters")}>
                    <ChevronLeft className="h-4 w-4" />
                    Back
                  </Button>
                  <Button onClick={startCountdown} disabled={!isCameraReady}>
                    <Camera className="h-4 w-4" />
                    Capture
                  </Button>
                </div>
              )}
              {step === "post" && (
                <div className="flex flex-col gap-3">
                  <Button onClick={handleRetake} variant="secondary">
                    Retake
                  </Button>
                  <Button
                    onClick={() => window.print()}
                    disabled={!captureUrl}
                  >
                    <Printer className="h-4 w-4" />
                    Print 4x6
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {step === "filters" && (
            <Card>
              <CardHeader>
                <CardTitle>Filters</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {filters.map((filter) => (
                  <Button
                    key={filter.id}
                    variant={selectedFilter === filter.value ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedFilter(filter.value)}
                  >
                    {filter.label}
                  </Button>
                ))}
              </CardContent>
            </Card>
          )}

          {step === "templates" && (
            <Card>
              <CardHeader>
                <CardTitle>Templates</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                {templates.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    No templates found in the database yet.
                  </p>
                )}
                {templates.map((template) => (
                  <button
                    key={template.id}
                    type="button"
                    className={`flex items-center gap-3 rounded-xl border px-3 py-2 text-left text-sm transition ${
                      selectedTemplate?.id === template.id
                        ? "border-primary bg-primary/10 text-foreground"
                        : "border-border bg-background text-muted-foreground hover:border-primary/60"
                    }`}
                    onClick={() => setSelectedTemplate(template)}
                  >
                    <Image
                      src={template.url}
                      alt={template.name}
                      width={48}
                      height={48}
                      unoptimized
                      className="rounded-lg object-cover"
                    />
                    <span>{template.name}</span>
                  </button>
                ))}
              </CardContent>
            </Card>
          )}

          {step === "post" && (
            <Card>
              <CardHeader>
                <CardTitle>Delivery</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-2 text-foreground">
                  <QrCode className="h-4 w-4" />
                  Scan to download
                </div>
                {photoUrl ? (
                  <QRCodeCanvas value={photoUrl} size={180} />
                ) : (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Generating link
                  </div>
                )}
                <span className="text-xs text-muted-foreground">
                  {isUploading ? "Uploading to Supabase..." : photoUrl}
                </span>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
