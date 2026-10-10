import { z } from "zod";

const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-Z]{1}Z[0-9A-Z]{1}$/;
const UDYAM_REGEX = /^UDYAM-[A-Z]{2}-[0-9]{2}-[0-9]{7}$/i;

export const submitBusinessKycSchema = z
  .object({
    pan: z
      .string()
      .trim()
      .toUpperCase()
      .regex(PAN_REGEX, "Please provide a valid 10-digit PAN (e.g., ABCDE1234F)"),
    panHolderName: z.string().trim().optional(),
    isGstRegistered: z.boolean().default(false),
    gstin: z.string().trim().toUpperCase().optional(),
    gstLegalName: z.string().trim().optional(),
    gstTradeName: z.string().trim().optional(),
    gstRegistrationStatus: z.string().trim().optional(),
    nonGstProofType: z
      .enum([
        "SHOP_ESTABLISHMENT_LICENSE",
        "TRADE_LICENSE",
        "ELECTRICITY_BILL",
        "RENT_AGREEMENT",
        "MUNICIPAL_KHATA",
        "UDYAM_REGISTRATION",
        "OTHER",
      ])
      .optional(),
    proofRef: z.string().trim().optional(),
    udyamNumber: z.string().trim().toUpperCase().optional(),
    businessRegistrationProofRef: z.string().trim().optional(),
    isRepresentative: z.boolean().default(false),
    representativeDetails: z
      .object({
        fullName: z.string().trim().optional(),
        mobile: z.string().trim().optional(),
        email: z.string().trim().email("Please provide a valid email address").optional().or(z.literal("")),
        designation: z.string().trim().optional(),
      })
      .optional(),
    authorizationDocRef: z.string().trim().optional(),
    ownerName: z.string().trim().optional(),
  })
  .superRefine((data, ctx) => {
    // 1. If GST Registered: GSTIN is strictly required and must match format
    if (data.isGstRegistered) {
      if (!data.gstin || !GSTIN_REGEX.test(data.gstin)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "A valid 15-character GSTIN is required for GST-registered workshops",
          path: ["gstin"],
        });
      }
    } else {
      // 2. If NOT GST Registered: Alternate business proof is required
      if (!data.nonGstProofType) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Please select an alternate business proof type",
          path: ["nonGstProofType"],
        });
      }
      if (!data.proofRef || !data.proofRef.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Please upload your business registration/alternate proof document",
          path: ["proofRef"],
        });
      }
    }

    // 3. If Udyam is provided, validate format
    if (data.udyamNumber && data.udyamNumber.trim()) {
      if (!UDYAM_REGEX.test(data.udyamNumber.trim())) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Invalid Udyam registration number format (e.g., UDYAM-XX-00-0000000)",
          path: ["udyamNumber"],
        });
      }
    }

    // 4. If registering as Representative: details and authorization letter are mandatory
    if (data.isRepresentative) {
      if (!data.representativeDetails?.fullName || !data.representativeDetails.fullName.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Representative full name is required",
          path: ["representativeDetails", "fullName"],
        });
      }
      if (
        !data.representativeDetails?.mobile ||
        !/^[6-9]\d{9}$/.test(data.representativeDetails.mobile.trim().slice(-10))
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "A valid 10-digit mobile number is required for the representative",
          path: ["representativeDetails", "mobile"],
        });
      }
      if (!data.authorizationDocRef || !data.authorizationDocRef.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "An authorization letter from the workshop owner is required",
          path: ["authorizationDocRef"],
        });
      }
    }
  });

export type SubmitBusinessKycInput = z.infer<typeof submitBusinessKycSchema>;

export const submitWorkshopProofSchema = z.object({
  exteriorPhotoRef: z.string().trim().min(1, "Exterior photo of workshop is required"),
  interiorPhotoRef: z.string().trim().min(1, "Interior/service-bay photo of workshop is required"),
  signboardPhotoRef: z.string().trim().min(1, "Signboard / business-name photo is required"),
  addressProofType: z.enum([
    "ELECTRICITY_BILL",
    "RENT_AGREEMENT",
    "LEASE_DEED",
    "PROPERTY_TAX",
    "OTHER",
  ]),
  addressProofRef: z.string().trim().min(1, "Address proof document is required"),
  latitude: z.number().min(-90).max(90, "Latitude must be between -90 and 90"),
  longitude: z.number().min(-180).max(180, "Longitude must be between -180 and 180"),
});

export type SubmitWorkshopProofInput = z.infer<typeof submitWorkshopProofSchema>;

export const submitBankDetailsSchema = z.object({
  accountHolderName: z.string().trim().min(1, "Account holder name is required"),
  bankName: z.string().trim().min(1, "Bank name is required"),
  accountNumber: z.string().trim().regex(/^\d{9,18}$/, "Bank account number must be between 9 and 18 digits"),
  ifsc: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, "Invalid IFSC code format (e.g. SBIN0001234)"),
  bankProofRef: z.string().trim().min(1, "Cancelled cheque or passbook proof document is required"),
});

export type SubmitBankDetailsInput = z.infer<typeof submitBankDetailsSchema>;

export const VALID_SERVICES = [
  "Mechanical",
  "General Service",
  "AC",
  "Electrical",
  "Denting/Painting",
  "Detailing",
  "PPF",
  "Ceramic",
  "Car Wash",
  "Tyres",
  "Battery",
  "Insurance Repair",
  "Body Shop",
  "Other",
] as const;

export const submitWorkshopCapabilitiesSchema = z
  .object({
    services: z
      .array(z.enum(VALID_SERVICES))
      .min(1, "Please select at least one service offered by your workshop"),
    serviceBays: z.number().min(1, "Workshop must have at least 1 service bay").default(1),
    technicianCount: z.number().min(1, "Workshop must have at least 1 technician").default(1),
    workingDays: z.array(z.string()).min(1, "Please specify working days").default(["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]),
    workingHours: z
      .object({
        open: z.string().trim().min(1, "Opening time is required").default("09:00 AM"),
        close: z.string().trim().min(1, "Closing time is required").default("08:00 PM"),
      })
      .default({ open: "09:00 AM", close: "08:00 PM" }),
    pickupDropAvailable: z.boolean().default(false),
    insuranceWorkCapable: z.boolean().default(false),
    authorizedServiceClaim: z.boolean().default(false),
    authorizedServiceProofRef: z.string().trim().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.authorizedServiceClaim && (!data.authorizedServiceProofRef || !data.authorizedServiceProofRef.trim())) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Supporting authorization certificate / agreement proof is required when claiming authorized service status",
        path: ["authorizedServiceProofRef"],
      });
    }
  });

export type SubmitWorkshopCapabilitiesInput = z.infer<typeof submitWorkshopCapabilitiesSchema>;

