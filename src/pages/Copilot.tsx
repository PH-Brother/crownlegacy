import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Bot, Send, Loader2, Sparkles, MessageCircle } from "lucide-react";
import ReactMarkdown from "react-markdown";

interface ChatMsg {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

const SUGGESTED_QUESTIONS = [
  "Quanto gastei em transporte este mês?",
  "Qual é minha categoria de maior gasto?",
  "Como posso economizar mais?",
  "Estou gastando demais em comida?",
];

export default function CopilotPage() {
  const { user, session } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const PAGE_SIZE = 20;

  const loadMessages = useCallback(async (before?: string) => {
    if (!user?.id) return;
    setLoading(true);
    try {
      let query = supabase
        .from("chat_messages")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(PAGE_SIZE);

      if (before) {
        query = query.lt("created_at", before);
      }

      const { data, error } = await query;
      if (error) throw error;

      const sorted = (data || []).reverse() as ChatMsg[];
      if (before) {
        setMessages((prev) => [...sorted, ...prev]);
      } else {
        setMessages(sorted);
      }
      setHasMore((data || []).length === PAGE_SIZE);
    } catch {
      toast({ title: "Erro ao carregar mensagens", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [user?.id, toast]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleScroll = () => {
    const el = scrollContainerRef.current;
    if (!el || !hasMore || loading) return;
    if (el.scrollTop < 50 && messages.length > 0) {
      loadMessages(messages[0].created_at);
    }
  };

  const sendMessage = async (text: string) => {
    if (!text.trim() || !user?.id || !session?.access_token || sending) return;
    const sanitized = text.trim().slice(0, 500);
    setInput("");
    setSending(true);

    // Optimistic user message
    const tempId = crypto.randomUUID();
    const userMsg: ChatMsg = { id: tempId, role: "user", content: sanitized, created_at: new Date().toISOString() };
    setMessages((prev) => [...prev, userMsg]);

    try {
      const { data, error } = await supabase.functions.invoke("copilot-chat", {
        body: { message: sanitized },
      });
      if (error) throw error;
      if (data?.success) {
        const assistantMsg: ChatMsg = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: data.response,
          created_at: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, assistantMsg]);
      } else {
        throw new Error(data?.error || "Erro ao processar");
      }
    } catch (err) {
      toast({ title: "Erro ao enviar", description: err instanceof Error ? err.message : "Tente novamente", variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const showSuggestions = messages.length === 0 && !loading;

  return (
    <AppLayout>
      <div className="mx-auto max-w-[700px] h-[calc(100vh-80px)] sm:h-[calc(100vh-16px)] flex flex-col px-4 py-4">
        {/* Header */}
        <div className="flex items-center gap-2 mb-3">
          <Bot className="h-5 w-5 text-accent" />
          <h1 className="text-lg font-display font-bold text-foreground">Copilot Financeiro</h1>
        </div>

        {/* Messages */}
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto space-y-3 pr-1 scrollbar-thin"
        >
          {loading && messages.length === 0 ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
            </div>
          ) : showSuggestions ? (
            <div className="flex flex-col items-center justify-center h-full gap-4">
              <MessageCircle className="h-12 w-12 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">Olá! Faça uma pergunta sobre suas finanças 👋</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-md">
                {SUGGESTED_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    onClick={() => sendMessage(q)}
                    className="text-left text-sm p-3 rounded-xl bg-muted/50 border border-border hover:border-accent/40 hover:bg-muted transition-colors"
                  >
                    <Sparkles className="h-3 w-3 text-accent inline mr-1.5" />
                    {q}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {hasMore && messages.length > 0 && (
                <div className="text-center py-2">
                  <Button variant="ghost" size="sm" onClick={() => loadMessages(messages[0].created_at)} className="text-xs text-muted-foreground">
                    Carregar anteriores
                  </Button>
                </div>
              )}
              {messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground rounded-br-md"
                        : "bg-muted/60 text-foreground rounded-bl-md"
                    }`}
                  >
                    {msg.role === "assistant" ? (
                      <div className="prose prose-sm prose-invert max-w-none [&>p]:mb-2 [&>p:last-child]:mb-0">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                    ) : (
                      msg.content
                    )}
                    <p className="text-[10px] mt-1 opacity-50">
                      {new Date(msg.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
              ))}
              {sending && (
                <div className="flex justify-start">
                  <div className="bg-muted/60 rounded-2xl rounded-bl-md px-4 py-3 flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-accent" />
                    <span className="text-sm text-muted-foreground">Processando...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Input */}
        <div className="mt-3 flex gap-2 items-end">
          <div className="flex-1 relative">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value.slice(0, 500))}
              onKeyDown={handleKeyDown}
              placeholder="Faça uma pergunta sobre suas finanças..."
              className="resize-none min-h-[48px] max-h-[120px] pr-12 rounded-xl bg-muted/50 border-border"
              rows={1}
              disabled={sending}
            />
            <span className="absolute right-3 bottom-2 text-[10px] text-muted-foreground">{input.length}/500</span>
          </div>
          <Button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || sending}
            className="btn-premium h-12 w-12 p-0 rounded-xl shrink-0"
          >
            {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
          </Button>
        </div>
      </div>
    </AppLayout>
  );
}
