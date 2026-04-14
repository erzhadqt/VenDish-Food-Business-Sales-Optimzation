import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "./ui/dialog";
import { Button } from "./ui/button";

const formatDateTime = (dateString) => {
  if (!dateString) return "No Expiration";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "Invalid Date";

  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getEffectiveStatus = (status, limit, used) => {
  const isSoldOut = limit !== null && used >= limit;
  if (isSoldOut && status === "Active") return "Redeemed";
  return status;
};

const getStatusBadge = (status) => {
  switch (status) {
    case "Active":
      return "bg-green-100 text-green-700 border-green-200";
    case "Redeemed":
      return "bg-gray-200 text-gray-700 border-gray-300";
    case "Expired":
      return "bg-red-100 text-red-700 border-red-200";
    default:
      return "bg-gray-100 text-gray-600 border-gray-200";
  }
};

const getDiscountDetails = (criteria) => {
  if (!criteria) return "No discount rule attached";

  if (criteria.discount_type === "percentage") {
    const parsedCap = parseFloat(criteria.max_discount_amount);
    if (Number.isFinite(parsedCap) && parsedCap > 0) {
      return `${criteria.discount_value}% OFF (capped at PHP ${parsedCap.toFixed(2)})`;
    }
    return `${criteria.discount_value}% OFF`;
  }

  if (criteria.discount_type === "fixed") {
    return `PHP ${criteria.discount_value} OFF`;
  }

  if (criteria.discount_type === "free_item") {
    return criteria.free_product_name ? `FREE ${criteria.free_product_name}` : "FREE ITEM";
  }

  return "Unknown discount";
};

const getTargetProductName = (criteria, products) => {
  if (!criteria?.target_product) return "Entire Order";

  const matchedProduct = products.find((product) => String(product.id) === String(criteria.target_product));
  return matchedProduct?.product_name || criteria.target_product_name || "Unknown Product";
};

export default function PromoDetailsModal({ open, onOpenChange, coupon, products = [] }) {
  if (!coupon) return null;

  const criteria = coupon.criteria_details;
  const effectiveStatus = getEffectiveStatus(coupon.status, coupon.usage_limit, coupon.times_used);
  const targetProductName = getTargetProductName(criteria, products);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl z-50">
        <DialogHeader>
          <DialogTitle className="text-xl">Promo Details</DialogTitle>
          <DialogDescription className="text-base">
            Full details for promo code {coupon.code}.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-base">
          <div className="rounded-md border border-gray-200 bg-gray-50 p-4">
            <p className="text-sm uppercase tracking-wide text-gray-500">Promo Name</p>
            <p className="text-lg font-semibold text-gray-900 mt-1">{criteria?.name || "No Rule Attached"}</p>
          </div>

          <div className="rounded-md border border-gray-200 bg-gray-50 p-4">
            <p className="text-sm uppercase tracking-wide text-gray-500">Promo Code</p>
            <p className="text-xl font-mono font-bold text-blue-700 mt-1 tracking-wider">{coupon.code}</p>
          </div>

          <div className="rounded-md border border-gray-200 bg-gray-50 p-4 sm:col-span-2">
            <p className="text-sm uppercase tracking-wide text-gray-500">Discount Details</p>
            <p className="text-lg font-semibold text-gray-900 mt-1">{getDiscountDetails(criteria)}</p>
            {criteria?.min_spend > 0 && (
              <p className="text-sm text-gray-500 mt-1">Minimum Spend: PHP {criteria.min_spend}</p>
            )}
          </div>

          <div className="rounded-md border border-gray-200 bg-gray-50 p-4">
            <p className="text-sm uppercase tracking-wide text-gray-500">Applicable Product</p>
            <p className="text-lg font-medium text-gray-800 mt-1">{targetProductName}</p>
          </div>

          <div className="rounded-md border border-gray-200 bg-gray-50 p-4">
            <p className="text-sm uppercase tracking-wide text-gray-500">Expiration</p>
            <p className="text-lg font-medium text-gray-800 mt-1">{formatDateTime(criteria?.valid_to)}</p>
          </div>

          <div className="rounded-md border border-gray-200 bg-gray-50 p-4">
            <p className="text-sm uppercase tracking-wide text-gray-500">Status</p>
            <div className="mt-1">
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getStatusBadge(effectiveStatus)}`}>
                {effectiveStatus}
              </span>
            </div>
          </div>

          <div className="rounded-md border border-gray-200 bg-gray-50 p-4">
            <p className="text-sm uppercase tracking-wide text-gray-500">Claims / Uses</p>
            <p className="text-gray-800 mt-1 text-base">
              Claims: <span className="font-semibold text-lg">{coupon.times_claimed || 0}</span> / {coupon.claim_limit !== null ? coupon.claim_limit : "∞"}
            </p>
            <p className="text-gray-800 mt-1 text-base">
              POS Uses: <span className="font-semibold text-lg">{coupon.times_used || 0}</span> / {coupon.usage_limit !== null ? coupon.usage_limit : "∞"}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}