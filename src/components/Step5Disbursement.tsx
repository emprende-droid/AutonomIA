import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DisbursementInfo } from "../types";

interface Props {
  data: DisbursementInfo;
  onChange: (data: DisbursementInfo) => void;
  validationErrors?: string[];
}

export default function Step5Disbursement({ data, onChange, validationErrors }: Props) {
  const handleChange = (field: keyof DisbursementInfo, value: string) => {
    onChange({ ...data, [field]: value });
  };

  const isInvalid = (field: string) => validationErrors?.includes(field);

  return (
    <div className="space-y-6">
      <div className="p-4 bg-amber-50 border border-amber-100 rounded-lg text-amber-800 text-sm">
        <p className="font-bold mb-1">Importante:</p>
        <p>Asegúrate de que los datos bancarios sean correctos. Los fondos se acreditarán en esta cuenta una vez aprobada la solicitud.</p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="bankOrWallet" className={isInvalid("disbursementInfo.bankOrWallet") ? "text-red-600 font-semibold" : ""}>
            Entidad (Banco o Billetera Virtual) <span className="text-red-500 ml-0.5 font-bold">*</span>
          </Label>
          <Input 
            id="bankOrWallet" 
            value={data.bankOrWallet} 
            onChange={(e) => handleChange("bankOrWallet", e.target.value)} 
            placeholder="Ej: Mercado Pago, Banco Provincia, Brubank"
            className={isInvalid("disbursementInfo.bankOrWallet") ? "border-red-500 focus-visible:ring-red-500 bg-red-50/30" : ""}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="accountHolder" className={isInvalid("disbursementInfo.accountHolder") ? "text-red-600 font-semibold" : ""}>
            Nombre y Apellido del titular <span className="text-red-500 ml-0.5 font-bold">*</span>
          </Label>
          <Input 
            id="accountHolder" 
            value={data.accountHolder} 
            onChange={(e) => handleChange("accountHolder", e.target.value)} 
            placeholder="Tal como figura en la cuenta"
            className={isInvalid("disbursementInfo.accountHolder") ? "border-red-500 focus-visible:ring-red-500 bg-red-50/30" : ""}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="alias" className={isInvalid("disbursementInfo.alias") ? "text-red-600 font-semibold" : ""}>
            Alias de la cuenta <span className="text-red-500 ml-0.5 font-bold">*</span>
          </Label>
          <Input 
            id="alias" 
            value={data.alias} 
            onChange={(e) => handleChange("alias", e.target.value)} 
            placeholder="Ej: sol.brillante.mp"
            className={isInvalid("disbursementInfo.alias") ? "border-red-500 focus-visible:ring-red-500 bg-red-50/30" : ""}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cbu" className={isInvalid("disbursementInfo.cbu") ? "text-red-600 font-semibold" : ""}>
            CBU de la cuenta bancaria (22 dígitos) <span className="text-red-500 ml-0.5 font-bold">*</span>
          </Label>
          <Input 
            id="cbu" 
            value={data.cbu || ""} 
            onChange={(e) => {
              const val = e.target.value.replace(/\D/g, "").slice(0, 22);
              handleChange("cbu", val);
            }} 
            placeholder="00000031000..."
            maxLength={22}
            className={isInvalid("disbursementInfo.cbu") ? "border-red-500 focus-visible:ring-red-500 bg-red-50/30" : ""}
          />
        </div>
      </div>

      <div className="mt-8 p-6 bg-slate-100 rounded-xl border border-slate-200">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-4">Resumen de Envío</h3>
        <div className="space-y-2 text-sm text-slate-600">
          <div className="flex justify-between">
            <span>Fecha de envío:</span>
            <span className="font-medium">{new Date().toLocaleDateString()}</span>
          </div>
          <div className="flex justify-between">
            <span>Email de contacto:</span>
            <span className="font-medium">mariano.imbrogno@gmail.com</span>
          </div>
        </div>
      </div>
    </div>
  );
}
