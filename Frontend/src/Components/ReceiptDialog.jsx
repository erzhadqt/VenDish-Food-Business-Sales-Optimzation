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


export default function ReceiptDialog({ title, receiptDetails, children, onConfirm }) {

    console.log(receiptDetails)
    
  return (
    <ShadAlertDialog>
      <AlertDialogTrigger asChild>
        {children}
      </AlertDialogTrigger>

      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title} #{receiptDetails?.id || 0} </AlertDialogTitle>
          <AlertDialogDescription>
            {receiptDetails && 
            <>  
                <p className="text-sm text-muted-foreground mb-3">
                    {new Date(receiptDetails.created_at).toLocaleString()}
                </p>
                {/* Items Section */}
                <div className="space-y-2 mb-2">
                {receiptDetails.items.map((item, index) => (
                    <div
                    key={index}
                    className="flex justify-between text-sm font-medium"
                    >
                    <span className="">
                        {item.product_name} × {item.quantity}
                    </span>
                    <span>₱{item.price}</span>
                    </div>
                ))}
                </div>
                <Separator />
                {/* Totals Section */}
                <div className="space-y-1 text-sm mt-2">
                <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-semibold">₱{receiptDetails.subtotal}</span>
                </div>

                <div className="flex justify-between">
                    <span className="text-muted-foreground">VAT</span>
                    <span className="font-semibold">₱{receiptDetails.vat}</span>
                </div>

                <div className="flex justify-between">
                    <span className="text-muted-foreground">Total</span>
                    <span className="font-semibold">₱{receiptDetails.total}</span>
                </div>
                </div>

                {/* Payment section */}
                <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                    <span className="text-muted-foreground">Cash Given</span>
                    <span className="font-semibold">₱{receiptDetails.cash_given}</span>
                </div>

                <div className="flex justify-between">
                    <span className="text-muted-foreground">Change</span>
                    <span className="font-semibold">₱{receiptDetails.change}</span>
                </div>
                </div>

                {/* Footer */}
                <p className="text-center text-xs text-muted-foreground my-5">
                Thank you for your purchase!
                </p>
            </>
            }
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} className="bg-gray-900 hover:bg-gray-800">Confirm</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </ShadAlertDialog>
  );
}
