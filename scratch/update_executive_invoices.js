const fs = require('fs');
const path = require('path');

const targetFile = 'c:\\Users\\ajay anthwal\\Desktop\\car_blink_dashboard\\app\\(executive)\\executive\\invoices\\page.tsx';
let content = fs.readFileSync(targetFile, 'utf8');

// Normalize to LF for matching
const isCRLF = content.includes('\r\n');
content = content.replace(/\r\n/g, '\n');

// 1. Table Status Block
const oldStatusMarker = `{/* Status */}
                      <TableCell>
                        <span className={\`px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1 w-fit \${
                          inv.status === 'SUBMITTED_TO_EXECUTIVE' ? 'bg-amber-100 text-amber-800' :
                          inv.status === 'FORWARDED_TO_CUSTOMER' ? 'bg-blue-100 text-blue-800' :
                          inv.status === 'PAID' ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-700'
                        }\`}>
                          {inv.status === 'SUBMITTED_TO_EXECUTIVE' && <Clock className="w-3 h-3" />}
                          {inv.status === 'FORWARDED_TO_CUSTOMER' && <Send className="w-3 h-3" />}
                          {inv.status === 'PAID' && <CheckCircle2 className="w-3 h-3" />}
                          {inv.status?.replace(/_/g, ' ')}
                        </span>
                      </TableCell>`;

const newStatusBlock = `{/* Status */}
                      <TableCell>
                        {inv.status === 'PAID' ? (
                          (() => {
                            const isCash = inv.paymentMode === 'CASH' || inv.bookingId?.paymentMode === 'CASH' || inv.payment?.provider === 'CASH';
                            return isCash ? (
                              <div className="flex flex-col gap-1 items-start">
                                <span className="px-2.5 py-1 rounded-full text-xs font-black flex items-center gap-1.5 w-fit bg-emerald-50 text-emerald-800 border border-emerald-300 shadow-sm">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                  PAID (💵 CASH)
                                </span>
                                <span className="text-[10px] text-amber-800 font-bold bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                                  Cash Collected by Partner
                                </span>
                              </div>
                            ) : (
                              <div className="flex flex-col gap-1 items-start">
                                <span className="px-2.5 py-1 rounded-full text-xs font-black flex items-center gap-1.5 w-fit bg-blue-50 text-blue-800 border border-blue-300 shadow-sm">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                                  PAID (💳 ONLINE)
                                </span>
                                <span className="text-[10px] text-blue-700 font-bold bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                                  Razorpay / Online
                                </span>
                              </div>
                            );
                          })()
                        ) : (
                          <span className={\`px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1 w-fit \${
                            inv.status === 'SUBMITTED_TO_EXECUTIVE' ? 'bg-amber-100 text-amber-800' :
                            inv.status === 'FORWARDED_TO_CUSTOMER' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-700'
                          }\`}>
                            {inv.status === 'SUBMITTED_TO_EXECUTIVE' && <Clock className="w-3 h-3" />}
                            {inv.status === 'FORWARDED_TO_CUSTOMER' && <Send className="w-3 h-3" />}
                            {inv.status?.replace(/_/g, ' ')}
                          </span>
                        )}
                      </TableCell>`;

if (content.includes(oldStatusMarker)) {
  content = content.replace(oldStatusMarker, newStatusBlock);
  console.log('SUCCESS: Replaced Table Status Block');
} else {
  console.log('FAIL: Table Status Marker not found');
}

// 2. Modal Summary Bar
const oldSummaryMarker = `{/* Partner & Customer Summary Bar */}
              <div className="bg-orange-50/60 border border-orange-100 rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div>
                  <span className="font-bold text-gray-500 uppercase tracking-wider block text-[10px]">Partner</span>
                  <p className="font-black text-gray-900 mt-0.5">{selectedInvoice.partnerId?.businessName || 'N/A'}</p>
                  <p className="text-gray-600">{selectedInvoice.partnerId?.phone || ''}</p>
                </div>
                <div>
                  <span className="font-bold text-gray-500 uppercase tracking-wider block text-[10px]">Customer</span>
                  <p className="font-black text-gray-900 mt-0.5">{selectedInvoice.customerId?.fullName || 'N/A'}</p>
                  <p className="text-gray-600">{selectedInvoice.customerId?.phone || ''}</p>
                </div>
                <div>
                  <span className="font-bold text-gray-500 uppercase tracking-wider block text-[10px]">Vehicle</span>
                  <p className="font-black text-gray-900 mt-0.5">
                    {selectedInvoice.bookingId?.vehicleId ? \`\${selectedInvoice.bookingId.vehicleId.brand} \${selectedInvoice.bookingId.vehicleId.model}\` : 'Vehicle'}
                  </p>
                  <p className="text-gray-600">{selectedInvoice.bookingId?.vehicleId?.registrationNumber || ''}</p>
                </div>
              </div>`;

const newSummaryBlock = `{/* Partner & Customer Summary Bar */}
              <div className="bg-orange-50/60 border border-orange-100 rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
                <div>
                  <span className="font-bold text-gray-500 uppercase tracking-wider block text-[10px]">Partner</span>
                  <p className="font-black text-gray-900 mt-0.5">{selectedInvoice.partnerId?.businessName || 'N/A'}</p>
                  <p className="text-gray-600">{selectedInvoice.partnerId?.phone || ''}</p>
                </div>
                <div>
                  <span className="font-bold text-gray-500 uppercase tracking-wider block text-[10px]">Customer</span>
                  <p className="font-black text-gray-900 mt-0.5">{selectedInvoice.customerId?.fullName || 'N/A'}</p>
                  <p className="text-gray-600">{selectedInvoice.customerId?.phone || ''}</p>
                </div>
                <div>
                  <span className="font-bold text-gray-500 uppercase tracking-wider block text-[10px]">Vehicle</span>
                  <p className="font-black text-gray-900 mt-0.5">
                    {selectedInvoice.bookingId?.vehicleId ? \`\${selectedInvoice.bookingId.vehicleId.brand} \${selectedInvoice.bookingId.vehicleId.model}\` : 'Vehicle'}
                  </p>
                  <p className="text-gray-600">{selectedInvoice.bookingId?.vehicleId?.registrationNumber || ''}</p>
                </div>
                <div>
                  <span className="font-bold text-gray-500 uppercase tracking-wider block text-[10px]">Payment Method</span>
                  {selectedInvoice.status === 'PAID' ? (
                    (() => {
                      const isCash = selectedInvoice.paymentMode === 'CASH' || selectedInvoice.bookingId?.paymentMode === 'CASH' || selectedInvoice.payment?.provider === 'CASH';
                      const txRef = selectedInvoice.transactionRef || selectedInvoice.payment?.providerPaymentId || selectedInvoice.payment?.providerOrderId || (isCash ? 'CASH-COLLECTED' : 'ONLINE-SUCCESS');
                      return isCash ? (
                        <div className="mt-0.5">
                          <span className="inline-flex items-center gap-1 font-bold text-amber-800 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded text-[11px]">
                            💵 Handover Cash to Partner
                          </span>
                          <p className="text-[10px] text-gray-600 mt-1 font-mono break-all" title={txRef}>
                            Ref: {txRef}
                          </p>
                        </div>
                      ) : (
                        <div className="mt-0.5">
                          <span className="inline-flex items-center gap-1 font-bold text-blue-800 bg-blue-100 border border-blue-300 px-2 py-0.5 rounded text-[11px]">
                            💳 Online Razorpay
                          </span>
                          <p className="text-[10px] text-gray-600 mt-1 font-mono break-all" title={txRef}>
                            Ref: {txRef}
                          </p>
                        </div>
                      );
                    })()
                  ) : (
                    <div className="mt-0.5">
                      <span className="inline-flex items-center gap-1 font-semibold text-gray-700 bg-gray-100 px-2 py-0.5 rounded text-[11px]">
                        ⏳ {selectedInvoice.status?.replace(/_/g, ' ') || 'Pending Payment'}
                      </span>
                      <p className="text-[10px] text-gray-500 mt-0.5">
                        Preference: {(selectedInvoice.paymentMode || selectedInvoice.bookingId?.paymentMode) === 'CASH' ? 'Cash' : 'Online'}
                      </p>
                    </div>
                  )}
                </div>
              </div>`;

if (content.includes(oldSummaryMarker)) {
  content = content.replace(oldSummaryMarker, newSummaryBlock);
  console.log('SUCCESS: Replaced Modal Summary Bar');
} else {
  console.log('FAIL: Modal Summary Marker not found');
}

if (isCRLF) {
  content = content.replace(/\n/g, '\r\n');
}

fs.writeFileSync(targetFile, content, 'utf8');
console.log('Successfully written to page.tsx');
