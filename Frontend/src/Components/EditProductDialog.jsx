import { useState } from "react";
import api from "../api";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

export default function EditProductDialog({ product, onClose, onSaved }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Controlled states for inputs to enforce limits
  const [productName, setProductName] = useState(product.product_name || "");
  const [price, setPrice] = useState(product.price || "");
  const [category, setCategory] = useState(product.category || "");
  // Initialize availability from the existing product data
  const [isAvailable, setIsAvailable] = useState(product.is_available ?? true);
  const [image, setImage] = useState(null);

  const categories = [
    { value: "chicken", label: "Chicken" },
    { value: "beef", label: "Beef" },
    { value: "fish", label: "Fish" },
    { value: "vegetables", label: "Vegetables" },
    { value: "combo_meal", label: "Combo Meal" },
    { value: "value_meal", label: "Value Meal" },
    { value: "add_on", label: "Add-on" },
    { value: "others", label: "Others" },
  ];

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData();
    
    formData.append("product_name", productName);
    formData.append("price", parseFloat(price));
    formData.append("category", category);
    // Send availability status instead of stock
    formData.append("is_available", isAvailable); 
    
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
      {/* Custom blurred backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
        aria-hidden="true"
        onClick={handleClose} 
      />

      {/* Modal content (above backdrop) */}
      <DialogContent className="sm:max-w-[450px] z-50">
        <DialogHeader>
          <DialogTitle>Edit Product</DialogTitle>
          <DialogDescription>
            Modify the product details and click save.
          </DialogDescription>
        </DialogHeader>

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
              {categories.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
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

          {/* New Availability Toggle */}
          <div className="flex items-center gap-3 p-3 border rounded-md bg-gray-50">
            <input
              id="is_available"
              type="checkbox"
              checked={isAvailable}
              onChange={(e) => setIsAvailable(e.target.checked)}
              className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500 border-gray-300 cursor-pointer"
            />
            <Label htmlFor="is_available" className="cursor-pointer font-medium text-gray-700 select-none">
              Is Product Available?
            </Label>
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
      </DialogContent>
    </Dialog>
  );
}