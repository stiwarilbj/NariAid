'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Cloud,
  Database,
  Loader2,
  MessageCircle,
  Plus,
  RotateCcw,
  Send,
  ShieldCheck,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react'
import { useAppStore, type TabId } from '@/store/app-store'

interface Citation {
  label: string
  sourceType: string
  date: string | null
}

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  provider?: string
  model?: string
  mode?: string
  citations?: Citation[]
  status?: string
  createdAt?: string
  retryText?: string
}

interface ChatPreference {
  cloudAiEnabled: boolean
  consentVersion: string
  consentedAt: string | null
  decisionAt: string | null
  consentRequired: boolean
  currentConsentVersion: string
  cloudAvailable: boolean
}

interface PageContext {
  activeTab: TabId
  activeSection?: string
  pageTitle: string
  pagePurpose: string
}

const tabContext: Record<TabId, { title: string; purpose: string; suggestions: string[] }> = {
  dashboard: {
    title: 'Home',
    purpose: 'daily check-in, cycle prediction, health guidance, reminders, and top actions',
    suggestions: ['Explain today', 'Am I on track?', 'Should I call a doctor?'],
  },
  calendar: {
    title: 'Cycle',
    purpose: 'cycle calendar, predicted period timing, fertile window, and ovulation timing',
    suggestions: ['Explain my cycle window', 'When is my next period?', 'What should I watch?'],
  },
  'health-log': {
    title: 'Track',
    purpose: 'logging symptoms, pain, mood, sleep, stress, notes, and daily health details',
    suggestions: ['What should I log?', 'Is this symptom important?', 'Summarize my latest entry'],
  },
  reminders: {
    title: 'Reminders',
    purpose: 'medication, care, hydration, and wellness reminders',
    suggestions: ['Suggest reminders', 'What should I schedule?', 'Medication tracking tips'],
  },
  progress: {
    title: 'Trends',
    purpose: 'patterns in mood, energy, sleep, symptoms, and health score over time',
    suggestions: ['Find a pattern', 'Compare my recent logs', 'What changed this week?'],
  },
  wellness: {
    title: 'Wellness',
    purpose: 'self-care, stress support, mindfulness, and wellness routines',
    suggestions: ['Calm routine', 'Stress support', 'Cycle-friendly self-care'],
  },
  profile: {
    title: 'Profile',
    purpose: 'personal cycle settings, life stage, baseline details, and app preferences',
    suggestions: ['What profile data matters?', 'Improve predictions', 'Check my baseline'],
  },
  reports: {
    title: 'Reports',
    purpose: 'shareable summaries and longer-term health reports',
    suggestions: ['What should I share?', 'Summarize for my doctor', 'Create visit notes'],
  },
  activity: {
    title: 'Activity',
    purpose: 'recent app activity and changes in logged health data',
    suggestions: ['What changed?', 'Review activity', 'Spot missed logs'],
  },
  settings: {
    title: 'Settings',
    purpose: 'app controls, appearance, privacy settings, and preferences',
    suggestions: ['Explain cloud AI privacy', 'What gets deleted?', 'Review my settings'],
  },
}

const sectionLabels: Record<string, string> = { today: 'Today', insights: 'Trends', tools: 'Trackers' }

function welcomeMessage(contextLabel: string): ChatMessage {
  return {
    id: 'welcome',
    role: 'assistant',
    content: `Hi, I am Nari. I can use the records connected to ${contextLabel} and show which entries supported my answer.`,
    mode: 'welcome',
  }
}

export default function AIChat() {
  const { aiChatOpen: isOpen, toggleAIChat, activeTab, activeDashboardSection } = useAppStore()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [preference, setPreference] = useState<ChatPreference | null>(null)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [conversationTitle, setConversationTitle] = useState('New conversation')
  const [consentSaving, setConsentSaving] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const hasLoadedRef = useRef(false)

  const pageContext = useMemo<PageContext>(() => {
    const base = tabContext[activeTab] ?? tabContext.dashboard
    return {
      activeTab,
      activeSection: activeTab === 'dashboard' ? sectionLabels[activeDashboardSection] : undefined,
      pageTitle: base.title,
      pagePurpose: base.purpose,
    }
  }, [activeTab, activeDashboardSection])

  const contextLabel = pageContext.activeSection ? `${pageContext.pageTitle} / ${pageContext.activeSection}` : pageContext.pageTitle
  const suggestions = tabContext[activeTab]?.suggestions ?? tabContext.dashboard.suggestions

  const loadChat = useCallback(async (requestedConversationId?: string) => {
    setIsLoading(true)
    try {
      const query = requestedConversationId ? `?conversationId=${encodeURIComponent(requestedConversationId)}` : ''
      const response = await fetch(`/api/ai-chat${query}`, { cache: 'no-store' })
      if (!response.ok) throw new Error('Chat load failed')
      const data = await response.json()
      setPreference(data.preference)
      setConversationId(data.conversation?.id ?? null)
      setConversationTitle(data.conversation?.title ?? 'New conversation')
      setMessages(data.messages?.length ? data.messages : [welcomeMessage(contextLabel)])
    } catch {
      setMessages([welcomeMessage(contextLabel), {
        id: 'load-error',
        role: 'assistant',
        content: 'I could not load earlier messages, but you can still start a new conversation.',
        status: 'error',
      }])
    } finally {
      setIsLoading(false)
    }
  }, [contextLabel])

  useEffect(() => {
    if (isOpen && !hasLoadedRef.current) {
      hasLoadedRef.current = true
      loadChat()
    }
  }, [isOpen, loadChat])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  useEffect(() => {
    if (isOpen && !isLoading && !preference?.consentRequired) {
      const timer = setTimeout(() => inputRef.current?.focus(), 300)
      return () => clearTimeout(timer)
    }
  }, [isOpen, isLoading, preference?.consentRequired])

  const saveConsent = useCallback(async (cloudAiEnabled: boolean) => {
    if (!preference?.currentConsentVersion) return
    setConsentSaving(true)
    try {
      const response = await fetch('/api/ai-preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cloudAiEnabled, consentVersion: preference.currentConsentVersion }),
      })
      if (!response.ok) throw new Error('Consent save failed')
      const updated = await response.json()
      setPreference((current) => current ? { ...current, ...updated, cloudAvailable: current.cloudAvailable } : current)
    } catch {
      setMessages((current) => [...current, {
        id: `consent-error-${Date.now()}`,
        role: 'assistant',
        content: 'I could not save that privacy choice. Please try again.',
        status: 'error',
      }])
    } finally {
      setConsentSaving(false)
    }
  }, [preference])

  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim()
    if (!trimmed || isTyping || preference?.consentRequired) return
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: trimmed,
      status: 'sending',
    }
    setMessages((current) => [...current, userMessage])
    setInputValue('')
    setIsTyping(true)

    try {
      const response = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: trimmed, conversationId: conversationId ?? undefined, pageContext }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || 'Message failed')
      setConversationId(data.conversationId)
      setConversationTitle(data.conversationTitle || 'Conversation')
      setMessages((current) => [
        ...current.map((message) => message.id === userMessage.id ? { ...message, status: 'completed' } : message),
        data.message,
      ])
    } catch {
      setMessages((current) => [
        ...current.map((message) => message.id === userMessage.id ? { ...message, status: 'error' } : message),
        {
          id: `error-${Date.now()}`,
          role: 'assistant',
          content: 'I had trouble connecting. Your message is still here, and you can retry it.',
          status: 'error',
          retryText: trimmed,
        },
      ])
    } finally {
      setIsTyping(false)
    }
  }, [conversationId, isTyping, pageContext, preference?.consentRequired])

  const startNewConversation = useCallback(() => {
    setConversationId(null)
    setConversationTitle('New conversation')
    setMessages([welcomeMessage(contextLabel)])
    setInputValue('')
  }, [contextLabel])

  const deleteConversation = useCallback(async () => {
    if (!conversationId || !window.confirm('Delete this conversation? This cannot be undone.')) return
    const response = await fetch(`/api/ai-chat?conversationId=${encodeURIComponent(conversationId)}`, { method: 'DELETE' })
    if (response.ok) {
      setConversationId(null)
      setConversationTitle('New conversation')
      setMessages([welcomeMessage(contextLabel)])
    }
  }, [conversationId, contextLabel])

  const handleSubmit = useCallback((event: React.FormEvent) => {
    event.preventDefault()
    sendMessage(inputValue)
  }, [inputValue, sendMessage])

  const onlyWelcome = messages.length === 1 && messages[0]?.id === 'welcome'

  return (
    <>
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            key="ask-nari-corner"
            initial={{ opacity: 0, y: 12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.96 }}
            type="button"
            onClick={toggleAIChat}
            className="fixed bottom-20 left-4 z-[55] inline-flex h-11 items-center gap-2 rounded-full border border-[#F9D0DA]/80 bg-white px-3 text-xs font-semibold text-[#8F5366] shadow-lg shadow-[#E8788A]/10 transition-colors hover:border-[#E8788A]/40 hover:text-[#E8788A] dark:border-[#4A2535] dark:bg-[#2A1520] dark:text-[#F9D0DA]"
            aria-label={`Ask Nari about ${contextLabel}`}
          >
            <MessageCircle className="h-4 w-4" />
            <span>Ask Nari</span>
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              key="chat-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[60] bg-black/20 backdrop-blur-sm"
              onClick={toggleAIChat}
            />

            <motion.div
              key="chat-panel"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="fixed inset-x-0 bottom-0 z-[70] flex max-h-[88vh] flex-col"
            >
              <div className="mx-auto flex max-h-[88vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border-t border-[#F9D0DA] bg-white shadow-2xl dark:border-[#4A2535] dark:bg-[#2A1520]">
                <div className="flex justify-center pb-1 pt-3"><div className="h-1 w-10 rounded-full bg-[#F9D0DA] dark:bg-[#4A2535]" /></div>

                <div className="flex items-center justify-between gap-3 border-b border-[#F9D0DA]/40 px-5 pb-3 dark:border-[#4A2535]/40">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[#E8788A] to-[#F9A8D4] shadow-sm shadow-[#E8788A]/20">
                      <Sparkles className="h-4 w-4 text-white" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-semibold text-[#4A1D2E] dark:text-[#F9D0DA]">{conversationTitle}</h3>
                      <p className="truncate text-[10px] text-[#9B6B7B] dark:text-[#A07888]">Context: {contextLabel}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button type="button" onClick={startNewConversation} className="rounded-lg p-1.5 text-[#9B6B7B] transition-colors hover:bg-[#FFF0F3] hover:text-[#E8788A] dark:hover:bg-[#3A2030]" aria-label="New conversation" title="New conversation">
                      <Plus className="h-4 w-4" />
                    </button>
                    <button type="button" onClick={deleteConversation} disabled={!conversationId} className="rounded-lg p-1.5 text-[#9B6B7B] transition-colors hover:bg-red-50 hover:text-red-500 disabled:opacity-30 dark:hover:bg-red-950/30" aria-label="Delete conversation" title="Delete conversation">
                      <Trash2 className="h-4 w-4" />
                    </button>
                    <button type="button" onClick={toggleAIChat} className="rounded-lg p-1.5 text-[#9B6B7B] transition-colors hover:bg-[#FFF0F3] dark:hover:bg-[#3A2030]" aria-label="Close chat">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="flex-1 space-y-3 overflow-y-auto bg-[#FFF5F7] px-4 py-4 dark:bg-[#1A0D12]">
                  {isLoading ? (
                    <div className="flex min-h-52 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-[#E8788A]" /></div>
                  ) : preference?.consentRequired ? (
                    <div className="rounded-2xl border border-[#F9D0DA]/70 bg-white p-5 shadow-sm dark:border-[#4A2535] dark:bg-[#2A1520]">
                      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-[#FFF0F3] dark:bg-[#3A2030]">
                        <ShieldCheck className="h-5 w-5 text-[#E8788A]" />
                      </div>
                      <h4 className="text-sm font-semibold text-[#4A1D2E] dark:text-[#F9D0DA]">Choose how Ask Nari handles your records</h4>
                      <p className="mt-2 text-xs leading-relaxed text-[#6B3A4A] dark:text-[#C9A0B0]">
                        Cloud AI sends your question and up to eight relevant, identifier-stripped record excerpts to Google. Private mode keeps those excerpts inside NariAid and uses the built-in safety assistant.
                      </p>
                      {!preference.cloudAvailable && (
                        <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-[11px] text-amber-700">A cloud API key is not configured yet, so NariAid will safely fall back even if you allow cloud AI.</p>
                      )}
                      <div className="mt-4 grid gap-2 sm:grid-cols-2">
                        <button type="button" disabled={consentSaving} onClick={() => saveConsent(true)} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#E8788A] px-3 text-xs font-semibold text-white disabled:opacity-50">
                          <Cloud className="h-4 w-4" /> Use cloud AI
                        </button>
                        <button type="button" disabled={consentSaving} onClick={() => saveConsent(false)} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-[#F9D0DA] bg-white px-3 text-xs font-semibold text-[#6B3A4A] disabled:opacity-50 dark:border-[#4A2535] dark:bg-[#2A1520] dark:text-[#F9D0DA]">
                          <ShieldCheck className="h-4 w-4" /> Keep it private
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {messages.map((message) => (
                        <motion.div key={message.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[88%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${message.role === 'user' ? 'rounded-br-md bg-gradient-to-br from-[#E8788A] to-[#F0869A] text-white' : 'rounded-bl-md border border-[#F9D0DA]/40 bg-white text-[#4A1D2E] shadow-sm dark:border-[#4A2535]/40 dark:bg-[#2A1520] dark:text-[#F9D0DA]'}`}>
                            {message.role === 'assistant' && (
                              <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
                                <Sparkles className="h-3 w-3 text-[#E8788A]" />
                                <span className="text-[10px] font-medium text-[#E8788A]">NariAid AI</span>
                                {message.mode === 'cloud-rag' ? (
                                  <span className="inline-flex items-center gap-1 text-[9px] text-[#9B6B7B] dark:text-[#A07888]"><Cloud className="h-2.5 w-2.5" />{message.model}</span>
                                ) : message.mode === 'local-risk-assistant' ? (
                                  <span className="inline-flex items-center gap-1 text-[9px] text-[#9B6B7B] dark:text-[#A07888]"><ShieldCheck className="h-2.5 w-2.5" />Private fallback</span>
                                ) : null}
                              </div>
                            )}
                            <p>{message.content}</p>
                            {message.citations && message.citations.length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-1.5 border-t border-[#F9D0DA]/30 pt-2 dark:border-[#4A2535]/40">
                                {message.citations.slice(0, 4).map((citation, index) => (
                                  <span key={`${citation.label}-${index}`} className="inline-flex items-center gap-1 rounded-full bg-[#FFF0F3] px-2 py-1 text-[9px] font-medium text-[#8F5366] dark:bg-[#3A2030] dark:text-[#F9D0DA]">
                                    <Database className="h-2.5 w-2.5" />{citation.label}
                                  </span>
                                ))}
                              </div>
                            )}
                            {message.retryText && (
                              <button type="button" onClick={() => sendMessage(message.retryText!)} className="mt-2 inline-flex items-center gap-1 text-[10px] font-semibold text-[#E8788A]">
                                <RotateCcw className="h-3 w-3" /> Retry
                              </button>
                            )}
                          </div>
                        </motion.div>
                      ))}

                      {isTyping && (
                        <div className="flex justify-start">
                          <div className="rounded-2xl rounded-bl-md border border-[#F9D0DA]/40 bg-white px-4 py-3 dark:border-[#4A2535]/40 dark:bg-[#2A1520]">
                            <div className="flex items-center gap-1.5"><Sparkles className="h-3 w-3 text-[#E8788A]" /><Loader2 className="h-4 w-4 animate-spin text-[#E8788A]" /></div>
                          </div>
                        </div>
                      )}

                      {onlyWelcome && !isTyping && (
                        <div className="flex flex-wrap justify-center gap-2 pt-1">
                          {suggestions.map((suggestion) => (
                            <button key={suggestion} type="button" onClick={() => sendMessage(suggestion)} className="rounded-full border border-[#F9D0DA]/60 bg-white px-3.5 py-1.5 text-xs font-medium text-[#4A1D2E] shadow-sm transition-all hover:border-[#E8788A]/40 hover:shadow-md dark:border-[#4A2535]/60 dark:bg-[#2A1520] dark:text-[#F9D0DA]">
                              {suggestion}
                            </button>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                <div className="border-t border-[#F9D0DA]/40 bg-white px-4 py-3 dark:border-[#4A2535]/40 dark:bg-[#2A1520]">
                  <form onSubmit={handleSubmit} className="flex items-center gap-2">
                    <input
                      ref={inputRef}
                      type="text"
                      maxLength={2000}
                      value={inputValue}
                      onChange={(event) => setInputValue(event.target.value)}
                      placeholder={preference?.consentRequired ? 'Choose a privacy option first' : `Ask about ${contextLabel.toLowerCase()}...`}
                      disabled={isTyping || isLoading || preference?.consentRequired}
                      className="h-10 flex-1 rounded-xl border border-[#F9D0DA]/60 bg-[#FFF5F7] px-4 text-sm text-[#4A1D2E] outline-none transition-all placeholder:text-[#9B6B7B]/60 focus:border-[#E8788A]/60 focus:ring-1 focus:ring-[#E8788A]/20 disabled:opacity-50 dark:border-[#4A2535]/60 dark:bg-[#1A0D12] dark:text-[#F9D0DA]"
                    />
                    <button type="submit" disabled={!inputValue.trim() || isTyping || isLoading || preference?.consentRequired} className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#E8788A] to-[#F9A8D4] shadow-sm shadow-[#E8788A]/20 disabled:opacity-40" aria-label="Send message">
                      {isTyping ? <Loader2 className="h-4 w-4 animate-spin text-white" /> : <Send className="h-4 w-4 text-white" />}
                    </button>
                  </form>
                  <p className="mt-1.5 text-center text-[9px] text-[#9B6B7B]/70 dark:text-[#A07888]/70">Informational only. NariAid does not diagnose or replace medical care.</p>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
