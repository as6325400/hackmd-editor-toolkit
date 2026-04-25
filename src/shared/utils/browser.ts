export function isHackMdPage(url?: string): boolean {
  const resolvedUrl =
    url ?? (typeof globalThis.location !== 'undefined' ? globalThis.location.href : '')

  return /^https:\/\/hackmd\.io\//.test(resolvedUrl)
}
