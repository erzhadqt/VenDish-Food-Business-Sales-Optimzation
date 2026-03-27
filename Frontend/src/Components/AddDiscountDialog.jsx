import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/Components/ui/dialog";
import { Button } from "../Components/ui/button";
import { Input } from "../Components/ui/input";
import { Label } from "../Components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../Components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "../Components/ui/alert";
import { Wand2, Tag, CalendarClock, Hash, AlertCircle } from "lucide-react"; 
import api from "../api"; 

export default function AddDiscountDialog({ open, onOpenChange, onSaved, products = [] }) {
  const [code, setCode] = useState("");
  const [claimLimit, setClaimLimit] = useState("");
  const [ruleName, setRuleName] = useState(""); 
  const [discountType, setDiscountType] = useState("percentage"); 
  const [discountValue, setDiscountValue] = useState("");
  const [minSpend, setMinSpend] = useState("0");
  const [selectedFreeProduct, setSelectedFreeProduct] = useState("");
  const [targetProductId, setTargetProductId] = useState("all"); 
  const [validTo, setValidTo] = useState(""); 

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const getMinDateTime = () => {
    const now = new Date();
    // Adjust for local timezone offset so it matches the user's clock
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    // Slice at 16 to get "YYYY-MM-DDTHH:mm" format required by datetime-local
    return now.toISOString().slice(0, 16);
  };

  const generateRandomCode = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let result = "";
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setCode(result);
  };

  // 🔴 Strict sanitization for Claim Limit (Whole numbers only)
  const handleClaimLimitChange = (e) => {
    let val = e.target.value.replace(/[^0-9]/g, '');
    setClaimLimit(val);
  };

  // 🔴 Strict sanitization for Discount Value (Allows decimals)
  const handleDiscountValueChange = (e) => {
    let val = e.target.value.replace(/[^0-9.]/g, '');
    const parts = val.split('.');
    if (parts.length > 2) {
      val = parts[0] + '.' + parts.slice(1).join('');
    }
    setDiscountValue(val);
  };

  // 🔴 Strict sanitization for Minimum Spend (Allows decimals)
  const handleMinSpendChange = (e) => {
    let val = e.target.value.replace(/[^0-9.]/g, '');
    const parts = val.split('.');
    if (parts.length > 2) {
      val = parts[0] + '.' + parts.slice(1).join('');
    }
    setMinSpend(val);
  };

  const handleSave = async () => {
    setError(null);

    if(!code || !ruleName) { setError("Please fill in required fields"); return; }
    if(discountType !== 'free_item' && !discountValue) { setError("Enter discount value"); return; }

    if (validTo && new Date(validTo) < new Date()) {
      setError("The validity period cannot be set in the past.");
      return;
    }

    setLoading(true);

    try {
      let formattedValidTo = null;
      if (validTo) {
          formattedValidTo = new Date(validTo).toISOString(); 
      }

      // STEP 1: Create Criteria
      const criteriaPayload = {
        name: ruleName,
        discount_type: discountType,
        min_spend: parseFloat(minSpend) || 0,
        discount_value: discountType === 'free_item' ? 0 : parseFloat(discountValue),
        free_product: discountType === 'free_item' ? selectedFreeProduct : null,
        target_product: targetProductId === "all" ? null : targetProductId,
        
        valid_from: new Date().toISOString(), 
        valid_to: formattedValidTo 
      };

      const criteriaRes = await api.post("/firstapp/coupons-criteria/", criteriaPayload);
      const newCriteriaId = criteriaRes.data.id;

      // STEP 2: Create Coupon
      await api.post("/firstapp/coupons/", {
        code: code.toUpperCase(),
        criteria_id: newCriteriaId,
        status: "Active",
        usage_limit: claimLimit ? parseInt(claimLimit) : null,
        claim_limit: claimLimit ? parseInt(claimLimit) : null
      });

      onSaved(); 
      onOpenChange(false);
      
      // Reset Form
      setCode(""); setClaimLimit(""); setRuleName("");
      setMinSpend("0"); setSelectedFreeProduct(""); setTargetProductId("all");
      setValidTo(""); setError(null);

    } catch (err) {
      console.error(err);
      setError("Error creating coupon. Code might already exist.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(val) => { if(!val) setError(null); onOpenChange(val); }}>

      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto z-50">
        <DialogHeader>
          <DialogTitle>Create Coupon</DialogTitle>
          <DialogDescription>Define code, discount rules, and usage limits.</DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
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
                          <Label>Code</Label>
                          <div className="flex gap-2">
                              <Input placeholder="CODE123" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} className="uppercase font-mono tracking-widest"/>
                              <Button variant="outline" size="icon" onClick={generateRandomCode}><Wand2 className="h-4 w-4" /></Button>
                          </div>
                      </div>
                      
                      <div className="grid gap-2">
                        <div className="space-y-1">
                            <Label className="flex items-center gap-1">Total Claim & Usage Limit <Hash size={12}/></Label>
                            {/* 🔴 Updated Claim Limit Input */}
                            <Input 
                              type="text" 
                              inputMode="numeric"
                              placeholder="e.g. 100" 
                              value={claimLimit} 
                              onChange={handleClaimLimitChange}
                              maxLength={10} 
                            />
                            <p className="text-[10px] text-gray-500">Leave blank for unlimited. This limits how many total users can claim and use this code.</p>
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
                      <Label>Valid Until</Label>
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
                    <Label>Promotion Name</Label>
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
                        <Select value={discountType} onValueChange={setDiscountType}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="percentage">Percentage</SelectItem>
                                <SelectItem value="fixed">Fixed Amount</SelectItem>
                                <SelectItem value="free_item">Free Item</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid gap-2">
                        <Label>{discountType === 'free_item' ? 'Select Item' : 'Value'}</Label>
                        {discountType === 'free_item' ? (
                            <Select value={selectedFreeProduct} onValueChange={setSelectedFreeProduct}>
                                <SelectTrigger><SelectValue placeholder="Pick Item" /></SelectTrigger>
                                <SelectContent>{products.map(p => <SelectItem key={p.id} value={String(p.id)}>{p.product_name}</SelectItem>)}</SelectContent>
                            </Select>
                        ) : (
                            <Input
                              type="text" 
                              inputMode="decimal"
                              placeholder="10" 
                              value={discountValue} 
                              onChange={handleDiscountValueChange}
                              maxLength={10}
                            />
                        )}
                    </div>
                </div>
                <div className="grid gap-2">
                    <Label>Minimum Spend</Label>
                    <div className="relative">
                        <span className="absolute left-3 top-2.5 text-gray-500">₱</span>
                        <Input 
                          type="text" 
                          inputMode="decimal"
                          className="pl-7" 
                          value={minSpend} 
                          onChange={handleMinSpendChange}
                          maxLength={10}
                        />
                    </div>
                </div>
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