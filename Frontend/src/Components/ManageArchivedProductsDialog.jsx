import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Skeleton } from "./ui/skeleton";
import { AlertCircle, Archive, Search } from "lucide-react";
import api from "../api";
import { requestWithMethodFallback } from "../utils/requestWithMethodFallback";

export default function ManageArchivedProductsDialog({ open, onOpenChange, onSaved }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [unarchiving, setUnarchiving] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [selectedArchivedIds, setSelectedArchivedIds] = useState(new Set());
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const isProcessing = archiving || unarchiving;

  const resetState = () => {
    setSearch("");
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
    const fetchProducts = async () => {
      if (!open) return;

      setLoading(true);
      setError("");
      setSuccess("");

      try {
        const response = await api.get("/firstapp/products/?include_archived=true");
        const sortedProducts = [...(Array.isArray(response.data) ? response.data : [])].sort((a, b) =>
          (a.product_name || "").localeCompare((b.product_name || ""), undefined, { sensitivity: "base" })
        );
        setProducts(sortedProducts);
      } catch (fetchError) {
        console.error("Failed to load products for archive management:", fetchError);
        setError("Failed to load products. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [open]);

  const matchesSearch = useCallback((product) => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return true;

    const productName = (product.product_name || "").toLowerCase();
    const category = (product.category || "").toLowerCase();
    return productName.includes(keyword) || category.includes(keyword);
  }, [search]);

  const activeProducts = useMemo(
    () => products.filter((product) => !product.is_archived && matchesSearch(product)),
    [products, matchesSearch]
  );

  const archivedProducts = useMemo(
    () => products.filter((product) => product.is_archived && matchesSearch(product)),
    [products, matchesSearch]
  );

  const allVisibleSelected =
    activeProducts.length > 0 && activeProducts.every((product) => selectedIds.has(product.id));

  const allArchivedVisibleSelected =
    archivedProducts.length > 0 && archivedProducts.every((product) => selectedArchivedIds.has(product.id));

  const toggleSelectProduct = (productId) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) next.delete(productId);
      else next.add(productId);
      return next;
    });
  };

  const toggleSelectAllVisible = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);

      if (allVisibleSelected) {
        activeProducts.forEach((product) => next.delete(product.id));
      } else {
        activeProducts.forEach((product) => next.add(product.id));
      }

      return next;
    });
  };

  const toggleSelectArchivedProduct = (productId) => {
    setSelectedArchivedIds((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) next.delete(productId);
      else next.add(productId);
      return next;
    });
  };

  const toggleSelectAllArchivedVisible = () => {
    setSelectedArchivedIds((prev) => {
      const next = new Set(prev);

      if (allArchivedVisibleSelected) {
        archivedProducts.forEach((product) => next.delete(product.id));
      } else {
        archivedProducts.forEach((product) => next.add(product.id));
      }

      return next;
    });
  };

  const handleArchiveSelected = async () => {
    if (selectedIds.size === 0) {
      setError("Select at least one product to archive.");
      return;
    }

    setArchiving(true);
    setError("");
    setSuccess("");

    const idsToArchive = Array.from(selectedIds);

    try {
      const response = await requestWithMethodFallback({
        url: "/firstapp/products/archive/",
        data: {
          product_ids: idsToArchive,
        },
      });

      const archivedCount = response?.data?.archived_count ?? idsToArchive.length;
      const archivedAt = new Date().toISOString();

      setProducts((prev) =>
        prev.map((product) =>
          idsToArchive.includes(product.id)
            ? {
                ...product,
                is_archived: true,
                archived_at: product.archived_at || archivedAt,
                stock_quantity: 0,
                is_available: false,
              }
            : product
        )
      );

      setSelectedIds((prev) => {
        const next = new Set(prev);
        idsToArchive.forEach((id) => next.delete(id));
        return next;
      });

      setSuccess(`Archived ${archivedCount} product(s).`);
      if (onSaved) onSaved();
    } catch (archiveError) {
      console.error("Failed to archive products:", archiveError);
      setError("Failed to archive selected products. Please try again.");
    } finally {
      setArchiving(false);
    }
  };

  const handleUnarchiveSelected = async () => {
    if (selectedArchivedIds.size === 0) {
      setError("Select at least one archived product to restore.");
      return;
    }

    setUnarchiving(true);
    setError("");
    setSuccess("");

    const idsToUnarchive = Array.from(selectedArchivedIds);

    try {
      const response = await requestWithMethodFallback({
        url: "/firstapp/products/unarchive/",
        data: {
          product_ids: idsToUnarchive,
        },
      });

      const unarchivedCount = response?.data?.unarchived_count ?? idsToUnarchive.length;

      setProducts((prev) =>
        prev.map((product) =>
          idsToUnarchive.includes(product.id)
            ? {
                ...product,
                is_archived: false,
                archived_at: null,
                stock_quantity: 0,
                is_available: false,
              }
            : product
        )
      );

      setSelectedArchivedIds((prev) => {
        const next = new Set(prev);
        idsToUnarchive.forEach((id) => next.delete(id));
        return next;
      });

      setSuccess(`Restored ${unarchivedCount} product(s) from archive.`);
      if (onSaved) onSaved();
    } catch (unarchiveError) {
      console.error("Failed to unarchive products:", unarchiveError);
      setError("Failed to restore selected products. Please try again.");
    } finally {
      setUnarchiving(false);
    }
  };

  const formatArchivedAt = (value) => {
    if (!value) return "-";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return "-";
    return parsed.toLocaleString();
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { if (!nextOpen) handleClose(); }}>
      <DialogContent className="sm:max-w-5xl z-50">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Archive size={18} /> Archived Products
          </DialogTitle>
          <DialogDescription>
            Select products to archive. Archived products are hidden from the product list and POS views.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by product name or category"
              className="pl-9"
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
              <p className="font-semibold text-gray-800">Active Products</p>
              <div className="flex items-center gap-4 text-gray-600">
                <span>{selectedIds.size} selected</span>
                <button
                  type="button"
                  onClick={toggleSelectAllVisible}
                  className="text-blue-600 hover:text-blue-700 font-medium"
                  disabled={activeProducts.length === 0 || isProcessing}
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
                      <div key={index} className="grid grid-cols-[24px_1fr_160px_100px] gap-3 items-center">
                        <Skeleton className="h-4 w-4" />
                        <Skeleton className="h-5 w-2/3" />
                        <Skeleton className="h-5 w-24" />
                        <Skeleton className="h-5 w-16" />
                      </div>
                    ))}
                  </div>
                ) : activeProducts.length > 0 ? (
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-3 py-2 text-left font-semibold text-gray-700 w-10"></th>
                        <th className="px-3 py-2 text-left font-semibold text-gray-700">Product</th>
                        <th className="px-3 py-2 text-left font-semibold text-gray-700">Category</th>
                        <th className="px-3 py-2 text-left font-semibold text-gray-700">Servings</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeProducts.map((product) => (
                        <tr
                          key={product.id}
                          className="border-t cursor-pointer hover:bg-gray-100"
                          onClick={() => toggleSelectProduct(product.id)}
                        >
                          <td className="px-3 py-2">
                            <input
                              type="checkbox"
                              checked={selectedIds.has(product.id)}
                              disabled={isProcessing}
                              onClick={(event) => event.stopPropagation()}
                              onChange={() => toggleSelectProduct(product.id)}
                              className="h-4 w-4"
                            />
                          </td>
                          <td className="px-3 py-2 font-medium text-gray-800">{product.product_name}</td>
                          <td className="px-3 py-2 text-gray-600">{product.category || "Uncategorized"}</td>
                          <td className="px-3 py-2 text-gray-700">{product.stock_quantity ?? 0}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="p-6 text-center text-gray-500">No active products found.</div>
                )}
              </div>
            </div>
          </section>

          <section className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <p className="font-semibold text-gray-800">Archived Products</p>
              <div className="flex items-center gap-4 text-gray-600">
                <span>{selectedArchivedIds.size} selected</span>
                <button
                  type="button"
                  onClick={toggleSelectAllArchivedVisible}
                  className="text-blue-600 hover:text-blue-700 font-medium"
                  disabled={archivedProducts.length === 0 || isProcessing}
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
                      <div key={index} className="grid grid-cols-[1fr_160px_180px] gap-3 items-center">
                        <Skeleton className="h-5 w-2/3" />
                        <Skeleton className="h-5 w-24" />
                        <Skeleton className="h-5 w-28" />
                      </div>
                    ))}
                  </div>
                ) : archivedProducts.length > 0 ? (
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-3 py-2 text-left font-semibold text-gray-700 w-10"></th>
                        <th className="px-3 py-2 text-left font-semibold text-gray-700">Product</th>
                        <th className="px-3 py-2 text-left font-semibold text-gray-700">Category</th>
                        <th className="px-3 py-2 text-left font-semibold text-gray-700">Archived At</th>
                      </tr>
                    </thead>
                    <tbody>
                      {archivedProducts.map((product) => (
                        <tr
                          key={product.id}
                          className="border-t bg-amber-50/30 cursor-pointer hover:bg-amber-100/40"
                          onClick={() => toggleSelectArchivedProduct(product.id)}
                        >
                          <td className="px-3 py-2">
                            <input
                              type="checkbox"
                              checked={selectedArchivedIds.has(product.id)}
                              disabled={isProcessing}
                              onClick={(event) => event.stopPropagation()}
                              onChange={() => toggleSelectArchivedProduct(product.id)}
                              className="h-4 w-4"
                            />
                          </td>
                          <td className="px-3 py-2 font-medium text-gray-800">{product.product_name}</td>
                          <td className="px-3 py-2 text-gray-600">{product.category || "Uncategorized"}</td>
                          <td className="px-3 py-2 text-gray-700">{formatArchivedAt(product.archived_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="p-6 text-center text-gray-500">No archived products yet.</div>
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
            onClick={handleArchiveSelected}
            disabled={isProcessing || selectedIds.size === 0}
            className="bg-amber-600 hover:bg-amber-700"
          >
            {archiving ? "Archiving..." : "Archive Selected"}
          </Button>
          <Button
            type="button"
            onClick={handleUnarchiveSelected}
            disabled={isProcessing || selectedArchivedIds.size === 0}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            {unarchiving ? "Restoring..." : "Unarchive Selected"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
