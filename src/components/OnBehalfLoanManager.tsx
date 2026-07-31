import React, { useState, useEffect } from "react";
import { 
  collection, 
  onSnapshot, 
  query, 
  where, 
  doc, 
  setDoc, 
  getDocs,
  deleteDoc,
  orderBy
} from "firebase/firestore";
import { db, auth } from "../firebase";
import { 
  LoanApplication, 
  AppSettings, 
  LoanStep,
  UserProfile,
  PersonalData,
  HouseholdFinance,
  EntrepreneurshipData,
  LoanDetails,
  DisbursementInfo
} from "../types";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  UserPlus, 
  FileText, 
  Search, 
  ArrowLeft, 
  CheckCircle, 
  Clock, 
  Trash2, 
  Edit3, 
  Send, 
  AlertTriangle,
  UserCheck,
  ChevronRight,
  ChevronLeft,
  DollarSign,
  Briefcase,
  Home,
  User as UserIcon,
  CreditCard
} from "lucide-react";
import { toast } from "sonner";
import { handleFirestoreError, OperationType } from "../lib/firestoreErrorHandler";
import Step1PersonalData from "./Step1PersonalData";
import Step2HouseholdFinance from "./Step2HouseholdFinance";
import Step3Entrepreneurship from "./Step3Entrepreneurship";
import Step4LoanDetails from "./Step4LoanDetails";
import Step5Disbursement from "./Step5Disbursement";

interface Props {
  settings: AppSettings;
}

const INITIAL_PERSONAL_DATA: PersonalData = {
  lastName: "",
  firstName: "",
  cuil: "",
  dni: "",
  birthDate: "",
  phone: "",
  address: "",
  neighborhood: "Troncos",
  civilStatus: "Soltera",
  educationLevel: "Secundario Completo",
  householdSize: 1
};

const INITIAL_HOUSEHOLD_FINANCE: HouseholdFinance = {
  fixedIncome: 0,
  variableIncome: 0,
  expenseFoodRent: 0,
  expenseServices: 0
};

const INITIAL_ENTREPRENEURSHIP: EntrepreneurshipData = {
  name: "",
  activity: "",
  seniority: "1 a 3 años",
  description: "",
  type: "Comercial"
};

const INITIAL_LOAN_DETAILS: LoanDetails = {
  creditType: "Línea Inicial",
  requestedAmount: 100000,
  paymentFrequency: "Weekly",
  installmentsCount: 12,
  justification: "Compra de insumos y materia prima"
};

const INITIAL_DISBURSEMENT: DisbursementInfo = {
  bankOrWallet: "Mercado Pago",
  accountHolder: "",
  alias: ""
};

export default function OnBehalfLoanManager({ settings }: Props) {
  const [applications, setApplications] = useState<LoanApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeApp, setActiveApp] = useState<LoanApplication | null>(null);
  const [currentStep, setCurrentStep] = useState<LoanStep>(1);

  // Form for starting a new on-behalf loan
  const [isStartingNew, setIsStartingNew] = useState(false);
  const [inputEmail, setInputEmail] = useState("");
  const [inputFirstName, setInputFirstName] = useState("");
  const [inputLastName, setInputLastName] = useState("");
  const [checkingEmail, setCheckingEmail] = useState(false);

  const currentUser = auth.currentUser;

  // Listen to applications created on behalf by current user or with createdOnBehalf flag
  useEffect(() => {
    if (!currentUser) return;

    const q = query(
      collection(db, "applications"),
      where("createdByUid", "==", currentUser.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const apps = snapshot.docs.map(doc => ({ ...doc.data() } as LoanApplication));
      // Sort by updatedAt descending
      apps.sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime());
      setApplications(apps);
      setLoading(false);
    }, (error) => {
      setLoading(false);
      handleFirestoreError(error, OperationType.LIST, "applications");
    });

    return () => unsubscribe();
  }, [currentUser]);

  // Check email and start or load application
  const handleStartOnBehalf = async () => {
    const cleanEmail = inputEmail.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes("@")) {
      toast.error("Ingresa un correo electrónico válido para la emprendedora");
      return;
    }

    if (!inputFirstName.trim() || !inputLastName.trim()) {
      toast.error("Ingresa el nombre y apellido completo de la emprendedora");
      return;
    }

    setCheckingEmail(true);

    try {
      // 1. Check if an application already exists for this email
      const qApp = query(collection(db, "applications"), where("userEmail", "==", cleanEmail));
      const appSnap = await getDocs(qApp);
      
      let existingApp: LoanApplication | null = null;
      if (!appSnap.empty) {
        const foundApps = appSnap.docs.map(d => d.data() as LoanApplication);
        // Find if there's a draft or pending application
        existingApp = foundApps.find(a => a.status === 'Draft') || foundApps[0];
      }

      if (existingApp && existingApp.status !== 'Draft') {
        toast.info(`La emprendedora ${cleanEmail} ya tiene una solicitud registrada con estado '${existingApp.status}'. Cargarás una nueva solicitud para ella.`);
      } else if (existingApp && existingApp.status === 'Draft') {
        toast.info(`Se encontró un borrador existente para ${cleanEmail}. Continuando con esa solicitud.`);
        setActiveApp(existingApp);
        setCurrentStep(existingApp.step || 1);
        setIsStartingNew(false);
        setCheckingEmail(false);
        return;
      }

      // 2. Check if user profile already exists in 'users'
      let existingUserUid = `ob_user_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      let prefilledPersonalData = {
        ...INITIAL_PERSONAL_DATA,
        firstName: inputFirstName.trim(),
        lastName: inputLastName.trim()
      };

      const qUser = query(collection(db, "users"), where("email", "==", cleanEmail));
      const userSnap = await getDocs(qUser);
      if (!userSnap.empty) {
        const uData = userSnap.docs[0].data();
        existingUserUid = uData.uid || existingUserUid;
        if (uData.displayName) {
          const parts = uData.displayName.split(" ");
          prefilledPersonalData.firstName = parts[0] || inputFirstName.trim();
          prefilledPersonalData.lastName = parts.slice(1).join(" ") || inputLastName.trim();
        }
      }

      // 3. Build new loan application
      const newId = `app_ob_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const nowIso = new Date().toISOString();

      const newApp: LoanApplication = {
        id: newId,
        userId: existingUserUid,
        userEmail: cleanEmail,
        status: "Draft",
        step: 1,
        personalData: prefilledPersonalData,
        householdFinance: INITIAL_HOUSEHOLD_FINANCE,
        entrepreneurshipData: INITIAL_ENTREPRENEURSHIP,
        loanDetails: INITIAL_LOAN_DETAILS,
        disbursementInfo: {
          ...INITIAL_DISBURSEMENT,
          accountHolder: `${prefilledPersonalData.firstName} ${prefilledPersonalData.lastName}`.trim()
        },
        createdAt: nowIso,
        updatedAt: nowIso,
        createdByUid: currentUser?.uid,
        createdByName: currentUser?.displayName || currentUser?.email || "Administrador",
        createdOnBehalf: true
      };

      // Save initial draft to Firestore
      await setDoc(doc(db, "applications", newId), newApp);
      
      toast.success(`Iniciando carga de préstamo a nombre de ${prefilledPersonalData.firstName} ${prefilledPersonalData.lastName}`);
      
      setActiveApp(newApp);
      setCurrentStep(1);
      setIsStartingNew(false);
      setInputEmail("");
      setInputFirstName("");
      setInputLastName("");
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, "applications");
      toast.error("Error al iniciar la solicitud por cuenta y orden");
    } finally {
      setCheckingEmail(false);
    }
  };

  // Save current active application state to Firestore
  const saveDraft = async (appToSave: LoanApplication, step: LoanStep) => {
    try {
      const updatedApp = {
        ...appToSave,
        step,
        updatedAt: new Date().toISOString()
      };
      await setDoc(doc(db, "applications", updatedApp.id), updatedApp);
      setActiveApp(updatedApp);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `applications/${appToSave.id}`);
    }
  };

  // Submit active application to Pending
  const handleSubmitOnBehalf = async () => {
    if (!activeApp) return;

    if (!activeApp.personalData.firstName || !activeApp.personalData.lastName || !activeApp.personalData.dni) {
      toast.error("Debes completar los datos personales (Nombre, Apellido y DNI) antes de enviar");
      setCurrentStep(1);
      return;
    }

    try {
      const nowIso = new Date().toISOString();
      const submittedApp: LoanApplication = {
        ...activeApp,
        status: "Pending",
        submittedAt: nowIso,
        updatedAt: nowIso,
        createdByUid: currentUser?.uid,
        createdByName: currentUser?.displayName || currentUser?.email || "Administrador",
        createdOnBehalf: true
      };

      // 1. Save application
      await setDoc(doc(db, "applications", submittedApp.id), submittedApp);

      // 2. Register/update user document in 'users' collection so the entrepreneur exists in DB
      const userDocRef = doc(db, "users", submittedApp.userId);
      await setDoc(userDocRef, {
        uid: submittedApp.userId,
        email: submittedApp.userEmail.toLowerCase().trim(),
        displayName: `${submittedApp.personalData.firstName} ${submittedApp.personalData.lastName}`.trim(),
        role: "user",
        createdByUid: currentUser?.uid,
        createdOnBehalf: true,
        updatedAt: nowIso
      }, { merge: true });

      toast.success("¡Solicitud por cuenta y orden enviada a revisión con éxito!");
      setActiveApp(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `applications/${activeApp.id}`);
      toast.error("Error al enviar la solicitud");
    }
  };

  // Delete draft
  const handleDeleteDraft = async (appId: string) => {
    try {
      await deleteDoc(doc(db, "applications", appId));
      toast.success("Borrador eliminado");
      if (activeApp?.id === appId) {
        setActiveApp(null);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `applications/${appId}`);
      toast.error("Error al eliminar borrador");
    }
  };

  // Filter applications list
  const filteredApps = applications.filter(app => 
    app.userEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (app.personalData?.firstName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (app.personalData?.lastName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (app.personalData?.dni || "").includes(searchTerm)
  );

  return (
    <div className="space-y-6">
      {/* Top Banner / Navigation */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-purple-50 p-6 rounded-xl border border-purple-200">
        <div>
          <div className="flex items-center gap-2 text-purple-900 font-bold text-lg mb-1">
            <UserPlus className="w-5 h-5 text-purple-600" />
            Carga de Préstamos por Cuenta y Orden
          </div>
          <p className="text-slate-600 text-sm max-w-2xl">
            Carga la información personal y simula el préstamo a nombre de una emprendedora. Los datos quedan vinculados a su correo electrónico y podrás enviar la solicitud a revisión.
          </p>
        </div>

        {!activeApp && !isStartingNew && (
          <Button 
            onClick={() => setIsStartingNew(true)}
            className="bg-purple-700 hover:bg-purple-800 text-white font-semibold shadow-sm shrink-0"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Nueva Solicitud x Cuenta y Orden
          </Button>
        )}
      </div>

      {/* Starting New Modal / Card */}
      {isStartingNew && !activeApp && (
        <Card className="border-purple-200 shadow-md bg-white">
          <CardHeader className="bg-purple-50/50 border-b border-purple-100">
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-purple-900 text-base">Identificación de la Emprendedora</CardTitle>
                <CardDescription>
                  Ingresa el correo electrónico y nombre de la emprendedora para asociar la solicitud.
                </CardDescription>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setIsStartingNew(false)}
                className="text-slate-500"
              >
                Cancelar
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ob-email">Correo Electrónico *</Label>
                <Input 
                  id="ob-email" 
                  type="email" 
                  placeholder="ejemplo@correo.com"
                  value={inputEmail}
                  onChange={(e) => setInputEmail(e.target.value)}
                  className="border-slate-200 focus:border-purple-500"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="ob-firstName">Nombre de la Emprendedora *</Label>
                <Input 
                  id="ob-firstName" 
                  placeholder="Marta"
                  value={inputFirstName}
                  onChange={(e) => setInputFirstName(e.target.value)}
                  className="border-slate-200 focus:border-purple-500"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="ob-lastName">Apellido de la Emprendedora *</Label>
                <Input 
                  id="ob-lastName" 
                  placeholder="González"
                  value={inputLastName}
                  onChange={(e) => setInputLastName(e.target.value)}
                  className="border-slate-200 focus:border-purple-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button 
                variant="outline"
                onClick={() => setIsStartingNew(false)}
              >
                Cancelar
              </Button>
              <Button 
                onClick={handleStartOnBehalf}
                disabled={checkingEmail}
                className="bg-purple-700 hover:bg-purple-800 text-white"
              >
                {checkingEmail ? "Verificando..." : "Comenzar Carga de Datos"}
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Active Application Wizard */}
      {activeApp && (
        <Card className="border-slate-200 shadow-lg bg-white overflow-hidden">
          <CardHeader className="bg-slate-900 text-white p-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-purple-500 text-white hover:bg-purple-500">
                    Por Cuenta y Orden
                  </Badge>
                  <span className="text-xs text-slate-300">
                    Email: <strong className="text-white">{activeApp.userEmail}</strong>
                  </span>
                </div>
                <CardTitle className="text-xl mt-1 text-white">
                  Carga: {activeApp.personalData.firstName || "Emprendedora"} {activeApp.personalData.lastName || ""}
                </CardTitle>
                <CardDescription className="text-slate-300 text-xs">
                  Gestor responsable: {activeApp.createdByName || "Administrador"}
                </CardDescription>
              </div>

              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setActiveApp(null)}
                className="bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Volver a la lista
              </Button>
            </div>

            {/* Step Selector */}
            <div className="grid grid-cols-5 gap-2 mt-6 pt-4 border-t border-slate-800">
              {[
                { step: 1, title: "1. Personales", icon: UserIcon },
                { step: 2, title: "2. Hogar", icon: Home },
                { step: 3, title: "3. Negocio", icon: Briefcase },
                { step: 4, title: "4. Préstamo", icon: DollarSign },
                { step: 5, title: "5. Revisión", icon: CheckCircle }
              ].map(s => (
                <button
                  key={s.step}
                  type="button"
                  onClick={() => {
                    setCurrentStep(s.step as LoanStep);
                    saveDraft(activeApp, s.step as LoanStep);
                  }}
                  className={`flex items-center justify-center gap-2 p-2 rounded-lg text-xs font-semibold transition-colors ${
                    currentStep === s.step 
                      ? "bg-purple-600 text-white" 
                      : currentStep > s.step 
                      ? "bg-slate-800 text-purple-300" 
                      : "bg-slate-800/50 text-slate-500"
                  }`}
                >
                  <s.icon className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{s.title}</span>
                </button>
              ))}
            </div>
          </CardHeader>

          <CardContent className="p-6">
            {currentStep === 1 && (
              <Step1PersonalData 
                data={activeApp.personalData}
                onChange={(newData) => {
                  const updated = { ...activeApp, personalData: newData };
                  setActiveApp(updated);
                  saveDraft(updated, 1);
                }}
                settings={settings}
              />
            )}

            {currentStep === 2 && (
              <Step2HouseholdFinance 
                data={activeApp.householdFinance}
                onChange={(newData) => {
                  const updated = { ...activeApp, householdFinance: newData };
                  setActiveApp(updated);
                  saveDraft(updated, 2);
                }}
              />
            )}

            {currentStep === 3 && (
              <Step3Entrepreneurship 
                data={activeApp.entrepreneurshipData}
                onChange={(newData) => {
                  const updated = { ...activeApp, entrepreneurshipData: newData };
                  setActiveApp(updated);
                  saveDraft(updated, 3);
                }}
                settings={settings}
              />
            )}

            {currentStep === 4 && (
              <Step4LoanDetails 
                data={activeApp.loanDetails}
                onChange={(newData) => {
                  const updated = { ...activeApp, loanDetails: newData };
                  setActiveApp(updated);
                  saveDraft(updated, 4);
                }}
                settings={settings}
              />
            )}

            {currentStep === 5 && (
              <div className="space-y-6">
                <Step5Disbursement 
                  data={activeApp.disbursementInfo}
                  onChange={(newData) => {
                    const updated = { ...activeApp, disbursementInfo: newData };
                    setActiveApp(updated);
                    saveDraft(updated, 5);
                  }}
                />

                {/* Summary Box */}
                <div className="p-4 bg-purple-50 border border-purple-200 rounded-xl space-y-3">
                  <div className="font-bold text-purple-900 text-sm flex items-center gap-2">
                    <UserCheck className="w-5 h-5 text-purple-700" />
                    Resumen de Carga por Cuenta y Orden
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-slate-700">
                    <div>
                      <strong>Emprendedora:</strong> {activeApp.personalData.firstName} {activeApp.personalData.lastName} ({activeApp.personalData.dni})
                    </div>
                    <div>
                      <strong>Correo Electrónico:</strong> {activeApp.userEmail}
                    </div>
                    <div>
                      <strong>Monto Solicitado:</strong> ${activeApp.loanDetails.requestedAmount?.toLocaleString('es-AR')} ({activeApp.loanDetails.installmentsCount} cuotas {activeApp.loanDetails.paymentFrequency === 'Weekly' ? 'semanales' : 'mensuales'})
                    </div>
                    <div>
                      <strong>Emprendimiento:</strong> {activeApp.entrepreneurshipData.name || "Sin nombre"} ({activeApp.entrepreneurshipData.activity})
                    </div>
                  </div>

                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <span>
                      <strong>Nota de Control Interno:</strong> Al enviar esta solicitud a revisión, figurará cargada por ti por cuenta y orden. Recuerda que la aprobación final debe ser ejecutada por otro administrador.
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Navigation controls */}
            <div className="flex justify-between items-center pt-6 mt-6 border-t border-slate-200">
              <Button
                variant="outline"
                disabled={currentStep === 1}
                onClick={() => {
                  const prev = (currentStep - 1) as LoanStep;
                  setCurrentStep(prev);
                  saveDraft(activeApp, prev);
                }}
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
                Anterior
              </Button>

              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    saveDraft(activeApp, currentStep);
                    toast.success("Borrador guardado exitosamente");
                  }}
                  className="border-purple-200 text-purple-700 hover:bg-purple-50"
                >
                  Guardar Borrador
                </Button>

                {currentStep < 5 ? (
                  <Button
                    onClick={() => {
                      const next = (currentStep + 1) as LoanStep;
                      setCurrentStep(next);
                      saveDraft(activeApp, next);
                    }}
                    className="bg-purple-700 hover:bg-purple-800 text-white"
                  >
                    Siguiente
                    <ChevronRight className="w-4 h-4 ml-2" />
                  </Button>
                ) : (
                  <Button
                    onClick={handleSubmitOnBehalf}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Enviar a Revisión
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Applications List */}
      {!activeApp && (
        <Card className="border-slate-200 shadow-md bg-white">
          <CardHeader className="py-4 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-slate-900 text-base">
                Solicitudes Cargadas por Cuenta y Orden ({applications.length})
              </CardTitle>
              <CardDescription className="text-xs">
                Lista de solicitudes que has registrado a nombre de distintas emprendedoras.
              </CardDescription>
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input 
                placeholder="Buscar por emprendedora, DNI o email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-9 border-slate-200 text-xs"
              />
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="font-semibold text-slate-700">Emprendedora</TableHead>
                  <TableHead className="font-semibold text-slate-700">Monto / Cuotas</TableHead>
                  <TableHead className="font-semibold text-slate-700">Estado</TableHead>
                  <TableHead className="font-semibold text-slate-700">Fecha Carga</TableHead>
                  <TableHead className="font-semibold text-slate-700 text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-12 text-slate-400">
                      Cargando solicitudes por cuenta y orden...
                    </TableCell>
                  </TableRow>
                ) : filteredApps.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-12 text-slate-400">
                      No hay solicitudes cargadas por cuenta y orden. Haz clic en "Nueva Solicitud x Cuenta y Orden" para comenzar.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredApps.map((app) => (
                    <TableRow key={app.id} className="hover:bg-slate-50 transition-colors">
                      <TableCell>
                        <div className="font-medium text-slate-900">
                          {app.personalData?.firstName} {app.personalData?.lastName || ""}
                        </div>
                        <div className="text-xs text-slate-500">{app.userEmail}</div>
                        {app.personalData?.dni && (
                          <div className="text-[11px] text-slate-400">DNI: {app.personalData.dni}</div>
                        )}
                      </TableCell>

                      <TableCell>
                        <div className="font-semibold text-slate-900">
                          ${app.loanDetails?.requestedAmount?.toLocaleString('es-AR') || '0'}
                        </div>
                        <div className="text-xs text-slate-500">
                          {app.loanDetails?.installmentsCount} cuotas ({app.loanDetails?.paymentFrequency === 'Weekly' ? 'Semanales' : 'Mensuales'})
                        </div>
                      </TableCell>

                      <TableCell>
                        {app.status === 'Draft' && (
                          <Badge variant="outline" className="text-slate-600 border-slate-300">
                            <Clock className="w-3 h-3 mr-1" />
                            Borrador
                          </Badge>
                        )}
                        {app.status === 'Pending' && (
                          <Badge className="bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-100">
                            <Clock className="w-3 h-3 mr-1 animate-pulse" />
                            Pendiente Revisión
                          </Badge>
                        )}
                        {app.status === 'Approved' && (
                          <Badge className="bg-green-100 text-green-800 border-green-200 hover:bg-green-100">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Aprobado
                          </Badge>
                        )}
                        {app.status === 'Active' && (
                          <Badge className="bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-100">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Activo / Desembolsado
                          </Badge>
                        )}
                      </TableCell>

                      <TableCell className="text-xs text-slate-500">
                        {new Date(app.createdAt || Date.now()).toLocaleDateString('es-AR')}
                      </TableCell>

                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant={app.status === 'Draft' ? "default" : "outline"}
                            size="sm"
                            onClick={() => {
                              setActiveApp(app);
                              setCurrentStep(app.step || 1);
                            }}
                            className={app.status === 'Draft' ? "bg-purple-700 hover:bg-purple-800 text-white" : "border-slate-200"}
                          >
                            <Edit3 className="w-3.5 h-3.5 mr-1" />
                            {app.status === 'Draft' ? "Continuar Carga" : "Ver Detalle"}
                          </Button>

                          {app.status === 'Draft' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteDraft(app.id)}
                              className="text-red-500 hover:text-red-700 hover:bg-red-50"
                              title="Eliminar borrador"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
