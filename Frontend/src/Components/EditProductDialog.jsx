import { useState } from "react";
import api from "../api";
import { Button } from "../Components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../Components/ui/dialog";
import { Input } from "../Components/ui/input";
import { Label } from "../Components/ui/label";
import { AlertCircle } from "lucide-react";
import { Skeleton } from "../Components/ui/skeleton";

const DEFAULT_LOW_SERVING_THRESHOLD = 10;

export default function EditProductDialog({ product, onClose, onSaved, categories = [], existingProducts = [] }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});

  // Controlled states for inputs
  const [productName, setProductName] = useState(product?.product_name || "");
  const [price, setPrice] = useState(product?.price || "");
  const [category, setCategory] = useState(product?.category || "");
  const [servings, setServings] = useState(String(product?.stock_quantity ?? ""));
  const [lowServingThreshold, setLowServingThreshold] = useState(String(product?.low_serving_threshold ?? DEFAULT_LOW_SERVING_THRESHOLD));
  const [image, setImage] = useState(null);

  const clearFieldError = (fieldName) => {
    setFieldErrors((prev) => {
      if (!prev[fieldName]) return prev;
      const next = { ...prev };
      delete next[fieldName];
      return next;
    });
  };

  const getInputClassName = (fieldName, baseClass = "") => {
    const mergedClass = [baseClass, fieldErrors[fieldName] ? "border-red-500 focus-visible:ring-red-500" : ""]
      .filter(Boolean)
      .join(" ");
    return mergedClass;
  };

  const handleProductNameChange = (e) => {
    let val = e.target.value.replace(/[^a-zA-Z0-9\s\-'&]/g, '');
    setProductName(val);
    clearFieldError("product_name");
  };

  const handlePriceChange = (e) => {
    let val = e.target.value.replace(/[^0-9.]/g, '');
    const parts = val.split('.');
    if (parts.length > 2) {
      val = parts[0] + '.' + parts.slice(1).join('');
    }
    setPrice(val);
    clearFieldError("price");
  };

  const handleServingsChange = (e) => {
    let val = e.target.value.replace(/[^0-9]/g, '');
    setServings(val);
    clearFieldError("servings");
  };

  const handleLowServingThresholdChange = (e) => {
    const val = e.target.value.replace(/[^0-9]/g, '');
    setLowServingThreshold(val);
    clearFieldError("low_serving_threshold");
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setFieldErrors({});

    const nextFieldErrors = {};
    const normalizedProductName = productName.trim();
    const numericPrice = parseFloat(price || "0");
    const parsedThreshold = Number.parseInt(lowServingThreshold, 10);

    if (!normalizedProductName) {
      nextFieldErrors.product_name = "Product name must not be blank.";
    }

    if (normalizedProductName && !/[a-zA-Z]/.test(normalizedProductName)) {
      nextFieldErrors.product_name = "Product name must contain letters.";
    }

    if (price === "" || Number.isNaN(numericPrice) || numericPrice <= 0) {
      nextFieldErrors.price = "Price must be greater than 0.";
    }

    if (lowServingThreshold === "" || !Number.isInteger(parsedThreshold) || parsedThreshold < 0) {
      nextFieldErrors.low_serving_threshold = "Low serving threshold must be 0 or greater.";
    }

    if (Object.keys(nextFieldErrors).length > 0) {
      setFieldErrors(nextFieldErrors);
      setError(`Please review the highlighted fields. ${Object.keys(nextFieldErrors).length} validation issue${Object.keys(nextFieldErrors).length > 1 ? "s" : ""} found.`);
      setLoading(false);
      return;
    }

    // ✅ FIX: Advanced Similarity Check
    // Removes all spaces, dashes, and special characters, then converts to lowercase
    const normalizeForComparison = (str = "") => String(str).toLowerCase().replace(/[^a-z0-9]/g, '');
    
    const baseNewName = normalizeForComparison(normalizedProductName);

    const isDuplicate = existingProducts.some((p) => {
      // Ignore the current product being edited
      if (p.id === product.id) return false;
      
      const baseExistingName = normalizeForComparison(p?.product_name);
      return baseExistingName === baseNewName;
    });

    if (isDuplicate) {
      setFieldErrors({ product_name: "A similar product name already exists." });
      setError("A similar product name already exists in your menu.");
      setLoading(false); 
      return; 
    }

    const formData = new FormData();
    
    formData.append("product_name", normalizedProductName);
    formData.append("price", numericPrice);
    
    if (category) {
      formData.append("category", category);
    } else {
      formData.append("category", ""); 
    }

    const parsedServings = parseInt(servings || "0", 10);
    const servingCount = Number.isFinite(parsedServings) ? Math.max(0, parsedServings) : 0;
    const thresholdCount = Number.isFinite(parsedThreshold) ? Math.max(0, parsedThreshold) : DEFAULT_LOW_SERVING_THRESHOLD;
    
    formData.append("stock_quantity", servingCount);
    formData.append("low_serving_threshold", thresholdCount);
    formData.append("track_stock", "true");
    formData.append("is_available", String(servingCount > 0));
    
    if (image) formData.append("image", image);

    try {
      await api.patch(`/firstapp/products/${product.id}/`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      onSaved();
      onClose();
    } catch (err) {
      console.error("Update error:", err.response?.data || err);
      setError("Failed to update product. Please check your inputs and try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setError(null);
    setFieldErrors({});
    onClose();
  };

  const topErrorItems = Object.values(fieldErrors);

  return (
    <Dialog open={true} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-112.5 z-50">
        <DialogHeader>
          <DialogTitle>Edit Product</DialogTitle>
          <DialogDescription>
            Modify the product details and click save.
          </DialogDescription>
        </DialogHeader>

        {!product ? (
          <div className="grid gap-4 py-1">
            <div className="grid gap-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="grid gap-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="grid gap-2">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-10 w-full" />
            </div>
            <Skeleton className="h-12 w-full" />
            <div className="grid gap-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-10 w-full" />
            </div>
            <DialogFooter>
              <Skeleton className="h-10 w-24" />
              <Skeleton className="h-10 w-28" />
            </DialogFooter>
          </div>
        ) : (
        <>

        {error && (
          <div className="bg-red-50 text-red-600 text-sm p-3 rounded-md flex items-start gap-2 border border-red-200">
            <AlertCircle size={16} className="mt-0.5" />
            <div className="space-y-1">
              <p>{error}</p>
              {topErrorItems.length > 0 && (
                <ul className="list-disc pl-4">
                  {topErrorItems.slice(0, 4).map((item, index) => (
                    <li key={`${item}-${index}`}>{item}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}

        <form onSubmit={handleSave} className="grid gap-4" noValidate>
          <div className="grid gap-2">
            <Label>Product Name</Label>
            <Input 
              name="product_name" 
              value={productName}
              onChange={handleProductNameChange}
              required 
              maxLength={20}
              className={getInputClassName("product_name")}
              aria-invalid={!!fieldErrors.product_name}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="category">Category</Label>
            <select
              name="category"
              id="category"
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                clearFieldError("category");
              }}
              className={`px-3 py-2 border rounded-md ${fieldErrors.category ? "border-red-500 focus:ring-red-500" : ""}`}
              aria-invalid={!!fieldErrors.category}
            >
              <option value="">Select Category</option>
              {categories.length > 0 ? (
                categories.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))
              ) : (
                <option value="" disabled>Loading categories...</option>
              )}
            </select>
          </div>

          <div className="grid gap-2">
            <Label>Price (₱)</Label>
            <Input
              name="price"
              type="text"
              inputMode="decimal"
              placeholder="0.00"
              value={price}
              onChange={handlePriceChange} 
              required
              maxLength={13}
              className={getInputClassName("price")}
              aria-invalid={!!fieldErrors.price}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="servings">Servings Available <p className="inline text-xs text-muted-foreground">(Restock?)</p></Label>
            <Input
              id="servings"
              type="text"
              inputMode="numeric"
              placeholder="0"
              value={servings}
              onChange={handleServingsChange}
              maxLength={11}
              className={getInputClassName("servings")}
              aria-invalid={!!fieldErrors.servings}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="low-serving-threshold">Low Serving Threshold</Label>
            <Input
              id="low-serving-threshold"
              type="text"
              inputMode="numeric"
              placeholder={String(DEFAULT_LOW_SERVING_THRESHOLD)}
              value={lowServingThreshold}
              onChange={handleLowServingThresholdChange}
              maxLength={11}
              className={getInputClassName("low_serving_threshold")}
              aria-invalid={!!fieldErrors.low_serving_threshold}
            />
            <p className="text-xs text-muted-foreground">POS marks this product as low serving when remaining servings are at or below this number.</p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="image">Upload Image</Label>
            <Input
              type="file"
              accept="image/*"
              onChange={(e) => setImage(e.target.files[0])}
              className="block w-full border rounded-md p-2"
            />
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" disabled={loading} onClick={handleClose}>
                Cancel
              </Button>
            </DialogClose>

            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
        </>
        )}
      </DialogContent>
    </Dialog>
  );
}