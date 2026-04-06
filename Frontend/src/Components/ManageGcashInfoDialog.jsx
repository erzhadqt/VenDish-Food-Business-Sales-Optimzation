import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Smartphone } from "lucide-react"; // Added an icon for the preview

export default function ManageGcashInfoDialog({ open, onOpenChange }) {
  const [accountName, setAccountName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  
  // States to hold the currently saved values for the preview
  const [currentAccountName, setCurrentAccountName] = useState("");
  const [currentAccountNumber, setCurrentAccountNumber] = useState("");
  
  const [savedMessage, setSavedMessage] = useState(false);

  // Load existing values when modal opens
  useEffect(() => {
    if (open) {
      const savedName = localStorage.getItem("GCASH_ACCOUNT_NAME") || "KUYA VINCE KARINDERYA";
      const savedNumber = localStorage.getItem("GCASH_ACCOUNT_NUMBER") || "+63 912-345-XXXX";
      
      setAccountName(savedName);
      setAccountNumber(savedNumber);
      
      // Set the read-only preview values
      setCurrentAccountName(savedName);
      setCurrentAccountNumber(savedNumber);
      
      setSavedMessage(false);
    } else {
      // Clean up when closed
      setCurrentAccountName("");
      setCurrentAccountNumber("");
    }
  }, [open]);

  const handleSave = () => {
    const trimmedName = accountName.trim();
    const trimmedNumber = accountNumber.trim();

    localStorage.setItem("GCASH_ACCOUNT_NAME", trimmedName);
    localStorage.setItem("GCASH_ACCOUNT_NUMBER", trimmedNumber);
    
    // Immediately update the preview to reflect the new saved data
    setCurrentAccountName(trimmedName);
    setCurrentAccountNumber(trimmedNumber);

    setSavedMessage(true);
    setTimeout(() => {
      setSavedMessage(false);
      onOpenChange(false);
    }, 1500);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md z-50">
        <DialogHeader>
          <DialogTitle>GCash Fallback Information</DialogTitle>
          <DialogDescription>
            This information will be displayed on the POS GCash Payment Modal if the QR code fails to scan.
          </DialogDescription>
        </DialogHeader>

        {/* --- CURRENT INFO PREVIEW --- */}
        {currentAccountName && currentAccountNumber && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-2">
            <div className="flex items-center gap-2 text-blue-800 mb-3 border-b border-blue-200 pb-2">
              <Smartphone size={18} />
              <span className="text-sm font-bold">Currently Active Info</span>
            </div>
            <div className="flex flex-col gap-1 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-gray-600 font-medium">Account Name:</span>
                <span className="font-bold text-gray-900">{currentAccountName}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600 font-medium">Account Number:</span>
                <span className="font-mono font-bold text-gray-900">{currentAccountNumber}</span>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="accountName" className="font-semibold text-gray-700">Set New Account Name</Label>
            <Input
              id="accountName"
              placeholder="e.g. KUYA VINCE KARINDERYA"
              value={accountName}
              onChange={(e) => setAccountName(e.target.value.toUpperCase())}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="accountNumber" className="font-semibold text-gray-700">Set New Account Number</Label>
            <Input
              id="accountNumber"
              placeholder="e.g. 0912-345-6789"
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value)}
              className="font-mono text-lg"
            />
          </div>
        </div>

        <DialogFooter className="sm:justify-between items-center w-full mt-2 border-t pt-4">
          {savedMessage ? (
            <span className="text-green-600 font-bold text-sm bg-green-50 px-3 py-1 rounded-full border border-green-200">
              Saved Successfully!
            </span>
          ) : (
            <span /> // Spacer
          )}
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={handleSave} className="bg-blue-600 hover:bg-blue-700 text-white">
              Save Changes
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}