import {
  AlertDialog as ShadAlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";

import { Separator } from "@/components/ui/separator";
import { Tag } from "lucide-react"; // 1. IMPORT THIS ICON

export default function ReceiptDialog({ title, receiptDetails, children, onConfirm }) {

  console.log("Receipt Data:", receiptDetails);

  return (
    <ShadAlertDialog>
      <AlertDialogTrigger asChild>
        {children}
      </AlertDialogTrigger>

      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>{title} #{receiptDetails?.id || 0} </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="text-sm">
            {receiptDetails &&
            <>  
                <p className="text-muted-foreground mb-4">
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

                <div className=" rounded-md mt-4 space-y-1">
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
            }
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Close</AlertDialogCancel>
          {onConfirm && (
             <AlertDialogAction onClick={onConfirm} className="bg-gray-900">Print / New Order</AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </ShadAlertDialog>
  );
}