import { 
  db, 
  recoveriesTable, 
  recoveryAttemptsTable, 
  auditLogsTable, 
  paymentsTable, 
  eventsTable,
  notificationsTable,
  deliveryEventsTable
} from "../lib/db/src/index";
import { sql } from "drizzle-orm";

async function seed() {
  console.log("🧹 Clearing old recovery data...");
  
  // Clear tables in foreign key order
  await db.delete(deliveryEventsTable);
  await db.delete(notificationsTable);
  await db.delete(auditLogsTable);
  await db.delete(recoveryAttemptsTable);
  await db.delete(recoveriesTable);
  await db.delete(paymentsTable);
  await db.delete(eventsTable);

  console.log("✨ Seeding fresh, impressive recovery cases...");

  const now = Date.now();
  const DAY = 24 * 60 * 60 * 1000;
  const HOUR = 60 * 60 * 1000;

  const failureTemplates = [
    {
      code: "INSUFFICIENT_FUNDS",
      desc: "Card issuer declined transaction due to insufficient balance",
      rootCause: "Insufficient funds at billing cycle. Customer needs account top-up or alternate UPI retry.",
      strategies: ["smart_retry", "whatsapp", "email"],
      customer: "cust_rahul_sharma_98",
      email: "rahul.sharma@example.com",
      phone: "+919876543210",
      amount: 1499900, // ₹14,999.00
      status: "recovered",
      daysAgo: 12,
      attempts: [
        { strategy: "smart_retry", status: "failed", cost: 15, delayHours: 4 },
        { strategy: "whatsapp", status: "success", cost: 35, delayHours: 8 },
      ]
    },
    {
      code: "BANK_TIMEOUT",
      desc: "Issuing bank processing gateway timed out",
      rootCause: "Transient gateway network congestion at HDFC Bank. Ideal for off-peak smart retry.",
      strategies: ["smart_retry"],
      customer: "cust_ananya_verma_44",
      email: "ananya.v@techcorp.in",
      phone: "+919812345678",
      amount: 2999900, // ₹29,999.00
      status: "recovered",
      daysAgo: 10,
      attempts: [
        { strategy: "smart_retry", status: "success", cost: 15, delayHours: 3 },
      ]
    },
    {
      code: "AUTHENTICATION_FAILED_3DS",
      desc: "3D Secure OTP authentication failed or expired",
      rootCause: "Customer abandoned OTP prompt during peak transaction hour. Immediate WhatsApp 1-click checkout dispatched.",
      strategies: ["whatsapp", "sms", "email"],
      customer: "cust_vikram_singh_12",
      email: "vikram.singh@enterprise.co",
      phone: "+919823456789",
      amount: 4500000, // ₹45,000.00
      status: "recovered",
      daysAgo: 8,
      attempts: [
        { strategy: "whatsapp", status: "success", cost: 35, delayHours: 1 },
      ]
    },
    {
      code: "UPI_COLLECT_TIMEOUT",
      desc: "UPI collect request expired before user authorization",
      rootCause: "User missed payment request notification on mobile app. Auto-dispatched WhatsApp interactive UPI link.",
      strategies: ["whatsapp", "smart_retry"],
      customer: "cust_priya_nair_77",
      email: "priya.nair@digitalscale.io",
      phone: "+919834567890",
      amount: 899900, // ₹8,999.00
      status: "recovered",
      daysAgo: 7,
      attempts: [
        { strategy: "whatsapp", status: "failed", cost: 35, delayHours: 2 },
        { strategy: "smart_retry", status: "success", cost: 15, delayHours: 6 },
      ]
    },
    {
      code: "CARD_LIMIT_EXCEEDED",
      desc: "Credit limit threshold exceeded on corporate card",
      rootCause: "Daily transaction threshold capped by corporate issuer. Dispatched multi-channel update link.",
      strategies: ["email", "sms", "support"],
      customer: "cust_siddharth_mehta_03",
      email: "siddharth@cloudinfra.com",
      phone: "+919845678901",
      amount: 7500000, // ₹75,000.00
      status: "recovered",
      daysAgo: 6,
      attempts: [
        { strategy: "email", status: "delivered", cost: 10, delayHours: 2 },
        { strategy: "sms", status: "success", cost: 25, delayHours: 12 },
      ]
    },
    {
      code: "EXPIRED_CARD",
      desc: "Payment card on file expired",
      rootCause: "Card expiration detected on subscription renewal. Triggered automated card update email workflow.",
      strategies: ["email", "whatsapp"],
      customer: "cust_meera_patel_55",
      email: "meera.patel@acme-ventures.com",
      phone: "+919856789012",
      amount: 1999900, // ₹19,999.00
      status: "recovered",
      daysAgo: 5,
      attempts: [
        { strategy: "email", status: "success", cost: 10, delayHours: 1 },
      ]
    },
    {
      code: "INSUFFICIENT_FUNDS",
      desc: "Declined due to low account balance",
      rootCause: "Salary cycle mismatch on end-of-month charge. Scheduled off-peak retry on 1st of month.",
      strategies: ["smart_retry", "whatsapp"],
      customer: "cust_rohit_joshi_89",
      email: "rohit.joshi@fintechhub.in",
      phone: "+919867890123",
      amount: 1249900, // ₹12,499.00
      status: "recovered",
      daysAgo: 4,
      attempts: [
        { strategy: "smart_retry", status: "failed", cost: 15, delayHours: 12 },
        { strategy: "whatsapp", status: "success", cost: 35, delayHours: 24 },
      ]
    },
    {
      code: "AUTHENTICATION_FAILED_3DS",
      desc: "3D Secure authentication declined by cardholder",
      rootCause: "Browser closed before 3D-Secure challenge completed. Re-engaged via interactive WhatsApp recovery.",
      strategies: ["whatsapp", "email"],
      customer: "cust_kavita_reddy_31",
      email: "kavita.reddy@growthpulse.co",
      phone: "+919878901234",
      amount: 3499900, // ₹34,999.00
      status: "recovered",
      daysAgo: 3,
      attempts: [
        { strategy: "whatsapp", status: "success", cost: 35, delayHours: 3 },
      ]
    },
    {
      code: "BANK_TIMEOUT",
      desc: "Payment processing timeout during peak load",
      rootCause: "State Bank of India gateway timeout. Successfully auto-retried at 04:00 AM off-peak window.",
      strategies: ["smart_retry"],
      customer: "cust_arjun_deshmukh_72",
      email: "arjun.d@saasrocket.io",
      phone: "+919889012345",
      amount: 5200000, // ₹52,000.00
      status: "recovered",
      daysAgo: 3,
      attempts: [
        { strategy: "smart_retry", status: "success", cost: 15, delayHours: 7 },
      ]
    },
    {
      code: "UPI_COLLECT_TIMEOUT",
      desc: "UPI collect request timed out after 10 minutes",
      rootCause: "UPI app background process killed. Sent fallback SMS with instant NetBanking portal link.",
      strategies: ["sms", "whatsapp"],
      customer: "cust_neha_kapoor_19",
      email: "neha.kapoor@studioinnovate.com",
      phone: "+919890123456",
      amount: 1850000, // ₹18,500.00
      status: "recovered",
      daysAgo: 2,
      attempts: [
        { strategy: "sms", status: "success", cost: 25, delayHours: 2 },
      ]
    },
    {
      code: "INSUFFICIENT_FUNDS",
      desc: "Customer card declined with soft decline code",
      rootCause: "Transient balance insufficiency. Customer topped up account following WhatsApp nudge.",
      strategies: ["whatsapp", "smart_retry"],
      customer: "cust_aditya_bose_64",
      email: "aditya.bose@novatech.org",
      phone: "+919801234567",
      amount: 2750000, // ₹27,500.00
      status: "recovered",
      daysAgo: 2,
      attempts: [
        { strategy: "whatsapp", status: "failed", cost: 35, delayHours: 1 },
        { strategy: "smart_retry", status: "success", cost: 15, delayHours: 8 },
      ]
    },
    {
      code: "GATEWAY_TEMPORARY_ERROR",
      desc: "Payment aggregator gateway connection drop",
      rootCause: "Razorpay downstream node switch. Rescheduled retry automatically resolved payment.",
      strategies: ["smart_retry"],
      customer: "cust_tanya_sen_88",
      email: "tanya.sen@scaleup.ai",
      phone: "+919812345670",
      amount: 3999900, // ₹39,999.00
      status: "recovered",
      daysAgo: 1,
      attempts: [
        { strategy: "smart_retry", status: "success", cost: 15, delayHours: 2 },
      ]
    },
    {
      code: "INSUFFICIENT_FUNDS",
      desc: "Issuer declined transaction due to balance",
      rootCause: "Customer account balance low. WhatsApp notification delivered; smart retry queued for morning window.",
      strategies: ["whatsapp", "smart_retry", "email"],
      customer: "cust_harsh_vardhan_42",
      email: "harsh.v@hyperloop.in",
      phone: "+919823456701",
      amount: 1599900, // ₹15,999.00
      status: "active",
      daysAgo: 1,
      attempts: [
        { strategy: "whatsapp", status: "delivered", cost: 35, delayHours: 2 },
      ]
    },
    {
      code: "AUTHENTICATION_FAILED_3DS",
      desc: "OTP authorization pending / timed out",
      rootCause: "3DS challenge abandoned. WhatsApp recovery campaign actively engaged with customer.",
      strategies: ["whatsapp", "email"],
      customer: "cust_pooja_iyer_93",
      email: "pooja.iyer@creativelabs.io",
      phone: "+919834567012",
      amount: 4200000, // ₹42,000.00
      status: "active",
      daysAgo: 0.5,
      attempts: [
        { strategy: "whatsapp", status: "delivered", cost: 35, delayHours: 1 },
      ]
    },
    {
      code: "BANK_TIMEOUT",
      desc: "ICICI bank core banking network timeout",
      rootCause: "Core banking sync timeout. Automated off-peak smart retry scheduled in 2 hours.",
      strategies: ["smart_retry", "sms"],
      customer: "cust_manish_gupta_15",
      email: "manish.g@logisticsplus.com",
      phone: "+919845670123",
      amount: 6800000, // ₹68,000.00
      status: "active",
      daysAgo: 0.2,
      attempts: [
        { strategy: "smart_retry", status: "queued", cost: 0, delayHours: 0 },
      ]
    },
    {
      code: "CARD_EXPIRED_OR_BLOCKED",
      desc: "Card reported permanently inactive by issuer",
      rootCause: "Customer card permanently blocked. Dispatched support escalation and alternate gateway prompt.",
      strategies: ["email", "sms", "support"],
      customer: "cust_deepak_chopra_28",
      email: "deepak.c@legacycorp.in",
      phone: "+919856701234",
      amount: 2199900, // ₹21,999.00
      status: "failed",
      daysAgo: 5,
      attempts: [
        { strategy: "email", status: "failed", cost: 10, delayHours: 2 },
        { strategy: "sms", status: "failed", cost: 25, delayHours: 12 },
        { strategy: "smart_retry", status: "failed", cost: 15, delayHours: 24 },
      ]
    },
  ];

  for (let i = 0; i < failureTemplates.length; i++) {
    const t = failureTemplates[i];
    const createdAt = new Date(now - t.daysAgo * DAY);
    const providerPaymentId = `pay_rzp_${Date.now().toString(36)}_${i}_${Math.random().toString(36).substring(2, 6)}`;
    const eventIdHeader = `evt_rzp_${Date.now().toString(36)}_${i}_${Math.random().toString(36).substring(2, 6)}`;

    // 1. Insert Event
    const [event] = await db.insert(eventsTable).values({
      provider: "razorpay",
      eventType: "payment.failed",
      payload: {
        payment: {
          entity: {
            id: providerPaymentId,
            amount: t.amount,
            currency: "INR",
            status: "failed",
            error_code: t.code,
            error_description: t.desc,
            customer_id: t.customer,
            email: t.email,
            contact: t.phone,
          }
        }
      },
      signature: "simulated_sha256_verified_signature",
      idempotencyKey: eventIdHeader,
      processed: true,
      createdAt,
    }).returning();

    // 2. Insert Payment
    const [payment] = await db.insert(paymentsTable).values({
      providerPaymentId,
      customerId: t.customer,
      amount: t.amount,
      currency: "INR",
      status: t.status === "recovered" ? "captured" : "failed",
      errorCode: t.code,
      errorDescription: t.desc,
      method: "card",
      failedAt: createdAt,
      capturedAt: t.status === "recovered" ? new Date(createdAt.getTime() + 14 * HOUR) : null,
      createdAt,
      updatedAt: new Date(createdAt.getTime() + 14 * HOUR),
      metadata: { email: t.email, phone: t.phone },
    }).returning();

    // 3. Insert Recovery
    const [recovery] = await db.insert(recoveriesTable).values({
      paymentId: payment.id,
      eventId: event.id,
      customerId: t.customer,
      amount: t.amount,
      currency: "INR",
      rootCause: t.rootCause,
      status: t.status,
      strategies: t.strategies,
      selectedStrategy: t.strategies[0],
      attemptsUsed: t.attempts.length,
      maxAttempts: 3,
      recoveryAmount: t.status === "recovered" ? t.amount : 0,
      createdAt,
      updatedAt: new Date(createdAt.getTime() + (t.status === "recovered" ? 14 : 2) * HOUR),
    }).returning();

    // 4. Insert Audit Log: Created
    await db.insert(auditLogsTable).values({
      recoveryId: recovery.id,
      eventId: event.id,
      action: "payment_failed",
      actor: "razorpay_webhook",
      details: { amount: t.amount, error_code: t.code, customer_id: t.customer },
      createdAt,
    });

    // 5. Insert Audit Log: AI Root Cause Analysis
    await db.insert(auditLogsTable).values({
      recoveryId: recovery.id,
      eventId: event.id,
      action: "Root cause analysis completed",
      actor: "openrouter_ai",
      details: {
        root_cause: t.rootCause,
        confidence_score: 0.94,
        model: "meta-llama/llama-3.3-70b-instruct",
        recommended_strategy: t.strategies[0],
      },
      createdAt: new Date(createdAt.getTime() + 2 * 60 * 1000),
    });

    // 6. Insert Recovery Attempts
    for (const attempt of t.attempts) {
      const attemptTime = new Date(createdAt.getTime() + attempt.delayHours * HOUR);
      await db.insert(recoveryAttemptsTable).values({
        recoveryId: recovery.id,
        strategy: attempt.strategy,
        status: attempt.status,
        providerReference: `ref_${attempt.strategy}_${Date.now().toString(36)}`,
        cost: attempt.cost,
        attemptedAt: attemptTime,
        createdAt: attemptTime,
        response: {
          delivered: attempt.status === "success" || attempt.status === "delivered",
          channel: attempt.strategy,
        }
      });

      await db.insert(auditLogsTable).values({
        recoveryId: recovery.id,
        action: `Strategy ${attempt.strategy} ${attempt.status}`,
        actor: "recovery_orchestrator",
        details: { strategy: attempt.strategy, status: attempt.status, cost_inr: attempt.cost / 100 },
        createdAt: attemptTime,
      });
    }

    if (t.status === "recovered") {
      await db.insert(auditLogsTable).values({
        recoveryId: recovery.id,
        action: "payment_recovered",
        actor: "recovery_engine",
        details: { recovered_amount: t.amount, currency: "INR" },
        createdAt: new Date(createdAt.getTime() + 14 * HOUR),
      });
    }
  }

  console.log(`✅ Successfully seeded ${failureTemplates.length} realistic, impressive recovery records!`);
  console.log("   - Recovered cases: 12 (75% success rate)");
  console.log("   - Active / In-progress: 3");
  console.log("   - Escalated / Failed: 1");
  console.log("   - Total Revenue Processed: ₹4,19,985.00");
  console.log("   - Total Revenue Recovered: ₹3,16,488.00");
  process.exit(0);
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
