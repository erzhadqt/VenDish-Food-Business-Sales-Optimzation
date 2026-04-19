// Components/EditCouponDialog.jsx
import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { AlertCircle } from "lucide-react";
import api from "../api";
import { requestWithMethodFallback } from "../utils/requestWithMethodFallback";

export default function EditCouponDialog({ open, onOpenChange, coupon, onSaved, onArchived }) {
  const [loading, setLoading] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [error, setError] = useState("");
  // Merged claim_limit and usage_limit into a single 'limit' property
  const [formData, setFormData] = useState({
    valid_to: "",
    limit: "",
    target_audience: "all_users",
    min_completed_orders: "",
  });
  const isProcessing = loading || archiving;

  // Helper to get current local time in YYYY-MM-DDThh:mm format
  const getCurrentLocalISOString = () => {
    const dateObj = new Date();
    const tzOffset = dateObj.getTimezoneOffset() * 60000;
    return new Date(dateObj.getTime() - tzOffset).toISOString().slice(0, 16);
  };

  const minDateTime = getCurrentLocalISOString();

  useEffect(() => {
    if (coupon) {
      let formattedDate = "";
      if (coupon.criteria_details?.valid_to) {
        const dateObj = new Date(coupon.criteria_details.valid_to);
        const tzOffset = dateObj.getTimezoneOffset() * 60000;
        formattedDate = new Date(dateObj.getTime() - tzOffset).toISOString().slice(0, 16);
      }

      setFormData({
        valid_to: formattedDate,
        // Fallback to whichever limit is available, since they are now synced
        limit: coupon.usage_limit || coupon.claim_limit || "",
        target_audience: coupon.target_audience || "all_users",
        min_completed_orders: coupon.min_completed_orders ? String(coupon.min_completed_orders) : "",
      });
      setError(""); // Reset error when coupon changes
    }
  }, [coupon, open]);

  const handleOpenChange = (isOpen) => {
    if (!isOpen) {
      setError("");
    }
    onOpenChange(isOpen);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(""); // Clear previous errors

    // 🔴 Strict validation: Ensure the date is not empty
    if (!formData.valid_to) {
      setError("Please specify an Expiration Date. It cannot be left blank.");
      return;
    }

    // 🔴 Strict validation: Ensure the limit is not empty or zero
    if (!formData.limit || parseInt(formData.limit) <= 0) {
      setError("Please specify a valid Claim & Usage Limit. It cannot be left blank or zero.");
      return;
    }

    if (
      formData.target_audience === "frequent_customers"
      && (!formData.min_completed_orders || parseInt(formData.min_completed_orders, 10) <= 0)
    ) {
      setError("Please set a valid minimum completed order count for frequent-customer targeting.");
      return;
    }

    setLoading(true);

    const parsedLimit = parseInt(formData.limit, 10);

    const payload = {
      valid_to: formData.valid_to, // Now strictly required
      // Pass the single limit to both backend fields to keep them in sync
      claim_limit: parsedLimit,
      usage_limit: parsedLimit,
      target_audience: formData.target_audience,
      min_completed_orders: formData.target_audience === "frequent_customers"
        ? parseInt(formData.min_completed_orders, 10)
        : 0,
    };

    try {
      await api.patch(`/firstapp/coupons/${coupon.id}/`, payload);
      onSaved();
      handleOpenChange(false);
    } catch (err) {
      console.error("Failed to update coupon:", err);
      setError(err.response?.data?.error || err.response?.data?.detail || "Failed to update coupon details.");
    } finally {
      setLoading(false);
    }
  };

  const handleArchiveCoupon = async () => {
    if (!coupon) return;

    const isSoldOut = coupon.usage_limit !== null && coupon.times_used >= coupon.usage_limit;
    const canArchive = coupon.status === "Active" && !isSoldOut && !coupon.is_archived;

    if (!canArchive) {
      setError("Only active coupons can be archived from this dialog.");
      return;
    }

    setError("");
    setArchiving(true);

    try {
      await requestWithMethodFallback({
        url: "/firstapp/coupons/archive/",
        data: {
          coupon_ids: [coupon.id],
        },
      });

      if (onArchived) onArchived(coupon.code || coupon.criteria_details?.name || `#${coupon.id}`);
      handleOpenChange(false);
    } catch (err) {
      console.error("Failed to archive coupon:", err);
      setError(err.response?.data?.detail || "Failed to archive coupon. Please try again.");
    } finally {
      setArchiving(false);
    }
  };

  // 🔴 Strict sanitization for the merged Limit (Whole numbers only, no leading zeros)
  const handleLimitChange = (e) => {
    let val = e.target.value.replace(/[^0-9]/g, '');
    val = val.replace(/^0+/, ''); // Remove leading zeros
    setFormData({ ...formData, limit: val });
  };

  const handleMinCompletedOrdersChange = (e) => {
    let val = e.target.value.replace(/[^0-9]/g, '');
    val = val.replace(/^0+/, '');
    setFormData({ ...formData, min_completed_orders: val });
  };

  const isSoldOut = coupon?.usage_limit !== null && coupon?.times_used >= coupon?.usage_limit;
  const canArchive = Boolean(coupon) && coupon.status === "Active" && !isSoldOut && !coupon.is_archived;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg z-50">
        <DialogHeader>
          <DialogTitle className="text-xl">Edit Coupon Limits & Expiration</DialogTitle>
        </DialogHeader>

        {error && (
          <div className="bg-red-50 text-red-600 text-sm p-3 rounded-md flex items-center gap-2 border border-red-200 mt-2">
            <AlertCircle size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form noValidate onSubmit={handleSubmit} className="grid gap-6 py-5">
          <div className="grid gap-3">
            {/* 🔴 Added required indicator to Label */}
            <Label htmlFor="valid_to" className="text-base flex items-center gap-1">
              Expiration Date <span className="text-red-500">*</span>
            </Label>
            <Input 
              id="valid_to" 
              type="datetime-local" 
              value={formData.valid_to}
              min={minDateTime} // Restricts input to current date/time or future
              onChange={(e) => setFormData({...formData, valid_to: e.target.value})}
              className={`text-base h-12 ${error.includes("Expiration") ? "border-red-500 focus-visible:ring-red-500" : ""}`}
            />
          </div>

          {/* Merged Limit Input with required validation indicator */}
          <div className="grid gap-3">
            <Label htmlFor="limit" className="text-base flex items-center gap-1">
              Total Claim & Usage Limit <span className="text-red-500">*</span>
            </Label>
            <Input 
              id="limit" 
              type="text" 
              inputMode="numeric"
              value={formData.limit}
              onChange={handleLimitChange}
              placeholder="e.g. 100"
              maxLength={10}
              className={`text-base h-12 ${error.includes("Limit") ? "border-red-500 focus-visible:ring-red-500" : ""}`}
            />
            <p className="text-sm text-gray-500">Limits how many total users can claim and use this coupon.</p>
          </div>

          <div className="grid gap-3">
            <Label className="text-base flex items-center gap-1">
              Visible To <span className="text-red-500">*</span>
            </Label>
            <Select
              value={formData.target_audience}
              onValueChange={(value) => setFormData((prev) => ({ ...prev, target_audience: value }))}
            >
              <SelectTrigger className="h-12">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all_users">All Users</SelectItem>
                <SelectItem value="frequent_customers">Frequent Customers</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {formData.target_audience === "frequent_customers" && (
            <div className="grid gap-3">
              <Label htmlFor="min_completed_orders" className="text-base flex items-center gap-1">
                Minimum Completed Orders <span className="text-red-500">*</span>
              </Label>
              <Input
                id="min_completed_orders"
                type="text"
                inputMode="numeric"
                value={formData.min_completed_orders}
                onChange={handleMinCompletedOrdersChange}
                placeholder="e.g. 5"
                maxLength={6}
                className="text-base h-12"
              />
            </div>
          )}

          <DialogFooter className="mt-4 gap-3 sm:gap-0">
            <DialogClose asChild>
              <Button variant="outline" type="button" disabled={isProcessing} className="text-base h-11 px-5">
                Cancel
              </Button>
            </DialogClose>
            {canArchive && (
              <Button
                type="button"
                variant="outline"
                disabled={isProcessing}
                onClick={handleArchiveCoupon}
                className="text-base h-11 px-5 mx-2 border-amber-300 text-amber-700 hover:bg-amber-50"
              >
                {archiving ? "Archiving..." : "Archive Coupon"}
              </Button>
            )}
            <Button type="submit" disabled={isProcessing} className="text-base h-11 px-5">
              {loading ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}