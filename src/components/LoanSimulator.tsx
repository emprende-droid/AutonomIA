import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calculator, Info, AlertCircle, FileDown, Table as TableIcon } from "lucide-react";
import { AppSettings } from "../types";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

interface Props {
  settings: AppSettings;
}

export default function LoanSimulator({ settings }: Props) {
  const [selectedProductName, setSelectedProductName] = useState<string>(settings.loanProducts[0]?.name || "");
  const [amount, setAmount] = useState<number | "">(10000);
  const [frequency, setFrequency] = useState<'Weekly' | 'Monthly'>('Monthly');
  const [installments, setInstallments] = useState<number | "">(6);
  
  // Helper for thousands formatting
  const formatAmount = (val: number | "") => {
    if (val === "" || isNaN(val)) return "";
    return val.toLocaleString('es-AR');
  };

  const parseAmount = (val: string) => {
    const numeric = val.replace(/\D/g, "");
    return numeric === "" ? "" : parseInt(numeric, 10);
  };

  const numAmount = typeof amount === 'number' ? amount : 0;
  const numInstallments = typeof installments === 'number' ? installments : 0;

  const selectedProduct = settings.loanProducts.find(p => p.name === selectedProductName);
  const baseMonthlyRate = selectedProduct?.interestRate || 0.05;
  const rate = frequency === 'Weekly' ? baseMonthlyRate / 4 : baseMonthlyRate;
  
  const maxAmount = selectedProduct?.maxAmount || 150000;
  const maxInstallments = frequency === 'Weekly' ? (selectedProduct?.maxInstallments || 6) * 4 : (selectedProduct?.maxInstallments || 6);
  
  const calculatePayment = () => {
    if (numAmount <= 0 || numInstallments <= 0) return 0;
    const p = (numAmount * rate * Math.pow(1 + rate, numInstallments)) / (Math.pow(1 + rate, numInstallments) - 1);
    return Math.round(p);
  };

  const periodicPayment = calculatePayment();
  const totalRepayment = periodicPayment * numInstallments;

  const generateInstallments = () => {
    const installmentList = [];
    let remainingBalance = numAmount;
    const now = new Date();

    for (let i = 1; i <= numInstallments; i++) {
      const interest = remainingBalance * rate;
      const principal = periodicPayment - interest;
      remainingBalance -= principal;

      const dueDate = new Date(now);
      if (frequency === 'Weekly') {
        dueDate.setDate(now.getDate() + (i * 7));
      } else {
        dueDate.setMonth(now.getMonth() + i);
      }

      installmentList.push({
        number: i,
        dueDate: dueDate.toLocaleDateString(),
        principal: Math.max(0, principal),
        interest: Math.max(0, interest),
        total: periodicPayment
      });
    }
    return installmentList;
  };

  const installmentDetails = generateInstallments();

  const generatePDF = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(20);
    doc.text("Simulación de Préstamo - Mujeres 2000", 14, 22);
    
    doc.setFontSize(12);
    doc.text(`Fecha: ${new Date().toLocaleDateString()}`, 14, 32);
    doc.text(`Tipo de Crédito: ${selectedProductName}`, 14, 42);
    doc.text(`Monto Solicitado: $${(amount || 0).toLocaleString('es-AR')}`, 14, 52);
    doc.text(`Frecuencia de Pago: ${frequency === 'Weekly' ? 'Semanal' : 'Mensual'}`, 14, 62);
    doc.text(`Cantidad de Cuotas: ${installments || 0}`, 14, 72);
    doc.text(`Cuota Estimada: $${periodicPayment.toLocaleString('es-AR')}`, 14, 82);
    doc.text(`Total a Devolver: $${totalRepayment.toLocaleString('es-AR')}`, 14, 92);

    const tableData = installmentDetails.map(inst => [
      inst.number,
      inst.dueDate,
      `$${Math.round(inst.principal).toLocaleString('es-AR')}`,
      `$${Math.round(inst.interest).toLocaleString('es-AR')}`,
      `$${Math.round(inst.total).toLocaleString('es-AR')}`
    ]);

    autoTable(doc, {
      startY: 110,
      head: [['Cuota', 'Vencimiento', 'Capital', 'Interés', 'Total']],
      body: tableData,
    });

    doc.save(`simulacion_prestamo_${Date.now()}.pdf`);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Card className="border-none shadow-xl">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div>
            <div className="flex items-center gap-2">
              <Calculator className="w-6 h-6 text-primary" />
              <CardTitle>Simulador de Préstamo</CardTitle>
            </div>
            <CardDescription>
              Calcula el valor estimado de tus cuotas {frequency === 'Weekly' ? 'semanales' : 'mensuales'}.
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={generatePDF} className="text-primary border-primary/20 hover:bg-primary/5">
            <FileDown className="w-4 h-4 mr-2" />
            PDF
          </Button>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>Tipo de Préstamo</Label>
              <Select value={selectedProductName} onValueChange={setSelectedProductName}>
                <SelectTrigger className="w-full">
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
              <Label>Frecuencia de Pago</Label>
              <Select value={frequency} onValueChange={(val: 'Weekly' | 'Monthly') => {
                setFrequency(val);
                // Adjust installments when switching frequency
                if (val === 'Weekly') setInstallments(prev => prev === "" ? "" : prev * 4);
                else setInstallments(prev => prev === "" ? "" : Math.max(1, Math.round(prev / 4)));
              }}>
                <SelectTrigger className="w-full">
                  <SelectValue>
                    {frequency === 'Weekly' ? 'Semanal' : 'Mensual'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Weekly">Semanal</SelectItem>
                  <SelectItem value="Monthly">Mensual</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="amount">Monto a solicitar ($)</Label>
              <Input 
                id="amount" 
                type="text" 
                inputMode="numeric"
                value={formatAmount(amount)} 
                onChange={(e) => setAmount(parseAmount(e.target.value))}
                placeholder="Ej: 50.000"
                className={(typeof amount === 'number' && amount > maxAmount) ? "border-red-500" : ""}
              />
              {(typeof amount === 'number' && amount > maxAmount) && (
                <div className="flex items-center gap-1 text-red-600 text-[10px] font-medium">
                  <AlertCircle className="w-3 h-3" />
                  <span>Máximo permitido: ${maxAmount.toLocaleString('es-AR')}</span>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="installments">Cantidad de cuotas ({frequency === 'Weekly' ? 'semanas' : 'meses'})</Label>
              <Input 
                id="installments" 
                type="text" 
                inputMode="numeric"
                value={installments === "" ? "" : installments} 
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, "");
                  setInstallments(val === "" ? "" : parseInt(val, 10));
                }}
                placeholder="Ej: 6"
                className={(typeof installments === 'number' && installments > maxInstallments) ? "border-red-500" : ""}
              />
              {(typeof installments === 'number' && installments > maxInstallments) && (
                <div className="flex items-center gap-1 text-red-600 text-[10px] font-medium">
                  <AlertCircle className="w-3 h-3" />
                  <span>Máximo permitido: {maxInstallments} cuotas</span>
                </div>
              )}
            </div>
          </div>

          <div className="bg-primary/5 p-6 rounded-xl border border-primary/10">
            <div className="flex flex-col items-center text-center space-y-2">
              <span className="text-sm text-slate-500 uppercase font-bold tracking-wider">Cuota {frequency === 'Weekly' ? 'Semanal' : 'Mensual'} Estimada</span>
              <span className="text-4xl font-bold text-primary">${periodicPayment.toLocaleString('es-AR')}</span>
              <div className="flex items-center gap-1 text-xs text-slate-400 mt-2">
                <Info className="w-3 h-3" />
                <span>Tasa de interés {frequency === 'Weekly' ? 'semanal' : 'mensual'} estimada: {(rate * 100).toFixed(2)}%</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="p-4 bg-slate-50 rounded-lg">
              <span className="block text-slate-500">Total a devolver</span>
              <span className="font-bold text-slate-900">${totalRepayment.toLocaleString('es-AR')}</span>
            </div>
            <div className="p-4 bg-slate-50 rounded-lg">
              <span className="block text-slate-500">Interés total</span>
              <span className="font-bold text-slate-900">${(totalRepayment - numAmount).toLocaleString('es-AR')}</span>
            </div>
          </div>

          {/* Installments Detail Table */}
          <div className="space-y-3 pt-4 border-t">
            <div className="flex items-center gap-2 text-slate-700">
              <TableIcon className="w-4 h-4" />
              <Label className="text-base font-semibold">Detalle de Cuotas</Label>
            </div>
            <div className="rounded-md border overflow-x-auto scrollbar-thin scrollbar-thumb-slate-200">
              <Table className="min-w-[500px] lg:min-w-0">
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead className="w-16 whitespace-nowrap">Cuota</TableHead>
                    <TableHead className="whitespace-nowrap">Vencimiento</TableHead>
                    <TableHead className="whitespace-nowrap">Capital</TableHead>
                    <TableHead className="whitespace-nowrap">Interés</TableHead>
                    <TableHead className="text-right whitespace-nowrap">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {installmentDetails.map((inst) => (
                    <TableRow key={inst.number} className="text-xs">
                      <TableCell className="font-medium">{inst.number}</TableCell>
                      <TableCell>{inst.dueDate}</TableCell>
                      <TableCell>${Math.round(inst.principal).toLocaleString('es-AR')}</TableCell>
                      <TableCell>${Math.round(inst.interest).toLocaleString('es-AR')}</TableCell>
                      <TableCell className="text-right font-bold">${Math.round(inst.total).toLocaleString('es-AR')}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-100 flex gap-3">
        <Info className="w-5 h-5 text-blue-500 shrink-0" />
        <p className="text-sm text-blue-700">
          Esta simulación es orientativa. Las condiciones finales del crédito serán evaluadas por el equipo de Mujeres 2000 tras analizar tu solicitud.
        </p>
      </div>
    </div>
  );
}
