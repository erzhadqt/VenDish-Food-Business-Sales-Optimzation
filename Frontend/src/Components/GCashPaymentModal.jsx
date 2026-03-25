import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "../Components/ui/dialog";
import { Button } from "../Components/ui/button";
import { QRCodeSVG } from "qrcode.react";

export default function GCashPaymentModal({
  open,
  onOpenChange,
  checkoutUrl,
  status,
  reference,
  amount,          // NEW: Total amount to pay
  accountName,     // NEW: Store GCash Account Name
  accountNumber,   // NEW: Store GCash Account Number
  onRefresh,
  onCancel,
  onDevOverride,
}) {
  const isPaid = status === "PAID";
  const isFailed = status === "FAILED" || status === "EXPIRED" || status === "CANCELLED";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md z-50">
        <DialogHeader>
          <DialogTitle>GCash Payment</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 text-sm">
          
          {/* NEW: Payment Summary Section */}
          <div className="rounded-xl border bg-slate-50 p-4 shadow-sm">
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

          {/* Reference & Status */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border p-3 flex flex-col justify-center">
              <span className="text-xs text-gray-500 uppercase tracking-wider mb-1">Status</span>
              <span className={`font-bold ${
                isPaid ? "text-green-600" : isFailed ? "text-red-600" : "text-orange-500"
              }`}>
                {status || "PENDING"}
              </span>
            </div>
            
            {reference && (
              <div className="rounded-lg border p-3 flex flex-col justify-center overflow-hidden">
                <span className="text-xs text-gray-500 uppercase tracking-wider mb-1">Reference</span>
                <span className="font-mono font-medium truncate" title={reference}>
                  {reference}
                </span>
              </div>
            )}
          </div>

          {/* QR Code Section */}
          {checkoutUrl && !isPaid && (
            <div className="flex flex-col items-center justify-center p-5 border rounded-xl bg-white relative shadow-inner">
              <span className="text-sm font-bold mb-4 text-gray-700 uppercase tracking-wide">Scan to Pay via GCash</span>

              {/* DEV OVERRIDE BUTTON - FOR TESTING ONLY */}
              {onDevOverride && (
                <button 
                  onClick={onDevOverride}
                  className="absolute top-3 right-3 text-[10px] bg-red-100 text-red-700 px-2 py-1 rounded border border-red-200 hover:bg-red-200 transition-colors font-bold"
                  title="Force successful payment (Dev Only)"
                >
                  Mock Pay
                </button>
              )}

              <div className="p-4 bg-white border-2 border-blue-100 rounded-2xl shadow-md transition-transform hover:scale-105">
                <QRCodeSVG 
                  value={checkoutUrl}
                  size={200}
                  imageSettings={{
                    src: "../../public/icon.jpeg",
                    x: undefined, y: undefined, height: 35, width: 35, excavate: true
                  }}
                  bgColor={"#ffffff"}
                  fgColor={"#000000"}
                  level={"Q"}
                  includeMargin={false}
                />
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0 mt-2">
          <Button type="button" variant="outline" onClick={onRefresh} className="w-full sm:w-auto">
            Refresh Status
          </Button>
          <Button type="button" variant={isPaid ? "default" : "destructive"} onClick={onCancel} className="w-full sm:w-auto">
            {isPaid ? "Close" : "Cancel Payment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}