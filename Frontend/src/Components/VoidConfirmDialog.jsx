// VoidConfirmDialog.jsx
import React, { useState } from "react";
import { LockKeyhole, AlertTriangle } from "lucide-react";
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

const VoidConfirmDialog = ({ onConfirm, trigger }) => {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleConfirmClick = async (e) => {
    e.preventDefault();

    // 1. CHECK PIN
    if (code === "1234") {
      try {
        setLoading(true);
        setError("");
        
        // 2. RUN THE FUNCTION PASSED FROM PARENT (Pos.jsx)
        await onConfirm(); 
        
        // 3. CLOSE DIALOG ON SUCCESS
        setOpen(false);
        setCode("");
      } catch (err) {
        console.error("Action failed", err);
        setError("Failed to process void.");
      } finally {
        setLoading(false);
      }
    } else {
      setError("Invalid Manager PIN");
      setCode("");
    }
  };

  const handleOpenChange = (newOpen) => {
    setOpen(newOpen);
    if (!newOpen) {
      setCode("");
      setError("");
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogTrigger asChild>
        {trigger}
      </AlertDialogTrigger>
      <AlertDialogContent className="sm:max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-2 text-red-600 mb-2">
            <AlertTriangle size={20} />
            <AlertDialogTitle>Manager Authorization</AlertDialogTitle>
          </div>
          <AlertDialogDescription>
            Enter Manager PIN to confirm this action.
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
              autoFocus
            />
          </div>
          {error && <p className="text-sm text-red-500 font-medium ml-1">{error}</p>}
        </div>

        <AlertDialogFooter className="sm:justify-end gap-2">
          <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
          <button 
            onClick={handleConfirmClick}
            disabled={loading}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2"
          >
            {loading ? "Processing..." : "Confirm Void"}
          </button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default VoidConfirmDialog;