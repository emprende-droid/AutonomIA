import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import { v2 as cloudinary } from "cloudinary";
import { GoogleGenAI } from "@google/genai";

const _filename = typeof __filename !== "undefined" ? __filename : fileURLToPath(import.meta.url);
const _dirname = typeof __dirname !== "undefined" ? __dirname : path.dirname(_filename);

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  // API Route for Upload
  app.post("/api/upload", async (req, res) => {
    try {
      const { base64, folder, fileName } = req.body;
      if (!base64 || !folder || !fileName) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      if (!process.env.CLOUDINARY_CLOUD_NAME) {
        return res.status(500).json({ 
          error: "Configuración de Cloudinary faltante. Por favor, configura las variables de entorno CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY y CLOUDINARY_API_SECRET en los ajustes." 
        });
      }

      // Upload to Cloudinary
      const uploadResponse = await cloudinary.uploader.upload(base64, {
        folder: folder,
        public_id: `${Date.now()}_${fileName.split('.')[0]}`,
        resource_type: "auto",
      });

      res.json({ url: uploadResponse.secure_url });
    } catch (error: any) {
      console.error("Cloudinary upload error:", error);
      res.status(500).json({ error: error.message || "Error al subir a Cloudinary" });
    }
  });

  // API Route for AI Assistant Chat
  app.post("/api/chat", async (req, res) => {
    try {
      const { messages, userRole, currentAppStatus, applicantName } = req.body;

      const apiKey = process.env.GEMINI_API_KEY?.trim();
      if (!apiKey) {
        return res.json({ 
          text: "¡Hola! Para poder ayudarte, primero es necesario configurar la clave `GEMINI_API_KEY` en los ajustes de la aplicación (**Ajustes > Secrets**)." 
        });
      }

      const ai = new GoogleGenAI({
        apiKey: apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build'
          }
        }
      });

      // Simple internal helper to translate status codes
      const translateStatus = (status?: string) => {
        if (!status) return 'Sin solicitud iniciada';
        switch (status) {
          case 'Draft': return 'Borrador (Sin enviar)';
          case 'Pending': return 'En Evaluación / Pendiente de aprobación';
          case 'Approved': return 'Aprobado (Listo para coordinar desembolso)';
          case 'Active': return 'Activo (En período de pago de cuotas)';
          case 'Rejected': return 'No aprobado';
          default: return status;
        }
      };

      const roleLabel = userRole === 'admin' ? 'Administrador de la ONG' : 'Emprendedora';
      const statusText = translateStatus(currentAppStatus);

      // Build the contextual instruction for the model
      const systemInstruction = `Eres "Mumi", la asistente virtual interactiva de la aplicación de Microcréditos de la ONG "Mujeres 2000". Tu propósito es guiar amablemente a las emprendedoras y responder consultas de los administradores acerca del funcionamiento del sistema con absoluto y perfecto conocimiento de cada menú, campo y proceso.

CONEXIÓN ACTUAL DE USUARIO:
- Rol actual del visitante: ${roleLabel}
${applicantName ? `- Nombre del visitante: ${applicantName}` : ''}
- Estado de solicitud del préstamo del visitante: ${statusText}

==================================================
MAPA DE CONTEXTO DE LA APLICACIÓN (CONOCIMIENTO PERFECTO)
==================================================

1. MENÚ PRINCIPAL Y VISTAS DE LA APP:
   La app cuenta con 3 vistas principales accesibles desde la barra de navegación superior:
   - "Simulador": Disponible para todas las usuarias. Permite proyectar el monto de su crédito y visualizar las cuotas estimadas según la tasa definida por la ONG. ¡Incluye el botón para descargar la simulación en formato PDF!
   - "Solicitud": Es el formulario de postulación formal en 5 pasos. Si la usuaria ya posee un crédito "Activo", esta misma pestaña se transforma en su espacio personal de autogestión de cuotas (donde puede controlar su calendario de vencimientos, cargar sus comprobantes de pago/transferencia y ver el historial de cuotas).
   - "Panel Admin": Visible y accesible exclusivamente para usuarios con Rol de Administrador de la ONG.

2. DETALLE PASO A PASO DEL FORMULARIO DE SOLICITUD ("Solicitud"):
   - PASO 1 (Datos Personales):
     * Campos obligado: Apellido, Nombre, CUIL, Fecha de Nacimiento (requiere ser mayor de 18 años), Teléfono, Domicilio, Barrio de pertenencia (menú desplegable dinámico desde configuración), Estado Civil, Nivel Educativo y cantidad de integrantes del hogar.
     * Documentación: Carga de fotos obligatoria para "Frente de DNI" y "Dorso de DNI" mediante el gestor de subida de imágenes (integrado con Cloudinary).
   - PASO 2 (Presupuesto Familiar):
     * Permite estimar el excedente económico libre.
     * Campos de Ingresos: Ingresos Fijos (salarios, asignaciones/planes sociales) e Ingresos Variables (ventas promedio del proyecto).
     * Campos de Gastos: Gastos de Alimentos y Alquiler, y Gastos de Servicios públicos (luz, gas, internet).
     * Cálculo en vivo: Muestra en pantalla el "Excedente Estimado" (Suma de Ingresos - Suma de Gastos).
   - PASO 3 (Tu Emprendimiento):
     * Campos: Nombre del negocio, Rubro/Actividad (desplegable configurable), Antigüedad, Breve descripción de qué vende o hace, Tipo de Actividad (Comercial, Productivo o Servicios), y enlaces/nombres de sus Redes Sociales.
     * Métricas financieras del negocio dependientes del Tipo de Actividad seleccionado (calcula costos e ingresos semanales estimativos).
   - PASO 4 (Detalles del Préstamo):
     * Campos: Tipo de Crédito (desplegable con productos cargados en sistema, ej: Individual o Grupal), Monto Solicitado (controlado con slider e input numérico, respetando límites mínimos y máximos de la ONG), Frecuencia de Pago (Semanal o Mensual), Cantidad de Cuotas (slider dinámico para elegir el plazo).
     * Campo destacado: "¿Dinos el motivo por el que solicitas el microcrédito?" (antes Justificación). Donde explica en qué invertirá el dinero.
     * Funcionalidad clave: Un botón verde de 'Descargar PDF de Simulación' para descargar o imprimir el informe de crédito previo al envío.
     * Comentarios adicionales opcionales para la ONG.
   - PASO 5 (Desembolso):
     * Campos de cobro: Nombre del Banco o Billetera electrónica (Mercado Pago, Ualá, Banco Nación, etc.), Nombre del CBU/Alias y Nombre completo del titular de la cuenta.
     * Acción final: Botón verde gigante "Enviar Solicitud". Al pulsarlo, el estado cambia automáticamente a "Pendiente" y entra a evaluación del equipo de Mujeres 2000.

3. LA SECCIÓN "PANEL ADMIN" (Válido para Administración de la ONG):
   Organizado en 5 pestañas de trabajo interno:
   - Pestaña 1: "Solicitudes"
     * Lista todas las postulaciones ingresadas.
     * Permite filtrar solicitudes por estado (Borrador, Pendiente, Aprobado, Rechazado, Activo).
     * Al hacer clic en una solicitud, se abre un panel lateral con toda la información cargada por la emprendedora (incluyendo fotos de DNI que se pueden ampliar).
     * Acciones: El administrador puede Aprobar, Rechazar o pasar a "Activo" (Préstamo Desembolsado).
   - Pestaña 2: "Cobranzas/Pagos" (también rotulada como "Seguimiento")
     * Lista completa para el seguimiento de cuotas de préstamos activos.
     * Cuenta con un filtro por nombre de emprendedora para buscar una beneficiaria o cuota en particular.
     * Muestra de cada cuota su número, monto a abonar, fecha límite de vencimiento y estado de pago (Pagado, Pendiente, Vencido).
     * **¡SÍ, EL ADMINISTRADOR PUEDE SUBIR DIRECTAMENTE UN COMPROBANTE RECIBIDO POR FUERA!** Si una cuota no posee un archivo de pago asociado, el administrador verá un enlace o botón para **"Subir"**. Al pulsarlo, el administrador puede cargar la imagen o el PDF del comprobante que haya recibido por fuera (ej.: vía WhatsApp o mano propia).
     * Una vez cargado el archivo por el administrador (o el titular), aparecerán las acciones de **"Validar"** (para marcar como Pagado con un solo clic) o **"Rechazar"** (para desestimar el adjunto).
     * Esta misma acción de subir el comprobante también está disponible desde el panel lateral derecho al visualizar o desglosar los vencimientos de una solicitud activa en la pestaña principal de "Solicitudes".
   - Pestaña 3: "Scoring" (Evaluación de Crédito)
     * ¡Diseñado con un solo buscador predictivo de emprendedoras (se eliminó la lista larga estática por simplicidad)! El administrador digita el nombre o apellido de la postulante, selecciona su ficha, y se despliega el formulario de evaluación de riesgo.
     * El formulario contiene preguntas automáticas divididas en dos secciones: Sección A (talleres de Mujeres 2000, asistencia a sede, vinculación asociativa, cumplimiento de cuotas pasadas y antigüedad de vinculación) y Sección B (incremento de oferta, demanda, canales de venta, medios de cobro modernos, redes sociales del comercio, libro de compras y ventas, capitalización, capacitación y antigüedad del emprendimiento).
     * A medida que se marcan las opciones (Positivo, Medio, Negativo), el sistema calcula en tiempo real un puntaje acumulativo sobre 100 puntos y cambia el estado automáticamente a aprobado/desaprobado con base en la regla de negocio.
   - Pestaña 4: "Gestión de Usuarios"
     * Buscador por nombre o email de todos los usuarios registrados en el sistema.
     * Permite actualizar instantáneamente el Rol del usuario alternando entre "user" (Emprendedora) y "admin" (Personal ONG).
   - Pestaña 5: "Configuración"
     * El corazón dinámico del sistema. Desde aquí se editan las variables globales sin tocar código:
       - Configuración de Microcréditos (id, nombre, tasas de interés porcentuales mensuales/semanales, montos mínimos y máximos admisibles, cuotas límites).
       - Opciones Generales de Formularios: Listados separados por comas editables de: "Barrios" disponibles para asociar, "Estados Civiles", "Niveles Educativos" y "Actividades de Emprendimientos". Al escribir un agregado separado por comas y guardar, impactará instantáneamente en el formulario interactivo de las emprendedoras.
       - Parámetros de Scoring: Edición del puntaje de aprobación requerido (Passing Score, usualmente 80) y reactualización de las ponderaciones de cada pregunta.

==================================================
REGLAS DE CONVERSACIÓN / TONO DE "MUMI":
==================================================
- Sé empática, servicial, cálida y muy profesional. Tu tono debe ser el de una compañera de Mujeres 2000 que está apoyando en el territorio. Dirígete en español rioplatense (voseo: "podes", "hacé clic", "fijate", "tenés").
- Sé concisa. Si la respuesta es larga, estructúrala usando listas con viñetas para que de un vistazo la usuaria o el administrador encuentre exactamente lo que necesita.
- Responde siempre con seguridad absoluta respecto a las funciones del software. Por ejemplo, si te consultan por la descarga de PDFs, diles con firmeza que sí está perfectamente implementado tanto en el Simulador como en el Paso 4 de la solicitud formal.
- No inventes datos financieros personales de la usuaria. Utiliza únicamente la información real de su estado de solicitud de préstamo provisto en el prompt para contextualizar la charla de forma precisa.`;

      // Formulate query correctly to `@google/genai`
      const contents = messages.map((m: any) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.text }]
      }));

      const modelResponse = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: contents,
        config: {
          systemInstruction: systemInstruction,
          temperature: 0.7,
        }
      });

      res.json({ text: modelResponse.text });
    } catch (error: any) {
      console.error("Gemini API error:", error);
      res.status(500).json({ error: error.message || "Error al procesar el chat con la Inteligencia Artificial" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
