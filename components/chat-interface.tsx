'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Minimize2, X, MessageSquare, Settings, BarChart3, User, Plus, Send, FileText } from 'lucide-react'

interface Message {
  id: string
  type: 'user' | 'system'
  content: string
  timestamp: Date
}

interface ThreadNode {
  id: string
  label: string
  status: 'completed' | 'active' | 'pending'
  timestamp: Date
}

interface ChatThread {
  id: string
  nodes: ThreadNode[]
}

export function ChatInterface() {
  const [activeTab, setActiveTab] = useState<'chat' | 'trace'>('chat')
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'user',
      content: 'Build me a profit and loss table for a typical fast food restaurant',
      timestamp: new Date()
    }
  ])
  const [currentThread, setCurrentThread] = useState<ChatThread | null>(null)
  const [inputValue, setInputValue] = useState('')
  const [mode, setMode] = useState<'ask' | 'analyst'>('ask')
  const [isProcessing, setIsProcessing] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, currentThread])

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return

    const newMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: inputValue,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, newMessage])
    setInputValue('')
    setIsProcessing(true)

    // Create new thread
    const threadId = Date.now().toString()
    const initialThread: ChatThread = {
      id: threadId,
      nodes: [
        {
          id: '1',
          label: 'cf0 AI',
          status: 'completed',
          timestamp: new Date()
        },
        {
          id: '2',
          label: 'Thinking',
          status: 'active',
          timestamp: new Date()
        }
      ]
    }

    setCurrentThread(initialThread)

    // Simulate processing states
    setTimeout(() => {
      setCurrentThread(prev => prev ? {
        ...prev,
        nodes: [
          ...prev.nodes.map(node => 
            node.id === '2' ? { ...node, status: 'completed' as const } : node
          ),
          {
            id: '3',
            label: 'Revising Model',
            status: 'active' as const,
            timestamp: new Date()
          }
        ]
      } : null)
    }, 2000)

    setTimeout(() => {
      setCurrentThread(prev => prev ? {
        ...prev,
        nodes: [
          ...prev.nodes.map(node => 
            node.id === '3' ? { ...node, status: 'completed' as const } : node
          ),
          {
            id: '4',
            label: 'Finalizing Model',
            status: 'active' as const,
            timestamp: new Date()
          }
        ]
      } : null)
      
      // Add system messages
      setMessages(prev => [...prev, 
        {
          id: Date.now().toString() + '_1',
          type: 'system',
          content: 'I need to add the missing annual values for the operating expenses section. I\'ll add the formulas to calculate annual values based on the monthly figures in column C.',
          timestamp: new Date()
        }
      ])
    }, 4000)

    setTimeout(() => {
      setCurrentThread(prev => prev ? {
        ...prev,
        nodes: prev.nodes.map(node => 
          node.id === '4' ? { ...node, status: 'completed' as const } : node
        )
      } : null)
      
      setMessages(prev => [...prev,
        {
          id: Date.now().toString() + '_2',
          type: 'system',
          content: 'Let me make a few final adjustments to complete the green color scheme in our financial model. I\'ll enhance the title and add formatting to some key totals to make them stand out better.',
          timestamp: new Date()
        }
      ])
      
      setIsProcessing(false)
    }, 6000)
  }

  const ThreadVisualization = ({ thread }: { thread: ChatThread }) => (
    <div className="flex flex-col items-center py-4 px-2">
      {thread.nodes.map((node, index) => (
        <div key={node.id} className="flex flex-col items-center">
          <div className={`
            flex items-center justify-center w-8 h-8 rounded-full text-xs font-medium
            ${node.status === 'completed' ? 'bg-green-500 text-white' : 
              node.status === 'active' ? 'bg-blue-500 text-white animate-pulse' : 
              'bg-gray-300 text-gray-600'}
          `}>
            {index === 0 ? 'AI' : index.toString()}
          </div>
          <div className={`
            text-xs mt-1 text-center max-w-20
            ${node.status === 'active' ? 'font-medium text-blue-600' : 'text-gray-600'}
          `}>
            {node.label}
          </div>
          {index < thread.nodes.length - 1 && (
            <div className={`
              w-0.5 h-6 my-1
              ${thread.nodes[index + 1].status !== 'pending' ? 'bg-green-300' : 'bg-gray-200'}
            `} />
          )}
        </div>
      ))}
    </div>
  )

  return (
    <div className="flex flex-col h-screen bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b bg-white">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-black rounded flex items-center justify-center">
            <span className="text-white text-xs font-bold">cf0</span>
          </div>
          <span className="font-medium">AI</span>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm">
            <MessageSquare className="w-4 h-4" />
            New chat
          </Button>
          <Button variant="ghost" size="icon">
            <Minimize2 className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon">
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Tabs and Controls */}
      <div className="flex items-center justify-between px-4 py-2 border-b">
        <div className="flex">
          <button
            onClick={() => setActiveTab('chat')}
            className={`px-4 py-2 text-sm font-medium rounded-lg ${
              activeTab === 'chat' 
                ? 'bg-black text-white' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Chat
          </button>
          <button
            onClick={() => setActiveTab('trace')}
            className={`px-4 py-2 text-sm font-medium rounded-lg ${
              activeTab === 'trace' 
                ? 'bg-black text-white' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Trace
          </button>
        </div>

        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="icon"
            title="Trace execution"
          >
            <Settings className="w-4 h-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon"
            title="Chat history"
          >
            <BarChart3 className="w-4 h-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon"
            title="User profile"
          >
            <User className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Thread Visualization */}
        {currentThread && (
          <div className="w-24 border-r bg-gray-50 overflow-y-auto">
            <ThreadVisualization thread={currentThread} />
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message) => (
            <div key={message.id} className="space-y-2">
              {message.type === 'user' ? (
                <div className="flex justify-end">
                  <div className="bg-black text-white px-4 py-2 rounded-lg max-w-md">
                    {message.content}
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                    <FileText className="w-4 h-4" />
                    {message.content.includes('missing annual') ? 'Revising Model' : 'Finalizing Model'}
                  </div>
                  <div className="bg-gray-100 p-3 rounded-lg max-w-md text-sm text-gray-700">
                    {message.content}
                  </div>
                </div>
              )}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="border-t p-4">
        <div className="flex items-center gap-2 mb-3">
          <Button variant="ghost" size="sm" className="text-sm">
            <Plus className="w-4 h-4 mr-1" />
            Sources
          </Button>
          
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-sm text-gray-600">Mode:</span>
            <div className="flex items-center bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setMode('ask')}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  mode === 'ask' 
                    ? 'bg-white text-gray-900 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Ask
              </button>
              <button
                onClick={() => setMode('analyst')}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  mode === 'analyst' 
                    ? 'bg-white text-gray-900 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Analyst
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex-1 relative">
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Tell cf0 AI what to build..."
              className="pr-12 bg-green-50 border-green-200 focus:border-green-300 focus:ring-green-200"
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              disabled={isProcessing}
            />
            <Button
              onClick={handleSendMessage}
              size="icon"
              className="absolute right-1 top-1 h-8 w-8 bg-green-500 hover:bg-green-600"
              disabled={!inputValue.trim() || isProcessing}
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
