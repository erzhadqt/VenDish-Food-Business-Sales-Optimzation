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
import { Alert, AlertDescription, AlertTitle } from "../Components/ui/alert";
import { AlertCircle } from "lucide-react";
import { Skeleton } from "../Components/ui/skeleton";

export default function EditProductDialog({ product, onClose, onSaved, categories = [] }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});

  // Controlled states for inputs
  const [productName, setProductName] = useState(product?.product_name || "");
  const [price, setPrice] = useState(product?.price || "");
  const [category, setCategory] = useState(product?.category || "");
  const [servings, setServings] = useState(String(product?.stock_quantity ?? 0));
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

  // 🔴 Strict sanitization for Product Name
  const handleProductNameChange = (e) => {
    // Only allows Letters, Numbers, Spaces, Hyphens, Apostrophes, and Ampersands.
    let val = e.target.value.replace(/[^a-zA-Z0-9\s\-'&]/g, '');
    setProductName(val);
    clearFieldError("product_name");
  };

  // 🔴 Strict sanitization for Price
  const handlePriceChange = (e) => {
    let val = e.target.value.replace(/[^0-9.]/g, '');
    
    const parts = val.split('.');
    if (parts.length > 2) {
      val = parts[0] + '.' + parts.slice(1).join('');
    }
    
    // Optional: Limit length to prevent crazy high numbers
    if (val.length <= 15) {
      setPrice(val);
      clearFieldError("price");
    }
  };

  // 🔴 Strict sanitization for Servings
  const handleServingsChange = (e) => {
    let val = e.target.value.replace(/[^0-9]/g, '');
    setServings(val);
    clearFieldError("servings");
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setFieldErrors({});

    const nextFieldErrors = {};
    const normalizedProductName = productName.trim();
    const numericPrice = parseFloat(price || "0");

    if (!normalizedProductName) {
      nextFieldErrors.product_name = "Product name must not be blank.";
    }

    if (normalizedProductName && !/[a-zA-Z]/.test(normalizedProductName)) {
      nextFieldErrors.product_name = "Product name must contain letters.";
    }

    if (!category) {
      nextFieldErrors.category = "Category must not be blank.";
    }

    if (price === "" || Number.isNaN(numericPrice) || numericPrice <= 0) {
      nextFieldErrors.price = "Price must be greater than 0.";
    }

    if (servings === "") {
      nextFieldErrors.servings = "Servings must not be blank.";
    }

    if (Object.keys(nextFieldErrors).length > 0) {
      setFieldErrors(nextFieldErrors);
      setError(`Please review the highlighted fields. ${Object.keys(nextFieldErrors).length} validation issue${Object.keys(nextFieldErrors).length > 1 ? "s" : ""} found.`);
      setLoading(false);
      return;
    }

    // 🔴 Validation: Check for empty spaces
    const formData = new FormData();
    
    formData.append("product_name", normalizedProductName);
    formData.append("price", numericPrice);
    formData.append("category", category);
    const parsedServings = parseInt(servings || "0", 10);
    const servingCount = Number.isFinite(parsedServings) ? Math.max(0, parsedServings) : 0;
    formData.append("stock_quantity", servingCount);
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

  // Wrapper for closing to clear errors
  const handleClose = () => {
    setError(null);
    setFieldErrors({});
    onClose();
  };

  const topErrorItems = Object.values(fieldErrors);

  return (
    <Dialog open={true} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[450px] z-50">
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
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription className="space-y-1">
              <p>{error}</p>
              {topErrorItems.length > 0 && (
                <ul className="list-disc pl-4">
                  {topErrorItems.slice(0, 4).map((item, index) => (
                    <li key={`${item}-${index}`}>{item}</li>
                  ))}
                </ul>
              )}
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSave} className="grid gap-4" noValidate>
          <div className="grid gap-2">
            <Label>Product Name</Label>
            <Input 
              name="product_name" 
              value={productName}
              onChange={handleProductNameChange} // 🔴 Added handler
              required 
              maxLength={50}
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
              required
              className={`px-3 py-2 border rounded-md ${fieldErrors.category ? "border-red-500 focus:ring-red-500" : ""}`}
              aria-invalid={!!fieldErrors.category}
            >
              <option value="" disabled>
                Select category
              </option>
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
            <Label>Price</Label>
            <Input
              name="price"
              type="text"           // 🔴 Changed to text for regex
              inputMode="decimal"   // 🔴 Added for mobile keyboard
              value={price}
              onChange={handlePriceChange} 
              required
              maxLength={10}
              className={getInputClassName("price")}
              aria-invalid={!!fieldErrors.price}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="servings">Servings Available <p className="text-xs text-muted-foreground">(Restock?)</p></Label>
            <Input
              id="servings"
              type="text"           // 🔴 Changed to text for regex
              inputMode="numeric"   // 🔴 Added for mobile keyboard
              value={servings}
              onChange={handleServingsChange} // 🔴 Added handler
              required
              maxLength={10}
              className={getInputClassName("servings")}
              aria-invalid={!!fieldErrors.servings}
            />
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