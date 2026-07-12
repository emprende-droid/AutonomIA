import { useState, useEffect } from "react";
import { 
  collection, 
  onSnapshot, 
  query, 
  orderBy, 
  doc, 
  addDoc,
  updateDoc,
  getDoc,
  where
} from "firebase/firestore";
import { db } from "../firebase";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle,
  CardFooter
} from "@/components/ui/card";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Search,
  Save,
  History,
  CheckCircle,
  XCircle,
  AlertCircle,
  Edit,
  User as UserIcon,
  TrendingUp,
  Heart
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { toast } from "sonner";
import { AppSettings, ScoringEvaluation, LoanApplication, ScoringQuestion } from "../types";
import { handleFirestoreError, OperationType } from "../lib/firestoreErrorHandler";
import { ArrowLeft } from "lucide-react";

interface ScoringManagerProps {
  initialAppId?: string;
  onBack?: () => void;
}

export default function ScoringManager({ initialAppId, onBack }: ScoringManagerProps) {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [applications, setApplications] = useState<LoanApplication[]>([]);
  const [evaluations, setEvaluations] = useState<ScoringEvaluation[]>([]);
  const [selectedAppId, setSelectedAppId] = useState<string>("");
  const [currentEvaluation, setCurrentEvaluation] = useState<Partial<ScoringEvaluation>>({
    answers: {},
    totalScore: 0,
    status: 'DESAPROBADO'
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // Load Settings
  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, "config", "settings"), (docSnap) => {
      if (docSnap.exists()) {
        setSettings(docSnap.data() as AppSettings);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, "config/settings");
    });
    return () => unsubscribe();
  }, []);

  // Load Applications (to select entrepreneur)
  useEffect(() => {
    const q = query(collection(db, "applications"), orderBy("updatedAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const apps = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as LoanApplication));
      setApplications(apps);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "applications");
    });
    return () => unsubscribe();
  }, []);

  // Load Evaluations History
  useEffect(() => {
    const q = query(collection(db, "scoring_evaluations"), orderBy("date", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const evals = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as ScoringEvaluation));
      setEvaluations(evals);
      setLoading(false);
    }, (error) => {
      setLoading(false);
      handleFirestoreError(error, OperationType.LIST, "scoring_evaluations");
    });
    return () => unsubscribe();
  }, []);

  // Set initial app from props
  useEffect(() => {
    if (initialAppId && applications.length > 0) {
      handleAppSelect(initialAppId);
    }
  }, [initialAppId, applications.length]);

  const calculateScore = (answers: Record<string, number>) => {
    if (!settings) return 0;
    return Object.values(answers).reduce((acc, val) => acc + val, 0);
  };

  const handleAnswerChange = (questionId: string, score: number) => {
    if (!settings?.scoringConfig) return;
    const newAnswers = { ...currentEvaluation.answers, [questionId]: score };
    const totalScore = calculateScore(newAnswers);
    const passingScore = settings.scoringConfig.passingScore || 80;
    
    setCurrentEvaluation({
      ...currentEvaluation,
      answers: newAnswers,
      totalScore,
      status: totalScore >= passingScore ? 'APROBADO' : 'DESAPROBADO'
    });
  };

  const handleAppSelect = (appId: string) => {
    setSelectedAppId(appId);
    const app = applications.find(a => a.id === appId);
    
    // Check if there's an existing evaluation for this app
    const existingEval = evaluations.find(e => e.applicationId === appId);
    
    if (existingEval) {
      setCurrentEvaluation(existingEval);
      toast.info("Cargando evaluación previa de la emprendedora.");
    } else {
      setCurrentEvaluation({
        applicationId: appId,
        entrepreneurName: app ? `${app.personalData.lastName}, ${app.personalData.firstName}` : "",
        answers: {},
        totalScore: 0,
        status: 'DESAPROBADO'
      });
    }
  };

  const handleSave = async () => {
    if (!settings?.scoringConfig || !selectedAppId) return;
    
    const questions = settings.scoringConfig.questions;
    const answeredCount = Object.keys(currentEvaluation.answers || {}).length;
    
    if (answeredCount < questions.length) {
      toast.error(`Por favor responde todas las preguntas (${answeredCount}/${questions.length})`);
      return;
    }

    try {
      const evaluationData = {
        ...currentEvaluation,
        applicationId: selectedAppId,
        date: new Date().toISOString(),
      };

      if (currentEvaluation.id) {
        await updateDoc(doc(db, "scoring_evaluations", currentEvaluation.id), evaluationData);
        toast.success("Evaluación actualizada correctamente");
      } else {
        await addDoc(collection(db, "scoring_evaluations"), evaluationData);
        toast.success("Evaluación guardada correctamente");
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, "scoring_evaluations");
      toast.error("Error al guardar la evaluación");
    }
  };

  const filteredApps = applications.filter(app => {
    if (app.status === 'Draft') return false;
    const fullName = `${app.personalData.firstName} ${app.personalData.lastName}`.toLowerCase();
    const reverseFullName = `${app.personalData.lastName} ${app.personalData.firstName}`.toLowerCase();
    const email = app.userEmail.toLowerCase();
    const search = searchTerm.toLowerCase().trim();
    const termClean = search.startsWith('#') ? search.substring(1) : search;
    const loanNumStr = app.loanNumber ? String(app.loanNumber) : '';

    return (
      fullName.includes(search) || 
      reverseFullName.includes(search) || 
      email.includes(search) ||
      (loanNumStr && (loanNumStr === termClean || loanNumStr.includes(termClean)))
    );
  });

  if (!settings || !settings.scoringConfig) return (
    <div className="p-8 text-center text-slate-500">
      Cargando configuración de scoring...
    </div>
  );

  const questionsA = settings.scoringConfig.questions.filter(q => q.section === 'A');
  const questionsB = settings.scoringConfig.questions.filter(q => q.section === 'B');

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        {onBack && (
          <Button 
            variant="ghost" 
            onClick={onBack} 
            className="text-slate-500 hover:text-blue-600 hover:bg-blue-50 px-3 transition-all flex items-center gap-2 group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span className="font-medium">Volver a Solicitudes</span>
          </Button>
        )}
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Form Section */}
        <Card className="lg:col-span-2 border-none shadow-xl">
          <CardHeader className="border-b bg-white sticky top-0 z-10">
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Evaluación de Scoring</CardTitle>
                <CardDescription>Registro digital de evaluación de compromiso y desarrollo.</CardDescription>
              </div>
              <div className="text-right">
                <div className={`text-3xl font-bold ${currentEvaluation.status === 'APROBADO' ? 'text-green-600' : 'text-red-600'}`}>
                  {currentEvaluation.totalScore} / 140
                </div>
                <Badge className={currentEvaluation.status === 'APROBADO' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                  {currentEvaluation.status}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-8">
            {/* Selection with Search */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-slate-700 font-medium">Buscar Emprendedora</Label>
                
                {selectedAppId ? (
                  (() => {
                    const app = applications.find(a => a.id === selectedAppId);
                    if (!app) return null;
                    return (
                      <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between animate-in fade-in slide-in-from-top-1">
                        <div>
                          <div className="text-xs text-blue-600 font-semibold uppercase tracking-wider">Emprendedora Seleccionada</div>
                          <div className="text-sm font-bold text-slate-800">
                            {app.personalData.lastName}, {app.personalData.firstName}
                          </div>
                          <div className="text-xs text-slate-500">{app.userEmail}</div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedAppId("");
                            setCurrentEvaluation({
                              answers: {},
                              totalScore: 0,
                              status: 'DESAPROBADO'
                            });
                            setSearchTerm("");
                          }}
                          className="text-slate-500 hover:text-red-500 hover:bg-red-50 text-xs px-3"
                        >
                          Cambiar
                        </Button>
                      </div>
                    );
                  })()
                ) : (
                  <div className="relative">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input
                        placeholder="Buscar por emprendedora, Nº de préstamo, email..."
                        className="pl-9 h-10"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        autoFocus
                      />
                    </div>

                    {/* Suggestions list overlay */}
                    {searchTerm.trim().length > 0 && (
                      <div className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-md shadow-lg max-h-60 overflow-y-auto animate-in fade-in duration-200">
                        {loading ? (
                          <div className="p-4 text-center text-sm text-slate-500">
                            Cargando emprendedoras...
                          </div>
                        ) : filteredApps.length > 0 ? (
                          filteredApps.slice(0, 10).map((app) => (
                            <button
                              key={app.id}
                              type="button"
                              onClick={() => {
                                handleAppSelect(app.id);
                                setSearchTerm("");
                              }}
                              className="w-full text-left px-4 py-2 hover:bg-slate-50 focus:bg-slate-50 hover:text-primary transition-colors text-sm border-b border-slate-100 last:border-b-0 flex flex-col"
                            >
                              <span className="font-semibold text-slate-700 flex items-center justify-between">
                                <span>{app.personalData.lastName}, {app.personalData.firstName}</span>
                                {app.loanNumber && (
                                  <span className="text-[10px] font-mono font-bold bg-blue-50 text-blue-600 px-1.5 py-0.2 rounded border border-blue-100">
                                    #{app.loanNumber}
                                  </span>
                                )}
                              </span>
                              <span className="text-xs text-slate-500">
                                {app.userEmail}
                              </span>
                            </button>
                          ))
                        ) : (
                          <div className="p-4 text-center text-xs text-slate-500">
                            No se encontraron emprendedoras con ese nombre.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {selectedAppId ? (
              <div className="space-y-8">
                {/* Section A */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-primary border-b pb-2">
                    <Heart className="w-5 h-5" />
                    <h3 className="font-bold uppercase tracking-wider text-sm">Sección A: Compromiso</h3>
                  </div>
                  <div className="grid grid-cols-1 gap-6">
                    {questionsA.map(q => (
                      <div key={q.id} className="space-y-3 p-4 bg-slate-50 rounded-lg border border-slate-100">
                        <Label className="text-base">{q.text}</Label>
                        <div className="flex flex-wrap gap-2">
                          <Button 
                            variant={currentEvaluation.answers?.[q.id] === 10 ? "default" : "outline"}
                            size="sm"
                            onClick={() => handleAnswerChange(q.id, 10)}
                            className="text-xs"
                          >
                            {q.options?.positive} (10 pts)
                          </Button>
                          {q.options?.medium && (
                            <Button 
                              variant={currentEvaluation.answers?.[q.id] === 5 ? "default" : "outline"}
                              size="sm"
                              onClick={() => handleAnswerChange(q.id, 5)}
                              className="text-xs"
                            >
                              {q.options.medium} (5 pts)
                            </Button>
                          )}
                          <Button 
                            variant={currentEvaluation.answers?.[q.id] === 0 ? "default" : "outline"}
                            size="sm"
                            onClick={() => handleAnswerChange(q.id, 0)}
                            className="text-xs"
                          >
                            {q.options?.negative} (0 pts)
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Section B */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-primary border-b pb-2">
                    <TrendingUp className="w-5 h-5" />
                    <h3 className="font-bold uppercase tracking-wider text-sm">Sección B: Desarrollo del Emprendimiento</h3>
                  </div>
                  <div className="grid grid-cols-1 gap-6">
                    {questionsB.map(q => (
                      <div key={q.id} className="space-y-3 p-4 bg-slate-50 rounded-lg border border-slate-100">
                        <Label className="text-base">{q.text}</Label>
                        <div className="flex flex-wrap gap-2">
                          <Button 
                            variant={currentEvaluation.answers?.[q.id] === 10 ? "default" : "outline"}
                            size="sm"
                            onClick={() => handleAnswerChange(q.id, 10)}
                            className="text-xs"
                          >
                            {q.options?.positive} (10 pts)
                          </Button>
                          {q.type === 'three-options' && q.options?.medium && (
                            <Button 
                              variant={currentEvaluation.answers?.[q.id] === 5 ? "default" : "outline"}
                              size="sm"
                              onClick={() => handleAnswerChange(q.id, 5)}
                              className="text-xs"
                            >
                              {q.options.medium} (5 pts)
                            </Button>
                          )}
                          <Button 
                            variant={currentEvaluation.answers?.[q.id] === 0 ? "default" : "outline"}
                            size="sm"
                            onClick={() => handleAnswerChange(q.id, 0)}
                            className="text-xs"
                          >
                            {q.options?.negative} (0 pts)
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-20 text-center text-slate-400">
                <UserIcon className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <p>Selecciona una emprendedora para comenzar la evaluación</p>
              </div>
            )}
          </CardContent>
          {selectedAppId && (
            <CardFooter className="bg-slate-50 p-6 border-t">
              <Button onClick={handleSave} className="w-full py-6 text-lg">
                <Save className="w-5 h-5 mr-2" />
                Guardar Evaluación
              </Button>
            </CardFooter>
          )}
        </Card>

        {/* History Section */}
        <div className="space-y-6">
          <Card className="border-none shadow-lg">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <History className="w-5 h-5" /> Historial Reciente
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-[600px] overflow-y-auto">
                <Table>
                  <TableHeader className="bg-slate-50 sticky top-0 z-10">
                    <TableRow>
                      <TableHead>Emprendedora</TableHead>
                      <TableHead>Puntaje</TableHead>
                      <TableHead className="text-right">Acción</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {evaluations.map((ev) => (
                      <TableRow key={ev.id} className="text-xs">
                        <TableCell>
                          <div className="font-bold">{ev.entrepreneurName}</div>
                          <div className="text-[10px] text-slate-500">{new Date(ev.date).toLocaleDateString()}</div>
                        </TableCell>
                        <TableCell>
                          <Badge className={ev.status === 'APROBADO' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                            {ev.totalScore}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8"
                            onClick={() => {
                              setSelectedAppId(ev.applicationId);
                              setCurrentEvaluation(ev);
                            }}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {evaluations.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center py-8 text-slate-500">No hay evaluaciones registradas.</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg bg-primary text-white">
            <CardHeader>
              <CardTitle className="text-lg">Resumen de Scoring</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm opacity-80">Total Evaluaciones:</span>
                <span className="text-2xl font-bold">{evaluations.length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm opacity-80">Aprobadas:</span>
                <span className="text-2xl font-bold text-green-300">
                  {evaluations.filter(e => e.status === 'APROBADO').length}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm opacity-80">Desaprobadas:</span>
                <span className="text-2xl font-bold text-red-300">
                  {evaluations.filter(e => e.status === 'DESAPROBADO').length}
                </span>
              </div>
            </CardContent>
          </Card>

          {selectedAppId && (() => {
            const app = applications.find(a => a.id === selectedAppId);
            if (!app) return null;
            const userApps = applications.filter(a => a.userId === app.userId);
            return (
              <Card className="border-none shadow-lg bg-white overflow-hidden">
                <CardHeader className="pb-3 border-b border-slate-50">
                  <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-800">
                    <History className="w-4 h-4 text-primary" /> Scorings de {app.personalData.firstName} {app.personalData.lastName}
                  </CardTitle>
                  <CardDescription className="text-[10px]">
                    El scoring es individual por cada préstamo:
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <Table className="text-xs">
                    <TableHeader className="bg-slate-50/50">
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="py-1.5 px-3">Préstamo</TableHead>
                        <TableHead className="py-1.5 px-3 text-right">Monto</TableHead>
                        <TableHead className="py-1.5 px-3 text-right text-slate-600">Puntaje</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {userApps.map(uApp => {
                        const isCurrent = uApp.id === selectedAppId;
                        const scoring = evaluations.find(e => e.applicationId === uApp.id);
                        return (
                          <TableRow 
                            key={uApp.id} 
                            className={`cursor-pointer hover:bg-slate-50/50 ${isCurrent ? 'bg-blue-50/40 select-none' : ''}`}
                            onClick={() => {
                              if (!isCurrent) {
                                handleAppSelect(uApp.id);
                              }
                            }}
                          >
                            <TableCell className="py-2 px-3 font-semibold">
                              <div className="flex items-center gap-1">
                                <span>{uApp.loanNumber ? `#${uApp.loanNumber}` : 'Borrador'}</span>
                                {isCurrent && <Badge className="text-[7px] px-1 py-0 h-auto bg-blue-500 text-white">Actual</Badge>}
                              </div>
                              <div className="text-[9px] text-slate-400 font-normal">{new Date(uApp.createdAt).toLocaleDateString()}</div>
                            </TableCell>
                            <TableCell className="py-2 px-3 text-right font-medium text-slate-700">${uApp.loanDetails.requestedAmount.toLocaleString('es-AR')}</TableCell>
                            <TableCell className="py-2 px-3 text-right">
                              {scoring ? (
                                <Badge className={`text-[9px] px-1.5 py-0 ${scoring.status === 'APROBADO' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-red-100 text-red-700 border-red-200'}`}>
                                  {scoring.totalScore} pts
                                </Badge>
                              ) : (
                                <span className="text-[10px] text-slate-400 italic">Pendiente</span>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
