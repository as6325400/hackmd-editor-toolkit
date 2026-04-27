const EXPORT_STORAGE_PREFIX = 'pdfExport:'

const documentTitle = document.getElementById('document-title')
const documentRoot = document.getElementById('document')
const errorMessage = document.getElementById('error-message')
const printButton = document.getElementById('print-button')

printButton.addEventListener('click', () => {
  window.print()
})

main().catch((error) => {
  showError(error instanceof Error ? error.message : String(error))
})

async function main() {
  const exportId = new URLSearchParams(window.location.search).get('id')

  if (!exportId) {
    throw new Error('找不到 PDF 匯出資料。')
  }

  const storageKey = `${EXPORT_STORAGE_PREFIX}${exportId}`
  const stored = await chrome.storage.session.get(storageKey)
  const payload = stored[storageKey]

  if (!payload?.markdown) {
    throw new Error('匯出資料已失效，請回到 HackMD 重新匯出。')
  }

  document.title = `${payload.title || 'HackMD Export'} - PDF Export`
  documentTitle.textContent = payload.title || 'HackMD Export'
  documentRoot.append(renderMarkdown(payload.markdown))

  await chrome.storage.session.remove(storageKey)

  window.setTimeout(() => {
    window.print()
  }, 350)
}

function showError(message) {
  errorMessage.hidden = false
  errorMessage.textContent = message
}

function renderMarkdown(markdown) {
  const fragment = document.createDocumentFragment()
  const lines = markdown.replace(/\r\n?/g, '\n').split('\n')
  let index = 0

  while (index < lines.length) {
    const line = lines[index]

    if (!line.trim()) {
      index += 1
      continue
    }

    if (line.trim() === '==page==') {
      const pageBreak = document.createElement('div')
      pageBreak.style.breakAfter = 'page'
      fragment.append(pageBreak)
      index += 1
      continue
    }

    if (line.startsWith('```')) {
      const codeLines = []
      index += 1
      while (index < lines.length && !lines[index].startsWith('```')) {
        codeLines.push(lines[index])
        index += 1
      }
      index += index < lines.length ? 1 : 0
      fragment.append(createCodeBlock(codeLines.join('\n')))
      continue
    }

    if (/^\|.+\|$/.test(line.trim()) && index + 1 < lines.length && isTableSeparator(lines[index + 1])) {
      const tableLines = [line]
      index += 2
      while (index < lines.length && /^\|.+\|$/.test(lines[index].trim())) {
        tableLines.push(lines[index])
        index += 1
      }
      fragment.append(createTable(tableLines))
      continue
    }

    const heading = line.match(/^(#{1,6})\s+(.+)$/)
    if (heading) {
      const level = Math.min(6, heading[1].length)
      const element = document.createElement(`h${level}`)
      appendInlineMarkdown(element, heading[2])
      fragment.append(element)
      index += 1
      continue
    }

    if (/^\s*>\s?/.test(line)) {
      const quoteLines = []
      while (index < lines.length && /^\s*>\s?/.test(lines[index])) {
        quoteLines.push(lines[index].replace(/^\s*>\s?/, ''))
        index += 1
      }
      const blockquote = document.createElement('blockquote')
      blockquote.append(renderMarkdown(quoteLines.join('\n')))
      fragment.append(blockquote)
      continue
    }

    if (/^\s*[-*+]\s+/.test(line) || /^\s*\d+\.\s+/.test(line)) {
      const ordered = /^\s*\d+\.\s+/.test(line)
      const list = document.createElement(ordered ? 'ol' : 'ul')

      while (
        index < lines.length &&
        (ordered ? /^\s*\d+\.\s+/.test(lines[index]) : /^\s*[-*+]\s+/.test(lines[index]))
      ) {
        const item = document.createElement('li')
        appendInlineMarkdown(item, lines[index].replace(ordered ? /^\s*\d+\.\s+/ : /^\s*[-*+]\s+/, ''))
        list.append(item)
        index += 1
      }

      fragment.append(list)
      continue
    }

    const paragraphLines = [line]
    index += 1
    while (
      index < lines.length &&
      lines[index].trim() &&
      !/^(#{1,6})\s+/.test(lines[index]) &&
      !lines[index].startsWith('```') &&
      !/^\s*[-*+]\s+/.test(lines[index]) &&
      !/^\s*\d+\.\s+/.test(lines[index]) &&
      !/^\s*>\s?/.test(lines[index]) &&
      lines[index].trim() !== '==page=='
    ) {
      paragraphLines.push(lines[index])
      index += 1
    }

    const paragraph = document.createElement('p')
    appendInlineMarkdown(paragraph, paragraphLines.join(' '))
    fragment.append(paragraph)
  }

  return fragment
}

function createCodeBlock(code) {
  const pre = document.createElement('pre')
  const codeElement = document.createElement('code')
  codeElement.textContent = code
  pre.append(codeElement)
  return pre
}

function isTableSeparator(line) {
  return /^\|\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?$/.test(line.trim())
}

function createTable(lines) {
  const table = document.createElement('table')
  const [headerLine, ...bodyLines] = lines
  const thead = document.createElement('thead')
  const tbody = document.createElement('tbody')

  thead.append(createTableRow(headerLine, 'th'))
  bodyLines.forEach((row) => tbody.append(createTableRow(row, 'td')))
  table.append(thead, tbody)
  return table
}

function createTableRow(line, cellTag) {
  const row = document.createElement('tr')
  splitTableCells(line).forEach((cell) => {
    const element = document.createElement(cellTag)
    appendInlineMarkdown(element, cell.trim())
    row.append(element)
  })
  return row
}

function splitTableCells(line) {
  return line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|')
}

function appendInlineMarkdown(parent, text) {
  const pattern = /!\[([^\]]*)\]\(([^)\s]+)(?:\s+=[^)]+)?\)|\[([^\]]+)\]\(([^)]+)\)|`([^`]+)`|\*\*([^*]+)\*\*|\*([^*]+)\*/g
  let lastIndex = 0
  let match

  while ((match = pattern.exec(text))) {
    parent.append(document.createTextNode(text.slice(lastIndex, match.index)))

    if (match[1] !== undefined) {
      const image = document.createElement('img')
      image.alt = match[1]
      image.src = match[2]
      parent.append(image)
    } else if (match[3] !== undefined) {
      const link = document.createElement('a')
      link.href = match[4]
      link.textContent = match[3]
      parent.append(link)
    } else if (match[5] !== undefined) {
      const code = document.createElement('code')
      code.textContent = match[5]
      parent.append(code)
    } else if (match[6] !== undefined) {
      const strong = document.createElement('strong')
      strong.textContent = match[6]
      parent.append(strong)
    } else if (match[7] !== undefined) {
      const emphasis = document.createElement('em')
      emphasis.textContent = match[7]
      parent.append(emphasis)
    }

    lastIndex = pattern.lastIndex
  }

  parent.append(document.createTextNode(text.slice(lastIndex)))
}
