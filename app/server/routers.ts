import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import * as db from "./db";
import { createMoveInCheckoutSession, createRentCheckoutSession, getCheckoutSession } from "./stripe/checkout";
import { calculateMoveInCost } from "./stripe/products";

// ============ VALIDATION SCHEMAS ============

const apartmentFiltersSchema = z.object({
  city: z.string().optional(),
  state: z.string().optional(),
  minPrice: z.number().optional(),
  maxPrice: z.number().optional(),
  bedrooms: z.number().optional(),
  bathrooms: z.number().optional(),
  propertyType: z.string().optional(),
  petsAllowed: z.boolean().optional(),
  parkingIncluded: z.boolean().optional(),
  nearUniversity: z.string().optional(),
  limit: z.number().default(20),
  offset: z.number().default(0),
});

const createApartmentSchema = z.object({
  title: z.string().min(5).max(255),
  description: z.string().optional(),
  propertyType: z.enum(["apartment", "studio", "house", "room", "condo", "townhouse"]),
  address: z.string().min(5).max(255),
  city: z.string().min(2).max(100),
  state: z.string().min(2).max(50),
  zipCode: z.string().min(5).max(20),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  nearbyUniversities: z.array(z.string()).optional(),
  bedrooms: z.number().min(0).max(20),
  bathrooms: z.number().min(0).max(20),
  squareFeet: z.number().optional(),
  monthlyRent: z.number().min(0),
  securityDeposit: z.number().min(0),
  applicationFee: z.number().default(0),
  minLeaseTerm: z.number().default(6),
  maxLeaseTerm: z.number().default(12),
  availableFrom: z.string().transform(s => new Date(s)),
  amenities: z.array(z.string()).optional(),
  utilitiesIncluded: z.array(z.string()).optional(),
  petsAllowed: z.boolean().default(false),
  petDeposit: z.number().optional(),
  parkingIncluded: z.boolean().default(false),
  parkingType: z.enum(["garage", "covered", "street", "lot", "none"]).optional(),
  parkingFee: z.number().optional(),
  images: z.array(z.string()).optional(),
  virtualTourUrl: z.string().optional(),
});

const studentProfileSchema = z.object({
  universityName: z.string().optional(),
  universityCity: z.string().optional(),
  universityState: z.string().optional(),
  programName: z.string().optional(),
  expectedGraduation: z.string().optional(),
  visaType: z.enum(["F1", "J1", "M1", "H1B", "OPT", "CPT", "other"]).optional(),
  visaExpirationDate: z.string().transform(s => s ? new Date(s) : undefined).optional(),
  countryOfOrigin: z.string().optional(),
  phoneNumber: z.string().optional(),
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
});

const landlordProfileSchema = z.object({
  companyName: z.string().optional(),
  businessType: z.enum(["individual", "property_management", "real_estate_company"]).optional(),
  phoneNumber: z.string().optional(),
  businessAddress: z.string().optional(),
  businessCity: z.string().optional(),
  businessState: z.string().optional(),
  businessZip: z.string().optional(),
});

const createApplicationSchema = z.object({
  apartmentId: z.number(),
  desiredMoveInDate: z.string().transform(s => new Date(s)),
  desiredLeaseTerm: z.number().min(1).max(24),
  personalStatement: z.string().optional(),
  fundingSource: z.enum([
    "family_support",
    "scholarship",
    "student_loan",
    "personal_savings",
    "employment",
    "combination"
  ]).optional(),
  monthlyBudget: z.number().optional(),
  guarantorAvailable: z.boolean().default(false),
  guarantorName: z.string().optional(),
  guarantorRelationship: z.string().optional(),
  guarantorEmail: z.string().email().optional(),
  guarantorPhone: z.string().optional(),
});

const createDocumentSchema = z.object({
  applicationId: z.number().optional(),
  documentType: z.enum([
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
  ]),
  fileName: z.string(),
  fileKey: z.string(),
  fileUrl: z.string(),
  mimeType: z.string(),
  fileSize: z.number(),
  expirationDate: z.string().transform(s => s ? new Date(s) : undefined).optional(),
});

// ============ ROUTERS ============

export const appRouter = router({
  system: systemRouter,
  
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ============ APARTMENT ROUTES ============
  apartments: router({
    list: publicProcedure
      .input(apartmentFiltersSchema)
      .query(async ({ input }) => {
        const { limit, offset, ...filters } = input;
        return await db.getApartments(filters, limit, offset);
      }),

    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const apartment = await db.getApartmentById(input.id);
        if (!apartment) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Apartment not found" });
        }
        // Increment view count
        await db.incrementApartmentViews(input.id);
        return apartment;
      }),

    create: protectedProcedure
      .input(createApartmentSchema)
      .mutation(async ({ ctx, input }) => {
        // Verify user is a landlord or admin
        if (ctx.user.role !== "landlord" && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Only landlords or admins can create listings" });
        }
        
        // Admin users can publish directly as active
        const status = ctx.user.role === "admin" ? "active" : "draft";
        
        const id = await db.createApartment({
          ...input,
          landlordId: ctx.user.id,
          status,
          nearbyUniversities: input.nearbyUniversities ? JSON.stringify(input.nearbyUniversities) : null,
          amenities: input.amenities ? JSON.stringify(input.amenities) : null,
          utilitiesIncluded: input.utilitiesIncluded ? JSON.stringify(input.utilitiesIncluded) : null,
          images: input.images ? JSON.stringify(input.images) : null,
          latitude: input.latitude?.toString(),
          longitude: input.longitude?.toString(),
          monthlyRent: input.monthlyRent.toString(),
          securityDeposit: input.securityDeposit.toString(),
          applicationFee: input.applicationFee?.toString(),
          bathrooms: input.bathrooms.toString(),
          petDeposit: input.petDeposit?.toString(),
          parkingFee: input.parkingFee?.toString(),
        } as any);
        
        return { id, success: true };
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        data: createApartmentSchema.partial(),
      }))
      .mutation(async ({ ctx, input }) => {
        const apartment = await db.getApartmentById(input.id);
        if (!apartment) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Apartment not found" });
        }
        if (apartment.landlordId !== ctx.user.id && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Not authorized to update this listing" });
        }
        
        const updateData: any = { ...input.data };
        if (input.data.nearbyUniversities) updateData.nearbyUniversities = JSON.stringify(input.data.nearbyUniversities);
        if (input.data.amenities) updateData.amenities = JSON.stringify(input.data.amenities);
        if (input.data.utilitiesIncluded) updateData.utilitiesIncluded = JSON.stringify(input.data.utilitiesIncluded);
        if (input.data.images) updateData.images = JSON.stringify(input.data.images);
        if (input.data.monthlyRent) updateData.monthlyRent = input.data.monthlyRent.toString();
        if (input.data.securityDeposit) updateData.securityDeposit = input.data.securityDeposit.toString();
        if (input.data.bathrooms) updateData.bathrooms = input.data.bathrooms.toString();
        
        await db.updateApartment(input.id, updateData);
        return { success: true };
      }),

    publish: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const apartment = await db.getApartmentById(input.id);
        if (!apartment) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Apartment not found" });
        }
        if (apartment.landlordId !== ctx.user.id && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Not authorized" });
        }
        
        await db.updateApartment(input.id, { status: "active" });
        return { success: true };
      }),

    myListings: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "landlord" && ctx.user.role !== "admin") {
        return [];
      }
      return await db.getLandlordApartments(ctx.user.id);
    }),

    save: protectedProcedure
      .input(z.object({ apartmentId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.saveApartment(ctx.user.id, input.apartmentId);
        return { success: true };
      }),

    unsave: protectedProcedure
      .input(z.object({ apartmentId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.unsaveApartment(ctx.user.id, input.apartmentId);
        return { success: true };
      }),

    saved: protectedProcedure.query(async ({ ctx }) => {
      return await db.getSavedApartments(ctx.user.id);
    }),

    isSaved: protectedProcedure
      .input(z.object({ apartmentId: z.number() }))
      .query(async ({ ctx, input }) => {
        return await db.isApartmentSaved(ctx.user.id, input.apartmentId);
      }),

    // Upload image to S3
    uploadImage: protectedProcedure
      .input(z.object({
        fileData: z.string(), // Base64 encoded image data
        mimeType: z.string(),
        fileName: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { storagePut } = await import("./storage");
        const { nanoid } = await import("nanoid");
        
        // Generate unique file key
        const ext = input.fileName.split(".").pop() || "jpg";
        const fileKey = `listings/${ctx.user.id}/${nanoid()}.${ext}`;
        
        // Convert base64 to buffer
        const fileBuffer = Buffer.from(input.fileData, "base64");
        
        // Check file size (max 10MB)
        if (fileBuffer.length > 10 * 1024 * 1024) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "File size exceeds 10MB limit" });
        }
        
        // Upload to S3
        const { url } = await storagePut(fileKey, fileBuffer, input.mimeType);
        
        return { url, key: fileKey };
      }),
  }),

  // ============ APPLICATION ROUTES ============
  applications: router({
    create: protectedProcedure
      .input(createApplicationSchema)
      .mutation(async ({ ctx, input }) => {
        const apartment = await db.getApartmentById(input.apartmentId);
        if (!apartment) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Apartment not found" });
        }
        
        const id = await db.createApplication({
          ...input,
          studentId: ctx.user.id,
          landlordId: apartment.landlordId,
          status: "draft",
          monthlyBudget: input.monthlyBudget?.toString(),
        } as any);
        
        return { id, success: true };
      }),

    submit: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const application = await db.getApplicationById(input.id);
        if (!application) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Application not found" });
        }
        if (application.studentId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Not authorized" });
        }
        
        await db.updateApplicationStatus(input.id, "submitted");
        return { success: true };
      }),

    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const application = await db.getApplicationById(input.id);
        if (!application) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Application not found" });
        }
        
        // Only allow student, landlord, or admin to view
        if (
          application.studentId !== ctx.user.id && 
          application.landlordId !== ctx.user.id && 
          ctx.user.role !== "admin"
        ) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Not authorized" });
        }
        
        return application;
      }),

    myApplications: protectedProcedure.query(async ({ ctx }) => {
      return await db.getStudentApplications(ctx.user.id);
    }),

    landlordApplications: protectedProcedure
      .input(z.object({ status: z.string().optional() }))
      .query(async ({ ctx, input }) => {
        if (ctx.user.role !== "landlord" && ctx.user.role !== "admin") {
          return [];
        }
        return await db.getLandlordApplications(ctx.user.id, input.status);
      }),

    updateStatus: protectedProcedure
      .input(z.object({
        id: z.number(),
        status: z.enum([
          "under_review",
          "documents_requested",
          "approved",
          "rejected",
          "lease_signed",
          "deposit_paid"
        ]),
        notes: z.string().optional(),
        rejectionReason: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const application = await db.getApplicationById(input.id);
        if (!application) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Application not found" });
        }
        if (application.landlordId !== ctx.user.id && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Not authorized" });
        }
        
        await db.updateApplicationStatus(input.id, input.status, input.notes, input.rejectionReason);
        return { success: true };
      }),

    withdraw: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const application = await db.getApplicationById(input.id);
        if (!application) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Application not found" });
        }
        if (application.studentId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Not authorized" });
        }
        
        await db.updateApplicationStatus(input.id, "withdrawn");
        return { success: true };
      }),
  }),

  // ============ PROFILE ROUTES ============
  profiles: router({
    getStudentProfile: protectedProcedure.query(async ({ ctx }) => {
      return await db.getStudentProfile(ctx.user.id);
    }),

    updateStudentProfile: protectedProcedure
      .input(studentProfileSchema)
      .mutation(async ({ ctx, input }) => {
        const profileComplete = !!(
          input.universityName &&
          input.visaType &&
          input.countryOfOrigin &&
          input.phoneNumber
        );
        
        await db.upsertStudentProfile({
          userId: ctx.user.id,
          ...input,
          profileComplete,
        } as any);
        
        return { success: true };
      }),

    getLandlordProfile: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "landlord" && ctx.user.role !== "admin") {
        return null;
      }
      return await db.getLandlordProfile(ctx.user.id);
    }),

    updateLandlordProfile: protectedProcedure
      .input(landlordProfileSchema)
      .mutation(async ({ ctx, input }) => {
        // Update user role to landlord if not already
        if (ctx.user.role === "user") {
          await db.updateUserRole(ctx.user.id, "landlord");
        }
        
        await db.upsertLandlordProfile({
          userId: ctx.user.id,
          ...input,
        } as any);
        
        return { success: true };
      }),

    becomeLandlord: protectedProcedure.mutation(async ({ ctx }) => {
      await db.updateUserRole(ctx.user.id, "landlord");
      await db.upsertLandlordProfile({ userId: ctx.user.id } as any);
      return { success: true };
    }),
  }),

  // ============ DOCUMENT ROUTES ============
  documents: router({
    create: protectedProcedure
      .input(createDocumentSchema)
      .mutation(async ({ ctx, input }) => {
        const id = await db.createDocument({
          ...input,
          userId: ctx.user.id,
        } as any);
        
        return { id, success: true };
      }),

    upload: protectedProcedure
      .input(z.object({
        documentType: z.enum([
          "passport", "visa", "i20", "ds2019", "enrollment_letter",
          "financial_statement", "bank_statement", "scholarship_letter",
          "guarantor_letter", "proof_of_income", "other"
        ]),
        fileName: z.string(),
        fileData: z.string(), // Base64 encoded file
        mimeType: z.string(),
        fileSize: z.number(),
        applicationId: z.number().optional(),
        expirationDate: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { storagePut } = await import("./storage");
        const { nanoid } = await import("nanoid");
        
        // Generate unique file key
        const ext = input.fileName.split(".").pop() || "pdf";
        const fileKey = `documents/${ctx.user.id}/${nanoid()}.${ext}`;
        
        // Convert base64 to buffer
        const fileBuffer = Buffer.from(input.fileData, "base64");
        
        // Upload to S3
        const { url } = await storagePut(fileKey, fileBuffer, input.mimeType);
        
        // Create document record
        const id = await db.createDocument({
          userId: ctx.user.id,
          applicationId: input.applicationId,
          documentType: input.documentType,
          fileName: input.fileName,
          fileKey,
          fileUrl: url,
          mimeType: input.mimeType,
          fileSize: input.fileSize,
          expirationDate: input.expirationDate ? new Date(input.expirationDate) : undefined,
        } as any);
        
        return { id, success: true, url };
      }),

    myDocuments: protectedProcedure.query(async ({ ctx }) => {
      return await db.getUserDocuments(ctx.user.id);
    }),

    getApplicationDocuments: protectedProcedure
      .input(z.object({ applicationId: z.number() }))
      .query(async ({ ctx, input }) => {
        const application = await db.getApplicationById(input.applicationId);
        if (!application) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Application not found" });
        }
        
        // Only allow student, landlord, or admin to view
        if (
          application.studentId !== ctx.user.id && 
          application.landlordId !== ctx.user.id && 
          ctx.user.role !== "admin"
        ) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Not authorized" });
        }
        
        return await db.getApplicationDocuments(input.applicationId);
      }),

    verify: protectedProcedure
      .input(z.object({
        id: z.number(),
        status: z.enum(["verified", "rejected"]),
        notes: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "landlord" && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Not authorized" });
        }
        
        await db.updateDocumentVerification(input.id, input.status, ctx.user.id, input.notes);
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        // TODO: Also delete from S3
        await db.deleteDocument(input.id);
        return { success: true };
      }),
  }),

  // ============ DASHBOARD STATS ============
  stats: router({
    landlord: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "landlord" && ctx.user.role !== "admin") {
        return null;
      }
      return await db.getLandlordStats(ctx.user.id);
    }),

    student: protectedProcedure.query(async ({ ctx }) => {
      return await db.getStudentStats(ctx.user.id);
    }),
  }),

  // ============ UNIVERSITY ROUTES ============
  universities: router({
    list: publicProcedure
      .input(z.object({ state: z.string().optional() }))
      .query(async ({ input }) => {
        return await db.getUniversities(input.state);
      }),
  }),

  // ============ PAYMENT ROUTES ============
  payments: router({
    createMoveInCheckout: protectedProcedure
      .input(z.object({
        applicationId: z.number(),
        hasPet: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Get application and apartment details
        const application = await db.getApplicationById(input.applicationId);
        if (!application) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Application not found" });
        }
        
        // Verify user owns this application
        if (application.studentId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Not authorized" });
        }
        
        // Verify application is approved
        if (application.status !== "approved" && application.status !== "lease_signed") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Application must be approved before payment" });
        }
        
        const apartment = await db.getApartmentById(application.apartmentId);
        if (!apartment) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Apartment not found" });
        }
        
        // Create checkout session
        const { url, sessionId } = await createMoveInCheckoutSession({
          user: {
            id: ctx.user.id,
            email: ctx.user.email,
            name: ctx.user.name,
            stripeCustomerId: ctx.user.stripeCustomerId,
          },
          apartment: {
            id: apartment.id,
            title: apartment.title,
            monthlyRent: apartment.monthlyRent,
            securityDeposit: apartment.securityDeposit,
            applicationFee: apartment.applicationFee,
            petDeposit: apartment.petDeposit,
            petsAllowed: apartment.petsAllowed,
            landlordId: apartment.landlordId,
          },
          applicationId: input.applicationId,
          hasPet: input.hasPet,
          origin: ctx.req.headers.origin || "http://localhost:3000",
        });
        
        return { url, sessionId };
      }),

    createRentCheckout: protectedProcedure
      .input(z.object({
        apartmentId: z.number(),
        month: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        const apartment = await db.getApartmentById(input.apartmentId);
        if (!apartment) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Apartment not found" });
        }
        
        const { url, sessionId } = await createRentCheckoutSession({
          user: {
            id: ctx.user.id,
            email: ctx.user.email,
            name: ctx.user.name,
            stripeCustomerId: ctx.user.stripeCustomerId,
          },
          apartment: {
            id: apartment.id,
            title: apartment.title,
            monthlyRent: apartment.monthlyRent,
            landlordId: apartment.landlordId,
          },
          month: input.month,
          origin: ctx.req.headers.origin || "http://localhost:3000",
        });
        
        return { url, sessionId };
      }),

    getSession: protectedProcedure
      .input(z.object({ sessionId: z.string() }))
      .query(async ({ input }) => {
        const session = await getCheckoutSession(input.sessionId);
        return {
          id: session.id,
          status: session.status,
          paymentStatus: session.payment_status,
          amountTotal: session.amount_total,
          currency: session.currency,
        };
      }),

    getMoveInCost: protectedProcedure
      .input(z.object({
        apartmentId: z.number(),
        hasPet: z.boolean().optional(),
      }))
      .query(async ({ input }) => {
        const apartment = await db.getApartmentById(input.apartmentId);
        if (!apartment) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Apartment not found" });
        }
        
        return calculateMoveInCost({
          securityDeposit: apartment.securityDeposit,
          monthlyRent: apartment.monthlyRent,
          applicationFee: apartment.applicationFee,
          petDeposit: apartment.petDeposit,
          petsAllowed: apartment.petsAllowed,
          hasPet: input.hasPet,
        });
      }),

    myPayments: protectedProcedure.query(async ({ ctx }) => {
      return await db.getUserPayments(ctx.user.id);
    }),

    landlordPayments: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "landlord" && ctx.user.role !== "admin") {
        return [];
      }
      return await db.getLandlordPayments(ctx.user.id);
    }),
  }),

  // ============ NOTIFICATIONS ============
  notifications: router({
    list: protectedProcedure
      .input(z.object({ limit: z.number().default(50) }).optional())
      .query(async ({ ctx, input }) => {
        return await db.getUserNotifications(ctx.user.id, input?.limit ?? 50);
      }),

    unreadCount: protectedProcedure.query(async ({ ctx }) => {
      return await db.getUnreadNotificationCount(ctx.user.id);
    }),

    markAsRead: protectedProcedure
      .input(z.object({ notificationId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        return await db.markNotificationAsRead(input.notificationId, ctx.user.id);
      }),

    markAllAsRead: protectedProcedure.mutation(async ({ ctx }) => {
      return await db.markAllNotificationsAsRead(ctx.user.id);
    }),
  }),

  // ============ PROMOTIONS ============
  promotions: router({
    create: protectedProcedure
      .input(z.object({
        listingId: z.string(),
        plan: z.enum(["7_days", "30_days", "90_days"]),
      }))
      .mutation(async ({ ctx, input }) => {
        const priceMap = { "7_days": 999, "30_days": 2499, "90_days": 5999 }; // cents
        const amount = priceMap[input.plan];
        
        // Create promotion record
        const promotionId = await db.createPromotion({
          listingId: input.listingId,
          userId: ctx.user.id,
          plan: input.plan,
          amount,
          currency: "usd",
          status: "pending",
        });
        
        if (!promotionId) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create promotion" });
        }
        
        return { promotionId, amount };
      }),

    myPromotions: protectedProcedure.query(async ({ ctx }) => {
      return await db.getUserPromotions(ctx.user.id);
    }),

    getActive: protectedProcedure
      .input(z.object({ listingId: z.string() }))
      .query(async ({ input }) => {
        const active = await db.getActivePromotions(input.listingId);
        return active.length > 0 ? active[0] : null;
      }),
  }),
});

export type AppRouter = typeof appRouter;
