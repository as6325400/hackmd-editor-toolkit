(() => {
  const REQUEST_EVENT = 'hackmd-resize-toolkit:request'
  const RESPONSE_EVENT = 'hackmd-resize-toolkit:response'
  const SOURCE_HIGHLIGHT_STYLE_ID = 'hackmd-source-locator-style'
  const SOURCE_HIGHLIGHT_CLASS = 'hackmd-source-locator-line'
  const SOURCE_HIGHLIGHT_TEXT_CLASS = 'hackmd-source-locator-text'

  let activeSourceHighlightLines = []

  function getEditorHandle() {
    const candidates = Array.from(document.querySelectorAll('.CodeMirror, .ui-edit-area, textarea'))

    for (const element of candidates) {
      for (const key of ['CodeMirror', 'cm', 'editor']) {
        const candidate = element[key]
        if (isEditorLike(candidate)) {
          return candidate
        }
      }
    }

    if (isEditorLike(window.editor)) return window.editor
    if (isEditorLike(window.cm)) return window.cm
    if (isEditorLike(window.CodeMirror)) return window.CodeMirror

    return null
  }

  function isEditorLike(value) {
    return value && typeof value.getValue === 'function' && typeof value.setValue === 'function'
  }

  function getCursor(editor) {
    return typeof editor.getCursor === 'function' ? editor.getCursor() : null
  }

  function getScrollInfo(editor) {
    return typeof editor.getScrollInfo === 'function' ? editor.getScrollInfo() : null
  }

  function getPreviewScroller() {
    return document.querySelector('.ui-view-area') || document.querySelector('.ui-scrollable')
  }

  function getEditorScroller() {
    return document.querySelector('.ui-edit-area .CodeMirror-scroll') || document.querySelector('.CodeMirror-scroll')
  }

  function captureUiState(editor) {
    const previewScroller = getPreviewScroller()
    const editorScroller = getEditorScroller()

    return {
      cursor: getCursor(editor),
      editorScroll: getScrollInfo(editor),
      editorScrollerLeft: editorScroller ? editorScroller.scrollLeft : null,
      editorScrollerTop: editorScroller ? editorScroller.scrollTop : null,
      pageScrollX: window.scrollX,
      pageScrollY: window.scrollY,
      previewScrollTop: previewScroller ? previewScroller.scrollTop : null,
      previewScrollLeft: previewScroller ? previewScroller.scrollLeft : null,
    }
  }

  function restoreScroll(editor, scrollInfo) {
    if (!scrollInfo || typeof editor.scrollTo !== 'function') {
      return
    }

    editor.scrollTo(scrollInfo.left, scrollInfo.top)
  }

  function restoreCursor(editor, cursor) {
    if (!cursor || typeof editor.setCursor !== 'function') {
      return
    }

    editor.setCursor(cursor)
  }

  function applyUiState(editor, state) {
    restoreScroll(editor, state.editorScroll)
    restoreCursor(editor, state.cursor)

    const editorScroller = getEditorScroller()
    if (editorScroller && state.editorScrollerTop !== null && state.editorScrollerLeft !== null) {
      editorScroller.scrollTop = state.editorScrollerTop
      editorScroller.scrollLeft = state.editorScrollerLeft
    }

    const previewScroller = getPreviewScroller()
    if (previewScroller && state.previewScrollTop !== null && state.previewScrollLeft !== null) {
      previewScroller.scrollTop = state.previewScrollTop
      previewScroller.scrollLeft = state.previewScrollLeft
    }

    window.scrollTo(state.pageScrollX, state.pageScrollY)
  }

  function restoreUiState(editor, state) {
    applyUiState(editor, state)
    requestAnimationFrame(() => applyUiState(editor, state))
    window.setTimeout(() => applyUiState(editor, state), 0)
    window.setTimeout(() => applyUiState(editor, state), 50)
  }

  function posFromIndex(text, index) {
    const safeIndex = Math.max(0, Math.min(index, text.length))
    const chunk = text.slice(0, safeIndex)
    const lines = chunk.split('\n')
    return {
      line: lines.length - 1,
      ch: lines.at(-1)?.length ?? 0,
    }
  }

  function indexFromPos(text, pos) {
    if (!pos || typeof pos.line !== 'number' || typeof pos.ch !== 'number') {
      return text.length
    }

    const lines = text.split('\n')
    const line = Math.max(0, Math.min(pos.line, lines.length - 1))
    let index = 0

    for (let currentLine = 0; currentLine < line; currentLine += 1) {
      index += lines[currentLine].length + 1
    }

    return index + Math.max(0, Math.min(pos.ch, lines[line].length))
  }

  function injectSourceHighlightStyle() {
    if (document.getElementById(SOURCE_HIGHLIGHT_STYLE_ID)) {
      return
    }

    const style = document.createElement('style')
    style.id = SOURCE_HIGHLIGHT_STYLE_ID
    style.textContent = `
      .CodeMirror .${SOURCE_HIGHLIGHT_CLASS} {
        background: rgba(250, 204, 21, 0.18);
        box-shadow: inset 3px 0 0 rgba(250, 204, 21, 0.95);
      }

      .CodeMirror .${SOURCE_HIGHLIGHT_TEXT_CLASS} {
        background: rgba(250, 204, 21, 0.28);
      }
    `
    document.head.append(style)
  }

  function clearMarkdownSourceHighlight(editor) {
    if (!editor || typeof editor.removeLineClass !== 'function') {
      activeSourceHighlightLines = []
      return
    }

    activeSourceHighlightLines.forEach((lineHandle) => {
      editor.removeLineClass(lineHandle, 'background', SOURCE_HIGHLIGHT_CLASS)
      editor.removeLineClass(lineHandle, 'text', SOURCE_HIGHLIGHT_TEXT_CLASS)
    })
    activeSourceHighlightLines = []
  }

  function locateMarkdownSource(editor, payload) {
    clearMarkdownSourceHighlight(editor)

    const context = normalizeLocatePayload(payload)

    if (!context.text || typeof editor.getValue !== 'function' || typeof editor.addLineClass !== 'function') {
      return false
    }

    const markdown = editor.getValue()
    const lines = markdown.split('\n')
    const matches = findBestMarkdownLines(lines, context)

    if (!matches.length) {
      return false
    }

    injectSourceHighlightStyle()
    activeSourceHighlightLines = matches.map((line) => {
      editor.addLineClass(line, 'text', SOURCE_HIGHLIGHT_TEXT_CLASS)
      return editor.addLineClass(line, 'background', SOURCE_HIGHLIGHT_CLASS)
    })

    if (typeof editor.scrollIntoView === 'function') {
      editor.scrollIntoView({ line: matches[0], ch: 0 }, 120)
    }

    return true
  }

  function normalizeLocatePayload(payload) {
    if (typeof payload === 'string') {
      return {
        afterText: '',
        beforeText: '',
        blockText: '',
        text: payload,
      }
    }

    return {
      afterText: payload?.afterText ?? '',
      beforeText: payload?.beforeText ?? '',
      blockText: payload?.blockText ?? '',
      text: payload?.text ?? '',
    }
  }

  function findBestMarkdownLines(lines, context) {
    const normalizedSelection = normalizeForSourceMatch(context.text)

    if (normalizedSelection.length < 2) {
      return []
    }

    const indexedMatch = findIndexedMarkdownMatch(lines, {
      afterText: normalizeForSourceMatch(context.afterText),
      beforeText: normalizeForSourceMatch(context.beforeText),
      blockText: normalizeForSourceMatch(context.blockText),
      text: normalizedSelection,
    })
    if (indexedMatch === null) {
      return []
    }

    if (indexedMatch.length) {
      return indexedMatch
    }

    const exactWindowMatch = findExactWindowMatch(lines, normalizedSelection)
    if (exactWindowMatch.length) {
      return exactWindowMatch
    }

    const scored = lines
      .map((line, index) => ({
        index,
        score: scoreMarkdownLine(line, normalizedSelection),
      }))
      .filter((entry) => entry.score > 0.34)
      .sort((a, b) => b.score - a.score)

    if (!scored.length) {
      return []
    }

    const bestScore = scored[0].score
    return scored
      .filter((entry) => entry.score >= Math.max(0.42, bestScore - 0.12))
      .slice(0, 5)
      .map((entry) => entry.index)
      .sort((a, b) => a - b)
  }

  function findIndexedMarkdownMatch(lines, context) {
    const indexed = buildNormalizedMarkdownIndex(lines)
    const matches = findAllMatchIndexes(indexed.normalized, context.text)

    if (!matches.length) {
      return []
    }

    const matchIndex = matches.length === 1 ? matches[0] : chooseBestContextMatch(indexed.normalized, matches, context)

    if (typeof matchIndex !== 'number') {
      return null
    }

    return linesFromIndexedMatch(indexed, matchIndex, context.text.length)
  }

  function findAllMatchIndexes(normalizedMarkdown, normalizedSelection) {
    const matches = []
    let searchFrom = 0

    while (searchFrom < normalizedMarkdown.length) {
      const matchIndex = normalizedMarkdown.indexOf(normalizedSelection, searchFrom)

      if (matchIndex === -1) {
        break
      }

      matches.push(matchIndex)
      searchFrom = matchIndex + Math.max(1, normalizedSelection.length)
    }

    return matches
  }

  function chooseBestContextMatch(normalizedMarkdown, matches, context) {
    const scored = matches
      .map((matchIndex) => ({
        matchIndex,
        score: scoreContextMatch(normalizedMarkdown, matchIndex, context),
      }))
      .sort((a, b) => b.score - a.score)

    if (!scored.length || scored[0].score <= 0) {
      return null
    }

    if (scored.length > 1 && scored[0].score - scored[1].score < 0.18) {
      return null
    }

    return scored[0].matchIndex
  }

  function scoreContextMatch(normalizedMarkdown, matchIndex, context) {
    const beforeWindow = normalizedMarkdown.slice(Math.max(0, matchIndex - 260), matchIndex)
    const afterWindow = normalizedMarkdown.slice(matchIndex + context.text.length, matchIndex + context.text.length + 260)
    const blockWindow = normalizedMarkdown.slice(
      Math.max(0, matchIndex - 700),
      Math.min(normalizedMarkdown.length, matchIndex + context.text.length + 700),
    )

    let score = 0

    if (context.blockText && blockWindow.includes(context.blockText)) {
      score += 2.5
    } else if (context.blockText) {
      score += scoreTextOverlap(blockWindow, context.blockText) * 1.2
    }

    if (context.beforeText) {
      const beforeNeedle = context.beforeText.slice(Math.max(0, context.beforeText.length - 80))
      score += beforeWindow.endsWith(beforeNeedle) ? 1.4 : scoreTextOverlap(beforeWindow, beforeNeedle) * 0.8
    }

    if (context.afterText) {
      const afterNeedle = context.afterText.slice(0, 80)
      score += afterWindow.startsWith(afterNeedle) ? 1.4 : scoreTextOverlap(afterWindow, afterNeedle) * 0.8
    }

    return score
  }

  function scoreTextOverlap(haystack, needle) {
    const words = needle.split(' ').filter((word) => word.length > 1)

    if (!words.length) {
      return 0
    }

    const hits = words.filter((word) => haystack.includes(word)).length
    return hits / words.length
  }

  function linesFromIndexedMatch(indexed, matchIndex, selectionLength) {
    const start = indexed.indexToLine[matchIndex]
    const end = indexed.indexToLine[Math.min(matchIndex + selectionLength - 1, indexed.indexToLine.length - 1)]

    if (typeof start !== 'number' || typeof end !== 'number') {
      return []
    }

    return Array.from({ length: end - start + 1 }, (_, offset) => start + offset)
  }

  function buildNormalizedMarkdownIndex(lines) {
    let normalized = ''
    const indexToLine = []

    lines.forEach((line, lineIndex) => {
      const text = normalizeForSourceMatch(markdownLineToText(line))

      if (!text) {
        return
      }

      if (normalized) {
        normalized += ' '
        indexToLine.push(lineIndex)
      }

      normalized += text
      for (let index = 0; index < text.length; index += 1) {
        indexToLine.push(lineIndex)
      }
    })

    return { indexToLine, normalized }
  }

  function findExactWindowMatch(lines, normalizedSelection) {
    const normalizedLines = lines.map(markdownLineToText).map(normalizeForSourceMatch)
    const maxWindow = Math.min(8, normalizedLines.length)

    for (let start = 0; start < normalizedLines.length; start += 1) {
      let chunk = ''

      for (let end = start; end < Math.min(normalizedLines.length, start + maxWindow); end += 1) {
        chunk = normalizeForSourceMatch(`${chunk} ${normalizedLines[end]}`)

        if (chunk.length < 2) {
          continue
        }

        if (chunk === normalizedSelection || chunk.includes(normalizedSelection) || normalizedSelection.includes(chunk)) {
          return Array.from({ length: end - start + 1 }, (_, offset) => start + offset)
        }
      }
    }

    return []
  }

  function scoreMarkdownLine(line, normalizedSelection) {
    const normalizedLine = normalizeForSourceMatch(markdownLineToText(line))

    if (normalizedLine.length < 2) {
      return 0
    }

    if (normalizedLine.includes(normalizedSelection)) {
      return 2
    }

    if (normalizedSelection.includes(normalizedLine)) {
      return Math.min(1.8, 0.6 + normalizedLine.length / Math.max(normalizedSelection.length, 1))
    }

    const words = normalizedSelection.split(' ').filter((word) => word.length > 1)

    if (!words.length) {
      return 0
    }

    const hits = words.filter((word) => normalizedLine.includes(word)).length
    const coverage = hits / words.length
    const density = hits / Math.max(normalizedLine.split(' ').length, 1)

    return coverage * 0.75 + density * 0.25
  }

  function markdownLineToText(line) {
    return line
      .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/^#{1,6}\s+/g, '')
      .replace(/^\s*>\s?/g, '')
      .replace(/^\s*[-*+]\s+/g, '')
      .replace(/^\s*\d+\.\s+/g, '')
      .replace(/\|/g, ' ')
      .replace(/[*_~>#]/g, '')
      .replace(/<[^>]+>/g, ' ')
  }

  function normalizeForSourceMatch(value) {
    return String(value)
      .toLowerCase()
      .normalize('NFKC')
      .replace(/[\u200b-\u200f\uFEFF]/g, '')
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  }

  document.addEventListener(REQUEST_EVENT, async (event) => {
    const detail = event.detail
    if (!detail?.id || !detail?.type) {
      return
    }

    const respond = (payload) => {
      document.dispatchEvent(new CustomEvent(RESPONSE_EVENT, { detail: { id: detail.id, ...payload } }))
    }

    try {
      const editor = getEditorHandle()
      if (!editor) {
        respond({ ok: false, error: 'HackMD editor instance not found in page context' })
        return
      }

      if (detail.type === 'getMarkdown') {
        respond({ ok: true, result: editor.getValue() })
        return
      }

      if (detail.type === 'replaceRange') {
        const start = detail.payload?.start
        const end = detail.payload?.end
        const text = detail.payload?.text ?? ''
        const current = editor.getValue()

        if (typeof start !== 'number' || typeof end !== 'number') {
          respond({ ok: false, error: 'replaceRange requires numeric start/end' })
          return
        }

        const state = captureUiState(editor)

        if (typeof editor.replaceRange === 'function') {
          const from = posFromIndex(current, start)
          const to = posFromIndex(current, end)
          editor.replaceRange(text, from, to)
          restoreUiState(editor, state)
          respond({ ok: true, result: true })
          return
        }

        const next = `${current.slice(0, start)}${text}${current.slice(end)}`
        editor.setValue(next)
        restoreUiState(editor, state)
        respond({ ok: true, result: true })
        return
      }

      if (detail.type === 'insertAtCursor') {
        const text = detail.payload?.text ?? ''
        const current = editor.getValue()
        const state = captureUiState(editor)
        const cursor = getCursor(editor)

        if (typeof editor.replaceRange === 'function' && cursor) {
          const insertIndex = indexFromPos(current, cursor)
          editor.replaceRange(text, cursor, cursor)
          state.cursor = posFromIndex(`${current.slice(0, insertIndex)}${text}`, insertIndex + text.length)
          restoreUiState(editor, state)
          if (typeof editor.focus === 'function') editor.focus()
          respond({ ok: true, result: true })
          return
        }

        const insertIndex = cursor ? indexFromPos(current, cursor) : current.length
        const next = `${current.slice(0, insertIndex)}${text}${current.slice(insertIndex)}`
        editor.setValue(next)
        state.cursor = posFromIndex(next, insertIndex + text.length)
        restoreUiState(editor, state)
        if (typeof editor.focus === 'function') editor.focus()
        respond({ ok: true, result: true })
        return
      }

      if (detail.type === 'locateMarkdownSource') {
        respond({ ok: true, result: locateMarkdownSource(editor, detail.payload ?? '') })
        return
      }

      if (detail.type === 'clearMarkdownSourceHighlight') {
        clearMarkdownSourceHighlight(editor)
        respond({ ok: true, result: true })
        return
      }

      if (detail.type === 'setMarkdown') {
        const state = captureUiState(editor)
        editor.setValue(detail.payload?.markdown ?? '')
        restoreUiState(editor, state)
        respond({ ok: true, result: true })
        return
      }

      respond({ ok: false, error: `Unknown bridge request: ${detail.type}` })
    } catch (error) {
      respond({ ok: false, error: error instanceof Error ? error.message : String(error) })
    }
  })
})()
