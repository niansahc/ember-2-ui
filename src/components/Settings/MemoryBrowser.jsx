/**
 * MemoryBrowser — read-only vault inspection panel (Settings > Memory tab).
 *
 * Makes the vault legible: browse records by type with counts, keyword and
 * semantic search, and a preview of what a message would actually retrieve
 * via the real context-assembly pipeline. Backed entirely by existing
 * endpoints (read-memories, search-memories, semantic-search, debug-context)
 * — no backend changes.
 *
 * Deliberately does not show tier/authorship in Browse or Keyword Search:
 * those columns live only in the SQLite vector index and are never written
 * to the canonical JSON record those two endpoints read from. They only
 * exist for Semantic Search (SQLite-backed types only) and Preview.
 *
 * Read-only. No record content or query text is ever logged, cached beyond
 * component state, or sent anywhere but these four endpoints.
 */
import { useState, useEffect, useCallback, memo } from 'react'
import {
  readMemories,
  searchMemories,
  semanticSearch,
  debugContext,
} from '../../api/ember.js'
import { parseEmberTimestamp } from '../../utils/parseTimestamp.js'
import Segmented from './Segmented.jsx'

// Mirrors src/memory/storage.py VALID_MEMORY_TYPES. Must be kept in sync
// manually — same convention as the CLOUD_MODELS hardcoded copy above.
const MEMORY_TYPES = [
  'profile', 'journal', 'conversation', 'reflection', 'summary', 'state',
  'task', 'project', 'reference', 'ingested', 'archive', 'system_event',
  'decision', 'review_log', 'evaluation', 'session', 'lodestone', 'deviation',
]

const COUNT_LIMIT = 500
const PAGE_SIZE = 20

function formatTimestamp(ts) {
  if (!ts) return null
  const d = parseEmberTimestamp(ts)
  return d ? d.toLocaleString() : ts
}

function ProvenanceChip({ sourceRecordIds }) {
  if (!Array.isArray(sourceRecordIds) || sourceRecordIds.length === 0) return null
  return (
    <span className="memory-browser-provenance" title={sourceRecordIds.join(', ')}>
      Derived from {sourceRecordIds.length} source{sourceRecordIds.length === 1 ? '' : 's'}
    </span>
  )
}

function TierBadge({ tier }) {
  if (!tier) return null
  return <span className={`memory-browser-badge memory-browser-badge-${tier}`}>{tier}</span>
}

/** Card for a raw canonical JSON record (read-memories / search-memories). No tier/authorship — not present on this shape. */
function RawRecordCard({ record }) {
  const ts = formatTimestamp(record.timestamp || record.created_at)
  return (
    <div className="memory-browser-card">
      <div className="memory-browser-card-header">
        <span className="memory-browser-type">{record.type}</span>
        {ts && <span className="memory-browser-timestamp">{ts}</span>}
      </div>
      <p className="memory-browser-text">{record.text}</p>
      <div className="memory-browser-card-footer">
        {record.source && <span className="memory-browser-source">{record.source}</span>}
        <ProvenanceChip sourceRecordIds={record.metadata?.source_record_ids} />
      </div>
    </div>
  )
}

/** Card for a scored result (semantic-search / debug-context). Tier/authorship shown only when present. */
function ScoredRecordCard({ result }) {
  const ts = formatTimestamp(result.created_at || result.timestamp)
  return (
    <div className="memory-browser-card">
      <div className="memory-browser-card-header">
        <span className="memory-browser-type">{result.memory_type || result.item_type}</span>
        {ts && <span className="memory-browser-timestamp">{ts}</span>}
        {result.score != null && (
          <span className="memory-browser-score">{result.score.toFixed(3)}</span>
        )}
      </div>
      <p className="memory-browser-text">{result.content}</p>
      <div className="memory-browser-card-footer">
        <TierBadge tier={result.tier} />
        {result.authorship && result.authorship !== 'unknown' && (
          <span className="memory-browser-badge">{result.authorship}</span>
        )}
        {result.source && <span className="memory-browser-source">{result.source}</span>}
        <ProvenanceChip sourceRecordIds={result.metadata?.source_record_ids} />
      </div>
    </div>
  )
}

const VIEW_OPTIONS = [
  { id: 'browse', name: 'Browse' },
  { id: 'search', name: 'Search' },
  { id: 'preview', name: 'Preview' },
]

const SEARCH_MODE_OPTIONS = [
  { id: 'keyword', name: 'Keyword' },
  { id: 'semantic', name: 'Semantic' },
]

function MemoryBrowser({ active }) {
  const [expanded, setExpanded] = useState(false)
  const [view, setView] = useState('browse')

  // Browse
  const [typeData, setTypeData] = useState({})   // { [type]: { records, loading, error } }
  const [selectedType, setSelectedType] = useState(null)
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const [countsLoaded, setCountsLoaded] = useState(false)

  // Search
  const [searchMode, setSearchMode] = useState('keyword')
  const [searchType, setSearchType] = useState('journal')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState(null)
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchError, setSearchError] = useState('')

  // Preview
  const [previewMessage, setPreviewMessage] = useState('')
  const [previewResult, setPreviewResult] = useState(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewError, setPreviewError] = useState('')

  const loadCounts = useCallback(async () => {
    setCountsLoaded(true)
    await Promise.all(
      MEMORY_TYPES.map(async (type) => {
        setTypeData((prev) => ({ ...prev, [type]: { ...(prev[type] || {}), loading: true } }))
        const result = await readMemories(type, COUNT_LIMIT)
        setTypeData((prev) => ({
          ...prev,
          [type]: result
            ? { records: result.memories || [], loading: false, error: null }
            : { records: [], loading: false, error: 'Failed to load' },
        }))
      })
    )
  }, [])

  useEffect(() => {
    if (active && expanded && view === 'browse' && !countsLoaded) {
      loadCounts()
    }
  }, [active, expanded, view, countsLoaded, loadCounts])

  const handleSelectType = (type) => {
    setSelectedType(type)
    setVisibleCount(PAGE_SIZE)
  }

  const handleSearchSubmit = async (e) => {
    e.preventDefault()
    if (!searchQuery.trim()) return
    setSearchLoading(true)
    setSearchError('')
    setSearchResults(null)
    const result = searchMode === 'keyword'
      ? await searchMemories(searchQuery, searchType, PAGE_SIZE)
      : await semanticSearch(searchQuery, { limit: PAGE_SIZE, memoryType: searchType === 'all' ? undefined : searchType })
    setSearchLoading(false)
    if (!result) {
      setSearchError('Search failed — try again.')
      return
    }
    setSearchResults(result.results || result.memories || [])
  }

  const handlePreviewSubmit = async (e) => {
    e.preventDefault()
    if (!previewMessage.trim()) return
    setPreviewLoading(true)
    setPreviewError('')
    setPreviewResult(null)
    const result = await debugContext(previewMessage)
    setPreviewLoading(false)
    if (!result) {
      setPreviewError('Preview failed — try again.')
      return
    }
    setPreviewResult(result)
  }

  const selected = selectedType ? typeData[selectedType] : null

  return (
    <div className="memory-browser">
      <button
        type="button"
        className="settings-link-btn memory-browser-expand-btn"
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
        data-testid="memory-browser-expand"
      >
        <svg
          width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="2" strokeLinecap="round" aria-hidden="true"
          className={`lodestone-expand-icon ${expanded ? 'lodestone-expand-icon-open' : ''}`}
        >
          <polyline points="9 18 15 12 9 6" />
        </svg>
        Browse Vault
      </button>

      {expanded && (
        <div className="memory-browser-panel">
          <div className="settings-segmented memory-browser-view-tabs" role="radiogroup" aria-label="Memory browser view">
            {VIEW_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                className={`settings-segmented-btn ${view === opt.id ? 'settings-segmented-btn-active' : ''}`}
                onClick={() => setView(opt.id)}
                role="radio"
                aria-checked={view === opt.id}
              >
                {opt.name}
              </button>
            ))}
          </div>

          {view === 'browse' && (
            <div className="memory-browser-browse">
              <div className="memory-browser-type-chips">
                {MEMORY_TYPES.map((type) => {
                  const data = typeData[type]
                  const count = data?.records?.length
                  const capped = count === COUNT_LIMIT
                  return (
                    <button
                      key={type}
                      type="button"
                      className={`memory-browser-chip ${selectedType === type ? 'memory-browser-chip-active' : ''}`}
                      onClick={() => handleSelectType(type)}
                      data-testid={`memory-type-chip-${type}`}
                    >
                      {type}
                      <span className="memory-browser-chip-count">
                        {data?.loading ? '…' : data?.error ? '—' : `${count ?? 0}${capped ? '+' : ''}`}
                      </span>
                    </button>
                  )
                })}
              </div>

              {selectedType === 'ingested' && (
                <p className="memory-browser-note">
                  This count reflects JSON records only. The bulk of ingested content lives in the
                  SQLite index and is only reachable via Search or Preview.
                </p>
              )}

              {selected?.error && <p className="lodestone-empty">{selected.error}</p>}
              {selected && !selected.error && selected.records.length === 0 && !selected.loading && (
                <p className="lodestone-empty">No records of this type.</p>
              )}

              {selected && selected.records.slice(0, visibleCount).map((record) => (
                <RawRecordCard key={record.id || record.timestamp} record={record} />
              ))}

              {selected && selected.records.length > visibleCount && (
                <button
                  type="button"
                  className="settings-action-btn"
                  onClick={() => setVisibleCount((n) => n + PAGE_SIZE)}
                >
                  Show more
                </button>
              )}
            </div>
          )}

          {view === 'search' && (
            <div className="memory-browser-search">
              <Segmented
                value={searchMode}
                options={SEARCH_MODE_OPTIONS}
                onChange={(mode) => { setSearchMode(mode); setSearchResults(null); setSearchError('') }}
                label="Search mode"
              />

              <form onSubmit={handleSearchSubmit} className="memory-browser-search-form">
                <select
                  className="memory-browser-type-select"
                  value={searchType}
                  onChange={(e) => setSearchType(e.target.value)}
                  aria-label="Memory type"
                >
                  {searchMode === 'semantic' && <option value="all">All types</option>}
                  {MEMORY_TYPES.map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
                <input
                  type="text"
                  className="memory-browser-search-input"
                  placeholder="Search the vault..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <button type="submit" className="settings-action-btn" disabled={searchLoading}>
                  {searchLoading ? 'Searching…' : 'Search'}
                </button>
              </form>

              {searchError && <p className="lodestone-empty">{searchError}</p>}
              {searchResults && searchResults.length === 0 && <p className="lodestone-empty">No matches.</p>}
              {searchResults && searchResults.map((result, i) => (
                searchMode === 'semantic'
                  ? <ScoredRecordCard key={result.id || i} result={result} />
                  : <RawRecordCard key={result.id || i} record={result} />
              ))}
            </div>
          )}

          {view === 'preview' && (
            <div className="memory-browser-preview">
              <p className="memory-browser-note">
                Shows what Ember would retrieve for this message, using the real retrieval
                pipeline. Nothing is sent to Ember and nothing is written to the vault. A message
                that would normally trigger a web search will do so here too.
              </p>
              <form onSubmit={handlePreviewSubmit} className="memory-browser-search-form">
                <input
                  type="text"
                  className="memory-browser-search-input"
                  placeholder="What would this message retrieve?"
                  value={previewMessage}
                  onChange={(e) => setPreviewMessage(e.target.value)}
                />
                <button type="submit" className="settings-action-btn" disabled={previewLoading}>
                  {previewLoading ? 'Previewing…' : 'Preview'}
                </button>
              </form>

              {previewError && <p className="lodestone-empty">{previewError}</p>}

              {previewResult && (
                <>
                  {(previewResult.memory_items || []).length === 0 &&
                    (previewResult.reflection_items || []).length === 0 && (
                    <p className="lodestone-empty">Nothing would be retrieved for this message.</p>
                  )}
                  {(previewResult.reflection_items || []).map((item, i) => (
                    <ScoredRecordCard key={item.id || `refl-${i}`} result={item} />
                  ))}
                  {(previewResult.memory_items || []).map((item, i) => (
                    <ScoredRecordCard key={item.id || `mem-${i}`} result={item} />
                  ))}
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default memo(MemoryBrowser)
