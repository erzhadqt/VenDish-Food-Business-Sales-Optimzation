import React, { useState, useEffect } from 'react';
import { HistoryIcon, Loader2, AlertCircle, Tag, EllipsisVertical } from 'lucide-react'; 
import api from '../../api';
import ReceiptModal from '../../Components/ReceiptModal.jsx'; 

const Transaction = () => {
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null); 

    // 1. STATE: Track which receipt is open
    const [selectedReceipt, setSelectedReceipt] = useState(null);

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'PHP', 
        }).format(amount);
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric', month: 'short', day: 'numeric', 
            hour: '2-digit', minute: '2-digit'
        });
    };

    const fetchTransactions = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await api.get('/firstapp/receipt/');
            setTransactions(response.data); 
        } catch (err) {
            console.error("Error fetching transactions:", err);
            setError("Failed to load transaction history.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTransactions();
    }, []);

    return (
        <div className="w-full min-h-screen p-6">
            <div className="max-w-7xl mx-auto">
                <nav className="flex items-center justify-between mb-8">
                    <h1 className="flex items-center gap-2 text-3xl font-bold text-gray-900">
                        <HistoryIcon size={30} className="text-blue-900" />
                        Transaction History
                    </h1>
                </nav>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden min-h-[400px]">
                    {/* LOADING STATE */}
                    {loading && (
                        <div className="flex flex-col justify-center items-center h-64">
                            <Loader2 className="animate-spin text-blue-600 mb-2" size={40} />
                            <p className="text-gray-500">Loading records...</p>
                        </div>
                    )}

                    {/* ERROR STATE */}
                    {!loading && error && (
                        <div className="flex flex-col justify-center items-center h-64 text-red-500">
                            <AlertCircle size={40} className="mb-2" />
                            <p className="font-medium">{error}</p>  
                            <button 
                                onClick={fetchTransactions}
                                className="mt-4 px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-md text-sm transition"
                            >
                                Try Again
                            </button>
                        </div>
                    )}

                    {/* EMPTY STATE */}
                    {!loading && !error && transactions.length === 0 && (
                        <div className="flex flex-col justify-center items-center h-64 text-gray-400">
                            <HistoryIcon size={48} className="mb-2 opacity-20" />
                            <p>No transactions found.</p>
                        </div>
                    )}

                    {/* DATA TABLE */}
                    {!loading && !error && transactions.length > 0 && (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm text-gray-600">
                                <thead className="bg-gray-100 text-gray-900 uppercase font-semibold">
                                    <tr>
                                        <th className="px-6 py-4">Receipt ID</th>
                                        <th className="px-6 py-4">Date</th>
                                        <th className="px-6 py-4">Status</th>
                                        <th className="px-6 py-4">Coupon</th>
                                        <th className="px-6 py-4 text-right">Total</th>
                                        <th className="px-6 py-4 text-center">Items</th>
                                        <th className="px-6 py-4">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {transactions.map((receipt) => (
                                        <tr key={receipt.id} className="hover:bg-blue-50 transition-colors">
                                            <td className="px-6 py-4 font-medium text-gray-900">#{receipt.id}</td>
                                            <td className="px-6 py-4">{formatDate(receipt.created_at)}</td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                                                    receipt.status === 'VOIDED' 
                                                    ? 'bg-red-200 text-red-800' 
                                                    : 'bg-green-100 text-green-800'
                                                }`}>
                                                    {receipt.status || 'COMPLETED'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                {receipt.coupon_details ? (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                                                        <Tag size={12} />
                                                        {receipt.coupon_details.code}
                                                    </span>
                                                ) : (
                                                    <span className="text-gray-400 text-xs italic">None</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-right font-bold text-green-600">
                                                {formatCurrency(receipt.total)}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                    {receipt.items.length} items
                                                </span>
                                            </td>
                                            
                                            {/* 2. TRIGGER: Open Modal on Click */}
                                            <td className="px-6 py-4 text-center">
                                                <button 
                                                    onClick={() => setSelectedReceipt(receipt)}
                                                    className="p-2 hover:bg-gray-200 rounded-full text-gray-500 transition-colors focus:outline-none"
                                                >
                                                    <EllipsisVertical size={20} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* 3. MODAL INSTANCE: Pass the selected receipt and close handler */}
            <ReceiptModal 
                open={!!selectedReceipt} 
                onClose={() => setSelectedReceipt(null)} 
                receiptDetails={selectedReceipt} 
            />
        </div>
    );
};

export default Transaction;