import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../Components/ui/dialog";
import { Button } from "../Components/ui/button";
import { Input } from "../Components/ui/input"; // Make sure you have this UI component, or use a standard <input>

export default function GCashPaymentModal({
  open,
  onOpenChange,
  checkoutUrl,
  status,
  reference: initialReference, // PayMongo's internal reference
  amount,
  accountName,
  accountNumber,
  onRefresh,
  onCancel,
  onFinalize, // NEW PROB: Pass the manual reference back to POS
}) {
  const isPaid = status === "PAID";
  const isFailed = status === "FAILED" || status === "EXPIRED" || status === "CANCELLED";
  
  // State to hold the manual reference number inputted by the cashier
  const [manualReference, setManualReference] = useState("");

  // Clear the input when the modal opens/closes
  useEffect(() => {
    if (open) setManualReference("");
  }, [open]);

  const handleFinalize = () => {
    if (isPaid) {
      // Pass the manual reference (or fallback to PayMongo's if left blank)
      onFinalize(manualReference.trim() || initialReference);
    } else {
      onCancel();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md z-50">
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
            {/* ... keeping account name/number display if needed ... */}
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

          {/* QR Code Section */}
          {!isPaid && (
            <div className="p-4 bg-white border-2 border-blue-100 rounded-2xl shadow-md transition-transform hover:scale-105">
              {checkoutUrl?.startsWith('data:image') ? (
                <img 
                  src={checkoutUrl} 
                  alt="Scan to Pay via QR Ph" 
                  className="w-[200px] h-[200px] object-contain" 
                />
              ) : (
                <div className="w-[200px] h-[200px] flex items-center justify-center text-gray-400 text-sm text-center">
                  QR Code Unavailable
                </div>
              )}
            </div>
          )}

          {/* NEW: Manual Reference Input (Only shows when PAID) */}
          {isPaid && (
            <div className="w-full space-y-2 pt-2">
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
                Input the 13-digit number from the customer's successful payment screen to print on the receipt.
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0 mt-4 border-t pt-4">
          {!isPaid && (
            <Button type="button" variant="outline" onClick={onRefresh} className="w-full sm:w-auto">
              Refresh Status
            </Button>
          )}
          <Button 
            type="button" 
            variant={isPaid ? "default" : "destructive"} 
            onClick={handleFinalize} 
            className={`w-full sm:w-auto ${isPaid ? "bg-green-600 hover:bg-green-700 text-white font-bold" : ""}`}
            disabled={isPaid && manualReference.trim().length < 5} // Force them to enter at least something if paid
          >
            {isPaid ? "Finalize & Print Receipt" : "Cancel Payment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}