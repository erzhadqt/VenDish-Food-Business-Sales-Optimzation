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

export default function AddProductDialog({ onSaved, children, existingProducts = [], categories = [] }) {
  const [open, setOpen] = useState(false);
  const [productName, setProductName] = useState("");
  const [category, setCategory] = useState("");
  const [price, setPrice] = useState("");
  const [servings, setServings] = useState("0");
  
  const [loading, setLoading] = useState(false);
  const [image, setImage] = useState(null);
  const [error, setError] = useState("");

  const handleOpenChange = (val) => {
    setOpen(val);
    if (!val) setError("");
  };

  // 🔴 NEW: Strict sanitization for Price
  const handlePriceChange = (e) => {
    // 1. Strip out all alphabets and symbols except numbers and decimals
    let val = e.target.value.replace(/[^0-9.]/g, '');
    
    // 2. Prevent the user from typing multiple decimal points (e.g., "12.50.5")
    const parts = val.split('.');
    if (parts.length > 2) {
      val = parts[0] + '.' + parts.slice(1).join('');
    }
    
    setPrice(val);
  };

  // 🔴 NEW: Strict sanitization for Servings
  const handleServingsChange = (e) => {
    // 1. Strip out everything except pure numbers (removes letters and decimals)
    let val = e.target.value.replace(/[^0-9]/g, '');
    setServings(val);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const isDuplicate = existingProducts.some(
      (p) => p.product_name.toLowerCase() === productName.trim().toLowerCase()
    );

    if (isDuplicate) {
      setError("A product with this name already exists.");
      setLoading(false); 
      return; 
    }

    try {
      const formData = new FormData();
      formData.append("product_name", productName);
      
      formData.append("category", category); 
      formData.append("price", parseFloat(price || "0"));

      const parsedServings = parseInt(servings || "0", 10);
      const servingCount = Number.isFinite(parsedServings) ? Math.max(0, parsedServings) : 0;

      formData.append("is_available", String(servingCount > 0));
      formData.append("track_stock", "true");
      formData.append("stock_quantity", servingCount);
      
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
      setServings("0");
      setImage(null);
      setError("");
    } catch (err) {
      console.error("Failed to add product:", err.response?.data || err);
      setLoading(false);
      setError(err.response?.data?.message || "Failed to add product. Please try again.");
    }
  };

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
            {error}
          </div>
        )}

        <form className="grid gap-4" onSubmit={handleSubmit}>
          {/* Product Name Input */}
          <div className="grid gap-2">
            <Label htmlFor="product-name">Product Name</Label>
            <Input
              id="product-name"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              required
              className={error.includes("name") ? "border-red-500 focus-visible:ring-red-500" : ""}
              maxLength={20}
            />
          </div>

          {/* Category Input */}
          <div className="grid gap-2">
            <Label htmlFor="category">Category</Label>
            <select
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              required
              className="px-3 py-2 border rounded-md"
            >
              <option value="" disabled>Select category</option>
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
                type="text"           // 🔴 Changed to text for regex control
                inputMode="decimal"   // 🔴 Shows numeric keyboard with decimals on mobile
                value={price}
                onChange={handlePriceChange}
                placeholder="0.00"
                required
              />
          </div>

          {/* Servings Input */}
          <div className="grid gap-2">
            <Label htmlFor="servings">Servings Available</Label>
            <Input
              id="servings"
              type="text"           // 🔴 Changed to text for regex control
              inputMode="numeric"   // 🔴 Shows integer numeric keyboard on mobile
              value={servings}
              onChange={handleServingsChange}
              required
            />
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