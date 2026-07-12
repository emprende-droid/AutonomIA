import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { MessageSquare, X, Send, Bot, Sparkles, AlertCircle, ArrowUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

interface Message {
  id: string;
  role: "user" | "assistant";
  text: string;
  createdAt: Date;
}

interface AIAssistantChatProps {
  userRole: "admin" | "user";
  currentAppStatus?: string;
  applicantName?: string;
}

export default function AIAssistantChat({ userRole, currentAppStatus, applicantName }: AIAssistantChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize with a welcome message once
  useEffect(() => {
    if (messages.length === 0) {
      const welcomeText = userRole === 'admin' 
        ? `¡Hola ${applicantName || "administrador"}! Soy **Mumi**, tu asistente de Mujeres 2000. ¿En qué puedo colaborar con tu labor de gestión hoy? Puedo indicarte cómo agregar barrios, configurar el scoring o cambiar roles de usuarios.`
        : `¡Hola ${applicantName || "emprendedora"}! Soy **Mumi**, tu asistente virtual. Estoy aquí para resolver tus dudas sobre la simulación de préstamos, el estado de tu solicitud, o guiarte en cualquiera de los 5 pasos del formulario. 😊`;
      
      setMessages([
        {
          id: "welcome",
          role: "assistant",
          text: welcomeText,
          createdAt: new Date()
        }
      ]);
    }
  }, [userRole, applicantName]);

  // Scroll to bottom on updates
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
  }, [messages, isOpen]);

  // Alert new messages when closed
  const triggerNotification = () => {
    if (!isOpen) {
      setHasUnread(true);
    }
  };

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim()) return;

    const userMsg: Message = {
      id: Math.random().toString(),
      role: "user",
      text: textToSend,
      createdAt: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      // Build the message history to send to Gemini
      const apiMessages = [...messages, userMsg].map(m => ({
        role: m.role,
        text: m.text
      }));

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          messages: apiMessages,
          userRole,
          currentAppStatus,
          applicantName
        })
      });

      if (!res.ok) {
        let errorMessage = `Error del servidor (${res.status})`;
        try {
          const errorData = await res.json();
          if (errorData && errorData.error) {
            errorMessage = errorData.error;
          }
        } catch (_) {}
        throw new Error(errorMessage);
      }

      const data = await res.json();
      
      const assistantMsg: Message = {
        id: Math.random().toString(),
        role: "assistant",
        text: data.text || "Lo siento, no pude procesar la consulta en este momento.",
        createdAt: new Date()
      };

      setMessages(prev => [...prev, assistantMsg]);
      triggerNotification();
    } catch (err: any) {
      console.error("Assistant chat error:", err);
      
      const errorText = err.message || "Ocurrió un error al contactar al servidor.";
      
      setMessages(prev => [...prev, {
        id: Math.random().toString(),
        role: "assistant",
        text: `Error de conexión: ${errorText}\n\nPor favor, asegúrate de que la clave \`GEMINI_API_KEY\` esté configurada correctamente en **Ajustes > Secrets** en el menú de AI Studio.`,
        createdAt: new Date()
      }]);
    } finally {
      setLoading(false);
    }
  };

  // Quick action suggestions
  const suggestionChips = userRole === 'admin' 
    ? [
        { label: "Añadir un nuevo barrio", query: "¿Cómo añado un nuevo barrio a las opciones?" },
        { label: "Cambiar roles de usuario", query: "¿Cómo puedo cambiarle el rol a una emprendedora?" },
        { label: "Configurar scoring", query: "¿Cómo configuro el puntaje mínimo de aprobación?" }
      ]
    : [
        { label: "Simular un préstamo", query: "¿Cómo puedo simular un préstamo?" },
        { label: "Estado de mi solicitud", query: "¿En qué estado se encuentra mi solicitud de préstamo?" },
        { label: "Subir comprobante de pago", query: "¿Cómo subo un comprobante de pago?" }
      ];

  // Helper parser for basic bold text and lists, returning React nodes safely
  const formatText = (rawText: string) => {
    const lines = rawText.split('\n');
    return lines.map((line, i) => {
      let content: React.ReactNode = line;

      // Handle simple list items: "- text" or "* text"
      const isBullet = line.trim().startsWith('-') || line.trim().startsWith('*');
      const cleanLine = isBullet ? line.replace(/^[\s-*]+/, '') : line;

      // Parse bold **text** in the line
      const boldRegex = /\*\*(.*?)\*\*/g;
      const parts = [];
      let lastIndex = 0;
      let match;

      while ((match = boldRegex.exec(cleanLine)) !== null) {
        if (match.index > lastIndex) {
          parts.push(cleanLine.substring(lastIndex, match.index));
        }
        parts.push(<strong key={match.index} className="font-bold text-slate-900">{match[1]}</strong>);
        lastIndex = boldRegex.lastIndex;
      }

      if (lastIndex < cleanLine.length) {
        parts.push(cleanLine.substring(lastIndex));
      }

      content = parts.length > 0 ? parts : cleanLine;

      if (isBullet) {
        return (
          <li key={i} className="ml-4 list-disc text-sm text-slate-700 leading-relaxed mb-1 pl-1">
            {content}
          </li>
        );
      }

      return (
        <p key={i} className="text-sm text-slate-700 leading-relaxed mb-2 min-h-[0.5rem]">
          {content}
        </p>
      );
    });
  };

  return (
    <>
      {/* Floating Action Button Widget */}
      <div className="fixed bottom-6 right-6 z-50">
        <button
          id="mumi-chat-fab"
          onClick={() => {
            setIsOpen(!isOpen);
            setHasUnread(false);
          }}
          className={`flex items-center justify-center w-14 h-14 rounded-full shadow-lg transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-primary/20 ${
            isOpen 
              ? 'bg-slate-800 hover:bg-slate-700 text-white' 
              : 'bg-primary hover:bg-primary/95 text-white animate-bounce-slow'
          } relative`}
          title="Consulta a Mumi, tu asistente virtual"
        >
          {isOpen ? (
            <X className="w-6 h-6 animate-in spin-in duration-300Unified" />
          ) : (
            <div className="relative">
              <Bot className="w-6 h-6" />
              <Sparkles className="w-3.5 h-3.5 absolute -top-1.5 -right-1.5 text-yellow-300 animate-pulse" />
            </div>
          )}

          {/* Unread dot notifications */}
          {hasUnread && !isOpen && (
            <span className="absolute top-0 right-0 flex h-4 w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500 text-[9px] font-bold text-white items-center justify-center">1</span>
            </span>
          )}
        </button>
      </div>

      {/* Slide-in Conversation Panel Drawer */}
      <AnimatePresence>
        {isOpen && (
          <aside className="fixed bottom-24 right-4 sm:right-6 w-[calc(100vw-32px)] sm:w-[400px] h-[550px] max-h-[80vh] z-50 animate-in fade-in slide-in-from-bottom-6 duration-300">
            <Card className="flex flex-col h-full bg-white border border-slate-200 shadow-2xl rounded-2xl overflow-hidden">
              {/* Header */}
              <header className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-900 text-white">
                <div className="flex items-center gap-3">
                  <div className="relative p-2 bg-slate-800 rounded-lg">
                    <Bot className="w-5 h-5 text-primary" />
                    <span className="absolute bottom-1 right-1 w-2.5 h-2.5 bg-green-500 border-2 border-slate-900 rounded-full"></span>
                  </div>
                  <div className="text-left">
                    <h2 className="text-sm font-bold tracking-tight">Mumi - Asistente Virtual</h2>
                    <span className="text-[10px] text-slate-400 font-medium">Soporte Inteligente Activo</span>
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => setIsOpen(false)}
                  className="text-slate-400 hover:text-white hover:bg-slate-800 h-8 w-8"
                >
                  <X className="w-5 h-5" />
                </Button>
              </header>

              {/* Chat Viewport */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
                {messages.map((m) => (
                  <div
                    key={m.id}
                    className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} items-start gap-2.5 animate-in fade-in slide-in-from-bottom-2 duration-200`}
                  >
                    {m.role === 'assistant' && (
                      <div className="p-1 bg-white border border-slate-200 rounded text-slate-500 shrink-0 mt-1 shadow-sm">
                        <Bot className="w-3.5 h-3.5 text-primary" />
                      </div>
                    )}
                    <div
                      className={`max-w-[82%] px-4 py-3 rounded-2xl text-left shadow-sm ${
                        m.role === 'user'
                          ? 'bg-primary text-white rounded-tr-none font-medium'
                          : 'bg-white text-slate-800 rounded-tl-none border border-slate-100'
                      }`}
                    >
                      {m.role === 'user' ? (
                        <p className="text-sm leading-relaxed">{m.text}</p>
                      ) : (
                        <div className="custom-markdown-body">
                          {formatText(m.text)}
                        </div>
                      )}
                      <span className={`text-[9px] block mt-1 ${m.role === 'user' ? 'text-primary-foreground/75' : 'text-slate-400'} text-right`}>
                        {m.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                ))}

                {/* Processing/Loading indicator */}
                {loading && (
                  <div className="flex justify-start items-center gap-2.5 animate-pulse">
                    <div className="p-1 bg-white border border-slate-200 rounded text-slate-500 shrink-0">
                      <Bot className="w-3.5 h-3.5 text-primary" />
                    </div>
                    <div className="bg-white border border-slate-100 rounded-2xl rounded-tl-none px-4 py-3 shadow-sm">
                      <div className="flex space-x-1 items-center h-4">
                        <div className="h-1.5 w-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <div className="h-1.5 w-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <div className="h-1.5 w-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Suggestions Panel */}
              {messages.length === 1 && !loading && (
                <div className="px-4 py-2 bg-slate-50 border-t border-slate-100/60 flex flex-wrap gap-1.5 justify-start">
                  {suggestionChips.map((chip, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSendMessage(chip.query)}
                      className="text-left text-[11px] bg-white text-slate-600 hover:text-primary border border-slate-200 hover:border-primary/30 px-2.5 py-1 rounded-full shadow-xs transition-all active:scale-95 flex items-center gap-1 shrink-0 font-medium"
                    >
                      <Sparkles className="w-2.5 h-2.5 text-yellow-500 shrink-0" />
                      {chip.label}
                    </button>
                  ))}
                </div>
              )}

              {/* Keyboard message inputs form */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage(input);
                }}
                className="p-3 bg-white border-t border-slate-100 flex gap-2 items-center"
              >
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Envía una pregunta a Mumi..."
                  className="flex-1 rounded-full border-slate-200 text-sm focus-visible:ring-primary/20 h-9 shrink-0 pr-2"
                  disabled={loading}
                />
                <Button
                  type="submit"
                  size="icon"
                  className="rounded-full bg-primary text-white h-9 w-9 shrink-0 shadow-sm"
                  disabled={loading || !input.trim()}
                >
                  <ArrowUp className="w-4 h-4" />
                </Button>
              </form>
            </Card>
          </aside>
        )}
      </AnimatePresence>
    </>
  );
}
