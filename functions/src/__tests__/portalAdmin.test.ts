import {HttpsError} from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import {grantPortalAdminAgent} from "../agents/portalAdmin";

jest.mock("firebase-admin", () => {
  const mockGet = jest.fn();
  const mockUpdate = jest.fn();
  const mockDoc = jest.fn(() => ({get: mockGet, update: mockUpdate}));
  const mockCollection = jest.fn(() => ({doc: mockDoc}));

  const mockGetUser = jest.fn();
  const mockSetCustomUserClaims = jest.fn();

  return {
    firestore: jest.fn(() => ({collection: mockCollection})),
    auth: jest.fn(() => ({
      getUser: mockGetUser,
      setCustomUserClaims: mockSetCustomUserClaims,
    })),
  };
});

jest.mock("firebase-functions/logger", () => ({
  info: jest.fn(),
  error: jest.fn(),
}));

const httpsOptions = {region: "europe-west6"};
const grantPortalAdmin = grantPortalAdminAgent(httpsOptions);

const adminAuthData = {
  uid: "admin_uid",
  token: {admin: true} as unknown,
};

describe("grantPortalAdminAgent", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("rejects callers without the admin claim", async () => {
    await expect(
      grantPortalAdmin.run({
        data: {targetUid: "target_uid", isAdmin: true},
        auth: {uid: "regular_uid", token: {} as unknown},
        rawRequest: {} as never,
      } as never)
    ).rejects.toThrow(HttpsError);
  });

  it("rejects an unauthenticated caller", async () => {
    await expect(
      grantPortalAdmin.run({
        data: {targetUid: "target_uid", isAdmin: true},
        rawRequest: {} as never,
      } as never)
    ).rejects.toThrow(HttpsError);
  });

  it("rejects a missing targetUid", async () => {
    await expect(
      grantPortalAdmin.run({
        data: {isAdmin: true},
        auth: adminAuthData,
        rawRequest: {} as never,
      } as never)
    ).rejects.toThrow(HttpsError);
  });

  it("rejects a non-boolean isAdmin", async () => {
    await expect(
      grantPortalAdmin.run({
        data: {targetUid: "target_uid", isAdmin: "yes"},
        auth: adminAuthData,
        rawRequest: {} as never,
      } as never)
    ).rejects.toThrow(HttpsError);
  });

  it("rejects a target with no portal_users document", async () => {
    const db = admin.firestore();
    const docRef = db.collection("portal_users").doc("target_uid");
    (docRef.get as jest.Mock).mockResolvedValueOnce({exists: false});

    await expect(
      grantPortalAdmin.run({
        data: {targetUid: "target_uid", isAdmin: true},
        auth: adminAuthData,
        rawRequest: {} as never,
      } as never)
    ).rejects.toThrow(HttpsError);
  });

  it("grants admin and syncs the claim with the Firestore doc", async () => {
    const db = admin.firestore();
    const docRef = db.collection("portal_users").doc("target_uid");
    (docRef.get as jest.Mock).mockResolvedValueOnce({exists: true});
    (admin.auth().getUser as jest.Mock).mockResolvedValueOnce({
      customClaims: {support: true},
    });

    const result = await grantPortalAdmin.run({
      data: {targetUid: "target_uid", isAdmin: true},
      auth: adminAuthData,
      rawRequest: {} as never,
    } as never);

    expect(admin.auth().setCustomUserClaims).toHaveBeenCalledWith(
      "target_uid",
      {support: true, admin: true}
    );
    expect(docRef.update).toHaveBeenCalledWith({isAdmin: true});
    expect(result).toEqual({success: true});
  });
});
