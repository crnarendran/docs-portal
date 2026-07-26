import {onCall, HttpsOptions, HttpsError} from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";

export interface GrantPortalAdminPayload {
  targetUid: string;
  isAdmin: boolean;
}

/**
 * Grants or revokes docs-portal admin access for a target user.
 * Updates the Auth custom claim and the `portal_users` Firestore
 * document in the same call so they can never drift apart.
 * @param {HttpsOptions} httpsOptions Shared callable function options.
 * @return {ReturnType<typeof onCall>} The onCall handler.
 */
export const grantPortalAdminAgent = (httpsOptions: HttpsOptions) => {
  return onCall(httpsOptions, async (request) => {
    if (request.auth?.token?.admin !== true) {
      throw new HttpsError(
        "permission-denied",
        "Only existing admins can grant admin access."
      );
    }

    const data = request.data as {
      targetUid?: unknown;
      isAdmin?: unknown;
    };

    if (!data || typeof data.targetUid !== "string" || !data.targetUid) {
      throw new HttpsError(
        "invalid-argument",
        "Missing or invalid targetUid"
      );
    }
    if (typeof data.isAdmin !== "boolean") {
      throw new HttpsError(
        "invalid-argument",
        "Missing or invalid isAdmin"
      );
    }

    const {targetUid, isAdmin} = data as GrantPortalAdminPayload;
    const db = admin.firestore();
    const portalUserRef = db.collection("portal_users").doc(targetUid);
    const portalUserSnap = await portalUserRef.get();

    if (!portalUserSnap.exists) {
      throw new HttpsError(
        "not-found",
        `No portal_users document for ${targetUid}`
      );
    }

    const userRecord = await admin.auth().getUser(targetUid);
    const currentClaims = userRecord.customClaims || {};
    await admin.auth().setCustomUserClaims(targetUid, {
      ...currentClaims,
      admin: isAdmin,
    });
    await portalUserRef.update({isAdmin});

    logger.info("Portal admin access changed", {
      actorUid: request.auth.uid,
      targetUid,
      isAdmin,
    });

    return {success: true};
  });
};
