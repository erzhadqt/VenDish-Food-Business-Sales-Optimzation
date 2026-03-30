import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../Components/ui/dialog";
import { Button } from "../Components/ui/button";
import { Input } from "../Components/ui/input";

export default function GCashPaymentModal({
  open,
  onOpenChange,
  checkoutUrl,
  status,
  reference: initialReference,
  amount,
  accountName,
  accountNumber,
  onRefresh,
  onCancel,
  onFinalize,
  onDevOverride 
}) {
  const isPaid = status === "PAID";
  const isFailed = status === "FAILED" || status === "EXPIRED" || status === "CANCELLED";
  
  const [manualReference, setManualReference] = useState("");
  // NEW: State to toggle between the QR code and the manual fallback instructions
  const [showFallback, setShowFallback] = useState(false);

  // Clear inputs and reset views when the modal opens/closes
  useEffect(() => {
    if (open) {
      setManualReference("");
      setShowFallback(false);
    }
  }, [open]);

  const handleFinalize = () => {
    if (isPaid) {
      onFinalize(manualReference.trim() || initialReference);
    } else {
      onCancel();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg z-50">
        <DialogHeader>
          <DialogTitle>GCash Payment</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 text-sm flex flex-col items-center">
          {/* Payment Summary Section */}
          <div className="w-full rounded-xl border bg-slate-50 p-4 shadow-sm">
            <div className="flex justify-between items-center mb-2">
              <span className="text-gray-500 font-medium">Amount to Pay</span>
              <span className="font-bold text-2xl text-blue-600">
                ₱{amount ? parseFloat(amount).toFixed(2) : "0.00"}
              </span>
            </div>
            {(accountName || accountNumber) && (
              <div className="pt-3 mt-2 border-t border-gray-200 space-y-1">
                {accountName && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500 text-xs uppercase tracking-wider">Account Name</span>
                    <span className="font-semibold text-gray-800">{accountName}</span>
                  </div>
                )}
                {accountNumber && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500 text-xs uppercase tracking-wider">Account Number</span>
                    <span className="font-mono font-semibold text-gray-800 tracking-wide">{accountNumber}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Status Display */}
          <div className="w-full rounded-lg border p-3 flex justify-between items-center bg-white">
            <span className="text-xs text-gray-500 uppercase tracking-wider font-bold">Status</span>
            <span className={`font-bold text-lg ${
              isPaid ? "text-green-600" : isFailed ? "text-red-600" : "text-orange-500 animate-pulse"
            }`}>
              {status || "PENDING"}
            </span>
          </div>

          {/* QR Code OR Fallback Section */}
          {!isPaid && (
            <div className="flex flex-col items-center space-y-4 w-full transition-all duration-300">
              
              {!showFallback ? (
                <>
                  {/* The QR Code View */}
                  <div className="p-3 bg-white border-4 border-white rounded-2xl shadow-lg ring-1 ring-gray-200 transition-transform hover:scale-[1.02]">
                    {checkoutUrl?.startsWith('data:image') ? (
                      <img 
                        src={checkoutUrl} 
                        alt="Scan to Pay via QR Ph" 
                        className="w-[280px] h-[280px] sm:w-[320px] sm:h-[320px] object-contain rendering-intent-crisp" 
                      />
                    ) : (
                      <div className="w-[280px] h-[280px] flex items-center justify-center text-gray-400 text-sm text-center bg-gray-50 rounded-xl">
                        QR Code Unavailable
                      </div>
                    )}
                  </div>
                  
                  {/* Toggle Button -> To Fallback */}
                  <button 
                    type="button" 
                    onClick={() => setShowFallback(true)}
                    className="text-sm font-semibold text-blue-600 hover:text-blue-800 underline transition-colors"
                  >
                    Having trouble scanning? Click here
                  </button>
                </>
              ) : (
                <>
                  {/* The Manual Fallback View */}
                  <div className="text-center bg-blue-50 text-blue-800 px-4 py-8 rounded-xl w-full border border-blue-200 shadow-inner">
                    <p className="text-xs font-bold uppercase tracking-widest text-blue-500 mb-3">Manual Transfer</p>
                    <p className="text-sm text-gray-700">
                      Send exactly <span className="font-bold text-red-600 text-lg">₱{parseFloat(amount).toFixed(2)}</span> to:
                    </p>
                    <p className="text-3xl font-mono font-black tracking-widest mt-3 mb-2 text-gray-900 drop-shadow-sm">
                      {accountNumber || "09XX-XXX-XXXX"}
                    </p>
                    <p className="text-sm text-blue-700 font-bold uppercase tracking-wide">{accountName || "Account Name"}</p>
                  </div>
                  
                  {/* Toggle Button -> Back to QR */}
                  <button 
                    type="button" 
                    onClick={() => setShowFallback(false)}
                    className="text-sm font-medium text-gray-500 hover:text-gray-800 underline transition-colors"
                  >
                    Go back to QR Code
                  </button>
                </>
              )}

            </div>
          )}

          {/* Manual Reference Input (Only shows when PAID) */}
          {isPaid && (
            <div className="w-full space-y-2 pt-2 animate-in fade-in slide-in-from-bottom-2">
              <label className="text-sm font-bold text-gray-700">
                Enter GCash Ref No. (From Customer's App)
              </label>
              <Input
                type="text"
                placeholder="e.g. 100023456789"
                value={manualReference}
                onChange={(e) => setManualReference(e.target.value)}
                className="font-mono text-lg border-green-500 focus-visible:ring-green-500"
                autoFocus
              />
              <p className="text-xs text-gray-500 italic">
                Input the reference number from the customer's successful payment screen to print on the receipt.
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-2 mt-4 border-t pt-4 flex flex-col sm:flex-row justify-between w-full">
          {!isPaid && (
            <div className="flex flex-col sm:flex-row gap-2 w-full">
              {onDevOverride && (
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={onDevOverride} 
                  className="w-full sm:w-auto bg-yellow-100 text-yellow-800 border-yellow-300 hover:bg-yellow-200 font-bold sm:mr-auto"
                >
                  Test: Force Paid
                </Button>
              )}
              <Button type="button" variant="outline" onClick={onRefresh} className="w-full sm:w-auto">
                Refresh Status
              </Button>
            </div>
          )}
          
          <Button 
            type="button" 
            variant={isPaid ? "default" : "destructive"} 
            onClick={handleFinalize} 
            className={`w-full sm:w-auto ${isPaid ? "bg-green-600 hover:bg-green-700 text-white font-bold shadow-md" : ""}`}
            disabled={isPaid && manualReference.trim().length < 5} 
          >
            {isPaid ? "Finalize & Print Receipt" : "Cancel Payment"}
          </Button>
        </DialogFooter>

      </DialogContent>
    </Dialog>
  );
}