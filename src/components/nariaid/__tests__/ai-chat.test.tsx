// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import AIChat from '@/components/nariaid/ai-chat'
import { useAppStore } from '@/store/app-store'

const preference = {
  cloudAiEnabled: false,
  consentVersion: '',
  consentedAt: null,
  decisionAt: null,
  consentRequired: true,
  currentConsentVersion: '2026-08-health-rag-v1',
  cloudAvailable: true,
}

const privatePreference = {
  ...preference,
  consentVersion: preference.currentConsentVersion,
  decisionAt: '2026-08-24T12:00:00.000Z',
  consentRequired: false,
}

describe('Ask Nari consent flow', () => {
  beforeEach(() => {
    const storage = new Map<string, string>()
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: {
        clear: () => storage.clear(),
        getItem: (key: string) => storage.get(key) ?? null,
        key: (index: number) => [...storage.keys()][index] ?? null,
        removeItem: (key: string) => storage.delete(key),
        setItem: (key: string, value: string) => storage.set(key, value),
        get length() { return storage.size },
      },
    })
    useAppStore.setState({ aiChatOpen: true, activeTab: 'dashboard', activeDashboardSection: 'today' })
    vi.stubGlobal('fetch', vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      if (init?.method === 'PUT') {
        return new Response(JSON.stringify({ ...preference, consentRequired: false, decisionAt: new Date().toISOString() }), { status: 200 })
      }
      return new Response(JSON.stringify({ conversation: null, conversations: [], messages: [], preference }), { status: 200 })
    }))
  })

  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it('blocks message entry until a privacy choice is saved', async () => {
    render(<AIChat />)
    expect(await screen.findByText('Choose how Ask Nari handles your records')).toBeTruthy()
    expect((screen.getByPlaceholderText('Choose a privacy option first') as HTMLInputElement).disabled).toBe(true)
  })

  it('allows the private fallback without cloud consent', async () => {
    render(<AIChat />)
    fireEvent.click(await screen.findByRole('button', { name: 'Keep it private' }))
    await waitFor(() => expect((screen.getByPlaceholderText(/Ask about home \/ today/i) as HTMLInputElement).disabled).toBe(false))
    const calls = vi.mocked(fetch).mock.calls
    expect(calls.some(([, init]) => init?.method === 'PUT' && String(init.body).includes('"cloudAiEnabled":false'))).toBe(true)
  })

  it('loads persisted history with citation and fallback labels', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({
      conversation: { id: 'conversation-1', title: 'Sleep check' },
      conversations: [],
      messages: [{
        id: 'assistant-1',
        role: 'assistant',
        content: 'Your recent sleep entry was lower than usual.',
        mode: 'local-risk-assistant',
        citations: [{ label: 'Health log, Aug 18', sourceType: 'health-log', date: '2026-08-18T12:00:00.000Z' }],
      }],
      preference: privatePreference,
    }), { status: 200 })))
    render(<AIChat />)
    expect(await screen.findByText('Your recent sleep entry was lower than usual.')).toBeTruthy()
    expect(screen.getByText('Health log, Aug 18')).toBeTruthy()
    expect(screen.getByText('Private fallback')).toBeTruthy()
  })

  it('keeps a failed message and retries it successfully', async () => {
    let postCount = 0
    vi.stubGlobal('fetch', vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      if (init?.method === 'POST') {
        postCount++
        if (postCount === 1) return new Response(JSON.stringify({ error: 'Temporary failure' }), { status: 503 })
        return new Response(JSON.stringify({
          conversationId: 'conversation-1',
          conversationTitle: 'Sleep check',
          message: { id: 'assistant-2', role: 'assistant', content: 'The retry worked.', mode: 'local-risk-assistant', citations: [] },
        }), { status: 200 })
      }
      return new Response(JSON.stringify({ conversation: null, conversations: [], messages: [], preference: privatePreference }), { status: 200 })
    }))
    render(<AIChat />)
    const input = await screen.findByPlaceholderText(/Ask about home \/ today/i)
    fireEvent.change(input, { target: { value: 'Check my sleep' } })
    fireEvent.click(screen.getByRole('button', { name: 'Send message' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Retry' }))
    expect(await screen.findByText('The retry worked.')).toBeTruthy()
    expect(postCount).toBe(2)
  })

  it('deletes the current conversation after confirmation', async () => {
    vi.stubGlobal('confirm', vi.fn(() => true))
    vi.stubGlobal('fetch', vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      if (init?.method === 'DELETE') return new Response(JSON.stringify({ success: true }), { status: 200 })
      return new Response(JSON.stringify({
        conversation: { id: 'conversation-1', title: 'Sleep check' },
        conversations: [],
        messages: [{ id: 'assistant-1', role: 'assistant', content: 'Saved answer', mode: 'local-risk-assistant' }],
        preference: privatePreference,
      }), { status: 200 })
    }))
    render(<AIChat />)
    expect(await screen.findByText('Saved answer')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Delete conversation' }))
    await waitFor(() => expect(vi.mocked(fetch).mock.calls.some(([url, init]) => String(url).includes('conversationId=conversation-1') && init?.method === 'DELETE')).toBe(true))
    expect(await screen.findByText(/Hi, I am Nari/)).toBeTruthy()
  })
})
