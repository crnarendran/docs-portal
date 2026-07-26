import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";
import {FieldValue} from "firebase-admin/firestore";
import * as logger from "firebase-functions/logger";

interface PortalInvite {
  accessibleProjects?: string[];
  isAdmin?: boolean;
}

/**
 * Provisions a `portal_users` doc for every new Auth user in this project.
 * If an admin previously invited this email (`portal_invites/{email}`),
 * that invite's access is applied and the invite is consumed; otherwise
 * the user gets no access until an admin grants it via the admin panel.
 * @return {ReturnType<typeof functions.auth.user>["onCreate"]} The trigger.
 */
export const createPortalUserDocumentAgent = () => {
  return functions.auth.user().onCreate(async (user) => {
    const db = admin.firestore();
    const portalUserRef = db.collection("portal_users").doc(user.uid);

    let isAdmin = false;
    let accessibleProjects: string[] = [];
    const email = user.email?.toLowerCase();
    let consumedInviteRef: FirebaseFirestore.DocumentReference | undefined;

    if (email === "crnarendran@gmail.com") {
      isAdmin = true;
      accessibleProjects = ["*"];
    } else if (email) {
      const inviteRef = db.collection("portal_invites").doc(email);
      try {
        const inviteSnap = await inviteRef.get();
        if (inviteSnap.exists) {
          const invite = inviteSnap.data() as PortalInvite;
          accessibleProjects = invite.accessibleProjects || [];
          isAdmin = invite.isAdmin === true;
          consumedInviteRef = inviteRef;
        }
      } catch (error) {
        logger.error(`Failed to read invite for ${email}`, error);
      }
    }

    if (isAdmin) {
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

    if (consumedInviteRef) {
      try {
        await consumedInviteRef.delete();
        logger.info(`Consumed invite for ${email}`);
      } catch (error) {
        logger.error(`Failed to delete consumed invite for ${email}`, error);
      }
    }
  });
};
