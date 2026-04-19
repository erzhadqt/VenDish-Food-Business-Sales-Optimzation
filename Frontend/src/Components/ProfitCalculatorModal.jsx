import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Calculator } from 'lucide-react';

import api from '../api';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';

const PERIOD_API_MAP = {
  'Custom Range': 'CUSTOM',
  Daily: 'DAILY',
  Weekly: 'WEEKLY',
  Monthly: 'MONTHLY',
  Yearly: 'YEARLY',
};

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

const getErrorMessage = (error) => {
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

  return 'Unable to save the profit log. Please try again.';
};

export default function ProfitCalculatorModal({
  open,
  onOpenChange,
  period,
  totalRevenue,
  onSaved,
}) {
  const [expensesInput, setExpensesInput] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const normalizedRevenue = useMemo(() => {
    const parsed = Number(totalRevenue || 0);
    return Number.isFinite(parsed) ? parsed : 0;
  }, [totalRevenue]);

  const parsedExpenses = useMemo(() => {
    const parsed = Number.parseFloat(expensesInput);
    return Number.isFinite(parsed) ? parsed : 0;
  }, [expensesInput]);

  const netProfit = normalizedRevenue - parsedExpenses;

  useEffect(() => {
    if (!open) {
      setExpensesInput('');
      setNotes('');
      setSaving(false);
      setError('');
    }
  }, [open]);

  const handleExpensesChange = (event) => {
    let nextValue = String(event.target.value || '').replace(/[^0-9.]/g, '');

    const parts = nextValue.split('.');
    if (parts.length > 2) {
      nextValue = `${parts[0]}.${parts.slice(1).join('')}`;
    }

    setExpensesInput(nextValue);
    if (error) {
      setError('');
    }
  };

  const handleSave = async () => {
    const strictParsedExpenses = Number.parseFloat(expensesInput);

    if (expensesInput === '' || !Number.isFinite(strictParsedExpenses)) {
      setError('Please enter a valid expense amount.');
      return;
    }

    if (strictParsedExpenses < 0) {
      setError('Expenses cannot be negative.');
      return;
    }

    const apiPeriod = PERIOD_API_MAP[period] || 'CUSTOM';

    setSaving(true);
    setError('');

    try {
      const payload = {
        period: apiPeriod,
        revenue: Number(normalizedRevenue.toFixed(2)),
        expenses: Number(strictParsedExpenses.toFixed(2)),
        notes: notes.trim(),
      };

      const response = await api.post('/firstapp/profit-logs/', payload);

      if (typeof onSaved === 'function') {
        onSaved(response.data);
      }

      onOpenChange(false);
    } catch (saveError) {
      setError(getErrorMessage(saveError));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !saving && onOpenChange(nextOpen)}>
      <DialogContent className="sm:max-w-lg z-50">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-gray-900">
            <Calculator size={18} className="text-blue-600" />
            Profit Calculator
          </DialogTitle>
          <DialogDescription>
            Review this period&apos;s revenue, estimate expenses, and store a profit log for admin auditing.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="rounded-lg border border-blue-100 bg-blue-50 p-3">
              <p className="text-xs uppercase tracking-wide text-blue-700 font-semibold">Period</p>
              <p className="text-sm font-semibold text-blue-900 mt-1">{period}</p>
            </div>
            <div className="rounded-lg border border-green-100 bg-green-50 p-3">
              <p className="text-xs uppercase tracking-wide text-green-700 font-semibold">Total Revenue</p>
              <p className="text-sm font-semibold text-green-900 mt-1">{formatCurrency(normalizedRevenue)}</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="profit-expenses" className="text-sm font-medium text-gray-700">
              Total Expenses
            </Label>
            <Input
              id="profit-expenses"
              type="text"
              inputMode="decimal"
              value={expensesInput}
              onChange={handleExpensesChange}
              placeholder="0.00"
              aria-invalid={Boolean(error)}
            />
          </div>

          <div className={`rounded-lg border p-3 ${netProfit >= 0 ? 'border-emerald-200 bg-emerald-50' : 'border-red-200 bg-red-50'}`}>
            <p className={`text-xs uppercase tracking-wide font-semibold ${netProfit >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
              Net Profit
            </p>
            <p className={`text-xl font-bold mt-1 ${netProfit >= 0 ? 'text-emerald-900' : 'text-red-900'}`}>
              {formatCurrency(netProfit)}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="profit-notes" className="text-sm font-medium text-gray-700">
              Notes (Optional)
            </Label>
            <textarea
              id="profit-notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={3}
              maxLength={600}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Add context for this estimate (supplier costs, overhead, campaigns, etc.)."
            />
            <p className="text-xs text-gray-400 text-right">{notes.length}/600</p>
          </div>

          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 flex items-start gap-2">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <p>{error}</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700">
            {saving ? 'Saving...' : 'Save Log'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
