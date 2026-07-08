-- Community wall: moderated posts scoped to one educator's service.
-- Parents can post; posts require educator approval before anyone else sees them.
-- No UPDATE policy for authors after submission -- prevents a "bait-and-switch"
-- where an innocuous post is approved, then secretly edited to expose private info.

CREATE TABLE public.wall_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  educator_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  author_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  author_role text NOT NULL CHECK (author_role IN ('educator', 'parent')),
  body text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 2000),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  moderated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  moderated_at timestamptz,
  rejection_reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX wall_posts_educator_user_id_idx ON public.wall_posts (educator_user_id, status, created_at DESC);

ALTER TABLE public.wall_posts ENABLE ROW LEVEL SECURITY;

-- Author can always see their own post (even while pending/rejected).
CREATE POLICY "Author can view own post"
  ON public.wall_posts FOR SELECT
  USING (author_user_id = auth.uid());

-- Educator can see all posts for their service (to moderate them).
CREATE POLICY "Educator can view all posts for own service"
  ON public.wall_posts FOR SELECT
  USING (educator_user_id = auth.uid());

-- Linked parents can see only approved posts for their educator's service.
CREATE POLICY "Linked parents can view approved posts for their service"
  ON public.wall_posts FOR SELECT
  USING (
    status = 'approved'
    AND EXISTS (
      SELECT 1 FROM public.parent_child_links pcl
      WHERE pcl.educator_user_id = wall_posts.educator_user_id
        AND pcl.parent_user_id = auth.uid()
    )
  );

-- Linked parents can submit posts (always start as pending, never approved).
CREATE POLICY "Linked parent can submit pending post"
  ON public.wall_posts FOR INSERT
  WITH CHECK (
    author_user_id = auth.uid()
    AND author_role = 'parent'
    AND status = 'pending'
    AND EXISTS (
      SELECT 1 FROM public.parent_child_links pcl
      WHERE pcl.educator_user_id = wall_posts.educator_user_id
        AND pcl.parent_user_id = auth.uid()
    )
  );

-- Educator can post directly (auto-approved is handled by setting status='approved').
CREATE POLICY "Educator can post to own service wall"
  ON public.wall_posts FOR INSERT
  WITH CHECK (
    author_user_id = auth.uid()
    AND author_role = 'educator'
    AND educator_user_id = auth.uid()
  );

-- Only the educator can moderate (approve/reject) -- authors cannot change status.
CREATE POLICY "Educator can moderate own service posts"
  ON public.wall_posts FOR UPDATE
  USING (educator_user_id = auth.uid())
  WITH CHECK (educator_user_id = auth.uid());
-- NOTE: no UPDATE for parent authors at any status -- this closes the bait-and-switch risk.

-- Authors can delete their own pending post; educator can delete any post in their service.
CREATE POLICY "Author can delete own pending post"
  ON public.wall_posts FOR DELETE
  USING (author_user_id = auth.uid() AND status = 'pending');

CREATE POLICY "Educator can delete any post in own service"
  ON public.wall_posts FOR DELETE
  USING (educator_user_id = auth.uid());
