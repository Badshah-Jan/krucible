const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const admin = require("firebase-admin");
const { Resend } = require("resend");
const crypto = require("crypto");

admin.initializeApp();
const db = admin.firestore();

const resendApiKey = defineSecret("RESEND_API_KEY");
const cloudinaryApiSecret = defineSecret("CLOUDINARY_API_SECRET");
const cloudinaryApiKey = defineSecret("CLOUDINARY_API_KEY");

const CLOUDINARY_CLOUD_NAME = "dchiewxeo";
const SENDER_EMAIL = "onboarding@resend.dev";

const RATE_LIMITS = {
  post_create: { max: 10, windowMs: 60 * 60 * 1000 },
  comment_create: { max: 30, windowMs: 60 * 60 * 1000 },
  message_send: { max: 120, windowMs: 60 * 60 * 1000 },
  business_register: { max: 3, windowMs: 24 * 60 * 60 * 1000 },
  service_register: { max: 3, windowMs: 24 * 60 * 60 * 1000 },
  verification_resend: { max: 5, windowMs: 60 * 60 * 1000 },
  password_reset: { max: 5, windowMs: 60 * 60 * 1000 },
};

async function checkRateLimit(uid, action) {
  const config = RATE_LIMITS[action];
  if (!config) return;

  const docId = `${uid}_${action}`;
  const ref = db.collection("rate_limits").doc(docId);
  const now = Date.now();

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    let count = 0;
    let windowStart = now;

    if (snap.exists) {
      const data = snap.data();
      if (now - data.windowStart < config.windowMs) {
        count = data.count || 0;
        windowStart = data.windowStart;
      }
    }

    if (count >= config.max) {
      throw new HttpsError(
        "resource-exhausted",
        "Too many requests. Please try again later.",
      );
    }

    tx.set(ref, {
      uid,
      action,
      count: count + 1,
      windowStart,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  });
}

async function logEvent(uid, eventType, metadata = {}) {
  try {
    await db.collection("security_events").add({
      uid: uid || null,
      eventType,
      metadata,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  } catch (e) {
    console.error("Failed to log security event:", e);
  }
}

// ─── Welcome email ───────────────────────────────────────────────────────
exports.sendWelcomeEmail = onDocumentCreated(
  { document: "users/{userId}", secrets: [resendApiKey] },
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) return;

    const user = snapshot.data();
    const email = user.email;
    const name = user.name || "Neighbor";
    if (!email) return;

    const resend = new Resend(resendApiKey.value());
    try {
      await resend.emails.send({
        from: `Neighborly <${SENDER_EMAIL}>`,
        to: email,
        subject: "Welcome to Neighborly! 👋",
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px;">
            <h1 style="color: #208AEF;">Welcome to Neighborly, ${name}!</h1>
            <p>We are thrilled to have you in the community.</p>
            <p>Start exploring local discussions, offering help, and connecting with neighbors around you.</p>
          </div>
        `,
      });
    } catch (error) {
      console.error("Welcome email error:", error);
    }
  },
);

// ─── Rate limiting ───────────────────────────────────────────────────────
exports.enforceRateLimit = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required.");
  }
  const { action } = request.data || {};
  if (!action || !RATE_LIMITS[action]) {
    throw new HttpsError("invalid-argument", "Invalid rate limit action.");
  }
  await checkRateLimit(request.auth.uid, action);
  return { ok: true };
});

// ─── Security event logging ──────────────────────────────────────────────
exports.logSecurityEvent = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required.");
  }
  const { eventType, metadata } = request.data || {};
  if (!eventType || typeof eventType !== "string") {
    throw new HttpsError("invalid-argument", "eventType is required.");
  }
  await logEvent(request.auth.uid, eventType, metadata || {});
  return { ok: true };
});

// ─── Karma (server-side only) ────────────────────────────────────────────
const KARMA_AMOUNTS = new Set([2, 10, 30, 50]);

exports.awardKarma = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required.");
  }

  const { uid, amount, reason } = request.data || {};
  const callerUid = request.auth.uid;

  if (!uid || typeof amount !== "number" || !KARMA_AMOUNTS.has(amount)) {
    throw new HttpsError("invalid-argument", "Invalid karma request.");
  }

  // Users may only award karma to themselves (triggered by their own actions)
  if (uid !== callerUid) {
    const callerDoc = await db.collection("users").doc(callerUid).get();
    const role = callerDoc.data()?.role;
    if (role !== "admin" && role !== "moderator") {
      throw new HttpsError("permission-denied", "Cannot modify another user's karma.");
    }
  }

  const userRef = db.collection("users").doc(uid);
  await userRef.set(
    {
      karma: admin.firestore.FieldValue.increment(amount),
      lastActive: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  const historyRef = userRef.collection("karma_history").doc();
  await historyRef.set({
    action: reason || "Earned Karma",
    points: `+${amount}`,
    color: "#F59E0B",
    icon: "star-outline",
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return { ok: true };
});

// ─── Premium subscription requests ───────────────────────────────────────
exports.requestPremiumUpgrade = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required.");
  }

  const { entityType, entityId } = request.data || {};
  if (!entityType || !entityId) {
    throw new HttpsError("invalid-argument", "entityType and entityId are required.");
  }

  const collectionName = entityType === "service" ? "services" : "businesses";
  const entityRef = db.collection(collectionName).doc(entityId);
  const entitySnap = await entityRef.get();

  if (!entitySnap.exists) {
    throw new HttpsError("not-found", "Entity not found.");
  }

  const entity = entitySnap.data();
  if (entity.userId !== request.auth.uid) {
    throw new HttpsError("permission-denied", "You do not own this listing.");
  }

  if (entity.isPremium) {
    throw new HttpsError("already-exists", "Already premium.");
  }

  // Check for existing pending request
  const pendingSnap = await db.collection("subscription_requests")
    .where("entityId", "==", entityId)
    .where("status", "==", "pending")
    .get();

  if (!pendingSnap.empty) {
    throw new HttpsError("already-exists", "A pending premium request already exists for this listing.");
  }

  await db.collection("subscription_requests").add({
    userId: request.auth.uid,
    entityType,
    entityId,
    status: "pending",
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  await logEvent(request.auth.uid, "premium_upgrade_requested", {
    entityType,
    entityId,
  });

  return { ok: true, message: "Premium request submitted for review." };
});

// ─── Cloudinary signed upload ────────────────────────────────────────────
exports.getCloudinaryUploadSignature = onCall(
  { secrets: [cloudinaryApiSecret, cloudinaryApiKey] },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Authentication required.");
    }

    await checkRateLimit(request.auth.uid, "post_create");

    const timestamp = Math.round(Date.now() / 1000);
    const folder = `neighborly/${request.auth.uid}`;
    const paramsToSign = `folder=${folder}&timestamp=${timestamp}${cloudinaryApiSecret.value()}`;
    const signature = crypto
      .createHash("sha1")
      .update(paramsToSign)
      .digest("hex");

    return {
      cloudName: CLOUDINARY_CLOUD_NAME,
      apiKey: cloudinaryApiKey.value(),
      timestamp,
      signature,
      folder,
    };
  },
);

// ─── Admin: approve premium subscription ───────────────────────────────────
exports.approvePremiumSubscription = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required.");
  }

  const callerDoc = await db.collection("users").doc(request.auth.uid).get();
  if (callerDoc.data()?.role !== "admin") {
    throw new HttpsError("permission-denied", "Admin access required.");
  }

  const { requestId, approved } = request.data || {};
  if (!requestId) {
    throw new HttpsError("invalid-argument", "requestId is required.");
  }

  const reqRef = db.collection("subscription_requests").doc(requestId);
  const reqSnap = await reqRef.get();
  if (!reqSnap.exists) {
    throw new HttpsError("not-found", "Request not found.");
  }

  const reqData = reqSnap.data();
  const collectionName =
    reqData.entityType === "service" ? "services" : "businesses";
  const entityRef = db.collection(collectionName).doc(reqData.entityId);

  if (approved) {
    await entityRef.update({
      isPremium: true,
      subscriptionPlan: "premium",
      featuredUntil: admin.firestore.Timestamp.fromDate(
        new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      ),
      promotionLevel: 1,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    await reqRef.update({
      status: "approved",
      reviewedBy: request.auth.uid,
      reviewedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  } else {
    await reqRef.update({
      status: "rejected",
      reviewedBy: request.auth.uid,
      reviewedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }

  await logEvent(request.auth.uid, "premium_subscription_reviewed", {
    requestId,
    approved: !!approved,
  });

  return { ok: true };
});

// ─── Admin: approve business/service verification ────────────────────────
exports.approveVerification = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required.");
  }

  const callerDoc = await db.collection("users").doc(request.auth.uid).get();
  const role = callerDoc.data()?.role;
  if (role !== "admin" && role !== "moderator") {
    throw new HttpsError("permission-denied", "Moderator access required.");
  }

  const { entityType, entityId, approved } = request.data || {};
  if (!entityType || !entityId) {
    throw new HttpsError("invalid-argument", "entityType and entityId are required.");
  }

  const collectionName = entityType === "service" ? "services" : "businesses";
  const entityRef = db.collection(collectionName).doc(entityId);

  await entityRef.update({
    isVerified: !!approved,
    verificationStatus: approved ? "approved" : "rejected",
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  await logEvent(request.auth.uid, "verification_reviewed", {
    entityType,
    entityId,
    approved: !!approved,
  });

  return { ok: true };
});

exports.deleteCloudinaryImage = onCall(
  { secrets: [cloudinaryApiSecret, cloudinaryApiKey] },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Authentication required.");
    }

    const { secureUrl } = request.data || {};
    if (!secureUrl || typeof secureUrl !== "string") {
      throw new HttpsError("invalid-argument", "secureUrl is required.");
    }

    // Only allow deleting images in the user's folder
    if (!secureUrl.includes(`/neighborly/${request.auth.uid}/`)) {
      throw new HttpsError("permission-denied", "Cannot delete this image.");
    }

    const publicId = secureUrl
      .split("/upload/")[1]
      ?.replace(/^v\d+\//, "")
      ?.replace(/\.[^.]+$/, "");

    if (!publicId) {
      throw new HttpsError("invalid-argument", "Invalid Cloudinary URL.");
    }

    const timestamp = Math.round(Date.now() / 1000);
    const paramsToSign = `public_id=${publicId}&timestamp=${timestamp}${cloudinaryApiSecret.value()}`;
    const signature = crypto
      .createHash("sha1")
      .update(paramsToSign)
      .digest("hex");

    const apiKey = cloudinaryApiKey.value();
    const body = new URLSearchParams({
      public_id: publicId,
      timestamp: String(timestamp),
      api_key: apiKey,
      signature,
    });

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/destroy`,
      { method: "POST", body },
    );

    if (!response.ok) {
      const err = await response.text();
      console.error("Cloudinary delete failed:", err);
      throw new HttpsError("internal", "Failed to delete image.");
    }

    return { ok: true };
  },
);

// ─── Admin: delete user account completely ─────────────────────────────────
exports.adminDeleteUser = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required.");
  }

  const callerDoc = await db.collection("users").doc(request.auth.uid).get();
  if (callerDoc.data()?.role !== "admin") {
    throw new HttpsError("permission-denied", "Admin access required.");
  }

  const { targetUid } = request.data || {};
  if (!targetUid) {
    throw new HttpsError("invalid-argument", "targetUid is required.");
  }

  if (targetUid === request.auth.uid) {
    throw new HttpsError("invalid-argument", "Cannot delete yourself via admin panel.");
  }

  try {
    const userDocRef = db.collection("users").doc(targetUid);
    const userSnap = await userDocRef.get();
    
    if (userSnap.exists) {
      const userData = userSnap.data();
      // Remove from community
      if (userData.communityId) {
        const commRef = db.collection("communities").doc(userData.communityId);
        await commRef.update({
          memberCount: admin.firestore.FieldValue.increment(-1)
        }).catch(err => console.error("Error decrementing community memberCount", err));
      }
    }

    const deletePromises = [];

    // Delete posts
    const postsSnap = await db.collection("posts").where("userId", "==", targetUid).get();
    postsSnap.forEach(doc => {
      deletePromises.push(doc.ref.delete());
    });

    // Delete services
    const servicesSnap = await db.collection("services").where("userId", "==", targetUid).get();
    servicesSnap.forEach(doc => {
      deletePromises.push(doc.ref.delete());
    });

    // Delete businesses
    const businessesSnap = await db.collection("businesses").where("userId", "==", targetUid).get();
    businessesSnap.forEach(doc => {
      deletePromises.push(doc.ref.delete());
    });

    await Promise.all(deletePromises);

  } catch (error) {
    console.error(`Error deleting user data for ${targetUid}:`, error);
  }

  try {
    // 1. Delete from Firebase Auth
    await admin.auth().deleteUser(targetUid);
  } catch (error) {
    console.error(`Error deleting user auth ${targetUid}:`, error);
    // If user is already deleted from Auth, we can still proceed to delete from DB
  }

  // 2. Delete from Firestore
  try {
    await db.collection("users").doc(targetUid).delete();
  } catch (error) {
    console.error(`Error deleting user doc ${targetUid}:`, error);
  }

  await logEvent(request.auth.uid, "admin_deleted_user", { targetUid });

  return { ok: true };
});
