import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, decimal, boolean, json } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extended with role support for students, landlords, and admins.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin", "landlord"]).default("user").notNull(),
  stripeCustomerId: varchar("stripeCustomerId", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Student profiles with university and visa information.
 * Links to user table for international students.
 */
export const studentProfiles = mysqlTable("student_profiles", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  universityName: varchar("universityName", { length: 255 }),
  universityCity: varchar("universityCity", { length: 100 }),
  universityState: varchar("universityState", { length: 50 }),
  programName: varchar("programName", { length: 255 }),
  expectedGraduation: varchar("expectedGraduation", { length: 20 }),
  visaType: mysqlEnum("visaType", ["F1", "J1", "M1", "H1B", "OPT", "CPT", "other"]),
  visaExpirationDate: timestamp("visaExpirationDate"),
  countryOfOrigin: varchar("countryOfOrigin", { length: 100 }),
  phoneNumber: varchar("phoneNumber", { length: 30 }),
  emergencyContactName: varchar("emergencyContactName", { length: 255 }),
  emergencyContactPhone: varchar("emergencyContactPhone", { length: 30 }),
  profileComplete: boolean("profileComplete").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type StudentProfile = typeof studentProfiles.$inferSelect;
export type InsertStudentProfile = typeof studentProfiles.$inferInsert;

/**
 * Landlord/Property Manager profiles.
 * Contains business information and verification status.
 */
export const landlordProfiles = mysqlTable("landlord_profiles", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  companyName: varchar("companyName", { length: 255 }),
  businessType: mysqlEnum("businessType", ["individual", "property_management", "real_estate_company"]),
  phoneNumber: varchar("phoneNumber", { length: 30 }),
  businessAddress: text("businessAddress"),
  businessCity: varchar("businessCity", { length: 100 }),
  businessState: varchar("businessState", { length: 50 }),
  businessZip: varchar("businessZip", { length: 20 }),
  taxId: varchar("taxId", { length: 50 }),
  verified: boolean("verified").default(false).notNull(),
  verifiedAt: timestamp("verifiedAt"),
  stripeAccountId: varchar("stripeAccountId", { length: 255 }),
  stripeOnboardingComplete: boolean("stripeOnboardingComplete").default(false).notNull(),
  totalProperties: int("totalProperties").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type LandlordProfile = typeof landlordProfiles.$inferSelect;
export type InsertLandlordProfile = typeof landlordProfiles.$inferInsert;

/**
 * Apartment listings with comprehensive property details.
 * Includes location data for Google Maps integration.
 */
export const apartments = mysqlTable("apartments", {
  id: int("id").autoincrement().primaryKey(),
  landlordId: int("landlordId").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  propertyType: mysqlEnum("propertyType", ["apartment", "studio", "house", "room", "condo", "townhouse"]).notNull(),
  
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
  bedrooms: int("bedrooms").notNull(),
  bathrooms: decimal("bathrooms", { precision: 3, scale: 1 }).notNull(),
  squareFeet: int("squareFeet"),
  floor: int("floor"),
  totalFloors: int("totalFloors"),
  
  // Pricing
  monthlyRent: decimal("monthlyRent", { precision: 10, scale: 2 }).notNull(),
  securityDeposit: decimal("securityDeposit", { precision: 10, scale: 2 }).notNull(),
  applicationFee: decimal("applicationFee", { precision: 10, scale: 2 }).default("0"),
  
  // Lease terms
  minLeaseTerm: int("minLeaseTerm").default(6),
  maxLeaseTerm: int("maxLeaseTerm").default(12),
  availableFrom: timestamp("availableFrom").notNull(),
  
  // Amenities (JSON array)
  amenities: json("amenities"),
  utilitiesIncluded: json("utilitiesIncluded"),
  
  // Pet policy
  petsAllowed: boolean("petsAllowed").default(false).notNull(),
  petDeposit: decimal("petDeposit", { precision: 10, scale: 2 }),
  petRent: decimal("petRent", { precision: 10, scale: 2 }),
  
  // Parking
  parkingIncluded: boolean("parkingIncluded").default(false).notNull(),
  parkingType: mysqlEnum("parkingType", ["garage", "covered", "street", "lot", "none"]),
  parkingFee: decimal("parkingFee", { precision: 10, scale: 2 }),
  
  // Images (JSON array of S3 URLs)
  images: json("images"),
  virtualTourUrl: varchar("virtualTourUrl", { length: 500 }),
  
  // Status
  status: mysqlEnum("status", ["draft", "active", "pending", "rented", "inactive"]).default("draft").notNull(),
  featured: boolean("featured").default(false).notNull(),
  viewCount: int("viewCount").default(0).notNull(),
  
  // International student friendly flags
  acceptsInternationalStudents: boolean("acceptsInternationalStudents").default(true).notNull(),
  noSsnRequired: boolean("noSsnRequired").default(true).notNull(),
  noCreditCheckRequired: boolean("noCreditCheckRequired").default(true).notNull(),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Apartment = typeof apartments.$inferSelect;
export type InsertApartment = typeof apartments.$inferInsert;

/**
 * Rental applications from students to apartments.
 * Tracks application status and all required information.
 */
export const applications = mysqlTable("applications", {
  id: int("id").autoincrement().primaryKey(),
  apartmentId: int("apartmentId").notNull(),
  studentId: int("studentId").notNull(),
  landlordId: int("landlordId").notNull(),
  
  // Application status
  status: mysqlEnum("status", [
    "draft",
    "submitted",
    "under_review",
    "documents_requested",
    "approved",
    "rejected",
    "withdrawn",
    "lease_signed",
    "deposit_paid"
  ]).default("draft").notNull(),
  
  // Desired lease terms
  desiredMoveInDate: timestamp("desiredMoveInDate").notNull(),
  desiredLeaseTerm: int("desiredLeaseTerm").notNull(),
  
  // Personal statement
  personalStatement: text("personalStatement"),
  
  // Income/funding information (no SSN required)
  fundingSource: mysqlEnum("fundingSource", [
    "family_support",
    "scholarship",
    "student_loan",
    "personal_savings",
    "employment",
    "combination"
  ]),
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
  submittedAt: timestamp("submittedAt"),
  reviewedAt: timestamp("reviewedAt"),
  approvedAt: timestamp("approvedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Application = typeof applications.$inferSelect;
export type InsertApplication = typeof applications.$inferInsert;

/**
 * Secure document storage for verification documents.
 * Stores S3 references for passports, visas, enrollment letters, etc.
 */
export const documents = mysqlTable("documents", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  applicationId: int("applicationId"),
  
  // Document details
  documentType: mysqlEnum("documentType", [
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
    "other"
  ]).notNull(),
  
  // File storage (S3)
  fileName: varchar("fileName", { length: 255 }).notNull(),
  fileKey: varchar("fileKey", { length: 500 }).notNull(),
  fileUrl: varchar("fileUrl", { length: 1000 }).notNull(),
  mimeType: varchar("mimeType", { length: 100 }).notNull(),
  fileSize: int("fileSize").notNull(),
  
  // Verification status
  verificationStatus: mysqlEnum("verificationStatus", [
    "pending",
    "verified",
    "rejected",
    "expired"
  ]).default("pending").notNull(),
  verifiedBy: int("verifiedBy"),
  verifiedAt: timestamp("verifiedAt"),
  verificationNotes: text("verificationNotes"),
  
  // Expiration tracking
  expirationDate: timestamp("expirationDate"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Document = typeof documents.$inferSelect;
export type InsertDocument = typeof documents.$inferInsert;

/**
 * Payment records for deposits and rent.
 * Integrates with Stripe for international payments.
 */
export const payments = mysqlTable("payments", {
  id: int("id").autoincrement().primaryKey(),
  applicationId: int("applicationId"),
  apartmentId: int("apartmentId").notNull(),
  studentId: int("studentId").notNull(),
  landlordId: int("landlordId").notNull(),
  
  // Payment details
  paymentType: mysqlEnum("paymentType", [
    "application_fee",
    "security_deposit",
    "first_month_rent",
    "monthly_rent",
    "pet_deposit",
    "late_fee",
    "other"
  ]).notNull(),
  
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 3 }).default("USD").notNull(),
  
  // Stripe integration
  stripePaymentIntentId: varchar("stripePaymentIntentId", { length: 255 }),
  stripeChargeId: varchar("stripeChargeId", { length: 255 }),
  stripeTransferId: varchar("stripeTransferId", { length: 255 }),
  paymentMethod: varchar("paymentMethod", { length: 100 }),
  
  // Status
  status: mysqlEnum("status", [
    "pending",
    "processing",
    "succeeded",
    "failed",
    "refunded",
    "partially_refunded",
    "cancelled"
  ]).default("pending").notNull(),
  
  // Refund tracking
  refundAmount: decimal("refundAmount", { precision: 10, scale: 2 }),
  refundReason: text("refundReason"),
  refundedAt: timestamp("refundedAt"),
  
  // Metadata
  description: text("description"),
  receiptUrl: varchar("receiptUrl", { length: 500 }),
  
  // Due date for rent payments
  dueDate: timestamp("dueDate"),
  paidAt: timestamp("paidAt"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Payment = typeof payments.$inferSelect;
export type InsertPayment = typeof payments.$inferInsert;

/**
 * Saved/favorited apartments for students.
 */
export const savedApartments = mysqlTable("saved_apartments", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  apartmentId: int("apartmentId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type SavedApartment = typeof savedApartments.$inferSelect;
export type InsertSavedApartment = typeof savedApartments.$inferInsert;

/**
 * Messages between students and landlords.
 */
export const messages = mysqlTable("messages", {
  id: int("id").autoincrement().primaryKey(),
  senderId: int("senderId").notNull(),
  receiverId: int("receiverId").notNull(),
  apartmentId: int("apartmentId"),
  applicationId: int("applicationId"),
  
  content: text("content").notNull(),
  read: boolean("read").default(false).notNull(),
  readAt: timestamp("readAt"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Message = typeof messages.$inferSelect;
export type InsertMessage = typeof messages.$inferInsert;

/**
 * University reference data for location matching.
 */
export const universities = mysqlTable("universities", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  shortName: varchar("shortName", { length: 50 }),
  city: varchar("city", { length: 100 }).notNull(),
  state: varchar("state", { length: 50 }).notNull(),
  latitude: decimal("latitude", { precision: 10, scale: 8 }),
  longitude: decimal("longitude", { precision: 11, scale: 8 }),
  internationalStudentCount: int("internationalStudentCount"),
  website: varchar("website", { length: 500 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type University = typeof universities.$inferSelect;
export type InsertUniversity = typeof universities.$inferInsert;


/**
 * User notifications for in-app messaging.
 * Used for review status updates, promotions, and system messages.
 */
export const notifications = mysqlTable("notifications", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  type: mysqlEnum("type", ["review_approved", "review_rejected", "promotion_active", "promotion_expired", "system"]).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  titleCn: varchar("titleCn", { length: 255 }),
  content: text("content").notNull(),
  contentCn: text("contentCn"),
  relatedListingId: varchar("relatedListingId", { length: 100 }),
  read: boolean("read").default(false).notNull(),
  readAt: timestamp("readAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;

/**
 * Listing promotions for paid featured placement.
 * Tracks promotion purchases and expiry dates.
 */
export const promotions = mysqlTable("promotions", {
  id: int("id").autoincrement().primaryKey(),
  listingId: varchar("listingId", { length: 100 }).notNull(),
  userId: int("userId").notNull(),
  stripePaymentIntentId: varchar("stripePaymentIntentId", { length: 255 }),
  stripeSessionId: varchar("stripeSessionId", { length: 255 }),
  plan: mysqlEnum("plan", ["7_days", "30_days", "90_days"]).notNull(),
  amount: int("amount").notNull(), // in cents
  currency: varchar("currency", { length: 10 }).default("usd").notNull(),
  status: mysqlEnum("status", ["pending", "active", "expired", "cancelled"]).default("pending").notNull(),
  startDate: timestamp("startDate"),
  endDate: timestamp("endDate"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Promotion = typeof promotions.$inferSelect;
export type InsertPromotion = typeof promotions.$inferInsert;
