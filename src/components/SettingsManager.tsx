import { useState, useEffect } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../firebase";
import { AppSettings, LoanProduct, ScoringQuestion } from "../types";
import { DEFAULT_SETTINGS } from "../lib/defaultSettings";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Save, RotateCcw, ChevronDown, ChevronUp, Users, ClipboardList, Wallet, Target } from "lucide-react";
import UserManager from "./UserManager";
import { motion, AnimatePresence } from "motion/react";

export default function SettingsManager() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expandedQuestion, setExpandedQuestion] = useState<string | null>(null);
  const [openSection, setOpenSection] = useState<string | null>(null);

  // Estados locales para las listas de texto libre para evitar saltos de cursor y pérdida de caracteres al escribir
  const [neighborhoodsInput, setNeighborhoodsInput] = useState("");
  const [civilStatusesInput, setCivilStatusesInput] = useState("");
  const [educationLevelsInput, setEducationLevelsInput] = useState("");
  const [activitiesInput, setActivitiesInput] = useState("");
  const [salesPlacesInput, setSalesPlacesInput] = useState("");
  const [inputsInitialized, setInputsInitialized] = useState(false);

  const toggleSection = (section: string) => {
    setOpenSection(openSection === section ? null : section);
  };

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const docRef = doc(db, "config", "settings");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setSettings(docSnap.data() as AppSettings);
        } else {
          setSettings(DEFAULT_SETTINGS);
        }
      } catch (error) {
        console.error("Error fetching settings:", error);
        setSettings(DEFAULT_SETTINGS);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  // Inicializar los textareas locales cuando se cargan las configuraciones
  useEffect(() => {
    if (settings && !inputsInitialized) {
      setNeighborhoodsInput(settings.neighborhoods.join(", "));
      setCivilStatusesInput(settings.civilStatuses.join(", "));
      setEducationLevelsInput(settings.educationLevels.join(", "));
      setActivitiesInput(settings.activities.join(", "));
      setSalesPlacesInput((settings.salesPlaces || DEFAULT_SETTINGS.salesPlaces || []).join(", "));
      setInputsInitialized(true);
    }
  }, [settings, inputsInitialized]);

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      await setDoc(doc(db, "config", "settings"), settings);
    } catch (error) {
      console.error("Error saving settings:", error);
    } finally {
      setSaving(false);
    }
  };

  const resetToDefault = () => {
    setSettings(DEFAULT_SETTINGS);
    setNeighborhoodsInput(DEFAULT_SETTINGS.neighborhoods.join(", "));
    setCivilStatusesInput(DEFAULT_SETTINGS.civilStatuses.join(", "));
    setEducationLevelsInput(DEFAULT_SETTINGS.educationLevels.join(", "));
    setActivitiesInput(DEFAULT_SETTINGS.activities.join(", "));
    setSalesPlacesInput((DEFAULT_SETTINGS.salesPlaces || []).join(", "));
  };

  const updateProduct = (id: string, field: keyof LoanProduct, value: any) => {
    if (!settings) return;
    setSettings({
      ...settings,
      loanProducts: settings.loanProducts.map(p => p.id === id ? { ...p, [field]: value } : p)
    });
  };

  const addProduct = () => {
    if (!settings) return;
    const newProduct: LoanProduct = {
      id: crypto.randomUUID(),
      name: "Nuevo Producto",
      minAmount: 0,
      maxAmount: 100000,
      interestRate: 48,
      maxInstallments: 6
    };
    setSettings({
      ...settings,
      loanProducts: [...settings.loanProducts, newProduct]
    });
  };

  const removeProduct = (id: string) => {
    if (!settings) return;
    setSettings({
      ...settings,
      loanProducts: settings.loanProducts.filter(p => p.id !== id)
    });
  };

  const handleListChange = (key: 'neighborhoods' | 'civilStatuses' | 'educationLevels' | 'activities' | 'salesPlaces', value: string) => {
    if (key === "neighborhoods") setNeighborhoodsInput(value);
    else if (key === "civilStatuses") setCivilStatusesInput(value);
    else if (key === "educationLevels") setEducationLevelsInput(value);
    else if (key === "activities") setActivitiesInput(value);
    else if (key === "salesPlaces") setSalesPlacesInput(value);

    if (!settings) return;
    const items = value.split(",").map(i => i.trim()).filter(i => i !== "");
    setSettings({ ...settings, [key]: items });
  };

  const updateScoringQuestion = (id: string, field: keyof ScoringQuestion, value: any) => {
    if (!settings?.scoringConfig) return;
    setSettings({
      ...settings,
      scoringConfig: {
        ...settings.scoringConfig,
        questions: settings.scoringConfig.questions.map(q => q.id === id ? { ...q, [field]: value } : q)
      }
    });
  };

  const updateScoringOption = (id: string, optionKey: 'positive' | 'medium' | 'negative', value: string) => {
    if (!settings?.scoringConfig) return;
    setSettings({
      ...settings,
      scoringConfig: {
        ...settings.scoringConfig,
        questions: settings.scoringConfig.questions.map(q => {
          if (q.id === id) {
            return {
              ...q,
              options: {
                ...q.options,
                [optionKey]: value
              }
            };
          }
          return q;
        })
      }
    });
  };

  const addScoringQuestion = () => {
    if (!settings?.scoringConfig) return;
    const newQuestion: ScoringQuestion = {
      id: crypto.randomUUID(),
      section: 'A',
      text: "Nueva Pregunta",
      type: 'three-options',
      options: {
        positive: "Positivo",
        medium: "Medio",
        negative: "Negativo"
      }
    };
    setSettings({
      ...settings,
      scoringConfig: {
        ...settings.scoringConfig,
        questions: [...settings.scoringConfig.questions, newQuestion]
      }
    });
    setExpandedQuestion(newQuestion.id);
  };

  const removeScoringQuestion = (id: string) => {
    if (!settings?.scoringConfig) return;
    setSettings({
      ...settings,
      scoringConfig: {
        ...settings.scoringConfig,
        questions: settings.scoringConfig.questions.filter(q => q.id !== id)
      }
    });
  };

  if (loading || !settings) return <div className="p-8 text-center text-slate-500 animate-pulse">Cargando configuración...</div>;

  const sections = [
    {
      id: "users",
      title: "Gestión de Usuarios",
      description: "Administra los roles y accesos de los miembros de la ONG.",
      icon: <Users className="w-5 h-5" />,
      content: <UserManager />
    },
    {
      id: "forms",
      title: "Formularios y Contacto (WhatsApp)",
      description: "Configurá el número de WhatsApp oficial de la ONG y los valores de los desplegables.",
      icon: <ClipboardList className="w-5 h-5" />,
      content: (
        <div className="space-y-6 pt-4">
          <div className="space-y-2 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
            <Label className="font-bold text-emerald-800">Número de WhatsApp de la ONG</Label>
            <Input 
              className="bg-white border-emerald-300 focus-visible:ring-emerald-500"
              placeholder="Ej: 5491122334455"
              value={settings.whatsappNumber || ""}
              onChange={(e) => setSettings({ ...settings, whatsappNumber: e.target.value })}
            />
            <p className="text-xs text-emerald-600 leading-normal">
              Ingresá el número completo con código de país e indicativo móvil (ej: para Argentina use 549 seguido de código de área sin 0 y número de celular sin 15). Las emprendedoras verán un botón de contacto directo por WhatsApp.
            </p>
          </div>

          <div className="space-y-2">
            <Label>Barrios</Label>
            <textarea 
              className="w-full min-h-[100px] p-3 rounded-md border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white"
              value={neighborhoodsInput}
              onChange={(e) => handleListChange("neighborhoods", e.target.value)}
              placeholder="Ej: La Loma, Santa Ana, San Jorge"
            />
          </div>
          <div className="space-y-2">
            <Label>Estados Civiles</Label>
            <textarea 
              className="w-full min-h-[80px] p-3 rounded-md border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white"
              value={civilStatusesInput}
              onChange={(e) => handleListChange("civilStatuses", e.target.value)}
              placeholder="Ej: Soltera, Casada, Divorciada"
            />
          </div>
          <div className="space-y-2">
            <Label>Niveles de Educación</Label>
            <textarea 
              className="w-full min-h-[80px] p-3 rounded-md border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white"
              value={educationLevelsInput}
              onChange={(e) => handleListChange("educationLevels", e.target.value)}
              placeholder="Ej: Primario Incompleto, Secundario Completo"
            />
          </div>
          <div className="space-y-2">
            <Label>Actividades / Rubros</Label>
            <textarea 
              className="w-full min-h-[100px] p-3 rounded-md border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white"
              value={activitiesInput}
              onChange={(e) => handleListChange("activities", e.target.value)}
              placeholder="Ej: Costura, Peluquería, Almacén, Viandas"
            />
          </div>
          <div className="space-y-2">
            <Label>Lugares de Venta (Paso 3)</Label>
            <textarea 
              className="w-full min-h-[100px] p-3 rounded-md border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white"
              value={salesPlacesInput}
              onChange={(e) => handleListChange("salesPlaces", e.target.value)}
              placeholder="Ej: Redes sociales, Boca en boca, Local, Mercado Libre"
            />
            <p className="text-xs text-slate-500 leading-normal">
              Escribí las opciones separadas por comas. Servirá para parametrizar el campo &quot;Lugar de venta&quot; en la sección del Emprendimiento.
            </p>
          </div>
        </div>
      )
    },
    {
      id: "loans",
      title: "Tipos de Préstamos",
      description: "Define montos, tasas y plazos por producto.",
      icon: <Wallet className="w-5 h-5" />,
      content: (
        <div className="space-y-6 pt-4">
          <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="space-y-1">
              <Label className="font-bold text-blue-900 text-sm">Permitir más de un préstamo activo</Label>
              <p className="text-xs text-blue-700 leading-normal max-w-xl">
                Al activar esta opción, las emprendedoras podrán solicitar múltiples préstamos de forma simultánea. Si está desactivada (por defecto), solo podrán presentar una nueva solicitud cuando cancelen la actual (estado Pago) o sea Rechazada.
              </p>
            </div>
            <button
              onClick={() => setSettings({ ...settings, allowMultipleLoans: !settings.allowMultipleLoans })}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                settings.allowMultipleLoans ? "bg-blue-600" : "bg-slate-200"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  settings.allowMultipleLoans ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          <div className="flex justify-end">
            <Button size="sm" onClick={addProduct} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              Nuevo Producto
            </Button>
          </div>
          {settings.loanProducts.map((product) => (
            <div key={product.id} className="p-4 bg-slate-50 rounded-lg border border-slate-100 space-y-4 relative group">
              <Button 
                variant="ghost" 
                size="icon" 
                className="absolute top-2 right-2 text-slate-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => removeProduct(product.id)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <Label>Nombre del Producto</Label>
                  <Input 
                    className="bg-white"
                    value={product.name} 
                    onChange={(e) => updateProduct(product.id, "name", e.target.value)} 
                  />
                </div>
                <div>
                  <Label>Monto Mínimo ($)</Label>
                  <Input 
                    className="bg-white"
                    type="number" 
                    value={product.minAmount} 
                    onChange={(e) => updateProduct(product.id, "minAmount", Number(e.target.value))} 
                  />
                </div>
                <div>
                  <Label>Monto Máximo ($)</Label>
                  <Input 
                    className="bg-white"
                    type="number" 
                    value={product.maxAmount} 
                    onChange={(e) => updateProduct(product.id, "maxAmount", Number(e.target.value))} 
                  />
                </div>
                <div>
                  <Label>Tasa Anual (%)</Label>
                  <Input 
                    className="bg-white"
                    type="number" 
                    step="0.1"
                    placeholder="Ej: 48"
                    value={product.interestRate <= 2 ? Math.round(product.interestRate * 1200) : product.interestRate} 
                    onChange={(e) => updateProduct(product.id, "interestRate", Number(e.target.value))} 
                  />
                </div>
                <div>
                  <Label>Plazo Máximo (cuotas)</Label>
                  <Input 
                    className="bg-white"
                    type="number" 
                    value={product.maxInstallments} 
                    onChange={(e) => updateProduct(product.id, "maxInstallments", Number(e.target.value))} 
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )
    },
    {
      id: "scoring",
      title: "Configuración de Scoring",
      description: "Edita las preguntas, secciones y puntaje de aprobación del scoring.",
      icon: <Target className="w-5 h-5" />,
      content: !settings.scoringConfig ? (
        <div className="py-8 text-center space-y-4">
          <p className="text-slate-500 text-sm">La configuración de scoring no ha sido inicializada.</p>
          <Button onClick={() => setSettings({ ...settings, scoringConfig: DEFAULT_SETTINGS.scoringConfig })}>
            <Plus className="w-4 h-4 mr-2" />
            Inicializar Scoring
          </Button>
        </div>
      ) : (
        <div className="space-y-6 pt-4">
          <div className="p-4 bg-blue-50 border border-blue-100 rounded-lg flex justify-between items-center">
            <Label className="font-bold text-blue-900">Puntaje Mínimo para Aprobar</Label>
            <Input 
              type="number" 
              className="w-24 bg-white border-blue-200"
              value={settings.scoringConfig.passingScore}
              onChange={(e) => setSettings({
                ...settings,
                scoringConfig: { ...settings.scoringConfig!, passingScore: Number(e.target.value) }
              })}
            />
          </div>

          <div className="flex justify-between items-center">
            <h4 className="text-sm font-semibold text-slate-700">Banco de Preguntas</h4>
            <Button size="sm" onClick={addScoringQuestion} variant="outline" className="h-8">
              <Plus className="w-4 h-4 mr-2" />
              Agregar Pregunta
            </Button>
          </div>

          <div className="space-y-3">
            {settings.scoringConfig?.questions.map((q) => (
              <div key={q.id} className="border rounded-lg overflow-hidden bg-white">
                <div 
                  className="p-3 bg-slate-50 flex items-center justify-between cursor-pointer hover:bg-slate-100 transition-colors"
                  onClick={() => setExpandedQuestion(expandedQuestion === q.id ? null : q.id)}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                      Sec {q.section}
                    </span>
                    <span className="text-sm font-medium truncate max-w-[200px] md:max-w-md">{q.text}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-7 w-7 text-slate-400 hover:text-red-600"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeScoringQuestion(q.id);
                      }}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                    {expandedQuestion === q.id ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
                  </div>
                </div>
                
                <AnimatePresence>
                  {expandedQuestion === q.id && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="p-4 bg-white space-y-4 border-t border-slate-100">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="md:col-span-2">
                            <Label>Texto de la Pregunta</Label>
                            <Input 
                              value={q.text} 
                              onChange={(e) => updateScoringQuestion(q.id, "text", e.target.value)} 
                            />
                          </div>
                          <div>
                            <Label>Sección</Label>
                            <select 
                              className="w-full h-10 px-3 rounded-md border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500/20"
                              value={q.section}
                              onChange={(e) => updateScoringQuestion(q.id, "section", e.target.value as 'A' | 'B')}
                            >
                              <option value="A">Sección A (Compromiso)</option>
                              <option value="B">Sección B (Desarrollo)</option>
                            </select>
                          </div>
                          <div>
                            <Label>Tipo de Respuesta</Label>
                            <select 
                              className="w-full h-10 px-3 rounded-md border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500/20"
                              value={q.type}
                              onChange={(e) => updateScoringQuestion(q.id, "type", e.target.value as any)}
                            >
                              <option value="three-options">Tres Opciones (10/5/0)</option>
                              <option value="boolean">Sí / No (10/0)</option>
                            </select>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div>
                            <Label className="text-[10px] uppercase font-bold text-slate-500">Positivo (10 pts)</Label>
                            <Input 
                              value={q.options?.positive} 
                              onChange={(e) => updateScoringOption(q.id, "positive", e.target.value)} 
                            />
                          </div>
                          {q.type === 'three-options' && (
                            <div>
                              <Label className="text-[10px] uppercase font-bold text-slate-500">Medio (5 pts)</Label>
                              <Input 
                                value={q.options?.medium} 
                                onChange={(e) => updateScoringOption(q.id, "medium", e.target.value)} 
                              />
                            </div>
                          )}
                          <div>
                            <Label className="text-[10px] uppercase font-bold text-slate-500">Negativo (0 pts)</Label>
                            <Input 
                              value={q.options?.negative} 
                              onChange={(e) => updateScoringOption(q.id, "negative", e.target.value)} 
                            />
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Panel de Configuración</h2>
          <p className="text-slate-500 text-sm">Gestiona usuarios, productos y parámetros del sistema en un solo lugar.</p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <Button variant="outline" onClick={resetToDefault} disabled={saving} className="flex-1 md:flex-none border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors">
            <RotateCcw className="w-4 h-4 mr-2" />
            Restablecer
          </Button>
          <Button onClick={handleSave} disabled={saving} className="flex-1 md:flex-none bg-blue-600 hover:bg-blue-700 shadow-md transition-all active:scale-95">
            <Save className="w-4 h-4 mr-2" />
            {saving ? "Guardando..." : "Guardar Cambios"}
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        {sections.map((section) => (
          <Card key={section.id} className="border border-slate-200 shadow-sm overflow-hidden hover:border-blue-200 transition-colors">
            <div 
              className={`p-4 md:p-6 flex items-center justify-between cursor-pointer transition-colors ${openSection === section.id ? 'bg-slate-50' : 'bg-white hover:bg-slate-50/50'}`}
              onClick={() => toggleSection(section.id)}
            >
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${openSection === section.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'bg-slate-100 text-slate-500'}`}>
                  {section.icon}
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 leading-none mb-1">{section.title}</h3>
                  <p className="text-sm text-slate-500">{section.description}</p>
                </div>
              </div>
              <div className={`transition-transform duration-300 ${openSection === section.id ? 'rotate-180 text-blue-600' : 'text-slate-400'}`}>
                <ChevronDown className="w-5 h-5" />
              </div>
            </div>

            <AnimatePresence>
              {openSection === section.id && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                  className="overflow-hidden"
                >
                  <CardContent className="p-4 md:p-6 pt-0 border-t border-slate-100 bg-white">
                    {section.content}
                  </CardContent>
                </motion.div>
              )}
            </AnimatePresence>
          </Card>
        ))}
      </div>
    </div>
  );
}
