/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  User as UserIcon, 
  Home, 
  Briefcase, 
  DollarSign, 
  CreditCard, 
  ChevronRight, 
  ChevronLeft, 
  CheckCircle2,
  Save,
  LogIn,
  LogOut,
  LayoutDashboard,
  Calculator,
  FileText,
  FileEdit,
  Clock,
  ArrowLeft,
  Eye,
  PlusCircle,
  Calendar,
  UserPlus
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { DEFAULT_SETTINGS } from "./lib/defaultSettings";
import { Toaster, toast } from "sonner";
import logoMujeres from "./assets/images/regenerated_image_1781621794849.png";
import { Input } from "@/components/ui/input";
import { handleFirestoreError, OperationType } from "./lib/firestoreErrorHandler";
import { LoanApplication, LoanStep, AppSettings, PersonalData, HouseholdFinance, EntrepreneurshipData, LoanDetails, DisbursementInfo } from "./types";
import { auth, db } from "./firebase";
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut,
  User,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInAnonymously,
  updateProfile
} from "firebase/auth";
import { 
  doc, 
  setDoc, 
  getDoc, 
  onSnapshot,
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit
} from "firebase/firestore";
import { MAX_LOAN_AMOUNT } from "./constants";

// Components
import Step1PersonalData from "./components/Step1PersonalData";
import Step2HouseholdFinance from "./components/Step2HouseholdFinance";
import Step3Entrepreneurship from "./components/Step3Entrepreneurship";
import Step4LoanDetails from "./components/Step4LoanDetails";
import Step5Disbursement from "./components/Step5Disbursement";
import AdminDashboard from "./components/AdminDashboard";
import LoanSimulator from "./components/LoanSimulator";
import PaymentManager from "./components/PaymentManager";
import OnBehalfLoanManager from "./components/OnBehalfLoanManager";

type View = 'wizard' | 'simulator' | 'onbehalf' | 'admin';

const INITIAL_DATA = (user: User): LoanApplication => ({
  id: typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : Math.random().toString(36).substring(2) + Date.now().toString(36),
  userId: user.uid,
  userEmail: user.email || "",
  status: "Draft",
  step: 1,
  personalData: {
    lastName: "",
    firstName: "",
    cuil: "",
    dni: "",
    birthDate: "",
    phone: "",
    address: "",
    neighborhood: "",
    neighborhoodOption: "",
    civilStatus: "",
    educationLevel: "",
    householdSize: 1,
    dniFrontPhoto: "",
    dniBackPhoto: "",
    presentationDate: "",
    creditNumberM2000: "",
    previousCreditAmount: 0,
  },
  householdFinance: {
    fixedIncome: 0,
    variableIncome: 0,
    expenseFoodRent: 0,
    expenseServices: 0,
    incomeEarnersCount: 1,
    detailedIncomes: {
      partner: { amount: 0, isFixed: true },
      applicant: { amount: 0, isFixed: true },
      family3: { name: "", amount: 0, isFixed: true },
      family4: { name: "", amount: 0, isFixed: true },
      others: { amount: 0, isFixed: false },
      stateAssistance: { amount: 0, isFixed: true },
    },
    detailedExpenses: {
      alquiler: { amount: 0, varies: false },
      agua: { amount: 0, varies: false },
      luz: { amount: 0, varies: false },
      gas: { amount: 0, varies: false },
      sube: { amount: 0, varies: false },
      naftaRemis: { amount: 0, varies: false },
      telefonoCelular: { amount: 0, varies: false },
      internet: { amount: 0, varies: false },
      cable: { amount: 0, varies: false },
      comidaMercaderia: { amount: 0, varies: false },
      cuotasDeudas: { amount: 0, varies: false },
      seguros: { amount: 0, varies: false },
      impuestos: { amount: 0, varies: false },
      educacion: { amount: 0, varies: false },
      salud: { amount: 0, varies: false },
      ropaCalzado: { amount: 0, varies: false },
      mascotas: { amount: 0, varies: false },
      cigarrillos: { amount: 0, varies: false },
      naftaOtros: { amount: 0, varies: false },
      otrosDetalle: { name: "", amount: 0, varies: false }
    },
    debtInstallments: 0
  },
  entrepreneurshipData: {
    name: "",
    activity: "",
    seniority: "",
    description: "",
    type: "Comercial",
    socialNetworks: "",
    salesPlace: "",
    isRunning: "Si",
    notRunningReason: "",
    products: [
      { id: "1", name: "", unitCost: 0, unitPrice: 0, weeklyQty: 0 }
    ],
    fixedCosts: 0,
    travelExpenses: 0,
    netWeeklyProfit: 0,
    netMonthlyProfit: 0,
    accountingMonths: [
      { period: "Mes 1", productOrService: "", totalBilled: 0, profit: 0 },
      { period: "Mes 2", productOrService: "", totalBilled: 0, profit: 0 },
      { period: "Mes 3", productOrService: "", totalBilled: 0, profit: 0 }
    ],
  },
  loanDetails: {
    creditType: "",
    requestedAmount: 0,
    paymentFrequency: "Monthly",
    installmentsCount: 6,
    justification: "",
    isRenovation: "No",
    previousCreditObjective: "",
    creditUseType: "Insumos",
    machineryDetails: {
      machineryType: "",
      brand: "",
      condition: "Nueva",
      usedYears: "",
      hasWarranty: "No",
      warrantyDuration: "",
      purchasePlace: "",
      shippedToHome: "No",
      shippingCost: 0,
      whyThisOption: "",
      estimatedBenefit: "",
      machineryPhotos: [],
    }
  },
  disbursementInfo: {
    bankOrWallet: "",
    accountHolder: "",
    alias: "",
    cbu: "",
  },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

const isApplicationSemanticallyEqual = (a: LoanApplication | null, b: LoanApplication | null): boolean => {
  if (a === b) return true;
  if (!a || !b) return false;
  return (
    JSON.stringify({ ...a, updatedAt: "" }) === JSON.stringify({ ...b, updatedAt: "" })
  );
};

const isStep1Valid = (p?: PersonalData) => {
  if (!p) return false;
  return !!(
    p.firstName?.trim() &&
    p.lastName?.trim() &&
    p.dni?.trim() &&
    p.birthDate?.trim() &&
    p.phone?.trim() &&
    p.address?.trim() &&
    p.neighborhood?.trim() &&
    p.civilStatus?.trim() &&
    p.educationLevel?.trim()
  );
};

const isStep2Valid = (h?: HouseholdFinance) => {
  if (!h) return false;
  const hasIncomes = h.fixedIncome !== undefined && h.variableIncome !== undefined;
  if (!hasIncomes) return false;
  
  // householdSize or similar validation can be added here if needed
  
  if (h.detailedExpenses) {
    const comida = h.detailedExpenses.comidaMercaderia?.amount;
    return comida !== undefined && comida > 0;
  }
  return h.expenseFoodRent !== undefined && h.expenseFoodRent > 0;
};

const isStep3Valid = (e?: EntrepreneurshipData) => {
  if (!e) return false;
  return !!(
    e.name?.trim() &&
    e.activity?.trim() &&
    e.seniority?.trim() &&
    e.type?.trim() &&
    e.salesPlace?.trim()
  );
};

const isStep4Valid = (l?: LoanDetails) => {
  if (!l) return false;
  return !!(
    l.creditType?.trim() &&
    l.requestedAmount > 0 &&
    l.installmentsCount > 0 &&
    l.justification?.trim()
  );
};

const isStep5Valid = (d?: DisbursementInfo) => {
  if (!d) return false;
  return !!(
    d.bankOrWallet?.trim() &&
    d.accountHolder?.trim() &&
    d.alias?.trim() &&
    d.cbu?.trim()
  );
};

const getFirstIncompleteStep = (app: LoanApplication): LoanStep => {
  if (!isStep1Valid(app.personalData)) return 1;
  if (!isStep2Valid(app.householdFinance)) return 2;
  if (!isStep3Valid(app.entrepreneurshipData)) return 3;
  if (!isStep4Valid(app.loanDetails)) return 4;
  if (!isStep5Valid(app.disbursementInfo)) return 5;
  return 5;
};

const getApplicationValidationErrors = (app: LoanApplication) => {
  const errors: { [key: string]: string } = {};

  // Step 1: Datos Personales
  if (!app.personalData?.lastName?.trim()) errors["personalData.lastName"] = "Apellido";
  if (!app.personalData?.firstName?.trim()) errors["personalData.firstName"] = "Nombre";
  if (!app.personalData?.dni?.trim()) errors["personalData.dni"] = "DNI";
  if (!app.personalData?.birthDate?.trim()) errors["personalData.birthDate"] = "Fecha de Nacimiento";
  if (!app.personalData?.phone?.trim()) errors["personalData.phone"] = "Teléfono";
  if (!app.personalData?.address?.trim()) errors["personalData.address"] = "Dirección";
  if (!app.personalData?.neighborhood?.trim()) errors["personalData.neighborhood"] = "Barrio";
  if (!app.personalData?.civilStatus?.trim()) errors["personalData.civilStatus"] = "Estado Civil";
  if (!app.personalData?.educationLevel?.trim()) errors["personalData.educationLevel"] = "Nivel Educativo";

  // Step 2: Finanzas del Hogar
  if (app.householdFinance?.fixedIncome === undefined || isNaN(app.householdFinance.fixedIncome)) {
    errors["householdFinance.fixedIncome"] = "Ingresos Fijos del Hogar";
  }
  if (app.householdFinance?.variableIncome === undefined || isNaN(app.householdFinance.variableIncome)) {
    errors["householdFinance.variableIncome"] = "Ingresos Variables del Hogar";
  }
  if (app.householdFinance?.detailedExpenses) {
    const comida = app.householdFinance.detailedExpenses.comidaMercaderia?.amount;
    if (comida === undefined || isNaN(comida) || comida <= 0) {
      errors["householdFinance.expenseFoodRent"] = "Debes ingresar al menos el presupuesto mensual de Comida y mercadería";
    }
  } else {
    if (app.householdFinance?.expenseFoodRent === undefined || isNaN(app.householdFinance.expenseFoodRent)) {
      errors["householdFinance.expenseFoodRent"] = "Gasto Mensual en Comida y Alquiler";
    }
    if (app.householdFinance?.expenseServices === undefined || isNaN(app.householdFinance.expenseServices)) {
      errors["householdFinance.expenseServices"] = "Gasto Mensual en Servicios";
    }
  }

  // Step 3: Emprendimiento
  if (!app.entrepreneurshipData?.name?.trim()) errors["entrepreneurshipData.name"] = "Nombre del Emprendimiento";
  if (!app.entrepreneurshipData?.activity?.trim()) errors["entrepreneurshipData.activity"] = "Actividad Principal";
  if (!app.entrepreneurshipData?.seniority?.trim()) errors["entrepreneurshipData.seniority"] = "Antigüedad del negocio";
  if (!app.entrepreneurshipData?.type?.trim()) errors["entrepreneurshipData.type"] = "Tipo de Negocio";
  if (!app.entrepreneurshipData?.salesPlace?.trim()) errors["entrepreneurshipData.salesPlace"] = "Lugar de venta";

  // Step 4: Detalles del Préstamo
  if (!app.loanDetails?.creditType?.trim()) errors["loanDetails.creditType"] = "Tipo de Crédito";
  if (!app.loanDetails?.requestedAmount || app.loanDetails.requestedAmount <= 0) {
    errors["loanDetails.requestedAmount"] = "Monto solicitado";
  }
  if (!app.loanDetails?.installmentsCount || app.loanDetails.installmentsCount <= 0) {
    errors["loanDetails.installmentsCount"] = "Cantidad de cuotas";
  }
  if (!app.loanDetails?.justification?.trim()) errors["loanDetails.justification"] = "Justificación/Motivo";

  // Step 5: Transferencia/Desembolso
  if (!app.disbursementInfo?.bankOrWallet?.trim()) errors["disbursementInfo.bankOrWallet"] = "Entidad (Banco/Billetera)";
  if (!app.disbursementInfo?.accountHolder?.trim()) errors["disbursementInfo.accountHolder"] = "Nombre del titular";
  if (!app.disbursementInfo?.alias?.trim()) errors["disbursementInfo.alias"] = "Alias de la cuenta";
  if (!app.disbursementInfo?.cbu?.trim()) errors["disbursementInfo.cbu"] = "CBU de la cuenta bancaria";

  return errors;
};

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<'admin' | 'user'>('user');
  const [canCreateOnBehalf, setCanCreateOnBehalf] = useState<boolean>(false);
  const [application, setApplication] = useState<LoanApplication | null>(null);
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);

  const validationErrors = application && hasAttemptedSubmit
    ? Object.keys(getApplicationValidationErrors(application))
    : [];
  const [isSaved, setIsSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState<View>('wizard');
  const [userApplications, setUserApplications] = useState<LoanApplication[]>([]);
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const [hasActiveApplication, setHasActiveApplication] = useState(false);
  const [activeApp, setActiveApp] = useState<LoanApplication | null>(null);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [showNewRequest, setShowNewRequest] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [loginTab, setLoginTab] = useState<'google' | 'email'>('google');

  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, "config", "settings"), (docSnap) => {
      if (docSnap.exists()) {
        const loadedSettings = docSnap.data() as AppSettings;
        // Merge with DEFAULT_SETTINGS to ensure new fields like scoringConfig are present
        setSettings({
          ...DEFAULT_SETTINGS,
          ...loadedSettings,
          scoringConfig: loadedSettings.scoringConfig || DEFAULT_SETTINGS.scoringConfig
        });
      } else {
        setSettings(DEFAULT_SETTINGS);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, "config/settings");
      setSettings(DEFAULT_SETTINGS);
    });
    return () => unsubscribe();
  }, []);

  // Auth Listener & User Profile
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      try {
        if (currentUser) {
          // Check/Create user profile
          const userDocRef = doc(db, "users", currentUser.uid);
          const userDoc = await getDoc(userDocRef);
          
          if (!userDoc.exists()) {
            let role: "admin" | "user" = currentUser.email === "mariano.imbrogno@gmail.com" ? "admin" : "user";
            let inheritedOnBehalf: boolean | undefined = undefined;
            
            // Check if there is an existing user document with this email to inherit their role & permissions
            if (currentUser.email) {
              try {
                const usersRef = collection(db, "users");
                const qEmail = query(usersRef, where("email", "==", currentUser.email));
                const emailSnap = await getDocs(qEmail);
                if (!emailSnap.empty) {
                  emailSnap.docs.forEach(docSnap => {
                    const existingUser = docSnap.data();
                    if (existingUser && (existingUser.role === "admin" || existingUser.role === "user")) {
                      if (existingUser.role === "admin") role = "admin";
                    }
                    if (existingUser && existingUser.canCreateOnBehalf !== undefined) {
                      inheritedOnBehalf = Boolean(existingUser.canCreateOnBehalf);
                    }
                  });
                }
              } catch (err) {
                console.warn("Could not query existing email to inherit role/permissions:", err);
              }
            }

            const initialCanOnBehalf = inheritedOnBehalf !== undefined ? inheritedOnBehalf : (role === 'admin');

            await setDoc(userDocRef, {
              uid: currentUser.uid,
              email: currentUser.email || "invitado@mujeres2000.org",
              role: role,
              canCreateOnBehalf: initialCanOnBehalf,
              displayName: currentUser.displayName || "Emprendedora"
            });
            setUserRole(role);
            setCanCreateOnBehalf(initialCanOnBehalf);
          } else {
            const data = userDoc.data();
            const userRole = data.role || 'user';
            setUserRole(userRole);
            setCanCreateOnBehalf(data.canCreateOnBehalf !== undefined ? Boolean(data.canCreateOnBehalf) : (userRole === 'admin'));
          }
        }
        setUser(currentUser);
      } catch (error) {
        console.error("Error in auth listener:", error);
      } finally {
        console.log("Auth listener finished, setting loading to false");
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  // Real-time listener for current user permissions and role
  useEffect(() => {
    if (!user) {
      setCanCreateOnBehalf(false);
      return;
    }

    if (user.email) {
      const usersRef = collection(db, "users");
      const qEmail = query(usersRef, where("email", "==", user.email));
      
      const unsubscribe = onSnapshot(qEmail, (snap) => {
        let isUserAdmin = user.email === "mariano.imbrogno@gmail.com";
        let isUserOnBehalf = isUserAdmin;
        let foundExplicitOnBehalf = false;

        if (!snap.empty) {
          snap.docs.forEach(docSnap => {
            const data = docSnap.data();
            if (data.role === 'admin') {
              isUserAdmin = true;
            }
            if (data.canCreateOnBehalf !== undefined) {
              foundExplicitOnBehalf = true;
              if (data.canCreateOnBehalf === true) {
                isUserOnBehalf = true;
              }
            }
          });

          if (!foundExplicitOnBehalf) {
            isUserOnBehalf = isUserAdmin;
          }

          setUserRole(isUserAdmin ? 'admin' : 'user');
          setCanCreateOnBehalf(isUserOnBehalf);
        } else {
          // Fallback to direct UID doc
          const userDocRef = doc(db, "users", user.uid);
          getDoc(userDocRef).then(uidSnap => {
            if (uidSnap.exists()) {
              const data = uidSnap.data();
              const role = data.role || 'user';
              setUserRole(role);
              setCanCreateOnBehalf(data.canCreateOnBehalf !== undefined ? Boolean(data.canCreateOnBehalf) : (role === 'admin'));
            }
          });
        }
      });
      return () => unsubscribe();
    } else {
      const userDocRef = doc(db, "users", user.uid);
      const unsubscribe = onSnapshot(userDocRef, (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          const role = data.role || 'user';
          setUserRole(role);
          const onBehalf = data.canCreateOnBehalf !== undefined 
            ? Boolean(data.canCreateOnBehalf) 
            : (role === 'admin');
          setCanCreateOnBehalf(onBehalf);
        }
      });
      return () => unsubscribe();
    }
  }, [user]);

  // Firestore Sync
  useEffect(() => {
    if (!user) {
      setApplication(null);
      setHasActiveApplication(false);
      setActiveApp(null);
      setUserApplications([]);
      return;
    }

    const qUid = query(
      collection(db, "applications"),
      where("userId", "==", user.uid)
    );

    const qEmail = user.email
      ? query(collection(db, "applications"), where("userEmail", "==", user.email))
      : null;

    let uidApps: LoanApplication[] = [];
    let emailApps: LoanApplication[] = [];

    const mergeAndSync = () => {
      const mergedMap = new Map<string, LoanApplication>();
      uidApps.forEach(app => mergedMap.set(app.id, app));
      emailApps.forEach(app => mergedMap.set(app.id, app));

      const mergedApps = Array.from(mergedMap.values());
      // Sort by updatedAt desc
      mergedApps.sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime());

      setUserApplications(mergedApps);

      const submitted = mergedApps.filter(a => a.status !== "Draft");
      if (submitted.length > 0) {
        setHasActiveApplication(true);
        // Default active app is the latest submitted one, or whichever status we look for
        const activeOrLatest = submitted.find(a => ["Pending", "Approved", "Active"].includes(a.status)) || submitted[0];
        setActiveApp(activeOrLatest);
      } else {
        setHasActiveApplication(false);
        setActiveApp(null);
      }
    };

    const unsubscribeApps = onSnapshot(qUid, (querySnapshot) => {
      uidApps = querySnapshot.docs.map(doc => doc.data() as LoanApplication);
      mergeAndSync();
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "applications");
    });

    let unsubscribeEmail = () => {};
    if (qEmail) {
      unsubscribeEmail = onSnapshot(qEmail, (querySnapshot) => {
        emailApps = querySnapshot.docs.map(doc => doc.data() as LoanApplication);
        mergeAndSync();
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, "applications");
      });
    }

    // Try to find an existing draft for this user asynchronously to avoid creating duplicates
    let active = true;
    let unsubscribeDraft: (() => void) | null = null;
    let hasInitializedStep = false;

    const setupDraftListener = (resolvedDraftId: string) => {
      if (!active) return;
      localStorage.setItem(`loan_draft_id_${user.uid}`, resolvedDraftId);
      
      const unsub = onSnapshot(doc(db, "applications", resolvedDraftId), (docSnap) => {
        if (!active) return;
        if (docSnap.exists()) {
          const loadedApp = docSnap.data() as LoanApplication;
          if (!hasInitializedStep) {
            hasInitializedStep = true;
            // Respect the saved step in the database instead of automatically jumping ahead.
            // This is crucial when we want the user to review pre-filled data at Step 1.
            const calculatedStep = loadedApp.step || 1;
            setApplication(prev => {
              const next = {
                ...loadedApp,
                step: calculatedStep
              };
              if (!isApplicationSemanticallyEqual(prev, next)) {
                return next;
              }
              return prev;
            });
          } else {
            setApplication(prev => {
              if (!isApplicationSemanticallyEqual(prev, loadedApp)) {
                return loadedApp;
              }
              return prev;
            });
          }
        } else {
          // Build initial prefilled data based on past applications
          const qPast = query(collection(db, "applications"), where("userId", "==", user.uid));
          getDocs(qPast).then((querySnapshot) => {
            if (!active) return;
            const apps = querySnapshot.docs.map(d => d.data() as LoanApplication);
            const targetApps = apps.filter(app => app.status !== 'Draft');
            
            let prefilledData = INITIAL_DATA(user);
            prefilledData.id = resolvedDraftId;
            prefilledData.step = 1; // start at step 1 for validation
            
            if (targetApps.length > 0) {
              targetApps.sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime());
              const lastApp = targetApps[0];
              prefilledData = {
                ...prefilledData,
                personalData: lastApp.personalData ? { ...lastApp.personalData } : prefilledData.personalData,
                householdFinance: lastApp.householdFinance ? { ...lastApp.householdFinance } : prefilledData.householdFinance,
                entrepreneurshipData: lastApp.entrepreneurshipData ? { ...lastApp.entrepreneurshipData } : prefilledData.entrepreneurshipData,
              };
            }
            
            setApplication(prefilledData);
            setDoc(doc(db, "applications", resolvedDraftId), {
              ...prefilledData,
              updatedAt: new Date().toISOString()
            }).catch(err => console.error("Error saving prefilled draft:", err));
          }).catch(err => {
            if (!active) return;
            console.error("Error querying past applications:", err);
            const newData = INITIAL_DATA(user);
            newData.id = resolvedDraftId;
            setApplication(newData);
          });
        }
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, `applications/${resolvedDraftId}`);
      });

      unsubscribeDraft = unsub;
    };

    // Handle fallback if no draft is found in Firestore
    const handleNoDraftFound = (submittedApps: LoanApplication[]) => {
      if (!active) return;
      // If the user already has submitted applications, and they are NOT currently requesting a new loan,
      // do NOT automatically create a new draft document in Firestore.
      const isFirstTime = submittedApps.length === 0;
      if (!isFirstTime && !showNewRequest) {
        setApplication(null);
        return;
      }

      // Otherwise (first time user OR they clicked 'Solicitar' and showNewRequest is true), generate draft!
      const storedDraftId = localStorage.getItem(`loan_draft_id_${user.uid}`);
      if (storedDraftId) {
        setupDraftListener(storedDraftId);
      } else {
        const newDraftId = `draft_${user.uid}_${Date.now()}`;
        setupDraftListener(newDraftId);
      }
    };

    // First, find if there is ANY existing application belonging to this user
    const qAllUid = query(
      collection(db, "applications"),
      where("userId", "==", user.uid)
    );

    getDocs(qAllUid).then((uidSnap) => {
      if (!active) return;
      const allApps = uidSnap.docs.map(doc => doc.data() as LoanApplication);
      const existingDraft = allApps.find(app => app.status === "Draft");
      const submittedApps = allApps.filter(app => app.status !== "Draft");

      if (existingDraft) {
        // Found a draft! Use it.
        setupDraftListener(existingDraft.id);
      } else if (user.email) {
        // Query by userEmail to be thorough
        const qDraftsEmail = query(
          collection(db, "applications"),
          where("userEmail", "==", user.email),
          where("status", "==", "Draft")
        );
        getDocs(qDraftsEmail).then((emailSnap) => {
          if (!active) return;
          if (!emailSnap.empty) {
            const existingDraftEmail = emailSnap.docs[0].data() as LoanApplication;
            setupDraftListener(existingDraftEmail.id);
          } else {
            handleNoDraftFound(submittedApps);
          }
        }).catch(err => {
          console.error("Error finding draft by email:", err);
          handleNoDraftFound(submittedApps);
        });
      } else {
        handleNoDraftFound(submittedApps);
      }
    }).catch(err => {
      console.error("Error finding draft by UID:", err);
      handleNoDraftFound([]);
    });

    return () => {
      active = false;
      unsubscribeApps();
      unsubscribeEmail();
      if (unsubscribeDraft) {
        unsubscribeDraft();
      }
    };
  }, [user, settings.allowMultipleLoans, showNewRequest]);

  // Auto-save to Firestore
  useEffect(() => {
    if (user && application && application.status === "Draft") {
      const saveTimeout = setTimeout(async () => {
        try {
          await setDoc(doc(db, "applications", application.id), {
            ...application,
            updatedAt: new Date().toISOString()
          });
          setIsSaved(true);
          setTimeout(() => setIsSaved(false), 2000);
          localStorage.setItem(`loan_draft_id_${user.uid}`, application.id);
        } catch (error) {
          console.error("Error saving to Firestore:", error);
        }
      }, 1000);
      return () => clearTimeout(saveTimeout);
    }
  }, [application, user]);

  // Scroll to top of the webpage when step or showNewRequest status changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [application?.step, showNewRequest]);

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login failed:", error);
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setAuthLoading(true);
    const cleanEmail = email.trim();
    try {
      await signInWithEmailAndPassword(auth, cleanEmail, password);
    } catch (error: any) {
      console.error("Email login error:", error);
      let errMsg = "Error al iniciar sesión. Por favor, verifica tus datos.";
      if (error.code === "auth/user-not-found" || error.code === "auth/wrong-password" || error.code === "auth/invalid-credential") {
        errMsg = "Correo o contraseña incorrectos.";
      } else if (error.code === "auth/invalid-email") {
        errMsg = "El correo electrónico no es válido.";
      } else if (error.code === "auth/operation-not-allowed") {
        errMsg = "El acceso por Correo y Contraseña no está habilitado en la consola de Firebase (Authentication > Sign-in method).";
      } else if (error.code === "auth/too-many-requests") {
        errMsg = "Demasiados intentos fallidos. Intenta nuevamente en unos minutos.";
      } else if (error.message) {
        errMsg = `Error (${error.code || 'auth'}): ${error.message}`;
      }
      setAuthError(errMsg);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleEmailRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    const cleanName = name.trim();
    const cleanEmail = email.trim();
    
    if (!cleanName) {
      setAuthError("Por favor, ingresa tu nombre completo.");
      return;
    }
    if (!cleanEmail) {
      setAuthError("Por favor, ingresa tu correo electrónico.");
      return;
    }
    if (password.length < 6) {
      setAuthError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }
    setAuthLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, cleanEmail, password);
      
      // Update Firebase Auth display name profile
      if (userCredential.user) {
        try {
          await updateProfile(userCredential.user, { displayName: cleanName });
        } catch (pErr) {
          console.warn("Could not update auth profile displayName:", pErr);
        }
      }

      // Create/update Firestore user document
      const userDocRef = doc(db, "users", userCredential.user.uid);
      await setDoc(userDocRef, {
        uid: userCredential.user.uid,
        email: cleanEmail,
        role: "user",
        displayName: cleanName
      });
    } catch (error: any) {
      console.error("Email register error:", error);
      let errMsg = "Error al registrar la cuenta.";
      if (error.code === "auth/email-already-in-use") {
        errMsg = "Este correo electrónico ya está registrado. Por favor inicia sesión.";
      } else if (error.code === "auth/invalid-email") {
        errMsg = "El correo electrónico no es válido.";
      } else if (error.code === "auth/operation-not-allowed") {
        errMsg = "El registro por Correo/Contraseña está desactivado en Firebase Console (Authentication > Sign-in method). Habilítalo para permitir nuevos registros.";
      } else if (error.code === "auth/weak-password") {
        errMsg = "La contraseña es muy débil. Usa al menos 6 caracteres.";
      } else if (error.code === "auth/network-request-failed") {
        errMsg = "Error de red al conectar con Firebase.";
      } else if (error.message) {
        errMsg = `Error (${error.code || 'auth'}): ${error.message}`;
      }
      setAuthError(errMsg);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleGuestLogin = async () => {
    setAuthError("");
    setAuthLoading(true);
    try {
      const userCredential = await signInAnonymously(auth);
      const userDocRef = doc(db, "users", userCredential.user.uid);
      await setDoc(userDocRef, {
        uid: userCredential.user.uid,
        email: "invitado@mujeres2000.org",
        role: "user",
        displayName: "Emprendedora Invitada"
      });
    } catch (error: any) {
      console.error(error);
      setAuthError("Error al iniciar como invitado. Por favor, intenta de nuevo.");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => signOut(auth);

  const nextStep = () => {
    if (application && application.step < 5) {
      setApplication({ ...application, step: (application.step + 1) as LoanStep });
    }
  };

  const prevStep = () => {
    if (application && application.step > 1) {
      setApplication({ ...application, step: (application.step - 1) as LoanStep });
    }
  };

  const updateData = (key: keyof LoanApplication, data: any) => {
    if (application) {
      setApplication({
        ...application,
        [key]: data,
      });
    }
  };

  const handleSubmit = async () => {
    if (!application) return;

    const selectedProduct = settings.loanProducts?.find(
      p => p.name.trim().toLowerCase() === application.loanDetails.creditType?.trim().toLowerCase()
    );
    const maxAllowedForProduct = selectedProduct?.maxAmount ?? (
      settings.loanProducts && settings.loanProducts.length > 0 
        ? Math.max(...settings.loanProducts.map(p => p.maxAmount))
        : MAX_LOAN_AMOUNT
    );

    if (application.loanDetails.requestedAmount > maxAllowedForProduct) {
      toast.error(`El monto solicitado excede el máximo permitido ($${maxAllowedForProduct.toLocaleString('es-AR')}).`);
      return;
    }

    if (selectedProduct && application.loanDetails.requestedAmount < selectedProduct.minAmount) {
      toast.error(`El monto solicitado es menor al mínimo permitido ($${selectedProduct.minAmount.toLocaleString('es-AR')}).`);
      return;
    }

    const errors = getApplicationValidationErrors(application);
    const errorKeys = Object.keys(errors);

    if (errorKeys.length > 0) {
      setHasAttemptedSubmit(true);
      const firstIncompleteStep = getFirstIncompleteStep(application);
      
      let sectionName = "Sección 1 (Datos Personales)";
      if (firstIncompleteStep === 2) sectionName = "Sección 2 (Finanzas)";
      else if (firstIncompleteStep === 3) sectionName = "Sección 3 (Emprendimiento)";
      else if (firstIncompleteStep === 4) sectionName = "Sección 4 (Detalles del Préstamo)";
      else if (firstIncompleteStep === 5) sectionName = "Sección 5 (Transferencia)";

      let stepPrefix = "personalData.";
      if (firstIncompleteStep === 2) stepPrefix = "householdFinance.";
      else if (firstIncompleteStep === 3) stepPrefix = "entrepreneurshipData.";
      else if (firstIncompleteStep === 4) stepPrefix = "loanDetails.";
      else if (firstIncompleteStep === 5) stepPrefix = "disbursementInfo.";

      const stepMissingFields = Object.keys(errors)
        .filter(k => k.startsWith(stepPrefix))
        .map(k => errors[k]);

      const missingText = stepMissingFields.join(", ");
      
      toast.error(`Falta cargar los siguientes datos obligatorios en la ${sectionName}: ${missingText}`);
      setApplication({ ...application, step: firstIncompleteStep });
      return;
    }
    
    try {
      const submittedId = application.id;

      // Calculate sequential loan number if not already present
      let loanNumber = application.loanNumber;
      if (!loanNumber) {
        try {
          const qMax = query(
            collection(db, "applications"),
            orderBy("loanNumber", "desc"),
            limit(1)
          );
          const maxSnap = await getDocs(qMax);
          if (!maxSnap.empty) {
            const lastNum = maxSnap.docs[0].data().loanNumber;
            if (typeof lastNum === 'number') {
              loanNumber = lastNum + 1;
            } else {
              loanNumber = 1;
            }
          } else {
            // Check if there are applications in a complete client scan (fallback)
            const allSnap = await getDocs(collection(db, "applications"));
            let maxNum = 0;
            allSnap.forEach(docSnap => {
              const num = docSnap.data().loanNumber;
              if (typeof num === 'number' && num > maxNum) {
                maxNum = num;
              }
            });
            loanNumber = maxNum + 1;
          }
        } catch (err) {
          console.warn("Could not query max loan number using index, using full scan fallback:", err);
          try {
            const allSnap = await getDocs(collection(db, "applications"));
            let maxNum = 0;
            allSnap.forEach(docSnap => {
              const num = docSnap.data().loanNumber;
              if (typeof num === 'number' && num > maxNum) {
                maxNum = num;
              }
            });
            loanNumber = maxNum + 1;
          } catch (scanErr) {
            console.error("Scanning failed, defaulting to 1", scanErr);
            loanNumber = 1;
          }
        }
      }

      await setDoc(doc(db, "applications", submittedId), {
        ...application,
        loanNumber,
        status: "Pending",
        submittedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      // Reset or redirect
      localStorage.removeItem(`loan_draft_id_${user?.uid}`);
      setShowNewRequest(false);
      setSelectedAppId(submittedId);
      toast.success("¡Solicitud enviada exitosamente!");
    } catch (error) {
      console.error("Submit failed:", error);
      toast.error("Error al enviar la solicitud. Por favor intenta de nuevo.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center p-6 sm:p-8 shadow-2xl bg-white border border-slate-100 rounded-2xl">
          <div className="mb-4 flex justify-center">
            <div className="p-4 bg-emerald-50 rounded-full border border-emerald-100">
              <LogIn className="w-10 h-10 text-emerald-600" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-slate-800 mb-1">Bienvenida</CardTitle>
          <CardDescription className="mb-6 text-slate-500">
            Microcréditos "Mujeres 2000"
          </CardDescription>

          {/* Tab Selector */}
          <div className="flex bg-slate-100 p-1 rounded-xl mb-6 relative">
            <button
              onClick={() => { setLoginTab('google'); setAuthError(""); }}
              className={`flex-1 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all ${
                loginTab === 'google' 
                  ? 'bg-white text-slate-900 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Google
            </button>
            <button
              onClick={() => { setLoginTab('email'); setAuthError(""); }}
              className={`flex-1 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all ${
                loginTab === 'email' 
                  ? 'bg-white text-slate-900 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Correo
            </button>
          </div>

          {authError && (
            <div className="mb-4 p-3 text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg text-left">
              {authError}
            </div>
          )}

          {/* Tab Content 1: Google */}
          {loginTab === 'google' && (
            <div className="space-y-4">
              <p className="text-sm text-center text-slate-600 leading-relaxed">
                Inicia sesión con tu cuenta de Google de forma rápida y segura para guardar tu progreso automáticamente.
              </p>
              <Button onClick={handleLogin} className="w-full py-6 text-lg bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-md transition-all flex items-center justify-center gap-2" size="lg">
                <LogIn className="w-5 h-5 mr-2" />
                Ingresar con Google
              </Button>
            </div>
          )}

          {/* Tab Content 2: Email & Password */}
          {loginTab === 'email' && (
            <div className="text-left space-y-4">
              <form onSubmit={isRegistering ? handleEmailRegister : handleEmailLogin} className="space-y-3">
                {isRegistering && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Nombre Completo</label>
                    <Input
                      type="text"
                      placeholder="Ej. Juana Pérez"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      className="rounded-xl border-slate-200"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Correo Electrónico</label>
                  <Input
                    type="email"
                    placeholder="ejemplo@correo.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="rounded-xl border-slate-200"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Contraseña</label>
                  <Input
                    type="password"
                    placeholder="Mínimo 6 caracteres"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="rounded-xl border-slate-200"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={authLoading}
                  className="w-full py-5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl mt-4 font-bold tracking-wide shadow-sm"
                >
                  {authLoading ? "Procesando..." : isRegistering ? "Crear Cuenta e Ingresar" : "Iniciar Sesión"}
                </Button>
              </form>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => { setIsRegistering(!isRegistering); setAuthError(""); }}
                  className="text-xs font-bold text-emerald-600 hover:underline"
                >
                  {isRegistering ? "¿Ya tienes una cuenta? Inicia sesión aquí" : "¿No tienes cuenta? Regístrate aquí"}
                </button>
              </div>
            </div>
          )}
        </Card>
      </div>
    );
  }

  const steps = [
    { id: 1, title: "Datos Personales", icon: UserIcon },
    { id: 2, title: "Presupuesto", icon: Home },
    { id: 3, title: "Emprendimiento", icon: Briefcase },
    { id: 4, title: "Préstamo", icon: DollarSign },
    { id: 5, title: "Desembolso", icon: CreditCard },
  ];

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8 font-sans">
      <Toaster position="top-right" richColors />
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <div className="flex flex-col w-56">
            <h1 className="flex mb-1">
              <img 
                src={logoMujeres} 
                alt="Mujeres 2000" 
                className="w-full h-auto object-contain" 
                referrerPolicy="no-referrer"
              />
            </h1>
          </div>
          
          <div className="flex items-center gap-2 bg-white p-1 rounded-lg shadow-sm border border-slate-200 overflow-x-auto max-w-full scrollbar-hide">
            <Button 
              variant={currentView === 'wizard' ? 'default' : 'ghost'} 
              size="sm" 
              onClick={() => setCurrentView('wizard')}
              className="shrink-0"
            >
              <FileText className="w-4 h-4 mr-2" />
              Solicitudes
            </Button>
            <Button 
              variant={currentView === 'simulator' ? 'default' : 'ghost'} 
              size="sm" 
              onClick={() => setCurrentView('simulator')}
              className="shrink-0"
            >
              <Calculator className="w-4 h-4 mr-2" />
              Simulador
            </Button>
            {(canCreateOnBehalf || userRole === 'admin') && (
              <Button 
                variant={currentView === 'onbehalf' ? 'default' : 'ghost'} 
                size="sm" 
                onClick={() => setCurrentView('onbehalf')}
                className="shrink-0 text-purple-700 hover:text-purple-800 hover:bg-purple-50"
              >
                <UserPlus className="w-4 h-4 mr-2 text-purple-600" />
                Cuenta y Orden
              </Button>
            )}
            {userRole === 'admin' && (
              <Button 
                variant={currentView === 'admin' ? 'default' : 'ghost'} 
                size="sm" 
                onClick={() => setCurrentView('admin')}
                className="shrink-0"
              >
                <LayoutDashboard className="w-4 h-4 mr-2" />
                Panel Admin
              </Button>
            )}
            <div className="w-px h-6 bg-slate-200 mx-1 shrink-0" />
            <Button variant="ghost" size="sm" onClick={handleLogout} className="text-slate-500 hover:text-red-600 shrink-0">
              <LogOut className="w-4 h-4 mr-2" />
              Salir
            </Button>
          </div>
        </div>

        {currentView === 'admin' && userRole === 'admin' ? (
          <AdminDashboard defaultTab="applications" />
        ) : currentView === 'onbehalf' && (canCreateOnBehalf || userRole === 'admin') ? (
          <OnBehalfLoanManager settings={settings} />
        ) : currentView === 'simulator' ? (
          <LoanSimulator settings={settings} />
        ) : userApplications.filter(app => app.status !== "Draft").length > 0 && !showNewRequest ? (
          selectedAppId && userApplications.find(app => app.id === selectedAppId) ? (
            (() => {
              const selectedApp = userApplications.find(app => app.id === selectedAppId)!;
              return (
                <div className="space-y-4 max-w-4xl mx-auto">
                  <div className="flex justify-start">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setSelectedAppId(null)} 
                      className="text-slate-600 border-slate-200"
                    >
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Volver a mis préstamos
                    </Button>
                  </div>

                  {selectedApp.status === "Active" || selectedApp.status === "Paid" ? (
                    <PaymentManager application={selectedApp} whatsappNumber={settings?.whatsappNumber} />
                  ) : (
                    <Card className="max-w-2xl mx-auto border-none shadow-xl">
                      <CardHeader className="text-center pb-2">
                        <div className="flex justify-center mb-4">
                          <div className={`p-4 rounded-full ${
                            selectedApp.status === "Approved" ? "bg-green-100" : 
                            selectedApp.status === "Rejected" ? "bg-red-100" :
                            "bg-yellow-100"
                          }`}>
                            {selectedApp.status === "Approved" ? (
                              <CheckCircle2 className="w-12 h-12 text-green-600" />
                            ) : selectedApp.status === "Rejected" ? (
                              <Clock className="w-12 h-12 text-red-600 animate-none" />
                            ) : (
                              <Clock className="w-12 h-12 text-yellow-600 animate-pulse" />
                            )}
                          </div>
                        </div>
                        <CardTitle className="text-2xl">
                          {selectedApp.status === "Approved" ? "¡Préstamo Aprobado!" : 
                           selectedApp.status === "Rejected" ? "Solicitud No Aprobada" : 
                           "Solicitud en Proceso"}
                        </CardTitle>
                        <CardDescription>
                          {selectedApp.status === "Approved" 
                            ? "Tu solicitud ha sido aprobada. Pronto nos pondremos en contacto para el desembolso." 
                            : selectedApp.status === "Rejected"
                            ? "Tu solicitud no ha sido aprobada en esta oportunidad. Escríbenos si tienes dudas."
                            : "Estamos revisando tu solicitud. Te notificaremos pronto."}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="p-6 space-y-4">
                        <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-sm text-slate-500">Monto Solicitado:</span>
                            <span className="font-bold text-slate-900">${selectedApp.loanDetails.requestedAmount.toLocaleString('es-AR')}</span>
                          </div>
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-sm text-slate-500">Estado:</span>
                            <Badge className={
                              selectedApp.status === "Approved" ? "bg-green-100 text-green-700 font-medium border" : 
                              selectedApp.status === "Rejected" ? "bg-red-100 text-red-700 font-medium border" : 
                              "bg-yellow-100 text-yellow-700 font-medium border"
                            }>
                              {selectedApp.status === "Approved" ? "Aprobado" : 
                               selectedApp.status === "Rejected" ? "No Aprobado" : 
                               "Pendiente de Revisión"}
                            </Badge>
                          </div>
                          {(() => {
                            return (
                              <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                  <span className="text-sm text-slate-500">Fecha de creación:</span>
                                  <span className="text-sm text-slate-900">{new Date(selectedApp.createdAt).toLocaleDateString()}</span>
                                </div>
                                
                                {selectedApp.status !== "Draft" && (
                                  <div className="flex justify-between items-center">
                                    <span className="text-sm text-slate-500">Fecha de envío:</span>
                                    <span className="text-sm text-slate-900">{new Date(selectedApp.submittedAt || selectedApp.createdAt).toLocaleDateString()}</span>
                                  </div>
                                )}

                                {["Approved", "Active", "Paid"].includes(selectedApp.status) && (
                                  <div className="flex justify-between items-center">
                                    <span className="text-sm text-slate-500">Fecha de aprobación:</span>
                                    <span className="text-sm text-slate-900 font-medium text-green-700">
                                      {new Date(selectedApp.approvedAt || selectedApp.paymentSchedule?.startDate || selectedApp.updatedAt || selectedApp.createdAt).toLocaleDateString()}
                                    </span>
                                  </div>
                                )}

                                {selectedApp.status === "Rejected" && (
                                  <div className="flex justify-between items-center">
                                    <span className="text-sm text-slate-500">Fecha de rechazo:</span>
                                    <span className="text-sm text-red-600 font-medium">
                                      {new Date(selectedApp.rejectedAt || selectedApp.updatedAt || selectedApp.createdAt).toLocaleDateString()}
                                    </span>
                                  </div>
                                )}
                              </div>
                            );
                          })()}
                        </div>

                        {settings?.whatsappNumber && (
                          <div className="mt-4 p-4 bg-emerald-50 rounded-xl border border-emerald-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-left">
                            <div>
                              <h4 className="font-bold text-slate-800 text-xs sm:text-sm">¿Tenés consultas sobre tu estado?</h4>
                              <p className="text-[11px] text-slate-600 leading-relaxed">
                                Escribinos por WhatsApp y te responderemos a la brevedad.
                              </p>
                            </div>
                            <a
                              href={`https://wa.me/${settings.whatsappNumber.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(
                                `Hola! Soy ${selectedApp.personalData?.firstName || "Emprendedora"} ${selectedApp.personalData?.lastName || ""} y quería consultar sobre el estado de mi solicitud de microcrédito #${selectedApp.id.substring(0, 6).toUpperCase()}.`
                              )}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="w-full sm:w-auto px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold text-center shadow-lg hover:shadow-emerald-100 transition-all active:scale-95 whitespace-nowrap inline-flex items-center justify-center gap-1"
                            >
                              Escribir por WhatsApp
                            </a>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}
                </div>
              );
            })()
          ) : (
            (() => {
              const submittedApps = userApplications.filter(app => app.status !== "Draft");
              const draftApps = userApplications.filter(app => app.status === "Draft");
              const hasDraft = draftApps.length > 0;
              const canRequestNew = (settings.allowMultipleLoans || !submittedApps.some(app => ["Pending", "Approved", "Active"].includes(app.status))) && !hasDraft;
              
              const getStatusLabelAndColor = (status: string) => {
                switch (status) {
                  case 'Draft':
                    return { label: 'Borrador', color: 'bg-slate-100 text-slate-700 border-slate-200' };
                  case 'Pending':
                    return { label: 'Pendiente de Revisión', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' };
                  case 'Approved':
                    return { label: 'Aprobado', color: 'bg-green-100 text-green-800 border-green-200' };
                  case 'Active':
                    return { label: 'Vigente', color: 'bg-blue-100 text-blue-800 border-blue-200' };
                  case 'Paid':
                    return { label: 'Cancelado (Pagado)', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' };
                  case 'Rejected':
                    return { label: 'No Aprobado', color: 'bg-red-100 text-red-800 border-red-200' };
                  default:
                    return { label: status, color: 'bg-slate-100 text-slate-700 border-slate-200' };
                }
              };

              const getInstallmentAmount = (app: LoanApplication) => {
                if (app.paymentSchedule?.installments && app.paymentSchedule.installments.length > 0) {
                  return app.paymentSchedule.installments[0].amount;
                }
                const creditType = app.loanDetails.creditType;
                const requestedAmount = app.loanDetails.requestedAmount;
                const installmentsCount = app.loanDetails.installmentsCount || 6;
                const paymentFrequency = app.loanDetails.paymentFrequency || 'Monthly';
                
                const selectedProduct = settings.loanProducts?.find(
                  p => p.name.trim().toLowerCase() === creditType?.trim().toLowerCase()
                );
                const rawRate = selectedProduct?.interestRate ?? 48;
                const annualRatePercent = rawRate <= 2 ? rawRate * 1200 : rawRate;
                const baseMonthlyRate = (annualRatePercent / 100) / 12;
                const rate = paymentFrequency === 'Weekly' ? baseMonthlyRate / 4 : baseMonthlyRate;
                
                if (requestedAmount <= 0 || installmentsCount <= 0) return 0;
                const p = (requestedAmount * rate * Math.pow(1 + rate, installmentsCount)) / (Math.pow(1 + rate, installmentsCount) - 1);
                return Math.round(p);
              };

              return (
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 max-w-3xl mx-auto">
                    <div>
                      <h2 className="text-2xl font-bold text-slate-800">Mis Préstamos</h2>
                    </div>
                    {canRequestNew && (
                      <Button 
                        onClick={async () => {
                          const lastApp = submittedApps[0];
                          const newDraftId = `draft_${user?.uid}_${Date.now()}`;
                          
                          let newDraftData = INITIAL_DATA(user!);
                          newDraftData.id = newDraftId;
                          newDraftData.step = 1;
                          
                          if (lastApp) {
                            newDraftData = {
                              ...newDraftData,
                              personalData: lastApp.personalData ? { ...lastApp.personalData } : newDraftData.personalData,
                              householdFinance: lastApp.householdFinance ? { ...lastApp.householdFinance } : newDraftData.householdFinance,
                              entrepreneurshipData: lastApp.entrepreneurshipData ? { ...lastApp.entrepreneurshipData } : newDraftData.entrepreneurshipData,
                              loanDetails: {
                                creditType: "",
                                requestedAmount: 0,
                                paymentFrequency: "Monthly",
                                installmentsCount: 6,
                                justification: "",
                              },
                              disbursementInfo: {
                                bankOrWallet: "",
                                accountHolder: "",
                                alias: "",
                              },
                            };
                          }
                          
                          try {
                            await setDoc(doc(db, "applications", newDraftId), {
                              ...newDraftData,
                              updatedAt: new Date().toISOString()
                            });
                            localStorage.setItem(`loan_draft_id_${user?.uid}`, newDraftId);
                            setApplication(newDraftData);
                            setShowNewRequest(true);
                            setSelectedAppId(null);
                          } catch (error) {
                            console.error("Error creating prefilled draft:", error);
                          }
                        }}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold inline-flex items-center gap-2 w-full sm:w-auto py-5"
                      >
                        <PlusCircle className="w-4 h-4" />
                        Solicitar otro préstamo
                      </Button>
                    )}
                  </div>

                  <div className="grid gap-4 max-w-3xl mx-auto">
                    {/* Draft applications */}
                    {draftApps.map((draftApp) => {
                      return (
                        <Card key={draftApp.id} className="border-2 border-amber-200 bg-amber-50/10 hover:border-amber-300 transition-all hover:shadow-md overflow-hidden">
                          <CardContent className="p-5 flex flex-col gap-4">
                            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                              <div className="space-y-2">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-bold text-amber-900 text-base md:text-lg">
                                    Solicitud de Préstamo (Borrador)
                                  </span>
                                  <Badge className="bg-amber-100 text-amber-800 border-amber-200 font-semibold border">
                                    Borrador
                                  </Badge>
                                </div>
                                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                                  Esta solicitud está en borrador. Al continuar, podrás validar tus datos personales precargados y completar los detalles de tu nuevo préstamo.
                                </p>
                                {draftApp.loanDetails.requestedAmount > 0 && (
                                  <div className="flex flex-wrap gap-x-6 gap-y-1 text-slate-500 text-xs sm:text-sm pt-1">
                                    <div className="flex items-center gap-1.5">
                                      <span className="font-semibold text-slate-700">Monto borrador:</span>
                                      <span className="font-bold text-amber-700">${draftApp.loanDetails.requestedAmount.toLocaleString('es-AR')}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                      <span className="font-semibold text-slate-700">Cuotas:</span>
                                      <span>{draftApp.loanDetails.installmentsCount || 6} cuotas</span>
                                    </div>
                                  </div>
                                )}
                              </div>

                              <div className="w-full md:w-auto shrink-0 flex gap-2">
                                <Button
                                  onClick={async () => {
                                    try {
                                      // Force step to 1 to position the user on Personal Data to review and validate
                                      await setDoc(doc(db, "applications", draftApp.id), {
                                        ...draftApp,
                                        step: 1,
                                        updatedAt: new Date().toISOString()
                                      });
                                      setShowNewRequest(true);
                                      setSelectedAppId(null);
                                    } catch (err) {
                                      console.error("Error setting draft step to 1:", err);
                                    }
                                  }}
                                  className="w-full md:w-auto bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm transition-colors py-5 px-6 inline-flex items-center gap-2 shadow-sm"
                                >
                                  <FileEdit className="w-4 h-4" />
                                  Continuar Solicitud
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}

                    {submittedApps.map((app) => {
                      const statusInfo = getStatusLabelAndColor(app.status);
                      return (
                        <Card key={app.id} className="border border-slate-100 hover:border-blue-100 transition-all hover:shadow-md overflow-hidden">
                          <CardContent className="p-5 flex flex-col gap-4">
                            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                              <div className="space-y-2">
                                <div className="flex items-center gap-2 flex-wrap">
                                  {app.loanNumber && (
                                    <Badge variant="outline" className="font-mono text-xs text-blue-600 bg-blue-50 border-blue-100">
                                      Préstamo Nº {app.loanNumber}
                                    </Badge>
                                  )}
                                  <span className="font-bold text-slate-900 text-base md:text-lg">
                                    {app.status === "Draft"
                                      ? `Solicitud de Préstamo - Borrador: ${new Date(app.createdAt).toLocaleDateString()}`
                                      : app.status === "Pending"
                                      ? `Solicitud de Préstamo - Enviada: ${new Date(app.submittedAt || app.createdAt).toLocaleDateString()}`
                                      : app.status === "Rejected"
                                      ? `Solicitud de Préstamo - Rechazada: ${new Date(app.rejectedAt || app.updatedAt || app.createdAt).toLocaleDateString()}`
                                      : `Préstamo Aprobado - Fecha: ${new Date(app.approvedAt || app.paymentSchedule?.startDate || app.updatedAt || app.createdAt).toLocaleDateString()}`
                                    }
                                  </span>
                                  <Badge className={`${statusInfo.color} font-semibold border`}>
                                    {statusInfo.label}
                                  </Badge>
                                </div>
                                
                                <div className="flex flex-wrap gap-x-6 gap-y-1 text-slate-500 text-xs sm:text-sm">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-semibold text-slate-700">Monto solicitado:</span>
                                    <span className="font-bold text-blue-600">${app.loanDetails.requestedAmount.toLocaleString('es-AR')}</span>
                                  </div>
                                  
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-semibold text-slate-700">Cuotas:</span>
                                    <span>{app.loanDetails.installmentsCount || 6} cuotas</span>
                                  </div>

                                  <div className="flex items-center gap-1.5">
                                    <span className="font-semibold text-slate-700">Valor de cuota:</span>
                                    <span className="font-bold text-slate-900">${getInstallmentAmount(app).toLocaleString('es-AR')}</span>
                                  </div>
                                </div>
                              </div>

                              <div className="w-full md:w-auto shrink-0 flex gap-2">
                                <Button
                                  onClick={() => setSelectedAppId(app.id)}
                                  className="w-full md:w-auto bg-slate-50 hover:bg-blue-50 text-blue-700 border border-blue-100 font-semibold text-sm transition-colors py-5"
                                  variant="ghost"
                                >
                                  <Eye className="w-4 h-4 mr-2 text-blue-600" />
                                  Ver Detalles y Pagos
                                </Button>
                              </div>
                            </div>

                            {['Active', 'Paid'].includes(app.status) && app.paymentSchedule?.installments && (
                              <div className="pt-3 border-t border-slate-100/80 w-full space-y-2 animate-in fade-in slide-in-from-top-1">
                                <div className="flex justify-between items-center text-xs">
                                  <span className="text-slate-500 font-medium flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                    Progreso de pago
                                  </span>
                                  <span className="font-bold text-slate-700 font-mono">
                                    {app.paymentSchedule.installments.filter(i => i.status === 'Paid').length} de {app.paymentSchedule.installments.length} cuotas pagadas
                                  </span>
                                </div>
                                <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden flex">
                                  {app.paymentSchedule.installments.map((inst, idx) => {
                                    const isPaid = inst.status === 'Paid';
                                    return (
                                      <div 
                                        key={idx}
                                        className={`h-full flex-1 transition-all duration-500 ${
                                          isPaid 
                                            ? 'bg-emerald-500 hover:bg-emerald-600' 
                                            : 'bg-slate-200 hover:bg-slate-300'
                                        } ${idx > 0 ? 'border-l border-white' : ''}`}
                                        title={`Cuota ${inst.number}: ${isPaid ? 'Pagada' : 'Pendiente'}`}
                                      />
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                  
                  {!canRequestNew && (
                    <div className="p-4 bg-yellow-50 border border-yellow-100 rounded-xl text-yellow-800 text-xs leading-relaxed max-w-3xl mx-auto flex items-start gap-2">
                      <Clock className="w-4 h-4 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold">Solicitud en revisión o préstamo vigente</p>
                        <p>Para solicitar un nuevo préstamo, debes finalizar tu préstamo vigente (estado Pago) o esperar la resolución de tu solicitud pendiente.</p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()
          )
        ) : (
          <>
            {showNewRequest && userApplications.filter(app => app.status !== "Draft").length > 0 && (
              <div className="flex justify-start mb-6 max-w-3xl mx-auto">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setShowNewRequest(false)} 
                  className="text-slate-600 border-slate-200"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Volver a mis préstamos
                </Button>
              </div>
            )}
            {/* Progress Bar & Steps Indicators */}
            <div className="mb-8 max-w-3xl mx-auto">
              <div className="flex justify-between mb-4">
                {steps.map((step) => (
                  <div 
                    key={step.id} 
                    className={`flex flex-col items-center flex-1 ${step.id <= (application?.step || 1) ? 'text-primary' : 'text-slate-400'}`}
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 transition-colors ${
                      step.id < (application?.step || 1) ? 'bg-primary text-white' : 
                      step.id === (application?.step || 1) ? 'bg-primary/20 border-2 border-primary text-primary' : 
                      'bg-slate-200 text-slate-500'
                    }`}>
                      {step.id < (application?.step || 1) ? <CheckCircle2 className="w-6 h-6" /> : <step.icon className="w-5 h-5" />}
                    </div>
                    <span className="text-[10px] uppercase font-bold tracking-wider hidden sm:block">{step.title}</span>
                  </div>
                ))}
              </div>
              <Progress value={((application?.step || 1) / 5) * 100} className="h-2" />
            </div>

            {/* Form Content */}
            <div className="max-w-3xl mx-auto">
              <AnimatePresence mode="wait">
                <motion.div
                  key={application?.step || 1}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                >
                  <Card className="border-none shadow-xl shadow-slate-200/50 overflow-hidden">
                    <CardHeader className="bg-white border-b border-slate-100">
                      <div className="flex justify-between items-center">
                        <div>
                          <CardTitle className="text-xl">{steps[(application?.step || 1) - 1].title}</CardTitle>
                          <CardDescription>Paso {application?.step || 1} de 5</CardDescription>
                        </div>
                        {isSaved && (
                          <div className="flex items-center text-xs text-green-600 font-medium bg-green-50 px-2 py-1 rounded-full">
                            <Save className="w-3 h-3 mr-1" />
                            Sincronizado
                          </div>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="p-6">
                      {application?.step === 1 && (
                        <Step1PersonalData 
                          data={application.personalData} 
                          onChange={(data) => updateData("personalData", data)} 
                          settings={settings}
                          validationErrors={validationErrors}
                        />
                      )}
                      {application?.step === 2 && (
                        <Step2HouseholdFinance 
                          data={application.householdFinance} 
                          onChange={(data) => updateData("householdFinance", data)} 
                          validationErrors={validationErrors}
                        />
                      )}
                      {application?.step === 3 && (
                        <Step3Entrepreneurship 
                          data={application.entrepreneurshipData} 
                          onChange={(data) => updateData("entrepreneurshipData", data)} 
                          settings={settings}
                          validationErrors={validationErrors}
                        />
                      )}
                      {application?.step === 4 && (
                        <Step4LoanDetails 
                          data={application.loanDetails} 
                          onChange={(data) => updateData("loanDetails", data)} 
                          settings={settings}
                          validationErrors={validationErrors}
                        />
                      )}
                      {application?.step === 5 && (
                        <Step5Disbursement 
                          data={application.disbursementInfo} 
                          onChange={(data) => updateData("disbursementInfo", data)} 
                          validationErrors={validationErrors}
                        />
                      )}
                    </CardContent>
                    <CardFooter className="flex justify-between bg-slate-50/50 p-6 border-t border-slate-100">
                      <Button 
                        variant="outline" 
                        onClick={prevStep} 
                        disabled={application?.step === 1}
                        className="px-6"
                      >
                        <ChevronLeft className="w-4 h-4 mr-2" />
                        Anterior
                      </Button>
                      
                      {(application?.step || 1) < 5 ? (
                        <Button onClick={nextStep} className="px-6 bg-primary hover:bg-primary/90">
                          Siguiente
                          <ChevronRight className="w-4 h-4 ml-2" />
                        </Button>
                      ) : (
                        <Button onClick={handleSubmit} className="px-8 bg-green-600 hover:bg-green-700 text-white">
                          Enviar Solicitud
                          <CheckCircle2 className="w-4 h-4 ml-2" />
                        </Button>
                      )}
                    </CardFooter>
                  </Card>
                </motion.div>
              </AnimatePresence>
            </div>
          </>
        )}

        {/* Footer Info */}
        <div className="mt-8 text-center text-slate-500 text-sm">
          <p>Tu progreso se sincroniza automáticamente con la nube.</p>
          <p className="mt-1">Sesión iniciada como: {user.email} ({userRole})</p>
        </div>
      </div>
    </div>
  );
}
