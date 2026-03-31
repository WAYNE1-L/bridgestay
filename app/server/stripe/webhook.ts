import { Request, Response } from "express";
import Stripe from "stripe";
import { ENV } from "../_core/env";
import { getDb } from "../db";
import { payments, applications } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

// Lazy-initialize Stripe so the server can start without a key in development
let _stripe: Stripe | null = null;

function getStripe(): Stripe {
  if (!_stripe) {
    if (!ENV.stripeSecretKey) {
      throw new Error(
        "[Stripe] STRIPE_SECRET_KEY is not configured. Webhook handling is unavailable."
      );
    }
    _stripe = new Stripe(ENV.stripeSecretKey, {
      apiVersion: "2025-12-15.clover",
    });
  }
  return _stripe;
}

/**
 * Stripe Webhook Handler
 * Handles payment events from Stripe
 */
export async function handleStripeWebhook(req: Request, res: Response) {
  // Fail gracefully when Stripe is not configured (local dev without keys)
  if (!ENV.stripeSecretKey || !ENV.stripeWebhookSecret) {
    console.warn("[Webhook] Stripe is not configured – ignoring webhook request");
    return res.status(503).json({ error: "Stripe is not configured" });
  }

  const sig = req.headers["stripe-signature"] as string;

  if (!sig) {
    console.error("[Webhook] No signature found");
    return res.status(400).json({ error: "No signature" });
  }

  let event: Stripe.Event;

  try {
    event = getStripe().webhooks.constructEvent(
      req.body,
      sig,
      ENV.stripeWebhookSecret
    );
  } catch (err: any) {
    console.error("[Webhook] Signature verification failed:", err.message);
    return res.status(400).json({ error: `Webhook Error: ${err.message}` });
  }
  
  // Handle test events for webhook verification
  if (event.id.startsWith("evt_test_")) {
    console.log("[Webhook] Test event detected, returning verification response");
    return res.json({ verified: true });
  }
  
  console.log(`[Webhook] Received event: ${event.type} (${event.id})`);
  
  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutComplete(session);
        break;
      }
      
      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        await handlePaymentSuccess(paymentIntent);
        break;
      }
      
      case "payment_intent.payment_failed": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        await handlePaymentFailed(paymentIntent);
        break;
      }
      
      case "charge.refunded": {
        const charge = event.data.object as Stripe.Charge;
        await handleRefund(charge);
        break;
      }
      
      default:
        console.log(`[Webhook] Unhandled event type: ${event.type}`);
    }
    
    res.json({ received: true });
  } catch (error) {
    console.error("[Webhook] Error processing event:", error);
    res.status(500).json({ error: "Webhook processing failed" });
  }
}

/**
 * Handle completed checkout session
 */
async function handleCheckoutComplete(session: Stripe.Checkout.Session) {
  console.log(`[Webhook] Checkout completed: ${session.id}`);
  
  const metadata = session.metadata || {};
  const paymentType = metadata.payment_type;
  const userId = metadata.user_id ? parseInt(metadata.user_id) : null;
  const apartmentId = metadata.apartment_id ? parseInt(metadata.apartment_id) : null;
  const applicationId = metadata.application_id ? parseInt(metadata.application_id) : null;
  const landlordId = metadata.landlord_id ? parseInt(metadata.landlord_id) : null;
  
  if (!userId || !apartmentId) {
    console.error("[Webhook] Missing required metadata");
    return;
  }
  
  const db = await getDb();
  if (!db) {
    console.error("[Webhook] Database not available");
    return;
  }
  
  if (paymentType === "move_in") {
    // Create payment records for move-in costs
    const securityDeposit = parseFloat(metadata.security_deposit || "0");
    const firstMonthRent = parseFloat(metadata.first_month_rent || "0");
    const applicationFee = parseFloat(metadata.application_fee || "0");
    const petDeposit = parseFloat(metadata.pet_deposit || "0");
    
    const paymentIntentId = typeof session.payment_intent === "string" 
      ? session.payment_intent 
      : session.payment_intent?.id;
    
    // Create payment records
    const paymentRecords = [];
    
    if (securityDeposit > 0) {
      paymentRecords.push({
        applicationId,
        apartmentId,
        studentId: userId,
        landlordId: landlordId!,
        paymentType: "security_deposit" as const,
        amount: securityDeposit.toString(),
        currency: "USD",
        stripePaymentIntentId: paymentIntentId,
        status: "succeeded" as const,
        paidAt: new Date(),
      });
    }
    
    if (firstMonthRent > 0) {
      paymentRecords.push({
        applicationId,
        apartmentId,
        studentId: userId,
        landlordId: landlordId!,
        paymentType: "first_month_rent" as const,
        amount: firstMonthRent.toString(),
        currency: "USD",
        stripePaymentIntentId: paymentIntentId,
        status: "succeeded" as const,
        paidAt: new Date(),
      });
    }
    
    if (applicationFee > 0) {
      paymentRecords.push({
        applicationId,
        apartmentId,
        studentId: userId,
        landlordId: landlordId!,
        paymentType: "application_fee" as const,
        amount: applicationFee.toString(),
        currency: "USD",
        stripePaymentIntentId: paymentIntentId,
        status: "succeeded" as const,
        paidAt: new Date(),
      });
    }
    
    if (petDeposit > 0) {
      paymentRecords.push({
        applicationId,
        apartmentId,
        studentId: userId,
        landlordId: landlordId!,
        paymentType: "pet_deposit" as const,
        amount: petDeposit.toString(),
        currency: "USD",
        stripePaymentIntentId: paymentIntentId,
        status: "succeeded" as const,
        paidAt: new Date(),
      });
    }
    
    // Insert all payment records
    for (const record of paymentRecords) {
      await db.insert(payments).values(record);
    }
    
    // Update application status to deposit_paid
    if (applicationId) {
      await db
        .update(applications)
        .set({ status: "deposit_paid" })
        .where(eq(applications.id, applicationId));
    }
    
    console.log(`[Webhook] Move-in payment recorded for user ${userId}, apartment ${apartmentId}`);
  } else if (paymentType === "monthly_rent") {
    // Create monthly rent payment record
    const amount = parseFloat(metadata.amount || "0");
    const month = metadata.month || "";
    
    const paymentIntentId = typeof session.payment_intent === "string" 
      ? session.payment_intent 
      : session.payment_intent?.id;
    
    await db.insert(payments).values({
      apartmentId,
      studentId: userId,
      landlordId: landlordId!,
      paymentType: "monthly_rent",
      amount: amount.toString(),
      currency: "USD",
      stripePaymentIntentId: paymentIntentId,
      status: "succeeded",
      description: `Rent payment for ${month}`,
      paidAt: new Date(),
    });
    
    console.log(`[Webhook] Monthly rent payment recorded for user ${userId}, month ${month}`);
  }
}

/**
 * Handle successful payment intent
 */
async function handlePaymentSuccess(paymentIntent: Stripe.PaymentIntent) {
  console.log(`[Webhook] Payment succeeded: ${paymentIntent.id}`);
  
  const db = await getDb();
  if (!db) return;
  
  // Update any pending payments with this payment intent ID
  await db
    .update(payments)
    .set({ status: "succeeded", paidAt: new Date() })
    .where(eq(payments.stripePaymentIntentId, paymentIntent.id));
}

/**
 * Handle failed payment intent
 */
async function handlePaymentFailed(paymentIntent: Stripe.PaymentIntent) {
  console.log(`[Webhook] Payment failed: ${paymentIntent.id}`);
  
  const db = await getDb();
  if (!db) return;
  
  // Update any pending payments with this payment intent ID
  await db
    .update(payments)
    .set({ status: "failed" })
    .where(eq(payments.stripePaymentIntentId, paymentIntent.id));
}

/**
 * Handle refund
 */
async function handleRefund(charge: Stripe.Charge) {
  console.log(`[Webhook] Refund processed: ${charge.id}`);
  
  const db = await getDb();
  if (!db) return;
  
  const paymentIntentId = typeof charge.payment_intent === "string"
    ? charge.payment_intent
    : charge.payment_intent?.id;
  
  if (!paymentIntentId) return;
  
  // Update payment status
  const refundAmount = charge.amount_refunded / 100; // Convert from cents
  const isFullRefund = charge.refunded;
  
  await db
    .update(payments)
    .set({
      status: isFullRefund ? "refunded" : "partially_refunded",
      refundAmount: refundAmount.toString(),
      refundedAt: new Date(),
    })
    .where(eq(payments.stripePaymentIntentId, paymentIntentId));
}
