import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "../../Components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../Components/ui/table";
import { Plus, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, TimerReset, Edit, EllipsisVertical, Search, Filter, ArchiveIcon } from "lucide-react"; 
import api from "../../api";
import AddDiscountDialog from "../../Components/AddDiscountDialog"; 
import { Skeleton } from "../../Components/ui/skeleton";
import { Input } from "../../Components/ui/input";

import ManagePosLimitDialog from "../../Components/ManagePosLimitDialog";
import SuccessAlert from "../../Components/SuccessAlert";
import EditCouponDialog from "../../Components/EditCouponDialog"; 
import PromoDetailsModal from "../../Components/PromoDetailsModal";
import ManageArchivedCouponsDialog from "../../Components/ManageArchivedCouponsDialog";
import { applyQueryParam, usePersistedQueryState } from "../../utils/usePersistedQueryState";

const PROMO_STATUS_OPTIONS = new Set(["ALL", "Active", "Expired"]);

const parsePositivePage = (value, fallback = 1) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const parseBooleanFlag = (value) => {
  if (typeof value !== "string") return false;
  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
};

const PromoManagement = () => {
  const [coupons, setCoupons] = useState([]);
  const [products, setProducts] = useState([]); 
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Pagination State
  const [currentPage, setCurrentPage] = usePersistedQueryState({
    searchParams,
    queryKey: "page",
    storageKey: "promoMgmt_page",
    defaultValue: 1,
    parse: (rawValue, fallback) => parsePositivePage(rawValue, fallback),
    serialize: (value) => String(value),
  });
  const itemsPerPage = 5; 
  
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // --- EDIT MODAL STATES ---
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedCoupon, setSelectedCoupon] = useState(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedCouponForDetails, setSelectedCouponForDetails] = useState(null);

  // --- LIMIT MODAL STATES ---
  const [isManageLimitOpen, setIsManageLimitOpen] = useState(false);
  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);
  const [maxCouponsLimit, setMaxCouponsLimit] = useState(2);
  const [loading, setLoading] = useState(true);

  // +++ SUCCESS MESSAGE STATE +++
  const [successMessage, setSuccessMessage] = useState("");
  const [statusFilter, setStatusFilter] = usePersistedQueryState({
    searchParams,
    queryKey: "status",
    storageKey: "promoMgmt_status",
    defaultValue: "ALL",
    parse: (rawValue, fallback) => (PROMO_STATUS_OPTIONS.has(rawValue) ? rawValue : fallback),
  });
  const [searchQuery, setSearchQuery] = usePersistedQueryState({
    searchParams,
    queryKey: "search",
    storageKey: "promoMgmt_search",
    defaultValue: "",
  });
  const [showExpiringSoonOnly, setShowExpiringSoonOnly] = usePersistedQueryState({
    searchParams,
    queryKey: "expiringSoon",
    storageKey: "promoMgmt_expiringSoon",
    defaultValue: false,
    parse: (rawValue) => parseBooleanFlag(rawValue),
    serialize: (value) => (value ? "1" : "0"),
  });

  useEffect(() => {
    const params = new URLSearchParams();
    applyQueryParam(params, "search", searchQuery.trim());
    applyQueryParam(params, "status", statusFilter, (value) => value === "ALL");
    applyQueryParam(params, "expiringSoon", showExpiringSoonOnly ? "1" : null);
    applyQueryParam(params, "page", currentPage, (value) => Number(value) <= 1);

    if (params.toString() !== searchParams.toString()) {
      setSearchParams(params, { replace: true });
    }
  }, [
    currentPage,
    searchQuery,
    statusFilter,
    showExpiringSoonOnly,
    searchParams,
    setSearchParams,
  ]);

  const fetchData = async () => {
    setLoading(true);
    try {
        const [couponRes, prodRes, settingsRes] = await Promise.all([
          api.get("/firstapp/coupons/"),
          api.get("/firstapp/products/"),
          api.get(`/settings/?t=${new Date().getTime()}`) 
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

  const handleEditClick = (coupon) => {
    setSelectedCoupon(coupon);
    setIsEditOpen(true);
  };

  const handleDetailsClick = (coupon) => {
    setSelectedCouponForDetails(coupon);
    setIsDetailsOpen(true);
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

  const getStatusBadge = (effectiveStatus) => {
    switch (effectiveStatus) {
        case 'Active': return 'bg-green-100 text-green-700 border-green-200';
        case 'Expired': return 'bg-red-100 text-red-700 border-red-200';
        default: return 'bg-green-100 text-green-700 border-green-200';
    }
  };

  const getEffectiveStatus = (status) => {
    const safeStatus = typeof status === 'string' ? status.toLowerCase() : "";

    // Standardize text cases to match your Dropdown Filter perfectly
    if (safeStatus === "expired") return "Expired";

    // Display all non-expired coupons as Active in this table.
    return "Active";
  };

  const isExpiringSoon = (dateString) => {
    if (!dateString) return false;

    const expiration = new Date(dateString);
    if (Number.isNaN(expiration.getTime())) return false;

    const now = new Date();
    const msDiff = expiration.getTime() - now.getTime();
    if (msDiff < 0) return false;

    const threeDaysMs = 3 * 24 * 60 * 60 * 1000;
    return msDiff <= threeDaysMs;
  };

  const filteredCoupons = coupons.filter((coupon) => {
    const effectiveStatus = getEffectiveStatus(coupon.status);

    if (statusFilter !== "ALL" && effectiveStatus !== statusFilter) {
      return false;
    }

    if (showExpiringSoonOnly && !isExpiringSoon(coupon.criteria_details?.valid_to)) {
      return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      const codeMatch = (coupon.code || "").toLowerCase().includes(q);
      const nameMatch = (coupon.criteria_details?.name || "").toLowerCase().includes(q);
      if (!codeMatch && !nameMatch) {
        return false;
      }
    }

    return true;
  });

  const totalPages = Math.ceil(filteredCoupons.length / itemsPerPage);
  const validCurrentPage = currentPage > totalPages && totalPages > 0 ? totalPages : currentPage;

  const indexOfLastItem = validCurrentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentCoupons = filteredCoupons.slice(indexOfFirstItem, indexOfLastItem);

  const handlePageChange = (page) => {
    setCurrentPage(Math.max(1, page));
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, showExpiringSoonOnly]);

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

            <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => setIsArchiveModalOpen(true)}>
                <ArchiveIcon className="w-4 h-4 mr-1"/>Archive Coupons
            </Button>
            
            <Button onClick={() => setIsCreateOpen(true)} className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2"/> Create New Coupon
            </Button>
        </div>
      </div>

      {successMessage && <SuccessAlert message={successMessage} />}

      <div className="bg-white rounded-lg shadow p-4 border border-gray-200 flex flex-col h-full">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 mb-4">
          <h2 className="text-lg font-semibold text-gray-800">Active Coupons</h2>

          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by promo name or code"
                className="pl-9 sm:w-80"
              />
            </div>

            <div className="relative">
              <Filter size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-9 rounded-md border border-gray-200 bg-white pl-9 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="ALL">All Status</option>
                <option value="Active">Active</option>
                <option value="Expired">Expired</option>
              </select>
            </div>

            <button
              type="button"
              onClick={() => setShowExpiringSoonOnly((prev) => !prev)}
              className={`h-9 rounded-md border px-3 text-sm font-medium transition-colors ${
                showExpiringSoonOnly
                  ? "border-red-200 bg-red-50 text-red-700"
                  : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
              }`}
              title="Toggle expiring soon promos only"
            >
              <span className="inline-flex items-center gap-2">
                <span
                  className={`h-2.5 w-2.5 rounded-full ${
                    showExpiringSoonOnly ? "bg-red-500" : "bg-gray-300"
                  }`}
                />
                Expiring soon
              </span>
            </button>
          </div>
        </div>

        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-10 w-full" />
            {Array.from({ length: itemsPerPage }).map((_, index) => (
              <div key={index} className="grid grid-cols-6 gap-3">
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
              <TableHead>Expiration</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Stats (Claims / Uses)</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {currentCoupons.map((coupon) => {
                const effectiveStatus = getEffectiveStatus(coupon.status);
                const isSoldOut = coupon.usage_limit !== null && Number(coupon.times_used) >= Number(coupon.usage_limit);

                return (
                  <TableRow key={coupon.id}>
                    <TableCell className="font-mono font-bold text-blue-600 tracking-wider">
                      {coupon.code || "Generated on claim"}
                    </TableCell>
                    
                    <TableCell className="font-medium text-gray-700">
                        {coupon.criteria_details?.name || "No Rule Attached"}
                    </TableCell>

                    <TableCell className="text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <span>{formatDate(coupon.criteria_details?.valid_to)}</span>
                        {isExpiringSoon(coupon.criteria_details?.valid_to) && (
                        <span className="text-[10px] font-semibold text-red-600">Expiring soon</span>
                        )}
                      </div>
                    </TableCell>

                    <TableCell>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusBadge(effectiveStatus)}`}>
                        {effectiveStatus}
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
                            {coupon.usage_limit !== null && effectiveStatus !== 'Expired' && (
                              <span className={`text-[10px] font-bold mt-1 ${isSoldOut ? 'text-red-600' : 'text-green-600'}`}>
                                  {Math.max(0, coupon.usage_limit - coupon.times_used)} POS Uses Left
                              </span>
                          )}
                        </div>
                    </TableCell>

                    <TableCell className="text-right">
                        <div className="flex justify-end items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-9 w-9 text-gray-600 hover:text-gray-800 hover:bg-gray-100"
                              onClick={() => handleDetailsClick(coupon)}
                              title="View Promo Details"
                            >
                              <EllipsisVertical className="w-5 h-5"/>
                            </Button>

                             <Button variant="ghost" size="icon" className="h-9 w-9 text-blue-600 hover:text-blue-800 hover:bg-blue-50" onClick={() => handleEditClick(coupon)}>
                                <Edit className="w-5 h-5"/>
                             </Button>
                        </div>
                    </TableCell>
                  </TableRow>
                );
            })}
            {filteredCoupons.length === 0 && (
                <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-gray-400">
                  No coupons found for the current filter/search.
                    </TableCell>
                </TableRow>
            )}
          </TableBody>
        </Table>
        )}

        {/* PAGINATION CONTROLS */}
        {!loading && filteredCoupons.length > 0 && (
            <div className="flex items-center justify-end space-x-2 py-4 mt-2 border-t border-gray-100">
                <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => handlePageChange(1)} disabled={currentPage === 1}>
                    <ChevronsLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => handlePageChange(Math.max(1, validCurrentPage - 1))} disabled={validCurrentPage === 1}>
                    <ChevronLeft className="h-4 w-4" />
                </Button>
                
                <span className="text-sm text-gray-600 px-2">Page {validCurrentPage} of {totalPages || 1}</span>

                <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => handlePageChange(Math.min(totalPages, validCurrentPage + 1))} disabled={validCurrentPage === totalPages}>
                    <ChevronRight className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => handlePageChange(totalPages)} disabled={validCurrentPage === totalPages}>
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

      <EditCouponDialog 
        open={isEditOpen} 
        onOpenChange={setIsEditOpen} 
        coupon={selectedCoupon} 
        onSaved={() => {
            fetchData();
            showSuccess("Coupon updated successfully!");
        }}
        onArchived={(couponCode) => {
            fetchData();
            showSuccess(`Coupon ${couponCode} archived successfully.`);
        }}
      />

      <ManageArchivedCouponsDialog
        open={isArchiveModalOpen}
        onOpenChange={setIsArchiveModalOpen}
        onSaved={fetchData}
      />

      <PromoDetailsModal
        open={isDetailsOpen}
        onOpenChange={setIsDetailsOpen}
        coupon={selectedCouponForDetails}
        products={products}
      />

    </div>
  );
};

export default PromoManagement;