import DOMPurify from 'dompurify'

const TAG_CONSENTITI = [
  'p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'a', 'h2', 'h3', 'h4',
  'ul', 'ol', 'li', 'blockquote', 'img', 'hr', 'code', 'pre',
]
const ATTR_CONSENTITI = ['href', 'src', 'alt', 'title', 'target', 'rel']

let configurato = false
function configura() {
  if (configurato) return
  configurato = true
  // I link esterni si aprono in una nuova scheda in sicurezza; le immagini sono lazy.
  DOMPurify.addHook('afterSanitizeAttributes', (node) => {
    if (node.tagName === 'A') {
      const href = node.getAttribute('href') ?? ''
      if (/^https?:\/\//i.test(href)) {
        node.setAttribute('target', '_blank')
        node.setAttribute('rel', 'noopener noreferrer')
      } else {
        node.removeAttribute('target')
      }
    }
    if (node.tagName === 'IMG') {
      node.setAttribute('loading', 'lazy')
      node.setAttribute('decoding', 'async')
      if (!node.hasAttribute('alt')) node.setAttribute('alt', '')
    }
  })
}

/** Sanifica HTML proveniente dal database prima di mostrarlo. */
export function pulisci(html: string): string {
  configura()
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: TAG_CONSENTITI,
    ALLOWED_ATTR: [...ATTR_CONSENTITI, 'loading', 'decoding'],
    ALLOWED_URI_REGEXP: /^(?:https?:|mailto:|tel:|\/|#)/i,
  })
}
