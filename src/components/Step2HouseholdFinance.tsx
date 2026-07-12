import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { HouseholdFinance, DetailedIncomes, IncomeSource, DetailedExpenses, ExpenseSource } from "../types";
import { 
  HelpCircle, User, Users, Heart, Coins, Landmark,
  Home, Bus, Smartphone, Utensils, CreditCard, Users2,
  TrendingUp, Wifi, Droplet, Lightbulb, Flame, Award, HeartPulse
} from "lucide-react";

interface Props {
  data: HouseholdFinance;
  onChange: (data: HouseholdFinance) => void;
  validationErrors?: string[];
}

export default function Step2HouseholdFinance({ data, onChange, validationErrors }: Props) {
  // Safe default initialization of sub-fields to handle backwards compatibility and older drafts gracefully
  const detailed: DetailedIncomes = {
    partner: data.detailedIncomes?.partner || { amount: 0, isFixed: true },
    applicant: data.detailedIncomes?.applicant || { amount: 0, isFixed: true },
    family3: data.detailedIncomes?.family3 || { name: "", amount: 0, isFixed: true },
    family4: data.detailedIncomes?.family4 || { name: "", amount: 0, isFixed: true },
    others: data.detailedIncomes?.others || { amount: 0, isFixed: false },
    stateAssistance: data.detailedIncomes?.stateAssistance || { amount: 0, isFixed: true },
  };

  const expenses: DetailedExpenses = {
    alquiler: data.detailedExpenses?.alquiler || { amount: 0, varies: false },
    agua: data.detailedExpenses?.agua || { amount: 0, varies: false },
    luz: data.detailedExpenses?.luz || { amount: 0, varies: false },
    gas: data.detailedExpenses?.gas || { amount: 0, varies: false },
    sube: data.detailedExpenses?.sube || { amount: 0, varies: false },
    naftaRemis: data.detailedExpenses?.naftaRemis || { amount: 0, varies: false },
    telefonoCelular: data.detailedExpenses?.telefonoCelular || { amount: 0, varies: false },
    internet: data.detailedExpenses?.internet || { amount: 0, varies: false },
    cable: data.detailedExpenses?.cable || { amount: 0, varies: false },
    comidaMercaderia: data.detailedExpenses?.comidaMercaderia || { amount: 0, varies: false },
    cuotasDeudas: data.detailedExpenses?.cuotasDeudas || { amount: 0, varies: false },
    seguros: data.detailedExpenses?.seguros || { amount: 0, varies: false },
    impuestos: data.detailedExpenses?.impuestos || { amount: 0, varies: false },
    educacion: data.detailedExpenses?.educacion || { amount: 0, varies: false },
    salud: data.detailedExpenses?.salud || { amount: 0, varies: false },
    ropaCalzado: data.detailedExpenses?.ropaCalzado || { amount: 0, varies: false },
    mascotas: data.detailedExpenses?.mascotas || { amount: 0, varies: false },
    cigarrillos: data.detailedExpenses?.cigarrillos || { amount: 0, varies: false },
    naftaOtros: data.detailedExpenses?.naftaOtros || { amount: 0, varies: false },
    otrosDetalle: data.detailedExpenses?.otrosDetalle || { name: "", amount: 0, varies: false }
  };

  const updateDetailed = (key: keyof DetailedIncomes, updates: Partial<IncomeSource>) => {
    const newDetailed = {
      ...detailed,
      [key]: {
        ...detailed[key],
        ...updates
      }
    };

    // Recalculate fixed and variable incomes sum on-the-fly
    let newFixed = 0;
    let newVariable = 0;

    Object.keys(newDetailed).forEach((k) => {
      const source = newDetailed[k as keyof DetailedIncomes];
      const amt = Number(source.amount || 0);
      if (source.isFixed) {
        newFixed += amt;
      } else {
        newVariable += amt;
      }
    });

    onChange({
      ...data,
      detailedIncomes: newDetailed,
      fixedIncome: newFixed,
      variableIncome: newVariable
    });
  };

  const updateExpense = (key: keyof DetailedExpenses, updates: Partial<ExpenseSource> | Partial<{ name: string; amount: number; varies: boolean }>) => {
    const newExpenses = {
      ...expenses,
      [key]: {
        ...expenses[key],
        ...updates
      }
    };

    // Recalculate food & rent (expenseFoodRent) versus services & other (expenseServices)
    const comidaAmt = Number(newExpenses.comidaMercaderia.amount || 0);
    const alquilerAmt = Number(newExpenses.alquiler.amount || 0);

    let otherSum = 0;
    Object.keys(newExpenses).forEach((k) => {
      if (k !== "comidaMercaderia" && k !== "alquiler") {
        const item = newExpenses[k as keyof DetailedExpenses];
        otherSum += Number(item.amount || 0);
      }
    });

    // Extract current debt payments to register separately
    const debtAmt = Number(newExpenses.cuotasDeudas.amount || 0);

    onChange({
      ...data,
      detailedExpenses: newExpenses,
      expenseFoodRent: comidaAmt + alquilerAmt,
      expenseServices: otherSum,
      debtInstallments: debtAmt
    });
  };

  const isInvalid = (field: string) => validationErrors?.includes(field);

  const totalIncomes = Number(data.fixedIncome || 0) + Number(data.variableIncome || 0);
  const totalExpenses = Number(data.expenseFoodRent || 0) + Number(data.expenseServices || 0);
  const surplus = totalIncomes - totalExpenses;

  return (
    <div className="space-y-6">
      
      {/* Dynamic guidance panel */}
      <div className="bg-indigo-50/50 border border-indigo-150 rounded-xl p-4 text-xs text-indigo-950 leading-relaxed space-y-1.5 shadow-xs">
        <div className="flex items-center gap-1.5">
          <HelpCircle className="w-4 h-4 text-indigo-600 flex-shrink-0" />
          <span className="font-bold text-sm text-indigo-900">¿Cómo completar tus ingresos mensuales?</span>
        </div>
        <p className="text-slate-600">
          Por favor, ingresa los montos mensuales estimados que aporta cada miembro o beneficio al hogar. Selecciona <strong>SÍ</strong> si es un ingreso fijo y recurrente o <strong>NO</strong> si es informal o variable.
        </p>
      </div>

      {/* General household parameters */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="incomeEarnersCount" className="text-sm font-semibold text-slate-900 flex items-center gap-1.5">
            <Users className="w-4 h-4 text-indigo-600" />
            Cantidad de aportantes del hogar
          </Label>
          <p className="text-2xs text-slate-500">¿Cuántas personas del hogar aportan ingresos al presupuesto familiar?</p>
          <Input 
            id="incomeEarnersCount"
            type="number"
            min={1}
            value={data.incomeEarnersCount || 1}
            onChange={(e) => {
              const val = e.target.value;
              onChange({ 
                ...data, 
                incomeEarnersCount: val === "" ? 1 : Math.max(1, parseInt(val)) 
              });
            }}
            className="bg-white"
          />
        </div>
      </div>

      {/* --- INCOMES SECTION --- */}
      <div className="space-y-3">
        <div className="bg-slate-100 p-2 text-center rounded-lg border border-slate-200">
          <span className="text-sm font-bold uppercase tracking-wider text-slate-700">DETALLE DE INGRESOS MENSUALES</span>
        </div>

        {/* Desktop Headers */}
        <div className="hidden md:grid grid-cols-12 bg-indigo-50/70 border border-indigo-100 rounded-lg p-2.5 text-xs font-bold text-indigo-900 mb-1 text-center">
          <div className="col-span-12 md:col-span-5 text-left pl-2">Origen / Miembro del Hogar</div>
          <div className="col-span-12 md:col-span-4">Monto Mensual ($)</div>
          <div className="col-span-12 md:col-span-3">¿Es un ingreso fijo?</div>
        </div>

        {/* Rows list */}
        <div className="space-y-2.5">
          
          {/* 1. Destinataria */}
          <div className="border border-slate-200 rounded-xl p-3 md:p-2.5 bg-white hover:border-indigo-300 transition-colors shadow-2xs">
            <div className="grid grid-cols-12 gap-y-2.5 gap-x-4 items-center">
              <div className="col-span-12 md:col-span-5 flex items-center gap-2.5">
                <div className="bg-indigo-50 p-2 rounded-lg text-indigo-700 shrink-0">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold text-slate-800 text-sm">Destinataria (Tú)</span>
                  <p className="text-2xs text-slate-500">Tus ingresos laborales, de autoempleo o ventas</p>
                </div>
              </div>
              <div className="col-span-12 sm:col-span-7 md:col-span-4">
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-semibold">$</span>
                  <Input 
                    type="number"
                    value={detailed.applicant.amount || ""} 
                    onChange={(e) => updateDetailed("applicant", { amount: parseFloat(e.target.value) || 0 })} 
                    placeholder="0"
                    className="pl-6 h-9 focus-visible:ring-indigo-500 text-sm"
                  />
                </div>
              </div>
              <div className="col-span-12 sm:col-span-5 md:col-span-3 flex justify-end md:justify-center">
                <div className="flex rounded-md p-0.5 bg-slate-100 border border-slate-200 w-full max-w-[120px]">
                  <button
                    type="button"
                    onClick={() => updateDetailed("applicant", { isFixed: true })}
                    className={`flex-1 text-center py-1 rounded text-2xs font-bold transition-all ${
                      detailed.applicant.isFixed 
                        ? "bg-emerald-600 text-white shadow-xs" 
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    SÍ
                  </button>
                  <button
                    type="button"
                    onClick={() => updateDetailed("applicant", { isFixed: false })}
                    className={`flex-1 text-center py-1 rounded text-2xs font-bold transition-all ${
                      !detailed.applicant.isFixed 
                        ? "bg-amber-500 text-white shadow-xs" 
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    NO
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* 2. Pareja */}
          <div className="border border-slate-200 rounded-xl p-3 md:p-2.5 bg-white hover:border-indigo-300 transition-colors shadow-2xs">
            <div className="grid grid-cols-12 gap-y-2.5 gap-x-4 items-center">
              <div className="col-span-12 md:col-span-5 flex items-center gap-2.5">
                <div className="bg-pink-50 p-2 rounded-lg text-pink-600 shrink-0">
                  <Heart className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold text-slate-800 text-sm">Pareja</span>
                  <p className="text-2xs text-slate-500">Aportes mensuales del cónyuge o pareja conviviente</p>
                </div>
              </div>
              <div className="col-span-12 sm:col-span-7 md:col-span-4">
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-semibold">$</span>
                  <Input 
                    type="number"
                    value={detailed.partner.amount || ""} 
                    onChange={(e) => updateDetailed("partner", { amount: parseFloat(e.target.value) || 0 })} 
                    placeholder="0"
                    className="pl-6 h-9 focus-visible:ring-indigo-500 text-sm"
                  />
                </div>
              </div>
              <div className="col-span-12 sm:col-span-5 md:col-span-3 flex justify-end md:justify-center">
                <div className="flex rounded-md p-0.5 bg-slate-100 border border-slate-200 w-full max-w-[120px]">
                  <button
                    type="button"
                    onClick={() => updateDetailed("partner", { isFixed: true })}
                    className={`flex-1 text-center py-1 rounded text-2xs font-bold transition-all ${
                      detailed.partner.isFixed 
                        ? "bg-emerald-600 text-white shadow-xs" 
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    SÍ
                  </button>
                  <button
                    type="button"
                    onClick={() => updateDetailed("partner", { isFixed: false })}
                    className={`flex-1 text-center py-1 rounded text-2xs font-bold transition-all ${
                      !detailed.partner.isFixed 
                        ? "bg-amber-500 text-white shadow-xs" 
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    NO
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* 3. Familiar 3 */}
          <div className="border border-slate-200 rounded-xl p-3 md:p-2.5 bg-white hover:border-indigo-300 transition-colors shadow-2xs">
            <div className="grid grid-cols-12 gap-y-2.5 gap-x-4 items-center">
              <div className="col-span-12 md:col-span-5 space-y-1.5">
                <div className="flex items-center gap-2.5">
                  <div className="bg-emerald-50 p-2 rounded-lg text-emerald-600 shrink-0">
                    <Users className="w-4 h-4" />
                  </div>
                  <span className="font-bold text-slate-800 text-sm">Familiar 3</span>
                </div>
                <Input 
                  type="text"
                  value={detailed.family3.name || ""} 
                  onChange={(e) => updateDetailed("family3", { name: e.target.value })} 
                  placeholder="Nombre o parentesco (ej: Mamá, Hermano...)"
                  className="w-full text-2xs h-8 bg-slate-50 border-slate-200"
                />
              </div>
              <div className="col-span-12 sm:col-span-7 md:col-span-4">
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-semibold">$</span>
                  <Input 
                    type="number"
                    value={detailed.family3.amount || ""} 
                    onChange={(e) => updateDetailed("family3", { amount: parseFloat(e.target.value) || 0 })} 
                    placeholder="0"
                    className="pl-6 h-9 focus-visible:ring-indigo-500 text-sm"
                  />
                </div>
              </div>
              <div className="col-span-12 sm:col-span-5 md:col-span-3 flex justify-end md:justify-center">
                <div className="flex rounded-md p-0.5 bg-slate-100 border border-slate-200 w-full max-w-[120px]">
                  <button
                    type="button"
                    onClick={() => updateDetailed("family3", { isFixed: true })}
                    className={`flex-1 text-center py-1 rounded text-2xs font-bold transition-all ${
                      detailed.family3.isFixed 
                        ? "bg-emerald-600 text-white shadow-xs" 
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    SÍ
                  </button>
                  <button
                    type="button"
                    onClick={() => updateDetailed("family3", { isFixed: false })}
                    className={`flex-1 text-center py-1 rounded text-2xs font-bold transition-all ${
                      !detailed.family3.isFixed 
                        ? "bg-amber-500 text-white shadow-xs" 
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    NO
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* 4. Familiar 4 */}
          <div className="border border-slate-200 rounded-xl p-3 md:p-2.5 bg-white hover:border-indigo-300 transition-colors shadow-2xs">
            <div className="grid grid-cols-12 gap-y-2.5 gap-x-4 items-center">
              <div className="col-span-12 md:col-span-5 space-y-1.5">
                <div className="flex items-center gap-2.5">
                  <div className="bg-emerald-50 p-2 rounded-lg text-emerald-600 shrink-0">
                    <Users className="w-4 h-4" />
                  </div>
                  <span className="font-bold text-slate-800 text-sm">Familiar 4</span>
                </div>
                <Input 
                  type="text"
                  value={detailed.family4.name || ""} 
                  onChange={(e) => updateDetailed("family4", { name: e.target.value })} 
                  placeholder="Nombre o parentesco (ej: Padre, Hijo...)"
                  className="w-full text-2xs h-8 bg-slate-50 border-slate-200"
                />
              </div>
              <div className="col-span-12 sm:col-span-7 md:col-span-4">
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-semibold">$</span>
                  <Input 
                    type="number"
                    value={detailed.family4.amount || ""} 
                    onChange={(e) => updateDetailed("family4", { amount: parseFloat(e.target.value) || 0 })} 
                    placeholder="0"
                    className="pl-6 h-9 focus-visible:ring-indigo-500 text-sm"
                  />
                </div>
              </div>
              <div className="col-span-12 sm:col-span-5 md:col-span-3 flex justify-end md:justify-center">
                <div className="flex rounded-md p-0.5 bg-slate-100 border border-slate-200 w-full max-w-[120px]">
                  <button
                    type="button"
                    onClick={() => updateDetailed("family4", { isFixed: true })}
                    className={`flex-1 text-center py-1 rounded text-2xs font-bold transition-all ${
                      detailed.family4.isFixed 
                        ? "bg-emerald-600 text-white shadow-xs" 
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    SÍ
                  </button>
                  <button
                    type="button"
                    onClick={() => updateDetailed("family4", { isFixed: false })}
                    className={`flex-1 text-center py-1 rounded text-2xs font-bold transition-all ${
                      !detailed.family4.isFixed 
                        ? "bg-amber-500 text-white shadow-xs" 
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    NO
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* 5. Otros */}
          <div className="border border-slate-200 rounded-xl p-3 md:p-2.5 bg-white hover:border-indigo-300 transition-colors shadow-2xs">
            <div className="grid grid-cols-12 gap-y-2.5 gap-x-4 items-center">
              <div className="col-span-12 md:col-span-5 space-y-1.5">
                <div className="flex items-center gap-2.5">
                  <div className="bg-amber-50 p-2 rounded-lg text-amber-600 shrink-0">
                    <Coins className="w-4 h-4" />
                  </div>
                  <span className="font-bold text-slate-800 text-sm">Otros Ingresos</span>
                </div>
                <Input 
                  type="text"
                  value={detailed.others.name || ""} 
                  onChange={(e) => updateDetailed("others", { name: e.target.value })} 
                  placeholder="Detalle (ej: changas, manutención, subsidios...)"
                  className="w-full text-2xs h-8 bg-slate-50 border-slate-200"
                />
              </div>
              <div className="col-span-12 sm:col-span-7 md:col-span-4">
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-semibold">$</span>
                  <Input 
                    type="number"
                    value={detailed.others.amount || ""} 
                    onChange={(e) => updateDetailed("others", { amount: parseFloat(e.target.value) || 0 })} 
                    placeholder="0"
                    className="pl-6 h-9 focus-visible:ring-indigo-500 text-sm"
                  />
                </div>
              </div>
              <div className="col-span-12 sm:col-span-5 md:col-span-3 flex justify-end md:justify-center">
                <div className="flex rounded-md p-0.5 bg-slate-100 border border-slate-200 w-full max-w-[120px]">
                  <button
                    type="button"
                    onClick={() => updateDetailed("others", { isFixed: true })}
                    className={`flex-1 text-center py-1 rounded text-2xs font-bold transition-all ${
                      detailed.others.isFixed 
                        ? "bg-emerald-600 text-white shadow-xs" 
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    SÍ
                  </button>
                  <button
                    type="button"
                    onClick={() => updateDetailed("others", { isFixed: false })}
                    className={`flex-1 text-center py-1 rounded text-2xs font-bold transition-all ${
                      !detailed.others.isFixed 
                        ? "bg-amber-500 text-white shadow-xs" 
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    NO
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* 6. Ingreso del Estado */}
          <div className="border border-slate-200 rounded-xl p-3 md:p-2.5 bg-white hover:border-indigo-300 transition-colors shadow-2xs">
            <div className="grid grid-cols-12 gap-y-2.5 gap-x-4 items-center">
              <div className="col-span-12 md:col-span-5 flex items-center gap-2.5">
                <div className="bg-blue-50 p-2 rounded-lg text-blue-600 shrink-0">
                  <Landmark className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold text-slate-800 text-sm">Asistencia del Estado</span>
                  <p className="text-2xs text-slate-500">Jubilaciones, pensiones, AUH, Tarjeta Alimentar, etc.</p>
                </div>
              </div>
              <div className="col-span-12 sm:col-span-7 md:col-span-4">
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-semibold">$</span>
                  <Input 
                    type="number"
                    value={detailed.stateAssistance.amount || ""} 
                    onChange={(e) => updateDetailed("stateAssistance", { amount: parseFloat(e.target.value) || 0 })} 
                    placeholder="0"
                    className="pl-6 h-9 focus-visible:ring-indigo-500 text-sm"
                  />
                </div>
              </div>
              <div className="col-span-12 sm:col-span-5 md:col-span-3 flex justify-end md:justify-center">
                <div className="flex rounded-md p-0.5 bg-slate-100 border border-slate-200 w-full max-w-[120px]">
                  <button
                    type="button"
                    onClick={() => updateDetailed("stateAssistance", { isFixed: true })}
                    className={`flex-1 text-center py-1 rounded text-2xs font-bold transition-all ${
                      detailed.stateAssistance.isFixed 
                        ? "bg-emerald-600 text-white shadow-xs" 
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    SÍ
                  </button>
                  <button
                    type="button"
                    onClick={() => updateDetailed("stateAssistance", { isFixed: false })}
                    className={`flex-1 text-center py-1 rounded text-2xs font-bold transition-all ${
                      !detailed.stateAssistance.isFixed 
                        ? "bg-amber-500 text-white shadow-xs" 
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    NO
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* TOTAL INCOMES BANNER */}
          <div className="bg-slate-900 border border-slate-850 rounded-xl p-4 md:p-3 mt-4 text-white shadow-md">
            <div className="grid grid-cols-12 gap-y-2 gap-x-4 items-center">
              <div className="col-span-12 md:col-span-5 flex items-center">
                <span className="font-extrabold uppercase tracking-wider text-xs text-slate-300">
                  TOTAL INGRESOS MENSUALES
                </span>
              </div>
              <div className="col-span-12 sm:col-span-7 md:col-span-4 flex items-center">
                <span className="font-black text-xl sm:text-2xl text-emerald-400">
                  $ {(totalIncomes || 0).toLocaleString("es-AR")}
                </span>
              </div>
              <div className="col-span-12 sm:col-span-5 md:col-span-3 text-right">
                <div className="text-[10px] uppercase text-slate-400">
                  <div>Ingresos fijos: <strong className="text-emerald-400 font-bold">${(data.fixedIncome || 0).toLocaleString("es-AR")}</strong></div>
                  <div>Ingresos variables: <strong className="text-amber-400 font-bold">${(data.variableIncome || 0).toLocaleString("es-AR")}</strong></div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* --- EXPENSES SECTION --- */}
      <div className="pt-6 border-t border-slate-200 space-y-6">
        
        {/* Header and explanation */}
        <div className="bg-rose-50/50 border border-rose-100 rounded-xl p-4 text-xs text-rose-950 leading-relaxed space-y-1.5 shadow-xs">
          <div className="flex items-center gap-1.5">
            <HelpCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            <span className="font-bold text-sm text-rose-900">¿Cómo completar tus egresos mensuales?</span>
          </div>
          <p className="text-slate-650">
            Completar los egresos mensuales de los integrantes de la familia. Completá lo que mejor recuerdes. Si no gastás en alguna categoría, dejála en blanco o poné <strong>0</strong>. Si un gasto varía mucho de mes a mes (como la luz en invierno), marcá que <strong>SÍ</strong> varía.
          </p>
        </div>

        <div className="space-y-4">
          <div className="bg-slate-100 p-2 text-center rounded-lg border border-slate-200">
            <span className="text-sm font-bold uppercase tracking-wider text-slate-700">DETALLE DE GASTOS DEL HOGAR</span>
          </div>

          {/* Desktop Headers */}
          <div className="hidden md:grid grid-cols-12 bg-rose-50/70 border border-rose-100 rounded-lg p-2.5 text-xs font-bold text-rose-900 mb-1 text-center">
            <div className="col-span-12 md:col-span-5 text-left pl-2">Categoría de Gasto</div>
            <div className="col-span-12 md:col-span-4">Monto Mensual Promedio ($)</div>
            <div className="col-span-12 md:col-span-3">¿Varía mucho mes a mes?</div>
          </div>

          <div className="space-y-6">
            
            {/* GROUP 1: VIVIENDA */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 pb-1 border-b border-rose-100">
                <Home className="w-4 h-4 text-rose-500 shrink-0" />
                <span className="text-xs font-bold uppercase text-rose-900">🏠 Vivienda</span>
              </div>

              {/* Alquiler */}
              <div className="border border-slate-200 rounded-xl p-3 md:p-2 bg-white hover:border-rose-200 transition-colors shadow-2xs">
                <div className="grid grid-cols-12 gap-y-2 gap-x-4 items-center">
                  <div className="col-span-12 md:col-span-5 pl-1.5">
                    <span className="font-semibold text-slate-800 text-xs sm:text-xs">Alquiler</span>
                  </div>
                  <div className="col-span-12 sm:col-span-7 md:col-span-4">
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-semibold">$</span>
                      <Input 
                        type="number"
                        value={expenses.alquiler.amount || ""} 
                        onChange={(e) => updateExpense("alquiler", { amount: parseFloat(e.target.value) || 0 })} 
                        placeholder="0"
                        className="pl-6 h-8 text-xs focus-visible:ring-rose-500"
                      />
                    </div>
                  </div>
                  <div className="col-span-12 sm:col-span-5 md:col-span-3 flex justify-end md:justify-center">
                    <div className="flex rounded-md p-0.5 bg-slate-100 border border-slate-200 w-full max-w-[120px]">
                      <button
                        type="button"
                        onClick={() => updateExpense("alquiler", { varies: true })}
                        className={`flex-1 text-center py-0.5 rounded text-[10px] font-bold transition-all ${
                          expenses.alquiler.varies 
                            ? "bg-rose-500 text-white shadow-xs" 
                            : "text-slate-500 hover:text-slate-850"
                        }`}
                      >
                        SÍ
                      </button>
                      <button
                        type="button"
                        onClick={() => updateExpense("alquiler", { varies: false })}
                        className={`flex-1 text-center py-0.5 rounded text-[10px] font-bold transition-all ${
                          !expenses.alquiler.varies 
                            ? "bg-slate-350 text-slate-900 shadow-xs" 
                            : "text-slate-500 hover:text-slate-850"
                        }`}
                      >
                        NO
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Agua */}
              <div className="border border-slate-200 rounded-xl p-3 md:p-2 bg-white hover:border-rose-200 transition-colors shadow-2xs">
                <div className="grid grid-cols-12 gap-y-2 gap-x-4 items-center">
                  <div className="col-span-12 md:col-span-5 pl-1.5">
                    <span className="font-semibold text-slate-800 text-xs sm:text-xs">Agua</span>
                  </div>
                  <div className="col-span-12 sm:col-span-7 md:col-span-4">
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-semibold">$</span>
                      <Input 
                        type="number"
                        value={expenses.agua.amount || ""} 
                        onChange={(e) => updateExpense("agua", { amount: parseFloat(e.target.value) || 0 })} 
                        placeholder="0"
                        className="pl-6 h-8 text-xs focus-visible:ring-rose-500"
                      />
                    </div>
                  </div>
                  <div className="col-span-12 sm:col-span-5 md:col-span-3 flex justify-end md:justify-center">
                    <div className="flex rounded-md p-0.5 bg-slate-100 border border-slate-200 w-full max-w-[120px]">
                      <button
                        type="button"
                        onClick={() => updateExpense("agua", { varies: true })}
                        className={`flex-1 text-center py-0.5 rounded text-[10px] font-bold transition-all ${
                          expenses.agua.varies 
                            ? "bg-rose-500 text-white shadow-xs" 
                            : "text-slate-500 hover:text-slate-855"
                        }`}
                      >
                        SÍ
                      </button>
                      <button
                        type="button"
                        onClick={() => updateExpense("agua", { varies: false })}
                        className={`flex-1 text-center py-0.5 rounded text-[10px] font-bold transition-all ${
                          !expenses.agua.varies 
                            ? "bg-slate-350 text-slate-900 shadow-xs" 
                            : "text-slate-500 hover:text-slate-855"
                        }`}
                      >
                        NO
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Luz */}
              <div className="border border-slate-200 rounded-xl p-3 md:p-2 bg-white hover:border-rose-200 transition-colors shadow-2xs">
                <div className="grid grid-cols-12 gap-y-2 gap-x-4 items-center">
                  <div className="col-span-12 md:col-span-5 pl-1.5">
                    <span className="font-semibold text-slate-800 text-xs sm:text-xs">Luz</span>
                  </div>
                  <div className="col-span-12 sm:col-span-7 md:col-span-4">
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-semibold">$</span>
                      <Input 
                        type="number"
                        value={expenses.luz.amount || ""} 
                        onChange={(e) => updateExpense("luz", { amount: parseFloat(e.target.value) || 0 })} 
                        placeholder="0"
                        className="pl-6 h-8 text-xs focus-visible:ring-rose-500"
                      />
                    </div>
                  </div>
                  <div className="col-span-12 sm:col-span-5 md:col-span-3 flex justify-end md:justify-center">
                    <div className="flex rounded-md p-0.5 bg-slate-100 border border-slate-200 w-full max-w-[120px]">
                      <button
                        type="button"
                        onClick={() => updateExpense("luz", { varies: true })}
                        className={`flex-1 text-center py-0.5 rounded text-[10px] font-bold transition-all ${
                          expenses.luz.varies 
                            ? "bg-rose-500 text-white shadow-xs" 
                            : "text-slate-500 hover:text-slate-855"
                        }`}
                      >
                        SÍ
                      </button>
                      <button
                        type="button"
                        onClick={() => updateExpense("luz", { varies: false })}
                        className={`flex-1 text-center py-0.5 rounded text-[10px] font-bold transition-all ${
                          !expenses.luz.varies 
                            ? "bg-slate-350 text-slate-900 shadow-xs" 
                            : "text-slate-500 hover:text-slate-855"
                        }`}
                      >
                        NO
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Gas */}
              <div className="border border-slate-200 rounded-xl p-3 md:p-2 bg-white hover:border-rose-200 transition-colors shadow-2xs">
                <div className="grid grid-cols-12 gap-y-2 gap-x-4 items-center">
                  <div className="col-span-12 md:col-span-5 pl-1.5">
                    <span className="font-semibold text-slate-800 text-xs sm:text-xs">Gas</span>
                  </div>
                  <div className="col-span-12 sm:col-span-7 md:col-span-4">
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-semibold">$</span>
                      <Input 
                        type="number"
                        value={expenses.gas.amount || ""} 
                        onChange={(e) => updateExpense("gas", { amount: parseFloat(e.target.value) || 0 })} 
                        placeholder="0"
                        className="pl-6 h-8 text-xs focus-visible:ring-rose-500"
                      />
                    </div>
                  </div>
                  <div className="col-span-12 sm:col-span-5 md:col-span-3 flex justify-end md:justify-center">
                    <div className="flex rounded-md p-0.5 bg-slate-100 border border-slate-200 w-full max-w-[120px]">
                      <button
                        type="button"
                        onClick={() => updateExpense("gas", { varies: true })}
                        className={`flex-1 text-center py-0.5 rounded text-[10px] font-bold transition-all ${
                          expenses.gas.varies 
                            ? "bg-rose-500 text-white shadow-xs" 
                            : "text-slate-500 hover:text-slate-855"
                        }`}
                      >
                        SÍ
                      </button>
                      <button
                        type="button"
                        onClick={() => updateExpense("gas", { varies: false })}
                        className={`flex-1 text-center py-0.5 rounded text-[10px] font-bold transition-all ${
                          !expenses.gas.varies 
                            ? "bg-slate-350 text-slate-900 shadow-xs" 
                            : "text-slate-500 hover:text-slate-855"
                        }`}
                      >
                        NO
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* GROUP 2: TRANSPORTE */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 pb-1 border-b border-rose-100">
                <Bus className="w-4 h-4 text-rose-500 shrink-0" />
                <span className="text-xs font-bold uppercase text-rose-900">🚌 Transporte</span>
              </div>

              {/* SUBE */}
              <div className="border border-slate-200 rounded-xl p-3 md:p-2 bg-white hover:border-rose-200 transition-colors shadow-2xs">
                <div className="grid grid-cols-12 gap-y-2 gap-x-4 items-center">
                  <div className="col-span-12 md:col-span-5 pl-1.5">
                    <span className="font-semibold text-slate-800 text-xs sm:text-xs">SUBE</span>
                  </div>
                  <div className="col-span-12 sm:col-span-7 md:col-span-4">
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-semibold">$</span>
                      <Input 
                        type="number"
                        value={expenses.sube.amount || ""} 
                        onChange={(e) => updateExpense("sube", { amount: parseFloat(e.target.value) || 0 })} 
                        placeholder="0"
                        className="pl-6 h-8 text-xs focus-visible:ring-rose-500"
                      />
                    </div>
                  </div>
                  <div className="col-span-12 sm:col-span-5 md:col-span-3 flex justify-end md:justify-center">
                    <div className="flex rounded-md p-0.5 bg-slate-100 border border-slate-200 w-full max-w-[120px]">
                      <button
                        type="button"
                        onClick={() => updateExpense("sube", { varies: true })}
                        className={`flex-1 text-center py-0.5 rounded text-[10px] font-bold transition-all ${
                          expenses.sube.varies 
                            ? "bg-rose-500 text-white shadow-xs" 
                            : "text-slate-500 hover:text-slate-855"
                        }`}
                      >
                        SÍ
                      </button>
                      <button
                        type="button"
                        onClick={() => updateExpense("sube", { varies: false })}
                        className={`flex-1 text-center py-0.5 rounded text-[10px] font-bold transition-all ${
                          !expenses.sube.varies 
                            ? "bg-slate-350 text-slate-900 shadow-xs" 
                            : "text-slate-500 hover:text-slate-855"
                        }`}
                      >
                        NO
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Nafta / remis */}
              <div className="border border-slate-200 rounded-xl p-3 md:p-2 bg-white hover:border-rose-200 transition-colors shadow-2xs">
                <div className="grid grid-cols-12 gap-y-2 gap-x-4 items-center">
                  <div className="col-span-12 md:col-span-5 pl-1.5">
                    <span className="font-semibold text-slate-800 text-xs sm:text-xs">Nafta / remis</span>
                  </div>
                  <div className="col-span-12 sm:col-span-7 md:col-span-4">
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-semibold">$</span>
                      <Input 
                        type="number"
                        value={expenses.naftaRemis.amount || ""} 
                        onChange={(e) => updateExpense("naftaRemis", { amount: parseFloat(e.target.value) || 0 })} 
                        placeholder="0"
                        className="pl-6 h-8 text-xs focus-visible:ring-rose-500"
                      />
                    </div>
                  </div>
                  <div className="col-span-12 sm:col-span-5 md:col-span-3 flex justify-end md:justify-center">
                    <div className="flex rounded-md p-0.5 bg-slate-100 border border-slate-200 w-full max-w-[120px]">
                      <button
                        type="button"
                        onClick={() => updateExpense("naftaRemis", { varies: true })}
                        className={`flex-1 text-center py-0.5 rounded text-[10px] font-bold transition-all ${
                          expenses.naftaRemis.varies 
                            ? "bg-rose-500 text-white shadow-xs" 
                            : "text-slate-500 hover:text-slate-855"
                        }`}
                      >
                        SÍ
                      </button>
                      <button
                        type="button"
                        onClick={() => updateExpense("naftaRemis", { varies: false })}
                        className={`flex-1 text-center py-0.5 rounded text-[10px] font-bold transition-all ${
                          !expenses.naftaRemis.varies 
                            ? "bg-slate-350 text-slate-900 shadow-xs" 
                            : "text-slate-500 hover:text-slate-855"
                        }`}
                      >
                        NO
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* GROUP 3: COMUNICACIÓN */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 pb-1 border-b border-rose-100">
                <Smartphone className="w-4 h-4 text-rose-500 shrink-0" />
                <span className="text-xs font-bold uppercase text-rose-900">📱 Comunicación</span>
              </div>

              {/* Teléfono / celular */}
              <div className="border border-slate-200 rounded-xl p-3 md:p-2 bg-white hover:border-rose-200 transition-colors shadow-2xs">
                <div className="grid grid-cols-12 gap-y-2 gap-x-4 items-center">
                  <div className="col-span-12 md:col-span-5 pl-1.5">
                    <span className="font-semibold text-slate-800 text-xs sm:text-xs">Teléfono / celular</span>
                  </div>
                  <div className="col-span-12 sm:col-span-7 md:col-span-4">
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-semibold">$</span>
                      <Input 
                        type="number"
                        value={expenses.telefonoCelular.amount || ""} 
                        onChange={(e) => updateExpense("telefonoCelular", { amount: parseFloat(e.target.value) || 0 })} 
                        placeholder="0"
                        className="pl-6 h-8 text-xs focus-visible:ring-rose-500"
                      />
                    </div>
                  </div>
                  <div className="col-span-12 sm:col-span-5 md:col-span-3 flex justify-end md:justify-center">
                    <div className="flex rounded-md p-0.5 bg-slate-100 border border-slate-200 w-full max-w-[120px]">
                      <button
                        type="button"
                        onClick={() => updateExpense("telefonoCelular", { varies: true })}
                        className={`flex-1 text-center py-0.5 rounded text-[10px] font-bold transition-all ${
                          expenses.telefonoCelular.varies 
                            ? "bg-rose-500 text-white shadow-xs" 
                            : "text-slate-500 hover:text-slate-855"
                        }`}
                      >
                        SÍ
                      </button>
                      <button
                        type="button"
                        onClick={() => updateExpense("telefonoCelular", { varies: false })}
                        className={`flex-1 text-center py-0.5 rounded text-[10px] font-bold transition-all ${
                          !expenses.telefonoCelular.varies 
                            ? "bg-slate-350 text-slate-900 shadow-xs" 
                            : "text-slate-500 hover:text-slate-855"
                        }`}
                      >
                        NO
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Internet */}
              <div className="border border-slate-200 rounded-xl p-3 md:p-2 bg-white hover:border-rose-200 transition-colors shadow-2xs">
                <div className="grid grid-cols-12 gap-y-2 gap-x-4 items-center">
                  <div className="col-span-12 md:col-span-5 pl-1.5">
                    <span className="font-semibold text-slate-800 text-xs sm:text-xs">Internet</span>
                  </div>
                  <div className="col-span-12 sm:col-span-7 md:col-span-4">
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-semibold">$</span>
                      <Input 
                        type="number"
                        value={expenses.internet.amount || ""} 
                        onChange={(e) => updateExpense("internet", { amount: parseFloat(e.target.value) || 0 })} 
                        placeholder="0"
                        className="pl-6 h-8 text-xs focus-visible:ring-rose-500"
                      />
                    </div>
                  </div>
                  <div className="col-span-12 sm:col-span-5 md:col-span-3 flex justify-end md:justify-center">
                    <div className="flex rounded-md p-0.5 bg-slate-100 border border-slate-200 w-full max-w-[120px]">
                      <button
                        type="button"
                        onClick={() => updateExpense("internet", { varies: true })}
                        className={`flex-1 text-center py-0.5 rounded text-[10px] font-bold transition-all ${
                          expenses.internet.varies 
                            ? "bg-rose-500 text-white shadow-xs" 
                            : "text-slate-500 hover:text-slate-855"
                        }`}
                      >
                        SÍ
                      </button>
                      <button
                        type="button"
                        onClick={() => updateExpense("internet", { varies: false })}
                        className={`flex-1 text-center py-0.5 rounded text-[10px] font-bold transition-all ${
                          !expenses.internet.varies 
                            ? "bg-slate-350 text-slate-900 shadow-xs" 
                            : "text-slate-500 hover:text-slate-855"
                        }`}
                      >
                        NO
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Cable */}
              <div className="border border-slate-200 rounded-xl p-3 md:p-2 bg-white hover:border-rose-200 transition-colors shadow-2xs">
                <div className="grid grid-cols-12 gap-y-2 gap-x-4 items-center">
                  <div className="col-span-12 md:col-span-5 pl-1.5">
                    <span className="font-semibold text-slate-800 text-xs sm:text-xs">Cable</span>
                  </div>
                  <div className="col-span-12 sm:col-span-7 md:col-span-4">
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-semibold">$</span>
                      <Input 
                        type="number"
                        value={expenses.cable.amount || ""} 
                        onChange={(e) => updateExpense("cable", { amount: parseFloat(e.target.value) || 0 })} 
                        placeholder="0"
                        className="pl-6 h-8 text-xs focus-visible:ring-rose-500"
                      />
                    </div>
                  </div>
                  <div className="col-span-12 sm:col-span-5 md:col-span-3 flex justify-end md:justify-center">
                    <div className="flex rounded-md p-0.5 bg-slate-100 border border-slate-200 w-full max-w-[120px]">
                      <button
                        type="button"
                        onClick={() => updateExpense("cable", { varies: true })}
                        className={`flex-1 text-center py-0.5 rounded text-[10px] font-bold transition-all ${
                          expenses.cable.varies 
                            ? "bg-rose-500 text-white shadow-xs" 
                            : "text-slate-500 hover:text-slate-855"
                        }`}
                      >
                        SÍ
                      </button>
                      <button
                        type="button"
                        onClick={() => updateExpense("cable", { varies: false })}
                        className={`flex-1 text-center py-0.5 rounded text-[10px] font-bold transition-all ${
                          !expenses.cable.varies 
                            ? "bg-slate-350 text-slate-900 shadow-xs" 
                            : "text-slate-500 hover:text-slate-855"
                        }`}
                      >
                        NO
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* GROUP 4: ALIMENTACIÓN */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 pb-1 border-b border-rose-100">
                <Utensils className="w-4 h-4 text-rose-500 shrink-0" />
                <span className="text-xs font-bold uppercase text-rose-900">🛒 Alimentación</span>
              </div>

              {/* Comida y mercadería */}
              <div className={`border rounded-xl p-3 md:p-2 bg-white hover:border-rose-300 transition-colors shadow-2xs ${isInvalid("householdFinance.expenseFoodRent") ? "border-rose-400 bg-rose-50/5" : "border-slate-200"}`}>
                <div className="grid grid-cols-12 gap-y-2 gap-x-4 items-center">
                  <div className="col-span-12 md:col-span-5 pl-1.5 flex flex-col">
                    <span className="font-bold text-slate-800 text-xs flex items-center gap-1">
                      Comida y mercadería <span className="text-rose-500 font-extrabold">*</span>
                    </span>
                    <span className="text-[10px] text-slate-500 leading-none">Indispensable para validar paso</span>
                  </div>
                  <div className="col-span-12 sm:col-span-7 md:col-span-4">
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-semibold">$</span>
                      <Input 
                        type="number"
                        value={expenses.comidaMercaderia.amount || ""} 
                        onChange={(e) => updateExpense("comidaMercaderia", { amount: parseFloat(e.target.value) || 0 })} 
                        placeholder="Requerido"
                        className={`pl-6 h-8 text-xs font-semibold ${isInvalid("householdFinance.expenseFoodRent") ? "border-rose-300 focus-visible:ring-rose-500 bg-rose-50/20" : "focus-visible:ring-rose-500"}`}
                      />
                    </div>
                    {isInvalid("householdFinance.expenseFoodRent") && (
                      <span className="text-[10px] text-rose-600 font-bold mt-1 block">Comida y mercadería es obligatorio</span>
                    )}
                  </div>
                  <div className="col-span-12 sm:col-span-5 md:col-span-3 flex justify-end md:justify-center">
                    <div className="flex rounded-md p-0.5 bg-slate-100 border border-slate-200 w-full max-w-[120px]">
                      <button
                        type="button"
                        onClick={() => updateExpense("comidaMercaderia", { varies: true })}
                        className={`flex-1 text-center py-0.5 rounded text-[10px] font-bold transition-all ${
                          expenses.comidaMercaderia.varies 
                            ? "bg-rose-500 text-white shadow-xs" 
                            : "text-slate-500 hover:text-slate-855"
                        }`}
                      >
                        SÍ
                      </button>
                      <button
                        type="button"
                        onClick={() => updateExpense("comidaMercaderia", { varies: false })}
                        className={`flex-1 text-center py-0.5 rounded text-[10px] font-bold transition-all ${
                          !expenses.comidaMercaderia.varies 
                            ? "bg-slate-350 text-slate-900 shadow-xs" 
                            : "text-slate-500 hover:text-slate-855"
                        }`}
                      >
                        NO
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* GROUP 5: DEUDAS Y OBLIGACIONES */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 pb-1 border-b border-rose-100">
                <CreditCard className="w-4 h-4 text-rose-500 shrink-0" />
                <span className="text-xs font-bold uppercase text-rose-900">💳 Deudas y obligaciones</span>
              </div>

              {/* Cuotas de deudas actuales */}
              <div className="border border-slate-200 rounded-xl p-3 md:p-2 bg-yellow-50/10 hover:border-rose-200 transition-colors shadow-2xs">
                <div className="grid grid-cols-12 gap-y-2 gap-x-4 items-center">
                  <div className="col-span-12 md:col-span-5 pl-1.5">
                    <span className="font-semibold text-amber-900 text-xs sm:text-xs">Cuotas de deudas actuales</span>
                    <p className="text-[10px] text-slate-500 leading-none">Guardado interno para análisis</p>
                  </div>
                  <div className="col-span-12 sm:col-span-7 md:col-span-4">
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-semibold">$</span>
                      <Input 
                        type="number"
                        value={expenses.cuotasDeudas.amount || ""} 
                        onChange={(e) => updateExpense("cuotasDeudas", { amount: parseFloat(e.target.value) || 0 })} 
                        placeholder="0"
                        className="pl-6 h-8 text-xs focus-visible:ring-rose-500"
                      />
                    </div>
                  </div>
                  <div className="col-span-12 sm:col-span-5 md:col-span-3 flex justify-end md:justify-center">
                    <div className="flex rounded-md p-0.5 bg-slate-100 border border-slate-200 w-full max-w-[120px]">
                      <button
                        type="button"
                        onClick={() => updateExpense("cuotasDeudas", { varies: true })}
                        className={`flex-1 text-center py-0.5 rounded text-[10px] font-bold transition-all ${
                          expenses.cuotasDeudas.varies 
                            ? "bg-rose-500 text-white shadow-xs" 
                            : "text-slate-500 hover:text-slate-855"
                        }`}
                      >
                        SÍ
                      </button>
                      <button
                        type="button"
                        onClick={() => updateExpense("cuotasDeudas", { varies: false })}
                        className={`flex-1 text-center py-0.5 rounded text-[10px] font-bold transition-all ${
                          !expenses.cuotasDeudas.varies 
                            ? "bg-slate-350 text-slate-900 shadow-xs" 
                            : "text-slate-500 hover:text-slate-855"
                        }`}
                      >
                        NO
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Seguros */}
              <div className="border border-slate-200 rounded-xl p-3 md:p-2 bg-white hover:border-rose-200 transition-colors shadow-2xs">
                <div className="grid grid-cols-12 gap-y-2 gap-x-4 items-center">
                  <div className="col-span-12 md:col-span-5 pl-1.5">
                    <span className="font-semibold text-slate-800 text-xs sm:text-xs">Seguros</span>
                  </div>
                  <div className="col-span-12 sm:col-span-7 md:col-span-4">
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-semibold">$</span>
                      <Input 
                        type="number"
                        value={expenses.seguros.amount || ""} 
                        onChange={(e) => updateExpense("seguros", { amount: parseFloat(e.target.value) || 0 })} 
                        placeholder="0"
                        className="pl-6 h-8 text-xs focus-visible:ring-rose-500"
                      />
                    </div>
                  </div>
                  <div className="col-span-12 sm:col-span-5 md:col-span-3 flex justify-end md:justify-center">
                    <div className="flex rounded-md p-0.5 bg-slate-100 border border-slate-200 w-full max-w-[120px]">
                      <button
                        type="button"
                        onClick={() => updateExpense("seguros", { varies: true })}
                        className={`flex-1 text-center py-0.5 rounded text-[10px] font-bold transition-all ${
                          expenses.seguros.varies 
                            ? "bg-rose-500 text-white shadow-xs" 
                            : "text-slate-500 hover:text-slate-855"
                        }`}
                      >
                        SÍ
                      </button>
                      <button
                        type="button"
                        onClick={() => updateExpense("seguros", { varies: false })}
                        className={`flex-1 text-center py-0.5 rounded text-[10px] font-bold transition-all ${
                          !expenses.seguros.varies 
                            ? "bg-slate-350 text-slate-900 shadow-xs" 
                            : "text-slate-500 hover:text-slate-855"
                        }`}
                      >
                        NO
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Impuestos */}
              <div className="border border-slate-200 rounded-xl p-3 md:p-2 bg-white hover:border-rose-200 transition-colors shadow-2xs">
                <div className="grid grid-cols-12 gap-y-2 gap-x-4 items-center">
                  <div className="col-span-12 md:col-span-5 pl-1.5 flex flex-col justify-center">
                    <span className="font-semibold text-slate-800 text-xs sm:text-xs leading-tight">Impuestos</span>
                    <span className="text-[10px] text-slate-500 leading-none">ABL, inmobiliario, automotor, monotributo</span>
                  </div>
                  <div className="col-span-12 sm:col-span-7 md:col-span-4">
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-semibold">$</span>
                      <Input 
                        type="number"
                        value={expenses.impuestos.amount || ""} 
                        onChange={(e) => updateExpense("impuestos", { amount: parseFloat(e.target.value) || 0 })} 
                        placeholder="0"
                        className="pl-6 h-8 text-xs focus-visible:ring-rose-500"
                      />
                    </div>
                  </div>
                  <div className="col-span-12 sm:col-span-5 md:col-span-3 flex justify-end md:justify-center">
                    <div className="flex rounded-md p-0.5 bg-slate-100 border border-slate-200 w-full max-w-[120px]">
                      <button
                        type="button"
                        onClick={() => updateExpense("impuestos", { varies: true })}
                        className={`flex-1 text-center py-0.5 rounded text-[10px] font-bold transition-all ${
                          expenses.impuestos.varies 
                            ? "bg-rose-500 text-white shadow-xs" 
                            : "text-slate-500 hover:text-slate-855"
                        }`}
                      >
                        SÍ
                      </button>
                      <button
                        type="button"
                        onClick={() => updateExpense("impuestos", { varies: false })}
                        className={`flex-1 text-center py-0.5 rounded text-[10px] font-bold transition-all ${
                          !expenses.impuestos.varies 
                            ? "bg-slate-350 text-slate-900 shadow-xs" 
                            : "text-slate-500 hover:text-slate-855"
                        }`}
                      >
                        NO
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* GROUP 6: FAMILIA */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 pb-1 border-b border-rose-100">
                <Users2 className="w-4 h-4 text-rose-500 shrink-0" />
                <span className="text-xs font-bold uppercase text-rose-900">👨‍👩‍👧 Familia</span>
              </div>

              {/* Educación */}
              <div className="border border-slate-200 rounded-xl p-3 md:p-2 bg-white hover:border-rose-200 transition-colors shadow-2xs">
                <div className="grid grid-cols-12 gap-y-2 gap-x-4 items-center">
                  <div className="col-span-12 md:col-span-5 pl-1.5 flex flex-col justify-center">
                    <span className="font-semibold text-slate-800 text-xs sm:text-xs leading-tight">Educación</span>
                    <span className="text-[10px] text-slate-500 leading-none">Útiles, cuotas, fotocopias, etc.</span>
                  </div>
                  <div className="col-span-12 sm:col-span-7 md:col-span-4">
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-semibold">$</span>
                      <Input 
                        type="number"
                        value={expenses.educacion.amount || ""} 
                        onChange={(e) => updateExpense("educacion", { amount: parseFloat(e.target.value) || 0 })} 
                        placeholder="0"
                        className="pl-6 h-8 text-xs focus-visible:ring-rose-500"
                      />
                    </div>
                  </div>
                  <div className="col-span-12 sm:col-span-5 md:col-span-3 flex justify-end md:justify-center">
                    <div className="flex rounded-md p-0.5 bg-slate-100 border border-slate-200 w-full max-w-[120px]">
                      <button
                        type="button"
                        onClick={() => updateExpense("educacion", { varies: true })}
                        className={`flex-1 text-center py-0.5 rounded text-[10px] font-bold transition-all ${
                          expenses.educacion.varies 
                            ? "bg-rose-500 text-white shadow-xs" 
                            : "text-slate-500 hover:text-slate-855"
                        }`}
                      >
                        SÍ
                      </button>
                      <button
                        type="button"
                        onClick={() => updateExpense("educacion", { varies: false })}
                        className={`flex-1 text-center py-0.5 rounded text-[10px] font-bold transition-all ${
                          !expenses.educacion.varies 
                            ? "bg-slate-350 text-slate-900 shadow-xs" 
                            : "text-slate-500 hover:text-slate-855"
                        }`}
                      >
                        NO
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Salud */}
              <div className="border border-slate-200 rounded-xl p-3 md:p-2 bg-white hover:border-rose-200 transition-colors shadow-2xs">
                <div className="grid grid-cols-12 gap-y-2 gap-x-4 items-center">
                  <div className="col-span-12 md:col-span-5 pl-1.5 flex flex-col justify-center">
                    <span className="font-semibold text-slate-800 text-xs sm:text-xs leading-tight">Salud</span>
                    <span className="text-[10px] text-slate-500 leading-none">Medicamentos, consultas, obra social</span>
                  </div>
                  <div className="col-span-12 sm:col-span-7 md:col-span-4">
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-semibold">$</span>
                      <Input 
                        type="number"
                        value={expenses.salud.amount || ""} 
                        onChange={(e) => updateExpense("salud", { amount: parseFloat(e.target.value) || 0 })} 
                        placeholder="0"
                        className="pl-6 h-8 text-xs focus-visible:ring-rose-500"
                      />
                    </div>
                  </div>
                  <div className="col-span-12 sm:col-span-5 md:col-span-3 flex justify-end md:justify-center">
                    <div className="flex rounded-md p-0.5 bg-slate-100 border border-slate-200 w-full max-w-[120px]">
                      <button
                        type="button"
                        onClick={() => updateExpense("salud", { varies: true })}
                        className={`flex-1 text-center py-0.5 rounded text-[10px] font-bold transition-all ${
                          expenses.salud.varies 
                            ? "bg-rose-500 text-white shadow-xs" 
                            : "text-slate-500 hover:text-slate-855"
                        }`}
                      >
                        SÍ
                      </button>
                      <button
                        type="button"
                        onClick={() => updateExpense("salud", { varies: false })}
                        className={`flex-1 text-center py-0.5 rounded text-[10px] font-bold transition-all ${
                          !expenses.salud.varies 
                            ? "bg-slate-350 text-slate-900 shadow-xs" 
                            : "text-slate-500 hover:text-slate-855"
                        }`}
                      >
                        NO
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Ropa y calzado */}
              <div className="border border-slate-200 rounded-xl p-3 md:p-2 bg-white hover:border-rose-200 transition-colors shadow-2xs">
                <div className="grid grid-cols-12 gap-y-2 gap-x-4 items-center">
                  <div className="col-span-12 md:col-span-5 pl-1.5">
                    <span className="font-semibold text-slate-800 text-xs sm:text-xs">Ropa y calzado</span>
                  </div>
                  <div className="col-span-12 sm:col-span-7 md:col-span-4">
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-semibold">$</span>
                      <Input 
                        type="number"
                        value={expenses.ropaCalzado.amount || ""} 
                        onChange={(e) => updateExpense("ropaCalzado", { amount: parseFloat(e.target.value) || 0 })} 
                        placeholder="0"
                        className="pl-6 h-8 text-xs focus-visible:ring-rose-500"
                      />
                    </div>
                  </div>
                  <div className="col-span-12 sm:col-span-5 md:col-span-3 flex justify-end md:justify-center">
                    <div className="flex rounded-md p-0.5 bg-slate-100 border border-slate-200 w-full max-w-[120px]">
                      <button
                        type="button"
                        onClick={() => updateExpense("ropaCalzado", { varies: true })}
                        className={`flex-1 text-center py-0.5 rounded text-[10px] font-bold transition-all ${
                          expenses.ropaCalzado.varies 
                            ? "bg-rose-500 text-white shadow-xs" 
                            : "text-slate-500 hover:text-slate-855"
                        }`}
                      >
                        SÍ
                      </button>
                      <button
                        type="button"
                        onClick={() => updateExpense("ropaCalzado", { varies: false })}
                        className={`flex-1 text-center py-0.5 rounded text-[10px] font-bold transition-all ${
                          !expenses.ropaCalzado.varies 
                            ? "bg-slate-350 text-slate-900 shadow-xs" 
                            : "text-slate-500 hover:text-slate-855"
                        }`}
                      >
                        NO
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* GROUP 7: OTROS GASTOS */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 pb-1 border-b border-rose-100">
                <Coins className="w-4 h-4 text-rose-500 shrink-0" />
                <span className="text-xs font-bold uppercase text-rose-900">🐾 Otros gastos</span>
              </div>

              {/* Mascotas */}
              <div className="border border-slate-200 rounded-xl p-3 md:p-2 bg-white hover:border-rose-200 transition-colors shadow-2xs">
                <div className="grid grid-cols-12 gap-y-2 gap-x-4 items-center">
                  <div className="col-span-12 md:col-span-5 pl-1.5">
                    <span className="font-semibold text-slate-800 text-xs sm:text-xs">Mascotas</span>
                  </div>
                  <div className="col-span-12 sm:col-span-7 md:col-span-4">
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-semibold">$</span>
                      <Input 
                        type="number"
                        value={expenses.mascotas.amount || ""} 
                        onChange={(e) => updateExpense("mascotas", { amount: parseFloat(e.target.value) || 0 })} 
                        placeholder="0"
                        className="pl-6 h-8 text-xs focus-visible:ring-rose-500"
                      />
                    </div>
                  </div>
                  <div className="col-span-12 sm:col-span-5 md:col-span-3 flex justify-end md:justify-center">
                    <div className="flex rounded-md p-0.5 bg-slate-100 border border-slate-200 w-full max-w-[120px]">
                      <button
                        type="button"
                        onClick={() => updateExpense("mascotas", { varies: true })}
                        className={`flex-1 text-center py-0.5 rounded text-[10px] font-bold transition-all ${
                          expenses.mascotas.varies 
                            ? "bg-rose-500 text-white shadow-xs" 
                            : "text-slate-500 hover:text-slate-855"
                        }`}
                      >
                        SÍ
                      </button>
                      <button
                        type="button"
                        onClick={() => updateExpense("mascotas", { varies: false })}
                        className={`flex-1 text-center py-0.5 rounded text-[10px] font-bold transition-all ${
                          !expenses.mascotas.varies 
                            ? "bg-slate-350 text-slate-900 shadow-xs" 
                            : "text-slate-500 hover:text-slate-855"
                        }`}
                      >
                        NO
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Cigarrillos */}
              <div className="border border-slate-200 rounded-xl p-3 md:p-2 bg-white hover:border-rose-200 transition-colors shadow-2xs">
                <div className="grid grid-cols-12 gap-y-2 gap-x-4 items-center">
                  <div className="col-span-12 md:col-span-5 pl-1.5">
                    <span className="font-semibold text-slate-800 text-xs sm:text-xs">Cigarrillos</span>
                  </div>
                  <div className="col-span-12 sm:col-span-7 md:col-span-4">
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-semibold">$</span>
                      <Input 
                        type="number"
                        value={expenses.cigarrillos.amount || ""} 
                        onChange={(e) => updateExpense("cigarrillos", { amount: parseFloat(e.target.value) || 0 })} 
                        placeholder="0"
                        className="pl-6 h-8 text-xs focus-visible:ring-rose-500"
                      />
                    </div>
                  </div>
                  <div className="col-span-12 sm:col-span-5 md:col-span-3 flex justify-end md:justify-center">
                    <div className="flex rounded-md p-0.5 bg-slate-100 border border-slate-200 w-full max-w-[120px]">
                      <button
                        type="button"
                        onClick={() => updateExpense("cigarrillos", { varies: true })}
                        className={`flex-1 text-center py-0.5 rounded text-[10px] font-bold transition-all ${
                          expenses.cigarrillos.varies 
                            ? "bg-rose-500 text-white shadow-xs" 
                            : "text-slate-500 hover:text-slate-855"
                        }`}
                      >
                        SÍ
                      </button>
                      <button
                        type="button"
                        onClick={() => updateExpense("cigarrillos", { varies: false })}
                        className={`flex-1 text-center py-0.5 rounded text-[10px] font-bold transition-all ${
                          !expenses.cigarrillos.varies 
                            ? "bg-slate-350 text-slate-900 shadow-xs" 
                            : "text-slate-500 hover:text-slate-855"
                        }`}
                      >
                        NO
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Nafta (repetida?) */}
              <div className="border border-slate-200 rounded-xl p-3 md:p-2 bg-white hover:border-rose-200 transition-colors shadow-2xs">
                <div className="grid grid-cols-12 gap-y-2 gap-x-4 items-center">
                  <div className="col-span-12 md:col-span-5 pl-1.5 flex flex-col justify-center">
                    <span className="font-semibold text-slate-800 text-xs sm:text-xs leading-tight">Nafta</span>
                  </div>
                  <div className="col-span-12 sm:col-span-7 md:col-span-4">
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-semibold">$</span>
                      <Input 
                        type="number"
                        value={expenses.naftaOtros.amount || ""} 
                        onChange={(e) => updateExpense("naftaOtros", { amount: parseFloat(e.target.value) || 0 })} 
                        placeholder="0"
                        className="pl-6 h-8 text-xs focus-visible:ring-rose-500"
                      />
                    </div>
                  </div>
                  <div className="col-span-12 sm:col-span-5 md:col-span-3 flex justify-end md:justify-center">
                    <div className="flex rounded-md p-0.5 bg-slate-100 border border-slate-200 w-full max-w-[120px]">
                      <button
                        type="button"
                        onClick={() => updateExpense("naftaOtros", { varies: true })}
                        className={`flex-1 text-center py-0.5 rounded text-[10px] font-bold transition-all ${
                          expenses.naftaOtros.varies 
                            ? "bg-rose-500 text-white shadow-xs" 
                            : "text-slate-500 hover:text-slate-855"
                        }`}
                      >
                        SÍ
                      </button>
                      <button
                        type="button"
                        onClick={() => updateExpense("naftaOtros", { varies: false })}
                        className={`flex-1 text-center py-0.5 rounded text-[10px] font-bold transition-all ${
                          !expenses.naftaOtros.varies 
                            ? "bg-slate-350 text-slate-900 shadow-xs" 
                            : "text-slate-500 hover:text-slate-855"
                        }`}
                      >
                        NO
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Otros (especificar) */}
              <div className="border border-slate-200 rounded-xl p-3 md:p-2 bg-white hover:border-rose-200 transition-colors shadow-2xs">
                <div className="grid grid-cols-12 gap-y-2.5 gap-x-4 items-center">
                  <div className="col-span-12 md:col-span-5 space-y-1.5 pl-1.5">
                    <span className="font-semibold text-slate-800 text-xs sm:text-xs">Otros (especificar)</span>
                    <Input 
                      type="text"
                      value={expenses.otrosDetalle.name || ""} 
                      onChange={(e) => updateExpense("otrosDetalle", { name: e.target.value })} 
                      placeholder="Especificar el tipo de gasto..."
                      className="w-full text-[10px] h-7 bg-slate-50 border-slate-200"
                    />
                  </div>
                  <div className="col-span-12 sm:col-span-7 md:col-span-4">
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-semibold">$</span>
                      <Input 
                        type="number"
                        value={expenses.otrosDetalle.amount || ""} 
                        onChange={(e) => updateExpense("otrosDetalle", { amount: parseFloat(e.target.value) || 0 })} 
                        placeholder="0"
                        className="pl-6 h-8 text-xs focus-visible:ring-rose-500"
                      />
                    </div>
                  </div>
                  <div className="col-span-12 sm:col-span-5 md:col-span-3 flex justify-end md:justify-center">
                    <div className="flex rounded-md p-0.5 bg-slate-100 border border-slate-200 w-full max-w-[120px]">
                      <button
                        type="button"
                        onClick={() => updateExpense("otrosDetalle", { varies: true })}
                        className={`flex-1 text-center py-0.5 rounded text-[10px] font-bold transition-all ${
                          expenses.otrosDetalle.varies 
                            ? "bg-rose-500 text-white shadow-xs" 
                            : "text-slate-500 hover:text-slate-855"
                        }`}
                      >
                        SÍ
                      </button>
                      <button
                        type="button"
                        onClick={() => updateExpense("otrosDetalle", { varies: false })}
                        className={`flex-1 text-center py-0.5 rounded text-[10px] font-bold transition-all ${
                          !expenses.otrosDetalle.varies 
                            ? "bg-slate-350 text-slate-900 shadow-xs" 
                            : "text-slate-500 hover:text-slate-855"
                        }`}
                      >
                        NO
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* TOTAL GASTOS BANNER */}
          <div className="bg-slate-900 border border-slate-850 rounded-xl p-4 md:p-3 mt-6 text-white shadow-md">
            <div className="grid grid-cols-12 gap-y-2 gap-x-4 items-center">
              <div className="col-span-12 md:col-span-5 flex items-center">
                <span className="font-extrabold uppercase tracking-wider text-xs text-rose-300">
                  TOTAL GASTOS MENSUALES
                </span>
              </div>
              <div className="col-span-12 sm:col-span-7 md:col-span-4 flex items-center">
                <span className="font-black text-xl sm:text-2xl text-rose-400">
                  $ {(totalExpenses || 0).toLocaleString("es-AR")}
                </span>
              </div>
              <div className="col-span-12 sm:col-span-5 md:col-span-3 text-right">
                <div className="text-[10px] uppercase text-slate-400">
                  <div>Comida y Alquiler: <strong className="text-rose-400 font-bold">${(data.expenseFoodRent || 0).toLocaleString("es-AR")}</strong></div>
                  <div>Otros Servicios: <strong className="text-rose-300 font-bold">${(data.expenseServices || 0).toLocaleString("es-AR")}</strong></div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* --- SURPLUS PANEL --- */}
      <div className={`p-5 rounded-2xl border-2 transition-all ${surplus > 0 ? "bg-green-50/70 border-green-200" : surplus < 0 ? "bg-red-50/70 border-red-200" : "bg-slate-50 border-slate-100"} mt-4 shadow-sm`}>
        <div className="flex justify-between items-center flex-wrap gap-4">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700">Excedente Estimado</h3>
            <p className="text-xs text-slate-500 mt-0.5">(Total Ingresos - Total Gastos)</p>
          </div>
          <div className={`text-2xl sm:text-3xl font-black ${surplus > 0 ? "text-green-600" : surplus < 0 ? "text-red-650" : "text-slate-600"}`}>
            $ {(surplus || 0).toLocaleString("es-AR")}
          </div>
        </div>
        {surplus < 0 && (
          <p className="mt-3 text-xs text-rose-600 font-bold flex items-center gap-1.5 animate-pulse">
            ⚠️ Atención: Los gastos mensuales declarados superan tus ingresos totales del hogar. Por favor revisa los montos.
          </p>
        )}
      </div>

    </div>
  );
}
