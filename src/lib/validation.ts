import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().trim().min(2, "Enter your full name").max(120),
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  phone: z
    .string()
    .trim()
    .min(9, "Enter a valid phone number")
    .max(20, "Keep it under 20 characters")
    .regex(/^[+\d][\d\s-]*$/, "Use digits only (e.g. 024 123 4567)"),
  gpsAddress: z
    .string()
    .trim()
    .min(4, "Enter your GPS address (e.g. GA-184-9312)")
    .max(30, "Keep it under 30 characters"),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  password: z.string().min(1, "Enter your password"),
});

export const submitRequestSchema = z.object({
  serviceTypeId: z.string().min(1, "Choose a service type"),
  applicantNote: z
    .string()
    .trim()
    .min(10, "Describe your request in at least 10 characters")
    .max(2000, "Keep it under 2000 characters"),
  propertyLocation: z
    .string()
    .trim()
    .min(4, "Enter the property's location (GPS address or a description)")
    .max(200, "Keep it under 200 characters"),
});

export const updateStatusSchema = z.object({
  requestId: z.string().min(1),
  status: z.enum(["under_review", "additional_info_needed", "approved", "rejected"]),
  remark: z.string().trim().max(1000).optional().default(""),
});

const waiverFields = {
  waiverGhs: z.coerce.number().int().min(0, "Can't be negative").max(1000000).optional().default(0),
  waiverReason: z.string().trim().max(500).optional(),
};
const waiverNeedsReason = (data: { waiverGhs: number; waiverReason?: string }) =>
  data.waiverGhs === 0 || Boolean(data.waiverReason && data.waiverReason.trim().length > 0);
const WAIVER_REASON_ISSUE = { message: "Explain the reason for the waiver", path: ["waiverReason"] };

// Cost for a tiered service (business category, property type/purpose) is
// the officer's call, made from their queue — see actions/officer-actions.ts#assessFee.
export const assessFeeSchema = z
  .object({
    requestId: z.string().min(1),
    sizeTier: z.string().trim().min(1, "Choose an option"),
    ...waiverFields,
  })
  .refine(waiverNeedsReason, WAIVER_REASON_ISSUE);

// Building Permit's cost is rate x area + processing, computed by the
// billing officer — see actions/officer-actions.ts#billBuildingPermit and
// lib/fees.ts for the allowed rate bands per property type.
export const billBuildingPermitSchema = z
  .object({
    requestId: z.string().min(1),
    propertyType: z.enum(["residential", "commercial"], { message: "Choose a property type" }),
    areaSqm: z.coerce.number().positive("Enter the building's area in square metres").max(1000000),
    rate: z.coerce.number().int().positive("Enter a rate"),
    processingFee: z.coerce.number().int().min(0, "Can't be negative").max(50000),
    ...waiverFields,
  })
  .refine(waiverNeedsReason, WAIVER_REASON_ISSUE);

export const confirmPaymentSchema = z.object({
  requestId: z.string().min(1),
});

export const addAttachmentsSchema = z.object({
  requestId: z.string().min(1),
});

export const resetPasswordSchema = z.object({
  userId: z.string().min(1),
});

export const serviceConfigSchema = z.object({
  serviceTypeId: z.string().min(1),
  slaDays: z.coerce.number().int().min(1, "Must be at least 1 day").max(90, "Keep it under 90 days"),
  feeGhs: z.coerce.number().int().min(0, "Can't be negative").max(100000, "Keep it under GH₵100,000"),
});

export const MAX_ATTACHMENT_BYTES = 2 * 1024 * 1024; // 2MB per file — see technical debt log
export const MAX_ATTACHMENTS = 5; // per request
