const fs = require('fs');
const path = require('path');

// 1. Update PartnerRegisterForm.tsx
const partnerFormPath = path.resolve(__dirname, '../../car_blink/features/auth/components/PartnerRegisterForm.tsx');
if (fs.existsSync(partnerFormPath)) {
  let content = fs.readFileSync(partnerFormPath, 'utf8');

  // Insert dummy hidden inputs right after <form> to absorb any browser password manager autofill
  if (!content.includes('style={{ display: "none" }} tabIndex={-1}')) {
    content = content.replace(
      '<form onSubmit={handleSendOtp} className="space-y-4" autoComplete="off">',
      `<form onSubmit={handleSendOtp} className="space-y-4" autoComplete="off">
          {/* Prevent Chrome/Edge aggressive credential autofill */}
          <input type="text" style={{ display: "none" }} tabIndex={-1} autoComplete="off" readOnly />
          <input type="password" style={{ display: "none" }} tabIndex={-1} autoComplete="off" readOnly />`
    );
  }

  fs.writeFileSync(partnerFormPath, content, 'utf8');
  console.log("PartnerRegisterForm updated with dummy anti-autofill inputs");
}

// 2. Update register-view.tsx
const registerViewPath = path.resolve(__dirname, '../../car_blink/features/auth/components/register-view.tsx');
if (fs.existsSync(registerViewPath)) {
  let content = fs.readFileSync(registerViewPath, 'utf8');

  content = content.replace(
    '<form onSubmit={handleSubmit(handleSendOtp)} className="space-y-4">',
    `<form onSubmit={handleSubmit(handleSendOtp)} className="space-y-4" autoComplete="off">
                  <input type="text" style={{ display: "none" }} tabIndex={-1} autoComplete="off" readOnly />
                  <input type="password" style={{ display: "none" }} tabIndex={-1} autoComplete="off" readOnly />`
  );

  content = content.replace(
    'placeholder="••••••••"\n                      icon={<Lock',
    'placeholder="••••••••"\n                      autoComplete="new-password"\n                      icon={<Lock'
  );
  content = content.replace(
    'placeholder="••••••••"\r\n                      icon={<Lock',
    'placeholder="••••••••"\r\n                      autoComplete="new-password"\r\n                      icon={<Lock'
  );

  fs.writeFileSync(registerViewPath, content, 'utf8');
  console.log("register-view.tsx updated");
}
