-- ===================================================================================
-- TENTED️: Message Seen / Read Receipts Migration
-- Migration: 20261101000000_message_read_receipts.sql
-- ===================================================================================

-- 1. Add read_at column to messages table if not present
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ DEFAULT NULL;

-- 2. Fast index on unread messages for performance
CREATE INDEX IF NOT EXISTS idx_messages_unread 
ON public.messages(sender_id, created_at) 
WHERE read_at IS NULL;

-- 3. Security Definer RPC function to safely mark partner's messages as read
CREATE OR REPLACE FUNCTION public.mark_messages_read(p_message_ids UUID[])
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE public.messages
    SET read_at = now()
    WHERE id = ANY(p_message_ids)
      AND sender_id != auth.uid()
      AND read_at IS NULL;
END;
$$;

-- 4. Grant execute permission on RPC function to authenticated users
GRANT EXECUTE ON FUNCTION public.mark_messages_read(UUID[]) TO authenticated;

-- 5. Enable UPDATE policy on messages table for couple members marking read
DROP POLICY IF EXISTS "messages_update_denied" ON public.messages;
DROP POLICY IF EXISTS "messages_update_read" ON public.messages;

CREATE POLICY "messages_update_read"
    ON public.messages FOR UPDATE
    USING (
        public.is_couple_member(auth.uid())
        AND sender_id != auth.uid()
    )
    WITH CHECK (
        public.is_couple_member(auth.uid())
        AND sender_id != auth.uid()
    );
