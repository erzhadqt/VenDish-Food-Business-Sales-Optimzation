import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { HistoryIcon, AlertCircle, Tag, EllipsisVertical, ChevronLeft, ChevronRight, Ban, User, X } from 'lucide-react';
import api from '../../api';
import ReceiptModal from '../../Components/ReceiptModal.jsx';
import { Skeleton } from '../../Components/ui/skeleton';
import { applyQueryParam, usePersistedQueryState } from '../../utils/usePersistedQueryState';
import { useAuth } from '../../context/AuthContext';

const parsePositivePage = (value, fallback = 1) => {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const Transaction = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const { user } = useAuth();

    const normalizedRole = typeof user?.role === 'string' ? user.role.toLowerCase() : '';
    const canUseCashierFilter = Boolean(
        user?.is_superuser || normalizedRole === 'admin' || normalizedRole === 'superuser'
    );

    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedReceipt, setSelectedReceipt] = useState(null);

    // Lazy load pagination state from localStorage
    const [currentPage, setCurrentPage] = usePersistedQueryState({
        searchParams,
        queryKey: 'page',
        storageKey: 'transaction_page',
        defaultValue: 1,
        parse: (rawValue, fallback) => parsePositivePage(rawValue, fallback),
        serialize: (value) => String(value),
    });  
    const rowsPerPage = 5;  

    // Lazy load filter states from localStorage
    const [filterStatus, setFilterStatus] = usePersistedQueryState({
        searchParams,
        queryKey: 'status',
        storageKey: 'transaction_filterStatus',
        defaultValue: 'ALL',
    }); 
    const [filterCoupon, setFilterCoupon] = usePersistedQueryState({
        searchParams,
        queryKey: 'coupon',
        storageKey: 'transaction_filterCoupon',
        defaultValue: 'ALL',
    });
    const [filterCashier, setFilterCashier] = usePersistedQueryState({
        searchParams,
        queryKey: 'cashier',
        storageKey: 'transaction_filterCashier',
        defaultValue: 'ALL',
    });
    const [filterDate, setFilterDate] = usePersistedQueryState({
        searchParams,
        queryKey: 'date',
        storageKey: 'transaction_filterDate',
        defaultValue: '',
    }); 
    const [filterPaymentMode, setFilterPaymentMode] = usePersistedQueryState({
        searchParams,
        queryKey: 'payment',
        storageKey: 'transaction_filterPaymentMode',
        defaultValue: 'ALL',
    });

    // Auto-save states to localStorage on change
    useEffect(() => {
        const params = new URLSearchParams();
        applyQueryParam(params, 'date', filterDate);
        applyQueryParam(params, 'payment', filterPaymentMode, (value) => value === 'ALL');
        applyQueryParam(params, 'status', filterStatus, (value) => value === 'ALL');
        applyQueryParam(params, 'coupon', filterCoupon, (value) => value === 'ALL');
        applyQueryParam(params, 'cashier', canUseCashierFilter ? filterCashier : 'ALL', (value) => value === 'ALL');
        applyQueryParam(params, 'page', currentPage, (value) => Number(value) <= 1);

        if (params.toString() !== searchParams.toString()) {
            setSearchParams(params, { replace: true });
        }
    }, [
        currentPage,
        filterStatus,
        filterCoupon,
        filterCashier,
        filterDate,
        filterPaymentMode,
        canUseCashierFilter,
        searchParams,
        setSearchParams,
    ]);

    useEffect(() => {
        if (!canUseCashierFilter && filterCashier !== 'ALL') {
            setFilterCashier('ALL');
            setCurrentPage(1);
        }
    }, [canUseCashierFilter, filterCashier, setFilterCashier, setCurrentPage]);

    // Reset all filters to default
    const handleClearFilters = () => {
        setFilterDate('');
        setFilterPaymentMode('ALL');
        setFilterStatus('ALL');
        setFilterCoupon('ALL');
        setFilterCashier('ALL');
        setCurrentPage(1);
    };

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

    useEffect(() => { fetchTransactions(); }, []);  

    const uniqueCashiers = useMemo(() => {
        const names = transactions.map(t => t.cashier_name || "System");
        return [...new Set(names)].sort();
    }, [transactions]);

    const filteredTransactions = transactions.filter((receipt) => {  
        const hasCoupons = Array.isArray(receipt.coupon_details) && receipt.coupon_details.length > 0;
        const statusMatch = filterStatus === 'ALL' || receipt.status === filterStatus;  
        const couponMatch = filterCoupon === 'ALL' || (filterCoupon === 'WITH' && hasCoupons) || (filterCoupon === 'WITHOUT' && !hasCoupons);  
        const cashierMatch = !canUseCashierFilter || filterCashier === 'ALL' || (receipt.cashier_name || "System") === filterCashier;
        const paymentModeMatch = filterPaymentMode === 'ALL' || receipt.payment_method === filterPaymentMode; 
        
        let dateMatch = true;
        if (filterDate) {
            const receiptDateObj = new Date(receipt.created_at);
            const year = receiptDateObj.getFullYear();
            const month = String(receiptDateObj.getMonth() + 1).padStart(2, '0');
            const day = String(receiptDateObj.getDate()).padStart(2, '0');
            const formattedReceiptDate = `${year}-${month}-${day}`;
            
            dateMatch = formattedReceiptDate === filterDate;
        }

        return statusMatch && couponMatch && cashierMatch && dateMatch && paymentModeMatch;  
    });  

    const totalPages = Math.ceil(filteredTransactions.length / rowsPerPage);  
    
    // Failsafe to prevent viewing an empty page if filters reduce total pages below current page
    const validCurrentPage = currentPage > totalPages && totalPages > 0 ? totalPages : currentPage;

    const paginatedTransactions = filteredTransactions.slice((validCurrentPage - 1) * rowsPerPage, validCurrentPage * rowsPerPage);  

    // Dynamic jump functions for pagination
    const jumpPrev = (amount) => setCurrentPage((prev) => Math.max(prev - amount, 1));  
    const jumpNext = (amount) => setCurrentPage((prev) => Math.min(prev + amount, totalPages));  

    return (  
        <div className="w-full p-4 md:p-6">  
            <div className="max-w-7xl mx-auto">  
                <nav className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">  
                    <h1 className="flex items-center gap-2 text-2xl md:text-3xl font-bold text-gray-900">  
                        <HistoryIcon size={28} className="text-blue-900 md:w-[30px] md:h-[30px]" />  
                        Transaction History  
                    </h1>  
                </nav>  

                <div className={`grid grid-cols-1 sm:grid-cols-2 ${canUseCashierFilter ? 'lg:grid-cols-6' : 'lg:grid-cols-5'} gap-4 mb-6`}>  
                    <div className="flex flex-col">
                        <label className="text-sm font-medium text-gray-700 mb-1">Date</label>
                        <input 
                            type="date" 
                            value={filterDate} 
                            onChange={(e) => { setFilterDate(e.target.value); setCurrentPage(1); }} 
                            className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none w-full h-[38px]"
                        />
                    </div>
                    
                    <div className="flex flex-col">  
                        <label className="text-sm font-medium text-gray-700 mb-1">Payment Mode</label>  
                        <select value={filterPaymentMode} onChange={(e) => { setFilterPaymentMode(e.target.value); setCurrentPage(1); }} className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none w-full h-[38px]">  
                            <option value="ALL">All Modes</option>  
                            <option value="CASH">Cash</option>  
                            <option value="GCASH">GCash</option>  
                        </select>  
                    </div> 

                    <div className="flex flex-col">  
                        <label className="text-sm font-medium text-gray-700 mb-1">Status</label>  
                        <select value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setCurrentPage(1); }} className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none w-full h-[38px]">  
                            <option value="ALL">All</option>  
                            <option value="COMPLETED">Completed</option>  
                            <option value="VOIDED">Voided</option>  
                        </select>  
                    </div>  

                    <div className="flex flex-col">  
                        <label className="text-sm font-medium text-gray-700 mb-1">Coupon</label>  
                        <select value={filterCoupon} onChange={(e) => { setFilterCoupon(e.target.value); setCurrentPage(1); }} className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none w-full h-[38px]">  
                            <option value="ALL">All</option>  
                            <option value="WITH">With Coupon</option>  
                            <option value="WITHOUT">Without Coupon</option>  
                        </select>  
                    </div>  

                    {canUseCashierFilter && (
                        <div className="flex flex-col">  
                            <label className="text-sm font-medium text-gray-700 mb-1">Cashier</label>  
                            <select value={filterCashier} onChange={(e) => { setFilterCashier(e.target.value); setCurrentPage(1); }} className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none w-full h-[38px]">  
                                <option value="ALL">All Cashiers</option>  
                                {uniqueCashiers.map((name) => (
                                    <option key={name} value={name}>{name}</option>
                                ))}
                            </select>  
                        </div>
                    )}  

                    <div className="flex flex-col justify-end">
                        <button 
                            onClick={handleClearFilters}
                            className="flex items-center justify-center gap-2 border border-gray-300 rounded-lg px-3 py-2 text-sm bg-gray-50 hover:bg-gray-100 shadow-sm text-gray-700 font-medium transition-colors w-full h-[38px]"
                        >
                            <X size={16} /> Clear Filters
                        </button>
                    </div>
                </div>  

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden min-h-[400px]">  
                    {loading && (  
                        <div className="p-4 md:p-6 space-y-4">  
                            <div className="grid grid-cols-8 gap-4"> 
                                {Array.from({ length: 8 }).map((_, index) => ( 
                                    <Skeleton key={`th-${index}`} className="h-5 w-full" /> 
                                ))}
                            </div>
                            {Array.from({ length: rowsPerPage }).map((_, rowIndex) => (
                                <div key={`row-${rowIndex}`} className="grid grid-cols-8 gap-4 items-center">
                                    <Skeleton className="h-5 w-3/4" />
                                    <Skeleton className="h-5 w-full" />
                                    <Skeleton className="h-5 w-4/5" />
                                    <Skeleton className="h-6 w-3/4 rounded-full" />
                                    <Skeleton className="h-6 w-2/3 rounded-full" />
                                    <Skeleton className="h-5 w-1/2 ml-auto" />
                                    <Skeleton className="h-6 w-2/3 rounded-full" />
                                    <div className="flex justify-center">
                                        <Skeleton className="h-8 w-8 rounded-full" />
                                    </div>
                                </div>
                            ))}
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
                                <table className="w-full text-left text-sm text-gray-600 min-w-[800px]">  
                                    <thead className="bg-gray-100 text-gray-900 uppercase font-semibold">  
                                        <tr>  
                                            <th className="px-4 md:px-6 py-4">Receipt ID</th>  
                                            <th className="px-4 md:px-6 py-4">Date</th>  
                                            <th className="px-4 md:px-6 py-4">Cashier</th>
                                            <th className="px-4 md:px-6 py-4">Payment Mode</th>
                                            <th className="px-4 md:px-6 py-4">Status</th>  
                                            <th className="px-4 md:px-6 py-4">Coupon</th>    
                                            <th className="px-4 md:px-6 py-4 text-center">Items</th>
                                            <th className="px-4 md:px-6 py-4 text-right">Total</th>
                                            <th className="px-4 md:px-6 py-4">Actions</th>  
                                        </tr>  
                                    </thead>  
                                    <tbody className="divide-y divide-gray-200">  
                                        {paginatedTransactions.map((receipt) => (  
                                            <tr key={receipt.id} className="hover:bg-blue-50 transition-colors">  
                                                <td className="px-4 md:px-6 py-4 font-medium text-gray-900">#{receipt.id}</td>  
                                                <td className="px-4 md:px-6 py-4 whitespace-nowrap">{formatDate(receipt.created_at)}</td> 
                                                <td className="px-4 md:px-6 py-4">
                                                    <div className="flex items-center gap-2">
                                                        <User size={14} className="text-gray-400 shrink-0"/>
                                                        <span className="font-medium text-gray-700">{receipt.cashier_name || "System"}</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 md:px-6 py-4">
                                                    <span className={`px-2 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1 ${receipt.payment_method === 'GCASH' ? 'bg-blue-100 text-blue-800 border border-blue-200' : 'bg-emerald-100 text-emerald-800 border border-emerald-200'}`}>
                                                        {receipt.payment_method === 'GCASH' ? 'GCASH' : 'CASH'}
                                                    </span>
                                                </td>
                                                <td className="px-4 md:px-6 py-4">  
                                                    <span className={`px-2 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1 ${receipt.status === 'VOIDED' ? 'bg-red-100 text-red-700 border border-red-200' : 'bg-green-100 text-green-800 border border-green-200'}`}>  
                                                        {receipt.status === 'VOIDED' && <Ban size={12}/>}
                                                        {receipt.status || 'COMPLETED'}  
                                                    </span>  
                                                </td>  
                                                <td className="px-4 md:px-6 py-4">
                                                    {receipt.coupon_details && receipt.coupon_details.length > 0 ? (
                                                        <div className="flex flex-col gap-1 items-start">
                                                            {receipt.coupon_details.map((coupon, index) => (
                                                                <span key={index} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                                                                    <Tag size={12} /> {coupon.code}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    ) : (<span className="text-gray-400 text-xs italic">None</span>)}
                                                </td>
                                                <td className="px-4 md:px-6 py-4 text-center">  
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 whitespace-nowrap">  
                                                        {receipt.items.length} items  
                                                    </span>  
                                                </td>
                                                <td className={`px-4 md:px-6 py-4 text-right font-bold whitespace-nowrap ${receipt.status === 'VOIDED' ? 'text-gray-400 line-through' : 'text-green-600'}`}>  
                                                    {formatCurrency(receipt.total)}  
                                                </td>  
                                                <td className="px-4 md:px-6 py-4 text-center">  
                                                    <button onClick={() => setSelectedReceipt(receipt)} className="p-2 hover:bg-gray-200 rounded-full text-gray-500 transition-colors focus:outline-none">  
                                                        <EllipsisVertical size={20} />  
                                                    </button>  
                                                </td>  
                                            </tr>  
                                        ))}  
                                    </tbody>  
                                </table>  
                            </div>  

                            {/* Enhanced Pagination Controls */}
                            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-4 p-4 border-t border-gray-100 bg-gray-50/50">  
                                <div className="flex items-center gap-1.5">
                                    <button onClick={() => jumpPrev(10)} disabled={validCurrentPage === 1} className="px-2.5 py-1.5 rounded-md hover:bg-gray-200 text-gray-600 disabled:opacity-40 text-xs font-bold transition-colors border border-transparent hover:border-gray-300" title="Jump 10 pages back">  
                                        -10  
                                    </button>  
                                    <button onClick={() => jumpPrev(5)} disabled={validCurrentPage === 1} className="px-2.5 py-1.5 rounded-md hover:bg-gray-200 text-gray-600 disabled:opacity-40 text-xs font-bold transition-colors border border-transparent hover:border-gray-300" title="Jump 5 pages back">  
                                        -5  
                                    </button>  
                                    <button onClick={() => jumpPrev(1)} disabled={validCurrentPage === 1} className="p-1.5 rounded-full hover:bg-gray-200 text-gray-700 disabled:opacity-40 transition-colors border border-gray-200 bg-white shadow-sm ml-1" title="Previous page">  
                                        <ChevronLeft size={20} />  
                                    </button>  
                                </div>

                                <span className="text-sm font-semibold text-gray-700 bg-white px-4 py-1.5 rounded-full border border-gray-200 shadow-sm">
                                    Page {validCurrentPage} of {totalPages || 1}
                                </span>  

                                <div className="flex items-center gap-1.5">
                                    <button onClick={() => jumpNext(1)} disabled={validCurrentPage === totalPages || totalPages === 0} className="p-1.5 rounded-full hover:bg-gray-200 text-gray-700 disabled:opacity-40 transition-colors border border-gray-200 bg-white shadow-sm mr-1" title="Next page">  
                                        <ChevronRight size={20} />  
                                    </button>  
                                    <button onClick={() => jumpNext(5)} disabled={validCurrentPage === totalPages || totalPages === 0} className="px-2.5 py-1.5 rounded-md hover:bg-gray-200 text-gray-600 disabled:opacity-40 text-xs font-bold transition-colors border border-transparent hover:border-gray-300" title="Jump 5 pages forward">  
                                        +5  
                                    </button>  
                                    <button onClick={() => jumpNext(10)} disabled={validCurrentPage === totalPages || totalPages === 0} className="px-2.5 py-1.5 rounded-md hover:bg-gray-200 text-gray-600 disabled:opacity-40 text-xs font-bold transition-colors border border-transparent hover:border-gray-300" title="Jump 10 pages forward">  
                                        +10  
                                    </button>  
                                </div>
                            </div>
                        </>  
                    )}  
                </div>  
            </div>  

            <ReceiptModal open={!!selectedReceipt} onClose={() => setSelectedReceipt(null)} receiptDetails={selectedReceipt} />  
        </div>  
    );  
};

export default Transaction;