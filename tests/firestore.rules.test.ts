import { readFileSync } from "node:fs";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";

/**
 * Executable specification for firestore.rules.
 *
 * These tests describe what the rules are supposed to guarantee. They run
 * against the rules file in this repository, not against production.
 *
 * Run with: npm test
 */

const PROJECT_ID = "demo-autonomia";

// Identities used throughout. ANA and BEA are ordinary applicants; ADMIN has
// role 'admin' in /users, which is what isAdmin() checks.
const ANA = "ana-uid";
const BEA = "bea-uid";
const ADMIN = "admin-uid";

let testEnv: RulesTestEnvironment;

const iso = (d: string) => new Date(d).toISOString();

function application(overrides: Record<string, unknown> = {}) {
  return {
    id: "app-1",
    userId: ANA,
    userEmail: "ana@example.com",
    status: "Draft",
    step: 1,
    createdAt: iso("2026-01-10"),
    updatedAt: iso("2026-01-10"),
    loanDetails: { requestedAmount: 100000, installmentsCount: 12 },
    ...overrides,
  };
}

/** Writes documents bypassing rules, to set up a scenario. */
async function seed(fn: (db: any) => Promise<void>) {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    await fn(ctx.firestore());
  });
}

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: readFileSync("firestore.rules", "utf8"),
      host: "127.0.0.1",
      port: 8080,
    },
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();
  await seed(async (db) => {
    await setDoc(doc(db, "users", ANA), {
      uid: ANA, email: "ana@example.com", role: "user",
    });
    await setDoc(doc(db, "users", BEA), {
      uid: BEA, email: "bea@example.com", role: "user",
    });
    await setDoc(doc(db, "users", ADMIN), {
      uid: ADMIN, email: "admin@mujeres2000.org.ar", role: "admin",
    });
  });
});

const asAna = () => testEnv.authenticatedContext(ANA).firestore();
const asBea = () => testEnv.authenticatedContext(BEA).firestore();
const asAdmin = () => testEnv.authenticatedContext(ADMIN).firestore();
const asAnon = () => testEnv.unauthenticatedContext().firestore();

describe("users", () => {
  it("lets a user read her own profile", async () => {
    await assertSucceeds(getDoc(doc(asAna(), "users", ANA)));
  });

  it("stops a user reading someone else's profile", async () => {
    await assertFails(getDoc(doc(asAna(), "users", BEA)));
  });

  it("lets an admin read any profile", async () => {
    await assertSucceeds(getDoc(doc(asAdmin(), "users", ANA)));
  });

  it("stops an unauthenticated visitor reading profiles", async () => {
    await assertFails(getDoc(doc(asAnon(), "users", ANA)));
  });

  // The privilege escalation found in production on 2026-10-21.
  it("stops a user promoting herself to admin", async () => {
    await assertFails(updateDoc(doc(asAna(), "users", ANA), { role: "admin" }));
  });

  it("lets a user update her own display name", async () => {
    await assertSucceeds(
      updateDoc(doc(asAna(), "users", ANA), { displayName: "Ana Pérez" }),
    );
  });

  it("stops a user editing someone else's profile", async () => {
    await assertFails(
      updateDoc(doc(asBea(), "users", ANA), { displayName: "hacked" }),
    );
  });
});

describe("applications", () => {
  beforeEach(async () => {
    await seed(async (db) => {
      await setDoc(doc(db, "applications", "app-1"), application());
    });
  });

  it("lets an applicant read her own application", async () => {
    await assertSucceeds(getDoc(doc(asAna(), "applications", "app-1")));
  });

  it("stops an applicant reading someone else's application", async () => {
    await assertFails(getDoc(doc(asBea(), "applications", "app-1")));
  });

  it("lets an admin read any application", async () => {
    await assertSucceeds(getDoc(doc(asAdmin(), "applications", "app-1")));
  });

  it("lets an applicant edit her own draft", async () => {
    await assertSucceeds(
      updateDoc(doc(asAna(), "applications", "app-1"), { step: 2 }),
    );
  });

  it("stops an applicant editing someone else's application", async () => {
    await assertFails(
      updateDoc(doc(asBea(), "applications", "app-1"), { step: 2 }),
    );
  });

  // SEC-02: the central finding of both audits.
  it("stops an applicant approving her own application", async () => {
    await assertFails(
      updateDoc(doc(asAna(), "applications", "app-1"), { status: "Approved" }),
    );
  });

  it("stops an applicant marking her own application as disbursed", async () => {
    await assertFails(
      updateDoc(doc(asAna(), "applications", "app-1"), { status: "Active" }),
    );
  });

  it("lets an admin approve an application", async () => {
    await assertSucceeds(
      updateDoc(doc(asAdmin(), "applications", "app-1"), { status: "Approved" }),
    );
  });

  it("stops an applicant changing the amount after submitting", async () => {
    await seed(async (db) => {
      await setDoc(doc(db, "applications", "app-1"), application({ status: "Pending" }));
    });
    await assertFails(
      updateDoc(doc(asAna(), "applications", "app-1"), {
        loanDetails: { requestedAmount: 999999, installmentsCount: 12 },
      }),
    );
  });

  it("stops an applicant deleting an application", async () => {
    await assertFails(deleteDoc(doc(asAna(), "applications", "app-1")));
  });
});

describe("scoring_evaluations", () => {
  beforeEach(async () => {
    await seed(async (db) => {
      await setDoc(doc(db, "scoring_evaluations", "ev-1"), {
        applicationId: "app-1",
        entrepreneurName: "Ana Pérez",
        date: iso("2026-01-12"),
        answers: { a1: 10 },
        totalScore: 40,
        status: "APROBADO",
      });
    });
  });

  it("stops an applicant reading scoring evaluations", async () => {
    await assertFails(getDoc(doc(asAna(), "scoring_evaluations", "ev-1")));
  });

  it("lets an admin read scoring evaluations", async () => {
    await assertSucceeds(getDoc(doc(asAdmin(), "scoring_evaluations", "ev-1")));
  });

  it("stops an applicant writing a scoring evaluation", async () => {
    await assertFails(
      updateDoc(doc(asAna(), "scoring_evaluations", "ev-1"), { totalScore: 100 }),
    );
  });
});

describe("config", () => {
  beforeEach(async () => {
    await seed(async (db) => {
      await setDoc(doc(db, "config", "settings"), {
        passingScore: 35,
        lastAssignedLoanNumber: 35,
      });
    });
  });

  it("lets anyone read settings (the form needs them before login)", async () => {
    await assertSucceeds(getDoc(doc(asAnon(), "config", "settings")));
  });

  it("stops an applicant editing settings", async () => {
    await assertFails(
      updateDoc(doc(asAna(), "config", "settings"), { passingScore: 0 }),
    );
  });

  it("lets an admin edit settings", async () => {
    await assertSucceeds(
      updateDoc(doc(asAdmin(), "config", "settings"), { passingScore: 40 }),
    );
  });
});

describe("the flows applicants legitimately need", () => {
  it("lets an applicant submit her own draft (Draft -> Pending)", async () => {
    await seed(async (db) => {
      await setDoc(doc(db, "applications", "app-1"), application());
    });
    await assertSucceeds(
      updateDoc(doc(asAna(), "applications", "app-1"), {
        status: "Pending",
        loanNumber: 36,
        updatedAt: iso("2026-01-11"),
      }),
    );
  });

  it("lets an applicant attach a payment proof on a disbursed loan", async () => {
    await seed(async (db) => {
      await setDoc(doc(db, "applications", "app-1"), application({
        status: "Active",
        paymentSchedule: {
          installments: [{ number: 1, amount: 10000, status: "Pending" }],
        },
      }));
    });
    await assertSucceeds(
      updateDoc(doc(asAna(), "applications", "app-1"), {
        paymentSchedule: {
          installments: [
            { number: 1, amount: 10000, status: "Pending", paymentProofUrl: "https://example/p.jpg" },
          ],
        },
        updatedAt: iso("2026-02-01"),
      }),
    );
  });

  it("stops an applicant changing anything else on a disbursed loan", async () => {
    await seed(async (db) => {
      await setDoc(doc(db, "applications", "app-1"), application({
        status: "Active",
        paymentSchedule: { installments: [] },
      }));
    });
    await assertFails(
      updateDoc(doc(asAna(), "applications", "app-1"), {
        loanDetails: { requestedAmount: 999999, installmentsCount: 12 },
      }),
    );
  });

  it("lets a new user create her own profile when signing up", async () => {
    await assertSucceeds(
      setDoc(doc(asBea(), "users", BEA), {
        uid: BEA,
        email: "bea@example.com",
        role: "user",
        displayName: "Bea",
      }),
    );
  });

  // Documents a known consequence rather than a desired one: the signup flow in
  // App.tsx looks up existing users by email to inherit a role. These rules deny
  // that query. The app catches the error and continues, so signup still works
  // but role inheritance silently does not. See SEC-06 (#7).
  it("denies the role-inheritance lookup across users", async () => {
    await assertFails(
      getDocs(query(collection(asBea(), "users"), where("email", "==", "ana@example.com"))),
    );
  });
});

describe("the flows admins legitimately need", () => {
  it("lets an admin disburse an approved application", async () => {
    await seed(async (db) => {
      await setDoc(doc(db, "applications", "app-1"), application({ status: "Approved" }));
    });
    await assertSucceeds(
      updateDoc(doc(asAdmin(), "applications", "app-1"), {
        status: "Active",
        paymentSchedule: { installments: [{ number: 1, amount: 10000, status: "Pending" }] },
      }),
    );
  });

  it("lets an admin mark an instalment as paid", async () => {
    await seed(async (db) => {
      await setDoc(doc(db, "applications", "app-1"), application({
        status: "Active",
        paymentSchedule: { installments: [{ number: 1, amount: 10000, status: "Pending" }] },
      }));
    });
    await assertSucceeds(
      updateDoc(doc(asAdmin(), "applications", "app-1"), {
        paymentSchedule: { installments: [{ number: 1, amount: 10000, status: "Paid" }] },
      }),
    );
  });
});

describe("creating an application", () => {
  // Mirrors INITIAL_DATA in src/App.tsx — the exact shape the app writes when
  // an applicant starts a new request. Earlier tests seeded documents directly,
  // which meant the create path was never exercised against a real payload.
  function newApplicationPayload(overrides: Record<string, unknown> = {}) {
    return {
      id: "new-app",
      userId: ANA,
      userEmail: "ana@example.com",
      status: "Draft",
      step: 1,
      personalData: { lastName: "", firstName: "", cuil: "", dni: "" },
      householdFinance: {},
      entrepreneurshipData: {},
      loanDetails: {},
      disbursementInfo: {},
      createdAt: iso("2026-03-01"),
      updatedAt: iso("2026-03-01"),
      ...overrides,
    };
  }

  it("lets an applicant create her own application", async () => {
    await assertSucceeds(
      setDoc(doc(asAna(), "applications", "new-app"), newApplicationPayload()),
    );
  });

  it("stops an applicant creating an application owned by someone else", async () => {
    await assertFails(
      setDoc(doc(asBea(), "applications", "new-app"), newApplicationPayload()),
    );
  });

  it("stops an unauthenticated visitor creating an application", async () => {
    await assertFails(
      setDoc(doc(asAnon(), "applications", "new-app"), newApplicationPayload()),
    );
  });

  it("stops creation of an application already marked Approved", async () => {
    await assertFails(
      setDoc(
        doc(asAna(), "applications", "new-app"),
        newApplicationPayload({ status: "Approved" }),
      ),
    );
  });

  // A guest signs in with signInAnonymously, so user.email is null and App.tsx
  // writes userEmail: "". isValidApplication requires a well-formed address.
  it("stops a guest with no email address creating an application", async () => {
    const guest = testEnv.authenticatedContext("guest-uid").firestore();
    await assertFails(
      setDoc(
        doc(guest, "applications", "new-app"),
        newApplicationPayload({ userId: "guest-uid", userEmail: "" }),
      ),
    );
  });
});
