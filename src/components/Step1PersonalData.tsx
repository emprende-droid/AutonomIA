import { useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PersonalData, AppSettings } from "../types";

interface Props {
  data: PersonalData;
  onChange: (data: PersonalData) => void;
  settings: AppSettings;
  validationErrors?: string[];
}

export default function Step1PersonalData({ data, onChange, settings, validationErrors }: Props) {
  const firstInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Focus the first input of personal data when Step 1 mounts
    const timer = setTimeout(() => {
      firstInputRef.current?.focus();
    }, 150);
    return () => clearTimeout(timer);
  }, []);

  const handleChange = (field: keyof PersonalData, value: string | number) => {
    onChange({ ...data, [field]: value });
  };

  const isInvalid = (field: string) => validationErrors?.includes(field);

  // Map the new requested neighborhood options
  const pdfNeighborhoods = [
    "Troncos",
    "Ricardo Rojas",
    "Bancalari",
    "Almirante Brown",
    "Otro"
  ];

  return (
    <div className="space-y-8">
      {/* SECCIÓN 2: Datos Generales de la Emprendedora */}
      <div className="space-y-6">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 border-b pb-2 mb-4">
          Sección 2: Datos Generales de la Emprendedora
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="lastName" className={isInvalid("personalData.lastName") ? "text-red-600 font-semibold" : ""}>
              Apellido <span className="text-red-500 ml-0.5 font-bold">*</span>
            </Label>
            <Input 
              ref={firstInputRef}
              id="lastName" 
              value={data.lastName} 
              onChange={(e) => handleChange("lastName", e.target.value)} 
              placeholder="Ej: Pérez"
              className={isInvalid("personalData.lastName") ? "border-red-500 focus-visible:ring-red-500 bg-red-50/30" : ""}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="firstName" className={isInvalid("personalData.firstName") ? "text-red-600 font-semibold" : ""}>
              Nombre <span className="text-red-500 ml-0.5 font-bold">*</span>
            </Label>
            <Input 
              id="firstName" 
              value={data.firstName} 
              onChange={(e) => handleChange("firstName", e.target.value)} 
              placeholder="Ej: María"
              className={isInvalid("personalData.firstName") ? "border-red-500 focus-visible:ring-red-500 bg-red-50/30" : ""}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="dni" className={isInvalid("personalData.dni") ? "text-red-600 font-semibold" : ""}>
              DNI <span className="text-red-500 ml-0.5 font-bold">*</span>
            </Label>
            <Input 
              id="dni" 
              value={data.dni || ""} 
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, "").slice(0, 8);
                onChange({ ...data, dni: val, cuil: val }); // Keep cuil synced for backward reference compatibility
              }} 
              placeholder="Ej: 12345678"
              maxLength={8}
              className={isInvalid("personalData.dni") ? "border-red-500 focus-visible:ring-red-500 bg-red-50/30" : ""}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="birthDate" className={isInvalid("personalData.birthDate") ? "text-red-600 font-semibold" : ""}>
              Fecha de Nacimiento <span className="text-red-500 ml-0.5 font-bold">*</span>
            </Label>
            <Input 
              id="birthDate" 
              type="date"
              value={data.birthDate} 
              onChange={(e) => handleChange("birthDate", e.target.value)} 
              className={isInvalid("personalData.birthDate") ? "border-red-500 focus-visible:ring-red-500 bg-red-50/30 font-semibold" : ""}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone" className={isInvalid("personalData.phone") ? "text-red-600 font-semibold" : ""}>
              Teléfono <span className="text-red-500 ml-0.5 font-bold">*</span>
            </Label>
            <Input 
              id="phone" 
              value={data.phone} 
              onChange={(e) => handleChange("phone", e.target.value)} 
              placeholder="Ej: 11 1234 5678"
              className={isInvalid("personalData.phone") ? "border-red-500 focus-visible:ring-red-500 bg-red-50/30" : ""}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="address" className={isInvalid("personalData.address") ? "text-red-600 font-semibold" : ""}>
              Dirección (hogar) <span className="text-red-500 ml-0.5 font-bold">*</span>
            </Label>
            <Input 
              id="address" 
              value={data.address} 
              onChange={(e) => handleChange("address", e.target.value)} 
              placeholder="Calle y número"
              className={isInvalid("personalData.address") ? "border-red-500 focus-visible:ring-red-500 bg-red-50/30" : ""}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="neighborhood" className={isInvalid("personalData.neighborhood") ? "text-red-600 font-semibold" : ""}>
              Barrio de residencia <span className="text-red-500 ml-0.5 font-bold">*</span>
            </Label>
            <Select value={data.neighborhood} onValueChange={(val) => handleChange("neighborhood", val)}>
              <SelectTrigger className={isInvalid("personalData.neighborhood") ? "border-red-500 focus:ring-red-500 bg-red-50/30" : ""}>
                <SelectValue placeholder="Seleccionar barrio..." />
              </SelectTrigger>
              <SelectContent>
                {pdfNeighborhoods.map(n => (
                  <SelectItem key={n} value={n}>{n}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Conditional field for Barrio = Otro */}
          {data.neighborhood === "Otro" && (
            <div className="space-y-2">
              <Label htmlFor="neighborhoodOption">
                Nombre de tu Barrio <span className="text-red-500 ml-0.5 font-bold">*</span>
              </Label>
              <Input 
                id="neighborhoodOption" 
                value={data.neighborhoodOption || ""} 
                onChange={(e) => handleChange("neighborhoodOption", e.target.value)}
                placeholder="Especifique otro barrio"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="civilStatus" className={isInvalid("personalData.civilStatus") ? "text-red-600 font-semibold" : ""}>
              Estado Civil <span className="text-red-500 ml-0.5 font-bold">*</span>
            </Label>
            <Select value={data.civilStatus} onValueChange={(val) => handleChange("civilStatus", val)}>
              <SelectTrigger className={isInvalid("personalData.civilStatus") ? "border-red-500 focus:ring-red-500 bg-red-50/30" : ""}>
                <SelectValue placeholder="Seleccionar..." />
              </SelectTrigger>
              <SelectContent>
                {settings.civilStatuses.map(s => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="educationLevel" className={isInvalid("personalData.educationLevel") ? "text-red-600 font-semibold" : ""}>
              Máximo nivel educativo alcanzado <span className="text-red-500 ml-0.5 font-bold">*</span>
            </Label>
            <Select value={data.educationLevel} onValueChange={(val) => handleChange("educationLevel", val)}>
              <SelectTrigger className={isInvalid("personalData.educationLevel") ? "border-red-500 focus:ring-red-500 bg-red-50/30" : ""}>
                <SelectValue placeholder="Seleccionar..." />
              </SelectTrigger>
              <SelectContent>
                {settings.educationLevels.map(e => (
                  <SelectItem key={e} value={e}>{e}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="householdSize">Cantidad de personas con las que vives</Label>
            <Input 
              id="householdSize" 
              type="number"
              min={0}
              value={data.householdSize} 
              onChange={(e) => {
                const val = e.target.value;
                handleChange("householdSize", val === "" ? 0 : parseInt(val));
              }} 
            />
          </div>
        </div>
      </div>
    </div>
  );
}
