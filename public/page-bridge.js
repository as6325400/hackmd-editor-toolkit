(() => {
  const REQUEST_EVENT = 'hackmd-resize-toolkit:request'
  const RESPONSE_EVENT = 'hackmd-resize-toolkit:response'

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
