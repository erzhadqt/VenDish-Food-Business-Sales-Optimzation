import { useState } from "react";
import { Button } from "../Components/ui/button";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "../Components/ui/dialog";
import { Input } from "../Components/ui/input";
import { Label } from "../Components/ui/label";
import { AlertCircle } from "lucide-react"; 
import api from "../api";

const DEFAULT_LOW_SERVING_THRESHOLD = 10;

const normalizeProductNameForComparison = (value = "") => {
  return String(value).toLowerCase().replace(/[^a-z0-9]/g, "");
};

export default function AddProductDialog({ onSaved, children, existingProducts = [], categories = [] }) {
  const [open, setOpen] = useState(false);
  const [productName, setProductName] = useState("");
  const [category, setCategory] = useState("");
  const [price, setPrice] = useState("");
  const [servings, setServings] = useState("");
  const [lowServingThreshold, setLowServingThreshold] = useState(String(DEFAULT_LOW_SERVING_THRESHOLD));
  
  const [loading, setLoading] = useState(false);
  const [image, setImage] = useState(null);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

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

  const handleOpenChange = (val) => {
    setOpen(val);
    if (!val) {
      setError("");
      setFieldErrors({});
    }
  };

  // Strict sanitization for Product Name
  const handleProductNameChange = (e) => {
    // Only allows Letters, Numbers, Spaces, Hyphens, Apostrophes, and Ampersands.
    let val = e.target.value.replace(/[^a-zA-Z0-9\s\-'&]/g, '');
    setProductName(val);
    clearFieldError("productName");
  };

  // Strict sanitization for Price
  const handlePriceChange = (e) => {
    let val = e.target.value.replace(/[^0-9.]/g, '');
    
    const parts = val.split('.');
    if (parts.length > 2) {
      val = parts[0] + '.' + parts.slice(1).join('');
    }
    
    setPrice(val);
    clearFieldError("price");
  };

  // Strict sanitization for Servings
  const handleServingsChange = (e) => {
    let val = e.target.value.replace(/[^0-9]/g, '');
    setServings(val);
    clearFieldError("servings");
  };

  const handleLowServingThresholdChange = (e) => {
    const val = e.target.value.replace(/[^0-9]/g, '');
    setLowServingThreshold(val);
    clearFieldError("lowServingThreshold");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setFieldErrors({});
    setLoading(true);

    const nextFieldErrors = {};
    const normalizedProductName = productName.trim();
    const numericPrice = parseFloat(price || "0");
    const parsedLowServingThreshold = Number.parseInt(lowServingThreshold, 10);

    if (!normalizedProductName) {
      nextFieldErrors.productName = "Product name must not be blank.";
    }

    if (normalizedProductName && !/[a-zA-Z]/.test(normalizedProductName)) {
      nextFieldErrors.productName = "Product name must contain letters.";
    }

    if (price === "" || Number.isNaN(numericPrice) || numericPrice <= 0) {
      nextFieldErrors.price = "Price must be greater than 0.";
    }

    if (
      lowServingThreshold === "" ||
      !Number.isInteger(parsedLowServingThreshold) ||
      parsedLowServingThreshold < 0
    ) {
      nextFieldErrors.lowServingThreshold = "Low serving threshold must be 0 or greater.";
    }

    if (Object.keys(nextFieldErrors).length > 0) {
      setFieldErrors(nextFieldErrors);
      setError(`Please review the highlighted fields. ${Object.keys(nextFieldErrors).length} validation issue${Object.keys(nextFieldErrors).length > 1 ? "s" : ""} found.`);
      setLoading(false);
      return;
    }

    // Strict duplicate check: ignores spaces/case/special separators.
    const normalizedCandidateName = normalizeProductNameForComparison(normalizedProductName);
    const isDuplicate = existingProducts.some((p) => {
      const existingName = normalizeProductNameForComparison(p?.product_name);
      return existingName === normalizedCandidateName;
    });

    if (isDuplicate) {
      setFieldErrors({ productName: "A product with this name already exists." });
      setError("A similar product name already exists in your menu.");
      setLoading(false); 
      return; 
    }

    try {
      const formData = new FormData();
      formData.append("product_name", normalizedProductName);
      
      // Only append category if it's not blank. This allows the backend to handle it as null/uncategorized.
      if (category) {
        formData.append("category", category); 
      }
      
      formData.append("price", numericPrice);

      // Parses input. Falls back to "0" if left blank by the user.
      const parsedServings = parseInt(servings || "0", 10);
      const servingCount = Number.isFinite(parsedServings) ? Math.max(0, parsedServings) : 0;
      const thresholdCount = Number.isFinite(parsedLowServingThreshold) ? Math.max(0, parsedLowServingThreshold) : DEFAULT_LOW_SERVING_THRESHOLD;

      formData.append("is_available", String(servingCount > 0));
      formData.append("track_stock", "true");
      formData.append("stock_quantity", servingCount);
      formData.append("low_serving_threshold", thresholdCount);
      
      if (image) formData.append("image", image);

      await api.post("/firstapp/products/", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setLoading(false);
      setOpen(false);
      onSaved();

      // Reset form
      setProductName("");
      setCategory("");
      setPrice("");
      setServings("");
      setLowServingThreshold(String(DEFAULT_LOW_SERVING_THRESHOLD));
      setImage(null);
      setError("");
      setFieldErrors({});
    } catch (err) {
      console.error("Failed to add product:", err.response?.data || err);
      setLoading(false);
      setError(err.response?.data?.message || "Failed to add product. Please try again.");
    }
  };

  const topErrorItems = Object.values(fieldErrors);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>

      <DialogContent className="sm:max-w-md z-50">
        <DialogHeader>
          <DialogTitle>Add New Product</DialogTitle>
          <DialogDescription>Fill in the details below and click save.</DialogDescription>
        </DialogHeader>

        {error && (
          <div className="bg-red-50 text-red-600 text-sm p-3 rounded-md flex items-center gap-2 border border-red-200">
            <AlertCircle size={16} />
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

        <form className="grid gap-4" onSubmit={handleSubmit} noValidate>
          {/* Product Name Input */}
          <div className="grid gap-2">
            <Label htmlFor="product-name">Product Name</Label>
            <Input
              id="product-name"
              value={productName}
              onChange={handleProductNameChange}
              required
              className={getInputClassName("productName")}
              aria-invalid={!!fieldErrors.productName}
              maxLength={20}
            />
          </div>

          {/* Category Input */}
          <div className="grid gap-2">
            <Label htmlFor="category">Category</Label>
            <select
              id="category"
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                clearFieldError("category");
              }}
              // Removed the 'required' attribute here
              className={`px-3 py-2 border rounded-md ${fieldErrors.category ? "border-red-500 focus:ring-red-500" : ""}`}
              aria-invalid={!!fieldErrors.category}
            >
              {/* Changed from disabled to selectable default */}
              <option value="">Select Category</option>
              {categories.length > 0 ? (
                categories.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))
              ) : (
                <option value="" disabled>Loading categories...</option>
              )}
            </select>
          </div>

          {/* Price Input */}
          <div className="grid gap-2">
              <Label htmlFor="price">Price (₱)</Label>
              <Input
                id="price"
                type="text"           
                inputMode="decimal"   
                value={price}
                onChange={handlePriceChange}
                placeholder="0.00"
                required
                className={getInputClassName("price")}
                aria-invalid={!!fieldErrors.price}
                maxLength={13}
              />
          </div>

          {/* Servings Input */}
          <div className="grid gap-2">
            <Label htmlFor="servings">Servings Available</Label>
            <Input
              id="servings"
              type="text"           
              inputMode="numeric"   
              value={servings}
              onChange={handleServingsChange}
              placeholder="0"
              // Removed the 'required' attribute here
              className={getInputClassName("servings")}
              aria-invalid={!!fieldErrors.servings}
              maxLength={11}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="low-serving-threshold">Low Serving Threshold</Label>
            <Input
              id="low-serving-threshold"
              type="text"
              inputMode="numeric"
              value={lowServingThreshold}
              onChange={handleLowServingThresholdChange}
              placeholder={String(DEFAULT_LOW_SERVING_THRESHOLD)}
              className={getInputClassName("lowServingThreshold")}
              aria-invalid={!!fieldErrors.lowServingThreshold}
              maxLength={11}
            />
            <p className="text-xs text-muted-foreground">POS marks this product as low serving when remaining servings are at or below this number.</p>
          </div>

          {/* Image Input */}
          <div className="grid gap-2">
            <Label htmlFor="image">Upload Image</Label>
            <Input
              id="image"
              type="file"
              accept="image/*"
              onChange={(e) => setImage(e.target.files[0])}
              className="block w-full border rounded-md p-2"
            />
          </div>

          <DialogFooter className="flex justify-end gap-2">
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : "Add"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}