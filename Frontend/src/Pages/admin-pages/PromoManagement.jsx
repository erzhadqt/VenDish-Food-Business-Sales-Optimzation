import React, { useState, useEffect } from "react";
import { Button } from "../../Components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../Components/ui/table";
import { Plus, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, TimerReset, Edit } from "lucide-react"; 
import api from "../../api";
import AddDiscountDialog from "../../Components/AddDiscountDialog"; 
import DeleteConfirmDialog from "../../Components/DeleteConfirmDialog";
import { Skeleton } from "../../Components/ui/skeleton";

import ManagePosLimitDialog from "../../Components/ManagePosLimitDialog";
import SuccessAlert from "../../Components/SuccessAlert";
import EditCouponDialog from "../../Components/EditCouponDialog"; // +++ IMPORT EDIT DIALOG +++

const PromoManagement = () => {
  const [coupons, setCoupons] = useState([]);
  const [products, setProducts] = useState([]); 
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5; 
  
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // --- EDIT MODAL STATES ---
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedCoupon, setSelectedCoupon] = useState(null);

  // --- LIMIT MODAL STATES ---
  const [isManageLimitOpen, setIsManageLimitOpen] = useState(false);
  const [maxCouponsLimit, setMaxCouponsLimit] = useState(2);
  const [loading, setLoading] = useState(true);

  // +++ SUCCESS MESSAGE STATE +++
  const [successMessage, setSuccessMessage] = useState("");

  const fetchData = async () => {
    setLoading(true);
    try {
        const [couponRes, prodRes, settingsRes] = await Promise.all([
          api.get("/firstapp/coupons/"),
          api.get("/firstapp/products/"),
          api.get(`/settings/?t=${new Date().getTime()}`) // Fetch current limit
        ]);
        
        setCoupons(couponRes.data);
        setProducts(prodRes.data);
        
        if (settingsRes.data && settingsRes.data.max_coupons_per_order !== undefined) {
            setMaxCouponsLimit(settingsRes.data.max_coupons_per_order);
        }
    } catch (error) {
        console.error("Failed to load promo data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const showSuccess = (message) => {
    setSuccessMessage(message);
    setTimeout(() => {
      setSuccessMessage("");
    }, 3000); 
  };

  const handleDelete = async (id) => {
    try {
        await api.delete(`/firstapp/coupons/${id}/`);
        setCoupons((prev) => prev.filter((coupon) => coupon.id !== id));
        showSuccess("Coupon deleted successfully!"); 
    } catch (error) {
        console.error("Failed to delete coupon:", error);
        alert("Failed to delete coupon. It may have dependencies.");
    }
  };

  const handleEditClick = (coupon) => {
    setSelectedCoupon(coupon);
    setIsEditOpen(true);
  };

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

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentCoupons = coupons.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(coupons.length / itemsPerPage);

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  return (
    <div className="p-6 space-y-6 min-h-screen">
      
      <div className="flex justify-between items-center">
        <div>
            <h1 className="text-2xl font-bold text-gray-800">Coupon Management</h1>
            <p className="text-gray-500 text-sm">Create and track dynamic discount codes.</p>
        </div>

        <div className="flex gap-2">
            <Button onClick={() => setIsManageLimitOpen(true)} className="bg-blue-600 hover:bg-blue-700">
                <TimerReset className="w-4 h-4 mr-1"/> Manage usable Coupons for POS
            </Button>
            
            <Button onClick={() => setIsCreateOpen(true)} className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2"/> Create New Coupon
            </Button>
        </div>
      </div>

      {successMessage && <SuccessAlert message={successMessage} />}

      <div className="bg-white rounded-lg shadow p-4 border border-gray-200 flex flex-col h-full">
        <h2 className="text-lg font-semibold mb-4 text-gray-800">Active Coupons</h2>
        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-10 w-full" />
            {Array.from({ length: itemsPerPage }).map((_, index) => (
              <div key={index} className="grid grid-cols-7 gap-3">
                <Skeleton className="h-5 w-full" />
                <Skeleton className="h-5 w-full" />
                <Skeleton className="h-5 w-full" />
                <Skeleton className="h-5 w-full" />
                <Skeleton className="h-5 w-full" />
                <Skeleton className="h-5 w-full" />
                <Skeleton className="h-5 w-full" />
              </div>
            ))}
          </div>
        ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Promo Name</TableHead>
              <TableHead>Discount Details</TableHead>
              <TableHead>Expiration</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Stats (Claims / Uses)</TableHead>
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

                    <TableCell className="text-sm text-gray-600">
                        {formatDate(coupon.criteria_details?.valid_to)}
                    </TableCell>

                    <TableCell>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusBadge(coupon.status, coupon.usage_limit, coupon.times_used)}`}>
                        {isSoldOut ? "Redeemed" : coupon.status}
                      </span>
                    </TableCell>

                    <TableCell className="text-right text-gray-600">
                        <div className="flex flex-col items-end gap-1">
                            <div className="text-xs">
                                <span className="font-semibold text-gray-800">Claims:</span> {coupon.times_claimed || 0} / {coupon.claim_limit !== null ? coupon.claim_limit : "∞"}
                            </div>
                            <div className="text-xs">
                                <span className="font-semibold text-gray-800">POS Uses:</span> {coupon.times_used || 0} / {coupon.usage_limit !== null ? coupon.usage_limit : "∞"}
                            </div>
                            {coupon.usage_limit !== null && (
                                <span className={`text-[10px] font-bold mt-1 ${isSoldOut ? 'text-red-600' : 'text-green-600'}`}>
                                    {Math.max(0, coupon.usage_limit - coupon.times_used)} POS Uses Left
                                </span>
                            )}
                        </div>
                    </TableCell>

                    {/* +++ UPDATED TABLE CELL WITH EDIT BUTTON +++ */}
                    <TableCell className="text-right">
                        <div className="flex justify-end items-center gap-1">
                             <Button variant="ghost" size="icon" className="h-9 w-9 text-blue-600 hover:text-blue-800 hover:bg-blue-50" onClick={() => handleEditClick(coupon)}>
                                <Edit className="w-5 h-5"/>
                             </Button>

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
        )}

        {/* PAGINATION CONTROLS */}
        {!loading && coupons.length > 0 && (
            <div className="flex items-center justify-end space-x-2 py-4 mt-2 border-t border-gray-100">
                <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => handlePageChange(1)} disabled={currentPage === 1}>
                    <ChevronsLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => handlePageChange(Math.max(1, currentPage - 1))} disabled={currentPage === 1}>
                    <ChevronLeft className="h-4 w-4" />
                </Button>
                
                <span className="text-sm text-gray-600 px-2">Page {currentPage} of {totalPages}</span>

                <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages}>
                    <ChevronRight className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => handlePageChange(totalPages)} disabled={currentPage === totalPages}>
                    <ChevronsRight className="h-4 w-4" />
                </Button>
            </div>
        )}
      </div>

      <AddDiscountDialog 
        open={isCreateOpen} 
        onOpenChange={setIsCreateOpen}
        onSaved={() => {
            fetchData();
            showSuccess("Coupon created successfully!"); 
        }}
        products={products} 
      />

      <ManagePosLimitDialog 
        open={isManageLimitOpen} 
        onOpenChange={setIsManageLimitOpen} 
        currentLimit={maxCouponsLimit} 
        onSaved={fetchData} 
      />

      {/* +++ ADDED THE EDIT DIALOG HERE +++ */}
      <EditCouponDialog 
        open={isEditOpen} 
        onOpenChange={setIsEditOpen} 
        coupon={selectedCoupon} 
        onSaved={() => {
            fetchData();
            showSuccess("Coupon updated successfully!");
        }}
      />

    </div>
  );
};

export default PromoManagement;