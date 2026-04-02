import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { AlertCircle, CheckCircle2, PhilippinePeso } from "lucide-react"; 
import api from "../api"; 

export default function ManagePosBalanceDialog({ open, onOpenChange }) {
  const [balance, setBalance] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const resetForm = () => {
    setError("");
    setSuccess("");
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  // Fetch the current balance whenever the modal opens
  useEffect(() => {
    if (open) {
      api.get("/settings/")
        .then((res) => {
          if (res.data && res.data.pos_cash_balance !== undefined) {
            setBalance(res.data.pos_cash_balance);
          }
        })
        .catch((err) => console.error("Failed to fetch current balance:", err));
    } else {
      setBalance("");
      resetForm();
    }
  }, [open]);

  // Strict sanitization for Balance Input (Allows numbers and decimals)
  const handleBalanceChange = (e) => {
    let val = e.target.value.replace(/[^0-9.]/g, '');
    const parts = val.split('.');
    if (parts.length > 2) {
      val = parts[0] + '.' + parts.slice(1).join('');
    }
    setBalance(val);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (balance === "" || isNaN(balance)) {
      setError("Please enter a valid amount.");
      return;
    }

    setLoading(true);
    try {
      await api.post("/settings/", {
        pos_cash_balance: parseFloat(balance),
      });

      setSuccess("POS Initial Balance successfully updated!");
      
      setTimeout(() => {
        handleClose();
      }, 1500);

    } catch (error) {
      console.error("Error updating balance:", error);
      setError(error.response?.data?.error || "Failed to update balance. Admin rights required.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(val) => { if (!val) handleClose(); }}>
      <DialogContent className="sm:max-w-md z-50">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PhilippinePeso size={20} className="text-green-600" /> POS Initial Balance
          </DialogTitle>
          <DialogDescription>
            Set the starting cash amount for the POS drawer. This balance will automatically update as cash transactions are made.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-md flex items-center gap-2 border border-red-200 text-sm mt-2">
            <AlertCircle size={16} className="shrink-0" />
            <p>{error}</p>
          </div>
        )}
        {success && (
          <div className="bg-green-50 text-green-700 p-3 rounded-md flex items-center gap-2 border border-green-200 text-sm mt-2">
            <CheckCircle2 size={16} className="shrink-0" />
            <p>{success}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="grid gap-4 py-2">
          
          <div className="space-y-2">
            <Label htmlFor="balanceAmount">Drawer Amount</Label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-gray-500 font-bold">₱</span>
              <Input 
                id="balanceAmount"
                type="text"
                inputMode="decimal"
                placeholder="0.00" 
                value={balance} 
                onChange={handleBalanceChange} 
                required
                className="pl-8 font-semibold text-gray-800"
                autoFocus
              />
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || balance === ""}>
              {loading ? "Saving..." : "Save Balance"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}