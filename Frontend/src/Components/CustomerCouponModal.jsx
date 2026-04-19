import React, { useMemo, useState, useEffect } from "react";
import { Search, User, Tag, X, ChevronDown, ChevronUp } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";

const CustomerCouponModal = ({
  open,
  onOpenChange,
  promoQuery,
  matchedCoupons,
  searchLoading,
  selectedCustomerId,
  onClearCustomer,
  appliedCoupons,
  onApplyCoupon,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedIds, setExpandedIds] = useState(new Set());

  const safeCoupons = useMemo(
    () => (Array.isArray(matchedCoupons) ? matchedCoupons : []),
    [matchedCoupons]
  );

  const filteredCoupons = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const pQuery = (promoQuery || "").trim().toLowerCase();

    let processed = safeCoupons
      .map((coupon) => {
        const claimants = Array.isArray(coupon?.claimants) ? coupon.claimants : [];
        
        // Filter claimants by search query
        const filteredClaimants = query
          ? claimants.filter((claimant) => {
              const fullName = `${claimant.first_name || ""} ${claimant.last_name || ""}`.trim().toLowerCase();
              const username = String(claimant.username || "").toLowerCase();
              const code = String(claimant.code || "").toLowerCase();
              return fullName.includes(query) || username.includes(query) || code.includes(query);
            })
          : claimants;

        // Sort claimants by exact relevance
        const activeSearch = query || pQuery;
        const sortedClaimants = [...filteredClaimants].sort((a, b) => {
          if (!activeSearch) return 0;
          
          const getMatchScore = (c) => {
            const fullName = `${c.first_name || ""} ${c.last_name || ""}`.trim().toLowerCase();
            const username = String(c.username || "").toLowerCase();
            const code = String(c.code || "").toLowerCase();

            if (code === activeSearch || fullName === activeSearch || username === activeSearch) return 3;
            if (code.includes(activeSearch)) return 2;
            if (fullName.includes(activeSearch) || username.includes(activeSearch)) return 1;
            return 0;
          };

          return getMatchScore(b) - getMatchScore(a);
        });

        return {
          ...coupon,
          claimants: sortedClaimants,
        };
      })
      .filter((coupon) => (coupon.claimants || []).length > 0);

    // Sort coupons by relevance to promoQuery
    if (pQuery) {
      processed.sort((a, b) => {
        const getCouponScore = (c) => {
          const name = String(c?.criteria_details?.name || c?.name || "").toLowerCase();
          const code = String(c?.code || "").toLowerCase();
          
          if (code === pQuery || name === pQuery) return 3;
          if (code.includes(pQuery) || name.includes(pQuery)) return 2;
          return 0;
        };
        return getCouponScore(b) - getCouponScore(a);
      });
    }

    return processed;
  }, [safeCoupons, searchQuery, promoQuery]);

  // Auto-expand the most relevant coupon when results load
  useEffect(() => {
    if (filteredCoupons.length > 0) {
      setExpandedIds(new Set([filteredCoupons[0].id]));
    } else {
      setExpandedIds(new Set());
    }
    // We bind to matchedCoupons so it correctly resets on a fresh query trigger
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchedCoupons]);

  const selectedCustomer = useMemo(() => {
    for (const coupon of safeCoupons) {
      const claimants = Array.isArray(coupon?.claimants) ? coupon.claimants : [];
      const selected = claimants.find((claimant) => claimant.id === selectedCustomerId);
      if (selected) return selected;
    }
    return null;
  }, [safeCoupons, selectedCustomerId]);

  const toggleExpand = (id) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl bg-white p-0 overflow-hidden" showCloseButton>
        <DialogHeader className="px-5 py-4 border-b bg-gray-50">
          <DialogTitle className="text-lg text-gray-800">Select Claimant User</DialogTitle>
        </DialogHeader>

        <div className="px-5 py-4 border-b border-gray-100 bg-white">
          <div className="text-sm text-gray-700 mb-3">
            Promo search: <span className="font-semibold">{promoQuery || "N/A"}</span>
          </div>

          <div className="relative">
            <Search size={18} className="absolute left-3 top-2.5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Filter claimants by name, username, or code..."
              className="w-full pl-10 pr-3 py-2 border rounded-md text-base outline-none focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div className="mt-3 flex items-center justify-between">
            <div className="text-sm text-gray-700 flex items-center gap-2">
              <User size={16} className={selectedCustomer ? "text-green-600" : "text-gray-400"} />
              {selectedCustomer ? (
                <span className="font-medium">
                  {(selectedCustomer.first_name || selectedCustomer.username) + (selectedCustomer.last_name ? ` ${selectedCustomer.last_name}` : "")}
                </span>
              ) : (
                <span className="text-gray-400">No customer selected</span>
              )}
            </div>

            {selectedCustomer && (
              <button
                type="button"
                onClick={onClearCustomer}
                className="text-sm px-3 py-1.5 rounded border text-gray-600 hover:bg-gray-50"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        <div className="max-h-96 overflow-y-auto p-4 space-y-3">
          {searchLoading && (
            <div className="text-sm text-gray-400 p-2">Searching promo claimants...</div>
          )}

          {!searchLoading && filteredCoupons.length === 0 && (
            <div className="text-sm text-gray-400 p-2">No claimant users found for this promo search.</div>
          )}

          {!searchLoading && filteredCoupons.map((coupon) => {
            const couponTitle = coupon?.criteria_details?.name || coupon?.name || `Coupon #${coupon.id}`;
            const claimants = coupon.claimants || [];
            const isExpanded = expandedIds.has(coupon.id);

            return (
              <div key={coupon.id} className="border rounded-lg overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggleExpand(coupon.id)}
                  className="w-full px-3 py-2 bg-gray-50 border-b flex items-center justify-between hover:bg-gray-100 transition-colors text-left"
                >
                  <div>
                    <div className="text-sm font-semibold text-gray-800">{couponTitle}</div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      Status: {coupon?.status || "Unknown"} • Claimants: {claimants.length}
                    </div>
                  </div>
                  <div className="text-gray-400 mr-1">
                    {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                  </div>
                </button>

                {isExpanded && (
                  <div className="p-2 space-y-2">
                    {claimants.map((claimant) => {
                      const alreadyApplied = appliedCoupons.some((applied) => applied.id === coupon.id);
                      const isExpired = String(coupon.status || "").toLowerCase() === "expired";
                      const disabled = alreadyApplied || claimant.is_used || isExpired;
                      const claimantName = (claimant.first_name || claimant.username) + (claimant.last_name ? ` ${claimant.last_name}` : "");

                      return (
                        <div key={`${coupon.id}-${claimant.id}`} className="flex items-center justify-between border rounded px-3 py-2.5">
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-gray-800 truncate">{claimantName}</div>
                            <div className="text-xs text-gray-500 truncate">@{claimant.username}</div>
                            <div className="text-xs font-semibold text-blue-600 mt-1 flex items-center gap-1">
                              <Tag size={12} /> {claimant.code || coupon.code || "No code"}
                            </div>
                          </div>

                          <button
                            type="button"
                            disabled={disabled}
                            onClick={() => onApplyCoupon(coupon, claimant)}
                            className={`text-xs font-bold px-3 py-1.5 rounded ${disabled ? "bg-gray-200 text-gray-500 cursor-not-allowed" : "bg-blue-600 text-white hover:bg-blue-700"}`}
                          >
                            {claimant.is_used ? "Used" : isExpired ? "Expired" : alreadyApplied ? "Applied" : "Use"}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="p-3 border-t bg-gray-50 text-xs text-gray-500 flex items-center gap-1.5">
          <X size={14} />
          Select a claimant user to apply the searched promo to this POS order.
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CustomerCouponModal;