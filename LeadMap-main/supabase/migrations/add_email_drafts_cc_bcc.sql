-- Add cc_emails and bcc_emails to email_drafts for compose modal support
ALTER TABLE email_drafts
  ADD COLUMN IF NOT EXISTS cc_emails TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS bcc_emails TEXT[] DEFAULT ARRAY[]::TEXT[];
