import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Wand2 } from "lucide-react"; // Import the magic wand icon
import api from "../api"; 

export default function CriteriaManageDialog({ open, onOpenChange, onSaved, products }) {
  const [loading, setLoading] = useState(false);
  
  // Form State
  const [formData, setFormData] = useState({
    name: "",
    discount_type: "percentage",
    discount_value: 0,
    min_spend: 0,
    min_quantity: 0,
    target_category: "",
    free_product: null,
    valid_from: "",
    valid_to: "",
    is_new_user_only: false,
  });

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // --- RANDOM NAME GENERATOR ---
  const generateRandomName = () => {
    const adjectives = ["Super", "Mega", "Flash", "Summer", "Winter", "Welcome", "Special"];
    const nouns = ["Deal", "Sale", "Promo", "Discount", "Offer", "Bonanza"];
    const randomNum = Math.floor(Math.random() * 100);
    const randomName = `${adjectives[Math.floor(Math.random() * adjectives.length)]} ${nouns[Math.floor(Math.random() * nouns.length)]} ${randomNum}`;
    handleChange("name", randomName);
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      // --- FIX FOR 400 BAD REQUEST ---
      // We must convert strings to numbers and empty strings to null
      const payload = {
        name: formData.name,
        discount_type: formData.discount_type,
        
        // Ensure these are numbers, defaulting to 0 if empty
        discount_value: Number(formData.discount_value) || 0,
        min_spend: Number(formData.min_spend) || 0,
        min_quantity: Number(formData.min_quantity) || 0,
        
        // Handle Foreign Keys: If it's "null" string or empty, send actual null
        free_product: formData.free_product ? Number(formData.free_product) : null,
        
        // Handle Dates: Send null if empty string
        valid_from: formData.valid_from || null,
        valid_to: formData.valid_to || null,
        
        // Booleans are usually safe, but good to ensure
        is_new_user_only: Boolean(formData.is_new_user_only),
        
        // Optional strings
        target_category: formData.target_category || null
      };

      console.log("Sending Payload:", payload); // Debugging: check console to see what is sent
      
      await api.post("/firstapp/coupons-criteria/", payload);
      
      onSaved(); // Refresh parent
      onOpenChange(false); // Close modal
      
      // Reset Form
      setFormData({ 
        name: "", 
        discount_type: "percentage", 
        discount_value: 0, 
        min_spend: 0, 
        min_quantity: 0, 
        is_new_user_only: false,
        target_category: "",
        free_product: null,
        valid_from: "",
        valid_to: ""
      }); 

    } catch (error) {
      console.error("Error saving criteria:", error.response?.data || error);
      // Show specific error from backend if available
      const errorMsg = error.response?.data 
        ? JSON.stringify(error.response.data) 
        : "Failed to save criteria. Check console.";
      alert(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Coupon Rule</DialogTitle>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          {/* Row 1: Name and Type */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Rule Name</Label>
              <div className="flex gap-2">
                <Input 
                    placeholder="e.g., Summer Sale 20%" 
                    value={formData.name}
                    onChange={(e) => handleChange("name", e.target.value)}
                />
                <Button variant="outline" size="icon" onClick={generateRandomName} title="Generate Random Name">
                    <Wand2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={formData.discount_type} onValueChange={(val) => handleChange("discount_type", val)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">Percentage Off (%)</SelectItem>
                  <SelectItem value="fixed">Fixed Amount (₱)</SelectItem>
                  <SelectItem value="free_item">Free Item / BOGO</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Row 2: Value and Min Spend */}
          {formData.discount_type !== 'free_item' && (
            <div className="space-y-2">
               <Label>{formData.discount_type === 'percentage' ? "Percentage Value (%)" : "Amount Off (₱)"}</Label>
               <Input 
                 type="number" 
                 value={formData.discount_value}
                 onChange={(e) => handleChange("discount_value", e.target.value)}
               />
            </div>
          )}

          {formData.discount_type === 'free_item' && (
             <div className="space-y-2">
                <Label>Select Free Item</Label>
                <Select onValueChange={(val) => handleChange("free_product", val)}>
                  <SelectTrigger><SelectValue placeholder="Choose product..." /></SelectTrigger>
                  <SelectContent>
                    {products.map(p => (
                      <SelectItem key={p.id} value={String(p.id)}>{p.product_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
             </div>
          )}

          {/* Row 3: Constraints */}
          <div className="grid grid-cols-3 gap-4 border-t pt-4 mt-2">
            <div className="space-y-2">
              <Label>Min Spend (₱)</Label>
              <Input type="number" value={formData.min_spend} onChange={(e) => handleChange("min_spend", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Min Quantity</Label>
              <Input type="number" value={formData.min_quantity} onChange={(e) => handleChange("min_quantity", e.target.value)} />
            </div>
             <div className="flex items-center space-x-2 pt-8">
                <Checkbox 
                  id="newuser" 
                  checked={formData.is_new_user_only}
                  onCheckedChange={(checked) => handleChange("is_new_user_only", checked)}
                />
                <Label htmlFor="newuser">New Users Only</Label>
             </div>
          </div>
          
          {/* Row 4: Seasonality */}
          <div className="grid grid-cols-2 gap-4 border-t pt-4">
             <div className="space-y-2">
                <Label>Valid From (Optional)</Label>
                <Input type="datetime-local" onChange={(e) => handleChange("valid_from", e.target.value)} />
             </div>
             <div className="space-y-2">
                <Label>Valid To (Optional)</Label>
                <Input type="datetime-local" onChange={(e) => handleChange("valid_to", e.target.value)} />
             </div>
          </div>

        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={loading}>{loading ? "Saving..." : "Save Rule"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}