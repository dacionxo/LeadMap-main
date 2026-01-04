/**
 * TypeScript Interfaces for Email Composer System
 * Following .cursorrules: Use interfaces over types for object shapes
 * Based on Mautic patterns and LeadMap requirements
 * 
 * Note: This file will be moved to compose-email/types.ts once directory permissions are resolved
 */

/**
 * Mailbox interface for sender selection
 */
export interface Mailbox {
  id: string
  email: string
  display_name?: string
  provider: 'gmail' | 'outlook' | 'smtp' | string
  active: boolean
  daily_limit?: number
  hourly_limit?: number
  last_error?: string
  token_expires_at?: string | null
}

/**
 * Email template interface
 * Matches existing email_templates table structure
 */
export interface EmailTemplate {
  id: string
  title: string
  body: string
  html_content?: string
  category?: string
  folder_id?: string
  scope?: 'user' | 'global'
  created_at?: string
  updated_at?: string
}

/**
 * Email composer form data state
 */
export interface EmailComposerFormData {
  mailboxId: string
  to: string
  subject: string
  html: string
  previewText?: string
  replyTo?: string
  fromName?: string
  scheduleAt?: string
  scheduleEnabled: boolean
  trackClicks: boolean
  trackOpens: boolean
  utmTracking: boolean
  utmSource?: string
  utmMedium?: string
  utmCampaign?: string
  utmContent?: string
  utmTerm?: string
}

/**
 * Email send type (Mautic-inspired)
 */
export type EmailSendType = 'now' | 'schedule' | 'batch' | 'rss' | 'smart'

/**
 * Email composer mode
 */
export type EmailComposerMode = 'html' | 'visual' | 'mjml' | 'code'

/**
 * Email preview device type
 */
export type PreviewDeviceType = 'desktop' | 'mobile' | 'tablet'

/**
 * Email preview client type
 */
export type PreviewClientType = 'gmail' | 'outlook' | 'apple-mail' | 'generic'

/**
 * Token category (Mautic pattern)
 */
export type TokenCategory = 'contact' | 'campaign' | 'email' | 'date' | 'custom'

/**
 * Token definition (Mautic pattern: {contactfield=firstname})
 */
export interface EmailToken {
  key: string
  label: string
  category: TokenCategory
  description?: string
  example?: string
  format: string // e.g., '{contactfield=firstname}'
}

/**
 * Dynamic content filter (Mautic pattern)
 */
export interface DynamicContentFilter {
  field: string
  operator: 'equals' | 'notEquals' | 'contains' | 'startsWith' | 'endsWith' | 'greaterThan' | 'lessThan'
  value: string | number | boolean
}

/**
 * Dynamic content variant (Mautic pattern)
 */
export interface DynamicContentVariant {
  id: string
  name: string
  content: string
  filters: DynamicContentFilter[]
  isDefault: boolean
}

/**
 * Email builder block type
 */
export type EmailBuilderBlockType =
  | 'header'
  | 'text'
  | 'heading'
  | 'image'
  | 'button'
  | 'divider'
  | 'spacer'
  | 'social'
  | 'footer'
  | 'section'
  | 'column'
  | 'custom'

/**
 * Email builder block
 */
export interface EmailBuilderBlock {
  id: string
  type: EmailBuilderBlockType
  content: string
  styles?: Record<string, string>
  attributes?: Record<string, string>
  children?: EmailBuilderBlock[]
}

/**
 * Email validation error
 */
export interface EmailValidationError {
  field: keyof EmailComposerFormData
  message: string
}

/**
 * Email send response
 */
export interface EmailSendResponse {
  success: boolean
  emailId?: string
  message?: string
  error?: string
}

/**
 * Spam score result
 */
export interface SpamScoreResult {
  score: number // 0-10, lower is better
  warnings: string[]
  suggestions: string[]
}

/**
 * Email preview data
 */
export interface EmailPreviewData {
  subject: string
  html: string
  text?: string
  fromEmail: string
  fromName?: string
  to: string
}

/**
 * ComposeEmail component props
 */
export interface ComposeEmailProps {
  initialData?: Partial<EmailComposerFormData>
  onSend?: (data: EmailComposerFormData) => Promise<EmailSendResponse>
  onSave?: (data: EmailComposerFormData) => Promise<void>
  onClose?: () => void
  mode?: EmailComposerMode
}

/**
 * EmailEditor component props
 */
export interface EmailEditorProps {
  value: string
  onChange: (html: string) => void
  mode?: 'html' | 'visual' | 'mjml'
  placeholder?: string
  disabled?: boolean
}

/**
 * EmailBuilder component props (for visual drag-and-drop builder)
 */
export interface EmailBuilderProps {
  initialContent?: string
  onContentChange: (html: string, mjml?: string) => void
  onBlockAdd?: (block: EmailBuilderBlock) => void
  disabled?: boolean
}

/**
 * EmailComposerSidebar component props
 */
export interface EmailComposerSidebarProps {
  templates: EmailTemplate[]
  tokens: EmailToken[]
  selectedTemplate?: string
  onTemplateSelect: (templateId: string) => void
  onTokenInsert: (token: EmailToken) => void
  onTemplateSave?: (template: Partial<EmailTemplate>) => Promise<void>
}

/**
 * EmailPreview component props
 */
export interface EmailPreviewProps {
  previewData: EmailPreviewData
  deviceType?: PreviewDeviceType
  clientType?: PreviewClientType
  showTokens?: boolean
  tokenData?: Record<string, string>
}

/**
 * EmailSettingsPanel component props
 */
export interface EmailSettingsPanelProps {
  mailboxes: Mailbox[]
  formData: EmailComposerFormData
  onFormDataChange: (data: Partial<EmailComposerFormData>) => void
  sendType: EmailSendType
  onSendTypeChange: (type: EmailSendType) => void
  spamScore?: SpamScoreResult
}

/**
 * TemplateSelector component props
 */
export interface TemplateSelectorProps {
  templates: EmailTemplate[]
  selectedTemplateId?: string
  onSelect: (templateId: string) => void
  onLoad: (template: EmailTemplate) => void
  loading?: boolean
}

/**
 * TokenSelector component props (Mautic pattern)
 */
export interface TokenSelectorProps {
  tokens: EmailToken[]
  categories?: TokenCategory[]
  onInsert: (token: EmailToken) => void
  searchQuery?: string
  onSearchChange?: (query: string) => void
}

