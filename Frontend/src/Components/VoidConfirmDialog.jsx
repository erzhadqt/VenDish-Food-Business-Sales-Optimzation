import React, { useState } from "react";
import { LockKeyhole, AlertTriangle, Trash2, Minus, Plus } from "lucide-react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/Components/ui/alert-dialog";
import { Input } from "@/Components/ui/input";

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
        setSelections({});
    }
  };

  const handleAuthSubmit = (e) => {
    e.preventDefault();
    if (code === "1234") {
      setStep("select");
      setError("");
    } else {
      setError("Invalid Manager PIN");
      setCode("");
    }
  };

  const handleIncrement = (item) => {
    setSelections(prev => {
        const currentVoidQty = prev[item.id] || 0;
        if (currentVoidQty < item.qty) {
            return { ...prev, [item.id]: currentVoidQty + 1 };
        }
        return prev;
    });
  };

  const handleDecrement = (item) => {
    setSelections(prev => {
        const currentVoidQty = prev[item.id] || 0;
        if (currentVoidQty > 0) {
            const next = currentVoidQty - 1;
            // If 0, remove key to keep object clean
            if (next === 0) {
                const copy = { ...prev };
                delete copy[item.id];
                return copy;
            }
            return { ...prev, [item.id]: next };
        }
        return prev;
    });
  };

  const toggleSelectAll = () => {
    // If all items are fully selected for voiding, clear selections.
    // Otherwise, select max quantity for all.
    const allFullySelected = cartItems.every(item => (selections[item.id] || 0) === item.qty);
    
    if (allFullySelected) {
      setSelections({});
    } else {
      const newSelections = {};
      cartItems.forEach(item => {
        newSelections[item.id] = item.qty;
      });
      setSelections(newSelections);
    }
  };

  const handleVoidConfirm = async () => {
    // Convert selections object to array of { id, qty }
    const itemsToVoid = Object.entries(selections).map(([idStr, qty]) => ({
        id: parseInt(idStr),
        qty: qty
    })).filter(i => i.qty > 0);

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

  // Calculate total items selected for voiding
  const totalVoidCount = Object.values(selections).reduce((a, b) => a + b, 0);

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogTrigger asChild>
        {trigger}
      </AlertDialogTrigger>

      {open && (
        <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm" aria-hidden="true" />
      )}

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
                <Input
                  type="password"
                  placeholder="Enter PIN Code"
                  className={`pl-9 ${error ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                  value={code}
                  onChange={(e) => {
                    setCode(e.target.value);
                    setError("");
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && handleAuthSubmit(e)}
                  autoFocus
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
                Adjust the quantity to remove for each item.
              </AlertDialogDescription>
            </AlertDialogHeader>

            <div className="py-2">
                <div className="flex justify-between items-center mb-2 px-1">
                    <span className="text-xs text-gray-500">{totalVoidCount} items marked</span>
                    <button 
                        onClick={toggleSelectAll} 
                        className="text-xs font-bold text-blue-600 hover:underline"
                    >
                        {totalVoidCount > 0 ? "Clear All" : "Void All"}
                    </button>
                </div>

                <div className="max-h-[300px] overflow-y-auto border rounded-md bg-gray-50 custom-scrollbar">
                    {cartItems.length === 0 ? (
                        <div className="p-4 text-center text-sm text-gray-400">Cart is empty</div>
                    ) : (
                        cartItems.map((item) => {
                            const voidQty = selections[item.id] || 0;
                            const isFullyVoided = voidQty === item.qty;
                            
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
                                    </div>

                                    {/* Quantity Controls */}
                                    <div className="flex items-center gap-3 bg-white rounded-md border border-gray-200 px-2 py-1 shadow-sm">
                                        <button 
                                            onClick={() => handleDecrement(item)}
                                            disabled={voidQty === 0}
                                            className={`p-1 rounded hover:bg-gray-100 ${voidQty === 0 ? 'text-gray-300' : 'text-gray-600'}`}
                                        >
                                            <Minus size={16} />
                                        </button>
                                        
                                        <span className={`font-bold text-sm w-4 text-center ${voidQty > 0 ? 'text-red-600' : 'text-gray-300'}`}>
                                            {voidQty}
                                        </span>

                                        <button 
                                            onClick={() => handleIncrement(item)}
                                            disabled={voidQty === item.qty}
                                            className={`p-1 rounded hover:bg-gray-100 ${voidQty === item.qty ? 'text-gray-300' : 'text-gray-600'}`}
                                        >
                                            <Plus size={16} />
                                        </button>
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