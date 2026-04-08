CREATE TYPE "public"."user_role" AS ENUM('user', 'admin', 'landlord');
--> statement-breakpoint
CREATE TYPE "public"."visa_type" AS ENUM('F1', 'J1', 'M1', 'H1B', 'OPT', 'CPT', 'other');
--> statement-breakpoint
CREATE TYPE "public"."business_type" AS ENUM('individual', 'property_management', 'real_estate_company');
--> statement-breakpoint
CREATE TYPE "public"."property_type" AS ENUM('apartment', 'studio', 'house', 'room', 'condo', 'townhouse');
--> statement-breakpoint
CREATE TYPE "public"."parking_type" AS ENUM('garage', 'covered', 'street', 'lot', 'none');
--> statement-breakpoint
CREATE TYPE "public"."apartment_status" AS ENUM('draft', 'pending_review', 'published', 'rejected', 'archived');
--> statement-breakpoint
CREATE TYPE "public"."application_status" AS ENUM('draft', 'submitted', 'under_review', 'documents_requested', 'approved', 'rejected', 'withdrawn', 'lease_signed', 'deposit_paid');
--> statement-breakpoint
CREATE TYPE "public"."funding_source" AS ENUM('family_support', 'scholarship', 'student_loan', 'personal_savings', 'employment', 'combination');
--> statement-breakpoint
CREATE TYPE "public"."document_type" AS ENUM('passport', 'visa', 'i20', 'ds2019', 'enrollment_letter', 'financial_statement', 'bank_statement', 'scholarship_letter', 'guarantor_letter', 'proof_of_income', 'other');
--> statement-breakpoint
CREATE TYPE "public"."verification_status" AS ENUM('pending', 'verified', 'rejected', 'expired');
--> statement-breakpoint
CREATE TYPE "public"."payment_type" AS ENUM('application_fee', 'security_deposit', 'first_month_rent', 'monthly_rent', 'pet_deposit', 'late_fee', 'other');
--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('pending', 'processing', 'succeeded', 'failed', 'refunded', 'partially_refunded', 'cancelled');
--> statement-breakpoint
CREATE TYPE "public"."notification_type" AS ENUM('review_approved', 'review_rejected', 'promotion_active', 'promotion_expired', 'system');
--> statement-breakpoint
CREATE TYPE "public"."promotion_plan" AS ENUM('7_days', '30_days', '90_days');
--> statement-breakpoint
CREATE TYPE "public"."promotion_status" AS ENUM('pending', 'active', 'expired', 'cancelled');
--> statement-breakpoint
CREATE TYPE "public"."listing_report_reason" AS ENUM('unavailable', 'wrong_details', 'suspicious', 'other');
--> statement-breakpoint
CREATE TABLE "apartments" (
	"id" serial PRIMARY KEY NOT NULL,
	"landlordId" integer NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"propertyType" "property_type" NOT NULL,
	"address" varchar(255) NOT NULL,
	"city" varchar(100) NOT NULL,
	"state" varchar(50) NOT NULL,
	"zipCode" varchar(20) NOT NULL,
	"latitude" numeric(10, 8),
	"longitude" numeric(11, 8),
	"nearbyUniversities" json,
	"distanceToUniversity" numeric(5, 2),
	"bedrooms" integer NOT NULL,
	"bathrooms" numeric(3, 1) NOT NULL,
	"squareFeet" integer,
	"floor" integer,
	"totalFloors" integer,
	"monthlyRent" numeric(10, 2) NOT NULL,
	"securityDeposit" numeric(10, 2) NOT NULL,
	"applicationFee" numeric(10, 2) DEFAULT '0',
	"minLeaseTerm" integer DEFAULT 6,
	"maxLeaseTerm" integer DEFAULT 12,
	"availableFrom" timestamp NOT NULL,
	"amenities" json,
	"utilitiesIncluded" json,
	"petsAllowed" boolean DEFAULT false NOT NULL,
	"petDeposit" numeric(10, 2),
	"petRent" numeric(10, 2),
	"parkingIncluded" boolean DEFAULT false NOT NULL,
	"parkingType" "parking_type",
	"parkingFee" numeric(10, 2),
	"images" json,
	"virtualTourUrl" varchar(500),
	"status" "apartment_status" DEFAULT 'draft' NOT NULL,
	"featured" boolean DEFAULT false NOT NULL,
	"viewCount" integer DEFAULT 0 NOT NULL,
	"acceptsInternationalStudents" boolean DEFAULT true NOT NULL,
	"noSsnRequired" boolean DEFAULT true NOT NULL,
	"noCreditCheckRequired" boolean DEFAULT true NOT NULL,
	"isSublease" boolean,
	"subleaseEndDate" timestamp,
	"wechatContact" varchar(100),
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "applications" (
	"id" serial PRIMARY KEY NOT NULL,
	"apartmentId" integer NOT NULL,
	"studentId" integer NOT NULL,
	"landlordId" integer NOT NULL,
	"status" "application_status" DEFAULT 'draft' NOT NULL,
	"desiredMoveInDate" timestamp NOT NULL,
	"desiredLeaseTerm" integer NOT NULL,
	"personalStatement" text,
	"fundingSource" "funding_source",
	"monthlyBudget" numeric(10, 2),
	"guarantorAvailable" boolean DEFAULT false,
	"guarantorName" varchar(255),
	"guarantorRelationship" varchar(100),
	"guarantorEmail" varchar(320),
	"guarantorPhone" varchar(30),
	"landlordNotes" text,
	"rejectionReason" text,
	"submittedAt" timestamp,
	"reviewedAt" timestamp,
	"approvedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"applicationId" integer,
	"documentType" "document_type" NOT NULL,
	"fileName" varchar(255) NOT NULL,
	"fileKey" varchar(500) NOT NULL,
	"fileUrl" varchar(1000) NOT NULL,
	"mimeType" varchar(100) NOT NULL,
	"fileSize" integer NOT NULL,
	"verificationStatus" "verification_status" DEFAULT 'pending' NOT NULL,
	"verifiedBy" integer,
	"verifiedAt" timestamp,
	"verificationNotes" text,
	"expirationDate" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "landlord_profiles" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"companyName" varchar(255),
	"businessType" "business_type",
	"phoneNumber" varchar(30),
	"businessAddress" text,
	"businessCity" varchar(100),
	"businessState" varchar(50),
	"businessZip" varchar(20),
	"taxId" varchar(50),
	"verified" boolean DEFAULT false NOT NULL,
	"verifiedAt" timestamp,
	"stripeAccountId" varchar(255),
	"stripeOnboardingComplete" boolean DEFAULT false NOT NULL,
	"totalProperties" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "landlord_profiles_userId_unique" UNIQUE("userId")
);
--> statement-breakpoint
CREATE TABLE "listing_reports" (
	"id" serial PRIMARY KEY NOT NULL,
	"apartmentId" integer NOT NULL,
	"reason" "listing_report_reason" NOT NULL,
	"notes" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"senderId" integer NOT NULL,
	"receiverId" integer NOT NULL,
	"apartmentId" integer,
	"applicationId" integer,
	"content" text NOT NULL,
	"read" boolean DEFAULT false NOT NULL,
	"readAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"type" "notification_type" NOT NULL,
	"title" varchar(255) NOT NULL,
	"titleCn" varchar(255),
	"content" text NOT NULL,
	"contentCn" text,
	"relatedListingId" varchar(100),
	"read" boolean DEFAULT false NOT NULL,
	"readAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" serial PRIMARY KEY NOT NULL,
	"applicationId" integer,
	"apartmentId" integer NOT NULL,
	"studentId" integer NOT NULL,
	"landlordId" integer NOT NULL,
	"paymentType" "payment_type" NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"currency" varchar(3) DEFAULT 'USD' NOT NULL,
	"stripePaymentIntentId" varchar(255),
	"stripeChargeId" varchar(255),
	"stripeTransferId" varchar(255),
	"paymentMethod" varchar(100),
	"status" "payment_status" DEFAULT 'pending' NOT NULL,
	"refundAmount" numeric(10, 2),
	"refundReason" text,
	"refundedAt" timestamp,
	"description" text,
	"receiptUrl" varchar(500),
	"dueDate" timestamp,
	"paidAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "promotions" (
	"id" serial PRIMARY KEY NOT NULL,
	"listingId" varchar(100) NOT NULL,
	"userId" integer NOT NULL,
	"stripePaymentIntentId" varchar(255),
	"stripeSessionId" varchar(255),
	"plan" "promotion_plan" NOT NULL,
	"amount" integer NOT NULL,
	"currency" varchar(10) DEFAULT 'usd' NOT NULL,
	"status" "promotion_status" DEFAULT 'pending' NOT NULL,
	"startDate" timestamp,
	"endDate" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "saved_apartments" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"apartmentId" integer NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "saved_apartments_user_apartment_unique" UNIQUE("userId","apartmentId")
);
--> statement-breakpoint
CREATE TABLE "student_profiles" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"universityName" varchar(255),
	"universityCity" varchar(100),
	"universityState" varchar(50),
	"programName" varchar(255),
	"expectedGraduation" varchar(20),
	"visaType" "visa_type",
	"visaExpirationDate" timestamp,
	"countryOfOrigin" varchar(100),
	"phoneNumber" varchar(30),
	"emergencyContactName" varchar(255),
	"emergencyContactPhone" varchar(30),
	"profileComplete" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "student_profiles_userId_unique" UNIQUE("userId")
);
--> statement-breakpoint
CREATE TABLE "universities" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"shortName" varchar(50),
	"city" varchar(100) NOT NULL,
	"state" varchar(50) NOT NULL,
	"latitude" numeric(10, 8),
	"longitude" numeric(11, 8),
	"internationalStudentCount" integer,
	"website" varchar(500),
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"openId" varchar(64) NOT NULL,
	"name" text,
	"email" varchar(320),
	"loginMethod" varchar(64),
	"role" "user_role" DEFAULT 'user' NOT NULL,
	"stripeCustomerId" varchar(255),
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"lastSignedIn" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_openId_unique" UNIQUE("openId")
);
