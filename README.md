# Plataforma de Microcréditos — Mujeres 2000

Este proyecto es una plataforma full-stack moderna y ágil desarrollada para la organización **Mujeres 2000**. Su propósito es digitalizar el ciclo de vida completo de las solicitudes de microcréditos para emprendedoras en sectores vulnerables, facilitando la autogestión de las solicitudes, el análisis de scoring crediticio automatizado, el control de desembolsos y la gestión activa de planes de pago.

---

## 1. Arquitectura del Sistema y Stack Tecnológico

La plataforma está diseñada siguiendo el patrón de **Single Page Application (SPA) Full-Stack** segura, con un servidor intermedio que centraliza operaciones críticas y protege secretos de infraestructura.

```
       [ CLIENTE: React 19 / Vite 6 / Tailwind CSS V4 ]
         |                                           ^
         | (Auth / Firestore SDK)                    | (Renderizado)
         v                                           v
[ Firebase Auth ] <----> [ Firestore DB ] <----> [ EXPRESS BACKEND ]
                            ^                         |
                            |                         v
                    [ Security Rules ]        [ Cloudinary SDK ]
```

### Componentes de Software:
* **Frontend (SPA)**:
  * **React 19 & TypeScript**: Componentes declarativos estructurados y fuertemente tipados.
  * **Vite 6**: Flujo de desarrollo veloz y empaquetado de recursos ultraligero.
  * **Tailwind CSS V4**: Estilos utilitarios fluidos y diseño completamente adaptativo (responsivo).
  * **Motion**: Orquestador de transiciones y micro-interacciones interactivas en los formularios multi-paso.
  * **Recharts / D3**: Visualización interactiva de estadísticas de créditos y cobrabilidad en la consola de administración.
* **Backend (API)**:
  * **Express (Node.js)**: Usado en desarrollo local (`npm run dev`) para servir la SPA junto al middleware de Vite y exponer las rutas de API.
  * **Vercel Serverless Functions**: En producción, la lógica de las rutas de API (`/api/upload-signature`, `/api/chat`) se despliega como funciones serverless independientes bajo el directorio `api/`, compartiendo la misma implementación que usa el servidor Express local (`lib/server/`). Los secretos de infraestructura (Cloudinary, Gemini) nunca se exponen al cliente.
* **Base de Datos y Autenticación**:
  * **Firebase Authentication**: Gestión de sesiones de usuaria, registros, accesos de administración y generación de tokens JWT.
  * **Cloud Firestore**: Base de datos NoSQL de documentos en tiempo real.
  * **Firebase Storage**: Almacenamiento seguro de archivos (como comprobantes de pago subidos por las emprendedoras).

### Decisiones de Arquitectura Recientes:
1. **Desactivación del Asistente Virtual Gemini (Mumi)**: Se ha removido el componente del chat interactivo con IA de la interfaz principal para eliminar la dependencia de claves de API externas (`GEMINI_API_KEY`) y mitigar costos operativos para la organización.
2. **Eliminación de Carga de PII (Fotos del DNI)**: Se removió la sección que requería cargar fotos del frente y dorso del Documento Nacional de Identidad (DNI) de las emprendedoras en el formulario de registro. Esto simplifica el proceso de postulación, ahorra espacio en base de datos, agiliza la carga en conexiones lentas y reduce riesgos asociados a la privacidad de datos personales sensibles (PII).

---

## 2. Flujo de Autenticación y Control de Accesos (Firebase)

La plataforma utiliza un modelo de **Control de Acceso Basado en Atributos (ABAC)** gestionado a través de Firebase Authentication y validado mediante reglas de seguridad de Firestore (`firestore.rules`):

1. **Creación de Cuenta / Inicio de Sesión**: Las usuarias se registran y autentican mediante Firebase Auth con su correo y contraseña.
2. **Asignación de Roles**: Al crearse el perfil, se genera un documento en la colección `/users` con el UID del usuario y su rol correspondiente (`role: 'user'` para emprendedoras y `role: 'admin'` para coordinadores de Mujeres 2000).
3. **Estructura del Estado de Vistas (Client-Side)**:
   * Si el usuario autenticado tiene el rol `'admin'`, la aplicación habilita la pestaña de **Consola de Administración** (`AdminDashboard`), con visibilidad completa de todas las solicitudes, panel de scoring, cobros y exportación de reportes.
   * Si el usuario es `'user'`, accede directamente a su formulario multi-paso de solicitud (`wizard`) o a la simulación interactiva de cuotas (`simulator`).
4. **Validación Servidor-Side (Security Rules)**:
   * **Colección `/users`**: El usuario autenticado solo puede leer su propio perfil (`request.auth.uid == userId`). Los administradores pueden leer todos los perfiles.
   * **Colección `/applications`**: Una emprendedora (`user`) solo puede leer, crear o actualizar solicitudes que posean su propio `userId`. Los administradores tienen permisos globales de lectura, actualización y eliminación de cualquier solicitud para aprobar microcréditos, calcular scoring o coordinar desembolsos.
   * **Colección `/scoring_evaluations` y `/config`**: Permisos de escritura reservados de forma exclusiva para administradores.

---

## 3. Variables de Entorno y Configuración

El proyecto cuenta con dos mecanismos clave de configuración:

### A. Archivo de Variables de Entorno `.env`
Este archivo debe crearse en la raíz del proyecto para alojar secretos de servidor (Cloudinary y APIs). Utiliza el formato establecido en `.env.example`:

```env
# Cloudinary Configuration (Almacenamiento de Comprobantes de Pago)
CLOUDINARY_CLOUD_NAME=tu_cloud_name
CLOUDINARY_API_KEY=tu_api_key
CLOUDINARY_API_SECRET=tu_api_secret

# Gemini API Key (Opcional - Deprecado)
GEMINI_API_KEY=tu_gemini_key
```

### B. Archivo `firebase-applet-config.json`
Este archivo se ubica en la raíz del proyecto y contiene la configuración del cliente SDK de Firebase para el Frontend. Es autogenerado por AI Studio, pero para un entorno local se puede descargar desde la consola de Firebase (Ajustes de Proyecto > General > Tus Apps > SDK setup and configuration):

```json
{
  "apiKey": "AIzaSy...",
  "authDomain": "tu-proyecto.firebaseapp.com",
  "projectId": "tu-proyecto",
  "storageBucket": "tu-proyecto.appspot.com",
  "messagingSenderId": "...",
  "appId": "...",
  "firestoreDatabaseId": "(default)"
}
```

---

## 4. Guía de Instalación y Configuración para Nuevos Colaboradores

Sigue estos pasos para levantar un entorno de desarrollo local limpio y 100% gratuito:

### Prerrequisitos:
* **Node.js** (versión 18.x o superior recomendada).
* **npm** (incluido con Node.js).
* Un proyecto de **Firebase** configurado en el plan Spark (gratuito) con los servicios de **Authentication** (Email/Password), **Firestore Database** y **Cloud Storage** habilitados.

### Pasos para Configurar el Entorno de Desarrollo:

1. **Instalar Dependencias**:
   En la raíz del proyecto, ejecuta el siguiente comando para instalar todas las librerías necesarias declaradas en `package.json`:
   ```bash
   npm install
   ```

2. **Configurar las Credenciales**:
   * Copia el archivo `.env.example` y cámbiale el nombre a `.env` en la raíz del proyecto:
     ```bash
     cp .env.example .env
     ```
   * Completa las variables con tus credenciales de Cloudinary (para la gestión de fotos de los comprobantes de pago de las cuotas).
   * Asegúrate de que el archivo `firebase-applet-config.json` se encuentre en la raíz del proyecto con la configuración de tu Base de Datos Firebase.

3. **Iniciar Servidor de Desarrollo**:
   Corre el siguiente comando para arrancar la aplicación en modo desarrollo. Esto levantará un servidor Express en el puerto `3000` que consumirá el middleware de desarrollo de Vite:
   ```bash
   npm run dev
   ```
   Abre [http://localhost:3000](http://localhost:3000) en tu navegador para ver la plataforma funcionando en tiempo real.

4. **Desplegar a Producción (Vercel)**:
   La aplicación está pensada para desplegarse en [Vercel](https://vercel.com):
   * `npm run build` compila los assets de frontend (React + Tailwind CSS) en la carpeta `dist/`, que Vercel detecta y sirve automáticamente como sitio estático.
   * Las rutas bajo `api/` (`upload-signature.ts`, `chat.ts`) se despliegan automáticamente como funciones serverless — no requieren un paso de build aparte.
   * Configura las variables de entorno (`CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `GEMINI_API_KEY`) en el panel de **Settings → Environment Variables** del proyecto en Vercel.

---

## 5. Guía de Traspaso y Compartición de Código (Paso a Paso para Javier)

Si necesitas entregar acceso completo de desarrollo a **Javier (`javierb@winguweb.org`)** para que audite la seguridad y continúe el mantenimiento utilizando únicamente **recursos 100% gratuitos**, sigue esta guía paso a paso:

### Paso 1: Exportar y entregar el código fuente (Gratis)
Puedes enviarle el código de la aplicación de forma segura de las siguientes dos maneras:
1. **Opción A (Recomendada - GitHub Privado)**:
   * Ve al menú de **Ajustes** (icono de engranaje) dentro de **AI Studio**.
   * Selecciona la opción para **Exportar a GitHub**.
   * Crea un repositorio **privado** en tu cuenta de GitHub (crear una cuenta en GitHub y tener repositorios privados es 100% gratuito).
   * Una vez exportado, ve a GitHub, ingresa a la configuración de tu repositorio, selecciona **Collaborators** (Colaboradores) y haz clic en **Add people** (Agregar personas).
   * Escribe el correo electrónico de Javier (`javierb@winguweb.org`) para invitarlo. Él recibirá una invitación para descargar el código, clonarlo y trabajar en su propia máquina.
2. **Opción B (Descarga en ZIP)**:
   * En el menú de **Ajustes** de **AI Studio**, haz clic en **Export as ZIP** para descargar un archivo comprimido con todo el código de la aplicación.
   * Compártele este archivo ZIP directamente por correo o a través de Google Drive de manera gratuita.

### Paso 2: Brindar acceso a la Base de Datos Firebase (Gratis)
Para que Javier pueda ver la estructura de Firestore, probar el inicio de sesión y revisar las reglas de seguridad, debes darle acceso a la consola de tu proyecto de Firebase (el plan Spark de Firebase es totalmente gratuito):
1. Ve a la [Consola de Firebase](https://console.firebase.google.com/).
2. Selecciona el proyecto asociado a esta aplicación (puedes ver el ID del proyecto en el archivo `firebase-applet-config.json`).
3. En el menú lateral izquierdo, haz clic en el engranaje de configuración junto a "Project Overview" y selecciona **Users and permissions** (Usuarios y permisos).
4. Haz clic en el botón **Add member** (Añadir miembro).
5. Escribe el correo de Javier (`javierb@winguweb.org`).
6. En la selección de roles, asígnale el rol de **Editor** o **Viewer** (Visor). El rol de Editor le permitirá realizar pruebas sobre la base de datos de manera completa y gratuita sin incurrir en costos.
7. Haz clic en **Add member**. Javier recibirá una invitación por correo electrónico para acceder al panel de control del proyecto.

### Paso 3: Metodología de Pruebas de Seguridad Sugerida para el Técnico
Cuando Javier reciba el acceso, se sugiere seguir la siguiente metodología de auditoría alineada con el estándar **OWASP para Single Page Applications (SPA)**:
1. **Auditoría de Reglas de Seguridad (Security Rules)**:
   * Javier debe revisar las reglas en la pestaña `Rules` de **Firestore** y **Storage** dentro de la consola de Firebase para verificar que no haya lecturas ni escrituras públicas desprotegidas (`allow read, write: if true;`).
   * Validar que la regla de control de acceso basada en roles (`role == 'admin'`) restrinja correctamente las escrituras operativas en solicitudes ajenas y colecciones de configuración.
2. **Validación de Parámetros en Backend (Inputs Sanitization)**:
   * Auditar los endpoints en el backend de Node (`server.ts`) para certificar que cualquier parámetro recibido sea sanitizado adecuadamente antes de interactuar con servicios externos (como la API de Cloudinary).
3. **Control de Fugas de Secretos**:
   * Verificar en el código de React que no existan variables privadas ni claves de API quemadas de manera estática (hardcoded) en los archivos `.tsx` o `.ts` del frontend que puedan ser inspeccionadas a través de la consola del navegador por usuarios finales.
