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
          <DialogDescription>
            Ask the customer to complete payment using GCash.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 text-sm">
          {reference && (
            <div className="rounded-md border p-2 bg-slate-50">
              <span className="font-semibold">Reference:</span> {reference}
            </div>
          )}

          <div className="rounded-md border p-3">
            <div className="font-semibold mb-1">Status</div>
            <div className={`text-sm font-bold ${
              isPaid ? "text-green-600" : isFailed ? "text-red-600" : "text-orange-600"
            }`}>
              {status || "PENDING"}
            </div>
          </div>

          {checkoutUrl && !isPaid && (
            <div className="flex flex-col items-center justify-center p-4 border rounded-md bg-white relative">
              <span className="text-sm font-semibold mb-3 text-gray-700">Scan to Pay via GCash</span>

              {/* DEV OVERRIDE BUTTON - FOR TESTING ONLY */}
              {onDevOverride && (
                <button 
                  onClick={onDevOverride}
                  className="absolute top-2 right-2 text-[10px] bg-red-100 text-red-700 px-2 py-1 rounded border border-red-200 hover:bg-red-200 transition-colors"
                  title="Force successful payment (Dev Only)"
                >
                  Mock Pay
                </button>
              )}

              <div className="p-3 bg-white border-2 border-blue-100 rounded-xl mb-3 shadow-sm">
                <QRCodeSVG 
                  value={checkoutUrl} 
                  size={200}
                  imageSettings={{
                  src: "../../public/icon.jpeg",
                  x: undefined, y: undefined, height: 30, width: 30, excavate: true
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

        <DialogFooter className="gap-2">
          <Button type="button" variant="outline" onClick={onRefresh}>
            Refresh Status
          </Button>
          <Button type="button" variant="outline" onClick={onCancel}>
            {isPaid ? "Close" : "Cancel"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
