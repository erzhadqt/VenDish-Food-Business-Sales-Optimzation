import { useState } from "react";
import api from "../api";
import { Button } from "@/components/ui/button";
import { Select } from '@/components/ui/select';
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

    const formData = new FormData(e.target);
    const values = Object.fromEntries(formData.entries());

    try {
      await api.put(`/firstapp/products/${product.id}/`, values);

      onSaved(); // refresh product list
      onClose(); // close dialog
    } catch (err) {
      console.error("Update error:", err);
    }

    setLoading(false);
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>Edit Product</DialogTitle>
          <DialogDescription>
            Modify the product details and click save.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSave} className="grid gap-4">

          <div className="grid gap-2">
            <Label>Product Name</Label>
            <Input
              name="product_name"
              defaultValue={product.product_name}
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
              <option value="" disabled>Select category</option>
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
