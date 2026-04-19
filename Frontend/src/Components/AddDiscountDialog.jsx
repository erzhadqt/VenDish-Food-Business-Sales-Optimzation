import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/Components/ui/dialog";
import { Button } from "../Components/ui/button";
import { Input } from "../Components/ui/input";
import { Label } from "../Components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../Components/ui/select";
import { Alert, AlertDescription } from "../Components/ui/alert";
import { Tag, CalendarClock, Hash, AlertCircle } from "lucide-react"; 
import api from "../api"; 

export default function AddDiscountDialog({ open, onOpenChange, onSaved, products = [] }) {
  const [claimLimit, setClaimLimit] = useState("");
  const [targetAudience, setTargetAudience] = useState("all_users");
  const [minCompletedOrders, setMinCompletedOrders] = useState("");
  const [ruleName, setRuleName] = useState(""); 
  const [discountType, setDiscountType] = useState("percentage"); 
  const [discountValue, setDiscountValue] = useState("");
  const [maxDiscountAmount, setMaxDiscountAmount] = useState("");
  const [minSpend, setMinSpend] = useState(""); 
  const [selectedFreeProduct, setSelectedFreeProduct] = useState("");
  const [targetProductId, setTargetProductId] = useState("all"); 
  const [validTo, setValidTo] = useState(""); 

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const getMinDateTime = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  };

  const handleClaimLimitChange = (e) => {
    let val = e.target.value.replace(/[^0-9]/g, '');
    val = val.replace(/^0+/, ''); 
    setClaimLimit(val);
  };

  const handleMinCompletedOrdersChange = (e) => {
    let val = e.target.value.replace(/[^0-9]/g, '');
    val = val.replace(/^0+/, '');
    setMinCompletedOrders(val);
  };

  const handleDiscountValueChange = (e) => {
    let val = e.target.value.replace(/[^0-9.]/g, '');
    const parts = val.split('.');
    if (parts.length > 2) {
      val = parts[0] + '.' + parts.slice(1).join('');
    }
    
    if (/^0+$/.test(val)) {
      val = '';
    } else if (val.length > 1 && val.startsWith('0') && !val.startsWith('0.')) {
      val = val.replace(/^0+/, '');
    }
    
    if (discountType === 'percentage' && val !== '') {
      if (parseFloat(val) > 100) {
        val = '100';
      }
    }
    
    setDiscountValue(val);
  };

  const handleDiscountTypeChange = (newType) => {
    setDiscountType(newType);
    if (newType === 'percentage' && discountValue !== "") {
      if (parseFloat(discountValue) > 100) {
        setDiscountValue("100");
      }
    } else if (newType === 'free_item') {
      setDiscountValue(""); 
    }

    if (newType !== 'percentage') {
      setMaxDiscountAmount("");
    }
  };

  const handleMaxDiscountAmountChange = (e) => {
    let val = e.target.value.replace(/[^0-9.]/g, '');
    const parts = val.split('.');
    if (parts.length > 2) {
      val = parts[0] + '.' + parts.slice(1).join('');
    }

    if (/^0+$/.test(val)) {
      val = '';
    } else if (val.length > 1 && val.startsWith('0') && !val.startsWith('0.')) {
      val = val.replace(/^0+/, '');
    }

    setMaxDiscountAmount(val);
  };

  const handleMinSpendChange = (e) => {
    let val = e.target.value.replace(/[^0-9.]/g, '');
    const parts = val.split('.');
    if (parts.length > 2) {
      val = parts[0] + '.' + parts.slice(1).join('');
    }
    
    if (/^0+$/.test(val)) {
      val = '';
    } else if (val.length > 1 && val.startsWith('0') && !val.startsWith('0.')) {
      val = val.replace(/^0+/, '');
    }
    
    setMinSpend(val);
  };

  const handleSave = async () => {
    setError(null);

    // 🔴 1. Basic validation for text inputs
    if(!ruleName) { setError("Please fill in all required fields (Promotion Name and Date)."); return; }
    if(discountType !== 'free_item' && !discountValue) { setError("Please enter a discount value."); return; }
    if(discountType === 'free_item' && !selectedFreeProduct) { setError("Please select the free item for this coupon."); return; }
    if(discountType === 'percentage' && maxDiscountAmount && parseFloat(maxDiscountAmount) <= 0) { setError("Maximum discount cap must be greater than zero."); return; }

    // 🔴 2. Strict validation for claim and usage limit
    if(!claimLimit || parseInt(claimLimit) <= 0) {
      setError("Please specify a valid Claim & Usage Limit. It cannot be left blank or zero.");
      return;
    }

    if (targetAudience === "frequent_customers" && (!minCompletedOrders || parseInt(minCompletedOrders, 10) <= 0)) {
      setError("Please set a valid minimum completed order count for frequent-customer targeting.");
      return;
    }

    // 🔴 3. NEW: Strict Date validation (cannot be blank)
    if (!validTo) {
      setError("Please specify a 'Valid Until' date. It cannot be left blank.");
      return;
    }

    if (new Date(validTo) < new Date()) {
      setError("The validity period cannot be set in the past.");
      return;
    }

    setLoading(true);

    try {
      let formattedValidTo = null;
      if (validTo) {
          formattedValidTo = new Date(validTo).toISOString(); 
      }

      const criteriaPayload = {
        name: ruleName,
        discount_type: discountType,
        min_spend: parseFloat(minSpend) || 0, 
        discount_value: discountType === 'free_item' ? 0 : parseFloat(discountValue),
        max_discount_amount: discountType === 'percentage' && maxDiscountAmount !== '' ? parseFloat(maxDiscountAmount) : null,
        free_product: discountType === 'free_item' ? selectedFreeProduct : null,
        target_product: targetProductId === "all" ? null : targetProductId,
        valid_to: formattedValidTo 
      };

      const criteriaRes = await api.post("/firstapp/coupons-criteria/", criteriaPayload);
      const newCriteriaId = criteriaRes.data.id;

      // Ensure parseInt is safely applied, we already verified it's present above
      const parsedLimit = parseInt(claimLimit, 10);
      const parsedMinOrders = parseInt(minCompletedOrders || "0", 10) || 0;

      await api.post("/firstapp/coupons/", {
        criteria_id: newCriteriaId,
        status: "Active",
        usage_limit: parsedLimit,
        claim_limit: parsedLimit,
        target_audience: targetAudience,
        min_completed_orders: targetAudience === "frequent_customers" ? parsedMinOrders : 0,
      });

      onSaved(); 
      onOpenChange(false);
      
      // Reset State
      setClaimLimit(""); setRuleName("");
      setMinSpend(""); setSelectedFreeProduct(""); setTargetProductId("all");
      setTargetAudience("all_users"); setMinCompletedOrders("");
      setMaxDiscountAmount("");
      setValidTo(""); setError(null);

    } catch (err) {
      console.error(err);
      setError("Error creating coupon. Please verify all required fields and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(val) => { if(!val) setError(null); onOpenChange(val); }}>

      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto z-50">
        <DialogHeader>
          <DialogTitle>Create Coupon</DialogTitle>
          <DialogDescription>Define audience, discount rules, and usage limits.</DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
            {/* Left Column */}
            <div className="space-y-6">
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-100 space-y-3">
                   <div className="flex items-center gap-2 mb-2">
                      <Tag className="w-4 h-4 text-blue-600"/>
                      <h3 className="font-semibold text-sm text-gray-700">1. Coupon Details</h3>
                   </div>
                   <div className="grid gap-4">
                      <div className="space-y-1">
                        <Label>Visible To <span className="text-red-500">*</span></Label>
                        <Select value={targetAudience} onValueChange={setTargetAudience}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all_users">All Users</SelectItem>
                            <SelectItem value="frequent_customers">Frequent Customers</SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-[10px] text-gray-500 pt-1">
                          Frequent customers are users with enough completed POS orders.
                        </p>
                      </div>

                      {targetAudience === "frequent_customers" && (
                        <div className="space-y-1">
                          <Label>Minimum Completed Orders <span className="text-red-500">*</span></Label>
                          <Input
                            type="text"
                            inputMode="numeric"
                            placeholder="e.g. 5"
                            value={minCompletedOrders}
                            onChange={handleMinCompletedOrdersChange}
                            maxLength={6}
                          />
                        </div>
                      )}
                      
                      <div className="grid gap-2">
                        <div className="space-y-1">
                          <Label className="flex items-center gap-1">
                            Total Claim & Usage Limit <span className="text-red-500">*</span> <Hash size={12}/>
                          </Label>
                          <Input 
                            type="text" 
                            inputMode="numeric"
                            placeholder="e.g. 100" 
                            value={claimLimit} 
                            onChange={handleClaimLimitChange}
                            maxLength={10} 
                          />
                          <p className="text-[10px] text-gray-500 pt-1">Limits how many total users can claim and use this coupon.</p>
                        </div>
                      </div>
                   </div>
                </div>  

                {/* Validity Section */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 border-b pb-2">
                      <CalendarClock className="w-4 h-4 text-orange-600"/>
                      <h3 className="font-semibold text-sm text-gray-700">3. Validity Period</h3>
                  </div>
                  <div className="grid gap-2">
                      {/* 🔴 NEW: Added the red required asterisk */}
                      <Label>Valid Until <span className="text-red-500">*</span></Label>
                      <Input 
                          type="datetime-local" 
                          value={validTo} 
                          onChange={(e) => setValidTo(e.target.value)} 
                          min={getMinDateTime()}
                      />
                      <p className="text-[10px] text-gray-400">Coupon is valid starting immediately upon creation.</p>
                  </div>
                </div>
            </div>

            {/* Right Column (Rules) */}
            <div className="space-y-4">
                <div className="flex items-center gap-2 border-b pb-2">
                    <h3 className="font-semibold text-sm text-gray-700">2. Discount Rules</h3>
                </div>
                <div className="grid gap-2">
                    <Label>Promotion Name <span className="text-red-500">*</span></Label>
                    <Input placeholder="e.g., Summer Sale" value={ruleName} onChange={(e) => setRuleName(e.target.value)}/>
                </div>
                <div className="grid gap-2">
                    <Label>Applicable Product</Label>
                    <Select value={targetProductId} onValueChange={setTargetProductId}>
                        <SelectTrigger><SelectValue placeholder="Select Product" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all"><span className="font-bold">Entire Order</span></SelectItem>
                            {products.map(p => (<SelectItem key={p.id} value={String(p.id)}>{p.product_name}</SelectItem>))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                        <Label>Discount Type</Label>
                        <Select value={discountType} onValueChange={handleDiscountTypeChange}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="percentage">Percentage</SelectItem>
                                <SelectItem value="fixed">Fixed Amount</SelectItem>
                                <SelectItem value="free_item">Free Item</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid gap-2">
                        <Label>{discountType === 'percentage' ? 'Percentage %' : discountType === 'free_item' ? 'Select Item' : 'Value'} <span className="text-red-500">*</span></Label>
                        {discountType === 'free_item' ? (
                            <Select value={selectedFreeProduct} onValueChange={setSelectedFreeProduct}>
                                <SelectTrigger><SelectValue placeholder="Pick Item" /></SelectTrigger>
                                <SelectContent>{products.map(p => <SelectItem key={p.id} value={String(p.id)}>{p.product_name}</SelectItem>)}</SelectContent>
                            </Select>
                        ) : (
                            <Input
                              type="text" 
                              inputMode="decimal"
                              placeholder={discountType === 'percentage' ? "e.g. 15" : "e.g. 100.00"}
                              value={discountValue} 
                              onChange={handleDiscountValueChange}
                              maxLength={discountType === 'percentage' ? 5 : 10} 
                            />
                        )}
                    </div>
                </div>
                <div className="grid gap-2">
                    <Label>Minimum Spend</Label>
                    <div className="relative">
                        <span className="absolute left-3 top-2 text-gray-500">₱</span>
                        <Input 
                          type="text" 
                          inputMode="decimal"
                          className="pl-7" 
                          placeholder="0.00"
                          value={minSpend} 
                          onChange={handleMinSpendChange}
                          maxLength={10}
                        />
                    </div>
                </div>
                {discountType === 'percentage' && (
                  <div className="grid gap-2">
                    <Label>Maximum Discount Cap (Optional)</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-gray-500">₱</span>
                      <Input
                        type="text"
                        inputMode="decimal"
                        className="pl-7"
                        placeholder="e.g. 120.00"
                        value={maxDiscountAmount}
                        onChange={handleMaxDiscountAmountChange}
                        maxLength={10}
                      />
                    </div>
                    <p className="text-[10px] text-gray-400">Limits the peso value deducted by this percentage coupon.</p>
                  </div>
                )}
            </div>
        </div>

        <DialogFooter>
           <Button onClick={handleSave} disabled={loading} className="w-full sm:w-auto">
             {loading ? "Creating..." : "Create Coupon"}
           </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}