import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Camera, Upload, X, Loader2, FileDown, Table as TableIcon, HelpCircle, HardDrive, Shield } from "lucide-react";
import { LoanDetails, AppSettings, MachineryDetails } from "../types";
import ImageUpload from "./ImageUpload";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { motion, AnimatePresence } from "motion/react";

interface Props {
  data: LoanDetails;
  onChange: (data: LoanDetails) => void;
  settings: AppSettings;
  validationErrors?: string[];
}

export default function Step4LoanDetails({ data, onChange, settings, validationErrors }: Props) {
  const isInvalid = (field: string) => validationErrors?.includes(field);

  // Ensure default value is set if empty
  React.useEffect(() => {
    if (!data.creditType && settings.loanProducts.length > 0) {
      onChange({ 
        ...data, 
        creditType: settings.loanProducts[0].name,
        isRenovation: data.isRenovation || "No",
        creditUseType: data.creditUseType || "Insumos",
        machineryDetails: data.machineryDetails || {
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
          machineryPhotos: []
        }
      });
    }
  }, [settings.loanProducts, data.creditType]);

  const handleChange = (field: keyof LoanDetails, value: any) => {
    onChange({ ...data, [field]: value });
  };

  const handleMachineryChange = (key: keyof MachineryDetails, val: any) => {
    const details = data.machineryDetails || {
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
      machineryPhotos: []
    };
    onChange({
      ...data,
      machineryDetails: {
        ...details,
        [key]: val
      }
    });
  };

  // Helper for thousands formatting
  const formatAmount = (val: number) => {
    if (!val || isNaN(val)) return "";
    return val.toLocaleString('es-AR');
  };

  const parseAmount = (val: string) => {
    const numeric = val.replace(/\D/g, "");
    return numeric === "" ? 0 : parseInt(numeric, 10);
  };

  const selectedProduct = settings.loanProducts.find(p => p.name === data.creditType);
  const maxAmount = selectedProduct?.maxAmount || 150000;
  const baseMonthlyRate = selectedProduct?.interestRate || 0.05;
  const rate = data.paymentFrequency === 'Weekly' ? baseMonthlyRate / 4 : baseMonthlyRate;
  const maxInstallments = data.paymentFrequency === 'Weekly' ? (selectedProduct?.maxInstallments || 6) * 4 : (selectedProduct?.maxInstallments || 6);

  const calculatePayment = () => {
    if (data.requestedAmount <= 0 || data.installmentsCount <= 0) return 0;
    const p = (data.requestedAmount * rate * Math.pow(1 + rate, data.installmentsCount)) / (Math.pow(1 + rate, data.installmentsCount) - 1);
    return Math.round(p);
  };

  const periodicPayment = calculatePayment();
  const totalRepayment = periodicPayment * data.installmentsCount;

  const generateInstallments = () => {
    const installments = [];
    let remainingBalance = data.requestedAmount;
    const now = new Date();

    for (let i = 1; i <= data.installmentsCount; i++) {
      const interest = remainingBalance * rate;
      const principal = periodicPayment - interest;
      remainingBalance -= principal;

      const dueDate = new Date(now);
      if (data.paymentFrequency === 'Weekly') {
        dueDate.setDate(now.getDate() + (i * 7));
      } else {
        dueDate.setMonth(now.getMonth() + i);
      }

      installments.push({
        number: i,
        dueDate: dueDate.toLocaleDateString(),
        principal: Math.max(0, principal),
        interest: Math.max(0, interest),
        total: periodicPayment
      });
    }
    return installments;
  };

  const installments = generateInstallments();

  const generatePDF = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(20);
    doc.text("Solicitud de Microcrédito - Mujeres 2000", 14, 22);
    
    doc.setFontSize(12);
    doc.text(`Fecha: ${new Date().toLocaleDateString()}`, 14, 32);
    doc.text(`Tipo de Crédito: ${data.creditType}`, 14, 42);
    doc.text(`Renovación: ${data.isRenovation || "No"}`, 14, 52);
    doc.text(`Destinado a: ${data.creditUseType || "Insumos"}`, 14, 62);
    doc.text(`Monto Solicitado: $${data.requestedAmount.toLocaleString('es-AR')}`, 14, 72);
    doc.text(`Frecuencia de Pago: ${data.paymentFrequency === 'Weekly' ? 'Semanal' : 'Mensual'}`, 14, 82);
    doc.text(`Cantidad de Cuotas: ${data.installmentsCount}`, 14, 92);
    doc.text(`Cuota Estimada: $${periodicPayment.toLocaleString('es-AR')}`, 14, 102);
    doc.text(`Total a Devolver: $${totalRepayment.toLocaleString('es-AR')}`, 14, 112);

    doc.text("Motivo del Microcrédito:", 14, 125);
    const splitJustification = doc.splitTextToSize(data.justification || "Sin motivo especificado", 180);
    doc.text(splitJustification, 14, 133);

    const tableData = installments.map(inst => [
      inst.number,
      inst.dueDate,
      `$${Math.round(inst.principal).toLocaleString('es-AR')}`,
      `$${Math.round(inst.interest).toLocaleString('es-AR')}`,
      `$${Math.round(inst.total).toLocaleString('es-AR')}`
    ]);

    autoTable(doc, {
      startY: 160,
      head: [['Cuota', 'Vencimiento', 'Capital', 'Interés', 'Total']],
      body: tableData,
    });

    doc.save(`solicitud_prestamo_${Date.now()}.pdf`);
  };

  const mDetails = data.machineryDetails || {
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
    machineryPhotos: []
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 border-b pb-2 mb-4">
          Sección 5: Detalles del Microcrédito Solicitado
        </h3>
        <Button variant="outline" size="sm" onClick={generatePDF} className="text-indigo-700 border-indigo-200 hover:bg-indigo-50">
          <FileDown className="w-4 h-4 mr-2" />
          Descargar PDF de simulación
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Renovacion Selector */}
        <div className="space-y-2">
          <Label htmlFor="isRenovation">¿Es una renovación de crédito?</Label>
          <Select value={data.isRenovation || "No"} onValueChange={(val) => handleChange("isRenovation", val)}>
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="No">No, es mi primer crédito</SelectItem>
              <SelectItem value="Si">Sí, ya tuve créditos anteriormente</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Tipo de crédito (Insumos vs Maquinaria) */}
        <div className="space-y-2">
          <Label htmlFor="creditUseType">¿En qué vas a usar el dinero del microcrédito?</Label>
          <Select value={data.creditUseType || "Insumos"} onValueChange={(val: any) => handleChange("creditUseType", val)}>
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Insumos">Compra de Insumos / Mercaderías</SelectItem>
              <SelectItem value="Maquinaria">Compra de Maquinaria / Bien de Capital (Herramientas)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Conditional previous credit success */}
        {data.isRenovation === "Si" && (
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="previousCreditObjective">
              ¿Cuál era el objetivo del crédito anterior? ¿Lo lograste? <span className="text-red-500 ml-0.5 font-bold">*</span>
            </Label>
            <Textarea
              id="previousCreditObjective"
              value={data.previousCreditObjective || ""}
              onChange={(e) => handleChange("previousCreditObjective", e.target.value)}
              placeholder="Contanos qué compraste con el crédito anterior y si pudiste alcanzar la meta que querías..."
              className="min-h-[70px] text-sm"
            />
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="creditType" className={isInvalid("loanDetails.creditType") ? "text-red-600 font-semibold" : ""}>
            Esquema del Crédito <span className="text-red-500 ml-0.5 font-bold">*</span>
          </Label>
          <Select value={data.creditType} onValueChange={(val) => handleChange("creditType", val)}>
            <SelectTrigger className={`w-full ${isInvalid("loanDetails.creditType") ? "border-red-500 focus:ring-red-500 bg-red-50/30" : ""}`}>
              <SelectValue placeholder="Seleccionar producto..." />
            </SelectTrigger>
            <SelectContent>
              {settings.loanProducts.map(p => (
                <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="requestedAmount" className={isInvalid("loanDetails.requestedAmount") ? "text-red-600 font-semibold" : ""}>
            Monto solicitado ($) <span className="text-red-500 ml-0.5 font-bold">*</span>
          </Label>
          <Input 
            id="requestedAmount" 
            type="text"
            inputMode="numeric"
            value={formatAmount(data.requestedAmount)} 
            onChange={(e) => handleChange("requestedAmount", parseAmount(e.target.value))} 
            placeholder="Ej: 50.000"
            className={`${data.requestedAmount > maxAmount ? "border-red-500 focus-visible:ring-red-500" : ""} ${isInvalid("loanDetails.requestedAmount") ? "border-red-500 focus-visible:ring-red-500 bg-red-50/30" : ""}`}
          />
          {data.requestedAmount > maxAmount && (
            <div className="flex items-center gap-1.5 text-red-600 text-[10px] font-medium mt-1">
              <AlertCircle className="w-3 h-3" />
              <span>El monto máximo permitido para este producto es ${maxAmount.toLocaleString('es-AR')}</span>
            </div>
          )}
          {selectedProduct && (
            <p className="text-[10px] text-slate-500 mt-1">
              Mínimo: ${selectedProduct.minAmount.toLocaleString('es-AR')} | Máximo: ${selectedProduct.maxAmount.toLocaleString('es-AR')}
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="paymentFrequency">Frecuencia de Pago</Label>
          <Select value={data.paymentFrequency} onValueChange={(val: 'Weekly' | 'Monthly') => {
            const newInstallments = val === 'Weekly' ? data.installmentsCount * 4 : Math.max(1, Math.round(data.installmentsCount / 4));
            onChange({ ...data, paymentFrequency: val, installmentsCount: newInstallments });
          }}>
            <SelectTrigger className="w-full">
              <SelectValue>
                {data.paymentFrequency === 'Weekly' ? 'Semanal' : 'Mensual'}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Weekly">Semanal</SelectItem>
              <SelectItem value="Monthly">Mensual</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="installmentsCount" className={isInvalid("loanDetails.installmentsCount") ? "text-red-600 font-semibold" : ""}>
            Cantidad de cuotas ({data.paymentFrequency === 'Weekly' ? 'semanas' : 'meses'}) <span className="text-red-500 ml-0.5 font-bold">*</span>
          </Label>
          <Input 
            id="installmentsCount" 
            type="text"
            inputMode="numeric"
            value={data.installmentsCount || ""} 
            onChange={(e) => {
              const val = e.target.value.replace(/\D/g, "");
              handleChange("installmentsCount", val === "" ? 0 : parseInt(val, 10));
            }} 
            placeholder="Ej: 6"
            className={`${data.installmentsCount > maxInstallments ? "border-red-500" : ""} ${isInvalid("loanDetails.installmentsCount") ? "border-red-500 focus-visible:ring-red-500 bg-red-50/30" : ""}`}
          />
          {data.installmentsCount > maxInstallments && (
            <div className="flex items-center gap-1.5 text-red-600 text-[10px] font-medium mt-1">
              <AlertCircle className="w-3 h-3" />
              <span>El máximo permitido es {maxInstallments} cuotas</span>
            </div>
          )}
        </div>
      </div>

      <div className="bg-primary/5 p-4 rounded-lg border border-primary/10">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">Cuota {data.paymentFrequency === 'Weekly' ? 'Semanal' : 'Mensual'} Estimada</p>
            <p className="text-2xl font-bold text-primary">$ {periodicPayment.toLocaleString('es-AR')}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">Total a Devolver</p>
            <p className="text-lg font-bold text-slate-700">$ {totalRepayment.toLocaleString('es-AR')}</p>
          </div>
        </div>
      </div>

      {/* CONDITIONAL BIEN DE CAPITAL SECTION (ONLY IF creditUseType === Maquinaria) */}
      <AnimatePresence>
        {data.creditUseType === "Maquinaria" && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 15 }}
            className="p-6 bg-indigo-50/40 rounded-xl border border-indigo-200 mt-6 space-y-6"
          >
            <div className="flex items-center gap-2 border-b border-indigo-100 pb-3">
              <HardDrive className="w-5 h-5 text-indigo-700" />
              <div>
                <h4 className="text-sm font-bold text-indigo-950 uppercase tracking-wide">
                  Sección Especial: Compra de Bien de Capital (Maquinaria / Herramientas)
                </h4>
                <p className="text-[10px] text-indigo-800">
                  Por favor complete los detalles del equipamiento comercial que desea incorporar.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <Label htmlFor="machineryType">Tipo de Maquinaria o Herramienta</Label>
                <Input
                  id="machineryType"
                  value={mDetails.machineryType || ""}
                  onChange={(e) => handleMachineryChange("machineryType", e.target.value)}
                  placeholder="Ej: Horno Convector, Cortadora de Fiambre"
                  className="bg-white text-xs h-9"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="brand">Marca del bien</Label>
                <Input
                  id="brand"
                  value={mDetails.brand || ""}
                  onChange={(e) => handleMachineryChange("brand", e.target.value)}
                  placeholder="Ej: Oster, Singer, Refrey"
                  className="bg-white text-xs h-9"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="condition">Antigüedad/Estado del bien</Label>
                <Select value={mDetails.condition || "Nueva"} onValueChange={(val: any) => handleMachineryChange("condition", val)}>
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="Seleccionar..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Nueva">Es Nueva (Sin uso)</SelectItem>
                    <SelectItem value="Usada">Es Usada (Segunda mano)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {mDetails.condition === "Usada" && (
                <div className="space-y-1.5">
                  <Label htmlFor="usedYears">¿Cuántos años de antigüedad aproximados tiene?</Label>
                  <Input
                    id="usedYears"
                    value={mDetails.usedYears || ""}
                    onChange={(e) => handleMachineryChange("usedYears", e.target.value)}
                    placeholder="Ej: 3 años de uso"
                    className="bg-white text-xs h-9"
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="hasWarranty">¿Posee garantía de compra?</Label>
                <Select value={mDetails.hasWarranty || "No"} onValueChange={(val: any) => handleMachineryChange("hasWarranty", val)}>
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="Seleccionar..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="No">No posee garantía</SelectItem>
                    <SelectItem value="Si">Sí posee garantía de fábrica/vendedor</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {mDetails.hasWarranty === "Si" && (
                <div className="space-y-1.5">
                  <Label htmlFor="warrantyDuration">Duración de la garantía</Label>
                  <Input
                    id="warrantyDuration"
                    value={mDetails.warrantyDuration || ""}
                    onChange={(e) => handleMachineryChange("warrantyDuration", e.target.value)}
                    placeholder="Ej: 6 meses o 1 año"
                    className="bg-white text-xs h-9"
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="purchasePlace">Lugar / Proveedor de compra</Label>
                <Input
                  id="purchasePlace"
                  value={mDetails.purchasePlace || ""}
                  onChange={(e) => handleMachineryChange("purchasePlace", e.target.value)}
                  placeholder="Ej: MercadoLibre o Bazar Colón"
                  className="bg-white text-xs h-9"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="shippedToHome">¿Te lo envían al domicilio?</Label>
                <Select value={mDetails.shippedToHome || "No"} onValueChange={(val: any) => handleMachineryChange("shippedToHome", val)}>
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="Seleccionar..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="No">No, lo retiro yo misma</SelectItem>
                    <SelectItem value="Si">Sí, me lo envían</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {mDetails.shippedToHome === "Si" && (
                <div className="space-y-1.5">
                  <Label htmlFor="shippingCost">Costo de envío ($)</Label>
                  <Input
                    id="shippingCost"
                    type="number"
                    min={0}
                    value={mDetails.shippingCost || ""}
                    onChange={(e) => handleMachineryChange("shippingCost", parseFloat(e.target.value) || 0)}
                    placeholder="0"
                    className="bg-white text-xs h-9"
                  />
                </div>
              )}
            </div>

            <div className="space-y-2 pt-2">
              <Label htmlFor="whyThisOption">
                ¿Por qué elegiste ese bien? Ventajas y desventajas respecto a otros modelos
              </Label>
              <Textarea
                id="whyThisOption"
                value={mDetails.whyThisOption || ""}
                onChange={(e) => handleMachineryChange("whyThisOption", e.target.value)}
                placeholder="Ej: Lo elegí porque gasta menos gas y tiene un tamaño que entra perfecto en mi cocina. Vi uno más grande pero costaba el doble del envío..."
                className="min-h-[70px] bg-white text-xs"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="estimatedBenefit">
                ¿Estimaste el beneficio de incorporar esta maquinaria a tu producción? Describilo brevemente
              </Label>
              <Textarea
                id="estimatedBenefit"
                value={mDetails.estimatedBenefit || ""}
                onChange={(e) => handleMachineryChange("estimatedBenefit", e.target.value)}
                placeholder="Ej: Al cocinar con este horno convector voy a poder cocinar 4 bandejas a la vez en vez de 1 sola. Voy a triplicar las pastafrolas por hora ahorrando el 50% de gas por producto..."
                className="min-h-[70px] bg-white text-xs"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-2">
        <Label htmlFor="justification" className={isInvalid("loanDetails.justification") ? "text-red-600 font-semibold" : ""}>
          ¿Dinos el motivo por el que solicitas el microcrédito? <span className="text-red-500 ml-0.5 font-bold">*</span>
        </Label>
        <Textarea 
          id="justification" 
          value={data.justification} 
          onChange={(e) => handleChange("justification", e.target.value)} 
          placeholder="Describe el motivo de tu solicitud..."
          className={`min-h-[100px] ${isInvalid("loanDetails.justification") ? "border-red-500 focus-visible:ring-red-500 bg-red-50/30" : ""}`}
        />
      </div>

      <div className="space-y-4 pt-4 border-t">
        <ImageUpload 
          label="Presupuesto de la compra o foto del bien"
          value={data.budgetPhoto || ""}
          onChange={(url) => handleChange("budgetPhoto", url)}
          folder="budgets"
        />
      </div>

      <div className="space-y-2 pt-4 border-t">
        <Label htmlFor="comments">Comentarios adicionales</Label>
        <Textarea 
          id="comments" 
          value={data.comments || ""} 
          onChange={(e) => handleChange("comments", e.target.value)} 
          placeholder="Cualquier otra información relevante..."
        />
      </div>
    </div>
  );
}
