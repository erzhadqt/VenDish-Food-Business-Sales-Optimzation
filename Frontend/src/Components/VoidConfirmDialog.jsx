import React, { useState, useEffect } from "react";
import { LockKeyhole, AlertTriangle, CheckSquare, Trash2, Square } from "lucide-react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";

const VoidConfirmDialog = ({ onConfirm, trigger, cartItems }) => {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState("auth"); // 'auth' | 'select'
  
  // Auth State
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  
  // Selection State
  const [selectedIds, setSelectedIds] = useState([]);
  const [loading, setLoading] = useState(false);

  // Reset state when dialog opens/closes
  const handleOpenChange = (newOpen) => {
    setOpen(newOpen);
    if (!newOpen) {
      // Reset everything on close
      setTimeout(() => {
        setCode("");
        setError("");
        setStep("auth");
        setSelectedIds([]);
      }, 300); // Slight delay for animation
    } else {
        // Pre-select nothing when opening
        setSelectedIds([]);
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

  const toggleSelection = (itemId) => {
    if (selectedIds.includes(itemId)) {
      setSelectedIds(selectedIds.filter(id => id !== itemId));
    } else {
      setSelectedIds([...selectedIds, itemId]);
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === cartItems.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(cartItems.map(item => item.id));
    }
  };

  const handleVoidConfirm = async () => {
    if (selectedIds.length === 0) {
        setError("Please select at least one item.");
        return;
    }

    try {
      setLoading(true);
      // Pass the selected IDs back to parent
      await onConfirm(selectedIds); 
      setOpen(false);
    } catch (err) {
      console.error("Action failed", err);
      setError("Failed to process void.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogTrigger asChild>
        {trigger}
      </AlertDialogTrigger>
      <AlertDialogContent className="sm:max-w-md">
        
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

        {/* --- STEP 2: SELECT ITEMS --- */}
        {step === "select" && (
           <>
            <AlertDialogHeader>
              <div className="flex items-center gap-2 text-red-600 mb-2">
                <Trash2 size={20} />
                <AlertDialogTitle>Select Items to Void</AlertDialogTitle>
              </div>
              <AlertDialogDescription>
                Select the specific items you want to remove from the cart.
              </AlertDialogDescription>
            </AlertDialogHeader>

            <div className="py-2">
                <div className="flex justify-between items-center mb-2 px-1">
                    <span className="text-xs text-gray-500">{selectedIds.length} items selected</span>
                    <button 
                        onClick={toggleSelectAll} 
                        className="text-xs font-bold text-blue-600 hover:underline"
                    >
                        {selectedIds.length === cartItems.length ? "Deselect All" : "Select All"}
                    </button>
                </div>

                <div className="max-h-[300px] overflow-y-auto border rounded-md bg-gray-50 custom-scrollbar">
                    {cartItems.length === 0 ? (
                        <div className="p-4 text-center text-sm text-gray-400">Cart is empty</div>
                    ) : (
                        cartItems.map((item) => {
                            const isSelected = selectedIds.includes(item.id);
                            return (
                                <div 
                                    key={item.id} 
                                    onClick={() => toggleSelection(item.id)}
                                    className={`flex items-center gap-3 p-3 border-b last:border-0 cursor-pointer transition-colors ${isSelected ? 'bg-red-50' : 'hover:bg-gray-100'}`}
                                >
                                    <div className={`text-gray-400 ${isSelected ? 'text-red-600' : ''}`}>
                                        {isSelected ? <CheckSquare size={18} /> : <Square size={18} />}
                                    </div>
                                    <div className="flex-1">
                                        <div className={`font-medium text-sm ${isSelected ? 'text-red-700' : 'text-gray-700'}`}>
                                            {item.product_name}
                                        </div>
                                        <div className="text-xs text-gray-500">
                                            Qty: {item.qty} × ₱{item.price}
                                        </div>
                                    </div>
                                    <div className="font-bold text-sm">
                                        ₱{(item.qty * item.price).toFixed(2)}
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
                disabled={loading || selectedIds.length === 0}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 text-white
                    ${selectedIds.length === 0 ? 'bg-gray-300 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700'}
                `}
              >
                {loading ? "Processing..." : `Void ${selectedIds.length} Item(s)`}
              </button>
            </AlertDialogFooter>
           </>
        )}

      </AlertDialogContent>
    </AlertDialog>
  );
};

export default VoidConfirmDialog;