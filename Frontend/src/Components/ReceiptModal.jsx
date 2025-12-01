import React from 'react';
import { X, Printer } from 'lucide-react';

const ReceiptModal = ({ open, onClose, receiptDetails }) => {
    // If modal is not open or no data, don't render anything
    if (!open || !receiptDetails) return null;

    // Helper to print (optional functionality)
    const handlePrint = () => {
        window.print();
    };

    return (
        // The Z-index here must be high to sit on top of everything
        <div className="relative z-50">
            
            {/* --- THE BLUR EFFECT LAYER --- */}
            <div 
                className="fixed inset-0 bg-black/30 backdrop-blur-sm transition-opacity" 
                onClick={onClose} 
                aria-hidden="true"
            />

            {/* --- MODAL CONTENT --- */}
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
                <div className="w-full max-w-md bg-white rounded-lg shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200">
                    
                    {/* Header */}
                    <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 bg-gray-50">
                        <h3 className="font-semibold text-gray-900">Receipt Details</h3>
                        <button 
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600 transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* Scrollable Body */}
                    <div className="max-h-[70vh] overflow-y-auto px-6 py-6">
                        <div className="flex justify-between items-end mb-6">
                            <div>
                                <p className="text-sm text-gray-500">Receipt ID</p>
                                <div className="flex items-center gap-2">
                                    <p className="text-lg font-bold text-gray-900">#{receiptDetails.id}</p>
                                    
                                    {/* --- 1. ADDED STATUS BADGE HERE --- */}
                                    <span className={`px-2 py-0.5 rounded-full text-[12px] uppercase font-bold tracking-wide border ${
                                        receiptDetails.status === 'VOIDED' 
                                        ? 'bg-red-100 text-red-700 border-red-200' 
                                        : 'bg-green-100 text-green-700 border-green-200'
                                    }`}>
                                        {receiptDetails.status || 'COMPLETED'}
                                    </span>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-sm text-gray-500">Date</p>
                                <p className="font-medium text-gray-900">
                                    {new Date(receiptDetails.created_at).toLocaleDateString()}
                                </p>
                            </div>
                        </div>

                        {/* Items List */}
                        <div className="border rounded-md border-gray-200 p-4 mb-4 bg-gray-50/50">
                            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Purchased Items</h4>
                            <div className="space-y-3">
                                {receiptDetails.items.map((item, index) => (
                                    <div key={index} className="flex justify-between text-sm">
                                        <span className="text-gray-700">
                                            {item.product_name} <span className="text-gray-400 ">x{item.quantity}</span>
                                        </span>
                                        <span className="font-medium text-gray-900 font-mono text-md">
                                            {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'PHP' }).format(item.price)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Summary */}
                        <div className="space-y-2 pt-2">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Subtotal</span>
                                <span className="font-semibold text-foreground font-mono">₱{receiptDetails.subtotal}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">VAT</span>
                                <span className="font-semibold text-foreground font-mono">₱{receiptDetails.vat}</span>
                            </div>
                            {receiptDetails.coupon_details && (
                                <div className="flex justify-between text-sm text-green-600">
                                    <span>Discount ({receiptDetails.coupon_details.code})</span>
                                    <span>- {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'PHP' }).format(receiptDetails.coupon_details.rate)}</span>
                                </div>
                            )}
                            
                            <div className="flex justify-between text-lg font-bold text-gray-900 border-t pt-4">
                                <span>Total</span>
                                {/* --- 2. ADDED STRIKETHROUGH LOGIC IF VOIDED --- */}
                                <span className={`font-mono ${receiptDetails.status === 'VOIDED' ? 'line-through text-gray-400' : ''}`}>
                                    {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'PHP' }).format(receiptDetails.total)}
                                </span>
                            </div>

                             <div className=" rounded-md mt-4 space-y-1">
                                <div className="flex justify-between text-md">
                                    <span className="text-muted-foreground">Cash Given</span>
                                    <span className="font-mono">₱{receiptDetails.cash_given}</span>
                                </div>
                                <div className="flex justify-between text-md">
                                    <span className="text-muted-foreground">Change</span>
                                    <span className="font-mono">₱{receiptDetails.change}</span>
                                </div>
                            </div>

                            {/* --- 3. OPTIONAL: SHOW VOID REASON --- */}
                            {receiptDetails.status === 'VOIDED' && receiptDetails.void_reason && (
                                <div className="mt-4 p-3 bg-red-50 border border-red-100 rounded text-xs text-red-600">
                                    <strong>Void Reason:</strong> {receiptDetails.void_reason}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
                        <button 
                            onClick={handlePrint}
                            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none"
                        >
                            <Printer size={16} />
                            Print
                        </button>
                        <button 
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none"
                        >
                            Done
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ReceiptModal;