'use client'

import { useRef, useEffect } from 'react'

/**
 * Renders email HTML inside a Shadow DOM so its CSS is fully isolated.
 * Prevents email <style> tags and inline styles from affecting the rest of the page,
 * while preserving the email's intended appearance within the Unibox.
 */
interface EmailBodySandboxProps {
  html: string
  className?: string
}

export function EmailBodySandbox({ html, className = '' }: EmailBodySandboxProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    let root = el.shadowRoot
    if (!root) {
      root = el.attachShadow({ mode: 'open' })
    }

    root.innerHTML = ''
    if (!html) return

    // base target="_blank" so links open in new tab instead of navigating away
    const base = document.createElement('base')
    base.setAttribute('target', '_blank')
    base.setAttribute('rel', 'noopener noreferrer')
    root.appendChild(base)

    // Inject email HTML into shadow root. Any <style> tags in the email
    // only apply to the shadow tree, not the main document.
    const wrapper = document.createElement('div')
    wrapper.className = 'unibox-email-body'
    wrapper.style.cssText = 'display:block;min-height:1em;'
    wrapper.innerHTML = html
    root.appendChild(wrapper)
  }, [html])

  return <div ref={containerRef} className={className} data-email-sandbox />
}
