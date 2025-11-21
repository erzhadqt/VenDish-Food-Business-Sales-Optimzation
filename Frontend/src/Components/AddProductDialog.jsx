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
import api from "../api";

export default function AddProductDialog({ onSaved, children }) {
  const [open, setOpen] = useState(false); // control dialog open state
  const [productName, setProductName] = useState("");
  const [category, setCategory] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("");
  const [loading, setLoading] = useState(false);
  const [image, setImage] = useState(null);

  const categories = [
    { value: "chicken", label: "Chicken" },
    { value: "beef", label: "Beef" },
    { value: "fish", label: "Fish" },
    { value: "vegetables", label: "Vegetables" },
    { value: "combo_meal", label: "Combo Meal" },
    { value: "value_meal", label: "Value Meal" },
    { value: "add_on", label: "Add-on" },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("product_name", productName);
      formData.append("category", category);
      formData.append("price", parseFloat(price));
      formData.append("stock_quantity", parseInt(stock, 10));
      if (image) formData.append("image", image);

      await api.post("/firstapp/products/", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      // success
      setLoading(false);
      setOpen(false);
      onSaved();

      setProductName("");
      setCategory("");
      setPrice("");
      setStock("");
      setImage(null);
    } catch (err) {
      console.error("Failed to add product:", err.response?.data || err);
      setLoading(false);
      alert("Failed to add product. Please try again.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(val) => setOpen(val)}>
      <DialogTrigger asChild>{children}</DialogTrigger>

      {/* Custom blurred backdrop: appears only when `open` is true */}
      {open && (
        <div
          // note: z-40 so DialogContent (z-50) sits above it
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
          aria-hidden="true"
        />
      )}

      {/* DialogContent will be rendered by shadcn; ensure it has higher z-index */}
      <DialogContent className="sm:max-w-md z-50">
        <DialogHeader>
          <DialogTitle>Add New Product</DialogTitle>
          <DialogDescription>
            Fill in the details below and click save.
          </DialogDescription>
        </DialogHeader>

        <form className="grid gap-4" onSubmit={handleSubmit}>
          <div className="grid gap-2">
            <Label htmlFor="product-name">Product Name</Label>
            <Input
              id="product-name"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              required
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="category">Category</Label>
            <select
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
            <Label htmlFor="price">Price</Label>
            <Input
              id="price"
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              required
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="stock">Stock Quantity</Label>
            <Input
              id="stock"
              type="number"
              value={stock}
              onChange={(e) => setStock(e.target.value)}
              required
            />
          </div>

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
