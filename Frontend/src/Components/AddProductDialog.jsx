import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle } from "lucide-react"; 
import api from "../api";

export default function AddProductDialog({ onSaved, children, existingProducts = [] }) {
  const [open, setOpen] = useState(false);
  const [productName, setProductName] = useState("");
  const [category, setCategory] = useState("");
  const [price, setPrice] = useState("");
  
  // NEW: State for Stock Quantity
  const [stockQuantity, setStockQuantity] = useState(0);

  const [trackStock, setTrackStock] = useState(false); // Default false
  
  const [isAvailable, setIsAvailable] = useState(true);
  const [loading, setLoading] = useState(false);
  const [image, setImage] = useState(null);
  const [error, setError] = useState("");

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

  const handleOpenChange = (val) => {
    setOpen(val);
    if (!val) setError("");
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
      formData.append("price", parseFloat(price));

      formData.append("track_stock", trackStock);
      
      // NEW: Append stock quantity
      formData.append("stock_quantity", parseInt(stockQuantity) || 0);

      formData.append("is_available", isAvailable); 
      
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
      setStockQuantity(0); // Reset Stock
      setIsAvailable(true);
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

      {open && (
        <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm" aria-hidden="true" />
      )}

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
              {categories.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
                <input 
                    type="checkbox" 
                    id="trackStock"
                    checked={trackStock}
                    onChange={(e) => setTrackStock(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded"
                />
                <Label htmlFor="trackStock" className="font-semibold">Track Stock Quantity?</Label>
            </div>

            {trackStock ? (
                // OPTION A: Show Quantity Input
                <div className="animate-in slide-in-from-top-2">
                    <Label>Stock Quantity</Label>
                    <Input 
                        type="number" 
                        value={stockQuantity} 
                        onChange={e => setStockQuantity(e.target.value)} 
                    />
                </div>
            ) : (
                // OPTION B: Show Simple Availability Toggle
                <div className="animate-in slide-in-from-top-2 flex items-center gap-2">
                    <input 
                        type="checkbox" 
                        id="avail"
                        checked={isAvailable}
                        onChange={(e) => setIsAvailable(e.target.checked)}
                        className="w-4 h-4 text-green-600 rounded"
                    />
                    <Label htmlFor="avail">Product is Available</Label>
                </div>
            )}

          <div className="grid grid-cols-2 gap-4">
             {/* Price Input */}
            <div className="grid gap-2">
                <Label htmlFor="price">Price (₱)</Label>
                <Input
                id="price"
                type="number"
                step="0.01"
                min="0"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                required
                />
            </div>

            {/* NEW: Stock Quantity Input */}
            <div className="grid gap-2">
                <Label htmlFor="stock">Stock Quantity</Label>
                <Input
                id="stock"
                type="number"
                min="0"
                value={stockQuantity}
                onChange={(e) => setStockQuantity(e.target.value)}
                required
                />
            </div>
          </div>

          {/* Availability Checkbox */}
          <div className="flex items-center gap-3 p-2 border rounded-md bg-gray-50">
            <input
              id="is_available"
              type="checkbox"
              checked={isAvailable}
              onChange={(e) => setIsAvailable(e.target.checked)}
              className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500 border-gray-300"
            />
            <Label htmlFor="is_available" className="cursor-pointer font-medium text-gray-700">
              Mark as Available (Manual Override)
            </Label>
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