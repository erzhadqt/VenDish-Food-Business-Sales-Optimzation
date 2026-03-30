import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

export default function ManageGcashInfoDialog({ open, onOpenChange }) {
  const [accountName, setAccountName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [savedMessage, setSavedMessage] = useState(false);

  // Load existing values when modal opens
  useEffect(() => {
    if (open) {
      setAccountName(localStorage.getItem("GCASH_ACCOUNT_NAME") || "KUYA VINCE KARINDERYA");
      setAccountNumber(localStorage.getItem("GCASH_ACCOUNT_NUMBER") || "+63 912-345-XXXX");
      setSavedMessage(false);
    }
  }, [open]);

  const handleSave = () => {
    localStorage.setItem("GCASH_ACCOUNT_NAME", accountName.trim());
    localStorage.setItem("GCASH_ACCOUNT_NUMBER", accountNumber.trim());
    
    setSavedMessage(true);
    setTimeout(() => {
      setSavedMessage(false);
      onOpenChange(false);
    }, 1500);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>GCash Fallback Information</DialogTitle>
          <DialogDescription>
            This information will be displayed on the POS GCash Payment Modal if the QR code fails to scan.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="accountName" className="font-semibold text-gray-700">Account Name</Label>
            <Input
              id="accountName"
              placeholder="e.g. KUYA VINCE KARINDERYA"
              value={accountName}
              onChange={(e) => setAccountName(e.target.value.toUpperCase())}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="accountNumber" className="font-semibold text-gray-700">Account Number</Label>
            <Input
              id="accountNumber"
              placeholder="e.g. 0912-345-6789"
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value)}
              className="font-mono text-lg"
            />
          </div>
        </div>

        <DialogFooter className="sm:justify-between items-center w-full mt-4 border-t pt-4">
          {savedMessage ? (
            <span className="text-green-600 font-bold text-sm">Saved Successfully!</span>
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