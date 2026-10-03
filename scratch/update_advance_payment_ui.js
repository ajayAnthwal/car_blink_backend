const fs = require('fs');
const path = require('path');

const dashboardDir = 'c:\\Users\\ajay anthwal\\Desktop\\car_blink_dashboard';

// ==========================================
// 1. Update app/(customer)/customer/bookings/[id]/page.tsx
// ==========================================
const bookingPagePath = path.join(dashboardDir, 'app', '(customer)', 'customer', 'bookings', '[id]', 'page.tsx');
let bookingPageContent = fs.readFileSync(bookingPagePath, 'utf8');
const isCRLF1 = bookingPageContent.includes('\r\n');
bookingPageContent = bookingPageContent.replace(/\r\n/g, '\n');

// 1A. Add auto-scroll useEffect if not already present
const scrollHookTarget = `  useEffect(() => {
    if (!socket || !id) return;`;

const scrollHookReplacement = `  // Auto-focus directly on Advance Payment Section when payment is needed
  useEffect(() => {
    if (typeof window !== 'undefined' && booking && !hasPaidAdvance && remainingAmount > 0 && booking.status !== 'COMPLETED') {
      const timer = setTimeout(() => {
        const payEl = document.getElementById('advance-payment-section');
        if (payEl) {
          payEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [booking?._id, hasPaidAdvance, remainingAmount]);

  useEffect(() => {
    if (!socket || !id) return;`;

if (!bookingPageContent.includes('Auto-focus directly on Advance Payment Section')) {
  bookingPageContent = bookingPageContent.replace(scrollHookTarget, scrollHookReplacement);
  console.log('SUCCESS: Added auto-scroll hook to booking page');
} else {
  console.log('Auto-scroll hook already added');
}

// 1B. Add Top Advance Payment Card right below message.text
const topPaymentCard = `      {/* Top Priority Action: 15% Advance Payment Banner & Action Card */}
      {(!hasPaidAdvance && remainingAmount > 0 && booking.status !== 'COMPLETED') && (
        <Card id="advance-payment-section" className="border-2 border-primary-orange shadow-xl rounded-3xl overflow-hidden bg-gradient-to-br from-orange-50/90 via-white to-amber-50/70 animate-in fade-in slide-in-from-top-4 duration-500 scroll-mt-24">
          <div className="bg-gradient-to-r from-primary-orange to-amber-600 px-6 py-3.5 text-white flex flex-wrap items-center justify-between gap-2 shadow-sm">
            <div className="flex items-center gap-2">
              <span className="p-1 rounded-full bg-white/20 text-white animate-pulse">
                <Sparkles className="w-4 h-4" />
              </span>
              <span className="font-heading font-black text-sm uppercase tracking-wide">
                Action Required: Confirm Booking with 15% Advance
              </span>
            </div>
            <span className="bg-white/20 text-white text-xs font-bold px-3 py-1 rounded-full backdrop-blur-xs">
              Instant Workshop Details Unlock
            </span>
          </div>

          <CardContent className="p-6 sm:p-8 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-orange-200/60">
              <div className="space-y-1.5 max-w-xl">
                <h3 className="font-heading font-black text-xl sm:text-2xl text-slate-900 tracking-tight flex items-center gap-2">
                  <ShieldCheck className="w-6 h-6 text-primary-orange shrink-0" />
                  Pay 15% Advance to Lock Your Service Slot
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-medium">
                  Quote accepted! Complete 15% advance token via <strong className="text-slate-800">Online UPI/Card</strong> or <strong className="text-slate-800">Cash at Workshop</strong> to confirm your booking and immediately view partner workshop name, phone, &amp; Google Maps address.
                </p>
              </div>

              {/* Price Callout */}
              <div className="bg-white p-4 sm:p-5 rounded-2xl border-2 border-primary-orange/30 shadow-md min-w-[220px] text-center sm:text-right shrink-0">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">
                  15% ADVANCE TOKEN PAYABLE
                </span>
                <p className="text-3xl font-black text-primary-orange font-heading mt-0.5">
                  ₹{(remainingForAdvance > 0 ? remainingForAdvance : Math.min(remainingAmount, advanceAmount || 1)).toLocaleString('en-IN')}
                </p>
                <p className="text-[11px] text-slate-500 font-semibold mt-1">
                  Total Quote: ₹{calculatedTotalAmount.toLocaleString('en-IN')}
                </p>
              </div>
            </div>

            {/* Payment Method Selector & Instant Action Buttons */}
            <div className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  Choose Payment Method:
                </span>
                <span className="text-xs font-semibold text-slate-500">
                  {effectivePaymentMode === 'CASH' ? '💵 Cash selected (Pay at workshop)' : '💳 Online selected (Instant verification)'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg">
                <button
                  type="button"
                  onClick={() => handleTogglePaymentMode("CASH")}
                  className={\`px-4 py-3 rounded-2xl text-xs sm:text-sm font-bold border-2 transition-all flex items-center justify-center gap-2 \${
                    effectivePaymentMode === "CASH"
                      ? "bg-emerald-600 text-white border-emerald-600 shadow-md scale-[1.01]"
                      : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                  }\`}
                >
                  💵 Pay Cash at Workshop
                </button>
                <button
                  type="button"
                  onClick={() => handleTogglePaymentMode("ONLINE")}
                  className={\`px-4 py-3 rounded-2xl text-xs sm:text-sm font-bold border-2 transition-all flex items-center justify-center gap-2 \${
                    effectivePaymentMode === "ONLINE"
                      ? "bg-primary-navy text-white border-primary-navy shadow-md scale-[1.01]"
                      : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                  }\`}
                >
                  💳 Pay Online (UPI / Card)
                </button>
              </div>

              {/* Main Pay Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {effectivePaymentMode === 'CASH' ? (
                  <>
                    <Button 
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl py-6 font-extrabold text-sm sm:text-base shadow-lg shadow-emerald-600/25 transition-all hover:scale-[1.01]" 
                      onClick={() => handlePayAtWorkshop(remainingForAdvance > 0 ? remainingForAdvance : Math.min(remainingAmount, advanceAmount || 1), "ADVANCE")} 
                      isLoading={isExtensionProcessing}
                    >
                      <CheckCircle2 className="w-5 h-5 mr-2 text-white" /> Confirm Pay at Workshop (₹{(remainingForAdvance > 0 ? remainingForAdvance : Math.min(remainingAmount, advanceAmount || 1)).toLocaleString('en-IN')})
                    </Button>
                    <Button 
                      variant="outline"
                      className="w-full border-primary-navy/30 bg-white hover:bg-primary-navy/5 text-primary-navy rounded-2xl py-6 font-bold text-xs sm:text-sm shadow-sm" 
                      onClick={() => handleInitiatePayment(remainingForAdvance > 0 ? remainingForAdvance : Math.min(remainingAmount, advanceAmount || 1), "ADVANCE")} 
                      isLoading={isExtensionProcessing}
                    >
                      <IndianRupee className="w-4 h-4 mr-1.5 text-primary-orange" /> Pay Online (Razorpay / UPI) Instead
                    </Button>
                  </>
                ) : (
                  <>
                    <Button 
                      className="w-full bg-primary-navy hover:bg-secondary-blue text-white rounded-2xl py-6 font-extrabold text-sm sm:text-base shadow-lg shadow-primary-navy/25 flex items-center justify-center transition-all hover:scale-[1.01]" 
                      onClick={() => handleInitiatePayment(remainingForAdvance > 0 ? remainingForAdvance : Math.min(remainingAmount, advanceAmount || 1), "ADVANCE")} 
                      isLoading={isExtensionProcessing}
                    >
                      <IndianRupee className="w-5 h-5 mr-2 text-primary-orange" /> Pay Online 15% Advance (₹{(remainingForAdvance > 0 ? remainingForAdvance : Math.min(remainingAmount, advanceAmount || 1)).toLocaleString('en-IN')})
                    </Button>
                    <Button 
                      variant="outline"
                      className="w-full border-emerald-300 bg-white hover:bg-emerald-50 text-emerald-800 rounded-2xl py-6 font-bold text-xs sm:text-sm shadow-sm" 
                      onClick={() => handlePayAtWorkshop(remainingForAdvance > 0 ? remainingForAdvance : Math.min(remainingAmount, advanceAmount || 1), "ADVANCE")} 
                      isLoading={isExtensionProcessing}
                    >
                      <CheckCircle2 className="w-4 h-4 mr-1.5 text-emerald-600" /> Pay Cash at Workshop (Skip Online)
                    </Button>
                  </>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-between text-xs text-slate-500 pt-2 border-t border-orange-100">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" /> 100% Refundable if cancelled before workshop visit
                </span>
                <button
                  type="button"
                  onClick={() => handleInitiatePayment(remainingAmount, "FULL")}
                  className="font-bold text-primary-navy hover:underline flex items-center gap-1"
                >
                  Want to pay full ₹{remainingAmount.toLocaleString('en-IN')} upfront? Click here <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}`;

const messageBoxMarker = `{message.text && (
        <div className={\`p-4 rounded-xl text-sm font-medium border shadow-sm \${message.type === "success"
          ? "bg-success/5 text-success-dark border-success/20"
          : "bg-danger/5 text-danger-dark border-danger/20"
          }\`}>
          {message.text}
        </div>
      )}`;

if (!bookingPageContent.includes('id="advance-payment-section"') && bookingPageContent.includes(messageBoxMarker)) {
  bookingPageContent = bookingPageContent.replace(
    messageBoxMarker,
    messageBoxMarker + '\n\n' + topPaymentCard
  );
  console.log('SUCCESS: Inserted Top Advance Payment Card into booking page');
} else {
  console.log('Top Advance Payment Card already inserted or marker not found');
}

if (isCRLF1) bookingPageContent = bookingPageContent.replace(/\n/g, '\r\n');
fs.writeFileSync(bookingPagePath, bookingPageContent, 'utf8');

// ==========================================
// 2. Update app/(customer)/customer/quotes/page.tsx
// ==========================================
const quotesPagePath = path.join(dashboardDir, 'app', '(customer)', 'customer', 'quotes', 'page.tsx');
let quotesPageContent = fs.readFileSync(quotesPagePath, 'utf8');
const isCRLF2 = quotesPageContent.includes('\r\n');
quotesPageContent = quotesPageContent.replace(/\r\n/g, '\n');

quotesPageContent = quotesPageContent.replace(
  'router.push(`/customer/bookings/${booking._id}`);',
  'router.push(`/customer/bookings/${booking._id}#advance-payment-section`);'
);

quotesPageContent = quotesPageContent.replace(
  '<Link href={`/customer/bookings/${booking._id}`}',
  '<Link href={`/customer/bookings/${booking._id}#advance-payment-section`}'
);

if (isCRLF2) quotesPageContent = quotesPageContent.replace(/\n/g, '\r\n');
fs.writeFileSync(quotesPagePath, quotesPageContent, 'utf8');
console.log('SUCCESS: Updated quotes page to redirect directly to #advance-payment-section');

// ==========================================
// 3. Update app/(customer)/customer/dashboard/page.tsx
// ==========================================
const dashboardPagePath = path.join(dashboardDir, 'app', '(customer)', 'customer', 'dashboard', 'page.tsx');
let dashboardPageContent = fs.readFileSync(dashboardPagePath, 'utf8');
const isCRLF3 = dashboardPageContent.includes('\r\n');
dashboardPageContent = dashboardPageContent.replace(/\r\n/g, '\n');

dashboardPageContent = dashboardPageContent.replace(
  '<Link href={`/customer/bookings/${awaiting15PercentAdvance[0]._id}`}',
  '<Link href={`/customer/bookings/${awaiting15PercentAdvance[0]._id}#advance-payment-section`}'
);

if (isCRLF3) dashboardPageContent = dashboardPageContent.replace(/\n/g, '\r\n');
fs.writeFileSync(dashboardPagePath, dashboardPageContent, 'utf8');
console.log('SUCCESS: Updated dashboard page awaiting confirmation link to point to #advance-payment-section');

console.log('ALL UPDATES COMPLETE!');
