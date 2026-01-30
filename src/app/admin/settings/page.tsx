"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCcw } from "lucide-react";
import { createSupabaseBrowserClient } from "../../../lib/supabase/client";
import { Button } from "../../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { Input } from "../../../components/ui/input";
import { useToast } from "../../../components/ui/toast";

type PaymentMethod = {
  id: string;
  name: string;
  type: "cash" | "non_cash";
  is_active: boolean;
};

type PricingSettings = {
  id?: string;
  base_price: number;
  per_print_price: number;
  session_countdown: number;
};

export default function AdminSettingsPage() {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [pricing, setPricing] = useState<PricingSettings>({
    base_price: 20000,
    per_print_price: 5000,
    session_countdown: 300,
  });
  const [pricingId, setPricingId] = useState<string | null>(null);

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

  const loadPaymentMethods = useCallback(async () => {
    if (!supabase) {
      return;
    }
    const { data } = await supabase
      .from("payment_methods")
      .select("id,name,type,is_active")
      .order("sort_order", { ascending: true });
    setPaymentMethods(data ?? []);
  }, [supabase]);

  const loadPricing = useCallback(async () => {
    if (!supabase) {
      return;
    }
    // Try with session_countdown
    const { data, error } = await supabase
      .from("pricing_settings")
      .select("id,base_price,per_print_price,session_countdown,updated_at")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error && error.code === "PGRST200") {
      // Fallback: column missing
      console.warn("session_countdown column missing in DB");
      const { data: fallbackData } = await supabase
        .from("pricing_settings")
        .select("id,base_price,per_print_price,updated_at")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (fallbackData) {
        setPricing({
            base_price: Number(fallbackData.base_price),
            per_print_price: Number(fallbackData.per_print_price),
            session_countdown: 300,
        });
        setPricingId(fallbackData.id);
      }
      return;
    }

    if (data) {
      setPricing({
        base_price: Number(data.base_price),
        per_print_price: Number(data.per_print_price),
        session_countdown: data.session_countdown ? Number(data.session_countdown) : 300,
      });
      setPricingId(data.id);
    }
  }, [supabase]);

  useEffect(() => {
    const run = async () => {
      if (!supabase) {
        setLoading(false);
        return;
      }
      await Promise.all([loadPaymentMethods(), loadPricing()]);
      setLoading(false);
    };
    run();
  }, [loadPaymentMethods, loadPricing, supabase]);

  useEffect(() => {
    if (supabaseState.error) {
      showToast({ variant: "error", message: supabaseState.error });
    }
  }, [showToast, supabaseState.error]);

  const togglePayment = async (method: PaymentMethod) => {
    if (!supabase) {
      return;
    }
    const next = !method.is_active;
    const { error } = await supabase
      .from("payment_methods")
      .update({ is_active: next })
      .eq("id", method.id);
    if (error) {
      showToast({ variant: "error", message: error.message });
      return;
    }
    setPaymentMethods((prev) =>
      prev.map((item) => (item.id === method.id ? { ...item, is_active: next } : item))
    );
    showToast({
      variant: "success",
      message: `${method.name} ${next ? "diaktifkan" : "dinonaktifkan"}.`,
    });
  };

  const savePricing = async () => {
    if (!supabase) {
      return;
    }
    if (pricingId) {
      const { error } = await supabase
        .from("pricing_settings")
        .update({
          base_price: pricing.base_price,
          per_print_price: pricing.per_print_price,
          session_countdown: pricing.session_countdown,
          updated_at: new Date().toISOString(),
        })
        .eq("id", pricingId);
      if (error) {
        showToast({ variant: "error", message: error.message });
        return;
      }
      showToast({ variant: "success", message: "Harga berhasil diperbarui." });
      return;
    }
    const { data, error } = await supabase
      .from("pricing_settings")
      .insert({
        base_price: pricing.base_price,
        per_print_price: pricing.per_print_price,
      })
      .select("id")
      .single();
    if (error) {
      showToast({ variant: "error", message: error.message });
      return;
    }
    if (data?.id) {
      setPricingId(data.id);
    }
    showToast({ variant: "success", message: "Harga berhasil disimpan." });
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-sm text-muted-foreground">
        Memuat pengaturan...
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardHeader>
            <CardTitle>Payment Manager</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {paymentMethods.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Belum ada metode pembayaran.
              </p>
            )}
            {paymentMethods.map((method) => (
              <div
                key={method.id}
                className="flex items-center justify-between rounded-xl border border-border bg-background px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`h-2.5 w-2.5 rounded-full ${
                      method.is_active
                        ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]"
                        : "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]"
                    }`}
                  />
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold">{method.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {method.name === "Event"
                        ? "Event Mode"
                        : method.type === "cash"
                        ? "Tunai"
                        : "Non-Tunai"}
                    </span>
                  </div>
                </div>
                <Button
                  variant={method.is_active ? "default" : "outline"}
                  onClick={() => togglePayment(method)}
                >
                  {method.is_active ? "Aktif" : "Nonaktif"}
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Price Manager</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Harga per sesi
              </span>
              <Input
                type="number"
                value={pricing.base_price}
                onChange={(event) =>
                  setPricing((prev) => ({
                    ...prev,
                    base_price: Number(event.target.value),
                  }))
                }
              />
            </div>
            <div className="flex flex-col gap-2">
              <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Harga per lembar
              </span>
              <Input
                type="number"
                value={pricing.per_print_price}
                onChange={(event) =>
                  setPricing((prev) => ({
                    ...prev,
                    per_print_price: Number(event.target.value),
                  }))
                }
              />
            </div>
            <div className="flex flex-col gap-2">
              <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Countdown Sesi (Menit)
              </span>
              <Input
                type="number"
                value={
                  pricing.session_countdown === 0
                    ? ""
                    : Math.floor(pricing.session_countdown / 60)
                }
                onChange={(event) =>
                  setPricing((prev) => ({
                    ...prev,
                    session_countdown:
                      event.target.value === "" ? 0 : Number(event.target.value) * 60,
                  }))
                }
              />
              <p className="text-xs text-muted-foreground">
                Waktu maksimal sesi foto sebelum kembali ke halaman awal (Default: 5 menit)
              </p>
            </div>
            <Button onClick={savePricing}>
              <RefreshCcw className="h-4 w-4" />
              Simpan Harga
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
