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
  const [isEditMode, setIsEditMode] = useState(false);
  const [editValues, setEditValues] = useState({});
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const sanitizeNonNegativeIntegerInput = (value) => String(value || "").replace(/\D/g, "");

  const parseNonNegativeInteger = (value) => {
    if (value === "" || value === null || value === undefined) return null;
    if (!/^\d+$/.test(String(value))) return null;
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed < 0) return null;
    return parsed;
  };

  const broadcastInventoryUpdate = () => {
    if (typeof window === "undefined") return;
    window.dispatchEvent(new CustomEvent("products:servings-updated"));
    localStorage.setItem("products:last-updated-at", String(Date.now()));
  };

  const resetState = () => {
    setSearch("");
    setIsEditMode(false);
    setEditValues({});
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
    if (isEditMode) return;
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) next.delete(productId);
      else next.add(productId);
      return next;
    });
  };

  const allFilteredSelected = filteredProducts.length > 0 && filteredProducts.every((product) => selectedIds.has(product.id));

  const pendingEditCount = useMemo(() => {
    if (!isEditMode) return 0;

    return products.reduce((count, product) => {
      const parsedValue = parseNonNegativeInteger(editValues[product.id]);
      if (parsedValue === null) return count;

      return parsedValue !== Number(product.stock_quantity ?? 0) ? count + 1 : count;
    }, 0);
  }, [isEditMode, products, editValues]);

  const hasInvalidEditInput = useMemo(() => {
    if (!isEditMode) return false;

    return products.some((product) => parseNonNegativeInteger(editValues[product.id]) === null);
  }, [isEditMode, products, editValues]);

  const toggleMode = () => {
    if (saving) return;

    const nextMode = !isEditMode;
    setError("");
    setSuccess("");
    setSelectedIds(new Set());

    if (nextMode) {
      const initialValues = {};
      products.forEach((product) => {
        initialValues[product.id] = String(product.stock_quantity ?? 0);
      });
      setEditValues(initialValues);
    } else {
      setEditValues({});
    }

    setIsEditMode(nextMode);
  };

  const handleEditValueChange = (productId, rawValue) => {
    const sanitizedValue = sanitizeNonNegativeIntegerInput(rawValue);
    setEditValues((prev) => ({
      ...prev,
      [productId]: sanitizedValue,
    }));
  };

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
        broadcastInventoryUpdate();
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

  const handleSaveEditedServings = async () => {
    if (hasInvalidEditInput) {
      setError("Servings must be whole numbers and cannot contain letters.");
      return;
    }

    const productsToUpdate = products
      .map((product) => {
        const parsedValue = parseNonNegativeInteger(editValues[product.id]);
        if (parsedValue === null) return null;
        if (parsedValue === Number(product.stock_quantity ?? 0)) return null;

        return {
          id: product.id,
          stockQuantity: parsedValue,
        };
      })
      .filter(Boolean);

    if (productsToUpdate.length === 0) {
      setError("No serving changes to save.");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const results = await Promise.allSettled(
        productsToUpdate.map((item) =>
          api.patch(`/firstapp/products/${item.id}/`, { stock_quantity: item.stockQuantity })
        )
      );

      const successfulUpdates = new Map();
      let failedCount = 0;

      results.forEach((result, index) => {
        const target = productsToUpdate[index];
        if (result.status === "fulfilled") {
          const updatedProduct = result.value?.data || {};
          const updatedStock = Number(updatedProduct.stock_quantity ?? target.stockQuantity);
          const updatedAvailability = Boolean(updatedProduct.is_available ?? (updatedStock > 0));

          successfulUpdates.set(target.id, {
            stockQuantity: updatedStock,
            isAvailable: updatedAvailability,
          });
        } else {
          failedCount += 1;
        }
      });

      if (successfulUpdates.size > 0) {
        setProducts((prev) =>
          prev.map((product) => {
            const next = successfulUpdates.get(product.id);
            if (!next) return product;

            return {
              ...product,
              stock_quantity: next.stockQuantity,
              is_available: next.isAvailable,
            };
          })
        );

        setEditValues((prev) => {
          const nextValues = { ...prev };
          successfulUpdates.forEach((value, productId) => {
            nextValues[productId] = String(value.stockQuantity);
          });
          return nextValues;
        });

        setSuccess(`Updated servings for ${successfulUpdates.size} product(s).`);
        broadcastInventoryUpdate();
        if (onSaved) onSaved();
      }

      if (failedCount > 0) {
        setError(`Failed to update ${failedCount} product(s). Please try again.`);
      }
    } catch (editError) {
      console.error("Failed to update servings:", editError);
      setError("Failed to update servings. Please try again.");
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
            {isEditMode
              ? "Edit multiple product servings, then save all changes in one process."
              : "Select products and reset their servings to 0. This will mark selected products as unavailable."}
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

          <div className="flex items-center justify-between text-sm text-gray-600 gap-3">
            {isEditMode ? (
              <span>{pendingEditCount} pending change(s).</span>
            ) : (
              <span>{selectedIds.size} selected</span>
            )}

            <div className="flex items-center gap-4">
              {!isEditMode && (
                <button
                  type="button"
                  onClick={toggleSelectAllFiltered}
                  className="text-blue-600 hover:text-blue-700 font-medium"
                  disabled={filteredProducts.length === 0}
                >
                  {allFilteredSelected ? "Unselect All" : "Select All"}
                </button>
              )}
            </div>
          </div>

          <div className="border rounded-lg overflow-hidden">
            <div className="max-h-105 overflow-y-auto">
              {loading ? (
                <div className="p-4 space-y-3">
                  {Array.from({ length: 8 }).map((_, index) => (
                    <div key={index} className={`grid ${isEditMode ? "grid-cols-[1fr_140px_140px]" : "grid-cols-[24px_1fr_140px_120px]"} gap-3 items-center`}>
                      {!isEditMode && <Skeleton className="h-4 w-4" />}
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
                      {!isEditMode && <th className="px-3 py-2 text-left font-semibold text-gray-700 w-10"></th>}
                      <th className="px-3 py-2 text-left font-semibold text-gray-700">Product</th>
                      <th className="px-3 py-2 text-left font-semibold text-gray-700">Category</th>
                      <th className="px-3 py-2 text-left font-semibold text-gray-700">
                        {isEditMode ? "Servings" : "Current Servings"}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProducts.map((product) => (
                      <tr
                      key={product.id}
                      className={`border-t ${isEditMode ? "" : "cursor-pointer hover:bg-gray-200"}`}
                      onClick={() => {
                        if (!isEditMode) {
                          toggleProduct(product.id);
                        }
                      }}
                      >
                        {!isEditMode && (
                          <td className="px-3 py-2">
                            <input
                              type="checkbox"
                              checked={selectedIds.has(product.id)}
                              onClick={(event) => event.stopPropagation()}
                              onChange={() => toggleProduct(product.id)}
                              className="h-4 w-4"
                            />
                          </td>
                        )}
                        <td className="px-3 py-2 font-medium text-gray-800">{product.product_name}</td>
                        <td className="px-3 py-2 text-gray-600">{product.category || "Uncategorized"}</td>
                        <td className="px-3 py-2 text-gray-700">
                          {isEditMode ? (
                            <Input
                              type="text"
                              inputMode="numeric"
                              pattern="[0-9]*"
                              value={editValues[product.id] ?? ""}
                              onChange={(event) => handleEditValueChange(product.id, event.target.value)}
                              className="max-w-28"
                            />
                          ) : (
                            product.stock_quantity ?? 0
                          )}
                        </td>
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
          <button
                type="button"
                onClick={toggleMode}
                disabled={saving}
                className="text-white bg-blue-600  hover:bg-blue-800 font-semibold disabled:opacity-60 px-2 rounded-lg text-sm items-center"
              >
                {isEditMode ? "Back to Reset Mode" : "Edit Servings"}
              </button>
          {isEditMode ? (
            <Button
              type="button"
              onClick={handleSaveEditedServings}
              disabled={saving || pendingEditCount === 0 || hasInvalidEditInput}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {saving ? "Saving..." : "Save All Serving Changes"}
            </Button>
          ) : (
            <Button
              type="button"
              onClick={handleResetServings}
              disabled={saving || selectedIds.size === 0}
              className="bg-red-600 hover:bg-red-700"
            >
              {saving ? "Resetting..." : "Reset Selected to 0"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
