import React, { useState, useEffect } from "react";
import { Button } from "@/Components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/Components/ui/table";
import { Plus, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react"; 
import api from "../../api";
import AddDiscountDialog from "../../Components/AddDiscountDialog"; 
import DeleteConfirmDialog from "../../Components/DeleteConfirmDialog"; //

const PromoManagement = () => {
  const [coupons, setCoupons] = useState([]);
  const [products, setProducts] = useState([]); 
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5; 
  
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const fetchData = async () => {
    try {
        const [couponRes, prodRes] = await Promise.all([
        api.get("/firstapp/coupons/"),
        api.get("/firstapp/products/") 
        ]);
        setCoupons(couponRes.data);
        setProducts(prodRes.data);
    } catch (error) {
        console.error("Failed to load promo data:", error);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleDelete = async (id) => {
    try {
        await api.delete(`/firstapp/coupons/${id}/`);
        // Remove from local state immediately for responsiveness
        setCoupons((prev) => prev.filter((coupon) => coupon.id !== id));
    } catch (error) {
        console.error("Failed to delete coupon:", error);
        alert("Failed to delete coupon. It may have dependencies.");
    }
  };

  // Helper: Format Date
  const formatDate = (dateString) => {
    if (!dateString) return "No Expiration";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "Invalid Date";
    return date.toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  const getStatusBadge = (status, limit, used) => {
    const isSoldOut = limit !== null && used >= limit;
    const effectiveStatus = (isSoldOut && status === 'Active') ? 'Redeemed' : status;

    switch (effectiveStatus) {
        case 'Active': return 'bg-green-100 text-green-700 border-green-200';
        case 'Redeemed': return 'bg-gray-200 text-gray-700 border-gray-300';
        case 'Expired': return 'bg-red-100 text-red-700 border-red-200';
        default: return 'bg-gray-100 text-gray-600 border-gray-200';
    }
  };

  // --- PAGINATION LOGIC ---
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentCoupons = coupons.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(coupons.length / itemsPerPage);

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  return (
    <div className="p-6 space-y-8 bg-gray-50 min-h-screen">
      
      {/* HEADER & ACTIONS */}
      <div className="flex justify-between items-center">
        <div>
            <h1 className="text-2xl font-bold text-gray-800">Coupon Management</h1>
            <p className="text-gray-500 text-sm">Create and track dynamic discount codes.</p>
        </div>
        
        <Button onClick={() => setIsCreateOpen(true)} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2"/> Create New Coupon
        </Button>
      </div>

      {/* ACTIVE COUPONS TABLE */}
      <div className="bg-white rounded-lg shadow p-4 border border-gray-200 flex flex-col h-full">
        <h2 className="text-lg font-semibold mb-4 text-gray-800">Active Coupons</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Promo Name</TableHead>
              <TableHead>Discount Details</TableHead>
              <TableHead>Expiration</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Usage</TableHead>
              <TableHead className="text-right"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {currentCoupons.map((coupon) => {
                const isSoldOut = coupon.usage_limit !== null && coupon.times_used >= coupon.usage_limit;

                return (
                  <TableRow key={coupon.id}>
                    <TableCell className="font-mono font-bold text-blue-600 tracking-wider">
                        {coupon.code}
                    </TableCell>
                    
                    <TableCell className="font-medium text-gray-700">
                        {coupon.criteria_details?.name || "No Rule Attached"}
                    </TableCell>

                    <TableCell>
                        <div className="flex flex-col text-sm">
                            <span className="font-semibold text-gray-600">
                                {coupon.criteria_details?.discount_type === 'percentage' 
                                    ? `${coupon.criteria_details?.discount_value}% OFF`
                                    : coupon.criteria_details?.discount_type === 'fixed'
                                    ? `₱${coupon.criteria_details?.discount_value} OFF`
                                    : `FREE ITEM`
                                }
                            </span>
                            {coupon.criteria_details?.min_spend > 0 && (
                                <span className="text-xs text-gray-400">Min: ₱{coupon.criteria_details?.min_spend}</span>
                            )}
                        </div>
                    </TableCell>

                    {/* Expiration Column */}
                    <TableCell className="text-sm text-gray-600">
                        {formatDate(coupon.criteria_details?.valid_to)}
                    </TableCell>

                    <TableCell>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusBadge(coupon.status, coupon.usage_limit, coupon.times_used)}`}>
                        {isSoldOut ? "Redeemed" : coupon.status}
                      </span>
                    </TableCell>

                    <TableCell className="text-right text-gray-600">
                        <div className="flex flex-col items-end">
                            <span>{coupon.times_used} Used Total</span>
                            {coupon.usage_limit !== null ? (
                                <span className={`text-xs font-bold ${isSoldOut ? 'text-red-600' : 'text-green-600'}`}>
                                    {Math.max(0, coupon.usage_limit - coupon.times_used)} Remaining
                                </span>
                            ) : (
                                <span className="text-xs text-gray-400">Unlimited</span>
                            )}
                        </div>
                    </TableCell>

                    <TableCell className="text-right">
                        <div className="flex justify-end">
                             <DeleteConfirmDialog 
                                title="Delete Coupon"
                                description={`Are you sure you want to delete coupon "${coupon.code}"? This cannot be undone.`}
                                onConfirm={() => handleDelete(coupon.id)} 
                             />
                        </div>
                    </TableCell>
                  </TableRow>
                );
            })}
            {coupons.length === 0 && (
                <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-gray-400">
                        No active coupons found. Create one to get started.
                    </TableCell>
                </TableRow>
            )}
          </TableBody>
        </Table>

        {/* PAGINATION CONTROLS */}
        {coupons.length > 0 && (
            <div className="flex items-center justify-end space-x-2 py-4 mt-2 border-t border-gray-100">
                <Button
                    variant="outline"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => handlePageChange(1)}
                    disabled={currentPage === 1}
                >
                    <ChevronsLeft className="h-4 w-4" />
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                >
                    <ChevronLeft className="h-4 w-4" />
                </Button>
                
                <span className="text-sm text-gray-600 px-2">
                    Page {currentPage} of {totalPages}
                </span>

                <Button
                    variant="outline"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                >
                    <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => handlePageChange(totalPages)}
                    disabled={currentPage === totalPages}
                >
                    <ChevronsRight className="h-4 w-4" />
                </Button>
            </div>
        )}
      </div>

      <AddDiscountDialog 
        open={isCreateOpen} 
        onOpenChange={setIsCreateOpen}
        onSaved={fetchData}
        products={products} 
      />

    </div>
  );
};

export default PromoManagement;