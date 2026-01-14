import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export const runtime = 'nodejs'

/**
 * DELETE /api/unibox/messages/[id]
 * Delete an individual email message
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let user: any = null
  let messageId: string = 'unknown'

  try {
    const { id } = await params
    messageId = id
    const cookieStore = await cookies()
    const supabase = createRouteHandlerClient({
      cookies: () => cookieStore,
    })
    
    // Get authenticated user
    const { data: { user: authenticatedUser }, error: authError } = await supabase.auth.getUser()
    if (authError || !authenticatedUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    user = authenticatedUser

    // Verify message belongs to user
    const { data: existingMessage, error: messageCheckError } = await supabase
      .from('email_messages')
      .select('id, thread_id')
      .eq('id', id)
      .eq('user_id', user.id)
      .maybeSingle()

    if (messageCheckError) {
      console.error(`[DELETE /api/unibox/messages/[id]] Error checking message ${id}:`, messageCheckError)
      return NextResponse.json({ error: 'Failed to verify message ownership' }, { status: 500 })
    }

    if (!existingMessage) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 })
    }

    // Log delete request
    console.log(`[DELETE /api/unibox/messages/[id]] Delete request from user ${user.id}:`, {
      messageId: id,
      threadId: existingMessage.thread_id,
      timestamp: new Date().toISOString()
    })

    // Delete message (CASCADE will delete all related participants and attachments)
    const { error: deleteError } = await supabase
      .from('email_messages')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id) // Multi-user isolation

    if (deleteError) {
      console.error(`[DELETE /api/unibox/messages/[id]] Error deleting message ${id}:`, deleteError)
      return NextResponse.json(
        { error: 'Failed to delete message', details: deleteError.message },
        { status: 500 }
      )
    }

    // Check if thread still has messages, if not, delete the thread too
    const { data: remainingMessages, error: checkError } = await supabase
      .from('email_messages')
      .select('id')
      .eq('thread_id', existingMessage.thread_id)
      .limit(1)

    if (!checkError && (!remainingMessages || remainingMessages.length === 0)) {
      // No messages left, delete the thread
      await supabase
        .from('email_threads')
        .delete()
        .eq('id', existingMessage.thread_id)
        .eq('user_id', user.id)
    }

    return NextResponse.json({ success: true, message: 'Message deleted successfully' })
  } catch (error: any) {
    console.error(`[DELETE /api/unibox/messages/[id]] Unhandled exception:`, {
      error: error.message,
      stack: error.stack,
      name: error.name,
      messageId,
      timestamp: new Date().toISOString()
    })
    
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    )
  }
}
