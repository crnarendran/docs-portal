/**
 * @file index.ts
 * @description Cloud Functions backing the docs-portal RBAC model:
 * provisioning a `portal_users` doc for every new Auth user in this
 * project, and a callable to grant/revoke the `admin` claim.
 */
import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";
import {FieldValue} from "firebase-admin/firestore";
import * as logger from "firebase-functions/logger";
import {grantPortalAdminAgent} from "./agents/portalAdmin";

if (admin.apps.length === 0) {
  admin.initializeApp();
}

export const createPortalUserDocument = functions.auth.user().onCreate(
  async (user) => {
    const db = admin.firestore();
    const portalUserRef = db.collection("portal_users").doc(user.uid);

    let isAdmin = false;
    let accessibleProjects: string[] = [];
    if (user.email === "crnarendran@gmail.com") {
      isAdmin = true;
      accessibleProjects = ["*"];
      try {
        const userRecord = await admin.auth().getUser(user.uid);
        const currentClaims = userRecord.customClaims || {};
        await admin.auth().setCustomUserClaims(user.uid, {...currentClaims, admin: true});
        logger.info(`Granted admin claim to ${user.email}`);
      } catch (error) {
        logger.error(`Failed to grant admin claim to ${user.email}`, error);
      }
    }

    try {
      await portalUserRef.create({
        uid: user.uid,
        email: user.email || null,
        isAdmin,
        accessibleProjects,
        createdAt: FieldValue.serverTimestamp(),
      });
      logger.info(`Successfully created portal_user document for ${user.uid}`);
    } catch (error: unknown) {
      const grpcError = error as { code?: number };
      if (grpcError.code === 6) { // ALREADY_EXISTS
        logger.info(`portal_user document for ${user.uid} already exists. Skipping.`);
      } else {
        logger.error(`Error creating portal_user document for ${user.uid}`, error);
      }
    }
  }
);

// Deliberately minimal options (region only) — this function never needed
// the Gemini/YouTube secrets the main sanjeev-ai app's httpsOptions carry,
// and now that it deploys from its own codebase there's no shared options
// object to accidentally inherit them from.
export const grantPortalAdmin = grantPortalAdminAgent({
  region: "europe-west6",
  cors: true,
});
