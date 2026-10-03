const fs = require('fs');

const targetFile = 'c:\\Users\\ajay anthwal\\Desktop\\car_blink_dashboard\\app\\(executive)\\executive\\leads\\page.tsx';
let content = fs.readFileSync(targetFile, 'utf8');

const isCRLF = content.includes('\r\n');
content = content.replace(/\r\n/g, '\n');

const oldLeadPaymentBadge = `{lead.paymentMode && (
                              <span className="px-1.5 py-0.5 bg-green-50 text-green-700 rounded text-[10px] font-medium border border-green-100 uppercase">
                                {lead.paymentMode}
                              </span>
                            )}`;

const newLeadPaymentBadge = `{lead.paymentMode && (
                              <span className={\`px-1.5 py-0.5 rounded text-[10px] font-bold border uppercase inline-flex items-center gap-1 \${
                                lead.paymentMode === 'CASH'
                                  ? 'bg-amber-50 text-amber-800 border-amber-200'
                                  : 'bg-blue-50 text-blue-800 border-blue-200'
                              }\`}>
                                {lead.paymentMode === 'CASH' ? '💵 CASH' : '💳 ONLINE'}
                              </span>
                            )}`;

if (content.includes(oldLeadPaymentBadge)) {
  content = content.replace(oldLeadPaymentBadge, newLeadPaymentBadge);
  console.log('SUCCESS: Updated lead payment badge in executive/leads/page.tsx');
} else {
  console.log('FAIL: lead payment badge not found');
}

if (isCRLF) {
  content = content.replace(/\n/g, '\r\n');
}

fs.writeFileSync(targetFile, content, 'utf8');
