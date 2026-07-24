import { AppSettings, InstitutionalData } from "../types";

export const DEFAULT_INSTITUTIONAL_DATA: InstitutionalData = {
  orgName: "Asociación Civil Mujeres 2000",
  legalAddress: "Calle Chubut Nº 1189, Ciudad de San Isidro, Provincia de Buenos Aires",
  website: "www.mujeres2000.org.ar",
  phone: "011 15 5709 4754",
  repName: "Maria Agustina Pacheco",
  repDni: "31.163.819",
  repRole: "Presidente",
  signatureLocation: "Tigre, Provincia de Buenos Aires, República Argentina"
};

export const DEFAULT_SETTINGS: AppSettings = {
  loanProducts: [
    {
      id: "comercial",
      name: "Microcrédito Comercial",
      minAmount: 10000,
      maxAmount: 700000,
      interestRate: 48,
      maxInstallments: 18
    },
    {
      id: "productivo",
      name: "Microcrédito Productivo",
      minAmount: 5000,
      maxAmount: 700000,
      interestRate: 48,
      maxInstallments: 12
    }
  ],
  neighborhoods: [
    "Barrio San Cayetano",
    "Barrio La Juanita",
    "Barrio Los Pinos",
    "Barrio Esperanza",
    "Villa 31",
    "Otro"
  ],
  civilStatuses: [
    "Soltera/o",
    "Casada/o",
    "Divorciada/o",
    "Viuda/o",
    "Unión de hecho"
  ],
  educationLevels: [
    "Primario incompleto",
    "Primario completo",
    "Secundario incompleto",
    "Secundario completo",
    "Terciario/Universitario"
  ],
  activities: [
    "Venta de ropa",
    "Gastronomía",
    "Artesanías",
    "Servicios de limpieza",
    "Peluquería",
    "Costura",
    "Otro"
  ],
  salesPlaces: [
    "Redes sociales",
    "Boca en boca",
    "Local",
    "Mercado Libre",
    "Venta ambulante",
    "Casa",
    "Feria",
    "Otro"
  ],
  whatsappNumber: "+5491100000000",
  allowMultipleLoans: false,
  institutionalData: DEFAULT_INSTITUTIONAL_DATA,
  scoringConfig: {
    passingScore: 80,
    questions: [
      { id: "a1", section: "A", text: "Participación en talleres", type: "three-options", options: { positive: "Siempre", medium: "A veces", negative: "Nunca" } },
      { id: "a2", section: "A", text: "Asistencia a la sede", type: "three-options", options: { positive: "Permanente", medium: "A veces", negative: "Nunca" } },
      { id: "a3", section: "A", text: "¿Se vincula con otras emprendedoras?", type: "three-options", options: { positive: "Siempre", medium: "A veces", negative: "Nunca" } },
      { id: "a4", section: "A", text: "Cumplimiento de cuotas", type: "three-options", options: { positive: "Bueno", medium: "Regular", negative: "Malo" } },
      { id: "a5", section: "A", text: "Antigüedad en la organización", type: "three-options", options: { positive: "Más de 5 años", medium: "Entre 3 y 5", negative: "Primeros 3 años" } },
      { id: "b1", section: "B", text: "Incremento de oferta de productos", type: "boolean", options: { positive: "Sí", negative: "No" } },
      { id: "b2", section: "B", text: "Incremento de la demanda", type: "boolean", options: { positive: "Sí", negative: "No" } },
      { id: "b3", section: "B", text: "Incremento de Canales de venta", type: "boolean", options: { positive: "Sí", negative: "No" } },
      { id: "b4", section: "B", text: "Incremento de medios de cobro", type: "boolean", options: { positive: "Sí", negative: "No" } },
      { id: "b5", section: "B", text: "¿Posee Redes de su emprendimiento?", type: "boolean", options: { positive: "Sí", negative: "No" } },
      { id: "b6", section: "B", text: "¿Registra compras y ventas?", type: "three-options", options: { positive: "Siempre", medium: "A veces", negative: "Nunca" } },
      { id: "b7", section: "B", text: "¿Se ha capitalizado/reinvierte ganancias?", type: "boolean", options: { positive: "Sí", negative: "No" } },
      { id: "b8", section: "B", text: "¿Realiza cursos de capacitación?", type: "three-options", options: { positive: "Siempre", medium: "A veces", negative: "Nunca" } },
      { id: "b9", section: "B", text: "Antigüedad del Emprendimiento", type: "three-options", options: { positive: "Más de 5 años", medium: "Entre 3 y 5", negative: "Primeros 3 años" } }
    ]
  }
};
