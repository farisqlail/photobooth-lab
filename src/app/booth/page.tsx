"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useSearchParams } from "next/navigation";
import { AnimatePresence } from "framer-motion";
import { Sparkles, Cloud } from "lucide-react";

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
  const searchParams = useSearchParams();
  const autoStart = searchParams.get("autoStart");
  
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
    retakePhoto,
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
  const [retakeIndex, setRetakeIndex] = useState<number | null>(null);
  const [selectedFilter, setSelectedFilter] = useState(filters[0].value);
  const [sessionTimeLeft, setSessionTimeLeft] = useState<number | null>(null);
  const [isVoucherDialogOpen, setIsVoucherDialogOpen] = useState(false);
  const [voucherCode, setVoucherCode] = useState("");
  const [verifyingVoucher, setVerifyingVoucher] = useState(false);

  const [isAutoStarting, setIsAutoStarting] = useState(false);

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
    setRetakeIndex(null);
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

  const handleStart = useCallback(async () => {
    console.log("[handleStart] Triggered");
    
    // If triggered by autoStart, set loading state
    if (autoStart === "true") {
        setIsAutoStarting(true);
    }
    
    try {
      await loadPricing();
      const methods = await loadPaymentMethods();
      console.log("[handleStart] Payment methods loaded:", methods?.length);
      
      // Check if "Event" is the ONLY active payment method
      // Note: methods can be undefined if something fails, so we check for array existence
      if (methods && methods.length === 1 && methods[0].name === "Event") {
        console.log("[handleStart] Auto-selecting 'Event' payment method");
        dispatch({ type: "SET_PAYMENT_METHOD", method: methods[0].name });
        
        const templates = await loadTemplates();
        console.log("[handleStart] Templates loaded:", templates?.length);
        if (templates.length > 0) {
          const first = templates[0];
          setSelectedTemplate(first);
          dispatch({ type: "SET_TEMPLATE", templateId: first.id });
          const image = await loadImage(first.url);
          setTemplateImage(image);
        }
        console.log("[handleStart] Going to step: template");
        await goToStep("template");
        return;
      }

      const templates = await loadTemplates();
      console.log("[handleStart] Templates loaded (default flow):", templates?.length);
      if (templates.length > 0) {
        const first = templates[0];
        setSelectedTemplate(first);
        dispatch({ type: "SET_TEMPLATE", templateId: first.id });
        const image = await loadImage(first.url);
        setTemplateImage(image);
      }
      console.log("[handleStart] Going to step: template (default flow)");
      await goToStep("template");
    } catch (error) {
        console.error("[handleStart] Error starting session:", error);
    } finally {
        setIsAutoStarting(false);
    }
  }, [dispatch, loadPricing, loadPaymentMethods, loadTemplates, goToStep, setSelectedTemplate, setTemplateImage, autoStart]);

  const hasAutoStarted = useRef(false);

  useEffect(() => {
    if (autoStart === "true" && state.step === "idle" && !hasAutoStarted.current) {
      console.log("[useEffect] Auto-start triggered");
      hasAutoStarted.current = true;
      handleStart();
    }
  }, [autoStart, state.step, handleStart]);

  // If auto-starting, show a fake loading screen that mimics the Home page
  if (isAutoStarting) {
    return (
      <div className="relative flex w-full max-w-2xl flex-col items-center overflow-hidden rounded-xl bg-white p-8 shadow-2xl">
        
        {/* Checkered Frame */}
        <div className="relative mb-8 flex aspect-[4/3] w-full max-w-md items-center justify-center overflow-hidden border-[12px] border-[#333] bg-sky-200 p-1 shadow-inner">
           {/* Decorative Dots Pattern on Border */}
           <div className="absolute inset-0 border-[4px] border-dashed border-white/30 pointer-events-none"></div>
           
           {/* Illustration */}
           <div className="relative h-full w-full overflow-hidden bg-[#87CEEB]">
             {/* Clouds */}
             <Cloud className="absolute left-10 top-10 h-16 w-16 text-white opacity-90" fill="white" />
             <Cloud className="absolute right-20 top-16 h-12 w-12 text-white opacity-80" fill="white" />
             <Cloud className="absolute left-1/2 top-8 h-20 w-20 -translate-x-1/2 text-white" fill="white" />
             
             {/* Hills */}
             <div className="absolute bottom-0 h-1/2 w-full">
               <div className="absolute bottom-0 left-0 h-full w-[120%] -translate-x-10 rounded-tr-[100%] bg-[#7CB342]" />
               <div className="absolute bottom-0 right-0 h-[80%] w-[120%] translate-x-10 rounded-tl-[100%] bg-[#558B2F]" />
             </div>
           </div>
        </div>

        {/* Retro Logo */}
        <h1 className="mb-8 text-6xl font-black tracking-tighter text-white sm:text-7xl"
            style={{
              textShadow: `
                4px 4px 0px #00AEEF,
                8px 8px 0px #FFF200,
                12px 12px 0px #F7941D,
                16px 16px 0px #EC008C
              `,
              WebkitTextStroke: "2px black"
            }}>
          BOOTHLAB
        </h1>

        {/* Loading Indicator */}
        <div className="flex flex-col items-center gap-4 h-14 justify-center">
           <div className="h-8 w-8 animate-spin rounded-full border-4 border-black border-t-transparent" />
           <p className="text-sm font-semibold text-muted-foreground">Memulai sesi...</p>
        </div>

      </div>
    );
  }

  const handleSelectPayment = async (method: PaymentMethod) => {
    if (method.type === 'cash') {
       setIsVoucherDialogOpen(true);
       return;
    }

    dispatch({ type: "SET_PAYMENT_METHOD", method: method.name });
    
    const transactionId = await createTransaction(
      state.transaction.total_price, 
      method.name, 
      selectedTemplate?.id
    );
    
    if (transactionId) {
      dispatch({ type: "SET_TRANSACTION_ID", id: transactionId });
    }

    await goToStep("qris");
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
         const methodName = cashMethod?.name || "Cash";
         dispatch({ type: "SET_PAYMENT_METHOD", method: methodName });
         
         const transactionId = await createTransaction(
           state.transaction.total_price, 
           methodName, 
           selectedTemplate?.id
         );
         
         if (transactionId) {
           dispatch({ type: "SET_TRANSACTION_ID", id: transactionId });
           await updateTransactionStatus(transactionId, "paid");
         }

         dispatch({ type: "SET_PAYMENT_STATUS", status: "paid" });
         await goToStep("session");
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
    
    const transactionId = await createTransaction(
      state.transaction.total_price, 
      method.name, 
      selectedTemplate?.id
    );
    
    if (transactionId) {
      dispatch({ type: "SET_TRANSACTION_ID", id: transactionId });
    }

    await goToStep("qris");
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
    
    // Check if Event mode is active
    if (state.transaction.payment_method?.toLowerCase() === "event") {
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

    await goToStep("payment");
  };

  const handleSimulatePaid = async () => {
    dispatch({ type: "SET_PAYMENT_STATUS", status: "paid" });
    if (state.transaction.id) {
      await updateTransactionStatus(state.transaction.id, "paid");
    }
    await goToStep("session");
  };

  const handleRetakePhotoRequest = (index: number) => {
    setRetakeIndex(index);
    goToStep("session");
  };

  const handleCancelRetake = () => {
    setRetakeIndex(null);
    goToStep("filter");
  };

  const handleStartPhotoSession = async () => {
    if (retakeIndex !== null) {
      await retakePhoto(retakeIndex, selectedTemplate, templateImage, async () => {
        setRetakeIndex(null);
        await goToStep("filter");
      });
    } else {
      await startPhotoSession(selectedTemplate, templateImage, async () => {
        await goToStep("filter");
      });
    }
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
    <div className="relative flex w-full max-w-6xl h-[90vh] flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
      {/* Header */}
      <header className="flex h-20 items-center justify-between border-b px-8 shrink-0">
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
      <div className="flex-1 overflow-hidden p-6 relative">
        <>
          <AnimatePresence mode="wait">
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
                  pricing={pricing}
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
                  retakeIndex={retakeIndex}
                  onCancelRetake={handleCancelRetake}
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
                  onRetakePhoto={handleRetakePhotoRequest}
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
          </>
        </div>
      </div>
  );
}
