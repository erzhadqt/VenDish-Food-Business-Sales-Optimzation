import { useEffect, useState } from "react";
import api from "../api";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function DiscountDialog({ children }) {
  const [open, setOpen] = useState(false);
  const [discount, setDiscount] = useState(null);
  const [percentage, setPercentage] = useState("");
  const [loading, setLoading] = useState(false);

  // Fetch discount when modal opens
  const fetchDiscount = async () => {
    try {
      const response = await api.get("/firstapp/discount/");
      if (response.data && response.data.length > 0) {
        setDiscount(response.data[0]);
        setPercentage(response.data[0].percentage);
      } else {
        setDiscount(null); // no discount yet
        setPercentage("");
      }
    } catch (err) {
      console.error("Failed to fetch discount:", err);
    }
  };

  useEffect(() => {
    if (open) fetchDiscount();
  }, [open]);

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (discount) {
        // Update existing discount
        await api.patch(`/firstapp/discount/${discount.id}/`, {
          percentage: parseFloat(percentage),
        });
      } else {
        // Create new discount
        await api.post("/firstapp/discount/", {
          percentage: parseFloat(percentage),
        });
      }

      fetchDiscount();
      alert("Discount saved successfully!");
    } catch (err) {
      console.error("Save error:", err.response?.data || err);
      alert("Failed to save discount.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!discount) return;

    if (!confirm("Are you sure you want to delete the discount?")) return;

    try {
      await api.delete(`/firstapp/discount/${discount.id}/`);
      setDiscount(null);
      setPercentage("");
      alert("Discount deleted.");
    } catch (err) {
      console.error("Delete error:", err.response?.data || err);
      alert("Failed to delete discount.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>

      {/* Blurred background */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
          aria-hidden="true"
        />
      )}

      <DialogContent className="sm:max-w-md z-50">
        <DialogHeader>
          <DialogTitle>Manage Discount</DialogTitle>
          <DialogDescription>
            View, update, or delete the active discount.
          </DialogDescription>
        </DialogHeader>

        {/* DISPLAY CURRENT DISCOUNT */}
        {discount ? (
          <div className="mb-4 p-3 bg-green-100 text-green-800 rounded-md">
            <p>{discount.name}</p>
            <p>Current Discount: <strong>{discount.rate}%</strong></p>
            
          </div>
        ) : (
          <div className="mb-4 p-3 bg-yellow-100 text-yellow-800 rounded-md">
            No discount is currently active.
          </div>
        )}

        {/* FORM */}
        <form className="grid gap-4" onSubmit={handleSave}>
          <div className="grid gap-2">
            <Label htmlFor="percentage">Discount Percentage</Label>
            <Input
              id="percentage"
              type="number"
              value={discount?.value ?? ""}
              step="0.01"
              min="0"
              max="100"
              onChange={(e) => setDiscount({ ...discount, value: e.target.value })}
              required
            />
          </div>

          <DialogFooter className="flex justify-between items-center">
            {/* DELETE BUTTON */}
            {discount && (
              <Button
                type="button"
                variant="destructive"
                onClick={handleDelete}
              >
                Delete
              </Button>
            )}

            <div className="flex gap-2">
              <DialogClose asChild>
                <Button variant="outline">Close</Button>
              </DialogClose>

              <Button type="submit" disabled={loading}>
                {loading ? "Saving..." : discount ? "Update" : "Create"}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
