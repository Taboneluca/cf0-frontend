### Button Catalog and Backend Integration Notes

- id: `btn_new_chat`
  - label: New chat
  - location: Header right, next to minimize/close
  - component: `Button` variant="ghost" size="icon"
  - icon: `MessageSquare`
  - purpose: Start a fresh conversation while keeping the current workbook open. Clears local chat state so the user can pivot tasks without cross-contaminating context.
  - behavior (frontend): Opens a new conversation context in UI; resets `messages`, `auditData`, and related state.
  - expected backend hook:
    - POST /api/chat/sessions (create new chat thread)
    - Response contains `sessionId`; store on client for subsequent messages
  - telemetry: event `new_chat_clicked` with timestamp, previous session id
  - state deps: none (works even if processing)

- id: `btn_minimize_panel`
  - label: Minimize
  - location: Header right
  - component: `Button` variant="ghost" size="icon"
  - icon: `Minimize2`
  - purpose: Collapse the assistant into a movable widget so users can keep working in the sheet with more space.
  - behavior (frontend): Sets `isMinimized=true` and preserves drag position.
  - backend: none

- id: `btn_close_panel`
  - label: Close
  - location: Header right
  - component: `Button` variant="ghost" size="icon`
  - icon: `X`
  - purpose: Dismiss the assistant UI. In production this should close/archival-mark the session.
  - behavior (frontend): For MVP, no-op or hides panel. In production, should end session.
  - expected backend hook:
    - POST /api/chat/sessions/{sessionId}/close (optional)

- id: `btn_model_selector`
  - label: Model
  - location: Header center (tiny model selector); also in minimized widget
  - component: `Button` variant="outline" size="sm`
  - icon: `ChevronDown` (caret only)
  - purpose: Choose the LLM provider/model used to process subsequent turns. Allows cost/capability tradeoffs per task.
  - behavior (frontend): Toggles `showModelMenu`. Selecting option updates `provider`/`model` pair.
  - expected backend hook:
    - PATCH /api/chat/sessions/{sessionId} body: { provider, model }
    - Should apply to subsequent turns; server validates model availability
  - notes: UI shows `providerOptions` and `modelOptions` mapping.

- id: `btn_snapshot`
  - label: Snapshot
  - location: Top controls right side
  - component: `Button` variant="outline" size="sm`
  - icon: `Undo2`
  - purpose: Capture a version of the workbook for time-travel and auditability before/after assistant actions.
  - behavior (frontend): Calls `createSnapshot(label)`; appends to `versions` timeline.
  - expected backend hook:
    - POST /api/workbooks/{workbookId}/snapshots body: { label }
    - Returns snapshot id; store in `versions` and set `activeVersionId`

- id: `btn_insights_toggle`
  - label: Insights
  - location: Top controls right side
  - component: `Button` variant="ghost" size="icon" green-themed with draw-on-hover
  - icon: `Bug`
  - purpose: Open/close the Insights side panel. The panel surfaces detected issues (broken links, inconsistent formats, missing validations) and provides one-click Apply/Ignore fixes.
  - behavior (frontend): Toggles `showInsights`; panel renders error insights and actions.
  - expected backend hooks:
    - POST /api/insights/scan body: { workbookContext, sessionId } → list of insights
    - POST /api/insights/{id}/apply → marks applied, returns patch
    - POST /api/insights/{id}/ignore → marks ignored

- id: `btn_mode_selector`
  - label: Agent mode (Ask/Analyst)
  - location: Input toolbar (top right) and in minimized widget over input
  - component: `Button` variant="outline" size="sm` green-themed with `Sparkles` or `Wrench`
  - icon: `Sparkles` for Ask, `Wrench` for Analyst; caret `ChevronDown`
  - purpose: Switch between Ask (read/explain/insight-only) and Analyst (plan, edit, validate, explain) modes without losing the active conversation context.
  - behavior (frontend): Toggles `showModeDropdown`; selecting changes `mode`. In Analyst, app also shows plan and audit trail.
  - expected backend impacts:
    - PATCH /api/chat/sessions/{sessionId} body: { mode }
    - Mode redirects tool router server-side (Ask: read-only tools; Analyst: read/write + planning)

- id: `btn_sources_trigger`
  - label: Sources (@)
  - location: Input toolbar left
  - component: `Button` variant="ghost" size="icon` green-themed with draw-on-hover
  - icon: `AtSign`
  - purpose: Attach external files or workbook ranges as explicit context for the next message, improving grounding and tool accuracy.
  - behavior (frontend): Toggles sources dropdown (External file upload, Range selection).
  - expected backend hooks:
    - POST /api/files (upload) multipart; returns fileId
    - POST /api/chat/sessions/{sessionId}/context body: { fileId | range }

- id: `btn_send_message`
  - label: Send
  - location: Right edge of input composer (full and mini)
  - component: `Button` size="icon` gradient background with animated ring and loader when processing
  - icon: `Send` or `Loader2` when `isProcessing`
  - purpose: Submit the user’s prompt (and any attached context) to the active session; initiates thinking/plan/answer pipeline.
  - behavior (frontend): Calls `handleSendMessage`; pushes user message, shows thinking, then responses.
  - expected backend hook:
    - POST /api/chat/sessions/{sessionId}/messages body: { role: 'user', content, context }
    - Server streams assistant tokens and tool events; client maps to system messages and audit data when in Analyst
  - telemetry: event `message_sent` with tokens estimate and attachments count

- id: `btn_audit_accept_tool`
  - label: Accept (per tool)
  - location: Audit panel tool header
  - component: inline button (custom styles)
  - purpose: Approve a tool’s proposed change set (e.g., formatting, formulas, validations) so the agent proceeds or commits them.
  - behavior: Sets tool approval to approved; may emit worksheet changes.
  - expected backend hook:
    - POST /api/tools/{toolId}/approve body: { sessionId }

- id: `btn_audit_reject_tool`
  - label: Reject (per tool)
  - location: Audit panel tool header
  - component: inline button
  - purpose: Reject a tool’s change set; agent should either revert those edits or plan an alternative path.
  - behavior: Sets tool approval to rejected; may revert changes.
  - expected backend hook:
    - POST /api/tools/{toolId}/reject body: { sessionId }

- id: `btn_step_accept` / `btn_step_reject`
  - label: ✓ / ✗ (per step)
  - location: Audit panel → Execution Steps
  - purpose: Fine-grained approval control. Accept allows the agent to continue; Reject reverts that specific step when possible.
  - behavior: Marks step approval and optionally calls revert.
  - expected backend hook:
    - POST /api/tools/steps/{stepId}/approve | /reject

- id: `btn_preview_modal_close`
  - label: Close (preview)
  - location: Preview modal header/footer
  - component: `Button` variant="ghost" | `outline`
  - purpose: Dismiss the preview dialog after inspecting a proposed fix or change.
  - behavior: Closes preview modal.
  - backend: none

- id: `btn_command_palette_toggle`
  - label: Command Palette
  - location: Overlay (Cmd/Ctrl+K)
  - component: internal
  - purpose: Quick-start common tasks by inserting prebuilt prompts (explain selection, trace errors, generate chart, validate model, etc.).
  - behavior: Opens quick actions; sets common prompts.
  - backend: none; can call same endpoints as send message once executed.

---

### Feature mapping to cf0.ai MVP
- Ask vs Analyst
  - Ask buttons (`btn_mode_selector`, `btn_send_message`) send to read-only toolchain; Analyst switches to planning/audit-enabled chain. Server should preserve conversational context between modes (see mvp.txt line 11).
- Insights
  - `btn_insights_toggle` controls the insights panel that orchestrates scan/apply/ignore endpoints (mvp points 1, 6).
- Sources
  - `btn_sources_trigger` supports external files and range selection (mvp point 3). Upload returns `fileId` used as chat context.
- Snapshots
  - `btn_snapshot` aligns with versioning and safe iteration while building models.
- Analyst approvals
  - Accept/Reject for tools and steps allow controlled execution (mvp point 7), enabling revert semantics and auditability.

### Event and state contracts
- Add `data-button-id` attributes at render-time to each control (id values listed above) to simplify telemetry and QA.
- Session-scoped endpoints require `sessionId` (created via new chat). Mode/model updates are session-level and should not reset the message history.
- Send/stream contract: the send action should open a stream (SSE/WebSocket) yielding records like:
  - `{ type: 'thinking', thoughtId, startedAt }`
  - `{ type: 'assistant', content, delta? }`
  - `{ type: 'tool', name, status, payload }`
  - `{ type: 'audit', items:[...] }`
  Client maps these into the UI’s thinking → summary → messages and Analyst audit trail.

### Audit feature overview (how it works and why)
- Purpose: Provide stepwise transparency and control over agent actions in Analyst mode, matching finance workflows that demand traceability and reversibility.
- Flow:
  1) Agent constructs a plan (displayed as chips). 2) Each executed tool creates an Audit item containing: action summary, detailed steps, affected cells, created/updated formulas, and data validation rules. 3) User may Approve/Reject each tool or individual steps. 4) Rejections can trigger targeted reverts.
- What users achieve:
  - See exactly what changed and why; jump to ranges; enforce internal controls before committing changes.
- Backend responsibilities:
  - Persist audit items per session/worksheet; support revert endpoints; maintain a deterministic order of operations; return minimal patches to apply in the client.

