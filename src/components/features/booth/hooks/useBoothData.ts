import { useState, useMemo } from "react";
import { createSupabaseBrowserClient } from "../../../../lib/supabase/client";
import { PaymentMethod, TemplateOption } from "../types";
import { loadImage } from "../utils";

export function useBoothData() {
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

  const supabase = useMemo(() => supabaseState.client, [supabaseState.client]);

  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [nonCashMethods, setNonCashMethods] = useState<PaymentMethod[]>([]);
  const [templates, setTemplates] = useState<TemplateOption[]>([]);
  const [pricing, setPricing] = useState({ basePrice: 20000, perPrintPrice: 5000, sessionCountdown: 300 });

  const loadPaymentMethods = async () => {
    if (!supabase) {
      setPaymentMethods([
        { id: "cash", name: "Tunai", type: "cash", is_active: true },
        { id: "qris", name: "QRIS", type: "non_cash", is_active: true },
        { id: "gopay", name: "GoPay", type: "non_cash", is_active: true },
        { id: "ovo", name: "OVO", type: "non_cash", is_active: true },
      ]);
      setNonCashMethods([
        { id: "qris", name: "QRIS", type: "non_cash", is_active: true },
        { id: "gopay", name: "GoPay", type: "non_cash", is_active: true },
        { id: "ovo", name: "OVO", type: "non_cash", is_active: true },
      ]);
      return [
        { id: "cash", name: "Tunai", type: "cash", is_active: true },
        { id: "qris", name: "QRIS", type: "non_cash", is_active: true },
        { id: "gopay", name: "GoPay", type: "non_cash", is_active: true },
        { id: "ovo", name: "OVO", type: "non_cash", is_active: true },
      ];
    }
    const { data } = await supabase
      .from("payment_methods")
      .select("id,name,type,is_active")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });
    const methods = data ?? [];
    const nonCash = methods.filter((method) => method.type === "non_cash");
    setPaymentMethods(methods);
    setNonCashMethods(nonCash);
    return methods;
  };

  const loadPricing = async () => {
    if (!supabase) {
      return;
    }
    
    // Try to select with session_countdown
    const { data, error } = await supabase
      .from("pricing_settings")
      .select("id,base_price,per_print_price,session_countdown,updated_at")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error && error.code === "PGRST200") {
        // Fallback if column doesn't exist
        console.warn("session_countdown column missing, using default.");
        const { data: fallbackData } = await supabase
          .from("pricing_settings")
          .select("id,base_price,per_print_price,updated_at")
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle();
          
        if (fallbackData) {
            setPricing({
                basePrice: Number(fallbackData.base_price),
                perPrintPrice: Number(fallbackData.per_print_price),
                sessionCountdown: 300,
            });
        }
        return;
    }

    if (data) {
      setPricing({
        basePrice: Number(data.base_price),
        perPrintPrice: Number(data.per_print_price),
        sessionCountdown: data.session_countdown ? Number(data.session_countdown) : 300,
      });
    }
  };

  const loadTemplates = async () => {
    if (!supabase) {
      setTemplates([]);
      return [];
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
            : [];
          
          if (template.file_path.startsWith("http")) {
            return {
              id: template.id,
              name: template.name,
              file_path: template.file_path,
              url: template.file_path,
              slots: slots_config.length > 0 ? slots_config.length : 1,
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
            slots: slots_config.length > 0 ? slots_config.length : 1,
            photo_x: template.photo_x,
            photo_y: template.photo_y,
            photo_width: template.photo_width,
            photo_height: template.photo_height,
            slots_config,
          };
        })
      )) ?? [];
    
    const available = mapped.filter((item) => item.url);
    setTemplates(available);
    return available;
  };

  const createTransaction = async (total: number, paymentMethod?: string, templateId?: string) => {
    if (!supabase) {
      return null;
    }
    const { data } = await supabase
      .from("transactions")
      .insert({
        total_price: total,
        payment_method: paymentMethod,
        payment_status: "pending",
        template_id: templateId ?? null,
      })
      .select("id")
      .single();
    return data?.id ?? null;
  };

  const updateTransactionStatus = async (id: string, status: "paid" | "pending" | "canceled") => {
    if (!supabase) return;
    await supabase
      .from("transactions")
      .update({ payment_status: status })
      .eq("id", id);
  };

  return {
    supabase,
    paymentMethods,
    nonCashMethods,
    templates,
    pricing,
    loadPaymentMethods,
    loadPricing,
    loadTemplates,
    createTransaction,
    updateTransactionStatus,
  };
}
