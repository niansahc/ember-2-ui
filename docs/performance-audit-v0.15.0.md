# Frontend Performance Audit — pre-v0.15.0

Date: 2026-04-12

## 1. Bundle Size

| Asset | Size |
|---|---|
| JS (single chunk) | 530 KB |
| CSS | 67 KB |
| Ember mascot PNG | 1.3 MB |

No code splitting — all components in one JS bundle. Shepherd.js (~100 KB) bundles unconditionally even when the tour is already complete and will never run again. Settings.jsx (1,357 lines) and Sidebar.jsx (794 lines) are the largest components.

## 2. Initial Load — Splash to Chat

Sequential blocking chain:
1. `checkConnection()` → `GET /api/health` (5s timeout)
2. 600ms artificial delay in Splash before calling `onConnected`
3. `realGetModel()` called again in `handleConnected` (redundant — Splash already got the model from health check)
4. `localStorage.getItem('ember_active_session')` → if found, `loadConversation(sessionId)` blocks chat render until conversation history returns

Total: 2 sequential API calls + 600ms delay + optional 3rd fetch before user sees chat.

## 3. Unnecessary Re-renders

- **App.jsx**: 18 `useState` calls. Any modal open/close triggers a full re-render of all 6 modal components + Chat.
- **Settings.jsx**: 40 `useState` calls. 6 parallel API calls fire on every `isOpen` change (model, providers, preferences, PIN status, disk encryption, developer status, lodestone). Every toggle flips state and re-renders the entire 1,357-line component.
- **MessageBubble**: No `React.memo` — every message re-renders on any `messages` array change.
- **Sidebar**: Re-renders on every `messages.length` change via Chat reflow.

## 4. Blocking Calls

- `localStorage.getItem` in `handleConnected` — synchronous in the critical path but fast.
- Sidebar conversation list fetch blocks sidebar render until API returns (useEffect at mount).
- `useChat.js` reconstructs the full message array on every send. With multi-image support, base64 encoding adds overhead via FileReader.
- No heavy JSON parsing or synchronous fetch patterns found.

## 5. Polling Overhead

| Source | Interval | Endpoint | Requests/min |
|---|---|---|---|
| ServiceStatus | 15s | `GET /api/health` | 4 |
| Sidebar tasks | 30s | `GET /v1/tasks` (x2: active + proposed) | 4 |
| Idle timeout | continuous | 4 DOM listeners (mousemove, keydown, click, touchstart) | n/a |

Combined: ~8 API requests/min from background polling. Idle timeout re-binds all 4 DOM listeners on every mouse move.

---

## Top 3 Issues — Ranked by Impact

### 1. Settings re-render storm (Critical)

**Problem**: 40 state variables, 6 API calls on every open, full re-render on every toggle. Opening Settings is the most expensive user action in the app.

**Fix**: Extract Settings state into `useReducer` to batch updates. Wrap Settings in `React.memo`. Defer non-visible tab API calls — only fetch lodestone when Memory tab is active, only fetch developer status when Developer tab is active.

### 2. Sequential boot chain (High)

**Problem**: Splash → health check → 600ms delay → redundant model fetch → optional conversation load. Users wait ~1.5-2s minimum before seeing chat, longer with a saved session.

**Fix**: Drop the redundant `realGetModel()` in `handleConnected` — Splash already provides the model. Reduce the 600ms Splash delay to 200ms (it's cosmetic). Parallelize `loadConversation()` with the view transition using `React.Suspense` so the chat shell renders immediately while messages stream in.

### 3. Idle timeout DOM listener churn (Medium)

**Problem**: `useIdleTimeout` registers 4 DOM event listeners (mousemove, keydown, click, touchstart) and re-binds them on every activity detection. On high-DPI displays with frequent mousemove events, this creates measurable overhead.

**Fix**: Debounce the activity handler — a single 1s debounced listener instead of 4 raw listeners re-bound per event. Or use a single `pointerdown` listener (covers mouse + touch) with passive flag.

---

## Not Prioritized (Low Impact)

- **Code splitting**: Would reduce initial JS from 530 KB but Vite's gzip output is 159 KB — acceptable for a local-first app that doesn't serve over CDN. Worth revisiting if the bundle grows past 800 KB.
- **Shepherd.js tree-shaking**: ~100 KB for a library used exactly once per user lifetime. Could lazy-load it behind `React.lazy` but the ROI is low.
- **Mascot PNG**: 1.3 MB uncompressed but cached after first load. Could convert to WebP (~300 KB) but low priority for a local app.
