import { eq, and, or, like, gte, lte, desc, asc, sql, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { 
  InsertUser, 
  users, 
  apartments, 
  applications, 
  documents, 
  payments,
  studentProfiles,
  landlordProfiles,
  savedApartments,
  messages,
  universities,
  notifications,
  promotions,
  type Apartment,
  type InsertApartment,
  type Application,
  type InsertApplication,
  type Document,
  type InsertDocument,
  type Payment,
  type InsertPayment,
  type StudentProfile,
  type InsertStudentProfile,
  type LandlordProfile,
  type InsertLandlordProfile,
  type SavedApartment,
  type InsertSavedApartment,
  type Message,
  type InsertMessage,
  type University,
  type InsertUniversity,
  type Notification,
  type InsertNotification,
  type Promotion,
  type InsertPromotion,
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ============ USER QUERIES ============

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateUserRole(userId: number, role: "user" | "admin" | "landlord") {
  const db = await getDb();
  if (!db) return;

  await db.update(users).set({ role }).where(eq(users.id, userId));
}

// ============ STUDENT PROFILE QUERIES ============

export async function getStudentProfile(userId: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(studentProfiles).where(eq(studentProfiles.userId, userId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function upsertStudentProfile(profile: InsertStudentProfile) {
  const db = await getDb();
  if (!db) return;

  await db.insert(studentProfiles).values(profile).onDuplicateKeyUpdate({
    set: {
      universityName: profile.universityName,
      universityCity: profile.universityCity,
      universityState: profile.universityState,
      programName: profile.programName,
      expectedGraduation: profile.expectedGraduation,
      visaType: profile.visaType,
      visaExpirationDate: profile.visaExpirationDate,
      countryOfOrigin: profile.countryOfOrigin,
      phoneNumber: profile.phoneNumber,
      emergencyContactName: profile.emergencyContactName,
      emergencyContactPhone: profile.emergencyContactPhone,
      profileComplete: profile.profileComplete,
    },
  });
}

// ============ LANDLORD PROFILE QUERIES ============

export async function getLandlordProfile(userId: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(landlordProfiles).where(eq(landlordProfiles.userId, userId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function upsertLandlordProfile(profile: InsertLandlordProfile) {
  const db = await getDb();
  if (!db) return;

  await db.insert(landlordProfiles).values(profile).onDuplicateKeyUpdate({
    set: {
      companyName: profile.companyName,
      businessType: profile.businessType,
      phoneNumber: profile.phoneNumber,
      businessAddress: profile.businessAddress,
      businessCity: profile.businessCity,
      businessState: profile.businessState,
      businessZip: profile.businessZip,
      taxId: profile.taxId,
      stripeAccountId: profile.stripeAccountId,
      stripeOnboardingComplete: profile.stripeOnboardingComplete,
    },
  });
}

export async function updateLandlordStripeAccount(userId: number, stripeAccountId: string, onboardingComplete: boolean) {
  const db = await getDb();
  if (!db) return;

  await db.update(landlordProfiles)
    .set({ stripeAccountId, stripeOnboardingComplete: onboardingComplete })
    .where(eq(landlordProfiles.userId, userId));
}

// ============ APARTMENT QUERIES ============

export interface ApartmentFilters {
  city?: string;
  state?: string;
  minPrice?: number;
  maxPrice?: number;
  bedrooms?: number;
  bathrooms?: number;
  propertyType?: string;
  petsAllowed?: boolean;
  parkingIncluded?: boolean;
  nearUniversity?: string;
  status?: string;
  landlordId?: number;
}

export async function getApartments(filters: ApartmentFilters = {}, limit = 20, offset = 0) {
  const db = await getDb();
  if (!db) return [];

  const conditions = [eq(apartments.status, "active")];

  if (filters.city) {
    conditions.push(like(apartments.city, `%${filters.city}%`));
  }
  if (filters.state) {
    conditions.push(eq(apartments.state, filters.state));
  }
  if (filters.minPrice) {
    conditions.push(gte(apartments.monthlyRent, filters.minPrice.toString()));
  }
  if (filters.maxPrice) {
    conditions.push(lte(apartments.monthlyRent, filters.maxPrice.toString()));
  }
  if (filters.bedrooms) {
    conditions.push(eq(apartments.bedrooms, filters.bedrooms));
  }
  if (filters.propertyType) {
    conditions.push(eq(apartments.propertyType, filters.propertyType as any));
  }
  if (filters.petsAllowed !== undefined) {
    conditions.push(eq(apartments.petsAllowed, filters.petsAllowed));
  }
  if (filters.parkingIncluded !== undefined) {
    conditions.push(eq(apartments.parkingIncluded, filters.parkingIncluded));
  }
  if (filters.landlordId) {
    conditions.push(eq(apartments.landlordId, filters.landlordId));
  }

  const result = await db.select()
    .from(apartments)
    .where(and(...conditions))
    .orderBy(desc(apartments.featured), desc(apartments.createdAt))
    .limit(limit)
    .offset(offset);

  return result;
}

export async function getApartmentById(id: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(apartments).where(eq(apartments.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createApartment(apartment: InsertApartment) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.insert(apartments).values(apartment);
  return result[0].insertId;
}

export async function updateApartment(id: number, data: Partial<InsertApartment>) {
  const db = await getDb();
  if (!db) return;

  await db.update(apartments).set(data).where(eq(apartments.id, id));
}

export async function incrementApartmentViews(id: number) {
  const db = await getDb();
  if (!db) return;

  await db.update(apartments)
    .set({ viewCount: sql`${apartments.viewCount} + 1` })
    .where(eq(apartments.id, id));
}

export async function getLandlordApartments(landlordId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db.select()
    .from(apartments)
    .where(eq(apartments.landlordId, landlordId))
    .orderBy(desc(apartments.createdAt));
}

// ============ APPLICATION QUERIES ============

export async function createApplication(application: InsertApplication) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.insert(applications).values(application);
  return result[0].insertId;
}

export async function getApplicationById(id: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(applications).where(eq(applications.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getStudentApplications(studentId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db.select()
    .from(applications)
    .where(eq(applications.studentId, studentId))
    .orderBy(desc(applications.createdAt));
}

export async function getLandlordApplications(landlordId: number, status?: string) {
  const db = await getDb();
  if (!db) return [];

  const conditions = [eq(applications.landlordId, landlordId)];
  if (status) {
    conditions.push(eq(applications.status, status as any));
  }

  return await db.select()
    .from(applications)
    .where(and(...conditions))
    .orderBy(desc(applications.createdAt));
}

export async function updateApplicationStatus(
  id: number, 
  status: string, 
  notes?: string,
  rejectionReason?: string
) {
  const db = await getDb();
  if (!db) return;

  const updateData: Partial<Application> = { status: status as any };
  
  if (status === "submitted") {
    updateData.submittedAt = new Date();
  } else if (status === "under_review") {
    updateData.reviewedAt = new Date();
  } else if (status === "approved") {
    updateData.approvedAt = new Date();
  }
  
  if (notes) {
    updateData.landlordNotes = notes;
  }
  if (rejectionReason) {
    updateData.rejectionReason = rejectionReason;
  }

  await db.update(applications).set(updateData).where(eq(applications.id, id));
}

// ============ DOCUMENT QUERIES ============

export async function createDocument(document: InsertDocument) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.insert(documents).values(document);
  return result[0].insertId;
}

export async function getUserDocuments(userId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db.select()
    .from(documents)
    .where(eq(documents.userId, userId))
    .orderBy(desc(documents.createdAt));
}

export async function getApplicationDocuments(applicationId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db.select()
    .from(documents)
    .where(eq(documents.applicationId, applicationId))
    .orderBy(desc(documents.createdAt));
}

export async function updateDocumentVerification(
  id: number, 
  status: "pending" | "verified" | "rejected" | "expired",
  verifiedBy?: number,
  notes?: string
) {
  const db = await getDb();
  if (!db) return;

  const updateData: Partial<Document> = { 
    verificationStatus: status,
  };
  
  if (status === "verified" && verifiedBy) {
    updateData.verifiedBy = verifiedBy;
    updateData.verifiedAt = new Date();
  }
  if (notes) {
    updateData.verificationNotes = notes;
  }

  await db.update(documents).set(updateData).where(eq(documents.id, id));
}

export async function deleteDocument(id: number) {
  const db = await getDb();
  if (!db) return;

  await db.delete(documents).where(eq(documents.id, id));
}

// ============ PAYMENT QUERIES ============

export async function createPayment(payment: InsertPayment) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.insert(payments).values(payment);
  return result[0].insertId;
}

export async function getPaymentById(id: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(payments).where(eq(payments.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getPaymentByStripeId(stripePaymentIntentId: string) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select()
    .from(payments)
    .where(eq(payments.stripePaymentIntentId, stripePaymentIntentId))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updatePaymentStatus(
  id: number, 
  status: string,
  stripeChargeId?: string,
  receiptUrl?: string
) {
  const db = await getDb();
  if (!db) return;

  const updateData: Partial<Payment> = { status: status as any };
  
  if (status === "succeeded") {
    updateData.paidAt = new Date();
  }
  if (stripeChargeId) {
    updateData.stripeChargeId = stripeChargeId;
  }
  if (receiptUrl) {
    updateData.receiptUrl = receiptUrl;
  }

  await db.update(payments).set(updateData).where(eq(payments.id, id));
}

export async function getStudentPayments(studentId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db.select()
    .from(payments)
    .where(eq(payments.studentId, studentId))
    .orderBy(desc(payments.createdAt));
}

// Alias for getStudentPayments
export const getUserPayments = getStudentPayments;

export async function getLandlordPayments(landlordId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db.select()
    .from(payments)
    .where(eq(payments.landlordId, landlordId))
    .orderBy(desc(payments.createdAt));
}

// ============ SAVED APARTMENTS QUERIES ============

export async function saveApartment(userId: number, apartmentId: number) {
  const db = await getDb();
  if (!db) return;

  await db.insert(savedApartments).values({ userId, apartmentId }).onDuplicateKeyUpdate({
    set: { userId },
  });
}

export async function unsaveApartment(userId: number, apartmentId: number) {
  const db = await getDb();
  if (!db) return;

  await db.delete(savedApartments)
    .where(and(
      eq(savedApartments.userId, userId),
      eq(savedApartments.apartmentId, apartmentId)
    ));
}

export async function getSavedApartments(userId: number) {
  const db = await getDb();
  if (!db) return [];

  const saved = await db.select()
    .from(savedApartments)
    .where(eq(savedApartments.userId, userId));

  if (saved.length === 0) return [];

  const apartmentIds = saved.map(s => s.apartmentId);
  return await db.select()
    .from(apartments)
    .where(inArray(apartments.id, apartmentIds));
}

export async function isApartmentSaved(userId: number, apartmentId: number) {
  const db = await getDb();
  if (!db) return false;

  const result = await db.select()
    .from(savedApartments)
    .where(and(
      eq(savedApartments.userId, userId),
      eq(savedApartments.apartmentId, apartmentId)
    ))
    .limit(1);

  return result.length > 0;
}

// ============ MESSAGE QUERIES ============

export async function createMessage(message: InsertMessage) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.insert(messages).values(message);
  return result[0].insertId;
}

export async function getConversation(userId1: number, userId2: number, apartmentId?: number) {
  const db = await getDb();
  if (!db) return [];

  const conditions = [
    or(
      and(eq(messages.senderId, userId1), eq(messages.receiverId, userId2)),
      and(eq(messages.senderId, userId2), eq(messages.receiverId, userId1))
    )
  ];

  if (apartmentId) {
    conditions.push(eq(messages.apartmentId, apartmentId));
  }

  return await db.select()
    .from(messages)
    .where(and(...conditions))
    .orderBy(asc(messages.createdAt));
}

export async function markMessagesAsRead(receiverId: number, senderId: number) {
  const db = await getDb();
  if (!db) return;

  await db.update(messages)
    .set({ read: true, readAt: new Date() })
    .where(and(
      eq(messages.receiverId, receiverId),
      eq(messages.senderId, senderId),
      eq(messages.read, false)
    ));
}

export async function getUnreadMessageCount(userId: number) {
  const db = await getDb();
  if (!db) return 0;

  const result = await db.select({ count: sql<number>`count(*)` })
    .from(messages)
    .where(and(
      eq(messages.receiverId, userId),
      eq(messages.read, false)
    ));

  return result[0]?.count ?? 0;
}

// ============ UNIVERSITY QUERIES ============

export async function getUniversities(state?: string) {
  const db = await getDb();
  if (!db) return [];

  if (state) {
    return await db.select()
      .from(universities)
      .where(eq(universities.state, state))
      .orderBy(asc(universities.name));
  }

  return await db.select()
    .from(universities)
    .orderBy(asc(universities.name));
}

export async function getUniversityById(id: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(universities).where(eq(universities.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createUniversity(university: InsertUniversity) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.insert(universities).values(university);
  return result[0].insertId;
}

// ============ DASHBOARD STATS ============

export async function getLandlordStats(landlordId: number) {
  const db = await getDb();
  if (!db) return null;

  const apartmentCount = await db.select({ count: sql<number>`count(*)` })
    .from(apartments)
    .where(eq(apartments.landlordId, landlordId));

  const activeListings = await db.select({ count: sql<number>`count(*)` })
    .from(apartments)
    .where(and(
      eq(apartments.landlordId, landlordId),
      eq(apartments.status, "active")
    ));

  const pendingApplications = await db.select({ count: sql<number>`count(*)` })
    .from(applications)
    .where(and(
      eq(applications.landlordId, landlordId),
      eq(applications.status, "submitted")
    ));

  const totalViews = await db.select({ total: sql<number>`sum(${apartments.viewCount})` })
    .from(apartments)
    .where(eq(apartments.landlordId, landlordId));

  return {
    totalProperties: apartmentCount[0]?.count ?? 0,
    activeListings: activeListings[0]?.count ?? 0,
    pendingApplications: pendingApplications[0]?.count ?? 0,
    totalViews: totalViews[0]?.total ?? 0,
  };
}

export async function getStudentStats(studentId: number) {
  const db = await getDb();
  if (!db) return null;

  const applicationCount = await db.select({ count: sql<number>`count(*)` })
    .from(applications)
    .where(eq(applications.studentId, studentId));

  const savedCount = await db.select({ count: sql<number>`count(*)` })
    .from(savedApartments)
    .where(eq(savedApartments.userId, studentId));

  const approvedApplications = await db.select({ count: sql<number>`count(*)` })
    .from(applications)
    .where(and(
      eq(applications.studentId, studentId),
      eq(applications.status, "approved")
    ));

  return {
    totalApplications: applicationCount[0]?.count ?? 0,
    savedApartments: savedCount[0]?.count ?? 0,
    approvedApplications: approvedApplications[0]?.count ?? 0,
  };
}


// ============ NOTIFICATION QUERIES ============

export async function createNotification(data: InsertNotification) {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.insert(notifications).values(data);
  return result[0].insertId;
}

export async function getUserNotifications(userId: number, limit = 50) {
  const db = await getDb();
  if (!db) return [];
  
  return db.select()
    .from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(limit);
}

export async function getUnreadNotificationCount(userId: number) {
  const db = await getDb();
  if (!db) return 0;
  
  const result = await db.select({ count: sql<number>`count(*)` })
    .from(notifications)
    .where(and(
      eq(notifications.userId, userId),
      eq(notifications.read, false)
    ));
  
  return result[0]?.count ?? 0;
}

export async function markNotificationAsRead(notificationId: number, userId: number) {
  const db = await getDb();
  if (!db) return false;
  
  await db.update(notifications)
    .set({ read: true, readAt: new Date() })
    .where(and(
      eq(notifications.id, notificationId),
      eq(notifications.userId, userId)
    ));
  
  return true;
}

export async function markAllNotificationsAsRead(userId: number) {
  const db = await getDb();
  if (!db) return false;
  
  await db.update(notifications)
    .set({ read: true, readAt: new Date() })
    .where(and(
      eq(notifications.userId, userId),
      eq(notifications.read, false)
    ));
  
  return true;
}

// ============ PROMOTION QUERIES ============

export async function createPromotion(data: InsertPromotion) {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.insert(promotions).values(data);
  return result[0].insertId;
}

export async function getPromotionBySessionId(sessionId: string) {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.select()
    .from(promotions)
    .where(eq(promotions.stripeSessionId, sessionId))
    .limit(1);
  
  return result[0] ?? null;
}

export async function activatePromotion(promotionId: number, plan: "7_days" | "30_days" | "90_days") {
  const db = await getDb();
  if (!db) return false;
  
  const now = new Date();
  const daysMap = { "7_days": 7, "30_days": 30, "90_days": 90 };
  const endDate = new Date(now.getTime() + daysMap[plan] * 24 * 60 * 60 * 1000);
  
  await db.update(promotions)
    .set({ 
      status: "active", 
      startDate: now, 
      endDate: endDate 
    })
    .where(eq(promotions.id, promotionId));
  
  return true;
}

export async function getActivePromotions(listingId: string) {
  const db = await getDb();
  if (!db) return [];
  
  const now = new Date();
  return db.select()
    .from(promotions)
    .where(and(
      eq(promotions.listingId, listingId),
      eq(promotions.status, "active"),
      gte(promotions.endDate, now)
    ));
}

export async function expirePromotions() {
  const db = await getDb();
  if (!db) return 0;
  
  const now = new Date();
  const result = await db.update(promotions)
    .set({ status: "expired" })
    .where(and(
      eq(promotions.status, "active"),
      lte(promotions.endDate, now)
    ));
  
  return result[0].affectedRows ?? 0;
}

export async function getUserPromotions(userId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return db.select()
    .from(promotions)
    .where(eq(promotions.userId, userId))
    .orderBy(desc(promotions.createdAt));
}
