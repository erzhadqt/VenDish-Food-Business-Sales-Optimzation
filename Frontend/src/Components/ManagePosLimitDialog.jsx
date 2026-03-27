import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Button } from "./ui/button";
import api from "../api";

// Import your SuccessAlert component
import SuccessAlert from "./SuccessAlert"; 

const ManagePosLimitDialog = ({ open, onOpenChange, currentLimit, onSaved }) => {
  const [limitValue, setLimitValue] = useState(2);
  const [isSaving, setIsSaving] = useState(false);
  
  // New state to control your custom success alert
  const [showSuccessAlert, setShowSuccessAlert] = useState(false);

  // Sync the local input state with the current global limit when the modal opens
  useEffect(() => {
    if (open) {
      setLimitValue(currentLimit || 2);
      setShowSuccessAlert(false); // Reset the alert state every time it opens
    }
  }, [open, currentLimit]);

  // 🔴 Strict sanitization for POS Limit (Whole numbers only)
  const handleLimitChange = (e) => {
    let val = e.target.value.replace(/[^0-9]/g, '');
    setLimitValue(val);
  };

  const handleSave = async () => {
    if (!limitValue || parseInt(limitValue, 10) < 1) {
      alert("Please enter a valid number (minimum 1).");
      return;
    }

    setIsSaving(true);
    try {
      await api.post("/settings/", {
        max_coupons_per_order: parseInt(limitValue, 10),
      });
      
      // Trigger the custom Success Alert instead of native alert()
      setShowSuccessAlert(true);
      
      if (onSaved) onSaved(); // Trigger a refetch on the parent page
      
      // Delay closing the modal by 2 seconds so the user can actually see the success message
      setTimeout(() => {
         onOpenChange(false);
      }, 2000); 

    } catch (error) {
      console.error("Failed to update limit:", error);
      alert("Failed to update POS limit.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Manage POS Coupon Limit</DialogTitle>
        </DialogHeader>

        {/* --- CUSTOM SUCCESS ALERT INJECTED HERE --- */}
        {showSuccessAlert && (
            <div className="mb-2">
              <SuccessAlert message="POS Coupon limit updated successfully!" />
            </div>
        )}

        <div className="py-2 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="coupon-limit">Maximum Coupons Allowed Per Order</Label>
            {/* 🔴 Updated POS Limit Input */}
            <Input
              id="coupon-limit"
              type="text"
              inputMode="numeric"
              value={limitValue}
              onChange={handleLimitChange}
              placeholder="e.g. 2"
              maxLength={3} // Limit input to 3 digits (up to 999)
            />
            <p className="text-xs text-gray-500">
              Set the strict maximum number of promo codes a cashier can apply to a single transaction during checkout.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving || showSuccessAlert}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {isSaving ? "Saving..." : showSuccessAlert ? "Saved!" : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ManagePosLimitDialog;