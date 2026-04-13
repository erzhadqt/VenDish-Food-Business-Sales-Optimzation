import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { AlertCircle, CheckCircle2, ReceiptText } from "lucide-react";
import api from "../api";
import {
  DEFAULT_TIN_NUMBER,
  formatTinNumber,
  isValidTinNumber,
  normalizeTinNumber,
} from "../utils/tinNumber";

export default function ManageTinNumberDialog({ open, onOpenChange }) {
  const [tinNumber, setTinNumber] = useState(DEFAULT_TIN_NUMBER);
  const [currentTinNumber, setCurrentTinNumber] = useState(DEFAULT_TIN_NUMBER);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  const resetForm = () => {
    setTinNumber(DEFAULT_TIN_NUMBER);
    setError("");
    setSuccess("");
    setFieldErrors({});
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  useEffect(() => {
    let isActive = true;

    const fetchTinNumber = async () => {
      try {
        const res = await api.get(`/settings/?t=${Date.now()}`);
        const normalizedTin = normalizeTinNumber(res.data?.tin_number);
        if (!isActive) return;

        setCurrentTinNumber(normalizedTin);
        setTinNumber(normalizedTin);
      } catch (requestError) {
        console.error("Failed to fetch TIN number:", requestError);
        if (!isActive) return;

        setCurrentTinNumber(DEFAULT_TIN_NUMBER);
        setTinNumber(DEFAULT_TIN_NUMBER);
      }
    };

    if (open) {
      setError("");
      setSuccess("");
      setFieldErrors({});
      fetchTinNumber();
    } else {
      setCurrentTinNumber(DEFAULT_TIN_NUMBER);
      resetForm();
    }

    return () => {
      isActive = false;
    };
  }, [open]);

  const handleTinChange = (e) => {
    const formatted = formatTinNumber(e.target.value);
    setTinNumber(formatted);

    setFieldErrors((prev) => {
      if (!prev.tinNumber) return prev;
      const next = { ...prev };
      delete next.tinNumber;
      return next;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setFieldErrors({});

    const formattedTin = tinNumber.trim();
    const nextFieldErrors = {};

    if (!formattedTin) {
      nextFieldErrors.tinNumber = "TIN number must not be blank.";
    } else if (!isValidTinNumber(formattedTin)) {
      nextFieldErrors.tinNumber = "TIN must follow the format 000-000-000-000.";
    }

    if (Object.keys(nextFieldErrors).length > 0) {
      setFieldErrors(nextFieldErrors);
      setError("Please review the highlighted TIN format issue before saving.");
      return;
    }

    setLoading(true);
    try {
      const response = await api.post("/settings/", {
        tin_number: formattedTin,
      });

      const savedTin = normalizeTinNumber(response.data?.tin_number, formattedTin);
      setCurrentTinNumber(savedTin);
      setTinNumber(savedTin);
      setSuccess("Receipt TIN number updated successfully.");

      setTimeout(() => {
        handleClose();
      }, 1500);
    } catch (requestError) {
      console.error("Error updating TIN number:", requestError);
      const apiPayload = requestError?.response?.data;

      if (apiPayload?.field_errors?.tin_number) {
        setFieldErrors({ tinNumber: apiPayload.field_errors.tin_number });
      }

      setError(apiPayload?.error || "Failed to update TIN number. Admin rights required.");
    } finally {
      setLoading(false);
    }
  };

  const topErrorItems = Object.values(fieldErrors);

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { if (!nextOpen) handleClose(); }}>
      <DialogContent className="sm:max-w-md z-50">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ReceiptText size={20} className="text-blue-600" /> Manage Receipt TIN
          </DialogTitle>
          <DialogDescription>
            Update the TIN printed on POS receipts. Format must be strict: 000-000-000-000.
          </DialogDescription>
        </DialogHeader>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center justify-between mt-2">
          <div className="flex items-center gap-2 text-blue-900">
            <ReceiptText size={18} />
            <span className="text-sm font-medium">Current Receipt TIN</span>
          </div>
          <span className="text-base font-bold text-blue-900 font-mono tracking-wide">
            {currentTinNumber}
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
          <div className="space-y-2">
            <Label htmlFor="tinNumber">TIN Number</Label>
            <Input
              id="tinNumber"
              type="text"
              inputMode="numeric"
              placeholder="000-000-000-000"
              value={tinNumber}
              onChange={handleTinChange}
              required
              maxLength={15}
              autoFocus
              aria-invalid={!!fieldErrors.tinNumber}
              className={`font-mono tracking-wide ${fieldErrors.tinNumber ? "border-red-500 focus-visible:ring-red-500" : ""}`}
            />
            <p className="text-xs text-gray-500">Use 12 digits with hyphens: 000-000-000-000.</p>
          </div>

          <DialogFooter className="mt-4">
            <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !isValidTinNumber(tinNumber)}>
              {loading ? "Saving..." : "Save TIN"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
