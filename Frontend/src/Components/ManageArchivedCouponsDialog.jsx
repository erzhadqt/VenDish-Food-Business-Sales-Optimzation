import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Skeleton } from "./ui/skeleton";
import { AlertCircle, Archive, Search } from "lucide-react";
import api from "../api";
import { requestWithMethodFallback } from "../utils/requestWithMethodFallback";

export default function ManageArchivedCouponsDialog({ open, onOpenChange, onSaved }) {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [unarchiving, setUnarchiving] = useState(false);
  const [search, setSearch] = useState("");
  const [showActiveOnly, setShowActiveOnly] = useState(true);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [selectedArchivedIds, setSelectedArchivedIds] = useState(new Set());
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const isProcessing = archiving || unarchiving;

  const resetState = () => {
    setSearch("");
    setShowActiveOnly(true);
    setSelectedIds(new Set());
    setSelectedArchivedIds(new Set());
    setError("");
    setSuccess("");
  };

  const handleClose = () => {
    if (isProcessing) return;
    resetState();
    onOpenChange(false);
  };

  useEffect(() => {
    let timeoutId;
    if (error || success) {
      timeoutId = setTimeout(() => {
        setError("");
        setSuccess("");
      }, 2000);
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [error, success]);

  useEffect(() => {
    const fetchCoupons = async () => {
      if (!open) return;

      setLoading(true);
      setError("");
      setSuccess("");

      try {
        const response = await api.get(`/firstapp/coupons/?include_archived=true&t=${new Date().getTime()}`);
        const payload = Array.isArray(response.data) ? response.data : [];

        const sortedCoupons = [...payload].sort((a, b) => {
          const leftName = a.criteria_details?.name || "";
          const rightName = b.criteria_details?.name || "";
          const byName = leftName.localeCompare(rightName, undefined, { sensitivity: "base" });
          if (byName !== 0) return byName;
          return (a.code || "").localeCompare((b.code || ""), undefined, { sensitivity: "base" });
        });

        setCoupons(sortedCoupons);
      } catch (fetchError) {
        console.error("Failed to load coupons for archive management:", fetchError);
        setError("Failed to load coupons. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchCoupons();
  }, [open]);

  const matchesSearch = useCallback((coupon) => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return true;

    const code = (coupon.code || "").toLowerCase();
    const promoName = (coupon.criteria_details?.name || "").toLowerCase();
    const status = (coupon.status || "").toLowerCase();

    return code.includes(keyword) || promoName.includes(keyword) || status.includes(keyword);
  }, [search]);

  const activeCoupons = useMemo(
    () =>
      coupons.filter((coupon) => {
        if (coupon.is_archived) return false;
        if (!matchesSearch(coupon)) return false;
        if (!showActiveOnly) return true;
        return (coupon.status || "").toLowerCase() === "active";
      }),
    [coupons, matchesSearch, showActiveOnly]
  );

  const archivedCoupons = useMemo(
    () => coupons.filter((coupon) => coupon.is_archived && matchesSearch(coupon)),
    [coupons, matchesSearch]
  );

  const allVisibleSelected =
    activeCoupons.length > 0 && activeCoupons.every((coupon) => selectedIds.has(coupon.id));

  const allArchivedVisibleSelected =
    archivedCoupons.length > 0 && archivedCoupons.every((coupon) => selectedArchivedIds.has(coupon.id));

  const selectedArchiveCount = selectedIds.size;
  const selectedRestoreCount = selectedArchivedIds.size;
  const hasArchiveSelection = selectedArchiveCount > 0;
  const hasRestoreSelection = selectedRestoreCount > 0;
  const hasAnySelection = hasArchiveSelection || hasRestoreSelection;

  const toggleSelectCoupon = (couponId) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(couponId)) next.delete(couponId);
      else next.add(couponId);
      return next;
    });
  };

  const toggleSelectAllVisible = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);

      if (allVisibleSelected) {
        activeCoupons.forEach((coupon) => next.delete(coupon.id));
      } else {
        activeCoupons.forEach((coupon) => next.add(coupon.id));
      }

      return next;
    });
  };

  const toggleSelectArchivedCoupon = (couponId) => {
    setSelectedArchivedIds((prev) => {
      const next = new Set(prev);
      if (next.has(couponId)) next.delete(couponId);
      else next.add(couponId);
      return next;
    });
  };

  const toggleSelectAllArchivedVisible = () => {
    setSelectedArchivedIds((prev) => {
      const next = new Set(prev);

      if (allArchivedVisibleSelected) {
        archivedCoupons.forEach((coupon) => next.delete(coupon.id));
      } else {
        archivedCoupons.forEach((coupon) => next.add(coupon.id));
      }

      return next;
    });
  };

  const handleArchiveSelected = async ({ silent = false, notifyParent = true } = {}) => {
    if (selectedIds.size === 0) {
      if (!silent) setError("Select at least one coupon to archive.");
      return { success: false, count: 0 };
    }

    setArchiving(true);
    setError("");
    setSuccess("");

    const idsToArchive = Array.from(selectedIds);

    try {
      const response = await requestWithMethodFallback({
        url: "/firstapp/coupons/archive/",
        data: {
          coupon_ids: idsToArchive,
        },
      });

      const archivedCount = response?.data?.archived_count ?? idsToArchive.length;
      const archivedAt = new Date().toISOString();

      setCoupons((prev) =>
        prev.map((coupon) =>
          idsToArchive.includes(coupon.id)
            ? {
                ...coupon,
                is_archived: true,
                archived_at: coupon.archived_at || archivedAt,
              }
            : coupon
        )
      );

      setSelectedIds((prev) => {
        const next = new Set(prev);
        idsToArchive.forEach((id) => next.delete(id));
        return next;
      });

      if (!silent) setSuccess(`Archived ${archivedCount} coupon(s).`);
      if (notifyParent && onSaved) onSaved();
      return { success: true, count: archivedCount };
    } catch (archiveError) {
      console.error("Failed to archive coupons:", archiveError);
      if (!silent) setError("Failed to archive selected coupons. Please try again.");
      return { success: false, count: 0 };
    } finally {
      setArchiving(false);
    }
  };

  const handleUnarchiveSelected = async ({ silent = false, notifyParent = true } = {}) => {
    if (selectedArchivedIds.size === 0) {
      if (!silent) setError("Select at least one archived coupon to restore.");
      return { success: false, count: 0 };
    }

    setUnarchiving(true);
    setError("");
    setSuccess("");

    const idsToUnarchive = Array.from(selectedArchivedIds);

    try {
      const response = await requestWithMethodFallback({
        url: "/firstapp/coupons/unarchive/",
        data: {
          coupon_ids: idsToUnarchive,
        },
      });

      const unarchivedCount = response?.data?.unarchived_count ?? idsToUnarchive.length;

      setCoupons((prev) =>
        prev.map((coupon) =>
          idsToUnarchive.includes(coupon.id)
            ? {
                ...coupon,
                is_archived: false,
                archived_at: null,
              }
            : coupon
        )
      );

      setSelectedArchivedIds((prev) => {
        const next = new Set(prev);
        idsToUnarchive.forEach((id) => next.delete(id));
        return next;
      });

      if (!silent) setSuccess(`Restored ${unarchivedCount} coupon(s) from archive.`);
      if (notifyParent && onSaved) onSaved();
      return { success: true, count: unarchivedCount };
    } catch (unarchiveError) {
      console.error("Failed to unarchive coupons:", unarchiveError);
      if (!silent) setError("Failed to restore selected coupons. Please try again.");
      return { success: false, count: 0 };
    } finally {
      setUnarchiving(false);
    }
  };

  const handleApplyArchiveAction = async () => {
    if (!hasAnySelection) {
      setError("Select at least one coupon to archive or restore.");
      return;
    }

    if (hasArchiveSelection && hasRestoreSelection) {
      setError("");
      setSuccess("");

      const archiveResult = await handleArchiveSelected({ silent: true, notifyParent: false });
      const restoreResult = await handleUnarchiveSelected({ silent: true, notifyParent: false });

      if (archiveResult.success || restoreResult.success) {
        const fragments = [];
        if (archiveResult.count > 0) fragments.push(`archived ${archiveResult.count}`);
        if (restoreResult.count > 0) fragments.push(`restored ${restoreResult.count}`);
        setSuccess(`Successfully ${fragments.join(" and ")} coupon(s).`);
        if (onSaved) onSaved();
      } else {
        setError("Failed to apply archive changes. Please try again.");
      }
      return;
    }

    if (hasArchiveSelection) {
      await handleArchiveSelected();
      return;
    }

    await handleUnarchiveSelected();
  };

  const mergedActionLabel = archiving
    ? "Archiving..."
    : unarchiving
      ? "Restoring..."
      : hasArchiveSelection && hasRestoreSelection
        ? `Apply Changes (${selectedArchiveCount + selectedRestoreCount})`
        : hasArchiveSelection
          ? `Archive Selected (${selectedArchiveCount})`
          : hasRestoreSelection
            ? `Unarchive Selected (${selectedRestoreCount})`
            : "Select Items";

  const mergedActionClassName = hasArchiveSelection && hasRestoreSelection
    ? "bg-blue-600 hover:bg-blue-700"
    : hasArchiveSelection
      ? "bg-amber-600 hover:bg-amber-700"
      : hasRestoreSelection
        ? "bg-emerald-600 hover:bg-emerald-700"
        : "";

  const formatDateTime = (value) => {
    if (!value) return "-";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return "-";
    return parsed.toLocaleString();
  };

  const formatExpiration = (value) => {
    if (!value) return "No Expiration";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return "No Expiration";
    return parsed.toLocaleString();
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { if (!nextOpen) handleClose(); }}>
      <DialogContent className="sm:max-w-5xl z-50">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Archive size={18} /> Archive Coupons
          </DialogTitle>
          <DialogDescription>
            Select coupons to archive or restore. Archived coupons are hidden from standard promo and POS coupon lists.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by promo name, code, or status"
              className="pl-9 w-1/2"
            />
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2 flex items-center gap-2">
              <AlertCircle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-md px-3 py-2">
              {success}
            </div>
          )}

          <section className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <p className="font-semibold text-gray-800">{showActiveOnly ? "Active Coupons" : "Non-Archived Coupons"}</p>
              <div className="flex items-center gap-4 text-gray-600">
                <button
                  type="button"
                  onClick={() => setShowActiveOnly((prev) => !prev)}
                  className={`h-8 rounded-md border px-2.5 text-xs font-medium transition-colors ${
                    showActiveOnly
                      ? "border-blue-200 bg-blue-50 text-blue-700"
                      : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                  }`}
                  disabled={isProcessing}
                >
                  {showActiveOnly ? "Showing Active Only" : "Showing All Non-Archived"}
                </button>
                <span>{selectedIds.size} selected</span>
                <button
                  type="button"
                  onClick={toggleSelectAllVisible}
                  className="text-blue-600 hover:text-blue-700 font-medium"
                  disabled={activeCoupons.length === 0 || isProcessing}
                >
                  {allVisibleSelected ? "Unselect All" : "Select All"}
                </button>
              </div>
            </div>

            <div className="border rounded-lg overflow-hidden">
              <div className="max-h-64 overflow-y-auto">
                {loading ? (
                  <div className="p-4 space-y-3">
                    {Array.from({ length: 6 }).map((_, index) => (
                      <div key={index} className="grid grid-cols-[24px_140px_1fr_120px_200px] gap-3 items-center">
                        <Skeleton className="h-4 w-4" />
                        <Skeleton className="h-5 w-20" />
                        <Skeleton className="h-5 w-3/4" />
                        <Skeleton className="h-5 w-16" />
                        <Skeleton className="h-5 w-32" />
                      </div>
                    ))}
                  </div>
                ) : activeCoupons.length > 0 ? (
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-3 py-2 text-left font-semibold text-gray-700 w-10"></th>
                        <th className="px-3 py-2 text-left font-semibold text-gray-700">Code</th>
                        <th className="px-3 py-2 text-left font-semibold text-gray-700">Promo Name</th>
                        <th className="px-3 py-2 text-left font-semibold text-gray-700">Status</th>
                        <th className="px-3 py-2 text-left font-semibold text-gray-700">Expiration</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeCoupons.map((coupon) => (
                        <tr
                          key={coupon.id}
                          className="border-t cursor-pointer hover:bg-gray-100"
                          onClick={() => toggleSelectCoupon(coupon.id)}
                        >
                          <td className="px-3 py-2">
                            <input
                              type="checkbox"
                              checked={selectedIds.has(coupon.id)}
                              disabled={isProcessing}
                              onClick={(event) => event.stopPropagation()}
                              onChange={() => toggleSelectCoupon(coupon.id)}
                              className="h-4 w-4"
                            />
                          </td>
                          <td className="px-3 py-2 font-mono font-semibold text-blue-700">{coupon.code}</td>
                          <td className="px-3 py-2 font-medium text-gray-800">{coupon.criteria_details?.name || "No Rule Attached"}</td>
                          <td className="px-3 py-2 text-gray-700">{coupon.status || "-"}</td>
                          <td className="px-3 py-2 text-gray-700">{formatExpiration(coupon.criteria_details?.valid_to)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="p-6 text-center text-gray-500">
                    {showActiveOnly ? "No active coupons found." : "No non-archived coupons found."}
                  </div>
                )}
              </div>
            </div>
          </section>

          <section className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <p className="font-semibold text-gray-800">Archived Coupons</p>
              <div className="flex items-center gap-4 text-gray-600">
                <span>{selectedArchivedIds.size} selected</span>
                <button
                  type="button"
                  onClick={toggleSelectAllArchivedVisible}
                  className="text-blue-600 hover:text-blue-700 font-medium"
                  disabled={archivedCoupons.length === 0 || isProcessing}
                >
                  {allArchivedVisibleSelected ? "Unselect All" : "Select All"}
                </button>
              </div>
            </div>

            <div className="border rounded-lg overflow-hidden">
              <div className="max-h-52 overflow-y-auto">
                {loading ? (
                  <div className="p-4 space-y-3">
                    {Array.from({ length: 4 }).map((_, index) => (
                      <div key={index} className="grid grid-cols-[24px_140px_1fr_180px] gap-3 items-center">
                        <Skeleton className="h-4 w-4" />
                        <Skeleton className="h-5 w-20" />
                        <Skeleton className="h-5 w-3/4" />
                        <Skeleton className="h-5 w-32" />
                      </div>
                    ))}
                  </div>
                ) : archivedCoupons.length > 0 ? (
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-3 py-2 text-left font-semibold text-gray-700 w-10"></th>
                        <th className="px-3 py-2 text-left font-semibold text-gray-700">Code</th>
                        <th className="px-3 py-2 text-left font-semibold text-gray-700">Promo Name</th>
                        <th className="px-3 py-2 text-left font-semibold text-gray-700">Archived At</th>
                      </tr>
                    </thead>
                    <tbody>
                      {archivedCoupons.map((coupon) => (
                        <tr
                          key={coupon.id}
                          className="border-t bg-amber-50/30 cursor-pointer hover:bg-amber-100/40"
                          onClick={() => toggleSelectArchivedCoupon(coupon.id)}
                        >
                          <td className="px-3 py-2">
                            <input
                              type="checkbox"
                              checked={selectedArchivedIds.has(coupon.id)}
                              disabled={isProcessing}
                              onClick={(event) => event.stopPropagation()}
                              onChange={() => toggleSelectArchivedCoupon(coupon.id)}
                              className="h-4 w-4"
                            />
                          </td>
                          <td className="px-3 py-2 font-mono font-semibold text-blue-700">{coupon.code}</td>
                          <td className="px-3 py-2 font-medium text-gray-800">{coupon.criteria_details?.name || "No Rule Attached"}</td>
                          <td className="px-3 py-2 text-gray-700">{formatDateTime(coupon.archived_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="p-6 text-center text-gray-500">No archived coupons yet.</div>
                )}
              </div>
            </div>
          </section>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleClose} disabled={isProcessing}>
            Close
          </Button>
          <Button
            type="button"
            onClick={handleApplyArchiveAction}
            disabled={isProcessing || !hasAnySelection}
            className={mergedActionClassName}
          >
            {mergedActionLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
