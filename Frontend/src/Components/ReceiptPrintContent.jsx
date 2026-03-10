import React, { forwardRef } from "react";

const ReceiptPrintContent = forwardRef(({ transactionData }, ref) => {
  
  const items = transactionData?.items || [];
  
  const subtotal = Number(transactionData?.subtotal || 0); 
  const vat = Number(transactionData?.vat || 0);
  const total = Number(transactionData?.total || 0); 
  const cash = Number(transactionData?.cash_given || 0); 
  const change = Number(transactionData?.change || 0);
  
  // ✅ FIX: Get all coupons from the array
  const coupons = transactionData?.coupon_details || [];

  const created = transactionData?.created_at
    ? new Date(transactionData.created_at)
    : new Date();

  return (
    <div ref={ref} id="receipt" style={{ background: '#fff', color: '#000' }}>
      <style>{`
        @media print {
          @page {
            size: 58mm auto;
            margin: 2mm 1mm;
          }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
          }

          #receipt {
            width: 58mm !important;
            max-width: 58mm !important;
            margin: 0 !important;
            padding: 1mm !important;
            box-sizing: border-box !important;
            overflow: hidden !important;
            display: block !important;
            visibility: visible !important;
          }

          #receipt, #receipt * {
            font-family: 'Courier New', 'Lucida Console', monospace !important;
            font-size: 10px !important;
            font-weight: 600 !important;
            line-height: 1.3 !important;
            color: #000 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            visibility: visible !important;
          }

          #receipt h5 {
            font-size: 12px !important;
            font-weight: 800 !important;
          }

          #receipt table {
            width: 100% !important;
            table-layout: fixed !important;
            border-collapse: collapse !important;
            word-wrap: break-word !important;
            overflow-wrap: break-word !important;
          }

          #receipt td, #receipt th {
            padding: 1px 0 !important;
            vertical-align: top !important;
            word-wrap: break-word !important;
            overflow-wrap: break-word !important;
          }

          .receipt-row {
            display: flex !important;
            justify-content: space-between !important;
            width: 100% !important;
          }

          .overflow-y-auto { 
            overflow: visible !important;
            max-height: none !important;
          }
        }
      `}</style>

      <div style={{ width: '58mm', maxWidth: '58mm', padding: '1mm', boxSizing: 'border-box', fontFamily: "'Courier New', monospace", fontSize: '10px' }}>

        {/* HEADER */}
        <h5 style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '11px', marginBottom: '2px', textTransform: 'uppercase', lineHeight: '1.2' }}>
          Kuya Vince Karinderya
        </h5>

        <div style={{ textAlign: 'center', fontSize: '8px', marginBottom: '4px', borderBottom: '1px solid #000', paddingBottom: '4px', lineHeight: '1.3' }}>
          <div style={{ marginBottom: '1px' }}>Baliwasan, Zamboanga City</div>
          <div>TIN: 123-456-789-000</div>
          <div>Permit: ATP-2025-56789</div>
        </div>

        {/* DATE */}
        <div className="receipt-row" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '8px', marginBottom: '4px' }}>
          <span>{created.toLocaleDateString()}</span>
          <span>{created.toLocaleTimeString()}</span>
        </div>

        {/* ITEMS */}
        <table style={{ width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse', fontSize: '8px', marginBottom: '4px' }}>
          <thead>
            <tr style={{ borderBottom: '1px dashed #000' }}>
              <th style={{ textAlign: 'left', width: '18%', padding: '1px 0' }}>Qty</th>
              <th style={{ textAlign: 'left', width: '52%', padding: '1px 0' }}>Item</th>
              <th style={{ textAlign: 'right', width: '30%', padding: '1px 0' }}>Amt</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr key={index}>
                <td style={{ verticalAlign: 'top', padding: '1px 0', textAlign: 'center' }}>{item.quantity}</td>
                <td style={{ verticalAlign: 'top', padding: '1px 2px 1px 0', lineHeight: '1.2', wordWrap: 'break-word', overflowWrap: 'break-word' }}>
                  {item.product_name || "Item"} 
                </td>
                <td style={{ verticalAlign: 'top', padding: '1px 0', textAlign: 'right', whiteSpace: 'nowrap' }}>
                  {Number(item.price * item.quantity).toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* TOTALS */}
        <div style={{ fontSize: '8px', marginBottom: '4px', borderTop: '1px dashed #000', paddingTop: '3px' }}>

          <div className="receipt-row" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1px' }}>
            <span>Subtotal:</span>
            <span>{subtotal.toFixed(2)}</span>
          </div>

          {/* VAT */}
          <div className="receipt-row" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1px' }}>
            <span>VAT (12%):</span>
            <span>{vat.toFixed(2)}</span>
          </div>

          {/* DISCOUNT LOOP */}
          {coupons.length > 0 && coupons.map((coupon, idx) => (
            <div key={idx} className="receipt-row" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1px' }}>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '60%' }}>
                Disc({coupon.code}):
              </span>
              <span>-{Number(coupon.rate).toFixed(2)}</span>
            </div>
          ))}

          {/* TOTAL */}
          <div className="receipt-row" style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '10px', paddingTop: '2px', marginTop: '2px', borderTop: '1px solid #000' }}>
            <span>Total:</span>
            <span>{total.toFixed(2)}</span>
          </div>

          {/* CASH */}
          <div className="receipt-row" style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '2px' }}>
            <span>Cash:</span>
            <span>{cash.toFixed(2)}</span>
          </div>

          {/* CHANGE */}
          <div className="receipt-row" style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Change:</span>
            <span>{change.toFixed(2)}</span>
          </div>
        </div>

        {/* FOOTER */}
        <div style={{ textAlign: 'center', fontSize: '8px', marginBottom: '2px', marginTop: '4px', lineHeight: '1.4' }}>
          <div>System-Generated Receipt</div>
          <div>+63 966 443 1581</div>
          <div style={{ fontWeight: 'bold' }}>Thank you!</div>
        </div>

        <div style={{ textAlign: 'center', fontSize: '7px', fontStyle: 'italic', opacity: '0.7' }}>
          Not an official receipt
        </div>

      </div>
    </div>
  );
});

export default ReceiptPrintContent;