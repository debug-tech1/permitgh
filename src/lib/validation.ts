import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().trim().min(2, "Enter your full name").max(120),
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
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
});

export const updateStatusSchema = z.object({
  requestId: z.string().min(1),
  status: z.enum(["under_review", "additional_info_needed", "approved", "rejected"]),
  remark: z.string().trim().max(1000).optional().default(""),
});

export const serviceConfigSchema = z.object({
  serviceTypeId: z.string().min(1),
  slaDays: z.coerce.number().int().min(1, "Must be at least 1 day").max(90, "Keep it under 90 days"),
  feeGhs: z.coerce.number().int().min(0, "Can't be negative").max(100000, "Keep it under GH₵100,000"),
});

export const MAX_ATTACHMENT_BYTES = 2 * 1024 * 1024; // 2MB per file — see technical debt log
export const MAX_ATTACHMENTS = 5; // per request
