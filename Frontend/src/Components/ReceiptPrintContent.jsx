import React, { forwardRef } from "react";

const ReceiptPrintContent = forwardRef(({ transactionData }, ref) => {
  
  const items = transactionData?.items || [];
  
  // ✅ FIX: Use the correct field names from your API/Serializer
  const subtotal = Number(transactionData?.subtotal || 0); 
  const vat = Number(transactionData?.vat || 0);
  const total = Number(transactionData?.total || 0); 
  const cash = Number(transactionData?.cash_given || 0); 
  const change = Number(transactionData?.change || 0);
  
  // Calculate discount if needed (Total should be Subtotal + VAT - Discount)
  // Or if backend sends coupon details, use that.
  const discountVal = transactionData?.coupon_details ? Number(transactionData.coupon_details.rate) : 0;

  const created = transactionData?.created_at
    ? new Date(transactionData.created_at)
    : new Date();

  return (
    <div ref={ref} id="receipt" className="bg-white text-black">
      <style>{`
        @media print {
          @page { size: 58mm auto; margin: 0; }
          body { margin: 0; padding: 0; }

          #receipt { 
            width: 58mm; 
            margin: 0;
            padding: 0;
          }

          #receipt * {
            font-family: 'Courier New', monospace;
            font-size: 11px;
            line-height: 1.2;
          }

          .overflow-y-auto { 
            overflow: visible !important;
            max-height: none !important;
          }
        }
      `}</style>

      <div className="w-[58mm] p-1 flex flex-col justify-between">

        {/* HEADER */}
        <h5 className="text-center font-bold text-sm mb-1 uppercase leading-tight">
          Kuya Vince Karinderya
        </h5>

        <div className="text-center text-[10px] mb-2 border-b border-black pb-2 leading-tight">
          <div className="mb-1">Baliwasan, Zamboanga City</div>
          <div>TIN: 123-456-789-000</div>
          <div>Permit: ATP-2025-56789</div>
        </div>

        {/* DATE */}
        <div className="flex justify-between text-[10px] mb-2">
          <span>{created.toLocaleDateString()}</span>
          <span>{created.toLocaleTimeString()}</span>
        </div>

        {/* ITEMS */}
        <table className="w-full text-[10px] mb-2">
          <thead>
            <tr className="border-b border-black border-dashed">
              <th className="text-left w-6">Qty</th>
              <th className="text-left">Item</th>
              <th className="text-right">Amt</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr key={index}>
                <td className="align-top py-1 text-center">{item.quantity}</td>
                <td className="align-top py-1 pr-1 leading-tight">
                  {item.product_name || "Item"} 
                  {/* Note: Serializer sends 'product_name', not 'product.name' */}
                </td>
                <td className="align-top py-1 text-right whitespace-nowrap">
                  {/* Note: Serializer likely sends 'price' or calculated subtotal per item */}
                  {Number(item.price * item.quantity).toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* TOTALS */}
        <div className="text-[10px] space-y-1 mb-2 border-t border-dashed border-black pt-2">

          <div className="flex justify-between">
            <span>Subtotal:</span>
            <span>{subtotal.toFixed(2)}</span>
          </div>

          {/* VAT */}
          <div className="flex justify-between">
            <span>VAT (12%):</span>
            <span>{vat.toFixed(2)}</span>
          </div>

          {/* DISCOUNT */}
          {discountVal > 0 && (
            <div className="flex justify-between">
              <span>
                Discount {transactionData?.coupon_details ? `(${transactionData.coupon_details.code})` : ""}:
              </span>
              <span>-{discountVal.toFixed(2)}</span>
            </div>
          )}

          {/* TOTAL */}
          <div className="flex justify-between font-bold text-xs pt-1 mt-1 border-t border-black">
            <span>Total:</span>
            <span>{total.toFixed(2)}</span>
          </div>

          {/* CASH */}
          <div className="flex justify-between pt-1">
            <span>Cash:</span>
            <span>{cash.toFixed(2)}</span>
          </div>

          {/* CHANGE */}
          <div className="flex justify-between">
            <span>Change:</span>
            <span>{change.toFixed(2)}</span>
          </div>
        </div>

        {/* FOOTER */}
        <div className="text-center text-[10px] space-y-1 mb-2 mt-2">
          <div>System-Generated Receipt</div>
          <div>+63 966 443 1581</div>
          <div className="font-bold">Thank you!</div>
        </div>

        <div className="text-center text-[9px] italic opacity-70">
          Not an official receipt
        </div>

      </div>
    </div>
  );
});

export default ReceiptPrintContent;