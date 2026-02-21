import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/Components/ui/dialog";
import { Button } from "../Components/ui/button";
import { Input } from "../Components/ui/input";
import { Label } from "../Components/ui/label";
import { AlertCircle, CheckCircle2 } from "lucide-react"; 
import api from "../api"; 

export default function ChangeVoidPinDialog({ open, onOpenChange }) {
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const resetForm = () => {
    setCurrentPin("");
    setNewPin("");
    setConfirmPin("");
    setError("");
    setSuccess("");
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (newPin !== confirmPin) {
      setError("New PIN and Confirm PIN do not match.");
      return;
    }

    if (newPin.length < 4) {
      setError("New PIN must be at least 4 digits long.");
      return;
    }

    setLoading(true);
    try {
      // NOTE: You will need to create this endpoint in your Django backend
      await api.post("/update-void-pin/", {
        current_pin: currentPin,
        new_pin: newPin
      });

      setSuccess("Void PIN successfully updated!");
      
      // Auto-close after success
      setTimeout(() => {
        handleClose();
      }, 2000);

    } catch (error) {
      console.error("Error updating pin:", error);
      setError(error.response?.data?.error || "Failed to update PIN. Please verify your current PIN.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(val) => { if (!val) handleClose(); }}>
      {/* Blurred Backdrop */}
      {open && <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm" aria-hidden="true" />}

      <DialogContent className="sm:max-w-md z-50">
        <DialogHeader>
          <DialogTitle>Change Void PIN</DialogTitle>
          <DialogDescription>
            Update the PIN required to authorize voided transactions in the POS.
          </DialogDescription>
        </DialogHeader>

        {/* Feedback Messages */}
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
            <Label htmlFor="currentPin">Current PIN</Label>
            <Input 
              id="currentPin"
              type="password"
              placeholder="Enter current PIN" 
              value={currentPin} 
              onChange={(e) => setCurrentPin(e.target.value)} 
              required
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="newPin">New PIN</Label>
            <Input 
              id="newPin"
              type="password"
              placeholder="Enter new 4-6 digit PIN" 
              value={newPin} 
              onChange={(e) => setNewPin(e.target.value)} 
              required
              maxLength={6}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPin">Confirm New PIN</Label>
            <Input 
              id="confirmPin"
              type="password"
              placeholder="Re-enter new PIN" 
              value={confirmPin} 
              onChange={(e) => setConfirmPin(e.target.value)} 
              required
              maxLength={6}
            />
          </div>

          <DialogFooter className="mt-4">
            <Button type="button" variant="outline" onClick={handleClose}>Cancel</Button>
            <Button type="submit" disabled={loading || !currentPin || !newPin || !confirmPin}>
              {loading ? "Updating..." : "Update PIN"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}