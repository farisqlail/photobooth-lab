"use client";

import { useCallback, useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import { FolderUp, Plus, Trash2, X, Pencil, ImageOff } from "lucide-react";
import Image from "next/image";
import { createSupabaseBrowserClient } from "../../../lib/supabase/client";
import { Button } from "../../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { Input } from "../../../components/ui/input";
import { useToast } from "../../../components/ui/toast";

type Slot = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  x_percent?: number;
  y_percent?: number;
  width_percent?: number;
  height_percent?: number;
};

type Template = {
  id: string;
  name: string;
  file_path: string;
  url: string;
  photo_x: number;
  photo_y: number;
  photo_width: number;
  photo_height: number;
  slots_config?: Slot[];
};

export default function AdminTemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewSize, setPreviewSize] = useState<{ width: number; height: number } | null>(
    null
  );
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [templateName, setTemplateName] = useState("");
  const [interaction, setInteraction] = useState<{
    type: "resize" | "drag";
    id: string;
    handle?: "nw" | "ne" | "sw" | "se";
    startX: number;
    startY: number;
    startW: number;
    startH: number;
    startSlotX: number;
    startSlotY: number;
  } | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [previewUrl, previewSize]); // Re-observe when preview changes/mounts

  // Recalculate slot pixels from percentages when preview size changes
  useEffect(() => {
    if (!previewSize) return;
    // Skip update if currently interacting to prevent jump loop
    if (interaction) return;
    
    setSlots((prevSlots) => {
      return prevSlots.map((slot) => {
        if (
          typeof slot.x_percent === "number" &&
          typeof slot.y_percent === "number" &&
          typeof slot.width_percent === "number" &&
          typeof slot.height_percent === "number"
        ) {
          return {
            ...slot,
            x: Math.round((slot.x_percent / 100) * previewSize.width),
            y: Math.round((slot.y_percent / 100) * previewSize.height),
            width: Math.round((slot.width_percent / 100) * previewSize.width),
            height: Math.round((slot.height_percent / 100) * previewSize.height),
          };
        }
        return slot;
      });
    });
  }, [previewSize, interaction]);

  const scale = previewSize && containerWidth ? containerWidth / previewSize.width : 1;

  useEffect(() => {
    if (!interaction) return;

    // Add cursor style to body for better UX during interaction
    const body = document.body;
    const originalCursor = body.style.cursor;
    
    if (interaction.type === "resize" && interaction.handle) {
      body.style.cursor = `${interaction.handle}-resize`;
    } else if (interaction.type === "drag") {
      body.style.cursor = "move";
    }

    const handleMove = (e: MouseEvent) => {
      const dx = (e.clientX - interaction.startX) / scale;
      const dy = (e.clientY - interaction.startY) / scale;

      setSlots((prev) =>
        prev.map((slot) => {
          if (slot.id !== interaction.id) return slot;
          let { x, y, width, height } = slot;

          if (interaction.type === "resize" && interaction.handle) {
            if (interaction.handle.includes("e")) width = Math.max(10, interaction.startW + dx);
            if (interaction.handle.includes("s")) height = Math.max(10, interaction.startH + dy);
            if (interaction.handle.includes("w")) {
              const newW = Math.max(10, interaction.startW - dx);
              x = interaction.startSlotX + (interaction.startW - newW);
              width = newW;
            }
            if (interaction.handle.includes("n")) {
              const newH = Math.max(10, interaction.startH - dy);
              y = interaction.startSlotY + (interaction.startH - newH);
              height = newH;
            }
          } else if (interaction.type === "drag") {
             x = interaction.startSlotX + dx;
             y = interaction.startSlotY + dy;
          }

          const newSlot = { ...slot, width: Math.round(width), height: Math.round(height), x: Math.round(x), y: Math.round(y) };
          
          if (previewSize) {
             newSlot.x_percent = (newSlot.x / previewSize.width) * 100;
             newSlot.y_percent = (newSlot.y / previewSize.height) * 100;
             newSlot.width_percent = (newSlot.width / previewSize.width) * 100;
             newSlot.height_percent = (newSlot.height / previewSize.height) * 100;
          }

          return newSlot;
        })
      );
    };
    const handleUp = () => setInteraction(null);
    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
      body.style.cursor = originalCursor;
    };
  }, [interaction, scale, previewSize]);

  const [loading, setLoading] = useState(true);
  const [supabaseState] = useState(() => {
    try {
      return { client: createSupabaseBrowserClient(), error: null as string | null };
    } catch (error) {
      return {
        client: null,
        error: error instanceof Error ? error.message : "Supabase error",
      };
    }
  });
  const supabase = supabaseState.client;
  const { showToast } = useToast();

  const loadTemplates = useCallback(async () => {
    if (!supabase) {
      return;
    }
    const { data } = await supabase
      .from("templates")
      .select("id,name,file_path,created_at,photo_x,photo_y,photo_width,photo_height,slots_config")
      .order("created_at", { ascending: false });
    const mapped =
      (await Promise.all(
        (data ?? []).map(async (template) => {
          const slots_config = template.slots_config
            ? typeof template.slots_config === "string"
              ? JSON.parse(template.slots_config)
              : template.slots_config
            : undefined;

          if (template.file_path.startsWith("http")) {
            return {
              id: template.id,
              name: template.name,
              file_path: template.file_path,
              url: template.file_path,
              photo_x: template.photo_x,
              photo_y: template.photo_y,
              photo_width: template.photo_width,
              photo_height: template.photo_height,
              slots_config,
            };
          }
          const { data: signedData } = await supabase.storage
            .from("templates")
            .createSignedUrl(template.file_path, 3600);
          return {
            id: template.id,
            name: template.name,
            file_path: template.file_path,
            url: signedData?.signedUrl ?? "",
            photo_x: template.photo_x,
            photo_y: template.photo_y,
            photo_width: template.photo_width,
            photo_height: template.photo_height,
            slots_config,
          };
        })
      )) ?? [];
    setTemplates(mapped);
  }, [supabase]);

  useEffect(() => {
    const run = async () => {
      if (!supabase) {
        setLoading(false);
        return;
      }
      await loadTemplates();
      setLoading(false);
    };
    run();
  }, [loadTemplates, supabase]);

  useEffect(() => {
    if (supabaseState.error) {
      showToast({ variant: "error", message: supabaseState.error });
    }
  }, [showToast, supabaseState.error]);

  useEffect(() => {
    if (!previewUrl) {
      return;
    }
    return () => {
      URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const saveTemplate = async () => {
    if (!editingTemplateId && !selectedFile) {
      return;
    }
    setUploading(true);
    const formData = new FormData();
    if (selectedFile) {
      formData.append("file", selectedFile);
    }
    formData.append("name", templateName || (selectedFile ? selectedFile.name : "Template"));

    // Calculate percentages for slots
    const processedSlots = slots.map((slot) => {
      if (!previewSize || previewSize.width === 0 || previewSize.height === 0) return slot;
      return {
        ...slot,
        x_percent: (slot.x / previewSize.width) * 100,
        y_percent: (slot.y / previewSize.height) * 100,
        width_percent: (slot.width / previewSize.width) * 100,
        height_percent: (slot.height / previewSize.height) * 100,
      };
    });

    formData.append("slots_config", JSON.stringify(processedSlots));
    // Backward compatibility
    const first = processedSlots[0] || { x: 0, y: 0, width: 0, height: 0 };
    formData.append("photo_x", String(first.x));
    formData.append("photo_y", String(first.y));
    formData.append("photo_width", String(first.width));
    formData.append("photo_height", String(first.height));

    if (editingTemplateId) {
      formData.append("id", editingTemplateId);
    }

    const response = await fetch("/api/admin/templates", {
      method: editingTemplateId ? "PUT" : "POST",
      body: formData,
    });
    if (!response.ok) {
      const data = await response.json().catch(() => null);
      showToast({
        variant: "error",
        message: data?.message ?? (editingTemplateId ? "Gagal update template." : "Gagal upload template."),
      });
      setUploading(false);
      return;
    }
    await loadTemplates();
    showToast({ variant: "success", message: editingTemplateId ? "Template berhasil diperbarui." : "Template berhasil diunggah." });
    cancelEdit();
    setUploading(false);
  };

  const startEdit = (template: Template) => {
    setEditingTemplateId(template.id);
    setTemplateName(template.name);
    setPreviewUrl(template.url);
    
    // Fallback for templates without slots_config (legacy support)
    let initialSlots = template.slots_config || [];
    if (initialSlots.length === 0 && (template.photo_width > 0 || template.photo_height > 0)) {
      initialSlots = [{
        id: crypto.randomUUID(),
        x: template.photo_x || 0,
        y: template.photo_y || 0,
        width: template.photo_width || 500,
        height: template.photo_height || 500,
      }];
    }
    setSlots(initialSlots);
    
    if (template.url) {
      const image = new window.Image();
      image.onload = () => {
        setPreviewSize({
          width: image.naturalWidth,
          height: image.naturalHeight,
        });
      };
      image.src = template.url;
    } else {
      setPreviewSize(null);
    }
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => {
    setEditingTemplateId(null);
    setTemplateName("");
    setSelectedFile(null);
    setPreviewUrl(null);
    setPreviewSize(null);
    setSlots([]);
  };

  const deleteTemplate = async (template: Template) => {
    const response = await fetch("/api/admin/templates", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: template.id, file_path: template.file_path }),
    });
    if (!response.ok) {
      const data = await response.json().catch(() => null);
      showToast({
        variant: "error",
        message: data?.message ?? "Gagal menghapus template.",
      });
      return;
    }
    setTemplates((prev) => prev.filter((item) => item.id !== template.id));
    showToast({ variant: "success", message: "Template berhasil dihapus." });
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-sm text-muted-foreground">
        Memuat template...
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Template Manager</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <Button asChild variant={editingTemplateId ? "outline" : "default"}>
              <label className="flex cursor-pointer items-center gap-2">
                <FolderUp className="h-4 w-4" />
                {editingTemplateId ? "Ganti File" : "Pilih Template"}
                <input
                  type="file"
                  accept="image/png"
                  className="hidden"
                  disabled={uploading}
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) {
                      const objectUrl = URL.createObjectURL(file);
                      setSelectedFile(file);
                      setPreviewUrl(objectUrl);
                      if (!editingTemplateId) {
                        setTemplateName(file.name.replace(/\.[^/.]+$/, ""));
                      }
                      const image = new window.Image();
                      image.onload = () => {
                        setPreviewSize({
                          width: image.naturalWidth,
                          height: image.naturalHeight,
                        });
                        // Only reset slots if not editing, or maybe we should always reset on new file?
                        // Let's reset if not editing. If editing, we might want to keep slots if editing same dimension file.
                        if (!editingTemplateId) {
                            const defaultW = 500;
                            const defaultH = 500;
                            setSlots([
                            {
                                id: crypto.randomUUID(),
                                x: Math.round((image.naturalWidth - defaultW) / 2),
                                y: Math.round((image.naturalHeight - defaultH) / 2),
                                width: defaultW,
                                height: defaultH,
                            },
                            ]);
                        }
                      };
                      image.onerror = () => {
                        setPreviewSize(null);
                      };
                      image.src = objectUrl;
                    }
                  }}
                />
              </label>
            </Button>
            
            {(previewUrl || editingTemplateId) && (
               <Input 
                 placeholder="Nama Template" 
                 value={templateName} 
                 onChange={e => setTemplateName(e.target.value)}
                 className="w-48"
               />
            )}

            <Button
              variant="secondary"
              disabled={(!selectedFile && !editingTemplateId) || uploading}
              onClick={saveTemplate}
            >
              {editingTemplateId ? "Simpan Perubahan" : "Upload Sekarang"}
            </Button>
            {(selectedFile || editingTemplateId) && (
              <Button
                variant="ghost"
                disabled={uploading}
                onClick={cancelEdit}
              >
                Batal
              </Button>
            )}
            {uploading && (
              <span className="text-sm text-muted-foreground">Mengunggah...</span>
            )}
          </div>
          {previewUrl && previewSize && (
            <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
              <Card className="overflow-hidden">
                <CardContent className="p-4">
                  <div 
                    ref={containerRef}
                    className="relative w-full overflow-hidden rounded-xl border border-border bg-muted/50"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={previewUrl}
                      alt="Template Preview"
                      className="relative z-0 h-auto w-full pointer-events-none select-none"
                    />
                    
                    {slots.map((slot, index) => (
                      <motion.div
                        key={slot.id}
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          setSelectedSlotId(slot.id);
                          setInteraction({
                            type: "drag",
                            id: slot.id,
                            startX: e.clientX,
                            startY: e.clientY,
                            startW: slot.width,
                            startH: slot.height,
                            startSlotX: slot.x,
                            startSlotY: slot.y,
                          });
                        }}
                        className={`absolute border-2 ${
                          selectedSlotId === slot.id ? "border-primary z-20" : "border-primary/50 z-10"
                        } bg-primary/20 group`}
                        style={{
                          left: slot.x * scale,
                          top: slot.y * scale,
                          width: slot.width * scale,
                          height: slot.height * scale,
                          cursor: "move",
                        }}
                      >
                        <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-primary opacity-50 select-none">
                          #{index + 1}
                        </div>
                        
                        {/* Resize Handles */}
                        {(["nw", "ne", "sw", "se"] as const).map((handle) => (
                          <div
                            key={handle}
                            className={`absolute h-2 w-2 bg-primary border border-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity ${
                              handle.includes("n") ? "-top-1" : "-bottom-1"
                            } ${handle.includes("w") ? "-left-1" : "-right-1"} cursor-${handle}-resize`}
                            onMouseDown={(e) => {
                              e.stopPropagation(); // Prevent drag start
                              setInteraction({
                                type: "resize",
                                id: slot.id,
                                handle,
                                startX: e.clientX,
                                startY: e.clientY,
                                startW: slot.width,
                                startH: slot.height,
                                startSlotX: slot.x,
                                startSlotY: slot.y,
                              });
                            }}
                          />
                        ))}
                      </motion.div>
                    ))}
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground text-center">
                    Drag kotak untuk memindahkan. Tarik sudut untuk mengubah ukuran.
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-base">Konfigurasi Foto</CardTitle>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const defaultW = 500;
                      const defaultH = 500;
                      let startX = 50;
                      let startY = 50;

                      if (previewSize) {
                        startX = Math.round((previewSize.width - defaultW) / 2);
                        startY = Math.round((previewSize.height - defaultH) / 2);
                      }

                      const newSlot: Slot = {
                        id: crypto.randomUUID(),
                        x: startX,
                        y: startY,
                        width: defaultW,
                        height: defaultH,
                      };

                      if (previewSize) {
                        newSlot.x_percent = (startX / previewSize.width) * 100;
                        newSlot.y_percent = (startY / previewSize.height) * 100;
                        newSlot.width_percent = (defaultW / previewSize.width) * 100;
                        newSlot.height_percent = (defaultH / previewSize.height) * 100;
                      }

                      setSlots((prev) => [...prev, newSlot]);
                    }}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Tambah
                  </Button>
                </CardHeader>
                <CardContent className="flex flex-col gap-4 max-h-[500px] overflow-y-auto">
                  {slots.length === 0 && (
                    <div className="text-sm text-muted-foreground text-center py-4">
                      Belum ada area foto. Tambahkan area foto baru.
                    </div>
                  )}
                  {slots.map((slot, index) => (
                    <div
                      key={slot.id}
                      className={`rounded-lg border p-3 ${
                        selectedSlotId === slot.id ? "border-primary bg-primary/5" : "border-border"
                      }`}
                      onClick={() => setSelectedSlotId(slot.id)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">Foto #{index + 1}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSlots((prev) => prev.filter((s) => s.id !== slot.id));
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <span className="text-[10px] uppercase text-muted-foreground">X</span>
                          <Input
                            type="number"
                            className="h-7 text-xs"
                            value={slot.x}
                            onChange={(e) =>
                              setSlots((prev) =>
                                prev.map((s) => {
                                  if (s.id !== slot.id) return s;
                                  const val = Number(e.target.value);
                                  const updated = { ...s, x: val };
                                  if (previewSize) updated.x_percent = (val / previewSize.width) * 100;
                                  return updated;
                                })
                              )
                            }
                          />
                        </div>
                        <div className="space-y-1">
                          <span className="text-[10px] uppercase text-muted-foreground">Y</span>
                          <Input
                            type="number"
                            className="h-7 text-xs"
                            value={slot.y}
                            onChange={(e) =>
                              setSlots((prev) =>
                                prev.map((s) => {
                                  if (s.id !== slot.id) return s;
                                  const val = Number(e.target.value);
                                  const updated = { ...s, y: val };
                                  if (previewSize) updated.y_percent = (val / previewSize.height) * 100;
                                  return updated;
                                })
                              )
                            }
                          />
                        </div>
                        <div className="space-y-1">
                          <span className="text-[10px] uppercase text-muted-foreground">W</span>
                          <Input
                            type="number"
                            className="h-7 text-xs"
                            value={slot.width}
                            onChange={(e) =>
                              setSlots((prev) =>
                                prev.map((s) => {
                                  if (s.id !== slot.id) return s;
                                  const val = Number(e.target.value);
                                  const updated = { ...s, width: val };
                                  if (previewSize) updated.width_percent = (val / previewSize.width) * 100;
                                  return updated;
                                })
                              )
                            }
                          />
                        </div>
                        <div className="space-y-1">
                          <span className="text-[10px] uppercase text-muted-foreground">H</span>
                          <Input
                            type="number"
                            className="h-7 text-xs"
                            value={slot.height}
                            onChange={(e) =>
                              setSlots((prev) =>
                                prev.map((s) => {
                                  if (s.id !== slot.id) return s;
                                  const val = Number(e.target.value);
                                  const updated = { ...s, height: val };
                                  if (previewSize) updated.height_percent = (val / previewSize.height) * 100;
                                  return updated;
                                })
                              )
                            }
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {templates.map((template) => (
              <Card key={template.id} className="overflow-hidden group relative">
                <div className="relative aspect-[3/4] bg-muted flex items-center justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {template.url ? (
                    <img
                      src={template.url}
                      alt={template.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <ImageOff className="h-8 w-8 opacity-50" />
                        <span className="text-xs">File Missing</span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <Button
                      variant="secondary"
                      size="icon"
                      onClick={() => startEdit(template)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="icon"
                      onClick={() => deleteTemplate(template)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <CardContent className="p-3">
                  <p className="truncate text-sm font-medium">{template.name}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
