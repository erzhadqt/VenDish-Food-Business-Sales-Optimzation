import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, RefreshCw, Wallet } from 'lucide-react';

import api from '../api';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Label } from './ui/label';

const formatCurrency = (value) => {
  const parsed = Number(value || 0);
  const safe = Number.isFinite(parsed) ? parsed : 0;

  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(safe);
};

const toSafeNumber = (value) => {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

const extractErrorMessage = (error) => {
  const detail = error?.response?.data;

  if (typeof detail === 'string' && detail.trim()) {
    return detail;
  }

  if (detail && typeof detail === 'object') {
    if (typeof detail.error === 'string' && detail.error.trim()) {
      return detail.error;
    }

    if (typeof detail.detail === 'string' && detail.detail.trim()) {
      return detail.detail;
    }

    const firstEntry = Object.values(detail)[0];
    if (Array.isArray(firstEntry) && firstEntry.length > 0) {
      return String(firstEntry[0]);
    }

    if (typeof firstEntry === 'string' && firstEntry.trim()) {
      return firstEntry;
    }
  }

  return 'Unable to complete the request. Please try again.';
};

export default function OutDrawerBalanceModal({ open, onOpenChange, onSaved }) {
  const [loadingSnapshot, setLoadingSnapshot] = useState(false);
  const [saving, setSaving] = useState(false);
  const [openingBalance, setOpeningBalance] = useState(0);
  const [todaySalesTotal, setTodaySalesTotal] = useState(0);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const projectedTotal = useMemo(
    () => toSafeNumber(openingBalance) + toSafeNumber(todaySalesTotal),
    [openingBalance, todaySalesTotal]
  );

  const fetchSnapshot = async () => {
    setLoadingSnapshot(true);
    setError('');

    try {
      const now = new Date();
      const startOfDay = new Date(now);
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date(now);
      endOfDay.setHours(23, 59, 59, 999);

      const [settingsRes, salesRes] = await Promise.all([
        api.get(`/settings/?t=${Date.now()}`),
        api.get(
          `/firstapp/sales/?period=daily&start=${encodeURIComponent(startOfDay.toISOString())}&end=${encodeURIComponent(endOfDay.toISOString())}`
        ),
      ]);

      const initialBalance = toSafeNumber(settingsRes?.data?.pos_initial_balance);
      setOpeningBalance(initialBalance);

      const salesRows = Array.isArray(salesRes?.data) ? salesRes.data : [];
      const totalSales = salesRows.reduce((sum, row) => {
        return sum + toSafeNumber(row?.total_revenue);
      }, 0);
      setTodaySalesTotal(totalSales);
    } catch (snapshotError) {
      setError(extractErrorMessage(snapshotError));
      setOpeningBalance(0);
      setTodaySalesTotal(0);
    } finally {
      setLoadingSnapshot(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchSnapshot();
    } else {
      setLoadingSnapshot(false);
      setSaving(false);
      setOpeningBalance(0);
      setTodaySalesTotal(0);
      setNotes('');
      setError('');
      setSuccess('');
    }
  }, [open]);

  const handleSave = async () => {
    const safeOpeningBalance = toSafeNumber(openingBalance);
    const safeTodaySalesTotal = toSafeNumber(todaySalesTotal);

    if (safeOpeningBalance < 0 || safeTodaySalesTotal < 0) {
      setError('Invalid drawer values. Please refresh and try again.');
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const payload = {
        opening_balance: Number(safeOpeningBalance.toFixed(2)),
        today_sales_total: Number(safeTodaySalesTotal.toFixed(2)),
        notes: notes.trim(),
      };

      const response = await api.post('/firstapp/drawer-balance-logs/', payload);

      if (typeof onSaved === 'function') {
        onSaved(response.data);
      }

      setSuccess('Out drawer balance log saved successfully.');
      window.setTimeout(() => {
        onOpenChange(false);
      }, 550);
    } catch (saveError) {
      setError(extractErrorMessage(saveError));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !saving && onOpenChange(nextOpen)}>
      <DialogContent className="sm:max-w-lg z-50">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-gray-900">
            <Wallet size={18} className="text-blue-600" /> Out Drawer Balance
          </DialogTitle>
          <DialogDescription>
            Review today&apos;s opening balance and total sales before saving an out-drawer record.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-lg border border-blue-100 bg-blue-50 p-3">
              <p className="text-xs uppercase tracking-wide text-blue-700 font-semibold">POS Initial Balance</p>
              <p className="text-sm font-semibold text-blue-900 mt-1">{formatCurrency(openingBalance)}</p>
            </div>

            <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-3">
              <p className="text-xs uppercase tracking-wide text-emerald-700 font-semibold">Today Sales Total</p>
              <p className="text-sm font-semibold text-emerald-900 mt-1">{formatCurrency(todaySalesTotal)}</p>
            </div>

            <div className="rounded-lg border border-amber-100 bg-amber-50 p-3">
              <p className="text-xs uppercase tracking-wide text-amber-700 font-semibold">Projected Drawer Total</p>
              <p className="text-sm font-semibold text-amber-900 mt-1">{formatCurrency(projectedTotal)}</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="out-drawer-notes" className="text-sm font-medium text-gray-700">
              Notes (Optional)
            </Label>
            <textarea
              id="out-drawer-notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={3}
              maxLength={600}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Add remarks for this out-drawer snapshot."
            />
            <p className="text-xs text-gray-400 text-right">{notes.length}/600</p>
          </div>

          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 flex items-start gap-2">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <p>{error}</p>
            </div>
          )}

          {success && (
            <div className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700 flex items-start gap-2">
              <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
              <p>{success}</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={fetchSnapshot} disabled={loadingSnapshot || saving}>
            <RefreshCw size={16} className={loadingSnapshot ? 'animate-spin' : ''} />
            {loadingSnapshot ? 'Refreshing...' : 'Refresh Snapshot'}
          </Button>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSave} disabled={loadingSnapshot || saving} className="bg-blue-600 hover:bg-blue-700">
            {saving ? 'Saving...' : 'Out and Save Log'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
