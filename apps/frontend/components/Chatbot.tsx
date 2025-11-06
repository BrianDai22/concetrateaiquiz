'use client'

import React, { useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'

interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

export const Chatbot: React.FC = () => {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const sendMessage = async () => {
    if (!input.trim() || loading) return

    const userMessage: Message = {
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    }

    // Add user message to chat
    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/v0/chatbot/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Send cookies for auth
        body: JSON.stringify({ message: userMessage.content }),
      })

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Please log in to use the chatbot')
        }
        throw new Error('Failed to get response from chatbot')
      }

      const data = await response.json()

      const assistantMessage: Message = {
        role: 'assistant',
        content: data.response,
        timestamp: new Date(data.timestamp),
      }

      setMessages((prev) => [...prev, assistantMessage])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <>
      {/* Floating Chat Button */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 bg-primary hover:bg-primary-400 text-neutral-700 rounded-[2px] px-[22px] py-[16.5px] font-mono font-normal uppercase transition-colors shadow-lg"
        aria-label="Open chat"
      >
        Chat
      </button>

      {/* Chat Dialog */}
      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" />
          <Dialog.Content
            className="
              fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
              bg-white
              rounded-[2px]
              w-full max-w-md
              h-[600px]
              shadow-xl
              border border-neutral-200
              flex flex-col
              z-50
            "
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-neutral-200">
              <Dialog.Title className="text-2xl font-mono font-normal text-neutral-700 uppercase">
                Platform Assistant
              </Dialog.Title>
              <Dialog.Close className="text-neutral-400 hover:text-neutral-700 transition-colors">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 15 15"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M11.7816 4.03157C12.0062 3.80702 12.0062 3.44295 11.7816 3.2184C11.5571 2.99385 11.193 2.99385 10.9685 3.2184L7.50005 6.68682L4.03164 3.2184C3.80708 2.99385 3.44301 2.99385 3.21846 3.2184C2.99391 3.44295 2.99391 3.80702 3.21846 4.03157L6.68688 7.49999L3.21846 10.9684C2.99391 11.193 2.99391 11.557 3.21846 11.7816C3.44301 12.0061 3.80708 12.0061 4.03164 11.7816L7.50005 8.31316L10.9685 11.7816C11.193 12.0061 11.5571 12.0061 11.7816 11.7816C12.0062 11.557 12.0062 11.193 11.7816 10.9684L8.31322 7.49999L11.7816 4.03157Z"
                    fill="currentColor"
                    fillRule="evenodd"
                    clipRule="evenodd"
                  ></path>
                </svg>
              </Dialog.Close>
            </div>

            {/* Messages Container */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.length === 0 && (
                <div className="text-center text-neutral-400 font-mono text-sm mt-8">
                  <p className="mb-2">👋 Hi! I'm your platform assistant.</p>
                  <p>Ask me anything about using the school portal!</p>
                </div>
              )}

              {messages.map((msg, index) => (
                <div
                  key={index}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`
                      max-w-[80%] rounded-[2px] px-4 py-3 font-mono text-sm
                      ${
                        msg.role === 'user'
                          ? 'bg-primary text-neutral-700'
                          : 'bg-neutral-100 text-neutral-700'
                      }
                    `}
                  >
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                    <p className="text-xs opacity-60 mt-1">
                      {msg.timestamp.toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex justify-start">
                  <div className="bg-neutral-100 rounded-[2px] px-4 py-3 font-mono text-sm text-neutral-700">
                    <p>Thinking...</p>
                  </div>
                </div>
              )}

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-[2px] px-4 py-3 font-mono text-sm text-red-700">
                  {error}
                </div>
              )}
            </div>

            {/* Input Area */}
            <div className="p-6 border-t border-neutral-200">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask a question..."
                  disabled={loading}
                  className="
                    flex-1
                    px-4 py-3
                    bg-white
                    border border-neutral-300
                    rounded-[2px]
                    text-base font-mono text-neutral-700
                    placeholder:text-neutral-400
                    focus:outline-none
                    focus:border-primary
                    focus:ring-2
                    focus:ring-primary/20
                    disabled:bg-neutral-50
                    disabled:text-neutral-400
                    transition-all
                  "
                />
                <button
                  onClick={sendMessage}
                  disabled={!input.trim() || loading}
                  className="
                    bg-primary hover:bg-primary-400 text-neutral-700
                    px-[18px] py-[11.5px]
                    rounded-[2px]
                    text-base font-mono font-normal uppercase
                    transition-colors
                    disabled:bg-neutral-50 disabled:text-neutral-400
                  "
                >
                  Send
                </button>
              </div>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  )
}

export default Chatbot
