import type { EmailTemplate, Listing, ProbateLead } from '@/types'

/**
 * Authenticated fetch wrapper
 */
export async function authedFetch(path: string, init: RequestInit = {}) {
  return fetch(path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
    credentials: 'include',
  })
}

/**
 * Leads API
 */
export const getExpiredLeads = () =>
  authedFetch('/api/leads/expired').then(r => r.json()) as Promise<{ leads: Listing[] }>

export const postEnrichLeads = (listingIds: string[]) =>
  authedFetch('/api/enrich-leads', {
    method: 'POST',
    body: JSON.stringify({ listingIds }),
  }).then(r => r.json())

/**
 * Email Templates API
 */
export const listEmailTemplates = () =>
  authedFetch('/api/email-templates').then(r => r.json()) as Promise<{ templates: EmailTemplate[] }>

export const getEmailTemplate = (id: string) =>
  authedFetch(`/api/email-templates/${id}`).then(r => r.json()) as Promise<{ template: EmailTemplate }>

export const createEmailTemplate = (template: Partial<EmailTemplate>) =>
  authedFetch('/api/email-templates', {
    method: 'POST',
    body: JSON.stringify(template),
  }).then(r => r.json())

export const updateEmailTemplate = (id: string, template: Partial<EmailTemplate>) =>
  authedFetch(`/api/email-templates/${id}`, {
    method: 'PUT',
    body: JSON.stringify(template),
  }).then(r => r.json())

export const deleteEmailTemplate = (id: string) =>
  authedFetch(`/api/email-templates/${id}`, {
    method: 'DELETE',
  }).then(r => r.json())

/**
 * Geo Leads API
 */
export const postGeoLeads = (lat: number, lng: number, radius_km: number) =>
  authedFetch('/api/geo-leads', {
    method: 'POST',
    body: JSON.stringify({ lat, lng, radius_km }),
  }).then(r => r.json())

/**
 * Probate Leads API
 */
export const listProbateLeads = () =>
  authedFetch('/api/probate-leads').then(r => r.json()) as Promise<{ leads: ProbateLead[] }>

export const uploadProbateLeads = (leads: Partial<ProbateLead>[]) =>
  authedFetch('/api/probate-leads', {
    method: 'POST',
    body: JSON.stringify({ leads }),
  }).then(r => r.json())

/**
 * Assistant API (Ollama)
 */
export const askAssistant = async (
  message: string,
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = []
) => {
  const response = await authedFetch('/api/assistant', {
    method: 'POST',
    body: JSON.stringify({ message, conversationHistory }),
  })

  if (!response.ok) {
    throw new Error('Assistant API error')
  }

  const data = await response.json()
  return data.response
}

/**
 * Template rendering helper
 */
export function renderTemplate(body: string, lead: Partial<Listing>): string {
  return body
    .replace(/\{\{address\}\}/g, lead.address || '')
    .replace(/\{\{city\}\}/g, lead.city || '')
    .replace(/\{\{state\}\}/g, lead.state || '')
    .replace(/\{\{zip\}\}/g, lead.zip || '')
    .replace(/\{\{owner_name\}\}/g, lead.owner_name || 'Owner')
    .replace(/\{\{price\}\}/g, lead.price ? `$${lead.price.toLocaleString()}` : 'N/A')
    .replace(/\{\{price_drop_percent\}\}/g, lead.price_drop_percent?.toString() || '0')
    .replace(/\{\{days_on_market\}\}/g, lead.days_on_market?.toString() || '0')
}

