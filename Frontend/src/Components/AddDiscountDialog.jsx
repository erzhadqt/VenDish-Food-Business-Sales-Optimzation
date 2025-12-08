import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Wand2, Tag, Percent, Coins, Gift, ShoppingBasket, CalendarClock } from "lucide-react"; 
import api from "../api"; 

export default function AddDiscountDialog({ open, onOpenChange, onSaved, products = [] }) {
  // --- Coupon State ---
  const [code, setCode] = useState("");
  
  // --- Criteria (Rule) State ---
  const [ruleName, setRuleName] = useState(""); 
  const [discountType, setDiscountType] = useState("percentage"); 
  const [discountValue, setDiscountValue] = useState("");
  const [minSpend, setMinSpend] = useState("0");
  const [selectedFreeProduct, setSelectedFreeProduct] = useState("");
  const [targetProductId, setTargetProductId] = useState("all"); 

  // --- NEW: Date State ---
  const [validFrom, setValidFrom] = useState("");
  const [validTo, setValidTo] = useState("");

  const [loading, setLoading] = useState(false);

  const generateRandomCode = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let result = "";
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setCode(result);
  };

  const handleSave = async () => {
    if(!code) return alert("Please enter a Coupon Code");
    if(!ruleName) return alert("Please name this promotion rule");
    if(discountType !== 'free_item' && !discountValue) return alert("Please enter a discount value");
    if(discountType === 'free_item' && !selectedFreeProduct) return alert("Please select a free product");

    setLoading(true);

    try {
      // STEP 1: Create Criteria
      const criteriaPayload = {
        name: ruleName,
        discount_type: discountType,
        min_spend: parseFloat(minSpend) || 0,
        discount_value: discountType === 'free_item' ? 0 : parseFloat(discountValue),
        free_product: discountType === 'free_item' ? selectedFreeProduct : null,
        target_product: targetProductId === "all" ? null : targetProductId,
        
        // --- NEW: Send Dates ---
        // If empty string, send null so backend handles it as "Always valid"
        valid_from: validFrom || null,
        valid_to: validTo || null
      };

      const criteriaRes = await api.post("/firstapp/coupons-criteria/", criteriaPayload);
      const newCriteriaId = criteriaRes.data.id;

      // STEP 2: Create Coupon
      await api.post("/firstapp/coupons/", {
        code: code.toUpperCase(),
        criteria_id: newCriteriaId,
        status: "Active"
      });

      onSaved(); 
      onOpenChange(false);
      
      // Reset Form
      setCode("");
      setRuleName("");
      setDiscountValue("");
      setMinSpend("0");
      setSelectedFreeProduct("");
      setTargetProductId("all");
      setValidFrom(""); // Reset Date
      setValidTo("");   // Reset Date

    } catch (err) {
      console.error(err);
      alert("Error creating coupon. Code might already exist.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Coupon</DialogTitle>
          <DialogDescription>Define code, discount rules, and validity.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 py-4">
          
          {/* SECTION 1: THE CODE */}
          <div className="p-4 bg-gray-50 rounded-lg border border-gray-100 space-y-3">
             <div className="flex items-center gap-2 mb-2">
                <Tag className="w-4 h-4 text-blue-600"/>
                <h3 className="font-semibold text-sm text-gray-700">1. Coupon Code</h3>
             </div>
             <div className="flex gap-2">
               <Input 
                 placeholder="e.g., SUMMER2024" 
                 value={code} 
                 onChange={(e) => setCode(e.target.value.toUpperCase())} 
                 className="uppercase font-mono tracking-widest text-lg"
               />
               <Button variant="outline" size="icon" onClick={generateRandomCode} title="Generate Random">
                 <Wand2 className="h-4 w-4" />
               </Button>
             </div>
          </div>

          {/* SECTION 2: THE RULES */}
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
                    <SelectTrigger>
                        <SelectValue placeholder="Select Product" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all"><span className="font-bold">Entire Order</span></SelectItem>
                        {products.map(p => (
                            <SelectItem key={p.id} value={String(p.id)}>{p.product_name}</SelectItem>
                        ))}
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
                            <SelectContent>
                                {products.map(p => <SelectItem key={p.id} value={String(p.id)}>{p.product_name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    ) : (
                        <Input type="number" placeholder="10" value={discountValue} onChange={(e) => setDiscountValue(e.target.value)} />
                    )}
                </div>
            </div>

            <div className="grid gap-2">
                <Label>Minimum Spend</Label>
                <div className="relative">
                    <span className="absolute left-3 top-2.5 text-gray-500">₱</span>
                    <Input type="number" className="pl-7" value={minSpend} onChange={(e) => setMinSpend(e.target.value)}/>
                </div>
            </div>
          </div>

          {/* SECTION 3: VALIDITY (NEW) */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b pb-2">
                <CalendarClock className="w-4 h-4 text-orange-600"/>
                <h3 className="font-semibold text-sm text-gray-700">3. Validity Period</h3>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                    <Label>Valid From</Label>
                    <Input 
                        type="datetime-local" 
                        value={validFrom} 
                        onChange={(e) => setValidFrom(e.target.value)} 
                    />
                </div>
                <div className="grid gap-2">
                    <Label>Valid Until</Label>
                    <Input 
                        type="datetime-local" 
                        value={validTo} 
                        onChange={(e) => setValidTo(e.target.value)} 
                    />
                </div>
            </div>
            <p className="text-xs text-gray-500 italic">Leave blank for no expiration.</p>
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