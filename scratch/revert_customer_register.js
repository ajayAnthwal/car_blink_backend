const fs = require('fs');
const path = require('path');

const targetPath = path.resolve(__dirname, '../../car_blink/features/auth/components/register-view.tsx');

const newContent = `"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Mail,
  Phone,
  ArrowRight,
  Lock,
  User,
  RotateCcw,
  ShieldCheck,
  Eye,
  EyeOff,
  Wrench
} from "lucide-react";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Input from "@/components/ui/Input";
import { Logo } from "@/components/layout/Navbar";
import { fetchApi } from "@/lib/apiClient";
import { toast } from "sonner";

import { useRegister } from "@/hooks/auth/use-auth";
import { RegisterFormData, registerSchema } from "@/lib/validation/register.schema";

export default function RegisterView() {
  const [step, setStep] = useState<1 | 2>(1);
  const [showPassword, setShowPassword] = useState(false);
  const [otp, setOtp] = useState("");
  const [resendTimer, setResendTimer] = useState(30);
  const [canResend, setCanResend] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [apiError, setApiError] = useState("");

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors }
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: "",
      email: "",
      phone: "",
      password: "",
      role: "CUSTOMER"
    }
  });

  const { mutate: registerUser, isPending: isRegisterPending } = useRegister();

  useEffect(() => {
    let timer: any;
    if (step === 2 && resendTimer > 0) {
      timer = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    } else if (resendTimer === 0) {
      setCanResend(true);
    }
    return () => clearInterval(timer);
  }, [step, resendTimer]);

  const handleSendOtp = async (data: RegisterFormData) => {
    setApiError("");
    const cleanPhone = data.phone.replace(/[^0-9]/g, '');

    if (cleanPhone.length !== 10 || !/^[6-9]\\d{9}$/.test(cleanPhone)) {
      setApiError("Please enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9");
      return;
    }

    setIsSendingOtp(true);
    try {
      const res: any = await fetchApi("/auth/send-signup-otp", {
        method: "POST",
        body: JSON.stringify({ phone: cleanPhone }),
      });
      toast.success(res?.message || \`6-Digit OTP sent to +91 \${cleanPhone}\`);
      setStep(2);
      setResendTimer(30);
      setCanResend(false);
    } catch (err: any) {
      setApiError(err?.message || "Failed to send OTP to this mobile number. Please try again.");
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleResendOtp = async () => {
    if (!canResend || isSendingOtp) return;
    setApiError("");
    setIsSendingOtp(true);
    try {
      const phoneVal = getValues("phone").replace(/[^0-9]/g, '');
      const res: any = await fetchApi("/auth/send-signup-otp", {
        method: "POST",
        body: JSON.stringify({ phone: phoneVal }),
      });
      toast.success(res?.message || "OTP code re-sent to mobile number!");
      setResendTimer(30);
      setCanResend(false);
    } catch (err: any) {
      toast.error(err?.message || "Failed to resend OTP. Please try again.");
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleVerifyAndRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError("");
    const cleanOtp = otp.trim();

    if (cleanOtp.length !== 6) {
      setApiError("Please enter the 6-digit OTP code received on your mobile number");
      return;
    }

    setIsVerifyingOtp(true);

    const formData = getValues();
    const cleanPhone = formData.phone.replace(/[^0-9]/g, '');
    const cleanEmail = formData.email && formData.email.trim() ? formData.email.trim() : undefined;

    registerUser(
      {
        fullName: formData.fullName,
        email: cleanEmail,
        phone: cleanPhone,
        password: formData.password,
        role: "CUSTOMER",
        otp: cleanOtp
      },
      {
        onError: (err: any) => {
          setApiError(err?.message || "Invalid OTP or Registration failed. Please try again.");
          setIsVerifyingOtp(false);
        }
      }
    );
  };

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2 bg-neutral-bg font-body text-neutral-text-dark antialiased">
      {/* ---------------- LEFT SIDE: VISUAL ---------------- */}
      <section className="relative hidden lg:flex flex-col justify-center overflow-hidden bg-primary-navy p-12 xl:p-20 text-white">
        <div className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-primary-blue/20 blur-3xl" />
        <div className="pointer-events-none absolute -left-24 bottom-0 h-72 w-72 rounded-full bg-accent-orange/20 blur-3xl" />

        <div className="relative z-10 max-w-lg">
          <Logo />
          <h1 className="mt-12 font-heading font-black text-4xl leading-[1.1] sm:text-5xl tracking-tight">
            Join the future of <br />
            <span className="text-primary-blue">car maintenance.</span>
          </h1>
          <p className="mt-6 text-lg text-white/70 leading-relaxed">
            Create your account today to easily book services, manage quotes, and keep track of your vehicle's health in one place.
          </p>

          <div className="mt-12 grid grid-cols-2 gap-8 border-t border-white/10 pt-8">
            <div>
              <p className="font-heading font-black text-2xl text-white">100k+</p>
              <p className="mt-1 font-body text-xs text-white/60">Happy Car Owners</p>
            </div>
            <div>
              <p className="font-heading font-black text-2xl text-white">2.5k+</p>
              <p className="mt-1 font-body text-xs text-white/60">Verified Workshops</p>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------- RIGHT SIDE: FORM ---------------- */}
      <section className="flex flex-col justify-center p-6 sm:p-12 lg:p-16 max-h-screen overflow-y-auto">
        <div className="w-full max-w-md mx-auto py-8">
          {/* Mobile Logo */}
          <div className="mb-8 flex justify-center lg:hidden">
            <Logo />
          </div>

          <div className="mb-8 text-center lg:text-left">
            <Badge variant="info" className="bg-primary-blue/5 border-none !text-primary-blue shadow-none mb-3 inline-flex">
              {step === 1 ? <User className="w-3.5 h-3.5 mr-1.5" /> : <ShieldCheck className="w-3.5 h-3.5 mr-1.5" />}
              {step === 1 ? "Customer Registration" : "Mobile OTP Verification"}
            </Badge>
            <h2 className="font-heading font-black text-2xl sm:text-3xl tracking-tight mb-2">
              {step === 1 ? "Create an account" : "Verify Phone Number"}
            </h2>
            <p className="font-body text-xs sm:text-sm text-neutral-text-muted">
              {step === 1 
                ? "Get started by filling out your details below." 
                : \`Enter the 6-digit OTP code sent via SMS to +91 \${getValues("phone")}\`}
            </p>
          </div>

          {apiError && (
            <div className="mb-6 bg-red-50 text-red-600 text-sm p-4 rounded-xl border border-red-200 font-medium flex flex-col gap-2">
              <span>{apiError}</span>
              {apiError.toLowerCase().includes('already registered') && (
                <Link href="/login" className="text-primary-blue font-bold underline hover:text-blue-700 text-sm">
                  → Click here to Sign In / Login instead
                </Link>
              )}
            </div>
          )}

          {step === 1 ? (
            /* ================= STEP 1: REGISTRATION FORM ================= */
            <form onSubmit={handleSubmit(handleSendOtp)} className="space-y-4" autoComplete="off">
              {/* Prevent browser aggressive autofill */}
              <input type="text" style={{ display: "none" }} tabIndex={-1} autoComplete="off" readOnly />
              <input type="password" style={{ display: "none" }} tabIndex={-1} autoComplete="off" readOnly />

              <div>
                <Input
                  key="fullName"
                  label="Full Name"
                  type="text"
                  placeholder="Rahul Kumar"
                  autoComplete="off"
                  icon={<User className="h-4 w-4" />}
                  {...register("fullName")}
                />
                {errors.fullName && (
                  <p className="mt-1 text-xs text-red-500">{errors.fullName.message}</p>
                )}
              </div>

              <div>
                <Input
                  key="email"
                  label="Email Address (Optional)"
                  type="email"
                  placeholder="rahul@example.com"
                  autoComplete="off"
                  icon={<Mail className="h-4 w-4" />}
                  {...register("email")}
                />
                {errors.email && (
                  <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>
                )}
              </div>

              <div>
                <Input
                  key="phone"
                  label="Phone Number"
                  type="tel"
                  placeholder="9876543210"
                  maxLength={10}
                  autoComplete="off"
                  icon={<Phone className="h-4 w-4" />}
                  {...register("phone")}
                />
                {errors.phone && (
                  <p className="mt-1 text-xs text-red-500">{errors.phone.message}</p>
                )}
              </div>

              <div>
                <Input
                  key="password"
                  label="Password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  icon={<Lock className="h-4 w-4" />}
                  rightIcon={showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  onRightIconClick={() => setShowPassword(!showPassword)}
                  {...register("password")}
                />
                {errors.password && (
                  <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>
                )}
              </div>

              <input type="hidden" value="CUSTOMER" {...register("role")} />

              <Button
                type="submit"
                variant="accent"
                size="lg"
                fullWidth
                disabled={isSendingOtp}
                rightIcon={!isSendingOtp ? <ArrowRight className="h-4 w-4" /> : undefined}
                className="w-full h-12 mt-2 text-base font-bold bg-accent-orange hover:bg-accent-orange/90 text-white rounded-xl shadow-lg shadow-accent-orange/20"
              >
                {isSendingOtp ? "Sending OTP..." : "Continue & Send OTP"}
              </Button>
            </form>
          ) : (
            /* ================= STEP 2: OTP VERIFICATION FORM ================= */
            <form onSubmit={handleVerifyAndRegister} className="space-y-4">
              <div>
                <Input
                  key="otp"
                  name="otp"
                  label="Enter 6-Digit SMS OTP"
                  type="text"
                  placeholder="123456"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ''))}
                  icon={<Lock className="h-4 w-4" />}
                />
              </div>

              <div className="flex items-center justify-between text-xs text-gray-500 pt-1">
                <span>Didn't receive code?</span>
                {canResend ? (
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={isSendingOtp}
                    className="font-semibold text-primary-blue hover:underline inline-flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" /> Resend OTP
                  </button>
                ) : (
                  <span className="font-medium text-gray-400">Resend in {resendTimer}s</span>
                )}
              </div>

              <Button
                type="submit"
                variant="accent"
                size="lg"
                fullWidth
                disabled={otp.length < 6 || isRegisterPending || isVerifyingOtp}
                rightIcon={!isVerifyingOtp && !isRegisterPending ? <ArrowRight className="h-4 w-4" /> : undefined}
                className="w-full h-12 mt-2 text-base font-bold bg-accent-orange hover:bg-accent-orange/90 text-white rounded-xl shadow-lg shadow-accent-orange/20"
              >
                {isVerifyingOtp || isRegisterPending ? "Verifying & Creating Account..." : "Verify OTP & Create Account"}
              </Button>

              <button
                type="button"
                onClick={() => setStep(1)}
                className="w-full text-center text-xs font-semibold text-neutral-text-muted hover:text-neutral-text-dark transition-colors pt-2 cursor-pointer"
              >
                ← Edit Details / Change Phone Number
              </button>
            </form>
          )}

          <p className="mt-8 text-center lg:text-left font-body text-sm text-neutral-text-muted">
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-heading font-semibold text-primary-blue hover:text-primary-blue-dark transition-colors"
            >
              Log in
            </Link>
          </p>

          <div className="mt-6 pt-5 border-t border-gray-100 text-center lg:text-left">
            <p className="text-xs text-neutral-text-muted flex items-center justify-center lg:justify-start gap-1.5">
              <Wrench className="w-3.5 h-3.5 text-accent-orange" />
              <span>Are you a workshop or garage owner?</span>
              <Link
                href="/partner-login?mode=register"
                className="font-bold text-accent-orange hover:underline ml-1"
              >
                Partner Portal →
              </Link>
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
`;

fs.writeFileSync(targetPath, newContent, 'utf8');
console.log("register-view.tsx successfully reverted to Customer Only registration!");
