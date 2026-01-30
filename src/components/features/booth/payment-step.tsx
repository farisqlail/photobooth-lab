import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronLeft } from "lucide-react";
import { motion } from "framer-motion";
import { PaymentMethod, Step } from "./types";

interface PaymentStepProps {
  paymentOptions: PaymentMethod[];
  nonCashAvailable: boolean;
  onSelectPayment: (method: PaymentMethod) => void;
  onGoToStep: (step: Step) => void;
}

export function PaymentStep({
  paymentOptions,
  nonCashAvailable,
  onSelectPayment,
  onGoToStep,
}: PaymentStepProps) {
  return (
    <motion.section
      key="payment"
      className="flex min-h-[calc(100vh-14rem)] flex-col items-center justify-center gap-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.5 }}
    >
      <div className="grid w-full max-w-5xl gap-6 md:grid-cols-2 lg:grid-cols-3">
        {paymentOptions.map((method) => (
          <Card 
            key={method.id} 
            className="cursor-pointer transition-all hover:bg-accent/50 hover:shadow-lg"
            onClick={() => onSelectPayment(method)}
          >
            <CardHeader>
              <CardTitle>{method.name === "Event" ? "Event Mode" : method.name}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <p className="text-sm text-muted-foreground">
                {method.name === "Event" 
                  ? "Mode gratis untuk event/undangan." 
                  : method.type === "cash" 
                    ? "Bayar di kasir dan lanjutkan sesi foto." 
                    : "Bayar lewat QRIS atau e-wallet."}
              </p>
              <Button size="lg" className="w-full">
                Pilih {method.name === "Event" ? "Event Mode" : method.name}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
      <Button variant="ghost" onClick={() => onGoToStep("idle")}>
        <ChevronLeft className="h-4 w-4" />
        Kembali
      </Button>
    </motion.section>
  );
}
