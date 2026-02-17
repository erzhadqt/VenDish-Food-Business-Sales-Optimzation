import React, { useRef } from "react";
import {
  AlertDialog as ShadAlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/Components/ui/alert-dialog";

import { Separator } from "@/Components/ui/separator";
import { Tag, Printer } from "lucide-react"; 
import { useReactToPrint } from 'react-to-print';

import ReceiptPrintContent from "./ReceiptPrintContent"; 

export default function ReceiptModal2({ title, receiptDetails, onConfirm, open, onOpenChange }) {
  const contentRef = useRef(null);

  const handlePrint = useReactToPrint({
    contentRef: contentRef,
    documentTitle: `Receipt-${receiptDetails?.id || '000'}`,
    // ----------------------------------------------------
    // THIS IS THE FIX:
    // When print dialog closes, we trigger the reset function (onConfirm)
    // ----------------------------------------------------
    onAfterPrint: () => {
        if (onConfirm) {
            onConfirm(); // This calls handleResetOrder in Pos.js
        }
    }
  });

  return (
    <ShadAlertDialog open={open} onOpenChange={onOpenChange}>
      {/* Note: We removed AlertDialogTrigger because Pos.js controls opening */}

      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>{title} #{receiptDetails?.id || 0} </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="text-sm p-4 bg-white text-black"> 
            
            {/* Hidden Print Component */}
            <div className="hidden">
                <ReceiptPrintContent 
                    ref={contentRef} 
                    transactionData={receiptDetails} 
                />
            </div>

            {/* Visible Preview */}
            {receiptDetails ? (
            <>  
                <div className="text-center mb-6">
                    <h2 className="text-xl font-bold">Kuya Vince Karinderya</h2>
                    <p className="text-xs">Baliwasan, Zamboanga City</p>
                </div>

                <p className="text-muted-foreground mb-4 text-xs">
                    {new Date(receiptDetails.created_at).toLocaleString()}
                </p>

                <div className="space-y-3 mb-4">
                {receiptDetails.items.map((item, index) => (
                    <div key={index} className="flex justify-between items-start">
                        <div className="flex flex-col">
                            <span className="font-medium text-foreground">
                                {item.product_name} × {item.quantity}
                            </span>
                            {item.coupon_details && (
                                <span className="text-xs text-green-600 flex items-center gap-1">
                                    <Tag size={10} />
                                    {item.coupon_details.code} (-₱{item.coupon_details.rate})
                                </span>
                            )}
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

                    {receiptDetails.coupon_details && (
                        <div className="flex justify-between text-green-600">
                            <span className="flex items-center gap-1">
                                <Tag size={14}/> Voucher ({receiptDetails.coupon_details.code})
                            </span>
                            <span className="font-semibold">-₱{receiptDetails.coupon_details.rate}</span>
                        </div>
                    )}

                    <Separator className="my-2" />

                    <div className="flex justify-between text-base mt-2 pt-2">
                        <span className="font-bold text-foreground">Total</span>
                        <span className="font-bold text-foreground">₱{receiptDetails.total}</span>
                    </div>
                </div>

                <div className="rounded-md mt-4 space-y-1">
                    <div className="flex justify-between text-md">
                        <span className="text-muted-foreground">Cash Given</span>
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
          {/* Cancel button manually triggers close without resetting if desired, or can be removed */}
          <AlertDialogCancel onClick={() => onOpenChange(false)}>Close Preview</AlertDialogCancel>
          
          <AlertDialogAction 
            onClick={(e) => {
                if (receiptDetails) {
                    e.preventDefault(); // Keep modal open while print dialog is active
                    handlePrint();      // Trigger print (and reset afterwards)
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