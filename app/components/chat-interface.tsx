'use client'

import { useState, useRef, useEffect } from 'react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Minimize2, X, MessageSquare, Settings, BarChart3, User, Plus, Send, FileText, ChevronDown, Type, Maximize2, Upload, File, Shield, PlayCircle, Undo2, Bug, AlertTriangle, CheckCircle2, Lock, Rocket, Link2, Globe, Copy, Pin, Sparkles, AtSign, Loader2, Wrench, Brain, BoxSelect, Timer } from 'lucide-react'
import invertedLogo from '@/docs/inverted_logo.png'

interface Message {
  id: string
  type: 'user' | 'system' | 'thread-node'
  content: string
  timestamp: Date
  threadNode?: {
    label: string
    status: 'completed' | 'active' | 'pending'
  }
  meta?: {
    kind: 'thinking' | 'thought-summary'
    thoughtId: string
    logs?: string[]
    durationMs?: number
    open?: boolean
  }
}

// Reserved for future thread visualization
// interface ThreadNode {
//   id: string
//   label: string
//   status: 'completed' | 'active' | 'pending'
//   timestamp: Date
// }

// interface ChatThread {
//   id: string
//   nodes: ThreadNode[]
// }

interface UploadedFile {
  id: string
  name: string
  size: number
  type: string
  uploadedAt: Date
}

type Provider = 'OpenAI' | 'Anthropic'
type Model = 'gpt-4o-mini' | 'gpt-4.1' | 'claude-3-5-sonnet' | 'claude-3-haiku'

interface ErrorInsight {
  id: string
  title: string
  description: string
  severity: 'low' | 'medium' | 'high'
  cellRange: string
  suggestion: string
  status: 'pending' | 'applied' | 'ignored'
}

interface VersionSnapshot {
  id: string
  label: string
  timestamp: Date
}

interface AuditFormula {
  cell: string
  formula: string
  description: string
  dependencies?: string[]
}

interface AuditStep {
  id: string
  description: string
  cellRange: string
  status: 'completed' | 'active' | 'pending'
  canRevert: boolean
}

interface AuditItem {
  id: string
  tool: string
  action: string
  details: string
  status: 'completed' | 'active' | 'pending'
  timestamp: Date
  formulas?: AuditFormula[]
  detailedSteps: AuditStep[]
  cellsAffected?: string[]
  dataValidation?: string[]
}

export function ChatInterface() {
  const [activeTab, setActiveTab] = useState<'chat' | 'audit'>('chat')
  const [messages, setMessages] = useState<Message[]>([])
  // Thread visualization removed in this version
  const [inputValue, setInputValue] = useState('')
  const [mode, setMode] = useState<'ask' | 'analyst'>('ask')
  const [isProcessing, setIsProcessing] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [showModeDropdown, setShowModeDropdown] = useState(false)
  const [showSourcesDropdown, setShowSourcesDropdown] = useState(false)
  const [dragPosition, setDragPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [auditData, setAuditData] = useState<AuditItem[]>([])
  const [toolApprovals, setToolApprovals] = useState<Record<string, 'pending' | 'approved' | 'rejected'>>({})
  const [isAdvancedMode, setIsAdvancedMode] = useState(false)
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({})
  const [stepApprovals, setStepApprovals] = useState<Record<string, 'pending' | 'approved' | 'rejected'>>({})
  // Thinking duration tracking for UI labels
  const [thinkingStartedAt, setThinkingStartedAt] = useState<number | null>(null)
  const [lastThinkingDurationMs, setLastThinkingDurationMs] = useState<number | null>(null)
  // Refs to avoid closure timing issues for thinking duration
  const thinkingStartRef = useRef<Record<string, number>>({})
  const currentThinkingIdRef = useRef<string | null>(null)
  const getCurrentInsight = () => errorInsights[currentInsightIndex] || errorInsights[0]

  // Governance and model controls
  const [provider, setProvider] = useState<Provider>('OpenAI')
  const [model, setModel] = useState<Model>('gpt-4o-mini')
  const [dryRun, setDryRun] = useState(true)
  const [privacyMode, setPrivacyMode] = useState(true)
  const [showInsights, setShowInsights] = useState(true)
  const [errorInsights, setErrorInsights] = useState<ErrorInsight[]>([])
  const [currentInsightIndex, setCurrentInsightIndex] = useState<number>(0)
  const [versions, setVersions] = useState<VersionSnapshot[]>([{ id: 'v1', label: 'Original', timestamp: new Date(0) }])
  const [activeVersionId, setActiveVersionId] = useState<string>('v1')
  interface PreviewModalState { visible: boolean; title?: string; content?: string }
  const [showPreviewModal, setShowPreviewModal] = useState<PreviewModalState>({visible: false})
  const [sourceUrl, setSourceUrl] = useState('')
  const [showProviderMenu, setShowProviderMenu] = useState(false)
  const [showModelMenu, setShowModelMenu] = useState(false)
  const [sourceMenuOrigin, setSourceMenuOrigin] = useState<'button' | 'inline' | null>(null)
  const providerOptions: Provider[] = ['OpenAI', 'Anthropic']
  const modelOptions: Record<Provider, Model[]> = {
    OpenAI: ['gpt-4o-mini', 'gpt-4.1'],
    Anthropic: ['claude-3-5-sonnet', 'claude-3-haiku']
  }

  // Plan preview for Analyst
  interface PlanStep { id: string; title: string; description: string; selected: boolean }
  const [currentPlan, setCurrentPlan] = useState<PlanStep[]>([])
  const [showPlanBar, setShowPlanBar] = useState(false)

  // Selection chips (simulated for UI)
  const [selectedRanges, setSelectedRanges] = useState<string[]>([])
  const addMockRange = () => {
    const samples = ['A1:B10', 'C7:C14', 'Revenue!B3:B8', 'Summary!A1:C2']
    const pick = samples[Math.floor(Math.random() * samples.length)]
    if (!selectedRanges.includes(pick)) setSelectedRanges(prev => [...prev, pick])
  }
  const removeRange = (range: string) => setSelectedRanges(prev => prev.filter(r => r !== range))

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true)
    const rect = e.currentTarget.getBoundingClientRect()
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    })
  }

  useEffect(() => {
    if (!isDragging) return
    const onMouseMove = (e: MouseEvent) => {
      setDragPosition({ x: e.clientX - dragOffset.x, y: e.clientY - dragOffset.y })
    }
    const onMouseUp = () => setIsDragging(false)
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
    return () => {
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
    }
  }, [isDragging, dragOffset])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Quick Command Palette (Cmd/Ctrl+K)
  const [showCommandPalette, setShowCommandPalette] = useState(false)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && (e.key.toLowerCase() === 'k')) {
        e.preventDefault()
        setShowCommandPalette(prev => !prev)
      }
      if (e.key === 'Escape') {
        setShowCommandPalette(false)
        setShowProviderMenu(false)
        setShowModelMenu(false)
        setShowModeDropdown(false)
        setShowSourcesDropdown(false)
        setShowInsights(false)
        if (showPreviewModal.visible) setShowPreviewModal({visible: false})
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (files) {
      Array.from(files).forEach(file => {
        const uploadedFile: UploadedFile = {
          id: Date.now().toString() + Math.random(),
          name: file.name,
          size: file.size,
          type: file.type,
          uploadedAt: new Date()
        }
        setUploadedFiles(prev => [...prev, uploadedFile])
      })
      setShowSourcesDropdown(false)
    }
  }

  const removeFile = (fileId: string) => {
    setUploadedFiles(prev => prev.filter(file => file.id !== fileId))
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const navigateToCell = (cellRange: string) => {
    // This would integrate with Excel API to navigate to the specific cell range
    console.log(`Navigating to cell range: ${cellRange}`)
    // In a real implementation, this would call Excel's API to select the range
  }

  const revertStep = (stepId: string, cellRange: string) => {
    setStepApprovals(prev => ({...prev, [stepId]: 'rejected'}))
    console.log(`Reverting changes in cell range: ${cellRange}`)
    // In a real implementation, this would call Excel's API to undo the specific changes
  }

  const scanForErrors = () => {
    const generated: ErrorInsight[] = [
      {
        id: 'err_1',
        title: 'Broken link: Operating Expenses total not updating',
        description: 'Cell B20 references B15 but misses new expense row B14.',
        severity: 'high',
        cellRange: 'B20',
        suggestion: 'Update formula to =B15-SUM(B11:B14).',
        status: 'pending'
      },
      {
        id: 'err_2',
        title: 'Percentage format inconsistent',
        description: 'Cells C7:C10 display raw decimals instead of percentages.',
        severity: 'medium',
        cellRange: 'C7:C10',
        suggestion: 'Apply Percentage Format: 0.0% to C7:C10.',
        status: 'pending'
      },
      {
        id: 'err_3',
        title: 'Data validation missing on revenue inputs',
        description: 'Revenue cells accept negative values.',
        severity: 'low',
        cellRange: 'B3:B4',
        suggestion: 'Add validation: values must be >= 0.',
        status: 'pending'
      }
    ]
    setErrorInsights(generated)
    setShowInsights(true)
  }

  const applyInsight = (id: string) => {
    setErrorInsights(prev => prev.map(i => i.id === id ? {...i, status: 'applied'} : i))
  }

  const ignoreInsight = (id: string) => {
    setErrorInsights(prev => prev.map(i => i.id === id ? {...i, status: 'ignored'} : i))
  }

  const createSnapshot = (label: string) => {
    const snap: VersionSnapshot = { id: `v_${Date.now()}`, label, timestamp: new Date() }
    setVersions(prev => [...prev, snap])
    setActiveVersionId(snap.id)
  }

  const commitChanges = () => {
    createSnapshot('Committed changes')
  }

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return

    const newMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: inputValue,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, newMessage])
    // const currentInput = inputValue
    setInputValue('')
    setIsProcessing(true)

    // initialize thought tracking for this cycle
    const thoughtId = `t_${Date.now()}`
    currentThinkingIdRef.current = thoughtId

    // Generate audit data for analyst mode
    if (mode === 'analyst') {
      const plan: { id: string; title: string; description: string; selected: boolean }[] = [
        { id: 'p1', title: 'Create template', description: 'Set up P&L structure with standard sections', selected: true },
        { id: 'p2', title: 'Apply formulas', description: 'Link COGS, labor, rent to revenue', selected: true },
        { id: 'p3', title: 'Validate ratios', description: 'Check margins and add range alerts', selected: true },
        { id: 'p4', title: 'Format professionally', description: 'Currency, percentages, conditional formatting', selected: true },
      ]
      setCurrentPlan(plan)
      setShowPlanBar(true)
      const auditItems: AuditItem[] = [
        {
          id: 'tool_1',
          tool: 'Financial Template Generator',
          action: 'Created P&L structure with standard restaurant categories',
          details: 'Generated revenue sections (Food Sales, Beverage Sales), COGS categories, and operating expense structure following QSR industry standards',
          status: 'completed',
          timestamp: new Date(),
          formulas: [
            { cell: 'B5', formula: '=B3+B4', description: 'Total Revenue calculation', dependencies: ['B3', 'B4'] },
            { cell: 'B15', formula: '=B5-B10', description: 'Gross Profit calculation', dependencies: ['B5', 'B10'] }
          ],
          detailedSteps: [
            { 
              id: 'step_1_1', 
              description: 'Created header structure with company name and period', 
              cellRange: 'A1:C2',
              status: 'completed',
              canRevert: true
            },
            { 
              id: 'step_1_2', 
              description: 'Set up revenue categories: Food Sales (B3), Beverage Sales (B4)', 
              cellRange: 'A3:B4',
              status: 'completed',
              canRevert: true
            },
            { 
              id: 'step_1_3', 
              description: 'Added COGS section with Food Costs (B7), Beverage Costs (B8)', 
              cellRange: 'A7:B8',
              status: 'completed',
              canRevert: true
            },
            { 
              id: 'step_1_4', 
              description: 'Implemented operating expenses: Labor (B11), Rent (B12), Utilities (B13)', 
              cellRange: 'A11:B13',
              status: 'completed',
              canRevert: true
            },
            { 
              id: 'step_1_5', 
              description: 'Applied industry-standard formatting and cell protection', 
              cellRange: 'A1:C25',
              status: 'completed',
              canRevert: false
            }
          ],
          cellsAffected: ['A1:C25'],
          dataValidation: ['Revenue cells accept positive numbers only', 'Percentage cells limited to 0-100%']
        },
        {
          id: 'tool_2', 
          tool: 'Formula Engine',
          action: 'Applied percentage-based calculations',
          details: 'Set COGS at 30% of revenue, labor costs at 28%, rent at 6% following industry benchmarks for fast food restaurants',
          status: 'completed',
          timestamp: new Date(),
          formulas: [
            { cell: 'B7', formula: '=B5*0.30', description: 'Food COGS as 30% of revenue', dependencies: ['B5'] },
            { cell: 'B8', formula: '=B5*0.05', description: 'Beverage COGS as 5% of revenue', dependencies: ['B5'] },
            { cell: 'B11', formula: '=B5*0.28', description: 'Labor costs as 28% of revenue', dependencies: ['B5'] },
            { cell: 'B12', formula: '=B5*0.06', description: 'Rent as 6% of revenue', dependencies: ['B5'] }
          ],
          detailedSteps: [
            { 
              id: 'step_2_1', 
              description: 'Analyzed industry benchmarks for QSR restaurants', 
              cellRange: 'N/A',
              status: 'completed',
              canRevert: false
            },
            { 
              id: 'step_2_2', 
              description: 'Applied 30% COGS ratio for food items', 
              cellRange: 'B7',
              status: 'completed',
              canRevert: true
            },
            { 
              id: 'step_2_3', 
              description: 'Set beverage COGS at 5% (higher margin items)', 
              cellRange: 'B8',
              status: 'completed',
              canRevert: true
            },
            { 
              id: 'step_2_4', 
              description: 'Configured labor costs at 28% (industry standard)', 
              cellRange: 'B11',
              status: 'completed',
              canRevert: true
            },
            { 
              id: 'step_2_5', 
              description: 'Set rent at 6% of revenue (typical lease agreements)', 
              cellRange: 'B12',
              status: 'completed',
              canRevert: true
            },
            { 
              id: 'step_2_6', 
              description: 'Added conditional formatting for ratio validation', 
              cellRange: 'B7:B13',
              status: 'completed',
              canRevert: true
            }
          ],
          cellsAffected: ['B7:B8', 'B11:B13'],
          dataValidation: ['All percentage formulas linked to revenue cell B5']
        },
        {
          id: 'tool_3',
          tool: 'Data Validation Suite',
          action: 'Validated financial ratios and relationships',
          details: 'Ensured all percentages sum correctly, validated that net profit margins align with industry standards (8-12%)',
          status: 'completed', 
          timestamp: new Date(),
          formulas: [
            { cell: 'B20', formula: '=B15-SUM(B11:B14)', description: 'Net Profit calculation', dependencies: ['B15', 'B11', 'B12', 'B13', 'B14'] },
            { cell: 'C20', formula: '=B20/B5', description: 'Net Profit Margin percentage', dependencies: ['B20', 'B5'] },
            { cell: 'B25', formula: '=IF(C20<0.08,"Below Target",IF(C20>0.12,"Above Target","Within Range"))', description: 'Profit margin validation', dependencies: ['C20'] }
          ],
          detailedSteps: [
            { 
              id: 'step_3_1', 
              description: 'Created validation formulas for all financial ratios', 
              cellRange: 'C7:C20',
              status: 'completed',
              canRevert: true
            },
            { 
              id: 'step_3_2', 
              description: 'Implemented cross-checks between revenue and expense categories', 
              cellRange: 'D1:D25',
              status: 'completed',
              canRevert: true
            },
            { 
              id: 'step_3_3', 
              description: 'Added profit margin validation against industry benchmarks', 
              cellRange: 'B25',
              status: 'completed',
              canRevert: true
            },
            { 
              id: 'step_3_4', 
              description: 'Set up alerts for ratios outside acceptable ranges', 
              cellRange: 'E1:E25',
              status: 'completed',
              canRevert: true
            },
            { 
              id: 'step_3_5', 
              description: 'Validated sum formulas for accuracy', 
              cellRange: 'B5,B10,B15,B20',
              status: 'completed',
              canRevert: false
            },
            { 
              id: 'step_3_6', 
              description: 'Applied error checking for circular references', 
              cellRange: 'A1:E25',
              status: 'completed',
              canRevert: false
            }
          ],
          cellsAffected: ['B20:C25'],
          dataValidation: ['Net profit margin must be between 8-12%', 'All expense ratios validated against revenue']
        },
        {
          id: 'tool_4',
          tool: 'Formatting Assistant',
          action: 'Applied professional financial formatting',
          details: 'Added currency formatting, percentage displays, conditional formatting for negative values, and professional color scheme',
          status: 'completed',
          timestamp: new Date(),
          formulas: [
            { cell: 'B3:B20', formula: 'Currency Format: $#,##0.00', description: 'Currency formatting for all monetary values', dependencies: [] },
            { cell: 'C7:C14', formula: 'Percentage Format: 0.0%', description: 'Percentage formatting for ratios', dependencies: [] }
          ],
          detailedSteps: [
            { 
              id: 'step_4_1', 
              description: 'Applied currency formatting to all monetary cells', 
              cellRange: 'B3:B20',
              status: 'completed',
              canRevert: true
            },
            { 
              id: 'step_4_2', 
              description: 'Set percentage formatting for ratio calculations', 
              cellRange: 'C7:C14',
              status: 'completed',
              canRevert: true
            },
            { 
              id: 'step_4_3', 
              description: 'Added conditional formatting: red for negative values', 
              cellRange: 'B3:B25',
              status: 'completed',
              canRevert: true
            },
            { 
              id: 'step_4_4', 
              description: 'Implemented color coding: green for profits, red for losses', 
              cellRange: 'B15,B20',
              status: 'completed',
              canRevert: true
            },
            { 
              id: 'step_4_5', 
              description: 'Applied professional font styling (Calibri, 11pt)', 
              cellRange: 'A1:C25',
              status: 'completed',
              canRevert: true
            },
            { 
              id: 'step_4_6', 
              description: 'Added borders and shading for section separation', 
              cellRange: 'A1:C25',
              status: 'completed',
              canRevert: true
            },
            { 
              id: 'step_4_7', 
              description: 'Protected formula cells to prevent accidental changes', 
              cellRange: 'B5,B7:B8,B11:B13,B15,B20',
              status: 'completed',
              canRevert: false
            }
          ],
          cellsAffected: ['A1:C25'],
          dataValidation: ['Read-only protection on formula cells', 'Input validation on data entry cells']
        }
      ]
      
      setAuditData(auditItems)
      
      // Initialize approval states for tools and individual steps
      const approvals: {[key: string]: 'pending' | 'approved' | 'rejected'} = {}
      auditItems.forEach(item => {
        approvals[item.id] = 'pending'
        item.detailedSteps.forEach(step => {
          approvals[step.id] = 'pending'
        })
      })
      setToolApprovals(approvals)
      scanForErrors()
    }

    // Add system messages with proper sequence
    setTimeout(() => {
      const now = Date.now()
      setThinkingStartedAt(now)
      thinkingStartRef.current[thoughtId] = now
      // add a dedicated thinking message that will transform into a summary
      setMessages(prev => [...prev,
        {
          id: `${thoughtId}_msg`,
          type: 'system',
          content: 'Thinking...',
          timestamp: new Date(),
          meta: { kind: 'thinking', thoughtId }
        }
      ])
    }, 400)

    setTimeout(() => {
      const start = thinkingStartRef.current[thoughtId]
      if (start) setLastThinkingDurationMs(Date.now() - start)
      setMessages(prev => [...prev,
        {
          id: Date.now().toString() + '_1',
          type: 'system',
          content: 'I need to add the missing annual values for the operating expenses section. I\'ll add the formulas to calculate annual values based on the monthly figures in column C.',
          timestamp: new Date()
        }
      ])
    }, 2000)

    setTimeout(() => {
      // finalize thinking and replace the inline thinking box with the summary (do not append at bottom)
      const end = Date.now()
      const start = thinkingStartRef.current[thoughtId]
      const duration = start ? end - start : 0
      setLastThinkingDurationMs(duration)

      setMessages(prev => {
        const now = new Date()
        const next = [...prev]
        const idx = next.findIndex(m => m.meta?.kind === 'thinking' && m.meta.thoughtId === thoughtId)
        const summaryMessage = {
          id: `${thoughtId}_summary`,
          type: 'system' as const,
          content: 'Thought summary',
          timestamp: now,
          meta: {
            kind: 'thought-summary' as const,
            thoughtId,
            durationMs: duration,
            open: false,
            logs: [
              'Parsed request and identified key objectives',
              'Built stepwise plan with financial assumptions',
              'Validated dependencies and calculated outputs'
            ]
          }
        }
        if (idx !== -1) {
          next[idx] = summaryMessage
        } else {
          // fallback: insert before final message if thinking not found
          next.push(summaryMessage)
        }
        // append the final assistant content message
        next.push({
          id: Date.now().toString() + '_2',
          type: 'system' as const,
          content: 'Let me make a few final adjustments to complete the green color scheme in our financial model. I\'ll enhance the title and add formatting to some key totals to make them stand out better.',
          timestamp: now
        })
        return next
      })
      setIsProcessing(false)
    }, 4000)
  }
  // Resizable right panel controls (must be declared before any early return to preserve hook order)
  const [panelWidth, setPanelWidth] = useState<number>(480)
  const [resizing, setResizing] = useState<boolean>(false)
  const handleResizeMouseDown = (e: React.MouseEvent) => {
    setResizing(true)
    e.preventDefault()
  }
  useEffect(() => {
    if (!resizing) return
    const onMove = (e: MouseEvent) => {
      const viewportWidth = window.innerWidth
      const distanceFromRight = viewportWidth - e.clientX
      const next = Math.max(420, Math.min(760, distanceFromRight))
      setPanelWidth(next)
    }
    const onUp = () => setResizing(false)
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
    return () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
  }, [resizing])

  if (isMinimized) {
    return (
      <div 
        className="fixed w-80 bg-white/90 rounded-xl shadow-[0_10px_30px_-10px_rgba(16,185,129,.35)] border border-emerald-100/80 cursor-move select-none backdrop-blur"
        style={{
          left: dragPosition.x || 'auto',
          top: dragPosition.y || 'auto',
          right: dragPosition.x ? 'auto' : '1rem',
          bottom: dragPosition.y ? 'auto' : '1rem'
        }}
        onMouseDown={handleMouseDown}
      >
        {/* Mini Header */}
        <div className="flex items-center justify-between px-3 py-2 border-b bg-transparent rounded-t-xl">
            <div className="flex items-center gap-2 relative z-10">
              <Image src={invertedLogo} alt="cf0" width={26} height={26} className="rounded" />
              <span className="text-[11px] font-medium text-gray-800 select-none">cf0.ai</span>
            </div>
          
          <div className="flex items-center gap-1">
            {/* mini inline selectors: model + agent in one row */}
            <div className="relative hidden sm:block z-10">
              <Button variant="outline" size="sm" className="group relative h-6 px-2 text-[10px] hover:bg-gray-50 overflow-hidden transition-colors duration-300" onClick={(e) => { e.stopPropagation(); setShowModelMenu(prev => !prev); setShowProviderMenu(false) }}>
                <span className="pointer-events-none absolute inset-0 rounded-md" style={{ WebkitMask: 'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)', WebkitMaskComposite: 'xor' as any, maskComposite: 'exclude' as any, padding: 1 }}>
                  <span className="absolute -inset-1 rounded-md bg-[conic-gradient(from_0deg,rgba(16,185,129,.0),rgba(16,185,129,.65),rgba(16,185,129,.0))] animate-[spin_3.6s_linear_infinite] opacity-80 group-hover:opacity-90 transition-opacity duration-300" />
                </span>
                <span className="relative z-10 flex items-center">
                  <span className="text-emerald-700 font-medium">{model}</span>
                  <ChevronDown className="w-2.5 h-2.5 ml-1" />
                </span>
              </Button>
              {showModelMenu && (
                <div className="absolute top-full right-0 mt-1 bg-white border rounded-md shadow-md z-20 w-44 max-h-56 overflow-y-auto">
                  {modelOptions[provider].map(m => (
                    <button key={m} onClick={(e) => { e.stopPropagation(); setModel(m); setShowModelMenu(false) }} className={`relative w-full text-left px-2 py-1 text-[10px] hover:bg-gray-50 ${model === m ? 'text-emerald-700 font-semibold' : 'text-gray-700'}`}>
                      {m}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="relative hidden sm:block z-10">
              <Button variant="outline" size="sm" className="group relative h-6 px-2 text-[10px] hover:bg-gray-50 overflow-hidden transition-colors duration-300 ml-1" onClick={(e) => { e.stopPropagation(); setShowModeDropdown(prev => !prev) }}>
                {mode === 'ask' ? (<><Sparkles className="w-3 h-3 mr-1"/>Ask</>) : (<><Wrench className="w-3 h-3 mr-1"/>Analyst</>)}
                <ChevronDown className="w-2.5 h-2.5 ml-1" />
              </Button>
              {showModeDropdown && (
                <div className="absolute top-full right-0 mt-1 bg-white border rounded-md shadow-md z-20 w-40 animate-in slide-in-from-top-2 duration-200">
                  <button onClick={(e) => { e.stopPropagation(); setMode('ask'); setShowModeDropdown(false) }} className={`relative flex w-full items-center gap-1.5 px-2 py-1 text-left text-[10px] hover:bg-gray-50 transition-colors duration-150 ${mode === 'ask' ? 'text-emerald-700 font-semibold' : 'text-gray-700'}`}>
                    <span className="relative">
                      <Sparkles className="w-3 h-3" />
                      {mode === 'ask' && <span className="pointer-events-none absolute -inset-1 rounded bg-emerald-200/25 blur-[6px]" />}
                    </span>
                    Ask
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); setMode('analyst'); setShowModeDropdown(false) }} className={`relative flex w-full items-center gap-1.5 px-2 py-1 text-left text-[10px] hover:bg-gray-50 transition-colors duration-150 ${mode === 'analyst' ? 'text-emerald-700 font-semibold' : 'text-gray-700'}`}>
                    <span className="relative">
                      <Wrench className="w-3 h-3" />
                      {mode === 'analyst' && <span className="pointer-events-none absolute -inset-1 rounded bg-emerald-200/25 blur-[6px]" />}
                    </span>
                    Analyst
                  </button>
                </div>
              )}
            </div>
            <Button 
              variant="ghost" 
              size="icon"
              className="size-6 hover:bg-gray-100 transition-all duration-150"
              onClick={() => setIsMinimized(false)}
            >
              <Maximize2 className="w-3 h-3" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon"
              className="size-6 hover:bg-gray-100 transition-all duration-150"
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
        </div>

        {/* Mini Input Area */}
        <div className="p-2.5">
          <div className="flex items-end gap-2">
            <div className="group relative flex-1">
              {/* Match full-view morphing blob + glow */}
              <div className="pointer-events-none absolute -inset-[4px] rounded-[18px] p-[4px] opacity-80 transition-opacity duration-500 group-focus-within:opacity-95">
                <div className="absolute inset-0 rounded-[inherit] overflow-hidden">
                  <div className="absolute inset-[-10%] rounded-[inherit] bg-[radial-gradient(40%_60%_at_50%_50%,rgba(16,185,129,.22),transparent_60%)] animate-[blob_10s_ease-in-out_infinite]" />
                  <div className="absolute inset-[-20%] rounded-[inherit] bg-[conic-gradient(from_0deg,rgba(16,185,129,.0),rgba(16,185,129,.4),rgba(16,185,129,.0))] animate-[spin_8s_linear_infinite,glowPulse_3.2s_ease-in-out_infinite]" />
                </div>
              </div>
              <div className="relative rounded-xl border border-emerald-300/70 bg-white/90 backdrop-blur-sm flex items-end overflow-hidden">
                {/* Shimmer ring like full view */}
                <div className="pointer-events-none absolute -inset-[1px] rounded-[inherit]" style={{ WebkitMask: 'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)', WebkitMaskComposite: 'xor' as any, maskComposite: 'exclude' as any, padding: 1 }}>
                  <div className="absolute -inset-1 rounded-[inherit] bg-[conic-gradient(from_0deg,transparent,rgba(16,185,129,.4),transparent)] animate-[spin_6s_linear_infinite]" />
                </div>
                <textarea
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Tell cf0 AI what to build..."
                  className="flex-1 bg-transparent border-none focus:outline-none focus:ring-0 px-2.5 py-1.5 text-[13px] resize-none min-h-[38px] max-h-28 overflow-y-auto placeholder:text-gray-400"
               onKeyDown={(e) => {
                if (e.key === '@') {
                  setShowSourcesDropdown(true)
                  setSourceMenuOrigin('inline')
                }
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      handleSendMessage()
                    }
                  }}
                  disabled={isProcessing}
                  rows={1}
                  style={{ height: 'auto', minHeight: '38px' }}
                  onInput={(e) => {
                    const target = e.target as HTMLTextAreaElement
                    target.style.height = 'auto'
                    target.style.height = Math.min(target.scrollHeight, 112) + 'px'
                  }}
                />
                <Button
                  onClick={handleSendMessage}
                  size="icon"
                  className="relative m-1 h-7 w-7 bg-gradient-to-r from-emerald-600 to-emerald-500 text-white"
                  disabled={!inputValue.trim() || isProcessing}
                >
                  <Send className="w-3 h-3" />
                </Button>
              </div>
            </div>
          </div>
        </div>
        {/* Mini Mode Switcher */}
        <div className="px-3 pb-2">
          <div className="flex items-center gap-2 relative">
            {/* move mode selector into input area; keep area for future controls */}
          </div>
        </div>
      </div>
    )
  }

  

  return (
    <div className="fixed right-0 top-0 z-40 flex h-screen max-w-[92vw] flex-col rounded-l-2xl rounded-r-none border-y border-l border-emerald-100/80 bg-white/85 backdrop-blur supports-[backdrop-filter]:bg-white/70 shadow-[0_10px_30px_-10px_rgba(16,185,129,.35)]" style={{ width: panelWidth, ['--panel-width' as any]: panelWidth + 'px' }}>
      {/* Resize handle */}
      <div onMouseDown={handleResizeMouseDown} className="absolute left-0 top-0 h-full w-2 cursor-col-resize rounded-l-2xl">
        <div className="absolute inset-y-0 left-[-1px] w-[3px] rounded-full bg-gradient-to-b from-emerald-300/50 via-emerald-400/60 to-emerald-300/50 opacity-0 hover:opacity-100 transition-opacity" />
      </div>
      <div className="pointer-events-none absolute -z-10 inset-0 rounded-l-2xl bg-gradient-to-l from-emerald-500/15 via-emerald-400/8 to-transparent blur-2xl" />
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b bg-transparent rounded-tl-2xl">
        <div className="flex items-center gap-2">
          <Image src={invertedLogo} alt="cf0" width={32} height={32} className="rounded" />
          <span className="text-[12px] font-medium text-gray-800 select-none">cf0.ai</span>
        </div>
        
        {/* Tiny model selector */}
        <div className="hidden md:flex items-center gap-2">
          <div className="relative">
            <Button variant="outline" size="sm" className="group relative h-6 px-2 text-[10px] hover:bg-gray-50 overflow-hidden transition-colors duration-300" onClick={() => { setShowModelMenu(prev => !prev); setShowProviderMenu(false) }}>
              {/* animated glow ring */}
              <span className="pointer-events-none absolute inset-0 rounded-md" style={{ WebkitMask: 'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)', WebkitMaskComposite: 'xor' as any, maskComposite: 'exclude' as any, padding: 1 }}>
                <span className="absolute inset-0 rounded-md bg-[conic-gradient(from_0deg,rgba(16,185,129,.0),rgba(16,185,129,.7),rgba(16,185,129,.0))] animate-[spin_3.5s_linear_infinite] opacity-80 group-hover:opacity-90 transition-opacity duration-300" />
              </span>
              <span className="relative z-10 flex items-center">
                <span className="text-emerald-700 font-medium">{model}</span>
                <ChevronDown className="w-2.5 h-2.5 ml-1" />
              </span>
            </Button>
            {showModelMenu && (
              <div className="absolute top-full left-0 mt-1 bg-white border rounded-md shadow-md z-20 w-48 max-h-56 overflow-y-auto">
                {modelOptions[provider].map(m => (
                  <button key={m} onClick={() => { setModel(m); setShowModelMenu(false) }} className={`relative w-full text-left px-2 py-1 text-[10px] hover:bg-gray-50 ${model === m ? 'text-emerald-700 font-semibold' : 'text-gray-700'}`}>
                    <span className="relative">
                      {m}
                      {model === m && (
                        <span className="pointer-events-none absolute -inset-1 rounded bg-emerald-200/25 blur-[6px]" />
                      )}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <div className="relative group">
            <Button 
              variant="ghost" 
              size="icon"
              className="size-7 hover:bg-emerald-50 text-emerald-700 transition-colors duration-150"
              aria-label="New chat"
            >
              <MessageSquare className="w-3.5 h-3.5" />
            </Button>
            <div className="pointer-events-none absolute right-0 mt-1 translate-y-full bg-emerald-600 text-white text-[10px] px-1.5 py-0.5 rounded shadow-sm opacity-0 group-hover:opacity-100">New chat</div>
          </div>
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => setIsMinimized(true)}
            className="size-7 hover:bg-gray-100 transition-colors duration-150"
          >
            <Minimize2 className="w-3.5 h-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="size-7 hover:bg-gray-100 transition-colors duration-150">
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-between px-3 py-2 border-b">
        <div className="flex bg-gray-100/70 rounded-md p-0.5 border border-gray-200/60">
          <button
            onClick={() => setActiveTab('chat')}
            className={`px-3 py-1.5 text-[12px] font-medium rounded-[8px] transition-all duration-200 hover:bg-emerald-50 hover:text-emerald-800 ${
              activeTab === 'chat' 
                ? 'bg-white text-gray-900 shadow-xs ring-1 ring-emerald-300' 
                : 'text-gray-600 hover:text-gray-900'
            } hover:translate-y-[-1px]`}
          >
            Chat
          </button>
          {messages.some(msg => msg.type === 'user' && messages.length > 1) && auditData.length > 0 && (
            <button
              onClick={() => setActiveTab('audit')}
              className={`ml-0.5 px-3 py-1.5 text-[12px] font-medium rounded-[8px] transition-all duration-200 hover:bg-emerald-50 hover:text-emerald-800 ${
                activeTab === 'audit' 
                  ? 'bg-white text-gray-900 shadow-xs ring-1 ring-emerald-300' 
                  : 'text-gray-600 hover:text-gray-900'
              } hover:translate-y-[-1px]`}
            >
              Audit
            </button>
          )}
        </div>
        
        <div className="flex items-center gap-1.5">
          <Button 
            variant="ghost"
            size="icon"
            onClick={() => setShowInsights(!showInsights)}
            title="Insights"
            className={`group size-7 transition-transform duration-150 hover:translate-y-[-1px] active:translate-y-0 hover:bg-emerald-50 ${showInsights ? 'text-emerald-700 bg-emerald-50' : 'text-gray-700'}`}
          >
            <Bug className="draw-on-hover w-3.5 h-3.5" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon"
            title="Trace execution"
            className="size-7 hover:bg-gray-100 transition-all duration-150"
          >
            <Settings className="w-3.5 h-3.5" />
          </Button>
          <Button variant="outline" size="sm" className="h-7 px-2 text-[11px] hover:bg-gray-50" onClick={() => createSnapshot('Manual snapshot')}>
            <Undo2 className="w-3.5 h-3.5 mr-1" />
            Snapshot
          </Button>
        </div>
      </div>

      {/* Chat/Audit Area */}
      <div className="flex-1 overflow-hidden">
        {/* Plan preview bar (Analyst) */}
        {showPlanBar && (
          <div className="px-4 py-2 bg-white border-b flex items-start gap-4">
            <div className="text-sm font-medium text-gray-800 mt-1">Plan</div>
            <div className="flex-1 flex flex-wrap gap-2">
              {currentPlan.map(step => (
                <button key={step.id} onClick={() => setCurrentPlan(prev => prev.map(s => s.id === step.id ? {...s, selected: !s.selected} : s))} className={`px-3 py-1 rounded-full text-xs border transition ${step.selected ? 'bg-green-50 border-green-200 text-green-800' : 'bg-gray-50 border-gray-200 text-gray-600'}`} title={step.description}>
                  {step.title}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="default" className="bg-green-600 hover:bg-green-700" onClick={() => setShowPlanBar(false)}>Accept</Button>
              <Button size="sm" variant="outline" onClick={() => setShowPlanBar(false)}>Skip</Button>
            </div>
          </div>
        )}
        {/* Version timeline */}
        <div className="flex items-center gap-2 px-4 py-2 border-b bg-gray-50 overflow-x-auto">
          {versions.map(v => (
            <button
              key={v.id}
              onClick={() => setActiveVersionId(v.id)}
              className={`text-xs px-2 py-1 rounded-full border transition-all duration-200 ${activeVersionId === v.id ? 'bg-white border-green-300 text-green-700' : 'bg-white hover:bg-gray-100 text-gray-700'}`}
              title={v.label}
            >
              {v.label}
            </button>
          ))}
        </div>

        <div className="h-full flex overflow-hidden">
          {/* Main content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {activeTab === 'chat' ? (
              <>
                {messages.length === 0 && (
                  <div className="mt-16 mx-auto max-w-xl text-center">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-50 text-green-700 border border-green-200 mb-3 shadow-sm">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div className="text-lg font-semibold text-gray-800">Welcome to cf0 AI</div>
                    <div className="text-gray-600 mt-1">Ask questions in Ask mode, or switch to Analyst to build and modify your workbook step-by-step.</div>
                    <div className="flex items-center justify-center gap-2 mt-4">
                      <button className="text-xs px-3 py-1.5 rounded-full border bg-white hover:bg-gray-50 shadow-xs">Explain selection</button>
                      <button className="text-xs px-3 py-1.5 rounded-full border bg-white hover:bg-gray-50 shadow-xs">Generate chart</button>
                      <button className="text-xs px-3 py-1.5 rounded-full border bg-white hover:bg-gray-50 shadow-xs">Validate model</button>
                    </div>
                  </div>
                )}
                {messages.map((message) => (
                  <div key={message.id} className="space-y-2">
                    {message.type === 'user' ? (
                      <div className="flex justify-end mb-4 group">
                        <div className="flex items-start gap-2 max-w-[72%]">
                          {/* no bubble background — use underline card style */}
                          <div className="relative px-0 py-0 text-[13px] leading-6 text-gray-900">
                            <div className="relative">
                              {/* subtle bubble background */}
                              <div className="absolute inset-[-6px] rounded-lg bg-emerald-50/30 border border-emerald-100" />
                              <div className="absolute -inset-x-1 -bottom-1 h-[2px] bg-emerald-400/60 rounded-full blur-[1px]" />
                              <div className="absolute -inset-x-1 -bottom-[6px] h-[1px] bg-emerald-200/70" />
                              <span className="bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent font-medium">
                                {message.content}
                              </span>
                            </div>
                          </div>
                          <div className="w-6 h-6 rounded-full bg-gray-900 text-white flex items-center justify-center text-[9px]">U</div>
                        </div>
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity mr-2 flex items-center gap-1.5">
                          <button className="text-gray-400 hover:text-gray-700" title="Copy"><Copy className="w-3 h-3" /></button>
                          <button className="text-gray-400 hover:text-gray-700" title="Pin"><Pin className="w-3 h-3" /></button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-1.5 relative animate-in slide-in-from-right-2 duration-200 group pl-6">
                        {/* connecting line in a dedicated gutter to avoid cutting through text */}
                        <div className="pointer-events-none absolute left-3 -top-3 bottom-0 w-[2px] bg-gradient-to-b from-emerald-300 via-emerald-400 to-emerald-300 rounded-full -z-10" />
                        <div className="flex items-center gap-1.5 text-[12px] font-medium text-gray-600 relative z-0 pr-2 inline-flex rounded">
                          {message.content === 'Thinking...' ? (
                            <>
                              <Brain className="w-3.5 h-3.5 text-emerald-600 animate-pulse" /> Thinking
                            </>
                          ) : message.content.includes('missing annual') ? (
                            <>
                              <Wrench className="w-3.5 h-3.5 text-emerald-600" /> Revising Model
                            </>
                           ) : (
                            <>
                              <FileText className="w-3.5 h-3.5 text-emerald-600" /> {lastThinkingDurationMs ? `Thought for ${(lastThinkingDurationMs/1000).toFixed(1)}s` : 'Finalizing Model'}
                            </>
                          )}
                        </div>
                        <div className="flex items-start gap-2 w-[min(900px,calc(var(--panel-width,480px)-120px))] max-w-full">
                          {/* Show logo only for the first system message after a user message */}
                          {(() => {
                            // find previous message; if previous is user or none, show logo
                            // This is a render-time heuristic using current list; safe for demo
                            const idx = messages.findIndex(m => m.id === message.id)
                            const prev = idx > 0 ? messages[idx - 1] : undefined
                            const showLogo = !prev || prev.type === 'user'
                            return showLogo ? <Image src={invertedLogo} alt="cf0" width={32} height={32} className="rounded" /> : <div className="w-8" />
                          })()}
                          {message.meta?.kind === 'thinking' ? (
                            <div className="bg-gray-100 p-2.5 rounded-lg border border-gray-200 max-w-md">
                              <div className="animate-pulse space-y-2">
                                <div className="h-2.5 bg-gray-200 rounded w-2/3" />
                                <div className="h-2.5 bg-gray-200 rounded w-4/5" />
                                <div className="h-2.5 bg-gray-200 rounded w-3/5" />
                              </div>
                            </div>
                          ) : message.meta?.kind === 'thought-summary' ? (
                            <div className="px-2 py-1 text-[13px] leading-5 text-gray-800 w-full">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-emerald-700">
                                  <Brain className="w-3.5 h-3.5" />
                                  <span>Thought for {(message.meta.durationMs ? (message.meta.durationMs/1000).toFixed(1) : '0.0')}s</span>
                                </div>
                                <button
                                  className="text-gray-600 hover:text-gray-900 text-xs flex items-center gap-1"
                                  onClick={() => setMessages(prev => prev.map(m => m.id === message.id ? { ...m, meta: { ...m.meta!, open: !m.meta?.open } } : m))}
                                >
                                  {message.meta.open ? 'Hide' : 'Show'}
                                  <ChevronDown className={`w-3 h-3 transition-transform ${message.meta.open ? 'rotate-180' : ''}`} />
                                </button>
                              </div>
                              {message.meta.open && (
                                <div className="mt-2 text-[12px] text-gray-700">
                                  <div className="font-medium text-gray-800 mb-1">Internal reasoning</div>
                                  <div className="relative">
                                    <pre className="whitespace-pre-wrap leading-5 text-gray-800 max-h-48 overflow-auto pr-2 animate-in fade-in" style={{ WebkitMaskImage: 'linear-gradient(to bottom, transparent 0, black 12px, black calc(100% - 12px), transparent 100%)' }}>
Parsed request and identified key objectives
Built stepwise plan with financial assumptions
Validated dependencies and calculated outputs
Checked input constraints and data ranges for realism
Mapped proposed changes to concrete spreadsheet operations
Verified formula graph for circular references and errors
Estimated the impact of formatting on readability and review
Outlined revert points to preserve auditability
Allocated steps between template generation and validation
Re-reviewed assumptions against industry benchmarks
Refined the sequence to minimize recalculation churn
Prepared a user-facing summary detailing the plan and tradeoffs
Queued secondary enhancements (naming, comments, protections)
Completed dry-run and confirmed no destructive operations needed
Ready to proceed with execution once approved
                                    </pre>
                                  </div>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="text-[13px] leading-6 text-gray-800 w-full">
                              {message.content}
                            </div>
                          )}
                        </div>
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity ml-8 flex items-center gap-1.5">
                          <button className="text-gray-400 hover:text-gray-700" title="Copy"><Copy className="w-3 h-3" /></button>
                          <button className="text-gray-400 hover:text-gray-700" title="Pin"><Pin className="w-3 h-3" /></button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </>
            ) : (
              <div className="space-y-4 animate-in fade-in duration-500">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                    <Image src={invertedLogo} alt="cf0" width={20} height={20} className="rounded" />
                    Audit Trail — Tool Execution Details
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsAdvancedMode(!isAdvancedMode)}
                    className={`flex items-center gap-2 hover:scale-105 transition-all duration-200 ${
                      isAdvancedMode ? 'bg-emerald-50 border-emerald-300 text-emerald-700' : ''
                    }`}
                  >
                    <Settings className="w-3 h-3" />
                    {isAdvancedMode ? 'Basic Mode' : 'Advanced Mode'}
                  </Button>
                </div>
                
                {auditData.length > 0 ? (
                  auditData.map((item, index) => (
                    <div key={item.id} className="border rounded-lg bg-white shadow-sm animate-in slide-in-from-bottom-2 duration-300 border-emerald-100" style={{animationDelay: `${index * 100}ms`}}>
                      {/* Main Tool Header */}
                      <div className="p-4 border-b">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                              <span className="font-medium text-gray-800">{item.tool}</span>
                              <span className="text-xs text-gray-500">{item.timestamp.toLocaleTimeString()}</span>
                            </div>
                            <div className="text-sm font-medium text-gray-700 mb-1">{item.action}</div>
                            <div className="text-sm text-gray-600">{item.details}</div>
                          </div>
                          <div className="flex gap-2 ml-4">
                            <button
                              onClick={() => setToolApprovals(prev => ({...prev, [item.id]: 'approved'}))}
                              className={`px-3 py-1 text-xs rounded-full transition-all duration-200 hover:scale-105 ${
                                toolApprovals[item.id] === 'approved' 
                                  ? 'bg-green-100 text-green-700 border border-green-300 scale-105' 
                                  : 'bg-gray-100 text-gray-600 hover:bg-green-50'
                              }`}
                            >
                              ✓ Accept
                            </button>
                            <button
                              onClick={() => setToolApprovals(prev => ({...prev, [item.id]: 'rejected'}))}
                              className={`px-3 py-1 text-xs rounded-full transition-all duration-200 hover:scale-105 ${
                                toolApprovals[item.id] === 'rejected' 
                                  ? 'bg-red-100 text-red-700 border border-red-300 scale-105' 
                                  : 'bg-gray-100 text-gray-600 hover:bg-red-50'
                              }`}
                            >
                              ✗ Reject
                            </button>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-xs">
                            <span className={`px-2 py-1 rounded-full transition-all duration-300 ${
                              toolApprovals[item.id] === 'approved' ? 'bg-green-100 text-green-700' :
                              toolApprovals[item.id] === 'rejected' ? 'bg-red-100 text-red-700' :
                              'bg-yellow-100 text-yellow-700'
                            }`}>
                              {toolApprovals[item.id] === 'approved' ? 'Approved' :
                               toolApprovals[item.id] === 'rejected' ? 'Rejected' : 'Pending Review'}
                            </span>
                            {isAdvancedMode && (
                              <span className="text-gray-500">
                                Cells: {item.cellsAffected?.join(', ')} | Formulas: {item.formulas?.length || 0}
                              </span>
                            )}
                          </div>
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setExpandedSections(prev => ({...prev, [item.id]: !prev[item.id]}))}
                            className="text-xs hover:scale-105 transition-all duration-200"
                          >
                            {expandedSections[item.id] ? 'Collapse' : 'Expand'}
                            <ChevronDown className={`w-3 h-3 ml-1 transition-transform duration-200 ${
                              expandedSections[item.id] ? 'rotate-180' : ''
                            }`} />
                          </Button>
                        </div>
                      </div>

                      {/* Expanded Details */}
                      {expandedSections[item.id] && (
                        <div className="p-4 bg-emerald-50/40 animate-in slide-in-from-top-2 duration-300">
                          {/* Formula Dependencies */}
                          {isAdvancedMode && item.formulas && item.formulas.length > 0 && (
                            <div className="mb-4">
                              <h4 className="text-sm font-medium text-gray-800 mb-2 flex items-center gap-2">
                                <Type className="w-3 h-3" />
                                Formula Dependencies
                              </h4>
                              <div className="space-y-2">
                                {item.formulas.map((formula, idx) => (
                                  <div key={idx} className="bg-white p-3 rounded border border-emerald-100 text-xs">
                                    <div className="flex items-center justify-between mb-1">
                                      <span className="font-mono bg-blue-50 px-2 py-1 rounded text-blue-700">
                                        {formula.cell}
                                      </span>
                                      <span className="text-gray-500">{formula.description}</span>
                                    </div>
                                    <div className="font-mono text-gray-700 mb-2">{formula.formula}</div>
                                    {formula.dependencies && formula.dependencies.length > 0 && (
                                      <div className="flex items-center gap-1 flex-wrap">
                                        <span className="text-gray-500">Depends on:</span>
                                        {formula.dependencies.map((dep, depIdx) => (
                                          <span key={depIdx} className="bg-yellow-50 text-yellow-700 px-1 py-0.5 rounded text-xs">
                                            {dep}
                                          </span>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Detailed Steps */}
                          {item.detailedSteps && (
                               <div className="mb-4">
                              <h4 className="text-sm font-medium text-gray-800 mb-2 flex items-center gap-2">
                                <FileText className="w-3 h-3" />
                                Execution Steps
                              </h4>
                              <div className="space-y-2 text-xs">
                                {item.detailedSteps.map((step, idx) => (
                                  <div key={step.id} className={`flex items-center justify-between p-2 rounded border transition-all duration-200 ${
                                    stepApprovals[step.id] === 'approved' ? 'bg-green-50 border-green-200' :
                                    stepApprovals[step.id] === 'rejected' ? 'bg-red-50 border-red-200' :
                                    'bg-white border-emerald-100 hover:border-emerald-200'
                                  }`}>
                                    <div className="flex items-start gap-2 flex-1">
                                      <span className={`rounded-full w-5 h-5 flex items-center justify-center text-xs font-medium flex-shrink-0 mt-0.5 transition-colors duration-200 ${
                                        stepApprovals[step.id] === 'approved' ? 'bg-green-100 text-green-700' :
                                        stepApprovals[step.id] === 'rejected' ? 'bg-red-100 text-red-700' :
                                        'bg-blue-100 text-blue-700'
                                      }`}>
                                        {stepApprovals[step.id] === 'approved' ? '✓' :
                                         stepApprovals[step.id] === 'rejected' ? '✗' :
                                         idx + 1}
                                      </span>
                                      <div className="flex-1">
                                        {step.cellRange !== 'N/A' ? (
                                          <button
                                            onClick={() => navigateToCell(step.cellRange)}
                                            className="text-left text-gray-700 hover:text-blue-700 hover:underline transition-colors duration-200 cursor-pointer"
                                          >
                                            {step.description}
                                          </button>
                                        ) : (
                                          <span className="text-gray-700">{step.description}</span>
                                        )}
                                        {step.cellRange !== 'N/A' && (
                                          <div className="text-gray-500 mt-1">
                                            Range: <span className="font-mono bg-gray-100 px-1 rounded">{step.cellRange}</span>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                    
                                    <div className="flex items-center gap-1 ml-2">
                                      {step.canRevert && (
                                        <>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setStepApprovals(prev => ({...prev, [step.id]: 'approved'}))}
                                            className={`h-6 px-2 text-xs hover:scale-105 transition-all duration-200 ${
                                              stepApprovals[step.id] === 'approved' 
                                                ? 'bg-green-100 text-green-700 border border-green-300' 
                                                : 'hover:bg-green-50 text-green-600'
                                            }`}
                                            title="Accept this step"
                                          >
                                            ✓
                                          </Button>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => revertStep(step.id, step.cellRange)}
                                            className={`h-6 px-2 text-xs hover:scale-105 transition-all duration-200 ${
                                              stepApprovals[step.id] === 'rejected' 
                                                ? 'bg-red-100 text-red-700 border border-red-300' 
                                                : 'hover:bg-red-50 text-red-600'
                                            }`}
                                            title="Reject and revert this step"
                                          >
                                            ✗
                                          </Button>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Data Validation Rules */}
                          {isAdvancedMode && item.dataValidation && (
                            <div>
                              <h4 className="text-sm font-medium text-gray-800 mb-2 flex items-center gap-2">
                                <Settings className="w-3 h-3" />
                                Data Validation Rules
                              </h4>
                              <ul className="space-y-1 text-xs">
                                {item.dataValidation.map((rule, idx) => (
                                  <li key={idx} className="flex items-center gap-2 text-gray-700">
                                    <div className="w-1 h-1 bg-green-500 rounded-full"></div>
                                    {rule}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-center text-gray-500 py-8 animate-in fade-in duration-500">
                    <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p>No audit data available. Use Analyst mode to see detailed tool execution.</p>
                  </div>
                )}
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Right insights panel */}
          {showInsights && (
            <div className="pointer-events-auto fixed right-[calc(var(--panel-width,320px)+12px)] bottom-4 z-50 w-[360px] max-w-[90vw] rounded-xl border border-yellow-200 bg-white shadow-[0_10px_30px_-10px_rgba(234,179,8,.35)] animate-in slide-in-from-right-4 duration-300">
              <div className="px-3 py-2 border-b flex items-center justify-between rounded-t-xl bg-yellow-50/60">
                <div className="flex items-center gap-2">
                  <Bug className="w-4 h-4 text-yellow-600" />
                  <span className="text-sm font-medium">Insights</span>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setShowInsights(false)} className="h-7 w-7"><X className="w-4 h-4" /></Button>
              </div>
              <div className="px-3 py-2 flex items-center justify-between">
                <Button variant="outline" size="sm" onClick={scanForErrors} className="flex items-center gap-2"><Rocket className="w-3 h-3" /> Scan</Button>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" onClick={() => setCurrentInsightIndex(i => Math.max(0, i-1))} className="h-7 w-7">⟨</Button>
                  <Button variant="ghost" size="icon" onClick={() => setCurrentInsightIndex(i => Math.min((errorInsights.length-1), i+1))} className="h-7 w-7">⟩</Button>
                </div>
              </div>
              <div className="p-3">
                {(errorInsights.length === 0) ? (
                  <div className="text-xs text-gray-500">No issues detected yet.</div>
                ) : (
                  (() => {
                  const ins = getCurrentInsight();
                  return (
                    <div className={`border rounded p-2 text-xs ${
                      ins.status === 'applied' ? 'bg-green-50 border-green-200' :
                      ins.status === 'ignored' ? 'bg-gray-50 border-gray-200' :
                      ins.severity === 'high' ? 'bg-red-50 border-red-200' : ins.severity === 'medium' ? 'bg-yellow-50 border-yellow-200' : 'bg-white border-gray-200'
                    }`}>
                      <div className="font-medium text-gray-800 flex items-center gap-1">
                        {ins.severity === 'high' ? <AlertTriangle className="w-3 h-3 text-red-600" /> : ins.severity === 'medium' ? <AlertTriangle className="w-3 h-3 text-yellow-600" /> : <CheckCircle2 className="w-3 h-3 text-green-600" />}
                        {ins.title}
                      </div>
                      <div className="text-gray-600 mt-1">{ins.description}</div>
                      <div className="text-gray-500 mt-1">Range: <span className="font-mono bg-gray-100 px-1 rounded">{ins.cellRange}</span></div>
                      <div className="text-gray-700 mt-1">Fix: {ins.suggestion}</div>
                      <div className="mt-2 flex items-center justify-end gap-1">
                        <Button variant="ghost" size="sm" className="h-6 px-2" onClick={() => setShowPreviewModal({visible: true, title: 'Fix Preview', content: ins.suggestion})}>Preview</Button>
                        <Button variant="ghost" size="sm" className="h-6 px-2 text-green-700 hover:bg-green-50" onClick={() => applyInsight(ins.id)} disabled={ins.status !== 'pending'}>Apply</Button>
                        <Button variant="ghost" size="sm" className="h-6 px-2 text-gray-600 hover:bg-gray-50" onClick={() => ignoreInsight(ins.id)} disabled={ins.status !== 'pending'}>Ignore</Button>
                      </div>
                    </div>
                    );
                  })()
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      

      {/* Input Area */}
      <div className="border-t p-4 bg-white/60">
        <div className="flex items-center gap-2 mb-3">
          {/* Attach menu trigger */}
          <div className="relative">
            <Button variant="ghost" size="icon" className="group size-6 hover:bg-emerald-50 text-emerald-700 transition-all duration-150" onClick={() => { setShowSourcesDropdown(!showSourcesDropdown); setSourceMenuOrigin('button') }} title="Attach (@)">
              <AtSign className="draw-on-hover w-3 h-3" />
            </Button>
            {uploadedFiles.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center">{uploadedFiles.length}</span>
            )}
            {showSourcesDropdown && sourceMenuOrigin === 'button' && (
              <div className="absolute top-full left-0 mt-1 bg-white border border-emerald-200 rounded-md shadow-md z-20 w-40 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="py-1 text-[10px]">
                  <button className="w-full text-left px-2 py-1 hover:bg-emerald-50 flex items-center gap-1.5 text-emerald-700" onClick={() => fileInputRef.current?.click()}>
                    <File className="draw-on-hover w-3 h-3" /> External
                  </button>
                  <button className="w-full text-left px-2 py-1 hover:bg-emerald-50 flex items-center gap-1.5 text-emerald-700" onClick={addMockRange}>
                    <BoxSelect className="draw-on-hover w-3 h-3" /> Range
                  </button>
                  <input ref={fileInputRef} type="file" multiple onChange={handleFileUpload} className="hidden" accept=".xlsx,.xls,.csv,.txt,.pdf" />
                </div>
              </div>
            )}
          </div>
          
          {/* Selection chips */}
          <div className="flex items-center gap-1 flex-wrap">
            {selectedRanges.map(r => (
              <span key={r} className="inline-flex items-center gap-1 text-[11px] bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full border border-gray-200">
                <span className="font-mono">{r}</span>
                <button onClick={() => removeRange(r)} className="text-gray-500 hover:text-gray-800">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>

          <div className="flex items-center gap-2 ml-auto relative">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowModeDropdown(!showModeDropdown)}
              className="group flex items-center gap-1.5 h-6 px-2 text-[10px] hover:translate-y-[-1px] transition-all duration-200 border-emerald-300 text-emerald-700 hover:bg-emerald-50"
              title="Agent mode"
            >
              {mode === 'ask' ? (
                <>
                  <Sparkles className="draw-on-hover w-3 h-3" />
                  <span className="group-hover:text-emerald-700">Ask</span>
                </>
              ) : (
                <>
                  <Wrench className="draw-on-hover w-3 h-3" />
                  <span className="group-hover:text-emerald-700">Analyst</span>
                </>
              )}
              <ChevronDown className="w-3 h-3" />
            </Button>
            
            {showModeDropdown && (
              <div className="absolute top-full right-0 mt-1 bg-white border rounded-md shadow-md z-10 animate-in slide-in-from-top-2 duration-200 w-40">
                <button
                  onClick={() => {
                    setMode('ask')
                    setShowModeDropdown(false)
                  }}
                  className={`relative flex w-full items-center gap-1.5 px-2 py-1 text-left text-[10px] hover:bg-gray-50 transition-colors duration-150 ${mode === 'ask' ? 'text-emerald-700 font-semibold' : 'text-gray-700'}`}
                >
                  <span className="relative">
                    <Sparkles className="w-3 h-3" />
                    {mode === 'ask' && <span className="pointer-events-none absolute -inset-1 rounded bg-emerald-200/25 blur-[6px]" />}
                  </span>
                  Ask
                </button>
                <button
                  onClick={() => {
                    setMode('analyst')
                    setShowModeDropdown(false)
                  }}
                  className={`relative flex w-full items-center gap-1.5 px-2 py-1 text-left text-[10px] hover:bg-gray-50 transition-colors duration-150 ${mode === 'analyst' ? 'text-emerald-700 font-semibold' : 'text-gray-700'}`}
                >
                  <span className="relative">
                    <Wrench className="w-3 h-3" />
                    {mode === 'analyst' && <span className="pointer-events-none absolute -inset-1 rounded bg-emerald-200/25 blur-[6px]" />}
                  </span>
                  Analyst
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-end gap-3">
            <div className="group relative flex-1">
              {/* morphing blob instead of clipped orbs */}
              <div className="pointer-events-none absolute -inset-[4px] rounded-[18px] p-[4px] opacity-80 transition-opacity duration-500 group-focus-within:opacity-95">
                <div className="absolute inset-0 rounded-[inherit] overflow-hidden">
                  <div className="absolute inset-[-10%] rounded-[inherit] bg-[radial-gradient(40%_60%_at_50%_50%,rgba(16,185,129,.22),transparent_60%)] animate-[blob_10s_ease-in-out_infinite]" />
                  <div className="absolute inset-[-20%] rounded-[inherit] bg-[conic-gradient(from_0deg,rgba(16,185,129,.0),rgba(16,185,129,.4),rgba(16,185,129,.0))] animate-[spin_8s_linear_infinite,glowPulse_3.2s_ease-in-out_infinite]" />
                </div>
              </div>
              <div className="relative rounded-xl border border-emerald-300/70 bg-white/90 backdrop-blur-sm flex items-end overflow-hidden">
                {/* continuous border shimmer */}
                <div className="pointer-events-none absolute -inset-[1px] rounded-[inherit]" style={{ WebkitMask: 'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)', WebkitMaskComposite: 'xor' as any, maskComposite: 'exclude' as any, padding: 1 }}>
                  <div className="absolute -inset-1 rounded-[inherit] bg-[conic-gradient(from_0deg,transparent,rgba(16,185,129,.4),transparent)] animate-[spin_6s_linear_infinite]" />
                </div>
              <textarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Tell cf0 AI what to build..."
                  className="flex-1 bg-transparent border-none focus:outline-none focus:ring-0 px-3 py-2 text-sm resize-none min-h-[48px] max-h-40 overflow-y-auto placeholder:text-gray-400 focus:shadow-[0_0_0_2px_rgba(16,185,129,0.16)_inset] transition-[box-shadow] duration-500"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSendMessage()
                }
              }}
              disabled={isProcessing}
              rows={1}
              style={{
                height: 'auto',
                minHeight: '48px'
              }}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement
                target.style.height = 'auto'
                target.style.height = Math.min(target.scrollHeight, 160) + 'px'
              }}
            />
            {showSourcesDropdown && sourceMenuOrigin === 'inline' && (
              <div className="absolute left-2 bottom-[calc(100%+6px)] bg-white border border-emerald-200 rounded-md shadow-md z-20 w-44 animate-in fade-in slide-in-from-bottom-2 duration-200">
                <div className="py-1 text-[10px]">
                  <button className="w-full text-left px-2 py-1 hover:bg-emerald-50 flex items-center gap-1.5 text-emerald-700" onClick={() => fileInputRef.current?.click()}>
                    <File className="draw-on-hover w-3 h-3" /> External
                  </button>
                  <button className="w-full text-left px-2 py-1 hover:bg-emerald-50 flex items-center gap-1.5 text-emerald-700" onClick={addMockRange}>
                    <BoxSelect className="draw-on-hover w-3 h-3" /> Range
                  </button>
                </div>
              </div>
            )}
            <Button
              onClick={handleSendMessage}
              size="icon"
              className="relative m-1 h-9 w-9 bg-gradient-to-r from-emerald-600 to-emerald-500 text-white flex-shrink-0 transition-all duration-300 hover:translate-y-[-1px] hover:shadow-[0_12px_28px_-10px_rgba(16,185,129,.65)] active:scale-[0.98]"
              disabled={!inputValue.trim() || isProcessing}
              aria-label="Send message"
            >
              {/* animated accent ring */}
              <span className="pointer-events-none absolute -inset-[2px] rounded-[10px] opacity-80" style={{ WebkitMask: 'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)', WebkitMaskComposite: 'xor' as any, maskComposite: 'exclude' as any, padding: 2 }}>
                <span className={`absolute -inset-1 rounded-[inherit] bg-[conic-gradient(from_0deg,rgba(16,185,129,.0),rgba(16,185,129,1),rgba(16,185,129,.0))] ${(!inputValue.trim() || isProcessing) ? '' : 'animate-[spin_2.2s_linear_infinite]'}`} />
              </span>
              {/* ripple/microinteraction */}
              <span className="pointer-events-none absolute inset-0 rounded-[inherit] overflow-hidden">
                <span className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 size-0 rounded-full bg-white/40 transition-all duration-500 ${(!inputValue.trim() || isProcessing) ? 'opacity-0' : 'group-[button]:active:size-[120%]'}`} />
              </span>
              {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Command palette */}
      {showCommandPalette && (
        <div className="fixed inset-0 bg-black/30 flex items-start justify-center z-50 pt-24" onClick={() => setShowCommandPalette(false)}>
          <div className="bg-white rounded-lg shadow-xl w-[680px] max-w-[95vw]" onClick={(e) => e.stopPropagation()}>
            <div className="px-4 py-3 border-b flex items-center justify-between">
              <div className="text-sm font-medium">Command Palette</div>
              <Button variant="ghost" size="icon" onClick={() => setShowCommandPalette(false)} className="h-7 w-7"><X className="w-4 h-4" /></Button>
            </div>
            <div className="p-3 grid grid-cols-2 gap-2 text-sm">
              {[
                { label: 'Explain selection', action: () => setInputValue('Explain the selected calculation') },
                { label: 'Trace errors', action: scanForErrors },
                { label: 'Generate chart', action: () => setInputValue('Create a chart of monthly revenue vs COGS with a legend and title') },
                { label: 'Validate model', action: () => setInputValue('Validate that all totals and percentages are consistent with industry ranges') },
                { label: 'Format professionally', action: () => setInputValue('Apply professional formatting: currency, percentage, headers bold, borders') },
                { label: 'Add data validation', action: () => setInputValue('Add data validation to revenue inputs to allow only non-negative values') },
              ].map(cmd => (
                <button key={cmd.label} onClick={() => { cmd.action(); setShowCommandPalette(false) }} className="p-3 rounded border hover:bg-gray-50 text-left">
                  {cmd.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Lightweight preview modal */}
      {showPreviewModal.visible && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={() => setShowPreviewModal({visible: false})}>
          <div className="bg-white rounded-lg shadow-lg w-[520px] max-w-[90vw]" onClick={(e) => e.stopPropagation()}>
            <div className="px-4 py-2 border-b flex items-center justify-between">
              <div className="text-sm font-medium">{showPreviewModal.title}</div>
              <Button variant="ghost" size="icon" onClick={() => setShowPreviewModal({visible: false})} className="h-7 w-7"><X className="w-4 h-4" /></Button>
            </div>
            <div className="p-4 text-sm text-gray-700 whitespace-pre-wrap">
              {showPreviewModal.content}
            </div>
            <div className="px-4 py-2 border-t flex items-center justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowPreviewModal({visible: false})}>Close</Button>
              <Button variant="default" size="sm" onClick={() => setShowPreviewModal({visible: false})}>Looks good</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
