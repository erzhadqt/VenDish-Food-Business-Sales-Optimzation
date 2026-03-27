// Components/EditCouponDialog.jsx
import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import api from "../api";

export default function EditCouponDialog({ open, onOpenChange, coupon, onSaved }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ valid_to: "", claim_limit: "", usage_limit: "" });

  useEffect(() => {
    if (coupon) {
      let formattedDate = "";
      if (coupon.criteria_details?.valid_to) {
        const dateObj = new Date(coupon.criteria_details.valid_to);
        const tzOffset = dateObj.getTimezoneOffset() * 60000;
        formattedDate = new Date(dateObj - tzOffset).toISOString().slice(0, 16);
      }

      setFormData({
        valid_to: formattedDate,
        claim_limit: coupon.claim_limit ?? "",
        usage_limit: coupon.usage_limit ?? ""
      });
    }
  }, [coupon]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const payload = {
      valid_to: formData.valid_to || null,
      claim_limit: formData.claim_limit !== "" ? parseInt(formData.claim_limit) : null,
      usage_limit: formData.usage_limit !== "" ? parseInt(formData.usage_limit) : null,
    };

    try {
      await api.patch(`/firstapp/coupons/${coupon.id}/`, payload);
      onSaved();
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to update coupon:", error);
      alert("Failed to update coupon details.");
    } finally {
      setLoading(false);
    }
  };

  // 🔴 Strict sanitization for Claim Limit (Whole numbers only)
  const handleClaimLimitChange = (e) => {
    let val = e.target.value.replace(/[^0-9]/g, '');
    setFormData({ ...formData, claim_limit: val });
  };

  // 🔴 Strict sanitization for Usage Limit (Whole numbers only)
  const handleUsageLimitChange = (e) => {
    let val = e.target.value.replace(/[^0-9]/g, '');
    setFormData({ ...formData, usage_limit: val });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Coupon Limits & Expiration</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="valid_to">Expiration Date (Leave blank for no expiry)</Label>
            <Input 
              id="valid_to" 
              type="datetime-local" 
              value={formData.valid_to}
              onChange={(e) => setFormData({...formData, valid_to: e.target.value})}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="claim_limit">Max App Claims (Leave blank for unlimited)</Label>
            {/* 🔴 Updated Claim Limit Input */}
            <Input 
              id="claim_limit" 
              type="text" 
              inputMode="numeric"
              value={formData.claim_limit}
              onChange={handleClaimLimitChange}
              placeholder="e.g. 100"
              maxLength={10}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="usage_limit">Max POS Uses (Leave blank for unlimited)</Label>
            {/* 🔴 Updated Usage Limit Input */}
            <Input 
              id="usage_limit" 
              type="text" 
              inputMode="numeric"
              value={formData.usage_limit}
              onChange={handleUsageLimitChange}
              placeholder="e.g. 50"
              maxLength={10}
            />
          </div>

          <DialogFooter className="mt-4">
            <DialogClose asChild>
              <Button variant="outline" type="button" disabled={loading}>Cancel</Button>
            </DialogClose>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}