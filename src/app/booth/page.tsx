"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AnimatePresence } from "framer-motion";
import { Sparkles } from "lucide-react";

import {
  PaymentMethod,
  Step,
  TemplateOption,
} from "../../components/features/booth/types";
import { filters } from "../../components/features/booth/constants";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

import { IdleStep } from "../../components/features/booth/idle-step";
import { PaymentStep } from "../../components/features/booth/payment-step";
import { NonCashStep } from "../../components/features/booth/non-cash-step";
import { TemplateStep } from "../../components/features/booth/template-step";
import { QuantityStep } from "../../components/features/booth/quantity-step";
import { QrisStep } from "../../components/features/booth/qris-step";
import { SessionStep } from "../../components/features/booth/session-step";
import { FilterStep } from "../../components/features/booth/filter-step";
import { DeliveryStep } from "../../components/features/booth/delivery-step";
import { FinishStep } from "../../components/features/booth/finish-step";

import { useBoothState } from "../../components/features/booth/hooks/useBoothState";
import { useBoothData } from "../../components/features/booth/hooks/useBoothData";
import { usePhotoSession } from "../../components/features/booth/hooks/usePhotoSession";
import { useImageProcessing } from "../../components/features/booth/hooks/useImageProcessing";
import { loadImage } from "../../components/features/booth/utils";

export default function BoothPage() {
  // --- Hooks ---
  const { state, dispatch } = useBoothState();
  const {
    supabase,
    paymentMethods,
    nonCashMethods,
    pricing,
    templates,
    loadPaymentMethods,
    loadPricing,
    loadTemplates,
    createTransaction,
    updateTransactionStatus,
  } = useBoothData();
  const {
    previewVideoRef,
    capturedPhotos,
    capturedVideos,
    isCapturing,
    countdown,
    startCamera,
    stopCamera,
    onPreviewVideoMount,
    startPhotoSession,
    resetSession,
  } = usePhotoSession();
  const {
    finalPreviewUrl,
    storageUrl,
    isUploading,
    generateFinalImage,
    resetImages,
  } = useImageProcessing(supabase);

  // --- Local State ---
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateOption | null>(null);
  const [templateImage, setTemplateImage] = useState<HTMLImageElement | null>(null);
  const [selectedFilter, setSelectedFilter] = useState(filters[0].value);
  const [sessionTimeLeft, setSessionTimeLeft] = useState<number | null>(null);
  const [isVoucherDialogOpen, setIsVoucherDialogOpen] = useState(false);
  const [voucherCode, setVoucherCode] = useState("");
  const [verifyingVoucher, setVerifyingVoucher] = useState(false);

  // --- Refs ---
  const finishTimerRef = useRef<number | null>(null);

  // --- Effects ---

  // --- Helpers ---

  const clearFinishTimer = useCallback(() => {
    if (finishTimerRef.current) {
      window.clearTimeout(finishTimerRef.current);
      finishTimerRef.current = null;
    }
  }, []);

  const resetFlow = useCallback(() => {
    clearFinishTimer();
    dispatch({ type: "RESET" });
    setSelectedTemplate(null);
    setTemplateImage(null);
    setSelectedFilter(filters[0].value);
    setSessionTimeLeft(null);
    resetSession();
    resetImages();
    // Note: We don't clear templates/payment methods data as they are global/cached
  }, [dispatch, resetSession, resetImages, clearFinishTimer]);

  const goToStep = async (step: Step) => {
    clearFinishTimer();
    if (step !== "session") {
      stopCamera();
    }
    dispatch({ type: "SET_STEP", step });
  };

  // --- Effects ---

  // Handle finish timer
  useEffect(() => {
    if (state.step === "finish") {
      finishTimerRef.current = window.setTimeout(() => {
        resetFlow();
      }, 10000);
    }
    return () => {
      if (finishTimerRef.current) {
        clearTimeout(finishTimerRef.current);
        finishTimerRef.current = null;
      }
    };
  }, [state.step, resetFlow]);

  // Handle session countdown
  useEffect(() => {
    if (state.transaction?.payment_status === "paid" && sessionTimeLeft === null) {
      setSessionTimeLeft(pricing.sessionCountdown);
    }
  }, [state.transaction?.payment_status, pricing.sessionCountdown, sessionTimeLeft]);

  useEffect(() => {
    if (sessionTimeLeft === null) return;

    if (sessionTimeLeft <= 0) {
      resetFlow();
      return;
    }

    const timer = setInterval(() => {
      setSessionTimeLeft((prev) => (prev !== null ? prev - 1 : null));
    }, 1000);

    return () => clearInterval(timer);
  }, [sessionTimeLeft, resetFlow]);

  // Load template image when selected template changes
  useEffect(() => {
    if (
      (state.step === "session" || state.step === "filter") &&
      selectedTemplate &&
      !templateImage
    ) {
      loadImage(selectedTemplate.url)
        .then(setTemplateImage)
        .catch((e) => console.error("Failed to reload template image", e));
    }
  }, [state.step, selectedTemplate, templateImage]);

  const stepLabel = useMemo(() => {
    switch (state.step) {
      case "payment":
        return "Payment Method Selection";
      case "noncash":
        return "Non-Cash Type Selection";
      case "template":
        return "Template Selection";
      case "quantity":
        return "Print Quantity Selection";
      case "qris":
        return "QRIS Payment Display";
      case "session":
        return "Photo Session";
      case "filter":
        return "Filter Selection";
      case "delivery":
        return "Delivery / Result";
      case "finish":
        return "Finish";
      default:
        return "Idle Screen";
    }
  }, [state.step]);

  // --- Handlers ---

  const handleStart = async () => {
    await loadPricing();
    const methods = await loadPaymentMethods();
    
    // Check if "Event" is the ONLY active payment method
    // Note: methods can be undefined if something fails, so we check for array existence
    if (methods && methods.length === 1 && methods[0].name === "Event") {
      dispatch({ type: "SET_PAYMENT_METHOD", method: methods[0].name });
      
      const templates = await loadTemplates();
      if (templates.length > 0) {
        const first = templates[0];
        setSelectedTemplate(first);
        dispatch({ type: "SET_TEMPLATE", templateId: first.id });
        const image = await loadImage(first.url);
        setTemplateImage(image);
      }
      await goToStep("template");
      return;
    }

    await goToStep("payment");
  };

  const proceedToTemplate = async () => {
    const templates = await loadTemplates();
    if (templates.length > 0) {
      const first = templates[0];
      setSelectedTemplate(first);
      dispatch({ type: "SET_TEMPLATE", templateId: first.id });
      const image = await loadImage(first.url);
      setTemplateImage(image);
    }
    await goToStep("template");
  };

  const handleSelectPayment = async (method: PaymentMethod) => {
    if (method.type === 'cash') {
       setIsVoucherDialogOpen(true);
       return;
    }

    dispatch({ type: "SET_PAYMENT_METHOD", method: method.name });
    await proceedToTemplate();
  };

  const handleVoucherSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!voucherCode.trim()) return;

    setVerifyingVoucher(true);
    try {
      const res = await fetch("/api/booth/redeem-voucher", {
         method: "POST",
         headers: { "Content-Type": "application/json" },
         body: JSON.stringify({ code: voucherCode }),
      });
      const data = await res.json();
      
      if (res.ok) {
         setIsVoucherDialogOpen(false);
         setVoucherCode(""); 
         
         const cashMethod = paymentMethods.find(m => m.type === 'cash');
         dispatch({ type: "SET_PAYMENT_METHOD", method: cashMethod?.name || "Cash" });
         
         await proceedToTemplate();
      } else {
         // Use native alert or toast if available. Since we don't have toast imported here yet (or context), alert is fine.
         alert(data.error || "Invalid voucher");
      }
    } catch (e) {
      console.error(e);
      alert("Error verifying voucher");
    } finally {
      setVerifyingVoucher(false);
    }
  };

  const handleSelectNonCash = async (method: PaymentMethod) => {
    dispatch({ type: "SET_PAYMENT_METHOD", method: method.name });
    await proceedToTemplate();
  };

  const handleTemplateSelect = async (template: TemplateOption) => {
    setSelectedTemplate(template);
    dispatch({ type: "SET_TEMPLATE", templateId: template.id });
    const image = await loadImage(template.url);
    setTemplateImage(image);
  };

  const handleGoToQuantity = async () => {
    if (!selectedTemplate) {
      return;
    }

    // Check if payment method is "Event"
    if (state.transaction.payment_method?.toLowerCase() === "event") {
        // Auto-select quantity 1 and skip quantity step
        dispatch({ type: "SET_QUANTITY", quantity: 1 });
        const total = 0; // Free for event
        dispatch({ type: "SET_TOTAL_PRICE", total });
        
        const transactionId = await createTransaction(
          total, 
          state.transaction.payment_method, 
          selectedTemplate?.id
        );
        
        if (transactionId) {
          dispatch({ type: "SET_TRANSACTION_ID", id: transactionId });
          await updateTransactionStatus(transactionId, "paid");
        }

        dispatch({ type: "SET_PAYMENT_STATUS", status: "paid" });
        await goToStep("session");
        return;
    }

    await goToStep("quantity");
  };

  const handleQuantitySelect = async (quantity: number) => {
    dispatch({ type: "SET_QUANTITY", quantity });
    const total = pricing.basePrice + quantity * pricing.perPrintPrice;
    dispatch({ type: "SET_TOTAL_PRICE", total });
    
    const transactionId = await createTransaction(
      total, 
      state.transaction.payment_method, 
      selectedTemplate?.id
    );
    
    if (transactionId) {
      dispatch({ type: "SET_TRANSACTION_ID", id: transactionId });
    }

    const method = state.transaction.payment_method?.toLowerCase();
    if (method === "tunai" || method === "cash" || method === "event") {
      dispatch({ type: "SET_PAYMENT_STATUS", status: "paid" });
      if (transactionId) {
        await updateTransactionStatus(transactionId, "paid");
      }
      await goToStep("session");
      return;
    }
    await goToStep("qris");
  };

  const handleSimulatePaid = async () => {
    dispatch({ type: "SET_PAYMENT_STATUS", status: "paid" });
    if (state.transaction.id) {
      await updateTransactionStatus(state.transaction.id, "paid");
    }
    await goToStep("session");
  };

  const handleStartPhotoSession = async () => {
    await startPhotoSession(selectedTemplate, templateImage, async () => {
      await goToStep("filter");
    });
  };

  const handleGenerateFinalImage = async () => {
    const result = await generateFinalImage({
      capturedPhotos,
      selectedTemplate,
      templateImage,
      selectedFilter,
      transactionId: state.transaction.id,
    });
    
    if (result) {
        if (result.uploadedUrl) {
             dispatch({ type: "SET_PHOTO_URL", url: result.uploadedUrl });
        } else {
             dispatch({ type: "SET_PHOTO_URL", url: result.finalUrl });
        }
      await goToStep("delivery");
    }
  };

  const handleSetEmail = (email: string) => {
    dispatch({ type: "SET_EMAIL", email });
  };

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground overflow-hidden">
      {/* Header */}
      <header className="flex h-20 items-center justify-between border-b px-8">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/25">
            <Sparkles className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold leading-none tracking-tight">
              Photobooth
            </h1>
            <p className="text-xs font-medium text-muted-foreground">
              Capture your moment
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {sessionTimeLeft !== null && (
            <div className={`rounded-full px-4 py-1.5 text-sm font-bold backdrop-blur-sm transition-colors ${
              sessionTimeLeft <= 60 
                ? "bg-red-500/80 text-white animate-pulse" 
                : "bg-primary/80 text-primary-foreground"
            }`}>
              {Math.floor(sessionTimeLeft / 60)}:{(sessionTimeLeft % 60).toString().padStart(2, '0')}
            </div>
          )}
          <div className="rounded-full bg-secondary/50 px-4 py-1.5 text-sm font-medium text-secondary-foreground backdrop-blur-sm">
            {stepLabel}
          </div>
          <div className="h-2 w-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden p-6 relative">
        <AnimatePresence mode="wait">
          {state.step === "idle" && (
            <IdleStep key="idle" onStart={handleStart} />
          )}

          {state.step === "payment" && (
            <PaymentStep
              key="payment"
              paymentOptions={paymentMethods}
              nonCashAvailable={nonCashMethods.length > 0}
              onSelectPayment={handleSelectPayment}
              onGoToStep={goToStep}
            />
          )}

          {state.step === "noncash" && (
            <NonCashStep
              key="noncash"
              nonCashMethods={nonCashMethods}
              onSelectNonCash={handleSelectNonCash}
              onGoToStep={goToStep}
            />
          )}

          {state.step === "template" && (
            <TemplateStep
              key="template"
              templates={templates}
              selectedTemplate={selectedTemplate}
              onSelectTemplate={handleTemplateSelect}
              onGoToStep={goToStep}
              onGoToQuantity={handleGoToQuantity}
            />
          )}

          {state.step === "quantity" && (
            <QuantityStep
              key="quantity"
              quantity={state.transaction.quantity}
              pricing={pricing}
              onSelectQuantity={handleQuantitySelect}
              onGoToStep={goToStep}
            />
          )}

          {state.step === "qris" && (
            <QrisStep
              key="qris"
              transaction={state.transaction}
              onSimulatePaid={handleSimulatePaid}
              onGoToStep={goToStep}
            />
          )}

          {state.step === "session" && (
            <SessionStep
              key="session"
              capturedPhotos={capturedPhotos}
              selectedTemplate={selectedTemplate}
              onPreviewVideoMount={onPreviewVideoMount}
              countdown={countdown}
              startPhotoSession={handleStartPhotoSession}
              isCapturing={isCapturing}
              onGoToStep={goToStep}
            />
          )}

          {state.step === "filter" && (
            <FilterStep
              key="filter"
              capturedPhotos={capturedPhotos}
              selectedTemplate={selectedTemplate}
              templateImage={templateImage}
              selectedFilter={selectedFilter}
              onSelectFilter={setSelectedFilter}
              onGoToStep={goToStep}
              onGenerateFinalImage={handleGenerateFinalImage}
            />
          )}

          {state.step === "delivery" && (
            <DeliveryStep
              key="delivery"
              finalPreviewUrl={finalPreviewUrl}
              storageUrl={storageUrl}
              isUploading={isUploading}
              transaction={state.transaction}
              onSetEmail={handleSetEmail}
              onGoToStep={goToStep}
              capturedPhotos={capturedPhotos}
              capturedVideos={capturedVideos}
              supabase={supabase}
            />
          )}

          {state.step === "finish" && (
            <FinishStep key="finish" onReset={resetFlow} />
          )}
        </AnimatePresence>

        <Dialog open={isVoucherDialogOpen} onOpenChange={setIsVoucherDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Enter Voucher Code</DialogTitle>
              <DialogDescription>
                Please enter the voucher code provided by the operator.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleVoucherSubmit} className="space-y-4">
              <Input
                placeholder="PH-XXXX"
                value={voucherCode}
                onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
                autoFocus
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsVoucherDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={verifyingVoucher || !voucherCode}>
                  {verifyingVoucher ? "Verifying..." : "Validate"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
