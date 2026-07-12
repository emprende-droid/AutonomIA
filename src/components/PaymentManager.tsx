import React, { useState } from "react";
import { toast } from "sonner";
import { LoanApplication, Installment } from "../types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Calendar, 
  DollarSign, 
  Upload, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  ExternalLink,
  FileText
} from "lucide-react";
import { doc, updateDoc } from "firebase/firestore";
import { db, storage } from "../firebase";
import { ref, uploadString, getDownloadURL } from "firebase/storage";

interface Props {
  application: LoanApplication;
  whatsappNumber?: string;
}

export default function PaymentManager({ application, whatsappNumber }: Props) {
  const [uploadingId, setUploadingId] = useState<number | null>(null);

  const handleProofUpload = async (e: React.ChangeEvent<HTMLInputElement>, installmentNumber: number) => {
    const file = e.target.files?.[0];
    if (!file || !application.paymentSchedule) return;

    try {
      // 1. Process files and obtain clean compressed base64 FIRST before any state changes (crucial for iOS Safari)
      const base64String = await new Promise<string>((resolve, reject) => {
        if (file.type.startsWith("image/")) {
          const reader = new FileReader();
          reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
              const canvas = document.createElement("canvas");
              const maxWidth = 1200;
              const maxHeight = 1200;
              let width = img.width;
              let height = img.height;

              if (width > height) {
                if (width > maxWidth) {
                  height = Math.round((height * maxWidth) / width);
                  width = maxWidth;
                }
              } else {
                if (height > maxHeight) {
                  width = Math.round((width * maxHeight) / height);
                  height = maxHeight;
                }
              }

              canvas.width = width;
              canvas.height = height;
              const ctx = canvas.getContext("2d");
              if (!ctx) {
                resolve(event.target?.result as string);
                return;
              }
              ctx.drawImage(img, 0, 0, width, height);
              resolve(canvas.toDataURL("image/jpeg", 0.7));
            };
            img.onerror = () => resolve(event.target?.result as string);
            img.src = event.target?.result as string;
          };
          reader.onerror = (err) => reject(err);
          reader.readAsDataURL(file);
        } else {
          // For non-images (like PDFs), read normally
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = (err) => reject(err);
          reader.readAsDataURL(file);
        }
      });

      // 2. Set the uploading state now that file has been safely converted
      setUploadingId(installmentNumber);
      
      const response = await fetch("/api/upload", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          base64: base64String,
          folder: `payments/${application.id}`,
          fileName: `installment_${installmentNumber}`,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Error en la subida al servidor");
      }

      const { url } = await response.json();

      const updatedInstallments = application.paymentSchedule.installments.map(inst => 
        inst.number === installmentNumber ? { ...inst, paymentProofUrl: url, status: 'Pending' as const } : inst
      );

      await updateDoc(doc(db, "applications", application.id), {
        "paymentSchedule.installments": updatedInstallments,
        updatedAt: new Date().toISOString()
      });
      
      toast.success("Comprobante subido correctamente");
    } catch (error: any) {
      console.error("Upload failed details:", error);
      toast.error(`Error al subir el comprobante: ${error.message || "Intenta de nuevo."}`);
    } finally {
      setUploadingId(null);
    }
  };

  const getStatusBadge = (status: Installment['status']) => {
    switch (status) {
      case 'Paid': return <Badge className="bg-green-100 text-green-700 border-green-200">Pagado</Badge>;
      case 'Overdue': return <Badge className="bg-red-100 text-red-700 border-red-200">Vencido</Badge>;
      default: return <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200">Pendiente</Badge>;
    }
  };

  if (!application.paymentSchedule) {
    return (
      <Card className="max-w-2xl mx-auto text-center p-12">
        <Clock className="w-12 h-12 text-slate-300 mx-auto mb-4" />
        <CardTitle>Generando Cronograma</CardTitle>
        <CardDescription>
          Tu préstamo ha sido aprobado. El equipo de Mujeres 2000 está generando tu cronograma de pagos.
        </CardDescription>
      </Card>
    );
  }

  const nextInstallment = application.paymentSchedule.installments.find(i => i.status !== 'Paid');

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Summary Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-primary text-white border-none shadow-lg">
          <CardContent className="p-6">
            <span className="text-xs opacity-80 uppercase font-bold">Próximo Vencimiento</span>
            <div className="text-2xl font-bold mt-1">
              {nextInstallment ? new Date(nextInstallment.dueDate).toLocaleDateString() : 'Completado'}
            </div>
            <div className="text-sm opacity-80 mt-1">
              {nextInstallment ? `$${nextInstallment.amount.toLocaleString('es-AR')}` : '¡Felicidades!'}
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-white border-none shadow-md">
          <CardContent className="p-6">
            <span className="text-xs text-slate-500 uppercase font-bold">Total del Crédito</span>
            <div className="text-2xl font-bold mt-1 text-slate-900">
              ${application.paymentSchedule.totalAmount.toLocaleString('es-AR')}
            </div>
            <div className="text-sm text-slate-500 mt-1">
              {application.paymentSchedule.installments.length} cuotas fijas
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-none shadow-md">
          <CardContent className="p-6">
            <span className="text-xs text-slate-500 uppercase font-bold">Progreso</span>
            <div className="text-2xl font-bold mt-1 text-slate-900">
              {application.paymentSchedule.installments.filter(i => i.status === 'Paid').length} / {application.paymentSchedule.installments.length}
            </div>
            <div className="text-sm text-slate-500 mt-1">Cuotas pagadas</div>
          </CardContent>
        </Card>
      </div>

      {/* Installments List */}
      <Card className="border-none shadow-xl overflow-hidden">
        <CardHeader className="bg-white border-b">
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            Cronograma de Pagos
          </CardTitle>
          <CardDescription>Sube tus comprobantes de pago aquí para que sean validados.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {application.paymentSchedule.installments.map((inst) => (
              <div key={inst.number} className="p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                    inst.status === 'Paid' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {inst.number}
                  </div>
                  <div>
                    <div className="font-bold text-slate-900">${inst.amount.toLocaleString('es-AR')}</div>
                    <div className="text-xs text-slate-500 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      Vence: {new Date(inst.dueDate).toLocaleDateString()}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {getStatusBadge(inst.status)}
                  
                  {inst.paymentProofUrl ? (
                    <div className="flex items-center gap-2">
                      <a 
                        href={inst.paymentProofUrl} 
                        target="_blank" 
                        rel="noreferrer"
                        className="p-2 bg-slate-100 rounded-lg text-slate-600 hover:bg-slate-200 transition-colors"
                        title="Ver Comprobante"
                      >
                        <FileText className="w-4 h-4" />
                      </a>
                      {inst.status === 'Paid' && <CheckCircle2 className="w-5 h-5 text-green-500" />}
                    </div>
                  ) : (
                    <label className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                      uploadingId === inst.number ? 'bg-slate-100 text-slate-400' : 'bg-primary/10 text-primary hover:bg-primary/20'
                    }`}>
                      {uploadingId === inst.number ? (
                        <Clock className="w-4 h-4 animate-spin" />
                      ) : (
                        <Upload className="w-4 h-4" />
                      )}
                      {uploadingId === inst.number ? 'Subiendo...' : 'Subir Pago'}
                      <input 
                        type="file" 
                        className="hidden" 
                        accept="image/*,application/pdf"
                        onChange={(e) => handleProofUpload(e, inst.number)}
                        disabled={uploadingId !== null}
                      />
                    </label>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="p-4 bg-blue-50 rounded-xl border border-blue-100 flex gap-3 shadow-sm">
        <AlertCircle className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
        <p className="text-sm text-blue-700 leading-normal">
          Recuerda subir el comprobante de transferencia o depósito antes de la fecha de vencimiento para evitar recargos.
        </p>
      </div>

      {whatsappNumber && (
        <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
          <div className="flex gap-3 items-start w-full sm:w-auto">
            <div className="p-2 bg-emerald-100 rounded-full text-emerald-600">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.731-1.456L0 24zm6.59-4.846c1.6.95 3.1 1.4 4.8 1.4 5.3 0 9.7-4.3 9.7-9.7 0-2.6-1-5-2.8-6.8-1.8-1.8-4.2-2.8-6.9-2.8-5.3 0-9.7 4.3-9.7 9.7 0 1.8.5 3.5 1.4 5l-.4 2.6zM17.9 14.8c-.3-.2-1.8-.9-2.1-1-.3-.1-.5-.2-.7.1-.2.3-.8 1-.9 1.1-.1.2-.3.2-.6 0-.3-.1-1.2-.5-2.3-1.4-.9-.8-1.4-1.7-1.6-2-.2-.3 0-.5.1-.6.1-.1.3-.3.4-.5.1-.1.2-.3.3-.4 0-.2 0-.4-.1-.5-.1-.2-.7-1.7-.9-2.3-.2-.5-.5-.4-.7-.4h-.6c-.2 0-.5.1-.8.4-.3.3-1.1 1-1.1 2.5s1.1 2.9 1.2 3.1c.1.2 2.1 3.2 5.1 4.5.7.3 1.3.5 1.7.7.7.2 1.4.2 1.9.1.6-.1 1.8-.7 2.1-1.5.3-.7.3-1.4.2-1.5-.1-.2-.4-.3-.7-.5z"/>
              </svg>
            </div>
            <div className="text-left">
              <h4 className="font-bold text-slate-800 text-sm">¿Tenés dudas con tus pagos o transferencias?</h4>
              <p className="text-xs text-slate-600 leading-normal">
                Escribinos directamente a nuestro WhatsApp oficial para que te ayudemos a organizar o validar tu cuota.
              </p>
            </div>
          </div>
          <a
            href={`https://wa.me/${whatsappNumber.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(
              `Hola! Soy una emprendedora de Mujeres 2000 y tengo una consulta sobre las cuotas de mi préstamo.`
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold text-center shadow-lg hover:shadow-emerald-100 transition-all active:scale-95 whitespace-nowrap inline-flex items-center justify-center gap-1.5"
          >
            Escribir por WhatsApp
          </a>
        </div>
      )}
    </div>
  );
}
