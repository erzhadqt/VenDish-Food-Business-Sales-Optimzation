import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { AlertCircle, CheckCircle2, PhilippinePeso, Wallet, PlusCircle, MinusCircle, Edit3 } from "lucide-react"; 
import api from "../api"; 

export default function ManagePosBalanceDialog({ open, onOpenChange }) {
  const [amount, setAmount] = useState("");
  const [currentBalance, setCurrentBalance] = useState(0); 
  const [action, setAction] = useState("set"); // 'set', 'add', 'deduct'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  const resetForm = () => {
    setAmount("");
    setError("");
    setSuccess("");
    setAction("set");
    setFieldErrors({});
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  // Fetch the current balance whenever the modal opens
  useEffect(() => {
    if (open) {
      api.get(`/settings/?t=${new Date().getTime()}`)
        .then((res) => {
          if (res.data && res.data.pos_cash_balance !== undefined) {
            const fetchedBalance = parseFloat(res.data.pos_cash_balance) || 0;
            setCurrentBalance(fetchedBalance);
            // Only pre-fill the input if we are in 'set' mode
            if (action === "set") {
              setAmount(fetchedBalance.toString());
            }
          }
        })
        .catch((err) => console.error("Failed to fetch current balance:", err));
    } else {
      setCurrentBalance(0);
      resetForm();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Handle switching between Set, Add, and Deduct modes
  const handleActionChange = (newAction) => {
    setAction(newAction);
    setError("");
    setFieldErrors({});
    // If switching back to set, pre-fill current. Otherwise, clear input to prevent accidental huge adds
    if (newAction === "set") {
      setAmount(currentBalance.toString());
    } else {
      setAmount("");
    }
  };

  // Strict sanitization for Balance Input (Allows numbers and decimals)
  const handleAmountChange = (e) => {
    let val = e.target.value.replace(/[^0-9.]/g, '');
    const parts = val.split('.');
    if (parts.length > 2) {
      val = parts[0] + '.' + parts.slice(1).join('');
    }
    setAmount(val);
    setFieldErrors((prev) => {
      if (!prev.amount) return prev;
      const next = { ...prev };
      delete next.amount;
      return next;
    });
  };

  // Dynamically calculate what the final balance will be
  const getCalculatedBalance = () => {
    const inputNum = parseFloat(amount) || 0;
    if (action === "set") return inputNum;
    if (action === "add") return currentBalance + inputNum;
    if (action === "deduct") return currentBalance - inputNum;
    return 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setFieldErrors({});

    if (amount === "" || isNaN(amount)) {
      setFieldErrors({ amount: "Amount must not be blank and must be a valid number." });
      setError("Please enter a valid amount.");
      return;
    }

    const finalBalance = getCalculatedBalance();

    if (finalBalance < 0) {
      setFieldErrors({ amount: "This deduction would make the drawer balance negative." });
      setError("Cannot deduct this amount. Drawer balance cannot be negative.");
      return;
    }

    setLoading(true);
    try {
      const response = await api.post("/settings/", {
        pos_cash_balance: finalBalance,
      });

      // Verify the response actually came from our POST handler
      if (response.data.message === "Settings updated successfully.") {
        setCurrentBalance(finalBalance); 
        
        const successActions = {
          set: "updated",
          add: "increased",
          deduct: "deducted"
        };
        setSuccess(`POS Initial Balance successfully ${successActions[action]}!`);
        
        // Reset input immediately if adding/deducting for rapid operations
        if (action !== "set") setAmount("");

        setTimeout(() => {
          handleClose();
        }, 1500);
      } else {
        setError("Failed to update: Server ignored the payload.");
      }

    } catch (error) {
      console.error("Error updating balance:", error);
      setError(error.response?.data?.error || "Failed to update balance. Admin rights required.");
    } finally {
      setLoading(false);
    }
  };

  const topErrorItems = Object.values(fieldErrors);

  const calculatedBalance = getCalculatedBalance();

  return (
    <Dialog open={open} onOpenChange={(val) => { if (!val) handleClose(); }}>
      <DialogContent className="sm:max-w-md z-50">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PhilippinePeso size={20} className="text-green-600" /> Manage POS Drawer
          </DialogTitle>
          <DialogDescription>
            Set, add to, or deduct from the POS drawer starting balance.
          </DialogDescription>
        </DialogHeader>

        {/* --- CURRENT BALANCE DISPLAY --- */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 flex items-center justify-between mt-2">
          <div className="flex items-center gap-2 text-gray-600">
            <Wallet size={18} />
            <span className="text-sm font-medium">Current Drawer Balance</span>
          </div>
          <span className="text-lg font-bold text-gray-900">
            ₱{currentBalance.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-md flex items-center gap-2 border border-red-200 text-sm mt-2">
            <AlertCircle size={16} className="shrink-0" />
            <div className="space-y-1">
              <p>{error}</p>
              {topErrorItems.length > 0 && (
                <ul className="list-disc pl-4">
                  {topErrorItems.slice(0, 3).map((item, index) => (
                    <li key={`${item}-${index}`}>{item}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
        {success && (
          <div className="bg-green-50 text-green-700 p-3 rounded-md flex items-center gap-2 border border-green-200 text-sm mt-2">
            <CheckCircle2 size={16} className="shrink-0" />
            <p>{success}</p>
          </div>
        )}

        <form noValidate onSubmit={handleSubmit} className="grid gap-4 py-2">
          
          {/* Action Segmented Control */}
          <div className="flex bg-gray-100 p-1 rounded-lg">
            <button
              type="button"
              className={`flex-1 py-2 text-sm font-medium rounded-md flex justify-center items-center gap-2 transition-all ${action === 'set' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
              onClick={() => handleActionChange('set')}
            >
              <Edit3 size={16} /> Set
            </button>
            <button
              type="button"
              className={`flex-1 py-2 text-sm font-medium rounded-md flex justify-center items-center gap-2 transition-all ${action === 'add' ? 'bg-white shadow-sm text-green-700' : 'text-gray-500 hover:text-gray-700'}`}
              onClick={() => handleActionChange('add')}
            >
              <PlusCircle size={16} /> Add
            </button>
            <button
              type="button"
              className={`flex-1 py-2 text-sm font-medium rounded-md flex justify-center items-center gap-2 transition-all ${action === 'deduct' ? 'bg-white shadow-sm text-red-700' : 'text-gray-500 hover:text-gray-700'}`}
              onClick={() => handleActionChange('deduct')}
            >
              <MinusCircle size={16} /> Deduct
            </button>
          </div>

          <div className="space-y-2">
            <Label htmlFor="balanceAmount">
              {action === 'set' && "Set New Drawer Amount"}
              {action === 'add' && "Amount to Add to Drawer"}
              {action === 'deduct' && "Amount to Deduct from Drawer"}
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-gray-500 font-bold">₱</span>
              <Input 
                id="balanceAmount"
                type="text"
                inputMode="decimal"
                placeholder="0.00" 
                value={amount} 
                onChange={handleAmountChange} 
                required
                className={`pl-8 font-semibold text-gray-800 ${
                  fieldErrors.amount ? 'border-red-500 focus-visible:ring-red-500' :
                  action === 'add' ? 'border-green-300 focus-visible:ring-green-400' : 
                  action === 'deduct' ? 'border-red-300 focus-visible:ring-red-400' : ''
                }`}
                autoFocus
                aria-invalid={!!fieldErrors.amount}
                maxLength={13}
              />
            </div>

            {/* Real-time Calculation Projection */}
            {amount && !isNaN(amount) && action !== 'set' && (
              <div className="flex justify-between items-center text-sm px-1 pt-1">
                <span className="text-gray-500">Expected Final Balance:</span>
                <span className={`font-semibold ${calculatedBalance < 0 ? 'text-red-500' : 'text-gray-900'}`}>
                  ₱{calculatedBalance.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            )}
          </div>

          <DialogFooter className="mt-4">
            <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={loading || amount === "" || calculatedBalance < 0}
              className={action === 'add' ? 'bg-green-600 hover:bg-green-700' : action === 'deduct' ? 'bg-red-600 hover:bg-red-700' : ''}
            >
              {loading ? "Saving..." : "Save Transaction"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}