import React, { useEffect } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { ChevronLeft, CheckCircle2, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { Step, TemplateOption } from "./types";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface TemplateStepProps {
  templates: TemplateOption[];
  pricing: { basePrice: number };
  selectedTemplate: TemplateOption | null;
  onSelectTemplate: (template: TemplateOption) => void;
  onGoToQuantity: () => void;
  onGoToStep: (step: Step) => void;
}

export function TemplateStep({
  templates,
  pricing,
  selectedTemplate,
  onSelectTemplate,
  onGoToQuantity,
  onGoToStep,
}: TemplateStepProps) {

  // Auto-select first template if none selected
  useEffect(() => {
    if (!selectedTemplate && templates.length > 0) {
      onSelectTemplate(templates[0]);
    }
  }, [templates, selectedTemplate, onSelectTemplate]);

  return (
    <motion.div
      className="flex h-full w-full gap-4 p-2"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.3 }}
    >
      {/* COLUMN 1: Frame Grid */}
      <div className="flex flex-1 flex-col rounded-[2rem] bg-white p-6 shadow-xl border border-zinc-100">
        <div className="mb-6 flex items-center gap-4">
          <Button 
             variant="ghost" 
             size="icon" 
             className="h-10 w-10 rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-900"
             asChild
           >
             <Link href="/">
               <ChevronLeft className="h-6 w-6" />
             </Link>
           </Button>
          <div className="space-y-1">
            <h2 className="text-2xl font-bold text-zinc-900">Pilih Frame</h2>
            <p className="text-sm text-zinc-500 font-medium">
               Silakan pilih frame yang Anda sukai
            </p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto pr-2">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-4">
             {templates.length === 0 ? (
                <div className="col-span-full flex h-40 items-center justify-center text-zinc-400">
                   Memuat template...
                </div>
             ) : (
                templates.map((template) => {
                  const isSelected = selectedTemplate?.id === template.id;
                  return (
                    <button
                      key={template.id}
                      onClick={() => onSelectTemplate(template)}
                      className={cn(
                        "group relative aspect-[3/4] w-full overflow-hidden rounded-2xl border-2 transition-all duration-300",
                        isSelected 
                          ? "border-black ring-4 ring-black/10 shadow-xl scale-[0.98]" 
                          : "border-zinc-100 hover:border-zinc-300 hover:shadow-lg"
                      )}
                    >
                      <Image
                        src={template.url}
                        alt={template.name}
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                        unoptimized
                        priority={false}
                      />
                      {isSelected && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[2px] transition-all">
                           <div className="bg-white text-black p-3 rounded-full shadow-2xl transform scale-110">
                              <CheckCircle2 className="h-8 w-8 fill-black text-white" />
                           </div>
                        </div>
                      )}
                    </button>
                  )
                })
             )}
          </div>
        </div>
      </div>

      {/* COLUMN 2: Preview & Action */}
      <div className="flex w-[35%] flex-col rounded-[2rem] bg-black p-3 shadow-2xl text-white">
        <div className="relative flex-1 w-full overflow-hidden rounded-[1.5rem] bg-white">
           {/* Background Pattern/Gradient for preview area */}
           <div className="absolute inset-0 bg-gradient-to-b from-sky-300 to-blue-500 opacity-20" />
           
           {selectedTemplate ? (
             <div className="relative h-full w-full p-6 flex items-center justify-center">
               <Image 
                  src={selectedTemplate.url} 
                  alt="Preview" 
                  fill 
                  className="object-contain drop-shadow-2xl"
                  unoptimized
                  priority
               />
             </div>
           ) : (
             <div className="flex h-full items-center justify-center text-zinc-500">
               Select a template
             </div>
           )}
        </div>
        
        <div className="mt-2 p-5">
           <div className="flex items-end justify-between mb-6">
              <div className="flex-1 mr-4">
                <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-1">Selected Frame</p>
                <p className="font-bold text-lg leading-tight line-clamp-2">{selectedTemplate?.name || "None"}</p>
              </div>
           </div>

           <Button 
             size="lg" 
             className="w-full rounded-full bg-white text-black hover:bg-zinc-200 h-16 text-xl font-bold shadow-[0_0_20px_rgba(255,255,255,0.2)] transition-all hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(255,255,255,0.3)]"
             onClick={onGoToQuantity}
             disabled={!selectedTemplate}
           >
             Start
             <ArrowRight className="ml-3 h-6 w-6" />
           </Button>
        </div>
      </div>
    </motion.div>
  );
}
