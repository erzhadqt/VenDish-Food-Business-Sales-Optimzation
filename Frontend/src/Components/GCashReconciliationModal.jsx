import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "../Components/ui/dialog";
import { Button } from "../Components/ui/button";
import api from "../api";

export default function GCashReconciliationModal({ open, onOpenChange, onReceiptRecovered }) {
  const [loading, setLoading] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [error, setError] = useState("");

  const fetchTransactions = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api.get("/firstapp/payments/gcash/reconcile/?state=unreconciled_paid");
      setTransactions(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      console.error("Failed to fetch reconciliation transactions:", err);
      setError("Failed to load GCash reconciliation data.");
    } finally {
      setLoading(false);
    }
  };

  const finalizeByReference = async (reference) => {
    if (!reference) return;
    try {
      const response = await api.post("/firstapp/payments/gcash/finalize-by-reference/", { reference });
      const receiptId = response.data?.receipt_id;
      if (receiptId && onReceiptRecovered) {
        onReceiptRecovered(receiptId);
      }
      await fetchTransactions();
    } catch (err) {
      console.error("Failed to finalize by reference:", err);
      setError(err.response?.data?.error || "Failed to finalize transaction.");
    }
  };

  useEffect(() => {
    if (open) {
      fetchTransactions();
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl z-50">
        <DialogHeader>
          <DialogTitle>GCash Reconciliation</DialogTitle>
          <DialogDescription>
            Recover paid GCash transactions that are not yet linked to a POS receipt.
          </DialogDescription>
        </DialogHeader>

        {error && <div className="text-sm text-red-600 border border-red-200 bg-red-50 rounded p-2">{error}</div>}

        <div className="max-h-[50vh] overflow-auto border rounded">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="text-left p-2">Reference</th>
                <th className="text-left p-2">Amount</th>
                <th className="text-left p-2">Status</th>
                <th className="text-left p-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td className="p-3" colSpan={4}>Loading...</td></tr>
              ) : transactions.length === 0 ? (
                <tr><td className="p-3" colSpan={4}>No unreconciled paid transactions.</td></tr>
              ) : (
                transactions.map((txn) => (
                  <tr key={txn.id} className="border-t">
                    <td className="p-2 font-medium">{txn.reference}</td>
                    <td className="p-2">₱{(Number(txn.amount || 0) / 100).toFixed(2)}</td>
                    <td className="p-2">{txn.status}</td>
                    <td className="p-2">
                      <Button size="sm" onClick={() => finalizeByReference(txn.reference)}>Finalize</Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={fetchTransactions}>Refresh</Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
