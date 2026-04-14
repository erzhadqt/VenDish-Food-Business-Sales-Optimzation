import React, { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Skeleton } from "./ui/skeleton";
import { AlertCircle, CookingPot, Search, CheckSquare, Square, ChevronLeft, ChevronRight, CheckCircle2 } from "lucide-react";
import api from "../api";

const UNCATEGORIZED_FILTER_VALUE = "__uncategorized__";
const ITEMS_PER_PAGE = 15;

const formatPrice = (value) => {
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed)) return "";
  return parsed.toFixed(2);
};

const normalizeProductNameForComparison = (value = "") => {
  return String(value).toLowerCase().replace(/[^a-z0-9]/g, "");
};

// Helper function to extract meaningful API error messages
const extractErrorMessage = (error, fallback = "An unexpected error occurred.") => {
  if (error?.response?.data?.detail) return error.response.data.detail;
  if (error?.response?.data?.message) return error.response.data.message;
  if (error?.message) return error.message;
  return fallback;
};

export default function ManageProductsDialog({ open, onOpenChange, onSaved, categories = [] }) {
  const [products, setProducts] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [isResetMode, setIsResetMode] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState(new Set());
  
  // Feedback State
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);

  const isProcessing = saving || resetting;

  // Auto-clear feedback after 3 seconds
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

  const assignableCategories = useMemo(
    () => categories.filter((category) => category?.value && category.value !== UNCATEGORIZED_FILTER_VALUE),
    [categories]
  );

  const broadcastInventoryUpdate = () => {
    if (typeof window === "undefined") return;
    window.dispatchEvent(new CustomEvent("products:servings-updated"));
    localStorage.setItem("products:last-updated-at", String(Date.now()));
  };

  const createDraftMap = (items) => {
    const nextDrafts = {};
    items.forEach((product) => {
      nextDrafts[product.id] = {
        product_name: product.product_name || "",
        category: product.category || "",
        price: formatPrice(product.price),
        stock_quantity: String(product.stock_quantity ?? 0),
        low_serving_threshold: String(product.low_serving_threshold ?? 10),
      };
    });
    return nextDrafts;
  };

  const resetState = () => {
    setSearch("");
    setError("");
    setSuccess("");
    setIsResetMode(false);
    setSelectedIds(new Set());
    setCurrentPage(1);
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
        // Changed to omit archived products from the API response
        const response = await api.get("/firstapp/products/");
        
        const sortedProducts = [...(Array.isArray(response.data) ? response.data : [])]
          .filter(product => !product.is_archived) // Frontend safety filter
          .sort((a, b) =>
            (a.product_name || "").localeCompare((b.product_name || ""), undefined, { sensitivity: "base" })
          );

        setProducts(sortedProducts);
        setDrafts(createDraftMap(sortedProducts));
      } catch (fetchError) {
        console.error("Failed to load products:", fetchError);
        setError(extractErrorMessage(fetchError, "Failed to load products. Please check your connection."));
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [open]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  const filteredProducts = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return products;

    return products.filter((product) => {
      const productName = (product.product_name || "").toLowerCase();
      const category = (product.category || "").toLowerCase();
      return productName.includes(keyword) || category.includes(keyword);
    });
  }, [products, search]);

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / ITEMS_PER_PAGE));
  const paginatedProducts = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredProducts.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredProducts, currentPage]);

  const allFilteredSelected =
    filteredProducts.length > 0 && filteredProducts.every((product) => selectedIds.has(product.id));

  const changedProductIds = useMemo(() => {
    if (isResetMode) return [];

    return products
      .map((product) => {
        const draft = drafts[product.id];
        if (!draft) return null;

        const nameChanged = (draft.product_name || "").trim() !== (product.product_name || "").trim();
        const categoryChanged = (draft.category || "") !== (product.category || "");

        const draftPrice = Number.parseFloat(draft.price);
        const currentPrice = Number.parseFloat(product.price);
        const priceChanged = Number.isFinite(draftPrice) && Number.isFinite(currentPrice)
          ? draftPrice !== currentPrice
          : (draft.price || "") !== String(product.price || "");

        const draftServings = Number.parseInt(draft.stock_quantity, 10);
        const currentServings = Number(product.stock_quantity ?? 0);
        const servingsChanged = Number.isInteger(draftServings) ? draftServings !== currentServings : false;

        const draftLowServingThreshold = Number.parseInt(draft.low_serving_threshold, 10);
        const currentLowServingThreshold = Number(product.low_serving_threshold ?? 10);
        const thresholdChanged = Number.isInteger(draftLowServingThreshold)
          ? draftLowServingThreshold !== currentLowServingThreshold
          : false;

        return nameChanged || categoryChanged || priceChanged || servingsChanged || thresholdChanged ? product.id : null;
      })
      .filter(Boolean);
  }, [products, drafts, isResetMode]);

  const toggleResetMode = () => {
    if (isProcessing) return;
    setError("");
    setSuccess("");
    setSelectedIds(new Set());
    setIsResetMode((prev) => !prev);
  };

  const toggleSelectProduct = (productId) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) next.delete(productId);
      else next.add(productId);
      return next;
    });
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

  const updateDraft = (productId, field, value) => {
    setDrafts((prev) => ({
      ...prev,
      [productId]: { ...(prev[productId] || {}), [field]: value },
    }));
  };

  const handlePriceInput = (productId, rawValue) => {
    let sanitized = String(rawValue || "").replace(/[^0-9.]/g, "");
    const parts = sanitized.split(".");
    if (parts.length > 2) sanitized = `${parts[0]}.${parts.slice(1).join("")}`;
    updateDraft(productId, "price", sanitized);
  };

  const handleServingsInput = (productId, rawValue) => {
    const sanitized = String(rawValue || "").replace(/\D/g, "");
    updateDraft(productId, "stock_quantity", sanitized);
  };

  const handleLowServingThresholdInput = (productId, rawValue) => {
    const sanitized = String(rawValue || "").replace(/\D/g, "");
    updateDraft(productId, "low_serving_threshold", sanitized);
  };

  const handleSaveInlineUpdates = async () => {
    if (changedProductIds.length === 0) return;
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      // Build the final name state (current + draft) before sending any API call.
      const pendingNameById = new Map(
        products.map((product) => {
          const draftName = drafts[product.id]?.product_name;
          const pendingName = String(draftName ?? product.product_name ?? "").trim();
          return [product.id, pendingName];
        })
      );

      const duplicateNameConflicts = [];
      changedProductIds.forEach((productId) => {
        const product = products.find((item) => item.id === productId);
        if (!product) return;

        const originalName = String(product.product_name || "").trim();
        const pendingName = String(pendingNameById.get(productId) || "").trim();
        const nameChanged = pendingName !== originalName;
        if (!nameChanged) return;

        const normalizedPendingName = normalizeProductNameForComparison(pendingName);
        if (!normalizedPendingName) return;

        const duplicateEntry = products.find((candidate) => {
          if (candidate.id === productId) return false;

          const candidateName = String(pendingNameById.get(candidate.id) || "").trim();
          return normalizeProductNameForComparison(candidateName) === normalizedPendingName;
        });

        if (duplicateEntry) {
          duplicateNameConflicts.push(`"${pendingName}" conflicts with "${duplicateEntry.product_name}".`);
        }
      });

      if (duplicateNameConflicts.length > 0) {
        setError(`Duplicate product name detected. ${duplicateNameConflicts[0]}`);
        return;
      }

      const updates = changedProductIds.map((productId) => {
        const product = products.find((item) => item.id === productId);
        const draft = drafts[productId] || {};
        const payload = {};

        const nextName = (draft.product_name || "").trim();
        if (nextName !== (product.product_name || "").trim()) payload.product_name = nextName;

        const nextCategory = draft.category || "";
        if (nextCategory !== (product.category || "") && nextCategory !== "") payload.category = nextCategory;

        const nextPrice = Number.parseFloat(draft.price);
        if (nextPrice !== Number.parseFloat(product.price)) payload.price = nextPrice;

        const nextServings = Number.parseInt(draft.stock_quantity, 10);
        if (nextServings !== Number(product.stock_quantity ?? 0)) payload.stock_quantity = nextServings;

        const nextThreshold = Number.parseInt(draft.low_serving_threshold, 10);
        if (
          Number.isInteger(nextThreshold) &&
          nextThreshold !== Number(product.low_serving_threshold ?? 10)
        ) {
          payload.low_serving_threshold = Math.max(0, nextThreshold);
        }

        return { productId, payload };
      });

      const effectiveUpdates = updates.filter((u) => Object.keys(u.payload).length > 0);
      
      const results = await Promise.allSettled(
        effectiveUpdates.map((update) => api.patch(`/firstapp/products/${update.productId}/`, update.payload))
      );

      const successfulIds = [];
      const successfulUpdates = new Map();
      let failedCount = 0;
      let lastErrorMessage = "";

      results.forEach((result, index) => {
        const productId = effectiveUpdates[index].productId;
        if (result.status === "fulfilled") {
          successfulIds.push(productId);
          successfulUpdates.set(productId, result.value?.data || {});
        } else {
          failedCount += 1;
          lastErrorMessage = extractErrorMessage(result.reason, "");
        }
      });

      if (successfulIds.length > 0) {
        setProducts((prev) => prev.map((p) => successfulUpdates.has(p.id) ? { ...p, ...successfulUpdates.get(p.id) } : p));
        setSuccess(`Successfully updated ${successfulIds.length} product(s).`);
        broadcastInventoryUpdate();
        if (onSaved) onSaved();
      }

      if (failedCount > 0) {
        const failMsg = `Failed to update ${failedCount} product(s).`;
        setError(lastErrorMessage ? `${failMsg} Reason: ${lastErrorMessage}` : failMsg);
      }
    } catch (saveError) {
      console.error("Batch save error:", saveError);
      setError(extractErrorMessage(saveError, "A critical error occurred while saving. Please try again."));
    } finally {
      setSaving(false);
    }
  };

  const handleResetSelectedServings = async () => {
    if (selectedIds.size === 0) return;
    setResetting(true);
    setError("");
    setSuccess("");

    const idsToReset = Array.from(selectedIds);

    try {
      const results = await Promise.allSettled(
        idsToReset.map((productId) => api.patch(`/firstapp/products/${productId}/`, { stock_quantity: 0 }))
      );

      const successfulIds = [];
      let failedCount = 0;
      let lastErrorMessage = "";

      results.forEach((result, index) => {
        if (result.status === "fulfilled") {
          successfulIds.push(idsToReset[index]);
        } else {
          failedCount += 1;
          lastErrorMessage = extractErrorMessage(result.reason, "");
        }
      });

      if (successfulIds.length > 0) {
        setProducts((prev) => prev.map((p) => successfulIds.includes(p.id) ? { ...p, stock_quantity: 0, is_available: false } : p));
        setDrafts((prev) => {
          const next = { ...prev };
          successfulIds.forEach(id => { if (next[id]) next[id].stock_quantity = "0"; });
          return next;
        });
        setSelectedIds(new Set());
        setSuccess(`Servings successfully reset for ${successfulIds.length} product(s).`);
        broadcastInventoryUpdate();
        if (onSaved) onSaved();
      }

      if (failedCount > 0) {
        const failMsg = `Failed to reset ${failedCount} product(s).`;
        setError(lastErrorMessage ? `${failMsg} Reason: ${lastErrorMessage}` : failMsg);
      }
    } catch (resetError) {
      console.error("Batch reset error:", resetError);
      setError(extractErrorMessage(resetError, "A critical error occurred while resetting servings. Please try again."));
    } finally {
      setResetting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { if (!nextOpen) handleClose(); }}>
      <DialogContent className="sm:max-w-5xl z-50 flex flex-col max-h-[90vh]">
        <DialogHeader className="pb-4 border-b">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <CookingPot className="text-blue-600" size={24} /> 
            Manage Servings and Products
          </DialogTitle>
          <DialogDescription className="text-gray-500 mt-1">
            {isResetMode
              ? "Select products to instantly reset their available servings to zero."
              : "Quickly update product names, pricing, servings, and low-serving threshold. Save all changes at once."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col gap-4 py-2">
          {/* Action Bar */}
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-gray-50 p-3 rounded-lg border border-gray-100">
            <div className="relative w-full sm:w-80">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search products..."
                className="pl-10 bg-white border-gray-200 focus-visible:ring-blue-500"
                disabled={isProcessing}
              />
            </div>

            <div className="flex items-center gap-4 w-full sm:w-auto">
              {isResetMode && (
                <Button
                  variant="ghost"
                  onClick={toggleSelectAllFiltered}
                  disabled={filteredProducts.length === 0 || isProcessing}
                  className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                >
                  {allFilteredSelected ? <CheckSquare className="mr-2 h-4 w-4" /> : <Square className="mr-2 h-4 w-4" />}
                  {allFilteredSelected ? "Deselect All" : "Select All"}
                </Button>
              )}
              
              <Button
                variant={isResetMode ? "outline" : "secondary"}
                onClick={toggleResetMode}
                disabled={isProcessing}
                className={isResetMode ? "border-gray-300" : "bg-blue-50 text-blue-700 hover:bg-blue-100"}
              >
                {isResetMode ? "Cancel Reset" : "Reset Servings"}
              </Button>
            </div>
          </div>

          {/* Feedback Messages */}
          {error && (
            <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-4 py-3 flex items-center gap-2 shadow-sm animate-in fade-in slide-in-from-top-2">
              <AlertCircle size={18} className="shrink-0" />
              <span className="font-medium">{error}</span>
            </div>
          )}
          {success && (
            <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-md px-4 py-3 flex items-center gap-2 shadow-sm animate-in fade-in slide-in-from-top-2">
              <CheckCircle2 size={18} className="shrink-0" />
              <span className="font-medium">{success}</span>
            </div>
          )}

          {/* Status Bar */}
          <div className="flex items-center justify-between text-sm font-medium text-gray-500 px-1">
            {isResetMode ? (
              <span className="text-red-600">{selectedIds.size} product(s) selected for reset</span>
            ) : (
              <span className={changedProductIds.length > 0 ? "text-blue-600" : ""}>
                {changedProductIds.length} unsaved change(s)
              </span>
            )}
          </div>

          {/* Table Container */}
          <div className="border border-gray-200 rounded-lg overflow-hidden flex-1 flex flex-col shadow-sm bg-white relative">
            <div className="overflow-y-auto flex-1">
              {loading ? (
                 <div className="p-4 space-y-4">
                 {Array.from({ length: 6 }).map((_, i) => (
                   <Skeleton key={i} className="h-12 w-full rounded-md" />
                 ))}
               </div>
              ) : paginatedProducts.length > 0 ? (
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-100 text-gray-600 sticky top-0 z-10 shadow-sm border-b border-gray-200">
                    <tr>
                      {isResetMode && <th className="px-4 py-3 w-12 font-semibold"></th>}
                      <th className="px-4 py-3 font-semibold min-w-55">Product Name</th>
                      <th className="px-4 py-3 font-semibold w-48">Category</th>
                      <th className="px-4 py-3 font-semibold w-32 text-right">Price</th>
                      <th className="px-4 py-3 font-semibold w-32 text-right">Servings</th>
                      <th className="px-4 py-3 font-semibold w-36 text-right">Low Serving At</th>
                      <th className="px-4 py-3 font-semibold w-28 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {paginatedProducts.map((product) => {
                      const draft = drafts[product.id] || {
                        product_name: product.product_name || "",
                        category: product.category || "",
                        price: formatPrice(product.price),
                        stock_quantity: String(product.stock_quantity ?? 0),
                        low_serving_threshold: String(product.low_serving_threshold ?? 10),
                      };

                      const isEdited = changedProductIds.includes(product.id);
                      const isSelected = selectedIds.has(product.id);

                      return (
                        <tr
                          key={product.id}
                          className={`group transition-colors ${
                            isResetMode ? "cursor-pointer hover:bg-red-50/50" : "hover:bg-gray-50"
                          } ${isSelected ? "bg-red-50" : ""} ${isEdited && !isResetMode ? "bg-blue-50/30" : ""}`}
                          onClick={() => { if (isResetMode) toggleSelectProduct(product.id); }}
                        >
                          {isResetMode && (
                            <td className="px-4 py-3">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                readOnly
                                className="h-4 w-4 text-red-600 rounded border-gray-300 focus:ring-red-500 cursor-pointer"
                              />
                            </td>
                          )}

                          <td className="px-4 py-3">
                            {isResetMode ? (
                              <span className="font-medium text-gray-900">{product.product_name}</span>
                            ) : (
                              <Input
                                value={draft.product_name}
                                onChange={(e) => updateDraft(product.id, "product_name", e.target.value)}
                                className={`w-full ${isEdited ? 'border-blue-300 bg-white' : 'bg-transparent border-transparent hover:border-gray-200 focus:bg-white'}`}
                                disabled={isProcessing}
                              />
                            )}
                          </td>

                          <td className="px-4 py-3">
                            {isResetMode ? (
                              <span className="text-gray-600">{product.category || "Uncategorized"}</span>
                            ) : (
                              <select
                                value={draft.category}
                                onChange={(e) => updateDraft(product.id, "category", e.target.value)}
                                className={`w-full h-10 px-3 py-2 text-sm rounded-md border outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                                  isEdited ? 'border-blue-300 bg-white' : 'border-transparent bg-transparent hover:border-gray-200 focus:bg-white focus:border-input'
                                }`}
                                disabled={isProcessing}
                              >
                                {draft.category === "" && <option value="">Uncategorized</option>}
                                {assignableCategories.map((c) => (
                                  <option key={c.value} value={c.value}>{c.label}</option>
                                ))}
                              </select>
                            )}
                          </td>

                          <td className="px-4 py-3">
                            {isResetMode ? (
                              <div className="text-right text-gray-900 font-medium">₱{product.price}</div>
                            ) : (
                              <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium">₱</span>
                                <Input
                                  value={draft.price}
                                  onChange={(e) => handlePriceInput(product.id, e.target.value)}
                                  inputMode="decimal"
                                  className={`w-full pl-7 text-right ${isEdited ? 'border-blue-300 bg-white' : 'bg-transparent border-transparent hover:border-gray-200 focus:bg-white'}`}
                                  disabled={isProcessing}
                                />
                              </div>
                            )}
                          </td>

                          <td className="px-4 py-3">
                            {isResetMode ? (
                              <div className="text-right text-gray-900 font-medium">{product.stock_quantity ?? 0}</div>
                            ) : (
                              <Input
                                value={draft.stock_quantity}
                                onChange={(e) => handleServingsInput(product.id, e.target.value)}
                                inputMode="numeric"
                                className={`w-full text-right ${isEdited ? 'border-blue-300 bg-white' : 'bg-transparent border-transparent hover:border-gray-200 focus:bg-white'}`}
                                disabled={isProcessing}
                              />
                            )}
                          </td>

                          <td className="px-4 py-3">
                            {isResetMode ? (
                              <div className="text-right text-gray-900 font-medium">{product.low_serving_threshold ?? 10}</div>
                            ) : (
                              <Input
                                value={draft.low_serving_threshold}
                                onChange={(e) => handleLowServingThresholdInput(product.id, e.target.value)}
                                inputMode="numeric"
                                className={`w-full text-right ${isEdited ? 'border-blue-300 bg-white' : 'bg-transparent border-transparent hover:border-gray-200 focus:bg-white'}`}
                                disabled={isProcessing}
                              />
                            )}
                          </td>

                          <td className="px-4 py-3 text-center">
                            {/* Removed the archived check here */}
                            {(Number(product.stock_quantity ?? 0) > 0) ? (
                              <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 w-24">
                                Available
                              </span>
                            ) : (
                              <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700 w-24">
                                Sold Out
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                <div className="flex flex-col items-center justify-center h-48 text-gray-500">
                  <Search size={32} className="text-gray-300 mb-3" />
                  <p>No products found matching your search.</p>
                </div>
              )}
            </div>
            
            {/* Pagination Controls */}
            {filteredProducts.length > 0 && (
              <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-t border-gray-200">
                <span className="text-sm text-gray-500 hidden sm:inline-block">
                  Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, filteredProducts.length)} of {filteredProducts.length} entries
                </span>
                
                <div className="flex items-center gap-2 ml-auto sm:ml-0">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1 || isProcessing}
                  >
                    <ChevronLeft size={16} />
                  </Button>
                  
                  <span className="text-sm font-medium text-gray-700 px-2 min-w-20 text-center">
                    Page {currentPage} of {totalPages}
                  </span>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages || isProcessing}
                  >
                    <ChevronRight size={16} />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="pt-4 border-t mt-2">
          <Button variant="outline" onClick={handleClose} disabled={isProcessing} className="w-full sm:w-auto">
            Cancel
          </Button>

          {isResetMode ? (
            <Button
              onClick={handleResetSelectedServings}
              disabled={isProcessing || selectedIds.size === 0}
              className="bg-red-600 hover:bg-red-700 text-white w-full sm:w-auto"
            >
              {resetting ? "Processing..." : `Reset Servings (${selectedIds.size})`}
            </Button>
          ) : (
            <Button
              onClick={handleSaveInlineUpdates}
              disabled={isProcessing || changedProductIds.length === 0}
              className="bg-blue-600 hover:bg-blue-700 text-white w-full sm:w-auto shadow-md"
            >
              {saving ? "Saving Changes..." : `Save ${changedProductIds.length > 0 ? changedProductIds.length : ''} Changes`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}