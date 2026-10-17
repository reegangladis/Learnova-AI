import React, { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Sparkles,
  Send,
  RotateCcw,
  BookOpen,
  MessageSquare,
  ExternalLink,
  ChevronDown,
  Trash2,
  Plus,
  X,
  Compass,
  FileCheck,
  Globe,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { aiService } from "@/services/aiService";
import { AIChatResponse, AIMessage, AIConversation, SourceCitation } from "@/types/ai";

interface AITutorPanelProps {
  courseId: string;
  activeLessonId?: string | null;
  courseTitle: string;
  activeLessonTitle?: string | null;
  onNavigateLesson?: (lessonId: string) => void;
  onClose?: () => void;
}

interface LocalMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  grounded_in_sources?: boolean;
  citations?: SourceCitation[];
  follow_up_suggestions?: string[];
  created_at: string;
  isError?: boolean;
}

export const AITutorPanel: React.FC<AITutorPanelProps> = ({
  courseId,
  activeLessonId,
  courseTitle,
  activeLessonTitle,
  onNavigateLesson,
  onClose,
}) => {
  const queryClient = useQueryClient();
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<LocalMessage[]>([]);
  const [inputQuery, setInputQuery] = useState("");
  const [showHistoryDropdown, setShowHistoryDropdown] = useState(false);
  const [lastFailedQuery, setLastFailedQuery] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 1. Fetch conversations for this course
  const {
    data: conversations = [],
    isLoading: isHistoryLoading,
  } = useQuery<AIConversation[]>({
    queryKey: ["ai-conversations", courseId],
    queryFn: () => aiService.listConversations(courseId),
    enabled: !!courseId,
  });

  // 2. Fetch specific conversation history if one is selected
  const { data: conversationDetail } = useQuery<AIConversation>({
    queryKey: ["ai-conversation", selectedConversationId],
    queryFn: () => aiService.getConversation(selectedConversationId!),
    enabled: !!selectedConversationId,
  });

  // Purely derived history messages without cascading setState in an effect
  const historyMessages = React.useMemo<LocalMessage[]>(() => {
    if (!conversationDetail?.messages) return [];
    return conversationDetail.messages.map((m: AIMessage) => ({
      id: m.id,
      role: m.role as "user" | "assistant",
      content: m.content,
      grounded_in_sources: m.grounded_in_sources,
      citations: m.citations,
      follow_up_suggestions: m.follow_up_suggestions,
      created_at: m.created_at,
    }));
  }, [conversationDetail]);

  const activeMessages = messages.length > 0 ? messages : historyMessages;

  const msgCounterRef = useRef(0);

  // Scroll to bottom on message update
  useEffect(() => {
    if (typeof messagesEndRef.current?.scrollIntoView === "function") {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [activeMessages]);

  // 3. Chat mutation
  const chatMutation = useMutation({
    mutationFn: async (question: string) => {
      return aiService.chat({
        message: question,
        course_id: courseId,
        lesson_id: activeLessonId || undefined,
        conversation_id: selectedConversationId || undefined,
      });
    },
    onSuccess: (data: AIChatResponse) => {
      setSelectedConversationId(data.conversation_id);
      setLastFailedQuery(null);
      msgCounterRef.current += 1;
      const assistantMsg: LocalMessage = {
        id: data.message_id || `asst-${msgCounterRef.current}`,
        role: "assistant",
        content: data.content,
        grounded_in_sources: data.grounded_in_sources,
        citations: data.citations,
        follow_up_suggestions: data.follow_up_suggestions,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
      queryClient.invalidateQueries({ queryKey: ["ai-conversations", courseId] });
    },
    onError: (_err, question) => {
      setLastFailedQuery(question);
      msgCounterRef.current += 1;
      const errorMsg: LocalMessage = {
        id: `err-${msgCounterRef.current}`,
        role: "assistant",
        content:
          "I ran into an issue connecting to the AI learning service. Please check your network or try again.",
        created_at: new Date().toISOString(),
        isError: true,
      };
      setMessages((prev) => [...prev, errorMsg]);
    },
  });

  // Send message
  const handleSendMessage = (textToSend?: string) => {
    const query = (textToSend || inputQuery).trim();
    if (!query || chatMutation.isPending) return;

    msgCounterRef.current += 1;
    // Add user message to UI immediately
    const userMsg: LocalMessage = {
      id: `user-${msgCounterRef.current}`,
      role: "user",
      content: query,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInputQuery("");
    chatMutation.mutate(query);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleStartNewConversation = () => {
    setSelectedConversationId(null);
    setMessages([]);
    setLastFailedQuery(null);
    setShowHistoryDropdown(false);
  };

  const handleDeleteConversation = async (convId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await aiService.deleteConversation(convId);
      if (selectedConversationId === convId) {
        handleStartNewConversation();
      }
      queryClient.invalidateQueries({ queryKey: ["ai-conversations", courseId] });
    } catch (err) {
      console.error("Failed to delete conversation:", err);
    }
  };

  // Quick prompt suggestions
  const starterPrompts = [
    { label: "💡 Explain this lesson in simpler terms", prompt: "Can you explain the main concepts in this lesson in simpler, intuitive terms?" },
    { label: "📝 Provide a step-by-step example", prompt: "Can you provide a concrete step-by-step example illustrating the concepts in this lesson?" },
    { label: "📌 Summarize key takeaways", prompt: "Please summarize the key takeaways and core formulas or rules from this material." },
    { label: "❓ Check my understanding", prompt: "Can you ask me two quick quiz questions to test my understanding of this lesson?" },
  ];

  return (
    <div
      className="flex flex-col h-full bg-card border border-border rounded-xl shadow-lg overflow-hidden"
      data-testid="ai-tutor-panel"
      role="region"
      aria-label="AI Tutor Assistant"
    >
      {/* 1. Header */}
      <div className="bg-muted/50 border-b border-border px-4 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20">
            <Sparkles className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="font-semibold text-sm text-foreground truncate">AI Tutor</h2>
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                Course-Aware RAG
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground truncate">
              {activeLessonTitle ? `Lesson: ${activeLessonTitle}` : courseTitle}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {/* History dropdown trigger */}
          <div className="relative">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowHistoryDropdown(!showHistoryDropdown)}
              className="h-8 px-2 text-xs gap-1 text-muted-foreground hover:text-foreground"
              title="Conversation History"
              data-testid="toggle-history-btn"
            >
              <MessageSquare className="h-3.5 w-3.5" />
              <ChevronDown className="h-3 w-3" />
            </Button>

            {showHistoryDropdown && (
              <div
                className="absolute right-0 mt-1 w-64 bg-popover border border-border rounded-lg shadow-xl z-50 p-2 space-y-1"
                data-testid="history-dropdown"
              >
                <div className="flex items-center justify-between pb-1 px-1 border-b border-border">
                  <span className="text-xs font-semibold text-foreground">Conversations</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-1.5 text-[11px] gap-1 text-primary hover:text-primary"
                    onClick={handleStartNewConversation}
                  >
                    <Plus className="h-3 w-3" /> New
                  </Button>
                </div>
                <div className="max-h-56 overflow-y-auto space-y-0.5">
                  {isHistoryLoading ? (
                    <div className="p-3 text-center text-xs text-muted-foreground">Loading chats...</div>
                  ) : conversations.length === 0 ? (
                    <div className="p-3 text-center text-xs text-muted-foreground italic">
                      No previous chats yet
                    </div>
                  ) : (
                    conversations.map((c) => (
                      <div
                        key={c.id}
                        onClick={() => {
                          setSelectedConversationId(c.id);
                          setShowHistoryDropdown(false);
                        }}
                        className={`group flex items-center justify-between p-2 rounded-md text-xs cursor-pointer transition-colors ${
                          selectedConversationId === c.id
                            ? "bg-primary/10 text-primary font-medium"
                            : "hover:bg-muted text-foreground"
                        }`}
                        data-testid={`conversation-item-${c.id}`}
                      >
                        <span className="truncate pr-2">{c.title || "Study Session"}</span>
                        <button
                          type="button"
                          onClick={(e) => handleDeleteConversation(c.id, e)}
                          className="opacity-0 group-hover:opacity-100 hover:text-destructive p-1 rounded transition-opacity"
                          title="Delete chat"
                          data-testid={`delete-conv-${c.id}`}
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* New Chat Button */}
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
            onClick={handleStartNewConversation}
            title="Start new conversation"
            data-testid="new-chat-btn"
          >
            <Plus className="h-4 w-4" />
          </Button>

          {/* Close Panel Button */}
          {onClose && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
              onClick={onClose}
              title="Close Tutor"
              data-testid="close-tutor-btn"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* 2. Message Thread */}
      <div
        className="flex-1 overflow-y-auto p-4 space-y-4"
        tabIndex={0}
        aria-label="Conversation Messages"
      >
        {activeMessages.length === 0 ? (
          /* Empty / Welcome State */
          <div className="text-center py-6 px-2 space-y-4" data-testid="tutor-welcome-view">
            <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <Compass className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h3 className="font-semibold text-sm text-foreground">
                Ask me anything about your course!
              </h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                I search directly through your course materials and lessons to give you grounded,
                pedagogical explanations and citations.
              </p>
            </div>

            <div className="pt-2 grid grid-cols-1 gap-2 text-left">
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider px-1">
                Suggested Prompts
              </p>
              {starterPrompts.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(item.prompt)}
                  className="p-2.5 rounded-lg border border-border hover:border-primary/50 hover:bg-muted/50 text-left text-xs text-foreground transition-all flex items-center justify-between group"
                  data-testid={`starter-prompt-${idx}`}
                >
                  <span>{item.label}</span>
                  <Send className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              ))}
            </div>
          </div>
        ) : (
          activeMessages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col space-y-1.5 ${
                msg.role === "user" ? "items-end" : "items-start"
              }`}
              data-testid={`chat-message-${msg.role}`}
            >
              {/* Message Bubble */}
              <div
                className={`p-3 rounded-xl text-xs max-w-[90%] whitespace-pre-wrap leading-relaxed ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground rounded-br-none shadow-xs"
                    : msg.isError
                    ? "bg-destructive/10 border border-destructive/20 text-destructive rounded-bl-none"
                    : "bg-muted/70 text-foreground border border-border/60 rounded-bl-none"
                }`}
              >
                {msg.content}
              </div>

              {/* Grounded Status & Citations for Assistant */}
              {msg.role === "assistant" && !msg.isError && (
                <div className="space-y-1.5 max-w-[95%] pt-0.5">
                  {/* Grounded vs General Badge */}
                  <div className="flex items-center gap-1.5 text-[11px]">
                    {msg.grounded_in_sources ? (
                      <span
                        className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium"
                        data-testid="grounded-badge"
                      >
                        <FileCheck className="h-3 w-3" />
                        Grounded in Course Material ({msg.citations?.length || 0} citations)
                      </span>
                    ) : (
                      <span
                        className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 font-medium"
                        data-testid="ungrounded-badge"
                      >
                        <Globe className="h-3 w-3" />
                        General Pedagogical Explanation
                      </span>
                    )}
                  </div>

                  {/* Citations List */}
                  {msg.citations && msg.citations.length > 0 && (
                    <div
                      className="flex flex-wrap gap-1.5 pt-1"
                      data-testid="citations-container"
                    >
                      {msg.citations.map((cite, cIdx) => (
                        <button
                          key={cIdx}
                          onClick={() => {
                            if (cite.lesson_id && onNavigateLesson) {
                              onNavigateLesson(cite.lesson_id);
                            }
                          }}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-background border border-border hover:border-primary/50 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors group cursor-pointer"
                          title={cite.snippet || `Go to lesson: ${cite.lesson_title || "Lesson"}`}
                          data-testid={`citation-chip-${cIdx}`}
                        >
                          <BookOpen className="h-2.5 w-2.5 text-primary" />
                          <span className="font-medium text-foreground">
                            {cite.lesson_title || "Course Lesson"}
                          </span>
                          {cite.similarity_score !== undefined && (
                            <span className="opacity-60 text-[9px]">
                              ({Math.round((cite.similarity_score || 0) * 100)}%)
                            </span>
                          )}
                          <ExternalLink className="h-2.5 w-2.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Follow-up suggestions */}
                  {msg.follow_up_suggestions && msg.follow_up_suggestions.length > 0 && (
                    <div
                      className="pt-2 space-y-1"
                      data-testid="follow-up-suggestions-container"
                    >
                      <p className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider">
                        Suggested Follow-ups
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {msg.follow_up_suggestions.map((suggestion, sIdx) => (
                          <button
                            key={sIdx}
                            onClick={() => handleSendMessage(suggestion)}
                            className="text-left text-[11px] px-2.5 py-1 rounded-lg border border-border bg-card hover:bg-muted hover:border-primary/40 text-foreground transition-all"
                            data-testid={`followup-chip-${sIdx}`}
                          >
                            {suggestion}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Error retry button */}
              {msg.isError && lastFailedQuery && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleSendMessage(lastFailedQuery)}
                  className="h-7 text-xs gap-1.5 text-destructive hover:text-destructive border-destructive/30"
                  data-testid="retry-query-btn"
                >
                  <RotateCcw className="h-3 w-3" /> Retry Question
                </Button>
              )}
            </div>
          ))
        )}

        {/* Loading Indicator */}
        {chatMutation.isPending && (
          <div
            className="flex items-start gap-2 text-xs text-muted-foreground p-3 rounded-xl bg-muted/40 border border-border/50 max-w-[80%]"
            data-testid="ai-tutor-loading"
          >
            <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />
            <div className="space-y-0.5">
              <p className="font-medium text-foreground">AI Tutor is thinking...</p>
              <p className="text-[11px]">Searching authorized course materials & formulating response</p>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 3. Input Footer */}
      <div className="p-3 bg-muted/30 border-t border-border space-y-2">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center gap-2"
        >
          <div className="relative flex-1">
            <textarea
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                activeLessonTitle
                  ? `Ask about "${activeLessonTitle}"...`
                  : "Ask a question about this course..."
              }
              rows={1}
              className="w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-1 focus:ring-ring disabled:opacity-50"
              disabled={chatMutation.isPending}
              data-testid="ai-tutor-input"
              aria-label="Ask your AI Tutor a question"
            />
          </div>

          <Button
            type="submit"
            size="sm"
            disabled={!inputQuery.trim() || chatMutation.isPending}
            className="h-8 px-3 gap-1 shrink-0"
            data-testid="send-question-btn"
          >
            <Send className="h-3.5 w-3.5" />
            <span className="hidden sm:inline text-xs">Ask</span>
          </Button>
        </form>

        <div className="flex items-center justify-between text-[10px] text-muted-foreground px-1">
          <span className="flex items-center gap-1">
            <BookOpen className="h-3 w-3" />
            Context: {activeLessonTitle ? "Current Lesson & Course" : "Course-Wide"}
          </span>
          <span>Shift+Enter for newline</span>
        </div>
      </div>
    </div>
  );
};
