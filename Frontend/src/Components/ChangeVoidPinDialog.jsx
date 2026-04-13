import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/Components/ui/dialog";
import { Button } from "../Components/ui/button";
import { Input } from "../Components/ui/input";
import { Label } from "../Components/ui/label";
import { AlertCircle, CheckCircle2 } from "lucide-react"; 
import api from "../api"; 

export default function ChangeVoidPinDialog({ open, onOpenChange }) {
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  const resetForm = () => {
    setNewPin("");
    setConfirmPin("");
    setError("");
    setSuccess("");
    setFieldErrors({});
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  // 🔴 Strict sanitization for New PIN (Numbers only)
  const handleNewPinChange = (e) => {
    let val = e.target.value.replace(/[^0-9]/g, '');
    setNewPin(val);
    setFieldErrors((prev) => {
      if (!prev.newPin) return prev;
      const next = { ...prev };
      delete next.newPin;
      return next;
    });
  };

  // 🔴 Strict sanitization for Confirm PIN (Numbers only)
  const handleConfirmPinChange = (e) => {
    let val = e.target.value.replace(/[^0-9]/g, '');
    setConfirmPin(val);
    setFieldErrors((prev) => {
      if (!prev.confirmPin) return prev;
      const next = { ...prev };
      delete next.confirmPin;
      return next;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    const nextFieldErrors = {};

    if (!newPin) {
      nextFieldErrors.newPin = "New PIN must not be blank.";
    }

    if (!confirmPin) {
      nextFieldErrors.confirmPin = "Confirm PIN must not be blank.";
    }

    if (Object.keys(nextFieldErrors).length > 0) {
      setFieldErrors(nextFieldErrors);
      setError(`Please review the highlighted fields. ${Object.keys(nextFieldErrors).length} validation issue${Object.keys(nextFieldErrors).length > 1 ? "s" : ""} found.`);
      return;
    }

    setFieldErrors({});

    if (newPin !== confirmPin) {
      setFieldErrors({
        newPin: "New PIN and Confirm PIN must match.",
        confirmPin: "New PIN and Confirm PIN must match.",
      });
      setError("New PIN and Confirm PIN do not match.");
      return;
    }

    if (newPin.length < 4) {
      setFieldErrors({ newPin: "New PIN must be at least 4 digits long." });
      setError("New PIN must be at least 4 digits long.");
      return;
    }

    setLoading(true);
    try {
      await api.post("/update-void-pin/", {
        new_pin: newPin
      });

      setSuccess("Void PIN successfully updated!");
      
      setTimeout(() => {
        handleClose();
      }, 2000);

    } catch (error) {
      console.error("Error updating pin:", error);
      setError(error.response?.data?.error || "Failed to update PIN.");
    } finally {
      setLoading(false);
    }
  };

  const topErrorItems = Object.values(fieldErrors);

  return (
    <Dialog open={open} onOpenChange={(val) => { if (!val) handleClose(); }}>
      <DialogContent className="sm:max-w-md z-50">
        <DialogHeader>
          <DialogTitle>Change Void PIN</DialogTitle>
          <DialogDescription>
            Directly update the PIN required to authorize voided transactions.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-md flex items-center gap-2 border border-red-200 text-sm mt-2">
            <AlertCircle size={16} className="shrink-0" />
            <div className="space-y-1">
              <p>{error}</p>
              {topErrorItems.length > 0 && (
                <ul className="list-disc pl-4">
                  {topErrorItems.slice(0, 3).map((item, index) => (
                    <li key={`${item}-${index}`}>{item}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
        {success && (
          <div className="bg-green-50 text-green-700 p-3 rounded-md flex items-center gap-2 border border-green-200 text-sm mt-2">
            <CheckCircle2 size={16} className="shrink-0" />
            <p>{success}</p>
          </div>
        )}

        <form noValidate onSubmit={handleSubmit} className="grid gap-4 py-2">
          
          <div className="space-y-2">
            <Label htmlFor="newPin">New PIN</Label>
            {/* 🔴 Updated New PIN Input */}
            <Input 
              id="newPin"
              type="password"
              inputMode="numeric"
              placeholder="Enter new 4-6 digit PIN" 
              value={newPin} 
              onChange={handleNewPinChange} 
              required
              maxLength={6}
              autoFocus
              className={fieldErrors.newPin ? "border-red-500 focus-visible:ring-red-500" : ""}
              aria-invalid={!!fieldErrors.newPin}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPin">Confirm New PIN</Label>
            {/* 🔴 Updated Confirm PIN Input */}
            <Input 
              id="confirmPin"
              type="password"
              inputMode="numeric"
              placeholder="Re-enter new PIN" 
              value={confirmPin} 
              onChange={handleConfirmPinChange} 
              required
              maxLength={6}
              className={fieldErrors.confirmPin ? "border-red-500 focus-visible:ring-red-500" : ""}
              aria-invalid={!!fieldErrors.confirmPin}
            />
          </div>

          <DialogFooter className="mt-4">
            <Button type="button" variant="outline" onClick={handleClose}>Cancel</Button>
            <Button type="submit" disabled={loading || !newPin || !confirmPin}>
              {loading ? "Updating..." : "Update PIN"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}