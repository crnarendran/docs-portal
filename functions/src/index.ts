/**
 * @file index.ts
 * @description Cloud Functions backing the docs-portal RBAC model:
 * provisioning a `portal_users` doc for every new Auth user in this
 * project, and a callable to grant/revoke the `admin` claim.
 */
import * as admin from "firebase-admin";
import {createPortalUserDocumentAgent} from "./agents/createPortalUser";
import {grantPortalAdminAgent} from "./agents/portalAdmin";

if (admin.apps.length === 0) {
  admin.initializeApp();
}

export const createPortalUserDocument = createPortalUserDocumentAgent();

// Deliberately minimal options (region only) — this function never needed
// the Gemini/YouTube secrets the main sanjeev-ai app's httpsOptions carry,
// and now that it deploys from its own codebase there's no shared options
// object to accidentally inherit them from.
export const grantPortalAdmin = grantPortalAdminAgent({
  region: "europe-west6",
  cors: true,
});
