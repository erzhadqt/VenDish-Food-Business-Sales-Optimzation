import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "../Components/ui/dialog";
import { Button } from "../Components/ui/button";

export default function GCashPaymentModal({
  open,
  onOpenChange,
  checkoutUrl,
  status,
  reference,
  onRefresh,
  onCancel,
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

          {checkoutUrl && (
            <Button
              type="button"
              className="w-full bg-blue-600 hover:bg-blue-700"
              onClick={() => window.open(checkoutUrl, "_blank", "noopener,noreferrer")}
            >
              Open GCash Checkout
            </Button>
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
