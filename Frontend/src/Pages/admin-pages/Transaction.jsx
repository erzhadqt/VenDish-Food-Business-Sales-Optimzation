import React, { useState, useEffect } from 'react';
import { HistoryIcon, Loader2, AlertCircle, Tag, EllipsisVertical, ChevronLeft, ChevronRight, Ban, User } from 'lucide-react'; // Added User Icon
import api from '../../api';
import ReceiptModal from '../../Components/ReceiptModal.jsx';

const Transaction = () => {
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedReceipt, setSelectedReceipt] = useState(null);

    const [currentPage, setCurrentPage] = useState(1);  
    const rowsPerPage = 5;  

    const [filterStatus, setFilterStatus] = useState('ALL'); 
    const [filterCoupon, setFilterCoupon] = useState('ALL');

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
            // The backend automatically filters this based on the logged-in user!
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

    const filteredTransactions = transactions.filter((receipt) => {  
        const statusMatch = filterStatus === 'ALL' || receipt.status === filterStatus;  
        const couponMatch =  
            filterCoupon === 'ALL' ||  
            (filterCoupon === 'WITH' && receipt.coupon_details) ||  
            (filterCoupon === 'WITHOUT' && !receipt.coupon_details);  
        return statusMatch && couponMatch;  
    });  

    const totalPages = Math.ceil(filteredTransactions.length / rowsPerPage);  
    const paginatedTransactions = filteredTransactions.slice(  
        (currentPage - 1) * rowsPerPage,  
        currentPage * rowsPerPage  
    );  

    const handlePrevPage = () => setCurrentPage((prev) => Math.max(prev - 1, 1));  
    const handleNextPage = () => setCurrentPage((prev) => Math.min(prev + 1, totalPages));  

    return (  
        <div className="w-full p-6">  
            <div className="max-w-7xl mx-auto">  
                <nav className="flex items-center justify-between mb-4">  
                    <h1 className="flex items-center gap-2 text-3xl font-bold text-gray-900">  
                        <HistoryIcon size={30} className="text-blue-900" />  
                        Transaction History  
                    </h1>  
                </nav>  

                <div className="flex gap-4 mb-4 justify-end">  
                    <div>  
                        <label className="text-sm font-medium text-gray-700 mr-2">Status:</label>  
                        <select  
                            value={filterStatus}  
                            onChange={(e) => { setFilterStatus(e.target.value); setCurrentPage(1); }}  
                            className="border rounded px-2 py-1 text-sm"  
                        >  
                            <option value="ALL">All</option>  
                            <option value="COMPLETED">Completed</option>  
                            <option value="VOIDED">Voided</option>  
                        </select>  
                    </div>  

                    <div>  
                        <label className="text-sm font-medium text-gray-700 mr-2">Coupon:</label>  
                        <select  
                            value={filterCoupon}  
                            onChange={(e) => { setFilterCoupon(e.target.value); setCurrentPage(1); }}  
                            className="border rounded px-2 py-1 text-sm"  
                        >  
                            <option value="ALL">All</option>  
                            <option value="WITH">With Coupon</option>  
                            <option value="WITHOUT">Without Coupon</option>  
                        </select>  
                    </div>  
                </div>  

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden min-h-[400px]">  
                    {loading && (  
                        <div className="flex flex-col justify-center items-center h-64">  
                            <Loader2 className="animate-spin text-blue-600 mb-2" size={40} />  
                            <p className="text-gray-500">Loading records...</p>  
                        </div>  
                    )}  

                    {!loading && error && (  
                        <div className="flex flex-col justify-center items-center h-64 text-red-500">  
                            <AlertCircle size={40} className="mb-2" />  
                            <p className="font-medium">{error}</p>  
                            <button onClick={fetchTransactions} className="mt-4 px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-md text-sm transition">Try Again</button>  
                        </div>  
                    )}  

                    {!loading && !error && filteredTransactions.length === 0 && (  
                        <div className="flex flex-col justify-center items-center h-64 text-gray-400">  
                            <HistoryIcon size={48} className="mb-2 opacity-20" />  
                            <p>No transactions found.</p>  
                        </div>  
                    )}  

                    {!loading && !error && filteredTransactions.length > 0 && (  
                        <>  
                            <div className="overflow-x-auto">  
                                <table className="w-full text-left text-sm text-gray-600">  
                                    <thead className="bg-gray-100 text-gray-900 uppercase font-semibold">  
                                        <tr>  
                                            <th className="px-6 py-4">Receipt ID</th>  
                                            <th className="px-6 py-4">Date</th>  
                                            {/* NEW HEADER: CASHIER */}
                                            <th className="px-6 py-4">Cashier</th>
                                            <th className="px-6 py-4">Status</th>  
                                            <th className="px-6 py-4">Coupon</th>  
                                            <th className="px-6 py-4 text-right">Total</th>  
                                            <th className="px-6 py-4 text-center">Items</th>  
                                            <th className="px-6 py-4">Actions</th>  
                                        </tr>  
                                    </thead>  
                                    <tbody className="divide-y divide-gray-200">  
                                        {paginatedTransactions.map((receipt) => (  
                                            <tr key={receipt.id} className="hover:bg-blue-50 transition-colors">  
                                                <td className="px-6 py-4 font-medium text-gray-900">#{receipt.id}</td>  
                                                <td className="px-6 py-4">{formatDate(receipt.created_at)}</td> 
                                                
                                                {/* NEW COLUMN: CASHIER */}
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-2">
                                                        <User size={14} className="text-gray-400"/>
                                                        <span className="font-medium text-gray-700">
                                                            {receipt.cashier_name || "System"}
                                                        </span>
                                                    </div>
                                                </td>

                                                <td className="px-6 py-4">  
                                                    <span className={`px-2 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1 ${  
                                                        receipt.status === 'VOIDED'  
                                                            ? 'bg-red-100 text-red-700 border border-red-200'  
                                                            : 'bg-green-100 text-green-800 border border-green-200'  
                                                    }`}>  
                                                        {receipt.status === 'VOIDED' && <Ban size={12}/>}
                                                        {receipt.status || 'COMPLETED'}  
                                                    </span>  
                                                </td>  
                                                <td className="px-6 py-4">  
                                                    {receipt.coupon_details ? (  
                                                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">  
                                                            <Tag size={12} />  
                                                            {receipt.coupon_details.code}  
                                                        </span>  
                                                    ) : (  
                                                        <span className="text-gray-400 text-xs italic">None</span>  
                                                    )}  
                                                </td>  
                                                <td className={`px-6 py-4 text-right font-bold ${
                                                    receipt.status === 'VOIDED' ? 'text-gray-400 line-through' : 'text-green-600'
                                                }`}>  
                                                    {formatCurrency(receipt.total)}  
                                                </td>  
                                                <td className="px-6 py-4 text-center">  
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">  
                                                        {receipt.items.length} items  
                                                    </span>  
                                                </td>  
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

                            <div className="flex justify-end items-center gap-2 mt-4 p-4">  
                                <button  
                                    onClick={handlePrevPage}  
                                    disabled={currentPage === 1}  
                                    className="p-2 rounded-full hover:bg-gray-200 disabled:opacity-50"  
                                >  
                                    <ChevronLeft size={20} />  
                                </button>  
                                <span className="text-sm text-gray-600">  
                                    Page {currentPage} of {totalPages}  
                                </span>  
                                <button  
                                    onClick={handleNextPage}  
                                    disabled={currentPage === totalPages}  
                                    className="p-2 rounded-full hover:bg-gray-200 disabled:opacity-50"  
                                >  
                                    <ChevronRight size={20} />  
                                </button>  
                            </div>  
                        </>  
                    )}  
                </div>  
            </div>  

            <ReceiptModal  
                open={!!selectedReceipt}  
                onClose={() => setSelectedReceipt(null)}  
                receiptDetails={selectedReceipt}  
            />  
        </div>  
    );  
};

export default Transaction;