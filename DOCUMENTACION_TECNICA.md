# Documentación Técnica: Plataforma de Microcréditos — Mujeres 2000

Este documento provee una descripción técnica exhaustiva sobre el funcionamiento, arquitectura, medidas de seguridad y recomendaciones de evolución para la plataforma de solicitud y gestión de microcréditos desarrollada para **Mujeres 2000**. Está diseñado para ser presentado ante organizaciones especializadas en tecnología y equipos de auditoría o desarrollo.

---

## 1. Visión General del Sistema

La plataforma es una solución full-stack moderna y ágil que digitaliza de punta a punta el ciclo de vida de los microcréditos de la organización:
1. **Para Emprendedoras**: Autogestión del proceso de solicitud guiada paso a paso (Evaluación social, financiera, y del emprendimiento), simulación interactiva de cuotas y un asistente virtual integrado mediante Inteligencia Artificial.
2. **Para Administradores (M2000)**: Consola unificada para la evaluación crediticia mediante scoring paramétrico automatizado, control de desembolsos, registro y visualización de cuotas/pagos, y exportación de reportes exhaustivos.

---

## 2. Arquitectura de Software y Stack Tecnológico

El diseño arquitectónico sigue el patrón de **Single Page Application (SPA) full-stack** segura, alojada de manera escalable y server-side.

```
       [ CLIENTE: React 19 / Vite / Tailwind V4 ]
         |                                   ^
         | (Auth / Firestore SDK)            | (Render)
         v                                   v
[ Firebase Auth ] <----> [ Firestore DB ] <----> [ EXPRESS BACKEND ]
                            ^                         |
                            |                         v
                    [ Security Rules ]        [ Gemini GenAI SDK ]
```

### Stack Tecnológico Principal

*   **Frontend**:
    *   **React 19 & TypeScript**: Framework para la construcción de interfaces reactivas de alta disponibilidad, estructurado en base a componentes desacoplados y fuertemente tipados.
    *   **Vite 6**: Compilador y empaquetador ultrarrápido para el flujo de desarrollo y optimización de assets estáticos en producción.
    *   **Tailwind CSS V4**: Framework de utilidades CSS de última generación para lograr un diseño de alta fidelidad, fluido, responsive e integrador.
    *   **Motion**: Librería para orquestar micro-interacciones suaves y transiciones fluidas de los formularios.
    *   **Lucide React**: Biblioteca unificada para consistencia iconográfica en toda la interfaz.
*   **Servidor Backend / Proxy**:
    *   **Express**: Servidor ligero en Node.js que actúa como proxy para proteger variables de entorno sensibles (las claves de la API de IA se resuelven en servidor) y servir la SPA optimizada en producción.
    *   **Esbuild**: Compilador de alto rendimiento utilizado para empaquetar el servidor TypeScript a CommonJS nativo (`dist/server.cjs`).
*   **Base de Datos y Autenticación (Firebase)**:
    *   **Firebase Authentication**: Provee gestión de identidades segura, control de sesiones, cifrado y tokens JWT.
    *   **Cloud Firestore Database**: Base de datos NoSQL documental y en tiempo real, con diseño schema-free sumamente rápido que facilita adaptabilidad en los datos recopilados de las emprendedoras.

---

## 3. Estructura de Datos (Esquema de Firestore)

La base de datos estructurada en Cloud Firestore implementa cuatro colecciones nodales con esquemas fuertemente definidos y validados a nivel servidor a través de **Firestore Security Rules**:

### A. Colección `/users`
Guarda el perfil básico de identidad y los roles del sistema.
*   `uid` (string): Identificador único global de Firebase Auth.
*   `email` (string): Correo electrónico del usuario.
*   `role` (enum: `'user'` | `'admin'`): Rol de autorización jerárquica.
*   `displayName` (string, opcional): Nombre visible.

### B. Colección `/applications`
Almacena el estado completo de cada solicitud de microcrédito.
*   `id` (string): UUID de la solicitud.
*   `userId` (string): Referencia al creador (emprendedora).
*   `userEmail` (string): Email de contacto.
*   `status` (enum): `'Draft'` | `'Pending'` | `'Approved'` | `'Rejected'` | `'Active'` | `'Paid'`.
*   `step` (number): Progreso del formulario (1 a 5).
*   `personalData` (map): Información de identidad (CUIL, Dirección, Barrio, Teléfono).
*   `householdFinance` (map): Flujo financiero familiar (ingresos extras, subsidios, egresos de alquiler y servicios).
*   `entrepreneurshipData` (map): Rubro, descripción de actividades y planes de inversión.
*   `loanDetails` (map): Datos del crédito de préstamo (monto solicitado, cantidad de cuotas, frecuencia de repago y justificación de uso).
*   `disbursementInfo` (map): Detalles de la cuenta destino para desembolsos (Bazo/Billetera, CBU/CVU, Alias, Titular).
*   `loanNumber` (number, opcional): Número correlativo asignado tras la postulación formal.
*   `createdAt` (ISO8601 string): Fecha de alta.
*   `updatedAt` (ISO8601 string): Última edición.

### C. Colección `/scoring_evaluations`
Historial de auditoría de los análisis realizados por los coordinadores de Mujeres 2000.
*   `applicationId` (string): Referencia directa a la solicitud.
*   `entrepreneurName` (string): Nombre y apellido de la emprendedora evaluada.
*   `date` (ISO8601 string): Fecha del análisis.
*   `totalScore` (number): Puntaje final unificado del algoritmo de scoring.
*   `status` (enum): `'APROBADO'` | `'DESAPROBADO'`.
*   `answers` (map): Respuestas paramétricas a los bloques de evaluación.

### D. Colección `/config`
Parámetros flexibles del negocio manejables de manera centralizada.
*   `document: settings`: Configuración de tasas de interés simuladas, límites de montos, límites de cuotas, e inputs operacionales.

---

## 4. Ingeniería de Funcionalidades Clave

### A. Formulario Inteligente Multi-Paso Avanzado
El proceso de inscripción se despliega en 5 secciones modulares con autoguardado en tiempo real en Firestore. Esto previene pérdidas accidentales ante cortes de conectividad de la usuaria:
*   **Paso 1**: Identidad, CUIL estructurado y coordenadas físicas.
*   **Paso 2**: Balance socio-económico del hogar (Ingresos vs Egresos).
*   **Paso 3**: Potencia de la iniciativa de negocio, antigüedad del rubro comercial y uso de redes.
*   **Paso 4**: Simulación, cálculo matemático de cuotas fijas basadas en la tasa activa, selección de periodicidad (semanal/mensual) y plazos recomendados.
*   **Paso 5**: Detalle de transferencia CBU/CVU/Alias con validación visual.

### B. Consola del Administrador (AdminDashboard)
Panel reservado exclusivamente a coordinadores con rol `'admin'` que integra:
*   **Centro de Decisiones**: Filtrado rápido por estado de solicitudes, barra de búsqueda en tiempo real sobre campos de contacto y ordenamiento dinámico multivariable.
*   **Motor de Scoring**: Evaluación rápida mediante cuestionario parametrizado que otorga un puntaje automatizado y guarda los resultados asociados a la solicitud.
*   **Planificador de Pagos y Cobranzas (PaymentManager)**: Generación automática de planes de amortización de cuotas y herramientas rápidas para tildar el estado de cobro manual y asociar comprobantes de pago.
*   **Exportación de Datos con Precisión Financiera**: Motor de conversión a CSV que traduce la grilla completa de solicitudes, incluyendo campos socioeconómicos detallados de cada emprendedora y garantizando que los valores monetarios mantengan formato en español con puntos de miles para su procesamiento directo en herramientas como Excel o Google Sheets.

### C. Chatbot Asistente Virtual Gemini AI
*   Conectado vía backend usando la SDK `@google/genai` con modelo Gemini, evitando la exposición del API Key en el navegador de la usuaria.
*   Actúa como navegador conceptual y guía empática, con un prompt del sistema instruido específicamente para comprender el contexto de inclusión financiera de Mujeres 2000.

---

## 5. Prácticas de Ciberseguridad Implementadas

1.  **Protección Basada en Atributos a Nivel Servidor (ABAC)**:
    Las reglas de Firestore (`firestore.rules`) garantizan de manera estricta que:
    *   Nadie, excepto los usuarios con credenciales validadas, pueda leer o escribir datos.
    *   Los solicitantes ordinarios (`role == 'user'`) únicamente puedan leer, escribir y actualizar sus propios documentos coincidentes con su `request.auth.uid`.
    *   Cualquier intento de suplantación de identidad para consultar información ajena sea bloqueado por defecto.
    *   Los miembros del equipo operativo (`role == 'admin'`, además del correo por defecto preestablecido `mariano.imbrogno@gmail.com`) posean superusuario para auditorías exhaustivas, creación y depuración en colecciones de scoring y configuración general.
2.  **Encapsulado de Secretos**:
    El SDK de Gemini se declara e inicializa única y exclusivamente en el entorno del servidor (`server.ts`). El frontend realiza llamadas a un endpoint secundario (`/api/chat` o similar), de manera que las llaves de acceso del proveedor en la nube nunca son transmitidas al explorador.
3.  **Sanitizado de Datos**:
    Uso extensivo de validaciones tipadas en TypeScript para prevenir corrupciones y mitigación de inyección mediante escape de textos especiales durante la exportación a formato CSV.

---

## 6. Recomendaciones de Seguridad para el Lanzamiento a Producción

Para desplegar la aplicación ante el público general con los más altos estándares, se aconseja priorizar los siguientes hitos de ciberseguridad:

1.  **Cifrado de PII (Información de Identificación Personal)**:
    Dado que se almacenan datos financieros sensibles, CUILs, teléfonos y ubicaciones geográficas de personas en vulnerabilidad social, se recomienda:
    *   Habilitar Cloud Key Management Service (KMS) de Google Cloud para el cifrado a nivel de campo (Field-level encryption) de datos muy críticos antes de persistirlos en Firestore.
    *   Garantizar protocolos de transporte TLS 1.3 forzados mediante cabeceras HSTS predefinidas en el hosting final (ej. Cloud Run o Firebase Hosting).
2.  **Validación Robusta de Entradas (Server-Side Validation)**:
    Actualmente, el ingreso de datos es validado en la UI (React). Es imperativo implementar esquemas de validación sólidos en los endpoints de servidor utilizando librerías como `Zod` o `Joi` antes de procesar o guardar documentos de forma permanente, en especial las transferencias bancarias y comprobantes.
3.  **Aislamiento de Operaciones Críticas mediante Cloud Functions**:
    Acciones como la aprobación formal del préstamo, desestimaciones y creación de la grilla de reembolsos de capital deben removerse de la escritura directa en Firestore del cliente. En su lugar, el cliente debe invocar llamadas HTTP seguras hacia **Cloud Functions de Firebase (v2/Node)** que operen con privilegios acotados de Service Accounts.
4.  **Políticas de Cuotas y Limitación de Tasa (Rate Limiting)**:
    Configurar en el servidor de producción políticas de *Rate Limiting* (ej. `express-rate-limit`) tanto para las rutas orientadas a la simulación como para el bot inteligente de Gemini. Esto previene ataques de Denegación de Servicio (DoS) y el agotamiento de presupuesto debido al consumo repetitivo de APIs pagas de IA.
5.  **Historial de Cambios Absoluto (Audit Trail Audit-Log)**:
    Configurar disparadores distribuidos para loguear cada vez que un `'admin'` modifica el estado de un préstamo o una evaluación de scoring, asegurando un registro de auditoría inmutable e inalterable.

---

## 7. Funcionalidades Recomendadas para Próximas Fases (Roadmap)

Con el fin de incrementar la eficiencia operativa de la organización y refinar la experiencia de uso de las emprendedoras, proponemos los siguientes módulos adicionales para la fase de producción dirigida:

*   **Integración de Pasarela de Pagos Local (API de Mercado Pago o COELSA)**:
    Establecer conciliación bancaria instantánea. Permitiría enviar notificaciones push a la emprendedora con un link de pago directo de Mercado Pago para abonar su cuota, o procesar transferencias salientes de forma automatizada mediante integraciones de Open Banking, reduciendo el trabajo manual de los coordinadores al comprobar el banco.
*   **Módulo de Notificaciones Omnicanal (WhatsApp Business / SMS / Correo)**:
    Las alertas por correo electrónico suelen tener tasas de apertura bajas en el público objetivo de microcréditos de base social. Integrar un servicio como Twilio o una API de WhatsApp para enviar:
    *   Recordatorios automáticos de vencimiento de cuota (3 días antes).
    *   Confirmaciones inmediatas ante el registro exitoso de un pago.
    *   Notificación instantánea del estado de su microcrédito (Borrador -> Candidato -> Aprobado).
*   **Soporte Offline-First Reforzado con PWA (Progressive Web App)**:
    En barrios vulnerables, las conexiones móviles de internet suelen estar sujetas a micro-cortes frecuentes. Convertir la aplicación en una PWA con *Service Workers* y persistencia nativa en `IndexedDB` asegura que las emprendedoras puedan rellenar sus postulaciones y chatear con guías descargados con antelación aun estando sin servicio, sincronizando todos los cambios automáticamente cuando capten señal.
*   **Panel de Business Intelligence (BI) para M2000**:
    Tableros nativos de analítica que tabulen indicadores clave de rendimiento (KPIs), tales como:
    *   Tasa de Cobrabilidad Histórica general y por periodicidad.
    *   Densidad de distribución geográfica de los rubros apoyados.
    *   Tasa de morosidad segmentada por score predictivo para perfeccionar continuamente el cuestionario de puntuación de scoring.
