import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { AlertCircle } from "lucide-react";

const CONFIRMATION_KEY = "kuyavincekarinderya";

export default function StoreToggleDialog({
  open,
  onOpenChange,
  isStoreOpen,
  isSubmitting,
  onConfirm,
}) {
  const [confirmationInput, setConfirmationInput] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const actionLabel = isStoreOpen ? "Close Store" : "Open Store";

  useEffect(() => {
    if (!open) {
      setConfirmationInput("");
      setErrorMessage("");
    }
  }, [open, isStoreOpen]);

  const handleConfirm = async () => {
    setErrorMessage("");

    if (confirmationInput.trim().toLowerCase() !== CONFIRMATION_KEY) {
      setErrorMessage("Type kuyavincekarinderya exactly to confirm this action.");
      return;
    }

    const result = await onConfirm?.();
    if (result?.success) {
      onOpenChange(false);
      return;
    }

    if (result?.message) {
      setErrorMessage(result.message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md z-50">
        <DialogHeader>
          <DialogTitle>{actionLabel}</DialogTitle>
          <DialogDescription>
            This will {isStoreOpen ? "prevent" : "allow"} staff users from logging in on the web login page.
            Type <span className="font-semibold text-gray-900">kuyavincekarinderya</span> to confirm.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-2">
          <Label htmlFor="store-toggle-confirmation">Confirmation Input</Label>
          <Input
            id="store-toggle-confirmation"
            type="text"
            value={confirmationInput}
            onChange={(e) => setConfirmationInput(e.target.value)}
            placeholder="kuyavincekarinderya"
            autoFocus
          />
        </div>

        {errorMessage && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-md p-3 flex items-center gap-2 text-sm">
            <AlertCircle size={16} className="shrink-0" />
            <p>{errorMessage}</p>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={isSubmitting}
            className={isStoreOpen ? "bg-red-600 hover:bg-red-700" : "bg-green-600 hover:bg-green-700"}
          >
            {isSubmitting ? "Processing..." : actionLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
