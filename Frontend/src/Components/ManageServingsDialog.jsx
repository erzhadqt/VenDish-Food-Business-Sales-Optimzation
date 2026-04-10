import React, { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Skeleton } from "./ui/skeleton";
import { AlertCircle, Package, Search } from "lucide-react";
import api from "../api";

export default function ManageServingsDialog({ open, onOpenChange, onSaved }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const resetState = () => {
    setSearch("");
    setSelectedIds(new Set());
    setError("");
    setSuccess("");
  };

  const handleClose = () => {
    if (saving) return;
    resetState();
    onOpenChange(false);
  };

  useEffect(() => {
    const fetchAllProducts = async () => {
      if (!open) return;

      setLoading(true);
      setError("");
      setSuccess("");

      try {
        const response = await api.get("/firstapp/products/");
        const sortedProducts = [...(Array.isArray(response.data) ? response.data : [])].sort((a, b) =>
          (a.product_name || "").localeCompare((b.product_name || ""), undefined, { sensitivity: "base" })
        );
        setProducts(sortedProducts);
      } catch (fetchError) {
        console.error("Failed to load products for serving reset:", fetchError);
        setError("Failed to load products. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchAllProducts();
  }, [open]);

  const filteredProducts = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return products;

    return products.filter((product) => {
      const productName = (product.product_name || "").toLowerCase();
      const category = (product.category || "").toLowerCase();
      return productName.includes(keyword) || category.includes(keyword);
    });
  }, [products, search]);

  const toggleProduct = (productId) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) next.delete(productId);
      else next.add(productId);
      return next;
    });
  };

  const allFilteredSelected = filteredProducts.length > 0 && filteredProducts.every((product) => selectedIds.has(product.id));

  const toggleSelectAllFiltered = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);

      if (allFilteredSelected) {
        filteredProducts.forEach((product) => next.delete(product.id));
      } else {
        filteredProducts.forEach((product) => next.add(product.id));
      }

      return next;
    });
  };

  const handleResetServings = async () => {
    if (selectedIds.size === 0) {
      setError("Select at least one product to reset servings.");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    const idsToReset = Array.from(selectedIds);

    try {
      const results = await Promise.allSettled(
        idsToReset.map((productId) => api.patch(`/firstapp/products/${productId}/`, { stock_quantity: 0 }))
      );

      const successfulIds = [];
      let failedCount = 0;

      results.forEach((result, index) => {
        if (result.status === "fulfilled") {
          successfulIds.push(idsToReset[index]);
        } else {
          failedCount += 1;
        }
      });

      if (successfulIds.length > 0) {
        setProducts((prev) =>
          prev.map((product) =>
            successfulIds.includes(product.id)
              ? { ...product, stock_quantity: 0, is_available: false }
              : product
          )
        );

        setSelectedIds((prev) => {
          const next = new Set(prev);
          successfulIds.forEach((id) => next.delete(id));
          return next;
        });

        setSuccess(`Servings reset to 0 for ${successfulIds.length} product(s).`);
        if (onSaved) onSaved();
      }

      if (failedCount > 0) {
        setError(`Failed to reset ${failedCount} product(s). Please try again.`);
      }
    } catch (resetError) {
      console.error("Failed to reset servings:", resetError);
      setError("Failed to reset servings. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { if (!nextOpen) handleClose(); }}>
      <DialogContent className="sm:max-w-4xl z-50">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package size={18} /> Manage Servings
          </DialogTitle>
          <DialogDescription>
            Select products and reset their servings to 0. This will mark selected products as unavailable.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
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

          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>{selectedIds.size} selected</span>
            <button
              type="button"
              onClick={toggleSelectAllFiltered}
              className="text-blue-600 hover:text-blue-700 font-medium"
              disabled={filteredProducts.length === 0}
            >
              {allFilteredSelected ? "Unselect All" : "Select All"}
            </button>
          </div>

          <div className="border rounded-lg overflow-hidden">
            <div className="max-h-105 overflow-y-auto">
              {loading ? (
                <div className="p-4 space-y-3">
                  {Array.from({ length: 8 }).map((_, index) => (
                    <div key={index} className="grid grid-cols-[24px_1fr_140px_120px] gap-3 items-center">
                      <Skeleton className="h-4 w-4" />
                      <Skeleton className="h-5 w-2/3" />
                      <Skeleton className="h-5 w-24" />
                      <Skeleton className="h-5 w-16" />
                    </div>
                  ))}
                </div>
              ) : filteredProducts.length > 0 ? (
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold text-gray-700 w-10"></th>
                      <th className="px-3 py-2 text-left font-semibold text-gray-700">Product</th>
                      <th className="px-3 py-2 text-left font-semibold text-gray-700">Category</th>
                      <th className="px-3 py-2 text-left font-semibold text-gray-700">Current Servings</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProducts.map((product) => (
                      <tr key={product.id} 
                      className="border-t cursor-pointer hover:bg-gray-200"
                      onClick={() => toggleProduct(product.id)}
                      >
                        <td className="px-3 py-2">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(product.id)}
                            onChange={() => toggleProduct(product.id)}
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
                <div className="p-8 text-center text-gray-500">No products found.</div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleResetServings}
            disabled={saving || selectedIds.size === 0}
            className="bg-red-600 hover:bg-red-700"
          >
            {saving ? "Resetting..." : "Reset Selected to 0"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
