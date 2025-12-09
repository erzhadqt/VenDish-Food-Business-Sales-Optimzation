import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/Components/ui/table";
import { Plus } from "lucide-react"; 
import api from "../../api";
import AddDiscountDialog from "../../Components/AddDiscountDialog"; 

const PromoManagement = () => {
  const [coupons, setCoupons] = useState([]);
  const [products, setProducts] = useState([]); 
  
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

  const getStatusBadge = (status, limit) => {
    // If explicit status is Active but limit is 0, consider it Sold Out/Redeemed visually
    const effectiveStatus = (limit === 0 && status === 'Active') ? 'Redeemed' : status;

    switch (effectiveStatus) {
        case 'Active':
            return 'bg-green-100 text-green-700 border-green-200';
        case 'Redeemed':
            return 'bg-gray-200 text-gray-700 border-gray-300';
        case 'Expired':
            return 'bg-red-100 text-red-700 border-red-200';
        default:
            return 'bg-gray-100 text-gray-600 border-gray-200';
    }
  };

  return (
    <div className="p-6 space-y-8 bg-gray-50 min-h-screen">
      
      {/* HEADER & ACTIONS */}
      <div className="flex justify-between items-center">
        <div>
            <h1 className="text-2xl font-bold text-gray-800">Coupon Management</h1>
            <p className="text-gray-500 text-sm">Create and track dynamic discount codes.</p>
        </div>
        
        {/* Action Button */}
        <Button onClick={() => setIsCreateOpen(true)} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2"/> Create New Coupon
        </Button>
      </div>

      {/* ACTIVE COUPONS TABLE */}
      <div className="bg-white rounded-lg shadow p-4 border border-gray-200">
        <h2 className="text-lg font-semibold mb-4 text-gray-800">Active Coupons</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Promo Name</TableHead>
              <TableHead>Discount Details</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Usage</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {coupons.map((coupon) => (
              <TableRow key={coupon.id}>
                {/* Code */}
                <TableCell className="font-mono font-bold text-blue-600 tracking-wider">
                    {coupon.code}
                </TableCell>
                
                {/* Promo Name */}
                <TableCell className="font-medium text-gray-700">
                    {coupon.criteria_details?.name || "No Rule Attached"}
                </TableCell>

                {/* Formatted Details */}
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

                {/* Status */}
                <TableCell>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusBadge(coupon.status, coupon.usage_limit)}`}>
                    {/* Visual Override: If limit is 0, show Redeemed even if DB lag */}
                    {coupon.usage_limit === 0 ? "Redeemed" : coupon.status}
                  </span>
                </TableCell>

                {/* Usage */}
                <TableCell className="text-right text-gray-600">
                    <div className="flex flex-col items-end">
                        <span>{coupon.times_used} Used Total</span>
                        {coupon.usage_limit !== null ? (
                            <span className={`text-xs font-bold ${coupon.usage_limit === 0 ? 'text-red-600' : 'text-green-600'}`}>
                                {coupon.usage_limit} Remaining
                            </span>
                        ) : (
                            <span className="text-xs text-gray-400">Unlimited</span>
                        )}
                    </div>
                </TableCell>
              </TableRow>
            ))}
            {coupons.length === 0 && (
                <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-gray-400">
                        No active coupons found. Create one to get started.
                    </TableCell>
                </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* THE MERGED MODAL */}
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