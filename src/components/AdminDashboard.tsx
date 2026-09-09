import React, { useState, useEffect, useMemo } from "react";
import { 
  collection, 
  onSnapshot, 
  query, 
  orderBy, 
  doc, 
  addDoc,
  deleteDoc,
  updateDoc,
  setDoc,
  deleteField
} from "firebase/firestore";
import { db, auth } from "../firebase";
import { compressForUpload, getUploadSignature, uploadToCloudinary } from "../lib/cloudinaryUpload";
import { LoanApplication } from "../types";
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
import { 
  Eye, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Search,
  Filter,
  ExternalLink,
  Upload,
  DollarSign,
  Calendar,
  Check,
  FileText,
  User as UserIcon,
  Briefcase,
  Settings,
  Database,
  Trash2,
  AlertTriangle,
  UserPlus,
  ArrowRight,
  ArrowLeft,
  History,
  ChevronUp,
  ChevronDown,
  ArrowUpDown,
  Download,
  Calculator,
  Landmark,
  CreditCard,
  MessageSquare,
  Save
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { 
  Installment, 
  PaymentSchedule, 
  ScoringEvaluation,
  AppSettings
} from "../types";
import { DEFAULT_SETTINGS } from "../lib/defaultSettings";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import SettingsManager from "./SettingsManager";
import ScoringManager from "./ScoringManager";
import { generateMutuoPdf } from "../utils/generateMutuoPdf";

import { handleFirestoreError, OperationType } from "../lib/firestoreErrorHandler";

export default function AdminDashboard({ defaultTab = "applications" }: { defaultTab?: string }) {
  const [applications, setApplications] = useState<LoanApplication[]>([]);
  const [evaluations, setEvaluations] = useState<ScoringEvaluation[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [collectionSearch, setCollectionSearch] = useState("");
  const [selectedApp, setSelectedApp] = useState<LoanApplication | null>(null);
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [scoringAppId, setScoringAppId] = useState<string | undefined>();
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedDeleteIds, setSelectedDeleteIds] = useState<string[]>([]);
  const [showMultiDeleteConfirm, setShowMultiDeleteConfirm] = useState(false);
  const [deletingAppIds, setDeletingAppIds] = useState<string[]>([]);
  const [adminCommentInput, setAdminCommentInput] = useState<string>("");
  const [isSavingComment, setIsSavingComment] = useState<boolean>(false);
  const [statusConfirmAction, setStatusConfirmAction] = useState<{
    type: 'Approved' | 'Rejected';
    appId: string;
    appName: string;
    amount?: number;
  } | null>(null);

  useEffect(() => {
    if (selectedApp) {
      setAdminCommentInput(selectedApp.adminComments || "");
    } else {
      setAdminCommentInput("");
    }
  }, [selectedApp?.id]);

  type SortKey = 'loanNumber' | 'name' | 'amount' | 'scoring' | 'date' | 'status';
  const [sortField, setSortField] = useState<SortKey>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const handleSort = (field: SortKey) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection(field === 'name' || field === 'status' ? 'asc' : 'desc');
    }
  };

  const renderTableHead = (label: string, field: SortKey, alignment: 'left' | 'center' | 'right' = 'left') => {
    const isActive = sortField === field;
    return (
      <TableHead 
        className={`whitespace-nowrap cursor-pointer select-none hover:bg-slate-50 transition-colors py-3 px-4 ${
          alignment === 'center' ? 'text-center' : alignment === 'right' ? 'text-right' : ''
        }`}
        onClick={() => handleSort(field)}
      >
        <div className={`flex items-center gap-1.5 ${
          alignment === 'center' ? 'justify-center' : alignment === 'right' ? 'justify-end' : 'justify-start'
        }`}>
          <span className={`font-semibold ${isActive ? "text-slate-900 font-bold" : "text-slate-500"}`}>
            {label}
          </span>
          {isActive ? (
            sortDirection === 'asc' ? (
              <ChevronUp className="w-4 h-4 text-slate-800" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-800" />
            )
          ) : (
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-350 opacity-40 hover:opacity-100 transition-opacity" />
          )}
        </div>
      </TableHead>
    );
  };

  type CollectionSortKey = 'loanNumber' | 'name' | 'installment' | 'amount' | 'dueDate' | 'status';
  const [collectionSortField, setCollectionSortField] = useState<CollectionSortKey>('dueDate');
  const [collectionSortDirection, setCollectionSortDirection] = useState<'asc' | 'desc'>('asc');

  const handleCollectionSort = (field: CollectionSortKey) => {
    if (collectionSortField === field) {
      setCollectionSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setCollectionSortField(field);
      setCollectionSortDirection(field === 'name' ? 'asc' : 'asc');
    }
  };

  const renderCollectionTableHead = (label: string, field: CollectionSortKey, alignment: 'left' | 'center' | 'right' = 'left') => {
    const isActive = collectionSortField === field;
    return (
      <TableHead 
        className={`whitespace-nowrap cursor-pointer select-none hover:bg-slate-100 transition-colors py-3 px-4 ${
          alignment === 'center' ? 'text-center' : alignment === 'right' ? 'text-right' : ''
        }`}
        onClick={() => handleCollectionSort(field)}
      >
        <div className={`flex items-center gap-1.5 ${
          alignment === 'center' ? 'justify-center' : alignment === 'right' ? 'justify-end' : 'justify-start'
        }`}>
          <span className={`font-semibold ${isActive ? "text-slate-900 font-bold" : "text-slate-500"}`}>
            {label}
          </span>
          {isActive ? (
            collectionSortDirection === 'asc' ? (
              <ChevronUp className="w-4 h-4 text-slate-800" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-800" />
            )
          ) : (
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-350 opacity-40 hover:opacity-100 transition-opacity" />
          )}
        </div>
      </TableHead>
    );
  };

  useEffect(() => {
    const qApps = query(collection(db, "applications"), orderBy("updatedAt", "desc"));
    const unsubApps = onSnapshot(qApps, (snapshot) => {
      const apps = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as LoanApplication));
      setApplications(apps);
      setLoading(false);
    }, (error) => {
      setLoading(false);
      handleFirestoreError(error, OperationType.LIST, "applications");
    });

    const qEvals = query(collection(db, "scoring_evaluations"), orderBy("date", "desc"));
    const unsubEvals = onSnapshot(qEvals, (snapshot) => {
      const evals = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as ScoringEvaluation));
      setEvaluations(evals);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "scoring_evaluations");
    });

    const unsubSettings = onSnapshot(doc(db, "config", "settings"), (docSnap) => {
      if (docSnap.exists()) {
        setSettings({ ...DEFAULT_SETTINGS, ...docSnap.data() } as AppSettings);
      }
    });

    return () => {
      unsubApps();
      unsubEvals();
      unsubSettings();
    };
  }, []);

  // Auto-fill/validate sequential loanNumber for existing non-draft applications on mount / updates
  useEffect(() => {
    const activeApps = applications.filter(app => !deletingAppIds.includes(app.id));
    if (loading || activeApps.length === 0) return;

    const isNotFoundError = (err: any): boolean => {
      if (!err) return false;
      const errMsg = String(err.message || err).toLowerCase();
      return (
        err.code === 'not-found' ||
        err.code === 5 ||
        errMsg.includes('not-found') ||
        errMsg.includes('not found') ||
        errMsg.includes('no document to update')
      );
    };
    
    // 1. Clean up any drafts that mistakenly have a loanNumber
    const draftsWithNumber = activeApps.filter(app => app.status === "Draft" && app.loanNumber !== undefined);
    if (draftsWithNumber.length > 0) {
      const cleanDrafts = async () => {
        for (const app of draftsWithNumber) {
          try {
            await updateDoc(doc(db, "applications", app.id), {
              loanNumber: deleteField()
            });
          } catch (err: any) {
            if (isNotFoundError(err)) {
              console.warn(`Could not remove loanNumber from draft app ${app.id} because it was not found in Firestore (likely deleted):`, err.message || err);
            } else {
              console.error(`Failed to remove incorrect loanNumber from draft app ${app.id}:`, err);
            }
          }
        }
      };
      cleanDrafts();
    }

    // 2. Assign unique sequential loan numbers ONLY to submitted apps that do not have one yet.
    // Existing assigned loanNumbers are permanent and NEVER modified or renumbered.
    const submittedApps = activeApps.filter(app => app.status !== "Draft");
    const sortedSubmitted = [...submittedApps].sort((a, b) => 
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
    const missingNumberApps = sortedSubmitted.filter(app => app.loanNumber === undefined || app.loanNumber === null);
    
    if (missingNumberApps.length > 0) {
      const assignMissingNumbers = async () => {
        let maxNumber = settings.lastAssignedLoanNumber || 0;
        activeApps.forEach(app => {
          if (typeof app.loanNumber === 'number' && app.loanNumber > maxNumber) {
            maxNumber = app.loanNumber;
          }
        });

        for (const app of missingNumberApps) {
          maxNumber += 1;
          try {
            await updateDoc(doc(db, "applications", app.id), {
              loanNumber: maxNumber
            });
          } catch (err: any) {
            if (isNotFoundError(err)) {
              console.warn(`Could not assign loan number to app ${app.id} because it was not found in Firestore (likely deleted):`, err.message || err);
            } else {
              console.error(`Failed to assign loan number to app ${app.id}:`, err);
            }
          }
        }

        try {
          await setDoc(doc(db, "config", "settings"), {
            lastAssignedLoanNumber: maxNumber
          }, { merge: true });
        } catch (err) {
          console.error("Error updating lastAssignedLoanNumber in settings:", err);
        }
      };
      assignMissingNumbers();
    }
  }, [loading, applications, deletingAppIds, settings]);

  const navigateToScoring = (appId: string) => {
    setScoringAppId(appId);
    setActiveTab("scoring");
  };

  const getScoringData = (appId: string) => {
    return evaluations.find(e => e.applicationId === appId);
  };

  const deleteApplicationAndData = async (appId: string) => {
    setDeletingAppIds(prev => [...prev, appId]);
    try {
      // 1. Delete matching scoring evaluations
      const relatedEvals = evaluations.filter(e => e.applicationId === appId);
      for (const evalDoc of relatedEvals) {
        try {
          await deleteDoc(doc(db, "scoring_evaluations", evalDoc.id));
        } catch (error) {
          handleFirestoreError(error, OperationType.DELETE, `scoring_evaluations/${evalDoc.id}`);
        }
      }

      // 2. Delete the application document itself
      try {
        await deleteDoc(doc(db, "applications", appId));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `applications/${appId}`);
      }

      toast.success("La solicitud en borrador y todos sus datos han sido eliminados correctamente.");
      setConfirmDeleteId(null);
      if (selectedApp?.id === appId) {
        setSelectedApp(null);
      }
    } catch (error) {
      console.error("Error deleting application:", error);
      toast.error("Error al eliminar la solicitud. Por favor, intenta de nuevo.");
    } finally {
      setDeletingAppIds(prev => prev.filter(id => id !== appId));
    }
  };

  const handleSaveComment = async () => {
    if (!selectedApp) return;
    setIsSavingComment(true);
    try {
      const updateData = {
        adminComments: adminCommentInput,
        updatedAt: new Date().toISOString()
      };
      await updateDoc(doc(db, "applications", selectedApp.id), updateData);
      setSelectedApp({ ...selectedApp, ...updateData });
      toast.success("Comentario guardado exitosamente");
    } catch (error) {
      console.error("Error al guardar comentario:", error);
      toast.error("Error al guardar el comentario.");
    } finally {
      setIsSavingComment(false);
    }
  };

  const updateStatus = async (id: string, newStatus: LoanApplication['status']) => {
    const currentApp = applications.find(a => a.id === id);
    if (!currentApp) return;

    if (newStatus === 'Rejected' && (currentApp.status === 'Active' || currentApp.status === 'Paid')) {
      toast.error("No se puede rechazar un préstamo que está Activo o Pagado.");
      return;
    }

    // Validation for approval
    if (newStatus === 'Approved') {
      const scoring = getScoringData(id);
      if (!scoring) {
        toast.error("Scoring Requerido", {
          description: "La solicitud debe tener un scoring completado antes de ser aprobada.",
          action: {
            label: "Ir a Scoring",
            onClick: () => navigateToScoring(id)
          }
        });
        return;
      }
      if (scoring.status === 'DESAPROBADO') {
        toast.error("Scoring Insuficiente", {
          description: `La emprendedora alcanzó ${scoring.totalScore} puntos, lo cual es menor al mínimo requerido.`
        });
        return;
      }
    }

    try {
      const updateData: any = {
        status: newStatus,
        updatedAt: new Date().toISOString()
      };
      if (adminCommentInput) {
        updateData.adminComments = adminCommentInput;
      }
      if (newStatus === 'Approved') {
        updateData.approvedAt = new Date().toISOString();
      } else if (newStatus === 'Rejected') {
        updateData.rejectedAt = new Date().toISOString();
      }
      await updateDoc(doc(db, "applications", id), updateData);
      if (selectedApp?.id === id) {
        setSelectedApp({ ...selectedApp, ...updateData });
      }
      toast.success(`Solicitud ${newStatus === 'Approved' ? 'Aprobada' : newStatus === 'Rejected' ? 'Rechazada' : 'actualizada'}`);
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("Error al actualizar el estado. Por favor, intenta de nuevo.");
    }
  };

  const handleDownloadMutuo = async (app: LoanApplication) => {
    try {
      const pdf = generateMutuoPdf(app, settings);
      const lastName = app.personalData?.lastName?.trim() || "Emprendedora";
      const firstName = app.personalData?.firstName?.trim() || "";
      const fileName = `Contrato_Mutuo_${lastName}_${firstName}.pdf`.replace(/\s+/g, '_');
      pdf.save(fileName);

      const now = new Date().toISOString();
      if (!app.mutuoGeneratedAt) {
        await updateDoc(doc(db, "applications", app.id), {
          mutuoGeneratedAt: now
        });
        if (selectedApp && selectedApp.id === app.id) {
          setSelectedApp({ ...selectedApp, mutuoGeneratedAt: now });
        }
      }
      toast.success("Contrato de Mutuo descargado correctamente.");
    } catch (error) {
      console.error("Error al generar el Mutuo:", error);
      toast.error("Error al generar el PDF del Mutuo.");
    }
  };

  const handleDisburse = async (app: LoanApplication) => {
    // If mutuo hasn't been generated manually yet, generate and download it now automatically
    if (!app.mutuoGeneratedAt) {
      await handleDownloadMutuo(app);
    }

    const installmentsCount = app.loanDetails.installmentsCount || 6;
    const frequency = app.loanDetails.paymentFrequency || 'Monthly';
    const creditType = app.loanDetails.creditType;
    const selectedProduct = settings.loanProducts?.find(
      p => p.name.trim().toLowerCase() === creditType?.trim().toLowerCase()
    );
    const rawRate = selectedProduct?.interestRate ?? 48;
    const annualRatePercent = rawRate <= 2 ? rawRate * 1200 : rawRate;
    const baseMonthlyRate = (annualRatePercent / 100) / 12;
    const rate = frequency === 'Weekly' ? baseMonthlyRate / 4 : baseMonthlyRate;
    const amount = app.loanDetails.requestedAmount;
    
    // Formula for amortized payment
    const installmentAmount = Math.round((amount * rate * Math.pow(1 + rate, installmentsCount)) / (Math.pow(1 + rate, installmentsCount) - 1));
    
    const installments: Installment[] = [];
    const now = new Date();
    
    for (let i = 1; i <= installmentsCount; i++) {
      const dueDate = new Date(now);
      if (frequency === 'Weekly') {
        dueDate.setDate(now.getDate() + (i * 7));
      } else {
        dueDate.setMonth(now.getMonth() + i);
      }
      
      installments.push({
        number: i,
        dueDate: dueDate.toISOString(),
        amount: installmentAmount,
        status: 'Pending'
      });
    }

    const schedule: PaymentSchedule = {
      installments,
      totalAmount: installmentAmount * installmentsCount,
      interestRate: rate,
      startDate: now.toISOString()
    };

    try {
      const updatedAt = new Date().toISOString();
      const approvedAt = app.approvedAt || new Date().toISOString();
      const updatedApp = {
        ...app,
        status: 'Active' as const,
        paymentSchedule: schedule,
        updatedAt: updatedAt,
        approvedAt: approvedAt,
        mutuoGeneratedAt: app.mutuoGeneratedAt || updatedAt
      };

      await updateDoc(doc(db, "applications", app.id), {
        status: 'Active',
        paymentSchedule: schedule,
        updatedAt: updatedAt,
        approvedAt: approvedAt,
        mutuoGeneratedAt: app.mutuoGeneratedAt || updatedAt
      });

      if (selectedApp?.id === app.id) {
        setSelectedApp(updatedApp);
      }
      toast.success("Desembolso confirmado. El préstamo pasa a estar Activo.");
    } catch (error) {
      console.error("Disbursement failed:", error);
      toast.error("Error al confirmar el desembolso. Por favor, intenta de nuevo.");
    }
  };

  const validatePayment = async (app: LoanApplication, installmentNumber: number, approve: boolean) => {
    if (!app.paymentSchedule) return;

    const updatedInstallments = app.paymentSchedule.installments.map(inst => {
      if (inst.number === installmentNumber) {
        return { 
          ...inst, 
          status: approve ? 'Paid' as const : 'Pending' as const,
          paymentDate: approve ? new Date().toISOString() : undefined,
          paymentProofUrl: approve ? inst.paymentProofUrl : undefined // Clear if rejected
        };
      }
      return inst;
    });

    // Check if all paid
    const allPaid = updatedInstallments.every(i => i.status === 'Paid');

    try {
      const updatedAt = new Date().toISOString();
      const newStatus = allPaid ? 'Paid' as const : 'Active' as const;

      await updateDoc(doc(db, "applications", app.id), {
        "paymentSchedule.installments": updatedInstallments,
        status: newStatus,
        updatedAt: updatedAt
      });

      if (selectedApp?.id === app.id) {
        setSelectedApp({ 
          ...selectedApp, 
          status: newStatus,
          updatedAt: updatedAt,
          paymentSchedule: { ...app.paymentSchedule, installments: updatedInstallments } 
        });
      }
    } catch (error) {
      console.error("Payment validation failed:", error);
      toast.error("Error al validar el pago. Por favor, intenta de nuevo.");
    }
  };

  const handleAdminUpload = async (e: React.ChangeEvent<HTMLInputElement>, app: LoanApplication, installmentNumber: number) => {
    const file = e.target.files?.[0];
    if (!file || !app.paymentSchedule) return;

    try {
      const folder = `payments/${app.id}`;
      const fileNameBase = `installment_${installmentNumber}`;

      // Compress and fetch the upload signature in parallel (independent work)
      const [base64String, signature] = await Promise.all([
        compressForUpload(file),
        getUploadSignature(folder, fileNameBase),
      ]);

      toast.loading("Subiendo comprobante...", { id: "upload-toast" });

      const url = await uploadToCloudinary(base64String, folder, signature);

      const updatedInstallments = app.paymentSchedule.installments.map(inst =>
        inst.number === installmentNumber ? { ...inst, paymentProofUrl: url, status: 'Pending' as const } : inst
      );

      const updatedAt = new Date().toISOString();
      await updateDoc(doc(db, "applications", app.id), {
        "paymentSchedule.installments": updatedInstallments,
        updatedAt: updatedAt
      });

      if (selectedApp?.id === app.id) {
        setSelectedApp({
          ...selectedApp,
          paymentSchedule: {
            ...selectedApp.paymentSchedule!,
            installments: updatedInstallments
          },
          updatedAt: updatedAt
        });
      }
      
      toast.success("Comprobante subido correctamente", { id: "upload-toast" });
    } catch (error: any) {
      console.error("Upload failed:", error);
      toast.error(`Error al subir el comprobante: ${error.message || "Intenta de nuevo."}`, { id: "upload-toast" });
    }
  };

  const loadDemoData = async () => {
    const demoApps = [
      {
        userId: "demo-user-1",
        userEmail: "ana.garcia@example.com",
        status: 'Pending',
        step: 5,
        personalData: {
          firstName: "Ana",
          lastName: "García",
          cuil: "27-30123456-9",
          birthDate: "1985-05-15",
          phone: "11 4455-6677",
          address: "Av. Rivadavia 1234",
          neighborhood: "Caballito",
          civilStatus: "Soltera",
          educationLevel: "Secundario Completo",
          householdSize: 3
      },
      householdFinance: {
        fixedIncome: 300000,
        variableIncome: 150000,
        expenseFoodRent: 200000,
        expenseServices: 50000
      },
      entrepreneurshipData: {
        name: "Tortas Ana",
        activity: "Pastelería",
        seniority: "2 años",
        description: "Venta de tortas artesanales y servicios de catering para eventos pequeños.",
        type: 'Productivo',
        salesPlace: "Redes sociales",
        weeklyInputCost: 15000,
        weeklyProductionQty: 20,
        unitProductionCost: 2500
      },
        loanDetails: {
          creditType: "Microcrédito Individual",
          requestedAmount: 150000,
          paymentFrequency: "Monthly",
          installmentsCount: 6,
          justification: "Compra de horno industrial para expandir producción.",
        },
        disbursementInfo: {
          bankOrWallet: "Mercado Pago",
          accountHolder: "Ana García",
          alias: "ana.tortas.mp"
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        userId: "demo-user-2",
        userEmail: "ariel.perez@example.com",
        status: 'Active',
        step: 5,
        personalData: {
          firstName: "Ariel",
          lastName: "Perez",
          cuil: "20-25123456-2",
          birthDate: "1990-03-10",
          phone: "11 2233-4455",
          address: "Calle Falsa 123",
          neighborhood: "Palermo",
          civilStatus: "Casado",
          educationLevel: "Terciario",
          householdSize: 4
      },
      householdFinance: {
        fixedIncome: 400000,
        variableIncome: 200000,
        expenseFoodRent: 300000,
        expenseServices: 80000
      },
      entrepreneurshipData: {
        name: "Ariel Carpintería",
        activity: "Carpintería",
        seniority: "3 años",
        description: "Taller familiar de carpintería a medida. Realizamos muebles y arreglos en el hogar.",
        type: 'Productivo',
        salesPlace: "Local",
        weeklyInputCost: 12000,
        weeklyProductionQty: 15,
        unitProductionCost: 3000
      },
        loanDetails: {
          creditType: "Microcrédito Individual",
          requestedAmount: 180000,
          paymentFrequency: "Monthly",
          installmentsCount: 6,
          justification: "Herramientas nuevas de carpintería.",
        },
        disbursementInfo: {
          bankOrWallet: "Banco Nación",
          accountHolder: "Ariel Perez",
          alias: "ariel.carpinteria.bn"
        },
        paymentSchedule: {
          installments: [
            { number: 1, dueDate: new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString(), amount: 35000, status: 'Paid', paymentDate: new Date().toISOString() },
            { number: 2, dueDate: new Date().toISOString(), amount: 35000, status: 'Pending' },
            { number: 3, dueDate: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString(), amount: 35000, status: 'Pending' },
            { number: 4, dueDate: new Date(new Date().setMonth(new Date().getMonth() + 2)).toISOString(), amount: 35000, status: 'Pending' },
            { number: 5, dueDate: new Date(new Date().setMonth(new Date().getMonth() + 3)).toISOString(), amount: 35000, status: 'Pending' },
            { number: 6, dueDate: new Date(new Date().setMonth(new Date().getMonth() + 4)).toISOString(), amount: 35000, status: 'Pending' }
          ],
          totalAmount: 210000,
          interestRate: 5,
          startDate: new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString()
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        userId: "demo-user-3",
        userEmail: "carla.rodriguez@example.com",
        status: 'Active',
        step: 5,
        personalData: {
          firstName: "Carla",
          lastName: "Rodríguez",
          cuil: "27-28123456-5",
          birthDate: "1988-11-25",
          phone: "11 9988-7766",
          address: "Av. Santa Fe 4567",
          neighborhood: "Belgrano",
          civilStatus: "Divorciada",
          educationLevel: "Universitario",
        householdSize: 2
    },
    householdFinance: {
      fixedIncome: 350000,
      variableIncome: 200000,
      expenseFoodRent: 250000,
      expenseServices: 60000
    },
    entrepreneurshipData: {
      name: "Carla Estética",
      activity: "Peluquería y Estética",
      seniority: "4 años",
      description: "Servicios integrales de peluquería, manicuría y estética a domicilio.",
      type: 'Servicios',
      salesPlace: "Boca en boca",
    },
        loanDetails: {
          creditType: "Microcrédito Individual",
          requestedAmount: 250000,
          paymentFrequency: "Monthly",
          installmentsCount: 6,
          justification: "Insumos de estética y camilla nueva.",
        },
        disbursementInfo: {
          bankOrWallet: "Ualá",
          accountHolder: "Carla Rodríguez",
          alias: "carla.estetica.uala"
        },
        paymentSchedule: {
          installments: [
            { number: 1, dueDate: new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString(), amount: 48500, status: 'Paid', paymentDate: new Date().toISOString() },
            { number: 2, dueDate: new Date().toISOString(), amount: 48500, status: 'Pending' },
            { number: 3, dueDate: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString(), amount: 48500, status: 'Pending' },
            { number: 4, dueDate: new Date(new Date().setMonth(new Date().getMonth() + 2)).toISOString(), amount: 48500, status: 'Pending' },
            { number: 5, dueDate: new Date(new Date().setMonth(new Date().getMonth() + 3)).toISOString(), amount: 48500, status: 'Pending' },
            { number: 6, dueDate: new Date(new Date().setMonth(new Date().getMonth() + 4)).toISOString(), amount: 48500, status: 'Pending' }
          ],
          totalAmount: 291000,
          interestRate: 5,
          startDate: new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString()
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];

    try {
      for (const app of demoApps) {
        const id = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2) + Date.now().toString(36);
        await addDoc(collection(db, "applications"), { ...app, id });
      }
      toast.success("¡Datos de demo cargados con éxito!");
    } catch (error) {
      console.error("Error loading demo data:", error);
      toast.error("Error al cargar datos de demo.");
    }
  };

  const deleteMultipleApplicationsAndData = async (ids: string[]) => {
    setDeletingAppIds(prev => [...prev, ...ids]);
    try {
      let deletedCount = 0;
      for (const appId of ids) {
        // 1. Delete matching scoring evaluations
        const relatedEvals = evaluations.filter(e => e.applicationId === appId);
        for (const evalDoc of relatedEvals) {
          try {
            await deleteDoc(doc(db, "scoring_evaluations", evalDoc.id));
          } catch (error) {
            handleFirestoreError(error, OperationType.DELETE, `scoring_evaluations/${evalDoc.id}`);
          }
        }

        // 2. Delete the application document itself
        try {
          await deleteDoc(doc(db, "applications", appId));
          deletedCount++;
        } catch (error) {
          handleFirestoreError(error, OperationType.DELETE, `applications/${appId}`);
        }

        if (selectedApp?.id === appId) {
          setSelectedApp(null);
        }
      }
      toast.success(`Se eliminaron correctamente ${deletedCount} préstamos y sus datos asociados.`);
    } catch (error) {
      console.error("Error deleting multiple applications:", error);
      toast.error("Error al eliminar los préstamos seleccionados.");
    } finally {
      setDeletingAppIds(prev => prev.filter(id => !ids.includes(id)));
    }
  };

  const clearDemoData = async () => {
    if (!isSelectionMode) {
      setIsSelectionMode(true);
      setSelectedDeleteIds([]);
      toast.info("Modo de selección activado. Selecciona los préstamos a eliminar o usa 'Seleccionar Todo'.");
    } else {
      if (selectedDeleteIds.length === 0) {
        toast.warning("Por favor, selecciona al menos un préstamo para eliminar.");
        return;
      }
      setShowMultiDeleteConfirm(true);
    }
  };

  const selectAllApplications = () => {
    if (selectedDeleteIds.length === applications.length) {
      setSelectedDeleteIds([]);
    } else {
      setSelectedDeleteIds(applications.map(app => app.id));
    }
  };

  const renumberAllApplications = async () => {
    try {
      if (applications.length === 0) {
        toast.info("No hay solicitudes en la base de datos para numerar.");
        return;
      }

      const isNotFoundError = (err: any): boolean => {
        if (!err) return false;
        const errMsg = String(err.message || err).toLowerCase();
        return (
          err.code === 'not-found' ||
          err.code === 5 ||
          errMsg.includes('not-found') ||
          errMsg.includes('not found') ||
          errMsg.includes('no document to update')
        );
      };
      
      // Clean drafts with numbers
      const draftsWithNumber = applications.filter(app => app.status === "Draft" && app.loanNumber !== undefined);
      for (const app of draftsWithNumber) {
        try {
          await updateDoc(doc(db, "applications", app.id), {
            loanNumber: deleteField()
          });
        } catch (err: any) {
          if (isNotFoundError(err)) {
            console.warn(`Could not remove loanNumber from draft app ${app.id} during manual renumbering because it was not found:`, err.message || err);
          } else {
            console.error(`Failed to remove incorrect loanNumber from draft: ${app.id}`, err);
          }
        }
      }

      const submittedApps = applications.filter(app => app.status !== "Draft");
      const sorted = [...submittedApps].sort((a, b) => 
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
      
      let updatedCount = 0;
      for (let i = 0; i < sorted.length; i++) {
        const app = sorted[i];
        const correctNumber = i + 1;
        if (app.loanNumber !== correctNumber) {
          try {
            await updateDoc(doc(db, "applications", app.id), {
              loanNumber: correctNumber
            });
            updatedCount++;
          } catch (err: any) {
            if (isNotFoundError(err)) {
              console.warn(`Could not assign correct loan number to app ${app.id} during manual renumbering because it was not found:`, err.message || err);
            } else {
              console.error(`Failed to assign correct loan number to app ${app.id}:`, err);
              throw err;
            }
          }
        }
      }
      
      if (updatedCount > 0) {
        toast.success(`Se numeraron exitosamente ${updatedCount} solicitudes en orden cronológico.`);
      } else {
        toast.success("Todas las solicitudes ya cuentan con su número único secuencial de manera correcta.");
      }
    } catch (error) {
      console.error("Error renumbering applications:", error);
      toast.error("Error al reordenar y numerar las solicitudes.");
    }
  };

  const handleExportToCSV = () => {
    try {
      if (!applications || applications.length === 0) {
        toast.error("No hay solicitudes disponibles para exportar.");
        return;
      }

      const headers = [
        "Nº Préstamo",
        "Estado",
        "Apellido",
        "Nombre",
        "Email",
        "DNI / CUIL",
        "Teléfono",
        "Dirección",
        "Barrio",
        "Emprendimiento",
        "Actividad",
        "Lugar de Venta",
        "Tipo de Crédito",
        "Monto Solicitado",
        "Frecuencia de Pago",
        "Cuotas",
        "Justificación",
        "Titular Cuenta",
        "Banco/Billetera",
        "Alias / CBU",
        "Scoring",
        "Fecha Creación",
        "Fecha Aprobación"
      ];

      const rows = applications.map(app => {
        const evaluation = evaluations?.find(e => e.applicationId === app.id);
        const scoringStr = evaluation ? `${evaluation.totalScore} pts` : "Pendiente";
        
        const statusLabels: Record<string, string> = {
          Approved: 'Aprobado',
          Rejected: 'Rechazado',
          Pending: 'Pendiente',
          Active: 'Activo',
          Paid: 'Pagado',
          Draft: 'Borrador'
        };
        const statusStr = statusLabels[app.status] || app.status || '';

        // Formato con puntos de miles (es-AR)
        const formattedAmount = app.loanDetails?.requestedAmount !== undefined && app.loanDetails?.requestedAmount !== null
          ? `$${app.loanDetails.requestedAmount.toLocaleString('es-AR')}`
          : '$0';

        const createdDate = app.createdAt ? new Date(app.createdAt).toLocaleDateString('es-AR') : '-';
        const approvedAtVal = app.approvedAt || app.paymentSchedule?.startDate || app.updatedAt || app.createdAt;
        const approvedDate = (app.status === 'Approved' || app.status === 'Active' || app.status === 'Paid') && approvedAtVal
          ? new Date(approvedAtVal).toLocaleDateString('es-AR')
          : '-';

        const freqLabels: Record<string, string> = {
          Weekly: 'Semanal',
          Monthly: 'Mensual'
        };
        const freqStr = app.loanDetails?.paymentFrequency ? (freqLabels[app.loanDetails.paymentFrequency] || app.loanDetails.paymentFrequency) : '-';

        return [
          app.loanNumber ? `#${app.loanNumber}` : 'Borrador',
          statusStr,
          app.personalData?.lastName || '',
          app.personalData?.firstName || '',
          app.userEmail || '',
          app.personalData?.dni || app.personalData?.cuil || '',
          app.personalData?.phone || '',
          app.personalData?.address || '',
          app.personalData?.neighborhood || '',
          app.entrepreneurshipData?.name || '',
          app.entrepreneurshipData?.activity || '',
          app.entrepreneurshipData?.salesPlace || '',
          app.loanDetails?.creditType || '',
          formattedAmount,
          freqStr,
          app.loanDetails?.installmentsCount || '',
          app.loanDetails?.justification || '',
          app.disbursementInfo?.accountHolder || '',
          app.disbursementInfo?.bankOrWallet || '',
          app.disbursementInfo?.alias || '',
          scoringStr,
          createdDate,
          approvedDate
        ];
      });

      const csvContent = [
        headers.map(h => `"${h.replace(/"/g, '""')}"`).join(","),
        ...rows.map(row => row.map(val => {
          const valStr = val === undefined || val === null ? "" : String(val);
          return `"${valStr.replace(/"/g, '""')}"`;
        }).join(","))
      ].join("\n");

      // Incluimos BOM para asegurar UTF-8 en Excel
      const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `solicitudes_mujeres2000_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success("Tabla de solicitudes exportada a CSV correctamente.");
    } catch (e) {
      console.error("Error al exportar a CSV:", e);
      toast.error("Ocurrió un error al exportar la tabla a CSV.");
    }
  };

  const filteredApps = applications.filter(app => {
    const loanNumStr = app.loanNumber ? String(app.loanNumber) : '';
    const matchTerm = searchTerm.toLowerCase().trim();
    const termClean = matchTerm.startsWith('#') ? matchTerm.substring(1) : matchTerm;
    
    return (
      app.userEmail.toLowerCase().includes(matchTerm) ||
      app.personalData.lastName.toLowerCase().includes(matchTerm) ||
      app.personalData.firstName.toLowerCase().includes(matchTerm) ||
      (loanNumStr && (loanNumStr === termClean || loanNumStr.includes(termClean)))
    );
  });

  const sortedApps = useMemo(() => {
    const result = [...filteredApps];
    result.sort((a, b) => {
      let comparison = 0;
      if (sortField === 'loanNumber') {
        const numA = a.loanNumber || 0;
        const numB = b.loanNumber || 0;
        comparison = numA - numB;
      } else if (sortField === 'name') {
        const nameA = `${a.personalData?.lastName || ''}, ${a.personalData?.firstName || ''}`.toLowerCase();
        const nameB = `${b.personalData?.lastName || ''}, ${b.personalData?.firstName || ''}`.toLowerCase();
        comparison = nameA.localeCompare(nameB, 'es');
      } else if (sortField === 'amount') {
        const amountA = a.loanDetails?.requestedAmount || 0;
        const amountB = b.loanDetails?.requestedAmount || 0;
        comparison = amountA - amountB;
      } else if (sortField === 'scoring') {
        const scoreA = evaluations.find(e => e.applicationId === a.id)?.totalScore || 0;
        const scoreB = evaluations.find(e => e.applicationId === b.id)?.totalScore || 0;
        comparison = scoreA - scoreB;
      } else if (sortField === 'date') {
        const dateA = new Date(a.createdAt || 0).getTime();
        const dateB = new Date(b.createdAt || 0).getTime();
        comparison = dateA - dateB;
      } else if (sortField === 'status') {
        const statusLabels: Record<string, string> = {
          Approved: 'Aprobado',
          Rejected: 'Rechazado',
          Pending: 'Pendiente',
          Active: 'Activo',
          Paid: 'Pagado',
          Draft: 'Borrador'
        };
        const labelA = statusLabels[a.status] || a.status || '';
        const labelB = statusLabels[b.status] || b.status || '';
        comparison = labelA.localeCompare(labelB, 'es');
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });
    return result;
  }, [filteredApps, sortField, sortDirection, evaluations]);

  const filteredCollectionItems = useMemo(() => {
    return applications
      .filter(app => app.status === 'Active' || app.status === 'Paid')
      .flatMap(app => (app.paymentSchedule?.installments || []).map(inst => ({ app, inst })))
      .filter(item => {
        const loanNumStr = item.app.loanNumber ? String(item.app.loanNumber) : '';
        const matchTerm = collectionSearch.toLowerCase().trim();
        const termClean = matchTerm.startsWith('#') ? matchTerm.substring(1) : matchTerm;
        return (
          item.app.personalData.lastName.toLowerCase().includes(matchTerm) ||
          item.app.personalData.firstName.toLowerCase().includes(matchTerm) ||
          (loanNumStr && (loanNumStr === termClean || loanNumStr.includes(termClean)))
        );
      });
  }, [applications, collectionSearch]);

  const sortedCollectionItems = useMemo(() => {
    const result = [...filteredCollectionItems];
    result.sort((a, b) => {
      let comparison = 0;
      if (collectionSortField === 'loanNumber') {
        const numA = a.app.loanNumber || 0;
        const numB = b.app.loanNumber || 0;
        comparison = numA - numB;
      } else if (collectionSortField === 'name') {
        const nameA = `${a.app.personalData?.lastName || ''}, ${a.app.personalData?.firstName || ''}`.toLowerCase();
        const nameB = `${b.app.personalData?.lastName || ''}, ${b.app.personalData?.firstName || ''}`.toLowerCase();
        comparison = nameA.localeCompare(nameB, 'es');
      } else if (collectionSortField === 'installment') {
        comparison = a.inst.number - b.inst.number;
      } else if (collectionSortField === 'amount') {
        comparison = a.inst.amount - b.inst.amount;
      } else if (collectionSortField === 'dueDate') {
        const dateA = new Date(a.inst.dueDate || 0).getTime();
        const dateB = new Date(b.inst.dueDate || 0).getTime();
        comparison = dateA - dateB;
      } else if (collectionSortField === 'status') {
        const getStatusRank = (item: typeof a) => {
          if (item.inst.status === 'Paid') return 3;
          if (item.inst.paymentProofUrl) return 1;
          return 2;
        };
        comparison = getStatusRank(a) - getStatusRank(b);
      }
      return collectionSortDirection === 'asc' ? comparison : -comparison;
    });
    return result;
  }, [filteredCollectionItems, collectionSortField, collectionSortDirection]);

  const getStatusBadge = (status: LoanApplication['status']) => {
    switch (status) {
      case 'Approved': return <Badge className="bg-green-100 text-green-700 border-green-200">Aprobado</Badge>;
      case 'Rejected': return <Badge className="bg-red-100 text-red-700 border-red-200">Rechazado</Badge>;
      case 'Pending': return <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200">Pendiente</Badge>;
      case 'Active': return <Badge className="bg-blue-100 text-blue-700 border-blue-200">Activo</Badge>;
      case 'Paid': return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">Pagado</Badge>;
      default: return <Badge className="bg-slate-100 text-slate-700 border-slate-200">Borrador</Badge>;
    }
  };

  const calculateSurplus = (app: LoanApplication) => {
    const income = (app.householdFinance.fixedIncome || 0) + (app.householdFinance.variableIncome || 0);
    const expenses = (app.householdFinance.expenseFoodRent || 0) + (app.householdFinance.expenseServices || 0);
    return income - expenses;
  };

  if (loading) {
    return <div className="flex justify-center p-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;
  }

  return (
    <div className="max-w-[1600px] mx-auto p-4 sm:p-6 pb-20 sm:pb-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <div className="border-b border-slate-200 w-full overflow-x-auto scrollbar-hide focus-visible:outline-none mb-4">
          <TabsList className="bg-transparent h-auto p-0 flex justify-start sm:justify-center gap-4 sm:gap-8 md:gap-12 rounded-none w-max min-w-full pb-1">
            <TabsTrigger 
              value="applications" 
              className="flex flex-col items-center gap-3 pb-4 px-2 sm:px-4 data-[state=active]:bg-transparent data-[state=active]:shadow-none rounded-none border-b-4 border-transparent data-[state=active]:border-black group transition-all shrink-0"
            >
              <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full flex items-center justify-center bg-slate-100 border border-slate-200 group-data-[state=active]:bg-white group-data-[state=active]:border-black group-data-[state=active]:shadow-md transition-all">
                <FileText className="w-5 h-5 sm:w-7 sm:h-7 text-slate-500 group-data-[state=active]:text-black" />
              </div>
              <span className="text-[9px] sm:text-[11px] font-bold uppercase tracking-[0.1em] sm:tracking-[0.2em] text-slate-400 group-data-[state=active]:text-black whitespace-nowrap">
                Solicitudes
              </span>
            </TabsTrigger>

            <TabsTrigger 
              value="collections" 
              className="flex flex-col items-center gap-3 pb-4 px-2 sm:px-4 data-[state=active]:bg-transparent data-[state=active]:shadow-none rounded-none border-b-4 border-transparent data-[state=active]:border-black group transition-all shrink-0"
            >
              <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full flex items-center justify-center bg-slate-100 border border-slate-200 group-data-[state=active]:bg-white group-data-[state=active]:border-black group-data-[state=active]:shadow-md transition-all">
                <DollarSign className="w-5 h-5 sm:w-7 sm:h-7 text-slate-500 group-data-[state=active]:text-black" />
              </div>
              <span className="text-[9px] sm:text-[11px] font-bold uppercase tracking-[0.1em] sm:tracking-[0.2em] text-slate-400 group-data-[state=active]:text-black whitespace-nowrap">
                Seguimiento
              </span>
            </TabsTrigger>

            <TabsTrigger 
              value="scoring" 
              className="flex flex-col items-center gap-3 pb-4 px-2 sm:px-4 data-[state=active]:bg-transparent data-[state=active]:shadow-none rounded-none border-b-4 border-transparent data-[state=active]:border-black group transition-all shrink-0"
            >
              <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full flex items-center justify-center bg-slate-100 border border-slate-200 group-data-[state=active]:bg-white group-data-[state=active]:border-black group-data-[state=active]:shadow-md transition-all">
                <CheckCircle className="w-5 h-5 sm:w-7 sm:h-7 text-slate-500 group-data-[state=active]:text-black" />
              </div>
              <span className="text-[9px] sm:text-[11px] font-bold uppercase tracking-[0.1em] sm:tracking-[0.2em] text-slate-400 group-data-[state=active]:text-black whitespace-nowrap">
                Scoring
              </span>
            </TabsTrigger>

            <TabsTrigger 
              value="settings" 
              className="flex flex-col items-center gap-3 pb-4 px-2 sm:px-4 data-[state=active]:bg-transparent data-[state=active]:shadow-none rounded-none border-b-4 border-transparent data-[state=active]:border-black group transition-all shrink-0"
            >
              <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full flex items-center justify-center bg-slate-100 border border-slate-200 group-data-[state=active]:bg-white group-data-[state=active]:border-black group-data-[state=active]:shadow-md transition-all">
                <Settings className="w-5 h-5 sm:w-7 sm:h-7 text-slate-500 group-data-[state=active]:text-black" />
              </div>
              <span className="text-[9px] sm:text-[11px] font-bold uppercase tracking-[0.1em] sm:tracking-[0.2em] text-slate-400 group-data-[state=active]:text-black whitespace-nowrap">
                Configuración
              </span>
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="applications">
          <div className="flex flex-col gap-8">
            {!selectedApp ? (
              /* List */
              <Card className="border-none shadow-lg">
              <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 py-4 border-b border-slate-100">
                <div className="flex items-center gap-4 w-full sm:w-auto">
                  <div className="relative w-full sm:w-80">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input 
                      placeholder="Buscar por emprendedora, apellido, email o Nº..." 
                      className="pl-9 h-10 border-slate-200 focus:border-blue-500 bg-slate-50/50 shadow-sm"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-start sm:justify-end">
                  {isSelectionMode ? (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={selectAllApplications}
                        className="border-slate-200 text-slate-700 hover:bg-slate-100 text-xs shrink-0"
                      >
                        {selectedDeleteIds.length === applications.length ? "Deseleccionar Todo" : `Seleccionar Todo (${applications.length})`}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setIsSelectionMode(false);
                          setSelectedDeleteIds([]);
                        }}
                        className="text-slate-600 hover:bg-slate-100 text-xs shrink-0"
                      >
                        Cancelar
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => {
                          if (selectedDeleteIds.length === 0) {
                            toast.warning("Por favor, selecciona al menos un préstamo para eliminar.");
                            return;
                          }
                          setShowMultiDeleteConfirm(true);
                        }}
                        className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs shrink-0 shadow-sm"
                      >
                        <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                        {selectedDeleteIds.length > 0 ? `Eliminar (${selectedDeleteIds.length})` : "Eliminar Seleccionados"}
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        onClick={clearDemoData}
                        variant="outline"
                        className="bg-red-50 text-red-700 border-red-200 hover:bg-red-100 font-semibold text-xs gap-2 shrink-0 shadow-sm"
                        title="Seleccionar y eliminar datos de prueba/demo"
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                        Limpiar Demo
                      </Button>
                      <Button
                        onClick={handleExportToCSV}
                        variant="outline"
                        className="border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs gap-2 shrink-0 shadow-sm"
                      >
                        <Download className="w-4 h-4 text-slate-500" />
                        Exportar a CSV
                      </Button>
                    </>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="max-h-[400px] overflow-y-auto overflow-x-auto scrollbar-thin scrollbar-thumb-slate-200">
                  <Table className="min-w-[600px] lg:min-w-full">
                    <TableHeader className="sticky top-0 bg-white z-10 shadow-sm">
                      <TableRow>
                        {isSelectionMode && (
                          <TableHead className="w-16 text-center select-none">Sel.</TableHead>
                        )}
                        {renderTableHead("Nº Préstamo", "loanNumber")}
                        {renderTableHead("Emprendedora", "name")}
                        {renderTableHead("Monto", "amount")}
                        {renderTableHead("Scoring", "scoring", "center")}
                        {renderTableHead("Fecha", "date")}
                        {renderTableHead("Estado", "status")}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedApps.map((app) => {
                        const isAppSelectedForDeletion = selectedDeleteIds.includes(app.id);
                        return (
                          <TableRow 
                            key={app.id} 
                            className={`cursor-pointer transition-colors ${
                              isSelectionMode && isAppSelectedForDeletion
                              ? "bg-red-50/70 hover:bg-red-100/70 border-l-4 border-red-500"
                              : selectedApp?.id === app.id
                              ? "bg-blue-50 hover:bg-blue-100/80 border-l-4 border-blue-600" 
                              : "hover:bg-slate-50"
                            }`} 
                            onClick={() => {
                              if (isSelectionMode) {
                                if (isAppSelectedForDeletion) {
                                  setSelectedDeleteIds(prev => prev.filter(id => id !== app.id));
                                } else {
                                  setSelectedDeleteIds(prev => [...prev, app.id]);
                                }
                              } else {
                                setSelectedApp(app);
                              }
                            }}
                          >
                            {isSelectionMode && (
                              <TableCell className="w-16 text-center" onClick={(e) => e.stopPropagation()}>
                                <div 
                                  onClick={() => {
                                    if (isAppSelectedForDeletion) {
                                      setSelectedDeleteIds(prev => prev.filter(id => id !== app.id));
                                    } else {
                                      setSelectedDeleteIds(prev => [...prev, app.id]);
                                    }
                                  }}
                                  className={`mx-auto w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all cursor-pointer ${
                                    isAppSelectedForDeletion
                                    ? "border-red-500 bg-red-500 text-white"
                                    : "border-slate-300 hover:border-slate-400 bg-white"
                                  }`}
                                >
                                  {isAppSelectedForDeletion && (
                                    <div className="w-1.5 h-1.5 rounded-full bg-white" />
                                  )}
                                </div>
                              </TableCell>
                            )}
                            <TableCell className={`font-mono text-xs font-bold text-slate-500 ${selectedApp?.id === app.id && !isSelectionMode ? "pl-3" : ""}`}>
                              {app.loanNumber ? `#${app.loanNumber}` : "Borrador"}
                            </TableCell>
                            <TableCell>
                              <div className="font-medium flex items-center gap-1.5 flex-wrap">
                                <span>{app.personalData.lastName}, {app.personalData.firstName}</span>
                                {app.createdOnBehalf && (
                                  <Badge variant="outline" className="text-[10px] bg-purple-50 text-purple-700 border-purple-200">
                                    x Cuenta y Orden
                                  </Badge>
                                )}
                              </div>
                              <div className="text-xs text-slate-500">{app.userEmail}</div>
                            </TableCell>
                            <TableCell>${app.loanDetails.requestedAmount.toLocaleString('es-AR')}</TableCell>
                            <TableCell>
                              {(() => {
                                const evaluation = evaluations.find(e => e.applicationId === app.id);
                                if (evaluation) {
                                  return (
                                    <button 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        navigateToScoring(app.id);
                                      }}
                                      className={`px-3 py-1 rounded-full text-xs font-bold transition-all hover:scale-105 ${
                                        evaluation.status === 'APROBADO' 
                                        ? "bg-green-100 text-green-700 hover:bg-green-200" 
                                        : "bg-red-100 text-red-700 hover:bg-red-200"
                                      }`}
                                    >
                                      {evaluation.totalScore} pts
                                    </button>
                                  );
                                }
                                return (
                                  <button 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      navigateToScoring(app.id);
                                    }}
                                    className="text-amber-600 font-medium text-xs hover:underline flex items-center gap-1"
                                  >
                                    <Clock className="w-3 h-3" />
                                    Pendiente
                                  </button>
                                );
                              })()}
                            </TableCell>
                            <TableCell className="text-xs text-slate-500 whitespace-nowrap">
                              <div>Creada: {new Date(app.createdAt).toLocaleDateString()}</div>
                              
                              {app.status !== 'Draft' && (
                                <div className="text-slate-500 mt-0.5">
                                  Enviada: {new Date(app.submittedAt || app.createdAt).toLocaleDateString()}
                                </div>
                              )}

                              {["Approved", "Active", "Paid"].includes(app.status) && (
                                <div className="text-green-600 font-medium mt-0.5">
                                  Aprobada: {new Date(app.approvedAt || app.paymentSchedule?.startDate || app.updatedAt || app.createdAt).toLocaleDateString()}
                                </div>
                              )}

                              {app.status === 'Rejected' && (
                                <div className="text-red-600 font-medium mt-0.5">
                                  Rechazada: {new Date(app.rejectedAt || app.updatedAt || app.createdAt).toLocaleDateString()}
                                </div>
                              )}
                            </TableCell>
                            <TableCell>{getStatusBadge(app.status)}</TableCell>
                          </TableRow>
                        );
                      })}
                      {sortedApps.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={isSelectionMode ? 7 : 6} className="text-center py-8 text-slate-500">No se encontraron solicitudes.</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
            ) : (
              /* Details Panel - Single-screen layout with back button */
              <Card className="border-none shadow-lg overflow-hidden">
                <div className="max-h-none overflow-y-auto">
                  <CardHeader className="border-b bg-white sticky top-0 z-10">
                    <div className="mb-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedApp(null)}
                        className="text-indigo-700 border-indigo-200 hover:bg-indigo-50 flex items-center gap-1.5 font-semibold text-xs py-1.5 px-3 h-8 shadow-xs"
                      >
                        <ArrowLeft className="w-4 h-4" />
                        Volver a solicitudes
                      </Button>
                    </div>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="flex items-center gap-2 flex-wrap">
                          <span>{selectedApp.personalData.lastName}, {selectedApp.personalData.firstName}</span>
                          <span className="text-xs font-mono font-medium px-2 py-0.5 bg-slate-100 text-slate-700 rounded border">
                            {selectedApp.loanNumber ? `#${selectedApp.loanNumber}` : 'Borrador'}
                          </span>
                        </CardTitle>
                        <CardDescription>{selectedApp.userEmail}</CardDescription>
                      </div>
                      {getStatusBadge(selectedApp.status)}
                    </div>
                  </CardHeader>
                  <CardContent className="p-6 space-y-8">
                    {/* PASO 1 — DATOS PERSONALES */}
                    {selectedApp.personalData && (
                      <div className="space-y-3">
                        <h4 className="text-xs font-bold uppercase text-slate-500 flex items-center gap-1.5 border-b pb-1.5">
                          <UserIcon className="w-3.5 h-3.5 text-indigo-600" /> Paso 1: Datos Personales de la Emprendedora
                        </h4>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                          <div className="bg-slate-50 p-2.5 rounded border border-slate-100">
                            <span className="block text-[10px] text-slate-400 font-semibold uppercase">Apellido y Nombre</span>
                            <span className="font-bold text-slate-900">{selectedApp.personalData.lastName}, {selectedApp.personalData.firstName}</span>
                          </div>
                          <div className="bg-slate-50 p-2.5 rounded border border-slate-100">
                            <span className="block text-[10px] text-slate-400 font-semibold uppercase">DNI</span>
                            <span className="font-bold text-slate-900">{selectedApp.personalData.dni || 'N/A'}</span>
                          </div>
                          <div className="bg-slate-50 p-2.5 rounded border border-slate-100">
                            <span className="block text-[10px] text-slate-400 font-semibold uppercase">CUIL</span>
                            <span className="font-bold text-slate-900">{selectedApp.personalData.cuil || selectedApp.personalData.dni || 'N/A'}</span>
                          </div>
                          <div className="bg-slate-50 p-2.5 rounded border border-slate-100">
                            <span className="block text-[10px] text-slate-400 font-semibold uppercase">Fecha de Nacimiento</span>
                            <span className="font-bold text-slate-900">{selectedApp.personalData.birthDate || 'N/A'}</span>
                          </div>
                          <div className="bg-slate-50 p-2.5 rounded border border-slate-100">
                            <span className="block text-[10px] text-slate-400 font-semibold uppercase">Teléfono</span>
                            <span className="font-bold text-slate-900">{selectedApp.personalData.phone || 'N/A'}</span>
                          </div>
                          <div className="bg-slate-50 p-2.5 rounded border border-slate-100">
                            <span className="block text-[10px] text-slate-400 font-semibold uppercase">Dirección</span>
                            <span className="font-bold text-slate-900">{selectedApp.personalData.address || 'N/A'}</span>
                          </div>
                          <div className="bg-slate-50 p-2.5 rounded border border-slate-100">
                            <span className="block text-[10px] text-slate-400 font-semibold uppercase">Barrio de residencia</span>
                            <span className="font-bold text-slate-900">
                              {selectedApp.personalData.neighborhood === "Otro" 
                                ? `Otro (${selectedApp.personalData.neighborhoodOption || ''})` 
                                : (selectedApp.personalData.neighborhood || 'N/A')}
                            </span>
                          </div>
                          <div className="bg-slate-50 p-2.5 rounded border border-slate-100">
                            <span className="block text-[10px] text-slate-400 font-semibold uppercase">Estado Civil</span>
                            <span className="font-bold text-slate-900">{selectedApp.personalData.civilStatus || 'N/A'}</span>
                          </div>
                          <div className="bg-slate-50 p-2.5 rounded border border-slate-100">
                            <span className="block text-[10px] text-slate-400 font-semibold uppercase">Nivel Educativo</span>
                            <span className="font-bold text-slate-900">{selectedApp.personalData.educationLevel || 'N/A'}</span>
                          </div>
                          <div className="bg-slate-50 p-2.5 rounded border border-slate-100">
                            <span className="block text-[10px] text-slate-400 font-semibold uppercase">Integrantes en el Hogar</span>
                            <span className="font-bold text-slate-900">{selectedApp.personalData.householdSize ?? 'N/A'}</span>
                          </div>
                          {selectedApp.personalData.presentationDate && (
                            <div className="bg-slate-50 p-2.5 rounded border border-slate-100">
                              <span className="block text-[10px] text-slate-400 font-semibold uppercase">Fecha Presentación</span>
                              <span className="font-bold text-slate-900">{selectedApp.personalData.presentationDate}</span>
                            </div>
                          )}
                          {(selectedApp.personalData.creditNumberM2000 || selectedApp.personalData.previousCreditAmount) && (
                            <div className="bg-slate-50 p-2.5 rounded border border-slate-100 col-span-2 sm:col-span-3">
                              <span className="block text-[10px] text-slate-400 font-semibold uppercase">Antecedentes Crédito M2000</span>
                              <span className="font-bold text-slate-900">
                                Nº Crédito: {selectedApp.personalData.creditNumberM2000 || '-'} | Monto Previo: ${(selectedApp.personalData.previousCreditAmount || 0).toLocaleString('es-AR')}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* PASO 2 — FINANZAS DEL HOGAR Y CAPACIDAD DE PAGO */}
                    {selectedApp.householdFinance && (
                      <div className="space-y-4 pt-4 border-t border-slate-100">
                        <h4 className="text-xs font-bold uppercase text-slate-500 flex items-center gap-1.5 border-b pb-1.5">
                          <DollarSign className="w-3.5 h-3.5 text-emerald-600" /> Paso 2: Finanzas del Hogar y Capacidad de Pago
                        </h4>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                          <div className="bg-slate-50 p-3 rounded border border-slate-100">
                            <span className="block text-[10px] text-slate-500 font-semibold uppercase">Ingresos Fijos</span>
                            <span className="font-bold text-slate-900">${(selectedApp.householdFinance.fixedIncome || 0).toLocaleString('es-AR')}</span>
                          </div>
                          <div className="bg-slate-50 p-3 rounded border border-slate-100">
                            <span className="block text-[10px] text-slate-500 font-semibold uppercase">Ingresos Variables</span>
                            <span className="font-bold text-slate-900">${(selectedApp.householdFinance.variableIncome || 0).toLocaleString('es-AR')}</span>
                          </div>
                          <div className="bg-slate-50 p-3 rounded border border-slate-100">
                            <span className="block text-[10px] text-slate-500 font-semibold uppercase">Gastos del Hogar</span>
                            <span className="font-bold text-slate-900">
                              ${((selectedApp.householdFinance.expenseFoodRent || 0) + (selectedApp.householdFinance.expenseServices || 0)).toLocaleString('es-AR')}
                            </span>
                          </div>
                          <div className={`p-3 rounded border flex flex-col justify-center ${calculateSurplus(selectedApp) > 0 ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"}`}>
                            <span className="text-[10px] text-slate-500 font-semibold uppercase">Excedente Estimado</span>
                            <span className={`font-bold text-sm ${calculateSurplus(selectedApp) > 0 ? "text-emerald-700" : "text-red-700"}`}>
                              ${calculateSurplus(selectedApp).toLocaleString('es-AR')}
                            </span>
                          </div>
                        </div>

                        {/* Detailed Incomes Breakdown if available */}
                        {selectedApp.householdFinance.detailedIncomes && (
                          <div className="space-y-2">
                            <h5 className="text-[11px] font-bold uppercase text-slate-500">Desglose de Ingresos Informados</h5>
                            <div className="border border-slate-150 rounded-lg overflow-hidden text-xs bg-white shadow-3xs">
                              <table className="w-full text-slate-700">
                                <thead className="bg-slate-50 text-[10px] font-bold uppercase text-slate-500 border-b border-slate-150">
                                  <tr>
                                    <th className="p-2.5 text-left">Origen / Miembro</th>
                                    <th className="p-2.5 text-right">Monto Mensual</th>
                                    <th className="p-2.5 text-center">Clasificación</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                  {Number(selectedApp.householdFinance.detailedIncomes.applicant?.amount || 0) > 0 && (
                                    <tr>
                                      <td className="p-2.5 font-medium">Destinataria (Tú)</td>
                                      <td className="p-2.5 text-right font-semibold">${Number(selectedApp.householdFinance.detailedIncomes.applicant.amount).toLocaleString('es-AR')}</td>
                                      <td className="p-2.5 text-center">
                                        <span className={`px-1.5 py-0.5 rounded text-[9px] uppercase font-extrabold ${selectedApp.householdFinance.detailedIncomes.applicant.isFixed ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-amber-50 text-amber-700 border border-amber-200"}`}>
                                          {selectedApp.householdFinance.detailedIncomes.applicant.isFixed ? "Fijo" : "Variable"}
                                        </span>
                                      </td>
                                    </tr>
                                  )}
                                  {Number(selectedApp.householdFinance.detailedIncomes.partner?.amount || 0) > 0 && (
                                    <tr>
                                      <td className="p-2.5 font-medium">Pareja</td>
                                      <td className="p-2.5 text-right font-semibold">${Number(selectedApp.householdFinance.detailedIncomes.partner.amount).toLocaleString('es-AR')}</td>
                                      <td className="p-2.5 text-center">
                                        <span className={`px-1.5 py-0.5 rounded text-[9px] uppercase font-extrabold ${selectedApp.householdFinance.detailedIncomes.partner.isFixed ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-amber-50 text-amber-700 border border-amber-200"}`}>
                                          {selectedApp.householdFinance.detailedIncomes.partner.isFixed ? "Fijo" : "Variable"}
                                        </span>
                                      </td>
                                    </tr>
                                  )}
                                  {Number(selectedApp.householdFinance.detailedIncomes.family3?.amount || 0) > 0 && (
                                    <tr>
                                      <td className="p-2.5 font-medium">Familiar 3 {selectedApp.householdFinance.detailedIncomes.family3.name ? `(${selectedApp.householdFinance.detailedIncomes.family3.name})` : ''}</td>
                                      <td className="p-2.5 text-right font-semibold">${Number(selectedApp.householdFinance.detailedIncomes.family3.amount).toLocaleString('es-AR')}</td>
                                      <td className="p-2.5 text-center">
                                        <span className={`px-1.5 py-0.5 rounded text-[9px] uppercase font-extrabold ${selectedApp.householdFinance.detailedIncomes.family3.isFixed ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-amber-50 text-amber-700 border border-amber-200"}`}>
                                          {selectedApp.householdFinance.detailedIncomes.family3.isFixed ? "Fijo" : "Variable"}
                                        </span>
                                      </td>
                                    </tr>
                                  )}
                                  {Number(selectedApp.householdFinance.detailedIncomes.family4?.amount || 0) > 0 && (
                                    <tr>
                                      <td className="p-2.5 font-medium">Familiar 4 {selectedApp.householdFinance.detailedIncomes.family4.name ? `(${selectedApp.householdFinance.detailedIncomes.family4.name})` : ''}</td>
                                      <td className="p-2.5 text-right font-semibold">${Number(selectedApp.householdFinance.detailedIncomes.family4.amount).toLocaleString('es-AR')}</td>
                                      <td className="p-2.5 text-center">
                                        <span className={`px-1.5 py-0.5 rounded text-[9px] uppercase font-extrabold ${selectedApp.householdFinance.detailedIncomes.family4.isFixed ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-amber-50 text-amber-700 border border-amber-200"}`}>
                                          {selectedApp.householdFinance.detailedIncomes.family4.isFixed ? "Fijo" : "Variable"}
                                        </span>
                                      </td>
                                    </tr>
                                  )}
                                  {Number(selectedApp.householdFinance.detailedIncomes.others?.amount || 0) > 0 && (
                                    <tr>
                                      <td className="p-2.5 font-medium">Otros {selectedApp.householdFinance.detailedIncomes.others.name ? `(${selectedApp.householdFinance.detailedIncomes.others.name})` : ''}</td>
                                      <td className="p-2.5 text-right font-semibold">${Number(selectedApp.householdFinance.detailedIncomes.others.amount).toLocaleString('es-AR')}</td>
                                      <td className="p-2.5 text-center">
                                        <span className={`px-1.5 py-0.5 rounded text-[9px] uppercase font-extrabold ${selectedApp.householdFinance.detailedIncomes.others.isFixed ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-amber-50 text-amber-700 border border-amber-200"}`}>
                                          {selectedApp.householdFinance.detailedIncomes.others.isFixed ? "Fijo" : "Variable"}
                                        </span>
                                      </td>
                                    </tr>
                                  )}
                                  {Number(selectedApp.householdFinance.detailedIncomes.stateAssistance?.amount || 0) > 0 && (
                                    <tr>
                                      <td className="p-2.5 font-medium">Ingreso del Estado (AUH/Pens.)</td>
                                      <td className="p-2.5 text-right font-semibold">${Number(selectedApp.householdFinance.detailedIncomes.stateAssistance.amount).toLocaleString('es-AR')}</td>
                                      <td className="p-2.5 text-center">
                                        <span className={`px-1.5 py-0.5 rounded text-[9px] uppercase font-extrabold ${selectedApp.householdFinance.detailedIncomes.stateAssistance.isFixed ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-amber-50 text-amber-700 border border-amber-200"}`}>
                                          {selectedApp.householdFinance.detailedIncomes.stateAssistance.isFixed ? "Fijo" : "Variable"}
                                        </span>
                                      </td>
                                    </tr>
                                  )}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}

                        {/* Detailed Expenses Breakdown if available */}
                        {selectedApp.householdFinance.detailedExpenses && (
                          <div className="space-y-2">
                            <h5 className="text-[11px] font-bold uppercase text-rose-500">Desglose de Gastos Informados</h5>
                            <div className="border border-slate-150 rounded-lg overflow-hidden text-xs bg-white shadow-3xs">
                              <table className="w-full text-slate-700">
                                <thead className="bg-slate-50 text-[10px] font-bold uppercase text-slate-500 border-b border-slate-150">
                                  <tr>
                                    <th className="p-2.5 text-left">Categoría de Gasto</th>
                                    <th className="p-2.5 text-right">Monto Promedio</th>
                                    <th className="p-2.5 text-center">¿Varía?</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                  {(() => {
                                    const expenseKeys: { key: string; label: string; isObject?: boolean }[] = [
                                      { key: "alquiler", label: "🏠 Vivienda: Alquiler" },
                                      { key: "agua", label: "🏠 Vivienda: Agua" },
                                      { key: "luz", label: "🏠 Vivienda: Luz" },
                                      { key: "gas", label: "🏠 Vivienda: Gas" },
                                      { key: "sube", label: "🚌 Transporte: SUBE" },
                                      { key: "naftaRemis", label: "🚌 Transporte: Nafta / Remis" },
                                      { key: "telefonoCelular", label: "📱 Comunicación: Teléfono / Celular" },
                                      { key: "internet", label: "📱 Comunicación: Internet" },
                                      { key: "cable", label: "📱 Comunicación: Cable" },
                                      { key: "comidaMercaderia", label: "🛒 Alimentación: Comida y Mercadería" },
                                      { key: "cuotasDeudas", label: "💳 Deudas: Cuotas actuales" },
                                      { key: "seguros", label: "💳 Deudas: Seguros" },
                                      { key: "impuestos", label: "💳 Deudas: Impuestos (ABL/Mono/...)" },
                                      { key: "educacion", label: "👨‍👩‍👧 Familia: Educación" },
                                      { key: "salud", label: "👨‍👩‍👧 Familia: Salud" },
                                      { key: "ropaCalzado", label: "👨‍👩‍👧 Familia: Ropa y Calzado" },
                                      { key: "mascotas", label: "🐾 Otros: Mascotas" },
                                      { key: "cigarrillos", label: "🐾 Otros: Cigarrillos" },
                                      { key: "naftaOtros", label: "🐾 Otros: Nafta" },
                                      { key: "otrosDetalle", label: "🐾 Otros: Especificado", isObject: true }
                                    ];

                                    return expenseKeys.map(({ key, label, isObject }) => {
                                      const item = (selectedApp.householdFinance.detailedExpenses as any)?.[key];
                                      if (!item) return null;
                                      const amount = Number(item.amount || 0);
                                      if (amount <= 0) return null;

                                      const displayName = isObject && item.name ? `🐾 Otros: ${item.name}` : label;

                                      return (
                                        <tr key={key}>
                                          <td className="p-2.5 font-medium">{displayName}</td>
                                          <td className="p-2.5 text-right font-semibold">${amount.toLocaleString('es-AR')}</td>
                                          <td className="p-2.5 text-center">
                                            <span className={`px-1.5 py-0.5 rounded text-[9px] uppercase font-extrabold ${item.varies ? "bg-rose-50 text-rose-700 border border-rose-200" : "bg-slate-50 text-slate-500 border border-slate-200"}`}>
                                              {item.varies ? "Sí" : "No"}
                                            </span>
                                          </td>
                                        </tr>
                                      );
                                    });
                                  })()}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* PASO 3 — DATOS DEL EMPRENDIMIENTO */}
                    {selectedApp.entrepreneurshipData && (
                      <div className="space-y-4 pt-4 border-t border-slate-100">
                        <h4 className="text-xs font-bold uppercase text-slate-500 flex items-center gap-1.5 border-b pb-1.5">
                          <Briefcase className="w-3.5 h-3.5 text-blue-600" /> Paso 3: Datos del Emprendimiento
                        </h4>
                        <div className="grid grid-cols-2 gap-3 text-xs">
                          <div className="bg-slate-50 p-2.5 rounded border border-slate-100">
                            <span className="block text-[10px] text-slate-400 font-semibold uppercase">Nombre del emprendimiento</span>
                            <span className="font-bold text-slate-900">{selectedApp.entrepreneurshipData.name || 'N/A'}</span>
                          </div>
                          <div className="bg-slate-50 p-2.5 rounded border border-slate-100">
                            <span className="block text-[10px] text-slate-400 font-semibold uppercase">Actividad Principal</span>
                            <span className="font-bold text-slate-900">{selectedApp.entrepreneurshipData.activity || 'N/A'}</span>
                          </div>
                          <div className="bg-slate-50 p-2.5 rounded border border-slate-100">
                            <span className="block text-[10px] text-slate-400 font-semibold uppercase">Tipo de Negocio</span>
                            <span className="font-bold text-slate-900">{selectedApp.entrepreneurshipData.type || 'N/A'}</span>
                          </div>
                          <div className="bg-slate-50 p-2.5 rounded border border-slate-100">
                            <span className="block text-[10px] text-slate-400 font-semibold uppercase">Antigüedad</span>
                            <span className="font-bold text-slate-900">{selectedApp.entrepreneurshipData.seniority || 'N/A'}</span>
                          </div>
                          <div className="bg-slate-50 p-2.5 rounded border border-slate-100 col-span-2">
                            <span className="block text-[10px] text-slate-400 font-semibold uppercase">Lugar de venta</span>
                            <span className="font-bold text-slate-900">{selectedApp.entrepreneurshipData.salesPlace || 'N/A'}</span>
                          </div>
                        </div>

                        {selectedApp.entrepreneurshipData.description && (
                          <div className="bg-slate-50 p-3 rounded border border-slate-100 text-xs">
                            <span className="block text-[10px] text-slate-400 font-semibold uppercase mb-1">Descripción del Emprendimiento</span>
                            <p className="text-slate-700 italic leading-relaxed">
                              &quot;{selectedApp.entrepreneurshipData.description}&quot;
                            </p>
                          </div>
                        )}

                        {selectedApp.entrepreneurshipData.socialNetworks && (
                          <div className="bg-slate-50 p-2.5 rounded border border-slate-100 text-xs">
                            <span className="block text-[10px] text-slate-400 font-semibold uppercase mb-0.5">Redes Sociales</span>
                            <span className="text-slate-800 font-semibold">{selectedApp.entrepreneurshipData.socialNetworks}</span>
                          </div>
                        )}

                        {/* PLANILLA DE PRODUCTOS / SERVICIOS */}
                        {selectedApp.entrepreneurshipData.products && selectedApp.entrepreneurshipData.products.length > 0 && (
                          <div className="space-y-2 mt-3 pt-3 border-t border-slate-100">
                            <h5 className="text-[11px] font-bold uppercase text-indigo-700 flex items-center gap-1">
                              <Calculator className="w-3.5 h-3.5" /> Planilla de Productos / Servicios (Presupuesto)
                            </h5>
                            <div className="border border-slate-150 rounded-lg overflow-hidden text-[11px] bg-white shadow-3xs overflow-x-auto">
                              <Table className="min-w-[650px] lg:min-w-full text-slate-700">
                                <TableHeader className="bg-slate-50 text-[10px] font-bold uppercase text-slate-500 border-b border-slate-150">
                                  <TableRow>
                                    <TableHead className="p-2.5 text-left font-bold text-slate-600">Producto / Servicio</TableHead>
                                    <TableHead className="p-2.5 text-right font-bold text-slate-600">Costo Unit.</TableHead>
                                    <TableHead className="p-2.5 text-right font-bold text-slate-600">Precio Venta</TableHead>
                                    <TableHead className="p-2.5 text-center font-bold text-slate-600">Ganancia Unit.</TableHead>
                                    <TableHead className="p-2.5 text-center font-bold text-slate-600">Markup %</TableHead>
                                    <TableHead className="p-2.5 text-right font-bold text-slate-600">Cant. Semanal</TableHead>
                                    <TableHead className="p-2.5 text-right font-bold text-slate-600">Ganancia Semanal</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody className="divide-y divide-slate-100">
                                  {selectedApp.entrepreneurshipData.products.map((p) => {
                                    const uCost = Number(p.unitCost) || 0;
                                    const uPrice = Number(p.unitPrice) || 0;
                                    const wQty = Number(p.weeklyQty) || 0;
                                    const unitGain = uPrice - uCost;
                                    const totalGain = unitGain * wQty;
                                    const markup = uCost > 0 ? Math.round((unitGain / uCost) * 100) : 0;

                                    if (!p.name && uCost === 0 && uPrice === 0 && wQty === 0) return null;

                                    return (
                                      <TableRow key={p.id} className="hover:bg-slate-50/50">
                                        <TableCell className="p-2.5 font-medium text-slate-800">{p.name || 'Sin nombre'}</TableCell>
                                        <TableCell className="p-2.5 text-right font-mono">${uCost.toLocaleString('es-AR')}</TableCell>
                                        <TableCell className="p-2.5 text-right font-mono">${uPrice.toLocaleString('es-AR')}</TableCell>
                                        <TableCell className={`p-2.5 text-center font-bold font-mono ${unitGain >= 0 ? "text-indigo-700" : "text-red-600"}`}>
                                          ${unitGain.toLocaleString('es-AR')}
                                        </TableCell>
                                        <TableCell className="p-2.5 text-center font-mono text-slate-500">{markup}%</TableCell>
                                        <TableCell className="p-2.5 text-right font-mono">{wQty.toLocaleString('es-AR')}</TableCell>
                                        <TableCell className="p-2.5 text-right font-semibold font-mono text-emerald-700">
                                          ${totalGain.toLocaleString('es-AR')}
                                        </TableCell>
                                      </TableRow>
                                    );
                                  })}
                                </TableBody>
                              </Table>
                            </div>
                          </div>
                        )}

                        {/* Fallback de Datos Financieros para Solicitudes Antiguas */}
                        {(!selectedApp.entrepreneurshipData.products || selectedApp.entrepreneurshipData.products.length === 0) && (
                          <div className="grid grid-cols-2 gap-4 mt-3 bg-slate-50 p-3 rounded border text-[11px]">
                            {selectedApp.entrepreneurshipData.type === 'Comercial' && (
                              <>
                                <div>
                                  <span className="block text-[10px] text-slate-500">Costo Compra Promedio</span>
                                  <span className="font-bold text-slate-800">${(selectedApp.entrepreneurshipData.avgPurchaseCost || 0).toLocaleString('es-AR')}</span>
                                </div>
                                <div>
                                  <span className="block text-[10px] text-slate-500">Precio Venta Promedio</span>
                                  <span className="font-bold text-slate-800">${(selectedApp.entrepreneurshipData.avgSalePrice || 0).toLocaleString('es-AR')}</span>
                                </div>
                                <div className="col-span-2">
                                  <span className="block text-[10px] text-slate-500">Ventas Semanales Est.</span>
                                  <span className="font-bold text-slate-800">{selectedApp.entrepreneurshipData.estWeeklySales || 0} unidades</span>
                                </div>
                              </>
                            )}
                            {selectedApp.entrepreneurshipData.type === 'Productivo' && (
                              <>
                                <div>
                                  <span className="block text-[10px] text-slate-500">Costo Semanal de Insumos</span>
                                  <span className="font-bold text-slate-800">${(selectedApp.entrepreneurshipData.weeklyInputCost || 0).toLocaleString('es-AR')}</span>
                                </div>
                                <div>
                                  <span className="block text-[10px] text-slate-500">Producción Semanal Est.</span>
                                  <span className="font-bold text-slate-800">{selectedApp.entrepreneurshipData.weeklyProductionQty || 0} unidades</span>
                                </div>
                                <div className="col-span-2">
                                  <span className="block text-[10px] text-slate-500">Costo Unitario Producción</span>
                                  <span className="font-bold text-slate-800">${(selectedApp.entrepreneurshipData.unitProductionCost || 0).toLocaleString('es-AR')}</span>
                                </div>
                              </>
                            )}
                          </div>
                        )}

                        {/* Costos Fijos, Viáticos y Margen del Emprendimiento */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3 text-[11px]">
                          <div className="bg-slate-50 p-3 rounded space-y-2 border border-slate-100">
                            <span className="block text-[10px] font-bold uppercase text-slate-400">Costos de Operación</span>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <span className="block text-[9px] text-slate-500 leading-tight">Costos Fijos (Mensual)</span>
                                <span className="font-bold text-slate-800">
                                  ${(Number(selectedApp.entrepreneurshipData.fixedCosts) || 0).toLocaleString('es-AR')}
                                </span>
                              </div>
                              <div>
                                <span className="block text-[9px] text-slate-500 leading-tight">Viáticos (Semanal)</span>
                                <span className="font-bold text-slate-800">
                                  ${(Number(selectedApp.entrepreneurshipData.travelExpenses) || 0).toLocaleString('es-AR')}
                                </span>
                              </div>
                            </div>
                          </div>

                          {(() => {
                            const products = selectedApp.entrepreneurshipData.products || [];
                            const totalWeeklyProfitFromProducts = products.reduce((acc, p) => {
                              const uC = Number(p.unitCost) || 0;
                              const uP = Number(p.unitPrice) || 0;
                              const qty = Number(p.weeklyQty) || 0;
                              return acc + ((uP - uC) * qty);
                            }, 0);
                            const fixedCosts = Number(selectedApp.entrepreneurshipData.fixedCosts) || 0;
                            const travelExpenses = Number(selectedApp.entrepreneurshipData.travelExpenses) || 0;
                            const netWeeklyCalculated = totalWeeklyProfitFromProducts - fixedCosts - travelExpenses;
                            const netMonthlyCalculated = netWeeklyCalculated * 4;

                            return (
                              <div className="bg-emerald-50/60 border border-emerald-200/80 p-3 rounded space-y-1">
                                <span className="block text-[10px] font-bold uppercase text-emerald-800">Ganancias Netas Calculadas</span>
                                <div className="grid grid-cols-2 gap-2">
                                  <div>
                                    <span className="block text-[9px] text-emerald-700">Semanal Neto</span>
                                    <span className="font-black text-emerald-950 text-[13px]">
                                      ${netWeeklyCalculated.toLocaleString('es-AR')}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="block text-[9px] text-indigo-700">Mensual Neto (x4)</span>
                                    <span className="font-black text-indigo-950 text-[13px]">
                                      ${netMonthlyCalculated.toLocaleString('es-AR')}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            );
                          })()}
                        </div>

                        {/* REGISTRO HISTÓRICO DE VENTAS (ÚLTIMOS 3 MESES) */}
                        {selectedApp.entrepreneurshipData.accountingMonths && selectedApp.entrepreneurshipData.accountingMonths.length > 0 && (
                          <div className="space-y-2 mt-3 pt-3 border-t border-slate-100">
                            <h5 className="text-[11px] font-bold uppercase text-slate-500 flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5 text-slate-400" /> Registro Histórico de Ventas (Últimos 3 Meses)
                            </h5>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                              {selectedApp.entrepreneurshipData.accountingMonths.map((m, idx) => {
                                const billed = Number(m.totalBilled) || 0;
                                const profit = Number(m.profit) || 0;
                                
                                if (!m.productOrService && billed === 0 && profit === 0) return null;

                                return (
                                  <div key={`${m.period}-${idx}`} className="bg-white border border-slate-150 rounded-lg p-2.5 space-y-1.5 shadow-3xs">
                                    <div className="flex items-center justify-between border-b pb-1">
                                      <span className="font-bold text-slate-700 text-[11px]">{m.period}</span>
                                      <span className="text-[8px] px-1.5 py-0.2 bg-slate-50 text-slate-500 rounded-full">Historial</span>
                                    </div>
                                    <div className="space-y-1 text-[10px]">
                                      <div>
                                        <span className="block text-[9px] text-slate-400">Producto / Servicio</span>
                                        <span className="font-semibold text-slate-700 truncate block">{m.productOrService || 'No especificado'}</span>
                                      </div>
                                      <div className="grid grid-cols-2 gap-1 pt-1 border-t border-slate-50">
                                        <div>
                                          <span className="block text-[8px] text-slate-400">Facturado</span>
                                          <span className="font-bold text-slate-700">${billed.toLocaleString('es-AR')}</span>
                                        </div>
                                        <div>
                                          <span className="block text-[8px] text-emerald-600">Ganancia</span>
                                          <span className="font-bold text-emerald-700">${profit.toLocaleString('es-AR')}</span>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* PASO 4 — DETALLES DEL PRÉSTAMO SOLICITADO Y DOCUMENTACIÓN */}
                    {selectedApp.loanDetails && (
                      <div className="space-y-4 pt-4 border-t border-slate-100">
                        <h4 className="text-xs font-bold uppercase text-slate-500 flex items-center gap-1.5 border-b pb-1.5">
                          <FileText className="w-3.5 h-3.5 text-amber-600" /> Paso 4: Detalles del Préstamo Solicitado
                        </h4>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                          <div className="bg-slate-50 p-2.5 rounded border border-slate-100">
                            <span className="block text-[10px] text-slate-400 font-semibold uppercase">Monto Solicitado</span>
                            <span className="font-bold text-primary text-sm">${selectedApp.loanDetails.requestedAmount.toLocaleString('es-AR')}</span>
                          </div>
                          <div className="bg-slate-50 p-2.5 rounded border border-slate-100">
                            <span className="block text-[10px] text-slate-400 font-semibold uppercase">Tipo / Línea de Crédito</span>
                            <span className="font-bold text-slate-900">{selectedApp.loanDetails.creditType || 'N/A'}</span>
                          </div>
                          <div className="bg-slate-50 p-2.5 rounded border border-slate-100">
                            <span className="block text-[10px] text-slate-400 font-semibold uppercase">Frecuencia de Pago</span>
                            <span className="font-bold text-slate-900">{selectedApp.loanDetails.paymentFrequency === 'Weekly' ? 'Semanal' : 'Mensual'}</span>
                          </div>
                          <div className="bg-slate-50 p-2.5 rounded border border-slate-100">
                            <span className="block text-[10px] text-slate-400 font-semibold uppercase">Cantidad de Cuotas</span>
                            <span className="font-bold text-slate-900">{selectedApp.loanDetails.installmentsCount || 6} cuotas</span>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                          <div className="bg-slate-50 p-2.5 rounded border border-slate-100">
                            <span className="block text-[10px] text-slate-400 font-semibold uppercase">¿Es Renovación?</span>
                            <span className="font-bold text-slate-900">{selectedApp.loanDetails.isRenovation || 'No'}</span>
                          </div>
                          {selectedApp.loanDetails.isRenovation === "Si" && (
                            <div className="bg-slate-50 p-2.5 rounded border border-slate-100 sm:col-span-2">
                              <span className="block text-[10px] text-slate-400 font-semibold uppercase">Objetivo Crédito Previo</span>
                              <span className="font-bold text-slate-900">{selectedApp.loanDetails.previousCreditObjective || 'N/A'}</span>
                            </div>
                          )}
                          <div className="bg-slate-50 p-2.5 rounded border border-slate-100">
                            <span className="block text-[10px] text-slate-400 font-semibold uppercase">Destino del Crédito</span>
                            <span className="font-bold text-indigo-700">{selectedApp.loanDetails.creditUseType || 'Insumos'}</span>
                          </div>
                        </div>

                        <div className="bg-slate-50 p-3 rounded border border-slate-100 text-xs">
                          <span className="block text-[10px] text-slate-400 font-semibold uppercase mb-1">Motivo / Justificación del Microcrédito</span>
                          <p className="text-slate-700 italic leading-relaxed">
                            &quot;{selectedApp.loanDetails.justification || 'Sin justificación'}&quot;
                          </p>
                        </div>

                        {/* Detalle de Maquinaria si aplica */}
                        {selectedApp.loanDetails.creditUseType === 'Maquinaria' && selectedApp.loanDetails.machineryDetails && (
                          <div className="space-y-3 p-3.5 bg-indigo-50/40 border border-indigo-150 rounded-lg text-xs">
                            <h5 className="text-[11px] font-bold uppercase text-indigo-800 flex items-center gap-1">
                              <Calculator className="w-3.5 h-3.5" /> Detalle de la Maquinaria a Adquirir
                            </h5>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                              <div>
                                <span className="block text-[9px] text-slate-500 font-semibold uppercase">Tipo / Nombre</span>
                                <span className="font-bold text-slate-900">{selectedApp.loanDetails.machineryDetails.machineryType || 'N/A'}</span>
                              </div>
                              <div>
                                <span className="block text-[9px] text-slate-500 font-semibold uppercase">Marca</span>
                                <span className="font-bold text-slate-900">{selectedApp.loanDetails.machineryDetails.brand || 'N/A'}</span>
                              </div>
                              <div>
                                <span className="block text-[9px] text-slate-500 font-semibold uppercase">Condición</span>
                                <span className="font-bold text-slate-900">{selectedApp.loanDetails.machineryDetails.condition || 'Nueva'}</span>
                              </div>
                              {selectedApp.loanDetails.machineryDetails.condition === 'Usada' && (
                                <div>
                                  <span className="block text-[9px] text-slate-500 font-semibold uppercase">Años de uso</span>
                                  <span className="font-bold text-slate-900">{selectedApp.loanDetails.machineryDetails.usedYears || 'N/A'}</span>
                                </div>
                              )}
                              <div>
                                <span className="block text-[9px] text-slate-500 font-semibold uppercase">Garantía</span>
                                <span className="font-bold text-slate-900">
                                  {selectedApp.loanDetails.machineryDetails.hasWarranty === 'Si' ? `Sí (${selectedApp.loanDetails.machineryDetails.warrantyDuration || ''})` : 'No'}
                                </span>
                              </div>
                              <div>
                                <span className="block text-[9px] text-slate-500 font-semibold uppercase">Lugar de compra</span>
                                <span className="font-bold text-slate-900">{selectedApp.loanDetails.machineryDetails.purchasePlace || 'N/A'}</span>
                              </div>
                              <div>
                                <span className="block text-[9px] text-slate-500 font-semibold uppercase">Envío a domicilio</span>
                                <span className="font-bold text-slate-900">
                                  {selectedApp.loanDetails.machineryDetails.shippedToHome === 'Si' ? `Sí (Costo: $${(selectedApp.loanDetails.machineryDetails.shippingCost || 0).toLocaleString('es-AR')})` : 'No'}
                                </span>
                              </div>
                            </div>
                            {selectedApp.loanDetails.machineryDetails.whyThisOption && (
                              <div>
                                <span className="block text-[9px] text-slate-500 font-semibold uppercase">¿Por qué esta opción?</span>
                                <p className="text-slate-700 italic">{selectedApp.loanDetails.machineryDetails.whyThisOption}</p>
                              </div>
                            )}
                            {selectedApp.loanDetails.machineryDetails.estimatedBenefit && (
                              <div>
                                <span className="block text-[9px] text-slate-500 font-semibold uppercase">Beneficio estimado para el negocio</span>
                                <p className="text-slate-700 italic">{selectedApp.loanDetails.machineryDetails.estimatedBenefit}</p>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Fotos y Documentación */}
                        <div className="space-y-3 pt-2">
                          <h5 className="text-[11px] font-bold uppercase text-slate-500">Documentación Adjunta y Fotos</h5>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {/* DNI */}
                            <div className="space-y-1 bg-slate-50 p-2.5 rounded border border-slate-100">
                              <span className="text-[10px] font-bold text-slate-500">DNI (Frente y Dorso)</span>
                              <div className="grid grid-cols-2 gap-2 pt-1">
                                {selectedApp.personalData.dniFrontPhoto ? (
                                  <a href={selectedApp.personalData.dniFrontPhoto} target="_blank" rel="noreferrer" className="relative aspect-video rounded border overflow-hidden group">
                                    <img src={selectedApp.personalData.dniFrontPhoto} alt="DNI Front" className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                      <ExternalLink className="w-4 h-4 text-white" />
                                    </div>
                                  </a>
                                ) : <div className="aspect-video bg-slate-100 rounded flex items-center justify-center text-[10px] text-slate-400 italic">Sin foto frente</div>}
                                
                                {selectedApp.personalData.dniBackPhoto ? (
                                  <a href={selectedApp.personalData.dniBackPhoto} target="_blank" rel="noreferrer" className="relative aspect-video rounded border overflow-hidden group">
                                    <img src={selectedApp.personalData.dniBackPhoto} alt="DNI Back" className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                      <ExternalLink className="w-4 h-4 text-white" />
                                    </div>
                                  </a>
                                ) : <div className="aspect-video bg-slate-100 rounded flex items-center justify-center text-[10px] text-slate-400 italic">Sin foto dorso</div>}
                              </div>
                            </div>

                            {/* Presupuesto */}
                            <div className="space-y-1 bg-slate-50 p-2.5 rounded border border-slate-100">
                              <span className="text-[10px] font-bold text-slate-500">Comprobante de Presupuesto</span>
                              <div className="pt-1">
                                {selectedApp.loanDetails.budgetPhoto ? (
                                  <a href={selectedApp.loanDetails.budgetPhoto} target="_blank" rel="noreferrer" className="relative w-full aspect-video rounded border overflow-hidden group block">
                                    <img src={selectedApp.loanDetails.budgetPhoto} alt="Budget" className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                      <ExternalLink className="w-5 h-5 text-white" />
                                    </div>
                                  </a>
                                ) : <div className="py-4 text-center text-[10px] text-slate-400 italic bg-slate-100 rounded">Sin presupuesto cargado</div>}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* PASO 5 — DATOS DE DESEMBOLSO */}
                    <div className="space-y-3 pt-4 border-t border-slate-100">
                      <h4 className="text-xs font-bold uppercase text-slate-500 flex items-center gap-1.5 border-b pb-1.5">
                        <Landmark className="w-3.5 h-3.5 text-purple-600" /> Paso 5: Datos de Desembolso (Cuenta Bancaria / Billetera Virtual)
                      </h4>
                      {selectedApp.disbursementInfo ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                          <div className="bg-purple-50/50 p-3 rounded border border-purple-100">
                            <span className="block text-[10px] text-purple-700 font-semibold uppercase">Entidad (Banco / Billetera)</span>
                            <span className="font-bold text-purple-950 text-sm">{selectedApp.disbursementInfo.bankOrWallet || 'No especificada'}</span>
                          </div>
                          <div className="bg-slate-50 p-3 rounded border border-slate-100">
                            <span className="block text-[10px] text-slate-500 font-semibold uppercase">Titular de la Cuenta</span>
                            <span className="font-bold text-slate-900">{selectedApp.disbursementInfo.accountHolder || 'No especificado'}</span>
                          </div>
                          <div className="bg-slate-50 p-3 rounded border border-slate-100">
                            <span className="block text-[10px] text-slate-500 font-semibold uppercase">Alias</span>
                            <span className="font-bold text-indigo-700 font-mono text-sm">{selectedApp.disbursementInfo.alias || 'No especificado'}</span>
                          </div>
                          <div className="bg-slate-50 p-3 rounded border border-slate-100">
                            <span className="block text-[10px] text-slate-500 font-semibold uppercase">CBU / CVU</span>
                            <span className="font-bold text-slate-900 font-mono text-xs select-all">{selectedApp.disbursementInfo.cbu || 'No especificado'}</span>
                          </div>
                        </div>
                      ) : (
                        <div className="p-3 bg-amber-50 text-amber-800 rounded text-xs italic">
                          No se registraron datos de desembolso para esta solicitud.
                        </div>
                      )}
                    </div>

                    {/* Entrepreneur Loans & Scoring History - Scoring per loan */}
                    <div className="space-y-3 pt-6 border-t">
                      <h4 className="text-xs font-bold uppercase text-slate-400 flex items-center gap-1">
                        <History className="w-3 h-3" /> Historial de Scorings de la Emprendedora
                      </h4>
                      <p className="text-[10px] text-slate-500 leading-tight">
                        El scoring se evalúa por préstamo. A continuación se listan todos los préstamos de esta emprendedora y sus correspondientes puntajes:
                      </p>
                      
                      {(() => {
                        const entrepreneurApps = applications.filter(app => app.userId === selectedApp.userId);
                        if (entrepreneurApps.length === 0) {
                          return <div className="text-[10px] text-slate-400 italic">No se registraron otros préstamos para esta emprendedora.</div>;
                        }
                        return (
                          <div className="border border-slate-100 rounded-lg overflow-hidden bg-white shadow-sm">
                            <Table className="text-[11px]">
                              <TableHeader className="bg-slate-50">
                                <TableRow className="hover:bg-transparent">
                                  <TableHead className="py-2 px-2 h-auto text-slate-500 font-semibold select-none">Nº Préstamo</TableHead>
                                  <TableHead className="py-2 px-2 h-auto text-slate-500 font-semibold select-none text-right">Monto</TableHead>
                                  <TableHead className="py-2 px-2 h-auto text-slate-500 font-semibold select-none text-right">Estado</TableHead>
                                  <TableHead className="py-2 px-2 h-auto text-slate-500 font-semibold select-none text-right">Scoring</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {entrepreneurApps.map((app) => {
                                  const scoring = evaluations.find(e => e.applicationId === app.id);
                                  const isCurrent = app.id === selectedApp.id;
                                  return (
                                    <TableRow 
                                      key={app.id} 
                                      className={`hover:bg-slate-50/50 ${isCurrent ? 'bg-blue-50/40 hover:bg-blue-50/60 font-semibold' : ''}`}
                                    >
                                      <TableCell className="py-2 px-2">
                                        <div className="flex items-center gap-1">
                                          <span>{app.loanNumber ? `#${app.loanNumber}` : 'Borrador'}</span>
                                          {isCurrent && <Badge className="text-[8px] px-1 py-0 h-auto bg-blue-500 text-white">Actual</Badge>}
                                        </div>
                                      </TableCell>
                                      <TableCell className="py-2 px-2 text-right">${app.loanDetails.requestedAmount.toLocaleString('es-AR')}</TableCell>
                                      <TableCell className="py-2 px-2 text-right">
                                        <span className="text-[10px]">
                                          {app.status === 'Draft' ? 'Borrador' :
                                           app.status === 'Pending' ? 'Pendiente' :
                                           app.status === 'Approved' ? 'Aprobado' :
                                           app.status === 'Rejected' ? 'Rechazado' :
                                           app.status === 'Active' ? 'Activo' : 'Pagado'}
                                        </span>
                                      </TableCell>
                                      <TableCell className="py-2 px-2 text-right">
                                        {scoring ? (
                                          <Badge className={`text-[9px] px-1.5 py-0 ${
                                            scoring.status === 'APROBADO' 
                                            ? 'bg-green-100 text-green-700 border border-green-200' 
                                            : 'bg-red-100 text-red-700 border border-red-200'
                                          }`}>
                                            {scoring.totalScore} pts ({scoring.status})
                                          </Badge>
                                        ) : (
                                          <span className="text-slate-400 italic">Pendiente</span>
                                        )}
                                      </TableCell>
                                    </TableRow>
                                  );
                                })}
                              </TableBody>
                            </Table>
                          </div>
                        );
                      })()}
                    </div>

                    {/* Actions */}
                    <div className="pt-6 border-t flex flex-col gap-3 sticky bottom-0 bg-white pb-2">
                      <h4 className="text-xs font-bold uppercase text-slate-400 mb-1">Gestión de Solicitud</h4>
                      
                      {selectedApp.status === 'Draft' ? (
                        <div className="space-y-4">
                          <div className="bg-slate-50 border border-slate-200 p-4 rounded-lg flex gap-3 items-start">
                            <Clock className="w-4 h-4 text-slate-500 shrink-0 mt-0.5 animate-pulse" />
                            <div className="space-y-1">
                              <p className="text-xs font-bold text-slate-700">Solicitud en Borrador</p>
                              <p className="text-[11px] text-slate-500 leading-relaxed">
                                Esta solicitud no ha sido enviada por la emprendedora todavía. Se encuentra en etapa de edición. 
                                Como administrador no puedes aprobar ni rechazar una solicitud en borrador, pero sí puedes eliminarla.
                              </p>
                            </div>
                          </div>

                          {confirmDeleteId === selectedApp.id ? (
                            <div className="bg-red-50 border border-red-200 p-4 rounded-lg space-y-3">
                              <p className="text-xs font-bold text-red-800 flex items-center gap-1.5">
                                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" /> ¿Confirmar eliminación?
                              </p>
                              <p className="text-[11px] text-red-700 leading-relaxed">
                                Se eliminarán la solicitud y todos sus datos cargados. No se podrá recuperar esta información.
                              </p>
                              <div className="flex gap-2 justify-end">
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  onClick={() => setConfirmDeleteId(null)}
                                  className="h-8 text-xs border-slate-200 text-slate-600 hover:bg-slate-100"
                                >
                                  Cancelar
                                </Button>
                                <Button 
                                  size="sm" 
                                  onClick={() => deleteApplicationAndData(selectedApp.id)}
                                  className="h-8 text-xs bg-red-600 hover:bg-red-700 text-white"
                                >
                                  Eliminar Definitivamente
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <Button 
                              onClick={() => setConfirmDeleteId(selectedApp.id)}
                              className="w-full bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 animate-pulse hover:animate-none"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Eliminar Solicitud en Borrador
                            </Button>
                          )}
                        </div>
                      ) : (
                        <>
                          {/* Comentarios de Evaluación */}
                          <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg space-y-2 mb-3">
                            <div className="flex items-center justify-between">
                              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                                <MessageSquare className="w-3.5 h-3.5 text-purple-600" />
                                Comentarios de Evaluación / Observaciones
                              </label>
                              {(selectedApp.adminComments || '') !== adminCommentInput && (
                                <span className="text-[10px] text-amber-600 font-medium italic">Sin guardar</span>
                              )}
                            </div>
                            <Textarea
                              value={adminCommentInput}
                              onChange={(e) => setAdminCommentInput(e.target.value)}
                              placeholder="Agrega comentarios u observaciones sobre esta solicitud (motivos, acuerdos, etc.)..."
                              className="text-xs min-h-[70px] bg-white border-slate-200 resize-y"
                            />
                            <div className="flex justify-end">
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={handleSaveComment}
                                disabled={isSavingComment || (selectedApp.adminComments || '') === adminCommentInput}
                                className="h-7 text-xs border-purple-200 text-purple-700 hover:bg-purple-50"
                              >
                                <Save className="w-3 h-3 mr-1" />
                                {isSavingComment ? "Guardando..." : "Guardar Comentario"}
                              </Button>
                            </div>
                          </div>

                          {(() => {
                            const scoring = getScoringData(selectedApp.id);
                            if (!scoring) {
                              return (
                                <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg flex gap-3 items-start mb-2">
                                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                                  <div className="space-y-1">
                                    <p className="text-[11px] font-bold text-amber-800">Scoring Pendiente</p>
                                    <p className="text-[10px] text-amber-700 leading-tight">Es necesario completar el scoring para habilitar la aprobación.</p>
                                    <Button 
                                      variant="link" 
                                      size="sm" 
                                      className="h-auto p-0 text-[10px] text-amber-900 font-bold"
                                      onClick={() => navigateToScoring(selectedApp.id)}
                                    >
                                      Completar Scoring Ahora <ArrowRight className="w-3 h-3 ml-1" />
                                    </Button>
                                  </div>
                                </div>
                              );
                            }
                            if (scoring.status === 'DESAPROBADO') {
                              return (
                                <div className="bg-red-50 border border-red-200 p-3 rounded-lg flex gap-3 items-start mb-2">
                                  <XCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                                  <div className="space-y-1">
                                    <p className="text-[11px] font-bold text-red-800">Scoring Desaprobado ({scoring.totalScore} pts)</p>
                                    <p className="text-[10px] text-red-700 leading-tight">La solicitud no cumple con los requisitos del scoring y no puede ser aprobada.</p>
                                    <Button 
                                      variant="link" 
                                      size="sm" 
                                      className="h-auto p-0 text-[10px] text-red-900 font-bold"
                                      onClick={() => navigateToScoring(selectedApp.id)}
                                    >
                                      Ver Detalle Scoring <ArrowRight className="w-3 h-3 ml-1" />
                                    </Button>
                                  </div>
                                </div>
                              );
                            }
                            return (
                              <div className="bg-green-50 border border-green-200 p-3 rounded-lg flex gap-3 items-center mb-2">
                                <CheckCircle className="w-4 h-4 text-green-600 shrink-0" />
                                <div className="flex-1">
                                  <p className="text-[11px] font-bold text-green-800">Scoring Aprobado ({scoring.totalScore} pts)</p>
                                </div>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="h-7 w-7 p-0 text-green-700" 
                                  onClick={() => navigateToScoring(selectedApp.id)}
                                >
                                  <Eye className="w-3 h-3" />
                                </Button>
                              </div>
                            );
                          })()}

                          {(() => {
                            const isCreatorOfApp = Boolean(
                              selectedApp.createdByUid && 
                              auth.currentUser?.uid && 
                              selectedApp.createdByUid === auth.currentUser.uid
                            );

                            return (
                              <>
                                {isCreatorOfApp && (
                                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 space-y-1 mb-3">
                                    <div className="font-bold flex items-center gap-1.5 text-amber-900">
                                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                                      Conflicto de Interés / Control Interno
                                    </div>
                                    <p className="text-slate-700 leading-relaxed">
                                      Esta solicitud fue cargada por ti por cuenta y orden de la emprendedora. Por políticas de control interno, debe ser evaluada y autorizada por otro administrador.
                                    </p>
                                  </div>
                                )}

                                {selectedApp.status === 'Approved' && (
                                  <div className="space-y-2 mb-2">
                                    <Button 
                                      variant="outline"
                                      className="w-full border-purple-300 text-purple-700 hover:bg-purple-50 font-semibold"
                                      onClick={() => handleDownloadMutuo(selectedApp)}
                                    >
                                      <FileText className="w-4 h-4 mr-2 text-purple-600" />
                                      Generar y Descargar Mutuo (PDF)
                                    </Button>

                                    <Button 
                                      className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                                      onClick={() => handleDisburse(selectedApp)}
                                      disabled={isCreatorOfApp}
                                      title={isCreatorOfApp ? "No puedes desembolsar una solicitud cargada por ti mismo" : ""}
                                    >
                                      <CheckCircle className="w-4 h-4 mr-2" />
                                      Confirmar Desembolso (Activar)
                                    </Button>
                                  </div>
                                )}

                                {(selectedApp.status === 'Active' || selectedApp.status === 'Paid') && (
                                  <div className="mb-2">
                                    <Button 
                                      variant="outline"
                                      className="w-full border-purple-300 text-purple-700 hover:bg-purple-50 font-semibold"
                                      onClick={() => handleDownloadMutuo(selectedApp)}
                                    >
                                      <FileText className="w-4 h-4 mr-2 text-purple-600" />
                                      Descargar Mutuo (PDF)
                                    </Button>
                                  </div>
                                )}

                                <div className="grid grid-cols-2 gap-2">
                                  <Button 
                                    variant="outline" 
                                    className="text-green-600 border-green-200 hover:bg-green-50"
                                    onClick={() => setStatusConfirmAction({
                                      type: 'Approved',
                                      appId: selectedApp.id,
                                      appName: `${selectedApp.personalData.firstName || ''} ${selectedApp.personalData.lastName || ''}`.trim() || selectedApp.personalData.dni || (selectedApp.loanNumber ? `#${selectedApp.loanNumber}` : selectedApp.id),
                                      amount: selectedApp.loanDetails.requestedAmount
                                    })}
                                    disabled={isCreatorOfApp || selectedApp.status === 'Approved' || selectedApp.status === 'Active'}
                                    title={isCreatorOfApp ? "No puedes aprobar una solicitud cargada por ti mismo" : ""}
                                  >
                                    <CheckCircle className="w-4 h-4 mr-2" />
                                    Aprobar
                                  </Button>
                                  <Button 
                                    variant="outline" 
                                    className="text-red-600 border-red-200 hover:bg-red-50"
                                    onClick={() => setStatusConfirmAction({
                                      type: 'Rejected',
                                      appId: selectedApp.id,
                                      appName: `${selectedApp.personalData.firstName || ''} ${selectedApp.personalData.lastName || ''}`.trim() || selectedApp.personalData.dni || (selectedApp.loanNumber ? `#${selectedApp.loanNumber}` : selectedApp.id),
                                      amount: selectedApp.loanDetails.requestedAmount
                                    })}
                                    disabled={isCreatorOfApp || selectedApp.status === 'Rejected' || selectedApp.status === 'Active' || selectedApp.status === 'Paid'}
                                    title={isCreatorOfApp ? "No puedes rechazar una solicitud cargada por ti mismo" : ""}
                                  >
                                    <XCircle className="w-4 h-4 mr-2" />
                                    Rechazar
                                  </Button>
                                </div>
                              </>
                            );
                          })()}
                        </>
                      )}
                    </div>

                    {/* Payment Validation Section */}
                    {(selectedApp.status === 'Active' || selectedApp.status === 'Paid') && selectedApp.paymentSchedule && (
                      <div id="payment-schedule-section" className="pt-8 border-t space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold uppercase text-slate-400 flex items-center gap-1">
                            <Calendar className="w-3 h-3" /> Estado de Cuenta
                          </h4>
                          <Badge variant="outline" className="text-[10px]">
                            Saldo: ${selectedApp.paymentSchedule.installments
                              .filter(i => i.status !== 'Paid')
                              .reduce((acc, i) => acc + i.amount, 0)
                              .toLocaleString('es-AR')}
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-2 mb-4">
                          <div className="bg-slate-50 p-2 rounded border border-slate-100 text-center">
                            <div className="text-[10px] text-slate-500 uppercase">Pagado</div>
                            <div className="text-sm font-bold text-green-600">
                              {selectedApp.paymentSchedule.installments.filter(i => i.status === 'Paid').length} / {selectedApp.paymentSchedule.installments.length}
                            </div>
                          </div>
                          <div className="bg-slate-50 p-2 rounded border border-slate-100 text-center">
                            <div className="text-[10px] text-slate-500 uppercase">Pendiente</div>
                            <div className="text-sm font-bold text-blue-600">
                              {selectedApp.paymentSchedule.installments.filter(i => i.status === 'Pending' && !i.paymentProofUrl).length}
                            </div>
                          </div>
                          <div className="bg-slate-50 p-2 rounded border border-slate-100 text-center">
                            <div className="text-[10px] text-slate-500 uppercase">Por Validar</div>
                            <div className="text-sm font-bold text-yellow-600">
                              {selectedApp.paymentSchedule.installments.filter(i => i.status === 'Pending' && i.paymentProofUrl).length}
                            </div>
                          </div>
                        </div>

                        <h4 className="text-[10px] font-bold uppercase text-slate-400">Detalle de Cuotas</h4>
                        <div className="space-y-3">
                          {selectedApp.paymentSchedule.installments.map((inst) => (
                            <div key={inst.number} className="p-3 bg-slate-50 rounded-lg border border-slate-100 flex items-center justify-between gap-2">
                              <div className="flex items-center gap-3">
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                                  inst.status === 'Paid' ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-500'
                                }`}>
                                  {inst.number}
                                </div>
                                <div>
                                  <div className="text-xs font-bold">${inst.amount.toLocaleString('es-AR')}</div>
                                  <div className="text-[10px] text-slate-500">Vence: {new Date(inst.dueDate).toLocaleDateString()}</div>
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                {inst.paymentProofUrl ? (
                                  <a href={inst.paymentProofUrl} target="_blank" rel="noreferrer" className="p-1.5 bg-white rounded border text-slate-600 hover:text-primary transition-colors">
                                    <ExternalLink className="w-3 h-3" />
                                  </a>
                                ) : (
                                  <label className="p-1.5 bg-white rounded border text-slate-600 hover:text-primary transition-colors cursor-pointer">
                                    <Upload className="w-3 h-3" />
                                    <input 
                                      type="file" 
                                      className="hidden" 
                                      accept="image/*,application/pdf"
                                      onChange={(e) => handleAdminUpload(e, selectedApp, inst.number)}
                                    />
                                  </label>
                                )}
                                
                                {inst.status !== 'Paid' && inst.paymentProofUrl ? (
                                  <div className="flex gap-1">
                                    <Button 
                                      size="sm" 
                                      variant="ghost" 
                                      className="h-7 w-7 p-0 text-green-600 hover:bg-green-100"
                                      onClick={() => validatePayment(selectedApp, inst.number, true)}
                                    >
                                      <Check className="w-3 h-3" />
                                    </Button>
                                    <Button 
                                      size="sm" 
                                      variant="ghost" 
                                      className="h-7 w-7 p-0 text-red-600 hover:bg-red-100"
                                      onClick={() => validatePayment(selectedApp, inst.number, false)}
                                    >
                                      <XCircle className="w-3 h-3" />
                                    </Button>
                                  </div>
                                ) : inst.status === 'Paid' ? (
                                  <Badge className="bg-green-100 text-green-700 border-none text-[10px] h-5">Validado</Badge>
                                ) : (
                                  <span className="text-[10px] text-slate-400 italic">Esperando pago</span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </div>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="collections">
          <div className="mb-4 flex items-center justify-between gap-4">
            <Button variant="ghost" size="sm" onClick={() => setActiveTab("applications")}>
              ← Volver a Solicitudes
            </Button>
            <div className="flex-1 max-w-md relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input 
                placeholder="Buscar por nombre de emprendedora..." 
                className="pl-10"
                value={collectionSearch}
                onChange={(e) => setCollectionSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card className="p-4 border-none shadow-md bg-white">
              <div className="text-xs font-bold text-slate-400 uppercase mb-1">Total a Cobrar</div>
              <div className="text-2xl font-bold text-slate-900">
                ${applications
                  .filter(app => app.status === 'Active' || app.status === 'Paid')
                  .reduce((acc, app) => acc + (app.paymentSchedule?.totalAmount || 0), 0)
                  .toLocaleString('es-AR')}
              </div>
            </Card>
            <Card className="p-4 border-none shadow-md bg-white">
              <div className="text-xs font-bold text-slate-400 uppercase mb-1">Cobrado</div>
              <div className="text-2xl font-bold text-green-600">
                ${applications
                  .filter(app => app.status === 'Active' || app.status === 'Paid')
                  .flatMap(app => app.paymentSchedule?.installments || [])
                  .filter(i => i.status === 'Paid')
                  .reduce((acc, i) => acc + i.amount, 0)
                  .toLocaleString('es-AR')}
              </div>
            </Card>
            <Card className="p-4 border-none shadow-md bg-white">
              <div className="text-xs font-bold text-slate-400 uppercase mb-1">Pendiente</div>
              <div className="text-2xl font-bold text-blue-600">
                ${applications
                  .filter(app => app.status === 'Active' || app.status === 'Paid')
                  .flatMap(app => app.paymentSchedule?.installments || [])
                  .filter(i => i.status !== 'Paid')
                  .reduce((acc, i) => acc + i.amount, 0)
                  .toLocaleString('es-AR')}
              </div>
            </Card>
            <Card className="p-4 border-none shadow-md bg-white">
              <div className="text-xs font-bold text-slate-400 uppercase mb-1">Préstamos Activos</div>
              <div className="text-2xl font-bold text-emerald-600">
                {applications.filter(app => app.status === 'Active').length}
              </div>
            </Card>
          </div>

          <Card className="border-none shadow-xl">
            <CardHeader>
              <CardTitle>Gestión de Cobranzas</CardTitle>
              <CardDescription>Seguimiento de cuotas pendientes y validación de comprobantes de pago.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border overflow-x-auto scrollbar-thin scrollbar-thumb-slate-200">
                <Table className="min-w-[800px] lg:min-w-0">
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      {renderCollectionTableHead("Nº Préstamo", "loanNumber")}
                      {renderCollectionTableHead("Emprendedora", "name")}
                      {renderCollectionTableHead("Cuota", "installment")}
                      {renderCollectionTableHead("Monto", "amount")}
                      {renderCollectionTableHead("Vencimiento", "dueDate")}
                      <TableHead className="whitespace-nowrap">Comprobante</TableHead>
                      {renderCollectionTableHead("Acción", "status", "right")}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedCollectionItems.map(({ app, inst }) => (
                      <TableRow key={`${app.id}-${inst.number}`} className={inst.status === 'Paid' ? 'opacity-50' : ''}>
                        <TableCell className="font-mono text-slate-600">
                          {app.loanNumber ? `#${app.loanNumber}` : '-'}
                        </TableCell>
                        <TableCell>
                          <div className="font-medium text-slate-900">{app.personalData.lastName}, {app.personalData.firstName}</div>
                        </TableCell>
                        <TableCell>#{inst.number}</TableCell>
                        <TableCell className="font-bold">${inst.amount.toLocaleString('es-AR')}</TableCell>
                        <TableCell>{new Date(inst.dueDate).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {inst.paymentProofUrl ? (
                              <a href={inst.paymentProofUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-primary hover:underline text-xs">
                                <ExternalLink className="w-3 h-3" /> Ver
                              </a>
                            ) : (
                              <label className="flex items-center gap-1 text-primary hover:underline text-xs cursor-pointer">
                                <Upload className="w-3 h-3" /> Subir
                                <input 
                                  type="file" 
                                  className="hidden" 
                                  accept="image/*,application/pdf"
                                  onChange={(e) => handleAdminUpload(e, app, inst.number)}
                                />
                              </label>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          {inst.status === 'Paid' ? (
                            <Badge className="bg-green-100 text-green-700">Pagado</Badge>
                          ) : inst.paymentProofUrl ? (
                            <div className="flex justify-end gap-1">
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="h-8 text-green-600"
                                onClick={() => validatePayment(app, inst.number, true)}
                              >
                                Validar
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="h-8 text-red-600"
                                onClick={() => validatePayment(app, inst.number, false)}
                              >
                                Rechazar
                              </Button>
                            </div>
                          ) : (
                            <Badge variant="outline" className="text-slate-400">Esperando</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                    {sortedCollectionItems.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-slate-500">No hay préstamos activos con cuotas pendientes.</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="scoring">
          <ScoringManager 
            initialAppId={scoringAppId} 
            onBack={() => setActiveTab("applications")} 
          />
        </TabsContent>

        <TabsContent value="settings">
          <SettingsManager />
        </TabsContent>
      </Tabs>

      {showMultiDeleteConfirm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[500] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full border border-slate-100 overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-6 pb-4 border-b border-slate-100 bg-red-50/50 flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-600 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-900">¿Confirmar Eliminación Permanente?</h3>
                <p className="text-[11px] text-slate-500">
                  Esta acción es irreversible. Se eliminarán permanentemente el préstamo y todas las evaluaciones de scoring asociadas de los {selectedDeleteIds.length} {selectedDeleteIds.length === 1 ? 'préstamo seleccionado' : 'préstamos seleccionados'}.
                </p>
              </div>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Detalle del contenido que se eliminará:</p>
              <div className="border border-slate-100 rounded-lg overflow-hidden bg-slate-50/50">
                <Table className="text-xs">
                  <TableHeader className="bg-slate-100">
                    <TableRow>
                      <TableHead className="py-2 px-3 font-semibold text-slate-600">ID / Nº Préstamo</TableHead>
                      <TableHead className="py-2 px-3 font-semibold text-slate-600">Emprendedora / Email</TableHead>
                      <TableHead className="py-2 px-3 font-semibold text-slate-600 text-right">Datos Adjuntos</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {applications
                      .filter(app => selectedDeleteIds.includes(app.id))
                      .map(app => {
                        const relatedEval = evaluations.find(e => e.applicationId === app.id);
                        return (
                          <TableRow key={app.id} className="hover:bg-slate-100/50">
                            <TableCell className="font-mono font-bold py-2 px-3 text-slate-500">
                              {app.loanNumber ? `#${app.loanNumber}` : "Borrador"}
                            </TableCell>
                            <TableCell className="py-2 px-3">
                              <div className="font-medium text-slate-800">{app.personalData?.lastName}, {app.personalData?.firstName}</div>
                              <div className="text-[10px] text-slate-400">{app.userEmail}</div>
                            </TableCell>
                            <TableCell className="py-2 px-3 text-right text-[10px] text-slate-500 font-medium">
                              {relatedEval ? (
                                <Badge className="bg-red-100 text-red-700 border-red-200 py-0 h-auto text-[9px] font-bold">
                                  Scoring ({relatedEval.totalScore} pts)
                                </Badge>
                              ) : (
                                <span className="text-slate-400">Sin scoring</span>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                  </TableBody>
                </Table>
              </div>
              <div className="bg-amber-50 border border-amber-150 rounded-lg p-3 text-amber-800 text-[11px] leading-relaxed flex gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Aviso Importante:</strong> Al proceder, las solicitudes, las evaluaciones de scoring vinculadas y cualquier otro registro histórico de estos {selectedDeleteIds.length} préstamos en Firestore serán eliminados por completo del sistema.
                </span>
              </div>
            </div>
            
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-2 justify-end">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowMultiDeleteConfirm(false)}
                className="h-9 text-xs border-slate-200 text-slate-700 hover:bg-slate-100 px-4"
              >
                Cancelar
              </Button>
              <Button 
                size="sm" 
                onClick={async () => {
                  try {
                    await deleteMultipleApplicationsAndData(selectedDeleteIds);
                  } finally {
                    setShowMultiDeleteConfirm(false);
                    setIsSelectionMode(false);
                    setSelectedDeleteIds([]);
                  }
                }}
                className="h-9 text-xs bg-red-600 hover:bg-red-700 text-white font-bold px-4 shadow-sm"
              >
                Eliminar para Siempre
              </Button>
            </div>
          </div>
        </div>
      )}

      {statusConfirmAction && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[500] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full border border-slate-100 overflow-hidden flex flex-col p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                statusConfirmAction.type === 'Approved' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
              }`}>
                {statusConfirmAction.type === 'Approved' ? (
                  <CheckCircle className="w-5 h-5" />
                ) : (
                  <XCircle className="w-5 h-5" />
                )}
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-900">
                  {statusConfirmAction.type === 'Approved' 
                    ? '¿Confirmar Aprobación de Solicitud?' 
                    : '¿Confirmar Rechazo de Solicitud?'}
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {statusConfirmAction.type === 'Approved' ? (
                    <>
                      ¿Estás seguro de que deseas <strong className="text-green-700 font-semibold">aprobar</strong> la solicitud de préstamo de <strong>{statusConfirmAction.appName}</strong>
                      {statusConfirmAction.amount ? ` por $${statusConfirmAction.amount.toLocaleString('es-AR')}` : ''}?
                    </>
                  ) : (
                    <>
                      ¿Estás seguro de que deseas <strong className="text-red-700 font-semibold">rechazar</strong> la solicitud de préstamo de <strong>{statusConfirmAction.appName}</strong>?
                    </>
                  )}
                </p>
                <p className="text-[11px] text-slate-500 pt-1">
                  {statusConfirmAction.type === 'Approved'
                    ? 'La solicitud cambiará a estado "Aprobada" y quedará habilitada para la generación de mutuo y desembolso.'
                    : 'La solicitud cambiará a estado "Rechazada".'}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setStatusConfirmAction(null)}
                className="h-8 text-xs border-slate-200 text-slate-700 hover:bg-slate-50"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={async () => {
                  const action = statusConfirmAction;
                  setStatusConfirmAction(null);
                  if (action) {
                    await updateStatus(action.appId, action.type);
                  }
                }}
                className={`h-8 text-xs font-semibold text-white ${
                  statusConfirmAction.type === 'Approved'
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {statusConfirmAction.type === 'Approved' ? 'Sí, Aprobar Solicitud' : 'Sí, Rechazar Solicitud'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
