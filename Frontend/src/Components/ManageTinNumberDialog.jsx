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
import { AlertCircle, CheckCircle2, Phone, ReceiptText } from "lucide-react";
import api from "../api";
import {
  DEFAULT_RECEIPT_PHONE,
  DEFAULT_TIN_NUMBER,
  formatTinNumber,
  isValidReceiptPhone,
  isValidTinNumber,
  normalizeReceiptPhone,
  normalizeTinNumber,
} from "../utils/tinNumber";

export default function ManageTinNumberDialog({ open, onOpenChange }) {
  const [tinNumber, setTinNumber] = useState(DEFAULT_TIN_NUMBER);
  const [currentTinNumber, setCurrentTinNumber] = useState(DEFAULT_TIN_NUMBER);
  const [receiptPhone, setReceiptPhone] = useState(DEFAULT_RECEIPT_PHONE);
  const [currentReceiptPhone, setCurrentReceiptPhone] = useState(DEFAULT_RECEIPT_PHONE);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  const resetForm = () => {
    setTinNumber(DEFAULT_TIN_NUMBER);
    setReceiptPhone(DEFAULT_RECEIPT_PHONE);
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
        const normalizedPhone = normalizeReceiptPhone(res.data?.receipt_phone);
        if (!isActive) return;

        setCurrentTinNumber(normalizedTin);
        setTinNumber(normalizedTin);
        setCurrentReceiptPhone(normalizedPhone);
        setReceiptPhone(normalizedPhone);
      } catch (requestError) {
        console.error("Failed to fetch TIN number:", requestError);
        if (!isActive) return;

        setCurrentTinNumber(DEFAULT_TIN_NUMBER);
        setTinNumber(DEFAULT_TIN_NUMBER);
        setCurrentReceiptPhone(DEFAULT_RECEIPT_PHONE);
        setReceiptPhone(DEFAULT_RECEIPT_PHONE);
      }
    };

    if (open) {
      setError("");
      setSuccess("");
      setFieldErrors({});
      fetchTinNumber();
    } else {
      setCurrentTinNumber(DEFAULT_TIN_NUMBER);
      setCurrentReceiptPhone(DEFAULT_RECEIPT_PHONE);
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

  const handlePhoneChange = (e) => {
    setReceiptPhone(e.target.value);

    setFieldErrors((prev) => {
      if (!prev.receiptPhone) return prev;
      const next = { ...prev };
      delete next.receiptPhone;
      return next;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setFieldErrors({});

    const formattedTin = tinNumber.trim();
    const formattedPhone = receiptPhone.trim();
    const nextFieldErrors = {};

    if (!formattedTin) {
      nextFieldErrors.tinNumber = "TIN number must not be blank.";
    } else if (!isValidTinNumber(formattedTin)) {
      nextFieldErrors.tinNumber = "TIN must follow the format 000-000-000-000.";
    }

    if (!formattedPhone) {
      nextFieldErrors.receiptPhone = "Receipt phone number must not be blank.";
    } else if (!isValidReceiptPhone(formattedPhone)) {
      nextFieldErrors.receiptPhone = "Use a valid phone format (digits, spaces, +, -, parentheses).";
    }

    if (Object.keys(nextFieldErrors).length > 0) {
      setFieldErrors(nextFieldErrors);
      setError("Please review the highlighted fields before saving.");
      return;
    }

    setLoading(true);
    try {
      const response = await api.post("/settings/", {
        tin_number: formattedTin,
        receipt_phone: formattedPhone,
      });

      const savedTin = normalizeTinNumber(response.data?.tin_number, formattedTin);
      const savedPhone = normalizeReceiptPhone(response.data?.receipt_phone, formattedPhone);
      setCurrentTinNumber(savedTin);
      setTinNumber(savedTin);
      setCurrentReceiptPhone(savedPhone);
      setReceiptPhone(savedPhone);
      setSuccess("Receipt TIN and phone number updated successfully.");

      setTimeout(() => {
        handleClose();
      }, 3000);
    } catch (requestError) {
      console.error("Error updating TIN number:", requestError);
      const apiPayload = requestError?.response?.data;

      if (apiPayload?.field_errors?.tin_number) {
        setFieldErrors((prev) => ({ ...prev, tinNumber: apiPayload.field_errors.tin_number }));
      }
      if (apiPayload?.field_errors?.receipt_phone) {
        setFieldErrors((prev) => ({ ...prev, receiptPhone: apiPayload.field_errors.receipt_phone }));
      }

      setError(apiPayload?.error || "Failed to update receipt details. Admin rights required.");
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
            <ReceiptText size={20} className="text-blue-600" /> Manage Receipt Details
          </DialogTitle>
          <DialogDescription>
            Update both TIN and phone number printed on receipts.
          </DialogDescription>
        </DialogHeader>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-2 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-blue-900">
              <ReceiptText size={18} />
              <span className="text-sm font-medium">Current Receipt TIN</span>
            </div>
            <span className="text-base font-bold text-blue-900 font-mono tracking-wide">
              {currentTinNumber}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-blue-900">
              <Phone size={18} />
              <span className="text-sm font-medium">Current Receipt Phone</span>
            </div>
            <span className="text-base font-bold text-blue-900 font-mono tracking-wide">
              {currentReceiptPhone}
            </span>
          </div>
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

          <div className="space-y-2">
            <Label htmlFor="receiptPhone">Receipt Phone Number</Label>
            <Input
              id="receiptPhone"
              type="text"
              placeholder="+63 966 443 1581"
              value={receiptPhone}
              onChange={handlePhoneChange}
              required
              maxLength={25}
              aria-invalid={!!fieldErrors.receiptPhone}
              className={fieldErrors.receiptPhone ? "border-red-500 focus-visible:ring-red-500" : ""}
            />
            <p className="text-xs text-gray-500">Allowed: digits, spaces, +, -, and parentheses.</p>
          </div>

          <DialogFooter className="mt-4">
            <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || !isValidTinNumber(tinNumber) || !isValidReceiptPhone(receiptPhone)}
            >
              {loading ? "Saving..." : "Save Details"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
