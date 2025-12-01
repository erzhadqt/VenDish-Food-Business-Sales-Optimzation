import React, { useState, useEffect } from 'react';
import { TicketPercentIcon, PlusSquareIcon, Loader2, Calendar, AlertCircle, Trash2 } from 'lucide-react';
import api from "../../api";
import AddDiscountDialog from '../../Components/AddDiscountDialog';

const PromoManagement = () => {
    const [coupons, setCoupons] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // --- 1. Fetch Data ---
    const fetchCoupons = async () => {
        try {
            const response = await api.get('/firstapp/coupons/');
            const data = response.data;
            setCoupons(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCoupons();
    }, []);

    // --- 2. Delete Function ---
    const handleDelete = async (id) => {
        if(!window.confirm("Are you sure you want to delete this coupon?")) return;

        try {  
            await api.delete(`/firstapp/coupons/${id}/`);
            setCoupons(prev => prev.filter(coupon => coupon.id !== id));
        } catch (err) {
            console.error("Delete error:", err);
            alert("Failed to delete coupon. It may have already been deleted.");
        }
    };

    // Helper to format dates nicely
    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric', month: 'short', day: 'numeric'
        });
    };

    // --- 3. Status Logic Helper ---
    // Reads directly from the Django 'status' CharField
    const renderStatusBadge = (status) => {
        // Normalize status to handle potential casing differences from backend
        const currentStatus = status ? status.toLowerCase() : '';

        switch (currentStatus) {
            case 'active':
                return (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                        Active
                    </span>
                );
            case 'claimed':
                return (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
                        Claimed
                    </span>
                );
            case 'redeemed':
                return (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">
                        Redeemed
                    </span>
                );
            default:
                // Fallback for unexpected statuses
                return (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        {status}
                    </span>
                );
        }
    };

    return (
        <div className="w-full min-h-screen p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <nav className="flex items-center justify-between mb-8">
                    <h1 className="flex items-center gap-2 text-3xl font-bold text-gray-900">
                        <TicketPercentIcon size={30} className="text-blue-600" /> 
                        Promo Discounts
                    </h1>

                    <div className="flex gap-2">
                        <AddDiscountDialog onSaved={fetchCoupons}> 
                            <button className="flex gap-2 items-center bg-gray-900 hover:bg-gray-700 text-white px-4 py-2.5 rounded-lg font-medium transition-colors duration-200 shadow-sm">
                                <PlusSquareIcon size={20} /> New Coupon
                            </button>
                        </AddDiscountDialog>
                    </div>
                </nav>

                {/* Content Area */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    
                    {/* Loading State */}
                    {loading && (
                        <div className="p-12 flex justify-center items-center text-gray-500">
                            <Loader2 size={32} className="animate-spin mr-2" /> Loading coupons...
                        </div>
                    )}

                    {/* Error State */}
                    {error && (
                        <div className="p-8 text-center text-red-500 bg-red-50">
                            <AlertCircle className="mx-auto mb-2" />
                            <p>Error: {error}</p>
                        </div>
                    )}

                    {/* Data Table */}
                    {!loading && !error && (
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-gray-50 text-gray-600 font-semibold text-sm uppercase tracking-wider">
                                <tr>
                                    <th className="p-4 border-b">Details</th>
                                    <th className="p-4 border-b">Code</th>
                                    <th className="p-4 border-b">Discount</th>
                                    <th className="p-4 border-b">Product</th>
                                    <th className="p-4 border-b">Status</th>
                                    <th className="p-4 border-b">Expiration</th>
                                    <th className="p-4 border-b text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {coupons.map((coupon) => (
                                    <tr key={coupon.id} className="hover:bg-gray-50 transition-colors group">
                                        <td className="p-4">
                                            <p className="font-medium text-gray-900">{coupon.name}</p>
                                        </td>
                                        <td className="p-4">
                                            <span className="font-mono bg-gray-100 px-2 py-1 rounded text-gray-700 border border-gray-300">
                                                {coupon.code}
                                            </span>
                                        </td>
                                        <td className="p-4 font-semibold text-green-600">
                                            ${coupon.rate}
                                        </td>
                                        <td className="p-4 text-gray-600">
                                            {/* Assuming serializer returns product_name, otherwise use coupon.product */}
                                            {coupon.product_name || `Product #${coupon.product}`}
                                        </td>
                                        
                                        {/* Status Column */}
                                        <td className="p-4">
                                            {renderStatusBadge(coupon.status)}
                                        </td>

                                        <td className="p-4 text-gray-500 text-sm flex items-center gap-2">
                                            <Calendar size={14}/> {formatDate(coupon.expiration)}
                                        </td>
                                        <td className="p-4 text-right">
                                            <button 
                                                onClick={() => handleDelete(coupon.id)}
                                                className="text-gray-400 hover:text-red-600 transition-colors p-2 rounded-full hover:bg-red-50"
                                                title="Delete Coupon"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                    
                    {!loading && coupons.length === 0 && (
                        <div className="p-12 text-center text-gray-400">
                            No coupons found. Create one to get started!
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default PromoManagement;