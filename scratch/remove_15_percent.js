const fs = require('fs');
const path = require('path');

const targetFile = 'c:\\Users\\ajay anthwal\\Desktop\\car_blink_dashboard\\app\\(customer)\\customer\\bookings\\[id]\\page.tsx';
let content = fs.readFileSync(targetFile, 'utf8');

const isCRLF = content.includes('\r\n');
content = content.replace(/\r\n/g, '\n');

content = content.replace('Action Required: Confirm Booking with 15% Advance', 'Action Required: Confirm Booking with Advance Payment');
content = content.replace('Pay 15% Advance to Lock Your Service Slot', 'Confirm Advance Payment to Lock Your Service Slot');
content = content.replace('Quote accepted! Complete 15% advance token via', 'Quote accepted! Complete advance payment via');
content = content.replace('15% ADVANCE TOKEN PAYABLE', 'ADVANCE PAYMENT PAYABLE');
content = content.replace('Pay Online 15% Advance', 'Pay Online Advance');
content = content.replace('Pay Online 15% Advance', 'Pay Online Advance'); // in case of multiple occurrences

if (isCRLF) {
  content = content.replace(/\n/g, '\r\n');
}

fs.writeFileSync(targetFile, content, 'utf8');
console.log('Successfully replaced 15% with Advance Payment!');
