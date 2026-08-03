export type LoanStep = 1 | 2 | 3 | 4 | 5;

export interface PersonalData {
  lastName: string;
  firstName: string;
  cuil: string;
  dni: string;
  birthDate: string;
  phone: string;
  address: string;
  neighborhood: string;
  neighborhoodOption?: string;
  civilStatus: string;
  educationLevel: string;
  householdSize: number;
  dniFrontPhoto?: string;
  dniBackPhoto?: string;
  presentationDate?: string;
  creditNumberM2000?: string;
  previousCreditAmount?: number;
}

export interface IncomeSource {
  name?: string;
  amount: number;
  isFixed: boolean;
}

export interface DetailedIncomes {
  partner: IncomeSource;         // Pareja
  applicant: IncomeSource;       // Destinataria
  family3: IncomeSource;         // Familiar 3, Nombre
  family4: IncomeSource;         // Familiar 4, Nombre
  others: IncomeSource;          // Otros
  stateAssistance: IncomeSource; // Ingreso del Estado (AUH, etc.)
}

export interface ExpenseSource {
  amount: number;
  varies: boolean;
}

export interface DetailedExpenses {
  // Vivienda
  alquiler: ExpenseSource;
  agua: ExpenseSource;
  luz: ExpenseSource;
  gas: ExpenseSource;
  // Transporte
  sube: ExpenseSource;
  naftaRemis: ExpenseSource;
  // Comunicación
  telefonoCelular: ExpenseSource;
  internet: ExpenseSource;
  cable: ExpenseSource;
  // Alimentación
  comidaMercaderia: ExpenseSource;
  // Deudas y obligaciones
  cuotasDeudas: ExpenseSource;
  seguros: ExpenseSource;
  impuestos: ExpenseSource;
  // Familia
  educacion: ExpenseSource;
  salud: ExpenseSource;
  ropaCalzado: ExpenseSource;
  // Otros gastos
  mascotas: ExpenseSource;
  cigarrillos: ExpenseSource;
  naftaOtros: ExpenseSource;
  otrosDetalle: {
    name?: string;
    amount: number;
    varies: boolean;
  };
}

export interface HouseholdFinance {
  fixedIncome: number;
  variableIncome: number;
  expenseFoodRent: number;
  expenseServices: number;
  detailedIncomes?: DetailedIncomes;
  detailedExpenses?: DetailedExpenses;
  debtInstallments?: number;
  incomeEarnersCount?: number;
}

export interface ProductItem {
  id: string;
  name: string;
  unitCost: number;
  unitPrice: number;
  weeklyQty: number;
}

export interface AccountingMonth {
  period: string;
  productOrService: string;
  totalBilled: number;
  profit: number;
}

export interface EntrepreneurshipData {
  name: string;
  activity: string;
  seniority: string;
  description: string;
  type: 'Comercial' | 'Productivo' | 'Servicios';
  socialNetworks?: string;
  salesPlace?: string;
  // Commercial fields
  avgPurchaseCost?: number;
  avgSalePrice?: number;
  estWeeklySales?: number;
  // Productive fields
  weeklyInputCost?: number;
  weeklyProductionQty?: number;
  unitProductionCost?: number;
  
  // New operational and budget fields
  isRunning?: string;
  notRunningReason?: string;
  products?: ProductItem[];
  fixedCosts?: number;
  travelExpenses?: number;
  netWeeklyProfit?: number;
  netMonthlyProfit?: number;
  accountingMonths?: AccountingMonth[];
}

export interface MachineryDetails {
  machineryType?: string;
  brand?: string;
  condition?: 'Nueva' | 'Usada';
  usedYears?: string;
  hasWarranty?: 'Si' | 'No';
  warrantyDuration?: string;
  purchasePlace?: string;
  shippedToHome?: 'Si' | 'No';
  shippingCost?: number;
  whyThisOption?: string;
  estimatedBenefit?: string;
  machineryPhotos?: string[];
}

export interface LoanDetails {
  creditType: string;
  requestedAmount: number;
  paymentFrequency: 'Weekly' | 'Monthly';
  installmentsCount: number;
  justification: string;
  budgetPhoto?: string;
  comments?: string;
  
  // New PDF conditional fields
  isRenovation?: string;
  previousCreditObjective?: string;
  creditUseType?: 'Insumos' | 'Maquinaria';
  machineryDetails?: MachineryDetails;
}

export interface DisbursementInfo {
  bankOrWallet: string;
  accountHolder: string;
  alias: string;
  cbu?: string;
}

export interface Installment {
  number: number;
  dueDate: string;
  amount: number;
  status: 'Pending' | 'Paid' | 'Overdue';
  paymentProofUrl?: string;
  paymentDate?: string;
  adminNotes?: string;
}

export interface PaymentSchedule {
  installments: Installment[];
  totalAmount: number;
  interestRate: number;
  startDate: string;
}

export interface LoanProduct {
  id: string;
  name: string;
  minAmount: number;
  maxAmount: number;
  interestRate: number;
  maxInstallments: number;
}

export interface ScoringQuestion {
  id: string;
  section: 'A' | 'B';
  text: string;
  type: 'three-options' | 'boolean';
  options?: {
    positive: string;
    medium?: string;
    negative: string;
  };
}

export interface ScoringConfig {
  questions: ScoringQuestion;
  passingScore: number;
}

export interface ScoringEvaluation {
  id: string;
  applicationId: string;
  entrepreneurName: string;
  date: string;
  answers: Record<string, number>;
  totalScore: number;
  status: 'APROBADO' | 'DESAPROBADO';
}

export interface InstitutionalData {
  orgName: string;
  legalAddress: string;
  website: string;
  phone: string;
  repName: string;
  repDni: string;
  repRole: string;
  signatureLocation: string;
}

export interface AppSettings {
  loanProducts: LoanProduct[];
  neighborhoods: string[];
  civilStatuses: string[];
  educationLevels: string[];
  activities: string[];
  salesPlaces?: string[];
  whatsappNumber?: string;
  allowMultipleLoans?: boolean;
  lastAssignedLoanNumber?: number;
  institutionalData?: InstitutionalData;
  scoringConfig: {
    questions: ScoringQuestion[];
    passingScore: number;
  };
}

export interface LoanApplication {
  id: string;
  userId: string;
  userEmail: string;
  status: 'Draft' | 'Pending' | 'Approved' | 'Rejected' | 'Active' | 'Paid';
  step: LoanStep;
  personalData: PersonalData;
  householdFinance: HouseholdFinance;
  entrepreneurshipData: EntrepreneurshipData;
  loanDetails: LoanDetails;
  disbursementInfo: DisbursementInfo;
  paymentSchedule?: PaymentSchedule;
  createdAt: string;
  updatedAt: string;
  approvedAt?: string;
  submittedAt?: string;
  rejectedAt?: string;
  loanNumber?: number;
  mutuoGeneratedAt?: string;
  createdByUid?: string;
  createdByName?: string;
  createdOnBehalf?: boolean;
}

export interface UserProfile {
  uid: string;
  email: string;
  role: 'admin' | 'user';
  displayName?: string;
  canCreateOnBehalf?: boolean;
}
