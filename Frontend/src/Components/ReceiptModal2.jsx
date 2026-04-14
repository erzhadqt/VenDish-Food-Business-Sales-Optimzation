import React, { useEffect, useRef, useState } from "react";
import {
  AlertDialog as ShadAlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "../Components/ui/alert-dialog";

import { Separator } from "@/Components/ui/separator";
import { Tag, Printer } from "lucide-react"; 
import { useReactToPrint } from 'react-to-print';

import ReceiptPrintContent from "./ReceiptPrintContent"; 
import api from "../api";
import {
  DEFAULT_RECEIPT_PHONE,
  DEFAULT_TIN_NUMBER,
  normalizeReceiptPhone,
  normalizeTinNumber,
} from "../utils/tinNumber";

export default function ReceiptModal2({ title, receiptDetails, onConfirm, open, onOpenChange }) {
  const contentRef = useRef(null);
  const [tinNumber, setTinNumber] = useState(DEFAULT_TIN_NUMBER);
  const [receiptPhone, setReceiptPhone] = useState(DEFAULT_RECEIPT_PHONE);

  useEffect(() => {
    let isActive = true;

    const fetchTinNumber = async () => {
      try {
        const res = await api.get(`/settings/?t=${Date.now()}`);
        if (!isActive) return;
        setTinNumber(normalizeTinNumber(res.data?.tin_number, DEFAULT_TIN_NUMBER));
        setReceiptPhone(normalizeReceiptPhone(res.data?.receipt_phone, DEFAULT_RECEIPT_PHONE));
      } catch {
        if (!isActive) return;
        setTinNumber(DEFAULT_TIN_NUMBER);
        setReceiptPhone(DEFAULT_RECEIPT_PHONE);
      }
    };

    if (open) {
      fetchTinNumber();
    } else {
      setTinNumber(DEFAULT_TIN_NUMBER);
      setReceiptPhone(DEFAULT_RECEIPT_PHONE);
    }

    return () => {
      isActive = false;
    };
  }, [open]);

  const cashierName =
    receiptDetails?.cashier_name ||
    receiptDetails?.cashier?.username ||
    receiptDetails?.cashier ||
    "Unknown";
    
  const customerName =
    `${receiptDetails?.customer_first_name || ""} ${receiptDetails?.customer_last_name || ""}`.trim() ||
    receiptDetails?.customer_name ||
    "Walk-in";

  const handlePrint = useReactToPrint({
    contentRef: contentRef,
    documentTitle: `Receipt-${receiptDetails?.id || '000'}`,
  });

  // Helper function to calculate and display both percentage and raw value
  const getCouponDisplay = (coupon) => {
    if (!coupon.criteria_details) return `- ${coupon.rate}`;
    const { discount_type, discount_value, target_product, max_discount_amount } = coupon.criteria_details;
    
    if (discount_type === 'percentage') {
        let baseAmount = parseFloat(receiptDetails.subtotal || 0);
        
        // Check if the percentage is applied only to a specific targeted product
        if (target_product) {
            const targetItem = receiptDetails.items.find(item => {
                const itemId = typeof item.product === 'object' ? item.product?.id : item.product;
                return itemId === target_product;
            });
            if (targetItem) {
                baseAmount = parseFloat(targetItem.price) * targetItem.quantity;
            }
        }
        
        let rawValue = (parseFloat(discount_value) / 100) * baseAmount;
        const parsedCap = parseFloat(max_discount_amount);
        if (!Number.isNaN(parsedCap) && parsedCap > 0) {
          rawValue = Math.min(rawValue, parsedCap);
        }
        return `- ${coupon.rate} (₱${rawValue.toFixed(2)})`;
    } else if (discount_type === 'fixed') {
        return `- ₱${parseFloat(discount_value).toFixed(2)}`;
    } else if (discount_type === 'free_item') {
        return `- FREE ITEM`;
    }
    
    return `- ${coupon.rate}`;
  };

  return (
    <ShadAlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>{title} #{receiptDetails?.id || 0} </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="text-sm p-4 bg-white text-black max-h-[60vh] overflow-y-auto overflow-x-hidden"> 
            
              {/* Hidden Print Component */}
              <div className="hidden">
                  <ReceiptPrintContent 
                      ref={contentRef} 
                      transactionData={receiptDetails} 
                      tinNumber={tinNumber}
                      receiptPhone={receiptPhone}
                  />
              </div>

              {/* Visible Preview */}
              {receiptDetails ? (
              <>  
                  <div className="text-center mb-6">
                      <h2 className="text-xl font-bold">Kuya Vince Karinderya</h2>
                      <p className="text-xs">Baliwasan, Zamboanga City</p>
                      <p className="text-xs font-mono text-muted-foreground">TIN: {tinNumber}</p>
                      <p className="text-xs font-mono text-muted-foreground">Phone: {receiptPhone}</p>
                  </div>

                  <p className="text-muted-foreground mb-4 text-xs">
                      {new Date(receiptDetails.created_at).toLocaleString()}
                  </p>

                  <p className="text-muted-foreground mb-4 text-xs">
                      Cashier: <span className="font-semibold text-foreground">{cashierName}</span>
                  </p>

                  <p className="text-muted-foreground mb-4 text-xs">
                      Customer: <span className="font-semibold text-foreground">{customerName}</span>
                  </p>

                  <div className="space-y-3 mb-4">
                  {receiptDetails.items.map((item, index) => (
                      <div key={index} className="flex justify-between items-start">
                          <div className="flex flex-col">
                              <span className="font-medium text-foreground">
                                  {item.product_name} × {item.quantity}
                              </span>
                          </div>
                          <span className="text-foreground">₱{item.price}</span>
                      </div>
                  ))}
                  </div>

                  <Separator className="my-4"/>

                  <div className="space-y-2 mt-2">
                      <div className="flex justify-between">
                          <span className="text-muted-foreground">Subtotal</span>
                          <span className="font-semibold text-foreground">₱{receiptDetails.subtotal}</span>
                      </div>

                      <div className="flex justify-between">
                          <span className="text-muted-foreground">VAT</span>
                          <span className="font-semibold text-foreground">₱{receiptDetails.vat}</span>
                      </div>

                      {/* Applied Coupons */}
                      {receiptDetails.coupon_details && receiptDetails.coupon_details.length > 0 && (
                          <div className="space-y-1">
                              {receiptDetails.coupon_details.map((coupon, idx) => (
                                  <div key={idx} className="flex justify-between text-green-600">
                                      <span className="flex items-center gap-1">
                                          <Tag size={14}/> Voucher ({coupon.code})
                                      </span>
                                      <span className="font-semibold">{getCouponDisplay(coupon)}</span>
                                  </div>
                              ))}
                          </div>
                      )}

                      <Separator className="my-2" />

                      <div className="flex justify-between text-base mt-2 pt-2">
                          <span className="font-bold text-foreground">Total</span>
                          <span className="font-bold text-foreground">₱{receiptDetails.total}</span>
                      </div>
                  </div>

                  <div className="rounded-md mt-4 space-y-1">
                      <div className="flex justify-between text-md border-b pb-1 mb-1">
                          <span className="text-muted-foreground">Payment Method</span>
                          <span className="font-semibold text-foreground uppercase">
                              {receiptDetails.payment_method === 'GCASH' ? 'GCash' : 'Cash'}
                          </span>
                      </div>
                      {/* --- GCASH REFERENCE NUMBER --- */}
                      {receiptDetails.payment_method === 'GCASH' && receiptDetails.provider_reference && (
                          <div className="flex justify-between text-md border-b pb-2 mb-2">
                              <span className="text-muted-foreground">Reference No.</span>
                              <span className="font-mono text-gray-900 text-sm">
                                  {receiptDetails.provider_reference}
                              </span>
                          </div>
                      )}
                      <div className="flex justify-between text-md">
                          <span className="text-muted-foreground">Amount Given</span>
                          <span className="font-mono text-md">₱{receiptDetails.cash_given}</span>
                      </div>
                      <div className="flex justify-between">
                          <span className="text-muted-foreground text-md">Change</span>
                          <span className="font-mono text-md">₱{receiptDetails.change}</span>
                      </div>
                  </div>
                  <p className="text-center text-xs text-muted-foreground mt-6 mb-2">
                    Thank you for your purchase!
                  </p>
              </>
              ) : (
                  <div className="text-center py-10">Processing Receipt...</div>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <AlertDialogFooter>
          <AlertDialogAction 
            onClick={(e) => {
                if (receiptDetails) {
                    e.preventDefault(); 
                    handlePrint();      
                }
            }} 
            className="bg-gray-900 flex gap-2"
          >
             <Printer size={16} /> Print Receipt
          </AlertDialogAction>
          
          {onConfirm && (
              <button 
                onClick={onConfirm}
                className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-green-600 text-white hover:bg-green-700 h-10 px-4 py-2"
              >
                New Order
              </button>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </ShadAlertDialog>
  );
}