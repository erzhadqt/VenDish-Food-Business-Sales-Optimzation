import React, { useState, useEffect } from "react";
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
import { RefreshCw } from "lucide-react"; // Icon for generator
import api from "../api"; // Your API instance

export default function AddDiscountDialog({ onSaved, children }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState([]); // Store list of products for dropdown

  // Form States
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [rate, setRate] = useState("");
  const [selectedProduct, setSelectedProduct] = useState("");
  const [expiration, setExpiration] = useState("");

  // 1. Fetch Products when dialog opens
  // We need this so the user can select which product the coupon applies to
  useEffect(() => {
    if (open) {
      const fetchProducts = async () => {
        try {
          // Adjust URL to match your actual product endpoint
          const res = await api.get("/firstapp/products/"); 
          setProducts(res.data); 
        } catch (err) {
          console.error("Failed to load products", err);
        }
      };
      fetchProducts();
    }
  }, [open]);

  // 2. Random Code Generator Logic
  const generateRandomCode = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let result = "";
    // Generate 8 character code
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setCode(result);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        name: name,
        code: code,
        rate: parseFloat(rate),
        product: selectedProduct, // This sends the Product ID
        expiration: expiration, // Send datetime string
        active: true,
      };

      // Assuming your router is set to /api/coupons/
      await api.post("/firstapp/coupons/", payload);

      // Success
      setLoading(false);
      setOpen(false);
      
      // Reset Form
      setName("");
      setCode("");
      setRate("");
      setSelectedProduct("");
      setExpiration("");
      
      // Refresh parent list
      if (onSaved) onSaved();

    } catch (err) {
      console.error("Failed to add coupon:", err.response?.data || err);
      setLoading(false);
      alert("Failed to add coupon. check console for details.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>

      {/* Blurred Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
          aria-hidden="true"
        />
      )}

      <DialogContent className="sm:max-w-md z-50">
        <DialogHeader>
          <DialogTitle>Create New Discount</DialogTitle>
          <DialogDescription>
            Generate a code and link it to a product.
          </DialogDescription>
        </DialogHeader>

        <form className="grid gap-4" onSubmit={handleSubmit}>
          
          {/* 1. Coupon Name */}
          <div className="grid gap-2">
            <Label htmlFor="name">Campaign Name</Label>
            <Input
              id="name"
              placeholder="e.g. Summer Sale"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          {/* 2. Code Generator */}
          <div className="grid gap-2">
            <Label htmlFor="code">Coupon Code</Label>
            <div className="flex gap-2">
              <Input
                id="code"
                placeholder="Click Generate →" 
                value={code}
                readOnly // User cannot type
                required
                // Visual styling to look 'locked'
                className="uppercase font-mono bg-gray-100 text-gray-500 cursor-not-allowed focus-visible:ring-0" 
              />
              <Button 
                type="button" 
                variant="secondary" 
                onClick={generateRandomCode}
                title="Generate Random Code"
                className="whitespace-nowrap"
              >
                <RefreshCw size={16} className="mr-2" /> Generate
              </Button>
            </div>
          </div>

          {/* 3. Discount Rate */}
          <div className="grid gap-2">
            <Label htmlFor="rate">Discount Amount ($)</Label>
            <Input
              id="rate"
              type="number"
              step="0.01"
              placeholder="0.00"
              value={rate}
              onChange={(e) => setRate(e.target.value)}
              required
            />
          </div>

          {/* 4. Product Selection */}
          <div className="grid gap-2">
            <Label htmlFor="product">Apply to Product</Label>
            <select
              id="product"
              value={selectedProduct}
              onChange={(e) => setSelectedProduct(e.target.value)}
              required
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="" disabled>Select a product...</option>
              {products.map((p) => (
                // Assuming your product object has 'id' and 'product_name'
                <option key={p.id} value={p.id}>
                  {p.product_name || p.name} 
                </option>
              ))}
            </select>
          </div>

          {/* 5. Expiration Date */}
          <div className="grid gap-2">
            <Label htmlFor="expiration">Expiration Date</Label>
            <Input
              id="expiration"
              type="datetime-local"
              value={expiration}
              onChange={(e) => setExpiration(e.target.value)}
              required
            />
          </div>

          <DialogFooter className="flex justify-end gap-2 mt-4">
            <DialogClose asChild>
              <Button type="button" variant="outline">Cancel</Button>
            </DialogClose>
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create Coupon"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}