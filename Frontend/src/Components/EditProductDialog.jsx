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

// 🔴 ADDED `categories = []` to the props here
export default function EditProductDialog({ product, onClose, onSaved, categories = [] }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Controlled states for inputs to enforce limits
  const [productName, setProductName] = useState(product?.product_name || "");
  const [price, setPrice] = useState(product?.price || "");
  const [category, setCategory] = useState(product?.category || "");
  const [servings, setServings] = useState(String(product?.stock_quantity ?? 0));
  const [image, setImage] = useState(null);

  // 🔴 REMOVED THE HARDCODED CATEGORIES ARRAY FROM HERE

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData();
    
    formData.append("product_name", productName);
    formData.append("price", parseFloat(price));
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

  // Helper for number inputs to limit length
  const handlePriceChange = (e) => {
    const val = e.target.value;
    if (val.length <= 20) {
      setPrice(val);
    }
  };

  // Wrapper for closing to clear errors
  const handleClose = () => {
    setError(null);
    onClose();
  };

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
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSave} className="grid gap-4">
          <div className="grid gap-2">
            <Label>Product Name</Label>
            <Input 
              name="product_name" 
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              required 
              maxLength={50} // Limit to 50 characters
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="category">Category</Label>
            <select
              name="category"
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              required
              className="px-3 py-2 border rounded-md"
            >
              <option value="" disabled>
                Select category
              </option>
              {/* 🔴 Now mapping over the dynamic categories passed from ProductList */}
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
              type="number"
              step="0.01"
              value={price}
              onChange={handlePriceChange} // Enforce 20 digit limit
              required
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="servings">Servings Available <p className="text-xs text-muted-foreground">(Restock?)</p></Label>
            
            <Input
              id="servings"
              type="number"
              min="0"
              step="1"
              value={servings}
              onChange={(e) => setServings(e.target.value)}
              required
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