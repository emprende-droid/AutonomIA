import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EntrepreneurshipData, AppSettings, ProductItem, AccountingMonth } from "../types";
import { HelpCircle, Plus, Trash2, PlusCircle, CheckCircle2, TrendingUp, DollarSign, Calculator, Calendar } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface Props {
  data: EntrepreneurshipData;
  onChange: (data: EntrepreneurshipData) => void;
  settings: AppSettings;
  validationErrors?: string[];
}

export default function Step3Entrepreneurship({ data, onChange, settings, validationErrors }: Props) {
  const [showTypeHelp, setShowTypeHelp] = useState(false);

  // Initialize arrays if they don't exist
  useEffect(() => {
    let updated = { ...data };
    let needsUpdate = false;

    if (!data.products || data.products.length === 0) {
      updated.products = [{ id: "1", name: "", unitCost: 0, unitPrice: 0, weeklyQty: 0 }];
      needsUpdate = true;
    }
    if (!data.accountingMonths || data.accountingMonths.length === 0) {
      updated.accountingMonths = [
        { period: "Mes 1", productOrService: "", totalBilled: 0, profit: 0 },
        { period: "Mes 2", productOrService: "", totalBilled: 0, profit: 0 },
        { period: "Mes 3", productOrService: "", totalBilled: 0, profit: 0 }
      ];
      needsUpdate = true;
    }

    if (needsUpdate) {
      onChange(updated);
    }
  }, []);

  const handleChange = (field: keyof EntrepreneurshipData, value: any) => {
    const updated = { ...data, [field]: value };
    recalculateTotals(updated);
  };

  const handleProductChange = (index: number, key: keyof ProductItem, val: any) => {
    const list = [...(data.products || [])];
    list[index] = { ...list[index], [key]: val };
    const updated = { ...data, products: list };
    recalculateTotals(updated);
  };

  const addProduct = () => {
    const list = [...(data.products || [])];
    if (list.length >= 10) return;
    list.push({ id: String(Date.now()), name: "", unitCost: 0, unitPrice: 0, weeklyQty: 0 });
    const updated = { ...data, products: list };
    recalculateTotals(updated);
  };

  const removeProduct = (index: number) => {
    const list = [...(data.products || [])];
    if (list.length <= 1) return; // Always keep at least 1 row
    list.splice(index, 1);
    const updated = { ...data, products: list };
    recalculateTotals(updated);
  };

  const handleAccountingChange = (index: number, key: keyof AccountingMonth, val: any) => {
    const list = [...(data.accountingMonths || [])];
    list[index] = { ...list[index], [key]: val };
    onChange({ ...data, accountingMonths: list });
  };

  const recalculateTotals = (updatedData: EntrepreneurshipData) => {
    const productsSumProfit = (updatedData.products || []).reduce((acc, p) => {
      const uC = Number(p.unitCost) || 0;
      const uP = Number(p.unitPrice) || 0;
      const qty = Number(p.weeklyQty) || 0;
      const gainUnit = uP - uC;
      return acc + (gainUnit * qty);
    }, 0);

    const fCosts = Number(updatedData.fixedCosts) || 0;
    const travExt = Number(updatedData.travelExpenses) || 0;

    const netWeekly = productsSumProfit - fCosts - travExt;
    const netMonthly = netWeekly * 4;

    onChange({
      ...updatedData,
      netWeeklyProfit: netWeekly,
      netMonthlyProfit: netMonthly
    });
  };

  const isInvalid = (field: string) => validationErrors?.includes(field);

  // Auto computations
  const currentProducts = data.products || [];
  const totalWeeklyProfitFromProducts = currentProducts.reduce((acc, p) => {
    const uC = Number(p.unitCost) || 0;
    const uP = Number(p.unitPrice) || 0;
    const qty = Number(p.weeklyQty) || 0;
    return acc + ((uP - uC) * qty);
  }, 0);

  const netWeeklyCalculated = totalWeeklyProfitFromProducts - (Number(data.fixedCosts) || 0) - (Number(data.travelExpenses) || 0);
  const netMonthlyCalculated = netWeeklyCalculated * 4;

  const pdfPlacesOfSale = [
    "Redes sociales",
    "Boca en boca",
    "Local propio",
    "Mercado Libre",
    "Venta ambulante",
    "En casa de clientes",
    "Feria de artesanos/barrial",
    "Otro"
  ];

  return (
    <div className="space-y-8">
      
      {/* SECCIÓN 4 — GENERALIDADES DEL EMPRENDIMIENTO */}
      <div className="bg-slate-50 rounded-xl p-5 border border-slate-200">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 border-b pb-2 mb-5">
          Sección 4: Generalidades del Emprendimiento
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="name" className={isInvalid("entrepreneurshipData.name") ? "text-red-600 font-semibold" : ""}>
              Nombre del Emprendimiento <span className="text-red-500 ml-0.5 font-bold">*</span>
            </Label>
            <Input 
              id="name" 
              value={data.name} 
              onChange={(e) => handleChange("name", e.target.value)} 
              placeholder="Ej: Accesorios Estilo"
              className={isInvalid("entrepreneurshipData.name") ? "border-red-500 focus-visible:ring-red-500 bg-red-50/30" : ""}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="activity" className={isInvalid("entrepreneurshipData.activity") ? "text-red-600 font-semibold" : ""}>
              Actividad Principal (Rubro) <span className="text-red-500 ml-0.5 font-bold">*</span>
            </Label>
            <Select value={data.activity} onValueChange={(val) => handleChange("activity", val)}>
              <SelectTrigger className={isInvalid("entrepreneurshipData.activity") ? "border-red-500 focus:ring-red-500 bg-red-50/30" : ""}>
                <SelectValue placeholder="Seleccionar rubro..." />
              </SelectTrigger>
              <SelectContent>
                {settings.activities.map(a => (
                  <SelectItem key={a} value={a}>{a}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="seniority" className={isInvalid("entrepreneurshipData.seniority") ? "text-red-600 font-semibold" : ""}>
              Antigüedad del negocio <span className="text-red-500 ml-0.5 font-bold">*</span>
            </Label>
            <Input 
              id="seniority" 
              value={data.seniority} 
              onChange={(e) => handleChange("seniority", e.target.value)} 
              placeholder="Ej: 1 año y medio"
              className={isInvalid("entrepreneurshipData.seniority") ? "border-red-500 focus-visible:ring-red-500 bg-red-50/30" : ""}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="salesPlace" className={isInvalid("entrepreneurshipData.salesPlace") ? "text-red-600 font-semibold" : ""}>
              Lugar de venta principal <span className="text-red-500 ml-0.5 font-bold">*</span>
            </Label>
            <Select value={data.salesPlace || ""} onValueChange={(val) => handleChange("salesPlace", val)}>
              <SelectTrigger className={isInvalid("entrepreneurshipData.salesPlace") ? "border-red-500 focus:ring-red-500 bg-red-50/30" : ""}>
                <SelectValue placeholder="Seleccionar canal de venta..." />
              </SelectTrigger>
              <SelectContent>
                {pdfPlacesOfSale.map(p => (
                  <SelectItem key={p} value={p}>{p}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="socialNetworks">Redes sociales del emprendimiento</Label>
            <Input 
              id="socialNetworks" 
              value={data.socialNetworks || ""} 
              onChange={(e) => handleChange("socialNetworks", e.target.value)} 
              placeholder="Insta / Face / WhatsApp Catálogo"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="type" className={isInvalid("entrepreneurshipData.type") ? "text-red-600 font-semibold" : ""}>
                Tipo de Negocio <span className="text-red-500 ml-0.5 font-bold">*</span>
              </Label>
              <button
                type="button"
                onClick={() => setShowTypeHelp(!showTypeHelp)}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1 transition-colors"
                id="btn-help-type"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                <span>¿Qué elegir?</span>
              </button>
            </div>
            <Select value={data.type} onValueChange={(val: 'Comercial' | 'Productivo' | 'Servicios') => handleChange("type", val)}>
              <SelectTrigger className={isInvalid("entrepreneurshipData.type") ? "border-red-500 focus:ring-red-500 bg-red-50/30" : ""}>
                <SelectValue placeholder="Seleccionar..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Comercial">Comercial (Reventa)</SelectItem>
                <SelectItem value="Productivo">Productivo (Fabricación)</SelectItem>
                <SelectItem value="Servicios">Servicios (Oficios, Manicura, etc.)</SelectItem>
              </SelectContent>
            </Select>

            <AnimatePresence>
              {showTypeHelp && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden text-2xs bg-blue-50 border border-blue-100 text-blue-900 rounded-lg p-3 space-y-1"
                >
                  <p className="font-bold">🎯 Guía para el tipo de negocio:</p>
                  <p>• <strong>Comercial</strong>: Compra de bienes para revender (ej. indumentaria ya hecha, almacén).</p>
                  <p>• <strong>Productivo</strong>: Compra materias primas para transformarlas (ej. pastelería, costura propia).</p>
                  <p>• <strong>Servicios</strong>: Ofreces tu conocimiento / tiempo a cambio de pago (ej. peluquera, plomería).</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="description">¿Qué vendés o qué hacés exactamente? (Detalle corto)</Label>
            <Textarea
              id="description" 
              value={data.description} 
              onChange={(e) => handleChange("description", e.target.value)} 
              placeholder="Ej: Vendo remeras y jeans de temporada que busco en Flores. Los vendo a domicilio o redes."
              className="min-h-[70px] text-sm"
            />
          </div>

          {/* ¿Está en funcionamiento actualmente? */}
          <div className="space-y-2">
            <Label htmlFor="isRunning">¿Está en funcionamiento el emprendimiento actualmente?</Label>
            <Select value={data.isRunning || "Si"} onValueChange={(val) => handleChange("isRunning", val)}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Si">Sí, está activo actualmente</SelectItem>
                <SelectItem value="No">No, está pausado o inactivo</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {data.isRunning === "No" && (
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="notRunningReason">Contanos por qué no está en funcionamiento actualmente</Label>
              <Textarea
                id="notRunningReason" 
                value={data.notRunningReason || ""} 
                onChange={(e) => handleChange("notRunningReason", e.target.value)} 
                placeholder="Ej: Me quedé sin capital de trabajo para insumos o me rompieron la máquina."
                className="min-h-[70px] text-sm"
              />
            </div>
          )}
        </div>
      </div>

      {/* SECCIÓN 6 — PRESUPUESTO DEL EMPRENDIMIENTO (Reactive Spreadsheet) */}
      <div className="p-6 bg-white rounded-xl border border-indigo-150 space-y-6 shadow-xs">
        <div className="flex items-center gap-2">
          <div className="bg-indigo-100 p-2 rounded-lg text-indigo-700">
            <Calculator className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">
              Sección 6: Presupuesto del Emprendimiento (Planilla de Trabajo)
            </h3>
            <p className="text-2xs text-slate-500">
              Carga tus productos o servicios principales. Calculamos de forma automática tu margen y ganancias.
            </p>
          </div>
        </div>

        {/* Dynamic Table */}
        <div className="overflow-x-auto border rounded-xl bg-slate-50/50">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead className="bg-slate-100/80 text-xs font-bold text-slate-700 border-b">
              <tr>
                <th className="p-3">Producto / Servicio</th>
                <th className="p-3 w-[120px]">Costo Unit. ($)</th>
                <th className="p-3 w-[120px]">Precio Venta ($)</th>
                <th className="p-3 w-[100px] text-center text-indigo-900">Ganancia Unit.</th>
                <th className="p-3 w-[100px] text-center text-slate-500">Markup %</th>
                <th className="p-3 w-[110px]">Cant. Semanal</th>
                <th className="p-3 w-[120px] text-center text-indigo-900">Total Gan. Semanal</th>
                <th className="p-3 w-[50px] text-center">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y text-slate-800 text-xs">
              {currentProducts.map((p, index) => {
                const uCost = Number(p.unitCost) || 0;
                const uPrice = Number(p.unitPrice) || 0;
                const wQty = Number(p.weeklyQty) || 0;
                const unitGain = uPrice - uCost;
                const totalGain = unitGain * wQty;
                const markup = uCost > 0 ? Math.round((unitGain / uCost) * 100) : 0;

                return (
                  <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-2.5">
                      <Input
                        value={p.name}
                        onChange={(e) => handleProductChange(index, "name", e.target.value)}
                        placeholder="Ej: Remera Algodón"
                        className="h-8 bg-white text-xs"
                      />
                    </td>
                    <td className="p-2.5">
                      <Input
                        type="number"
                        min={0}
                        value={p.unitCost || ""}
                        onChange={(e) => handleProductChange(index, "unitCost", parseFloat(e.target.value) || 0)}
                        placeholder="0"
                        className="h-8 bg-white text-xs"
                      />
                    </td>
                    <td className="p-2.5">
                      <Input
                        type="number"
                        min={0}
                        value={p.unitPrice || ""}
                        onChange={(e) => handleProductChange(index, "unitPrice", parseFloat(e.target.value) || 0)}
                        placeholder="0"
                        className="h-8 bg-white text-xs"
                      />
                    </td>
                    <td className="p-2.5 text-center font-bold text-indigo-800 bg-indigo-50/20">
                      ${unitGain.toLocaleString()}
                    </td>
                    <td className="p-2.5 text-center text-slate-500 font-mono">
                      {markup > 0 ? `${markup}%` : "0%"}
                    </td>
                    <td className="p-2.5">
                      <Input
                        type="number"
                        min={0}
                        value={p.weeklyQty || ""}
                        onChange={(e) => handleProductChange(index, "weeklyQty", parseInt(e.target.value) || 0)}
                        placeholder="0"
                        className="h-8 bg-white text-xs"
                      />
                    </td>
                    <td className="p-2.5 text-center font-extrabold text-emerald-700 bg-emerald-50/20">
                      ${totalGain.toLocaleString()}
                    </td>
                    <td className="p-2.5 text-center">
                      <button
                        type="button"
                        onClick={() => removeProduct(index)}
                        disabled={currentProducts.length <= 1}
                        className="text-slate-400 hover:text-red-500 disabled:opacity-30 p-1"
                      >
                        <Trash2 className="w-4 h-4 mx-auto" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Add Product Button */}
        <button
          type="button"
          onClick={addProduct}
          disabled={currentProducts.length >= 10}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-indigo-700 hover:text-indigo-900 border border-indigo-200 hover:border-indigo-400 rounded-lg bg-indigo-50/50 hover:bg-indigo-50 font-semibold transition-all disabled:opacity-50"
        >
          <Plus className="w-4 h-4" />
          <span>Agregar producto / servicio (Máximo 10)</span>
        </button>

        {/* Costos fijos y Viaticos */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t">
          <div className="space-y-1">
            <Label htmlFor="fixedCosts" className="text-slate-800 font-semibold text-xs">
              Costos fijos mensuales del emprendimiento ($)
            </Label>
            <p className="text-3xs text-slate-500">Ej: Alquiler de local, luz comercial, cuota monotributo, etc.</p>
            <Input
              id="fixedCosts"
              type="number"
              min={0}
              value={data.fixedCosts || ""}
              onChange={(e) => handleChange("fixedCosts", parseFloat(e.target.value) || 0)}
              placeholder="0"
              className="bg-white"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="travelExpenses" className="text-slate-800 font-semibold text-xs">
              Viáticos / Gastos de transporte semanal ($)
            </Label>
            <p className="text-3xs text-slate-500">Ej: Nafta, SUBE para ir a buscar mercadería, fletes, etc.</p>
            <Input
              id="travelExpenses"
              type="number"
              min={0}
              value={data.travelExpenses || ""}
              onChange={(e) => handleChange("travelExpenses", parseFloat(e.target.value) || 0)}
              placeholder="0"
              className="bg-white"
            />
          </div>
        </div>

        {/* SUMMARY LIVE PREVIEW PANEL */}
        <div className="bg-emerald-50 border border-emerald-250 rounded-xl p-5 mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 shadow-sm">
          <div className="space-y-1">
            <span className="text-3xs font-bold uppercase tracking-wider text-emerald-800">MARGEN SEMANAL NETO</span>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-emerald-950">${netWeeklyCalculated.toLocaleString()}</span>
              <span className="text-2xs text-emerald-700">/ semana</span>
            </div>
            <p className="text-3xs text-emerald-600 leading-none">Ventas de productos menos gastos fijos y fletes.</p>
          </div>
          <div className="space-y-1 border-t sm:border-t-0 sm:border-l sm:pl-6 pt-3 sm:pt-0">
            <span className="text-3xs font-bold uppercase tracking-wider text-emerald-800">MARGEN MENSUAL NETO (X4)</span>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-indigo-950">${netMonthlyCalculated.toLocaleString()}</span>
              <span className="text-2xs text-emerald-700">/ mes</span>
            </div>
            <span className="text-3xs inline-flex items-center gap-1 font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              Dato clave para evaluación de capacidad de repago.
            </span>
          </div>
        </div>
      </div>

      {/* REGISTRO DE VENTAS - ÚLTIMOS 3 MESES */}
      <div className="p-6 bg-slate-50 rounded-xl border border-slate-200 space-y-4">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-indigo-600" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
            Registro Histórico de Ventas de los últimos 3 meses
          </h4>
        </div>
        <p className="text-3xs text-slate-500">
          Cargá lo que mejor recuerdes. Si no tenés el registro exacto de cada mes anterior, ingresá un promedio o estimado.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {(data.accountingMonths || []).map((m, index) => (
            <div key={m.period} className="bg-white border rounded-xl p-4 space-y-3 shadow-2xs hover:border-indigo-300 transition-colors">
              <div className="flex items-center justify-between border-b pb-1.5">
                <span className="font-bold text-slate-900 text-xs">{m.period}</span>
                <span className="text-3xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full font-medium">Historial</span>
              </div>

              <div className="space-y-1.5">
                <Label className="text-3xs text-slate-500">Producto / Servicio vendido</Label>
                <Input
                  value={m.productOrService}
                  onChange={(e) => handleAccountingChange(index, "productOrService", e.target.value)}
                  placeholder="Ej: Remeras, frolas, etc."
                  className="h-8 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-3xs text-slate-500">Total facturado en el mes ($)</Label>
                <Input
                  type="number"
                  min={0}
                  value={m.totalBilled || ""}
                  onChange={(e) => handleAccountingChange(index, "totalBilled", parseFloat(e.target.value) || 0)}
                  placeholder="0"
                  className="h-8 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-3xs text-emerald-800 font-semibold">Ganancia neta del mes ($)</Label>
                <Input
                  type="number"
                  min={0}
                  value={m.profit || ""}
                  onChange={(e) => handleAccountingChange(index, "profit", parseFloat(e.target.value) || 0)}
                  placeholder="0"
                  className="h-8 text-xs border-emerald-250 focus-visible:ring-emerald-500 bg-emerald-50/10"
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
