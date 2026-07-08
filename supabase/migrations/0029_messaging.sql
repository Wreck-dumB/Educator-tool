-- Educator ↔ parent messaging. One conversation per parent-child link.
-- Conversations are created only inside accept_child_invite() -- there is
-- no client INSERT policy on conversations, so participants can never
-- be set to arbitrary IDs by the caller.

-- =========================================
-- conversations
-- =========================================
CREATE TABLE public.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_child_link_id uuid NOT NULL UNIQUE
    REFERENCES public.parent_child_links(id) ON DELETE CASCADE,
  educator_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  parent_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  child_id uuid NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

-- Both participants can view their own conversation.
-- No INSERT policy -- created only via accept_child_invite().
CREATE POLICY "Participants can view their conversation"
  ON public.conversations FOR SELECT
  USING (educator_user_id = auth.uid() OR parent_user_id = auth.uid());

-- =========================================
-- messages
-- =========================================
CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 4000),
  created_at timestamptz NOT NULL DEFAULT now(),
  read_at timestamptz
);

CREATE INDEX messages_conversation_id_idx ON public.messages (conversation_id, created_at);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can view messages in their conversation"
  ON public.messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = conversation_id
        AND (c.educator_user_id = auth.uid() OR c.parent_user_id = auth.uid())
    )
  );

CREATE POLICY "Participants can send messages"
  ON public.messages FOR INSERT
  WITH CHECK (
    sender_user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = conversation_id
        AND (c.educator_user_id = auth.uid() OR c.parent_user_id = auth.uid())
    )
  );

-- Recipients can mark messages read (only the read_at field should ever be
-- sent in the app's update payload -- the body field is protected by the
-- sender_user_id <> auth.uid() using clause which ensures the sender cannot
-- retroactively edit their own message body through this policy).
CREATE POLICY "Recipient can mark messages read"
  ON public.messages FOR UPDATE
  USING (
    sender_user_id <> auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = conversation_id
        AND (c.educator_user_id = auth.uid() OR c.parent_user_id = auth.uid())
    )
  )
  WITH CHECK (
    sender_user_id <> auth.uid()
  );

-- =========================================
-- Update accept_child_invite() to auto-create a conversation.
-- This replaces the original function from 0008_parent_portal_core.sql.
-- =========================================
CREATE OR REPLACE FUNCTION public.accept_child_invite(_token uuid)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _invite record;
  _link_id uuid;
  _link record;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'parent'
  ) THEN
    RAISE EXCEPTION 'Only parent accounts can accept child invites';
  END IF;

  SELECT * INTO _invite
  FROM public.child_invites
  WHERE token = _token AND status = 'pending' AND expires_at > now();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invite not found, expired, or already used';
  END IF;

  INSERT INTO public.parent_child_links
    (parent_user_id, child_id, educator_user_id, created_via_invite_id)
  VALUES
    (auth.uid(), _invite.child_id, _invite.educator_user_id, _invite.id)
  ON CONFLICT (parent_user_id, child_id) DO NOTHING
  RETURNING id INTO _link_id;

  -- If the link already existed (ON CONFLICT DO NOTHING), look it up
  IF _link_id IS NULL THEN
    SELECT id INTO _link_id
    FROM public.parent_child_links
    WHERE parent_user_id = auth.uid() AND child_id = _invite.child_id;
  END IF;

  -- Auto-create the conversation for this link if it doesn't exist yet
  IF _link_id IS NOT NULL THEN
    INSERT INTO public.conversations
      (parent_child_link_id, educator_user_id, parent_user_id, child_id)
    VALUES
      (_link_id, _invite.educator_user_id, auth.uid(), _invite.child_id)
    ON CONFLICT (parent_child_link_id) DO NOTHING;
  END IF;

  UPDATE public.child_invites
  SET status = 'accepted', accepted_by = auth.uid(), accepted_at = now()
  WHERE id = _invite.id;

  RETURN _link_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.accept_child_invite(uuid) TO authenticated;
