import * as admin from "firebase-admin";
import {createPortalUserDocumentAgent} from "../agents/createPortalUser";

jest.mock("firebase-admin", () => {
  const portalUserCreate = jest.fn().mockResolvedValue(undefined);
  const portalUserDoc = jest.fn(() => ({create: portalUserCreate}));

  const inviteGet = jest.fn();
  const inviteDelete = jest.fn().mockResolvedValue(undefined);
  const inviteDoc = jest.fn(() => ({get: inviteGet, delete: inviteDelete}));

  const collection = jest.fn((name: string) => {
    if (name === "portal_invites") return {doc: inviteDoc};
    return {doc: portalUserDoc};
  });

  const getUser = jest.fn().mockResolvedValue({customClaims: {}});
  const setCustomUserClaims = jest.fn().mockResolvedValue(undefined);

  return {
    firestore: jest.fn(() => ({collection})),
    auth: jest.fn(() => ({getUser, setCustomUserClaims})),
    __mocks: {
      portalUserCreate,
      portalUserDoc,
      inviteGet,
      inviteDelete,
      inviteDoc,
      collection,
      getUser,
      setCustomUserClaims,
    },
  };
});

jest.mock("firebase-functions/v1", () => ({
  auth: {
    user: () => ({
      onCreate: (handler: (user: unknown) => Promise<void>) => handler,
    }),
  },
}));

jest.mock("firebase-functions/logger", () => ({
  info: jest.fn(),
  error: jest.fn(),
}));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mocks = (admin as any).__mocks;

const fakeUser = (uid: string, email: string) => ({uid, email});

describe("createPortalUserDocumentAgent", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mocks.inviteGet.mockResolvedValue({exists: false});
  });

  it("defaults to no access when no invite exists", async () => {
    const handler = createPortalUserDocumentAgent();
    await handler(fakeUser("uid1", "nobody@example.com"));

    expect(mocks.inviteDoc).toHaveBeenCalledWith("nobody@example.com");
    expect(mocks.portalUserCreate).toHaveBeenCalledWith(
      expect.objectContaining({isAdmin: false, accessibleProjects: []})
    );
    expect(mocks.inviteDelete).not.toHaveBeenCalled();
    expect(mocks.setCustomUserClaims).not.toHaveBeenCalled();
  });

  it("consumes a matching invite and grants its accessibleProjects", async () => {
    mocks.inviteGet.mockResolvedValue({
      exists: true,
      data: () => ({accessibleProjects: ["keystar"], isAdmin: false}),
    });

    const handler = createPortalUserDocumentAgent();
    await handler(fakeUser("uid2", "Invited@Example.com"));

    // Email is lowercased before the invite lookup.
    expect(mocks.inviteDoc).toHaveBeenCalledWith("invited@example.com");
    expect(mocks.portalUserCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        isAdmin: false,
        accessibleProjects: ["keystar"],
      })
    );
    expect(mocks.inviteDelete).toHaveBeenCalledTimes(1);
  });

  it("grants the admin claim when the invite sets isAdmin", async () => {
    mocks.inviteGet.mockResolvedValue({
      exists: true,
      data: () => ({accessibleProjects: ["*"], isAdmin: true}),
    });

    const handler = createPortalUserDocumentAgent();
    await handler(fakeUser("uid3", "newadmin@example.com"));

    expect(mocks.setCustomUserClaims).toHaveBeenCalledWith("uid3", {
      admin: true,
    });
    expect(mocks.portalUserCreate).toHaveBeenCalledWith(
      expect.objectContaining({isAdmin: true})
    );
    expect(mocks.inviteDelete).toHaveBeenCalledTimes(1);
  });

  it("still hardcodes the owner as global admin without an invite lookup", async () => {
    const handler = createPortalUserDocumentAgent();
    await handler(fakeUser("owner_uid", "crnarendran@gmail.com"));

    expect(mocks.inviteDoc).not.toHaveBeenCalled();
    expect(mocks.portalUserCreate).toHaveBeenCalledWith(
      expect.objectContaining({isAdmin: true, accessibleProjects: ["*"]})
    );
  });
});
