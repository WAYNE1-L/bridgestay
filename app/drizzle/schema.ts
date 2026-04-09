import { boolean, decimal, integer, json, pgEnum, pgTable, serial, text, timestamp, unique, varchar } from "drizzle-orm/pg-core";

const dateTimestamp = (name: string) => timestamp(name, { mode: "date" });

const userRoleEnum = pgEnum("user_role", ["user", "admin", "landlord"]);
const visaTypeEnum = pgEnum("visa_type", ["F1", "J1", "M1", "H1B", "OPT", "CPT", "other"]);
const businessTypeEnum = pgEnum("business_type", ["individual", "property_management", "real_estate_company"]);
const propertyTypeEnum = pgEnum("property_type", ["apartment", "studio", "house", "room", "condo", "townhouse"]);
const parkingTypeEnum = pgEnum("parking_type", ["garage", "covered", "street", "lot", "none"]);
const apartmentStatusEnum = pgEnum("apartment_status", ["draft", "pending_review", "published", "rejected", "archived"]);
const applicationStatusEnum = pgEnum("application_status", [
  "draft",
  "submitted",
  "under_review",
  "documents_requested",
  "approved",
  "rejected",
  "withdrawn",
  "lease_signed",
  "deposit_paid",
]);
const fundingSourceEnum = pgEnum("funding_source", [
  "family_support",
  "scholarship",
  "student_loan",
  "personal_savings",
  "employment",
  "combination",
]);
const documentTypeEnum = pgEnum("document_type", [
  "passport",
  "visa",
  "i20",
  "ds2019",
  "enrollment_letter",
  "financial_statement",
  "bank_statement",
  "scholarship_letter",
  "guarantor_letter",
  "proof_of_income",
  "other",
]);
const verificationStatusEnum = pgEnum("verification_status", [
  "pending",
  "verified",
  "rejected",
  "expired",
]);
const paymentTypeEnum = pgEnum("payment_type", [
  "application_fee",
  "security_deposit",
  "first_month_rent",
  "monthly_rent",
  "pet_deposit",
  "late_fee",
  "other",
]);
const paymentStatusEnum = pgEnum("payment_status", [
  "pending",
  "processing",
  "succeeded",
  "failed",
  "refunded",
  "partially_refunded",
  "cancelled",
]);
const notificationTypeEnum = pgEnum("notification_type", [
  "review_approved",
  "review_rejected",
  "promotion_active",
  "promotion_expired",
  "system",
]);
const promotionPlanEnum = pgEnum("promotion_plan", ["7_days", "30_days", "90_days"]);
const promotionStatusEnum = pgEnum("promotion_status", ["pending", "active", "expired", "cancelled"]);
const listingReportReasonEnum = pgEnum("listing_report_reason", ["unavailable", "wrong_details", "suspicious", "other"]);
const outreachStatusEnum = pgEnum("outreach_status", [
  "not_contacted",
  "contacted",
  "in_conversation",
  "partnered",
  "declined",
  "expired",
]);

/**
 * Core user table backing auth flow.
 * Extended with role support for students, landlords, and admins.
 */
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: userRoleEnum("role").default("user").notNull(),
  stripeCustomerId: varchar("stripeCustomerId", { length: 255 }),
  createdAt: dateTimestamp("createdAt").defaultNow().notNull(),
  updatedAt: dateTimestamp("updatedAt").defaultNow().$onUpdate(() => new Date()).notNull(),
  lastSignedIn: dateTimestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Student profiles with university and visa information.
 * Links to user table for international students.
 */
export const studentProfiles = pgTable("student_profiles", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull().unique(),
  universityName: varchar("universityName", { length: 255 }),
  universityCity: varchar("universityCity", { length: 100 }),
  universityState: varchar("universityState", { length: 50 }),
  programName: varchar("programName", { length: 255 }),
  expectedGraduation: varchar("expectedGraduation", { length: 20 }),
  visaType: visaTypeEnum("visaType"),
  visaExpirationDate: dateTimestamp("visaExpirationDate"),
  countryOfOrigin: varchar("countryOfOrigin", { length: 100 }),
  phoneNumber: varchar("phoneNumber", { length: 30 }),
  emergencyContactName: varchar("emergencyContactName", { length: 255 }),
  emergencyContactPhone: varchar("emergencyContactPhone", { length: 30 }),
  profileComplete: boolean("profileComplete").default(false).notNull(),
  createdAt: dateTimestamp("createdAt").defaultNow().notNull(),
  updatedAt: dateTimestamp("updatedAt").defaultNow().$onUpdate(() => new Date()).notNull(),
});

export type StudentProfile = typeof studentProfiles.$inferSelect;
export type InsertStudentProfile = typeof studentProfiles.$inferInsert;

/**
 * Landlord/Property Manager profiles.
 * Contains business information and verification status.
 */
export const landlordProfiles = pgTable("landlord_profiles", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull().unique(),
  companyName: varchar("companyName", { length: 255 }),
  businessType: businessTypeEnum("businessType"),
  phoneNumber: varchar("phoneNumber", { length: 30 }),
  businessAddress: text("businessAddress"),
  businessCity: varchar("businessCity", { length: 100 }),
  businessState: varchar("businessState", { length: 50 }),
  businessZip: varchar("businessZip", { length: 20 }),
  taxId: varchar("taxId", { length: 50 }),
  verified: boolean("verified").default(false).notNull(),
  verifiedAt: dateTimestamp("verifiedAt"),
  stripeAccountId: varchar("stripeAccountId", { length: 255 }),
  stripeOnboardingComplete: boolean("stripeOnboardingComplete").default(false).notNull(),
  totalProperties: integer("totalProperties").default(0).notNull(),
  createdAt: dateTimestamp("createdAt").defaultNow().notNull(),
  updatedAt: dateTimestamp("updatedAt").defaultNow().$onUpdate(() => new Date()).notNull(),
});

export type LandlordProfile = typeof landlordProfiles.$inferSelect;
export type InsertLandlordProfile = typeof landlordProfiles.$inferInsert;

/**
 * Apartment listings with comprehensive property details.
 * Includes location data for Google Maps integration.
 */
export const apartments = pgTable("apartments", {
  id: serial("id").primaryKey(),
  landlordId: integer("landlordId").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  propertyType: propertyTypeEnum("propertyType").notNull(),

  // Address
  address: varchar("address", { length: 255 }).notNull(),
  city: varchar("city", { length: 100 }).notNull(),
  state: varchar("state", { length: 50 }).notNull(),
  zipCode: varchar("zipCode", { length: 20 }).notNull(),

  // Location for Google Maps
  latitude: decimal("latitude", { precision: 10, scale: 8 }),
  longitude: decimal("longitude", { precision: 11, scale: 8 }),

  // Nearby universities (JSON array of university names/IDs)
  nearbyUniversities: json("nearbyUniversities"),
  distanceToUniversity: decimal("distanceToUniversity", { precision: 5, scale: 2 }),

  // Property details
  bedrooms: integer("bedrooms").notNull(),
  bathrooms: decimal("bathrooms", { precision: 3, scale: 1 }).notNull(),
  squareFeet: integer("squareFeet"),
  floor: integer("floor"),
  totalFloors: integer("totalFloors"),

  // Pricing
  monthlyRent: decimal("monthlyRent", { precision: 10, scale: 2 }).notNull(),
  securityDeposit: decimal("securityDeposit", { precision: 10, scale: 2 }).notNull(),
  applicationFee: decimal("applicationFee", { precision: 10, scale: 2 }).default("0"),

  // Lease terms
  minLeaseTerm: integer("minLeaseTerm").default(6),
  maxLeaseTerm: integer("maxLeaseTerm").default(12),
  availableFrom: dateTimestamp("availableFrom").notNull(),

  // Amenities (JSON array)
  amenities: json("amenities"),
  utilitiesIncluded: json("utilitiesIncluded"),

  // Pet policy
  petsAllowed: boolean("petsAllowed").default(false).notNull(),
  petDeposit: decimal("petDeposit", { precision: 10, scale: 2 }),
  petRent: decimal("petRent", { precision: 10, scale: 2 }),

  // Parking
  parkingIncluded: boolean("parkingIncluded").default(false).notNull(),
  parkingType: parkingTypeEnum("parkingType"),
  parkingFee: decimal("parkingFee", { precision: 10, scale: 2 }),

  // Images (JSON array of S3 URLs)
  images: json("images"),
  virtualTourUrl: varchar("virtualTourUrl", { length: 500 }),

  // Status
  status: apartmentStatusEnum("status").default("draft").notNull(),
  featured: boolean("featured").default(false).notNull(),
  viewCount: integer("viewCount").default(0).notNull(),

  // International student friendly flags
  acceptsInternationalStudents: boolean("acceptsInternationalStudents").default(true).notNull(),
  noSsnRequired: boolean("noSsnRequired").default(true).notNull(),
  noCreditCheckRequired: boolean("noCreditCheckRequired").default(true).notNull(),

  // Sublease-specific fields (Phase 3)
  isSublease: boolean("isSublease"),
  subleaseEndDate: dateTimestamp("subleaseEndDate"),
  wechatContact: varchar("wechatContact", { length: 100 }),

  // Outreach tracking — used by admin to track contact with WeChat landlords
  outreachStatus: outreachStatusEnum("outreachStatus").default("not_contacted").notNull(),
  outreachNotes: text("outreachNotes"),
  outreachLastContactedAt: dateTimestamp("outreachLastContactedAt"),

  createdAt: dateTimestamp("createdAt").defaultNow().notNull(),
  updatedAt: dateTimestamp("updatedAt").defaultNow().$onUpdate(() => new Date()).notNull(),
});

export type Apartment = typeof apartments.$inferSelect;
export type InsertApartment = typeof apartments.$inferInsert;

/**
 * Rental applications from students to apartments.
 * Tracks application status and all required information.
 */
export const applications = pgTable("applications", {
  id: serial("id").primaryKey(),
  apartmentId: integer("apartmentId").notNull(),
  studentId: integer("studentId").notNull(),
  landlordId: integer("landlordId").notNull(),

  // Application status
  status: applicationStatusEnum("status").default("draft").notNull(),

  // Desired lease terms
  desiredMoveInDate: dateTimestamp("desiredMoveInDate").notNull(),
  desiredLeaseTerm: integer("desiredLeaseTerm").notNull(),

  // Personal statement
  personalStatement: text("personalStatement"),

  // Income/funding information (no SSN required)
  fundingSource: fundingSourceEnum("fundingSource"),
  monthlyBudget: decimal("monthlyBudget", { precision: 10, scale: 2 }),
  guarantorAvailable: boolean("guarantorAvailable").default(false),
  guarantorName: varchar("guarantorName", { length: 255 }),
  guarantorRelationship: varchar("guarantorRelationship", { length: 100 }),
  guarantorEmail: varchar("guarantorEmail", { length: 320 }),
  guarantorPhone: varchar("guarantorPhone", { length: 30 }),

  // Review notes (for landlord)
  landlordNotes: text("landlordNotes"),
  rejectionReason: text("rejectionReason"),

  // Timestamps
  submittedAt: dateTimestamp("submittedAt"),
  reviewedAt: dateTimestamp("reviewedAt"),
  approvedAt: dateTimestamp("approvedAt"),
  createdAt: dateTimestamp("createdAt").defaultNow().notNull(),
  updatedAt: dateTimestamp("updatedAt").defaultNow().$onUpdate(() => new Date()).notNull(),
});

export type Application = typeof applications.$inferSelect;
export type InsertApplication = typeof applications.$inferInsert;

/**
 * Secure document storage for verification documents.
 * Stores S3 references for passports, visas, enrollment letters, etc.
 */
export const documents = pgTable("documents", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  applicationId: integer("applicationId"),

  // Document details
  documentType: documentTypeEnum("documentType").notNull(),

  // File storage (S3)
  fileName: varchar("fileName", { length: 255 }).notNull(),
  fileKey: varchar("fileKey", { length: 500 }).notNull(),
  fileUrl: varchar("fileUrl", { length: 1000 }).notNull(),
  mimeType: varchar("mimeType", { length: 100 }).notNull(),
  fileSize: integer("fileSize").notNull(),

  // Verification status
  verificationStatus: verificationStatusEnum("verificationStatus").default("pending").notNull(),
  verifiedBy: integer("verifiedBy"),
  verifiedAt: dateTimestamp("verifiedAt"),
  verificationNotes: text("verificationNotes"),

  // Expiration tracking
  expirationDate: dateTimestamp("expirationDate"),

  createdAt: dateTimestamp("createdAt").defaultNow().notNull(),
  updatedAt: dateTimestamp("updatedAt").defaultNow().$onUpdate(() => new Date()).notNull(),
});

export type Document = typeof documents.$inferSelect;
export type InsertDocument = typeof documents.$inferInsert;

/**
 * Payment records for deposits and rent.
 * Integrates with Stripe for international payments.
 */
export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  applicationId: integer("applicationId"),
  apartmentId: integer("apartmentId").notNull(),
  studentId: integer("studentId").notNull(),
  landlordId: integer("landlordId").notNull(),

  // Payment details
  paymentType: paymentTypeEnum("paymentType").notNull(),

  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 3 }).default("USD").notNull(),

  // Stripe integration
  stripePaymentIntentId: varchar("stripePaymentIntentId", { length: 255 }),
  stripeChargeId: varchar("stripeChargeId", { length: 255 }),
  stripeTransferId: varchar("stripeTransferId", { length: 255 }),
  paymentMethod: varchar("paymentMethod", { length: 100 }),

  // Status
  status: paymentStatusEnum("status").default("pending").notNull(),

  // Refund tracking
  refundAmount: decimal("refundAmount", { precision: 10, scale: 2 }),
  refundReason: text("refundReason"),
  refundedAt: dateTimestamp("refundedAt"),

  // Metadata
  description: text("description"),
  receiptUrl: varchar("receiptUrl", { length: 500 }),

  // Due date for rent payments
  dueDate: dateTimestamp("dueDate"),
  paidAt: dateTimestamp("paidAt"),

  createdAt: dateTimestamp("createdAt").defaultNow().notNull(),
  updatedAt: dateTimestamp("updatedAt").defaultNow().$onUpdate(() => new Date()).notNull(),
});

export type Payment = typeof payments.$inferSelect;
export type InsertPayment = typeof payments.$inferInsert;

/**
 * Saved/favorited apartments for students.
 */
export const savedApartments = pgTable("saved_apartments", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  apartmentId: integer("apartmentId").notNull(),
  createdAt: dateTimestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  userApartmentUnique: unique("saved_apartments_user_apartment_unique").on(table.userId, table.apartmentId),
}));

export type SavedApartment = typeof savedApartments.$inferSelect;
export type InsertSavedApartment = typeof savedApartments.$inferInsert;

/**
 * Messages between students and landlords.
 */
export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  senderId: integer("senderId").notNull(),
  receiverId: integer("receiverId").notNull(),
  apartmentId: integer("apartmentId"),
  applicationId: integer("applicationId"),

  content: text("content").notNull(),
  read: boolean("read").default(false).notNull(),
  readAt: dateTimestamp("readAt"),

  createdAt: dateTimestamp("createdAt").defaultNow().notNull(),
});

export type Message = typeof messages.$inferSelect;
export type InsertMessage = typeof messages.$inferInsert;

/**
 * University reference data for location matching.
 */
export const universities = pgTable("universities", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  shortName: varchar("shortName", { length: 50 }),
  city: varchar("city", { length: 100 }).notNull(),
  state: varchar("state", { length: 50 }).notNull(),
  latitude: decimal("latitude", { precision: 10, scale: 8 }),
  longitude: decimal("longitude", { precision: 11, scale: 8 }),
  internationalStudentCount: integer("internationalStudentCount"),
  website: varchar("website", { length: 500 }),
  createdAt: dateTimestamp("createdAt").defaultNow().notNull(),
});

export type University = typeof universities.$inferSelect;
export type InsertUniversity = typeof universities.$inferInsert;

/**
 * User notifications for in-app messaging.
 * Used for review status updates, promotions, and system messages.
 */
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  type: notificationTypeEnum("type").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  titleCn: varchar("titleCn", { length: 255 }),
  content: text("content").notNull(),
  contentCn: text("contentCn"),
  relatedListingId: varchar("relatedListingId", { length: 100 }),
  read: boolean("read").default(false).notNull(),
  readAt: dateTimestamp("readAt"),
  createdAt: dateTimestamp("createdAt").defaultNow().notNull(),
});

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;

/**
 * Listing promotions for paid featured placement.
 * Tracks promotion purchases and expiry dates.
 */
export const promotions = pgTable("promotions", {
  id: serial("id").primaryKey(),
  listingId: varchar("listingId", { length: 100 }).notNull(),
  userId: integer("userId").notNull(),
  stripePaymentIntentId: varchar("stripePaymentIntentId", { length: 255 }),
  stripeSessionId: varchar("stripeSessionId", { length: 255 }),
  plan: promotionPlanEnum("plan").notNull(),
  amount: integer("amount").notNull(),
  currency: varchar("currency", { length: 10 }).default("usd").notNull(),
  status: promotionStatusEnum("status").default("pending").notNull(),
  startDate: dateTimestamp("startDate"),
  endDate: dateTimestamp("endDate"),
  createdAt: dateTimestamp("createdAt").defaultNow().notNull(),
  updatedAt: dateTimestamp("updatedAt").defaultNow().$onUpdate(() => new Date()).notNull(),
});

export type Promotion = typeof promotions.$inferSelect;
export type InsertPromotion = typeof promotions.$inferInsert;

/**
 * User-submitted reports for listings that are stale, incorrect, or suspicious.
 * Lightweight moderation input — no full workflow, just persistence for triage.
 */
export const listingReports = pgTable("listing_reports", {
  id: serial("id").primaryKey(),
  apartmentId: integer("apartmentId").notNull(),
  reason: listingReportReasonEnum("reason").notNull(),
  notes: text("notes"),
  createdAt: dateTimestamp("createdAt").defaultNow().notNull(),
});

export type ListingReport = typeof listingReports.$inferSelect;
export type InsertListingReport = typeof listingReports.$inferInsert;
