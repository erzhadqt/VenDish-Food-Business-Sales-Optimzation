import React, { useState } from "react";
import { LockKeyhole, AlertTriangle, Trash2, Minus } from "lucide-react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "../Components/ui/alert-dialog";
import { Input } from "../Components/ui/input";
import api from "../api";

const VoidConfirmDialog = ({ onConfirm, trigger, cartItems }) => {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState("auth"); // 'auth' | 'select'
  
  // Auth State
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  
  // Selection State: { [productId]: quantityToVoid }
  const [selections, setSelections] = useState({});
  const [loading, setLoading] = useState(false);

  // Reset state when dialog opens/closes
  const handleOpenChange = (newOpen) => {
    setOpen(newOpen);
    if (!newOpen) {
      setTimeout(() => {
        setCode("");
        setError("");
        setStep("auth");
        setSelections({});
      }, 300);
    } else {
      // Initialize with full cart quantities, then subtract to void.
      const initialSelections = {};
      cartItems.forEach((item) => {
        initialSelections[item.id] = item.qty;
      });
      setSelections(initialSelections);
    }
  };

  // 🔴 Strict sanitization for Manager PIN (Numbers only)
  const handlePinChange = (e) => {
    let val = e.target.value.replace(/[^0-9]/g, '');
    setCode(val);
    setError(""); // Clear error when user types
  };

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    if (!code) return;

    try {
      // Ask the backend to verify the PIN
      await api.post("/verify-void-pin/", { pin: code });
      
      // If no error is thrown, the PIN is correct!
      setStep("select");
      setError("");
    } catch (err) {
      console.error("PIN Verification Failed", err);
      setError(err.response?.data?.error || "Invalid Manager PIN");
      setCode("");
    }
  };

  const handleDecrement = (item) => {
    // Subtract from remaining quantity; each press marks one unit as void.
    setSelections((prev) => {
      const currentRemainingQty = prev[item.id] ?? item.qty;
      if (currentRemainingQty > 0) {
        return { ...prev, [item.id]: currentRemainingQty - 1 };
      }
      return prev;
    });
  };

  const toggleSelectAll = () => {
    // If all items are fully voided, reset to original cart quantities.
    // Otherwise, set remaining quantities to 0 (void all).
    const allFullySelected = cartItems.every((item) => (selections[item.id] ?? item.qty) === 0);
    
    if (allFullySelected) {
      const resetSelections = {};
      cartItems.forEach((item) => {
        resetSelections[item.id] = item.qty;
      });
      setSelections(resetSelections);
    } else {
      const newSelections = {};
      cartItems.forEach((item) => {
        newSelections[item.id] = 0;
      });
      setSelections(newSelections);
    }
  };

  const handleVoidConfirm = async () => {
    const itemsToVoid = cartItems
      .map((item) => {
        const remainingQty = selections[item.id] ?? item.qty;
        const voidQty = item.qty - remainingQty;
        return {
          id: item.id,
          qty: voidQty,
        };
      })
      .filter((i) => i.qty > 0);

    if (itemsToVoid.length === 0) {
        setError("Please select quantities to void.");
        return;
    }

    try {
      setLoading(true);
      await onConfirm(itemsToVoid); 
      setOpen(false);
    } catch (err) {
      console.error("Action failed", err);
      setError("Failed to process void.");
    } finally {
      setLoading(false);
    }
  };

  // Calculate total quantities marked for void based on remaining quantities.
  const totalVoidCount = cartItems.reduce((sum, item) => {
    const remainingQty = selections[item.id] ?? item.qty;
    return sum + Math.max(item.qty - remainingQty, 0);
  }, 0);

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogTrigger asChild>
        {trigger}
      </AlertDialogTrigger>

      <AlertDialogContent className="sm:max-w-md z-50">
        
        {/* --- STEP 1: AUTHORIZATION --- */}
        {step === "auth" && (
          <>
            <AlertDialogHeader>
              <div className="flex items-center gap-2 text-red-600 mb-2">
                <AlertTriangle size={20} />
                <AlertDialogTitle>Manager Authorization</AlertDialogTitle>
              </div>
              <AlertDialogDescription>
                Enter Manager PIN to access Void Menu.
              </AlertDialogDescription>
            </AlertDialogHeader>
            
            <div className="flex flex-col gap-4 py-4">
              <div className="relative">
                <LockKeyhole className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
                {/* 🔴 Updated PIN Input Field */}
                <Input
                  type="password"
                  inputMode="numeric"
                  placeholder="Enter PIN Code"
                  className={`pl-9 ${error ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                  value={code}
                  onChange={handlePinChange}
                  onKeyDown={(e) => e.key === 'Enter' && handleAuthSubmit(e)}
                  autoFocus
                  maxLength={6}
                />
              </div>
              {error && <p className="text-sm text-red-500 font-medium ml-1">{error}</p>}
            </div>

            <AlertDialogFooter className="sm:justify-end gap-2">
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <button 
                onClick={handleAuthSubmit}
                className="bg-gray-900 hover:bg-gray-800 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Verify PIN
              </button>
            </AlertDialogFooter>
          </>
        )}

        {/* --- STEP 2: SELECT QUANTITIES --- */}
        {step === "select" && (
           <>
            <AlertDialogHeader>
              <div className="flex items-center gap-2 text-red-600 mb-2">
                <Trash2 size={20} />
                <AlertDialogTitle>Void Items</AlertDialogTitle>
              </div>
              <AlertDialogDescription>
                Quantities start at full count. Press minus to subtract/void items.
              </AlertDialogDescription>
            </AlertDialogHeader>

            <div className="py-2">
                <div className="flex justify-between items-center mb-2 px-1">
                    <span className="text-xs text-gray-500">{totalVoidCount} quantities marked for void</span>
                    <button 
                        onClick={toggleSelectAll} 
                        className="text-xs font-bold text-blue-600 hover:underline"
                    >
                        {totalVoidCount > 0 ? "Reset All" : "Void All"}
                    </button>
                </div>

                <div className="max-h-[300px] overflow-y-auto border rounded-md bg-gray-50 custom-scrollbar">
                    {cartItems.length === 0 ? (
                        <div className="p-4 text-center text-sm text-gray-400">Cart is empty</div>
                    ) : (
                        cartItems.map((item) => {
                        const remainingQty = selections[item.id] ?? item.qty;
                        const voidQty = item.qty - remainingQty;
                        const isFullyVoided = remainingQty === 0;
                            
                            return (
                                <div 
                                    key={item.id} 
                                    className={`flex items-center justify-between p-3 border-b last:border-0 transition-colors ${voidQty > 0 ? 'bg-red-50' : 'hover:bg-gray-100'}`}
                                >
                                    <div className="flex-1">
                                        <div className={`font-medium text-sm ${voidQty > 0 ? 'text-red-700' : 'text-gray-700'}`}>
                                            {item.product_name}
                                        </div>
                                        <div className="text-xs text-gray-500">
                                            In Cart: <span className="font-bold">{item.qty}</span>
                                        </div>
                              <div className="text-xs text-gray-500">
                                Remaining: <span className="font-bold">{remainingQty}</span>
                                {voidQty > 0 && (
                                  <span className="ml-2 text-red-600 font-semibold">Voiding: {voidQty}</span>
                                )}
                              </div>
                                    </div>

                                    {/* Quantity Controls */}
                                    <div className="flex items-center gap-3 bg-white rounded-md border border-gray-200 px-2 py-1 shadow-sm">
                                        <button 
                                            onClick={() => handleDecrement(item)}
                                disabled={remainingQty === 0}
                                className={`p-1 rounded hover:bg-gray-100 ${remainingQty === 0 ? 'text-gray-300' : 'text-gray-600'}`}
                                        >
                                            <Minus size={16} />
                                        </button>
                                        
                              <span className={`font-bold text-sm w-6 text-center ${isFullyVoided ? 'text-red-600' : 'text-gray-700'}`}>
                                {remainingQty}
                              </span>
                                    </div>
                                </div>
                            )
                        })
                    )}
                </div>
                {error && <p className="text-sm text-red-500 font-medium mt-2">{error}</p>}
            </div>

            <AlertDialogFooter className="sm:justify-end gap-2">
              <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
              <button 
                onClick={handleVoidConfirm}
                disabled={loading || totalVoidCount === 0}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 text-white
                    ${totalVoidCount === 0 ? 'bg-gray-300 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700'}
                `}
              >
                {loading ? "Processing..." : "Confirm Void"}
              </button>
            </AlertDialogFooter>
           </>
        )}

      </AlertDialogContent>
    </AlertDialog>
  );
};

export default VoidConfirmDialog;