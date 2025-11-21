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

export default function EditProductDialog({ product, onClose, onSaved }) {
  const [loading, setLoading] = useState(false);
  const [category, setCategory] = useState(product.category || "");
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

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData();
    const productName = e.target.product_name.value;
    const price = parseFloat(e.target.price.value);
    const stockQuantity = parseInt(e.target.stock_quantity.value, 10);

    formData.append("product_name", productName);
    formData.append("price", price);
    formData.append("category", category);
    formData.append("stock_quantity", stockQuantity);
    if (image) formData.append("image", image);

    try {
      await api.patch(`/firstapp/products/${product.id}/`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      onSaved();
      onClose();
    } catch (err) {
      console.error("Update error:", err.response?.data || err);
      alert("Failed to update product. Check the console for details.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      {/* Custom blurred backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
        aria-hidden="true"
        onClick={onClose} // backdrop click closes modal (optional)
      />

      {/* Modal content (above backdrop) */}
      <DialogContent className="sm:max-w-[450px] z-50">
        <DialogHeader>
          <DialogTitle>Edit Product</DialogTitle>
          <DialogDescription>
            Modify the product details and click save.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSave} className="grid gap-4">
          <div className="grid gap-2">
            <Label>Product Name</Label>
            <Input name="product_name" defaultValue={product.product_name} required />
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
              defaultValue={product.price}
              required
            />
          </div>

          <div className="grid gap-2">
            <Label>Stock Quantity</Label>
            <Input
              name="stock_quantity"
              type="number"
              defaultValue={product.stock_quantity}
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
              <Button variant="outline" disabled={loading}>
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
