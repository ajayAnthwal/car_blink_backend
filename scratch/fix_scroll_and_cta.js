const fs = require('fs');
const path = require('path');

// 1. Fix double scrollbar in partner-login/page.tsx
const partnerLoginPath = path.resolve(__dirname, '../../car_blink/app/(auth)/partner-login/page.tsx');
if (fs.existsSync(partnerLoginPath)) {
  let content = fs.readFileSync(partnerLoginPath, 'utf8');
  content = content.replace(
    'className="flex flex-col justify-center p-6 sm:p-12 lg:p-16 max-h-screen overflow-y-auto"',
    'className="flex flex-col justify-center p-6 sm:p-12 lg:p-16 min-h-screen"'
  );
  fs.writeFileSync(partnerLoginPath, content, 'utf8');
  console.log("Fixed double scrollbar in partner-login/page.tsx");
}

// 2. Fix double scrollbar in register-view.tsx as well
const registerViewPath = path.resolve(__dirname, '../../car_blink/features/auth/components/register-view.tsx');
if (fs.existsSync(registerViewPath)) {
  let content = fs.readFileSync(registerViewPath, 'utf8');
  content = content.replace(
    'className="flex flex-col justify-center p-6 sm:p-12 lg:p-16 max-h-screen overflow-y-auto"',
    'className="flex flex-col justify-center p-6 sm:p-12 lg:p-16 min-h-screen"'
  );
  fs.writeFileSync(registerViewPath, content, 'utf8');
  console.log("Fixed double scrollbar in register-view.tsx");
}

// 3. Update PartnerCTA.tsx to not embed huge form on Home Page, but show text and link to /partner-login
const partnerCtaPath = path.resolve(__dirname, '../../car_blink/features/workshops/components/PartnerCTA.tsx');
const newPartnerCta = `"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { Check, TrendingUp, ArrowRight, ShieldCheck, Wrench, Building2 } from "lucide-react";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";

const BENEFITS = [
  {
    title: "Daily High-Intent Customer Leads",
    desc: "Connect directly with verified car owners searching for repair & maintenance services in your local area."
  },
  {
    title: "Zero Upfront Cost & Transparent Payouts",
    desc: "No expensive subscriptions or hidden fees. Send quotes directly and get timely digital payouts."
  },
  {
    title: "Digital Workshop Management Console",
    desc: "All-in-one console to accept bookings, track live repair jobs, submit estimates, and issue warranties."
  },
  {
    title: "Verified Partner Badge & Trust",
    desc: "Get certified by CarBlink Field Operations team to boost your workshop reputation and customer trust."
  }
];

export default function PartnerCTA() {
  return (
    <div id="become-partner-form" className="flex-1 bg-white rounded-3xl relative overflow-hidden flex flex-col lg:flex-row justify-between items-stretch w-full border border-neutral-text-muted/10 shadow-xl shadow-primary-blue/5 min-h-[450px]">
      {/* Background Decorative Glow */}
      <div className="absolute -top-16 -left-16 w-64 h-64 bg-primary-blue/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 left-1/3 w-72 h-72 bg-accent-orange/5 rounded-full blur-3xl pointer-events-none" />

      {/* Left Column - Content & Call to Actions */}
      <div className="flex-1 p-6 sm:p-8 lg:p-12 flex flex-col justify-between gap-6 items-center text-center lg:items-start lg:text-left relative z-10">
        <div className="flex flex-col gap-3">
          <Badge variant="info" className="self-center lg:self-start bg-accent-orange/10 text-accent-orange border border-accent-orange/20 shadow-none font-bold">
            <span className="flex items-center gap-1.5 text-accent-orange">
              <TrendingUp className="w-3.5 h-3.5" />
              For Workshops &amp; Garages
            </span>
          </Badge>

          <h3 className="font-heading font-black text-2xl sm:text-3xl lg:text-4xl text-neutral-text-dark tracking-tight leading-tight">
            Grow Your Workshop <br className="hidden sm:inline" />
            <span className="text-accent-orange">with CarBlink</span>
          </h3>

          <p className="font-body text-sm sm:text-base text-neutral-text-muted max-w-xl leading-relaxed">
            Join 2,500+ verified workshop garages across India. Receive genuine repair leads, manage service quotes, and increase your monthly garage revenue with zero marketing spend.
          </p>
        </div>

        {/* Benefits Checklist */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 w-full my-2">
          {BENEFITS.map((benefit, idx) => (
            <div key={idx} className="flex items-start gap-3 p-3.5 rounded-2xl bg-neutral-bg/60 border border-neutral-text-muted/10 text-left">
              <div className="flex items-center justify-center w-5 h-5 rounded-full bg-success/15 shrink-0 mt-0.5">
                <Check className="w-3.5 h-3.5 text-success" strokeWidth={3} />
              </div>
              <div>
                <p className="font-heading font-bold text-xs sm:text-sm text-neutral-text-dark">
                  {benefit.title}
                </p>
                <p className="font-body text-xs text-neutral-text-muted mt-0.5 leading-snug">
                  {benefit.desc}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* CTA Buttons */}
        <div className="w-full flex flex-col sm:flex-row items-center gap-3.5 pt-2">
          <Link
            href="/partner-login?mode=register"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 py-3.5 px-7 rounded-xl bg-accent-orange hover:bg-accent-orange/90 text-white font-bold text-sm sm:text-base shadow-lg shadow-accent-orange/25 transition-all hover:scale-[1.02]"
          >
            <Wrench className="w-4 h-4" />
            Register Workshop as Partner
            <ArrowRight className="w-4 h-4 ml-1" />
          </Link>

          <Link
            href="/partner-login?mode=login"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl bg-white hover:bg-neutral-50 text-primary-navy border-2 border-primary-navy/15 hover:border-primary-navy font-bold text-sm sm:text-base transition-all"
          >
            <Building2 className="w-4 h-4 text-primary-navy" />
            Partner Sign In
          </Link>
        </div>

        {/* Reassurance text */}
        <p className="text-xs text-neutral-text-muted flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Free registration • Quick 2-minute setup • Verified by Field Operations</span>
        </p>
      </div>

      {/* Right Column - Image & Floating Speech Bubble */}
      <div className="relative w-full lg:w-2/5 min-h-[300px] lg:min-h-full shrink-0 overflow-hidden">
        <Image
          src="/images/mechanic-partner.png"
          alt="Become a Partner mechanic"
          fill
          className="object-cover object-center"
          sizes="(max-width: 1024px) 100vw, 40vw"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-r from-white/40 via-transparent to-transparent lg:from-white/50" />
        <div className="absolute top-4 right-4 lg:-left-4 lg:right-auto lg:top-8 bg-white text-primary-blue text-xs font-heading font-black px-4 py-2 rounded-2xl shadow-lg border border-neutral-text-muted/10 z-20">
          Grow Your Business
          <div className="absolute -bottom-1 left-6 w-2.5 h-2.5 bg-white border-b border-r border-neutral-text-muted/10 transform rotate-45" />
        </div>
      </div>
    </div>
  );
}
`;

fs.writeFileSync(partnerCtaPath, newPartnerCta, 'utf8');
console.log("Updated PartnerCTA.tsx to clean text + CTA link buttons without the massive inline form!");
