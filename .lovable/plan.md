

## Save, Like, and Share for News and Scholarship Feeds

### What You'll Get
Each news and scholarship card in the dashboard sliders will have three action buttons:
- **Heart (Like)** -- shows you liked it, count visible
- **Bookmark (Save)** -- saves it to your personal "Saved Feed" collection
- **Share** -- copies the link or opens native share on mobile

You'll also get a new **"Saved Feed"** page where you can view everything you've bookmarked, filter by type (news vs scholarship), and remove items.

---

### How It Works

1. **New Database Table** -- `gw_feed_saves`
   - Stores each saved/liked item per user
   - Columns: `user_id`, `feed_type` (news or scholarship), `title`, `link`, `description`, `source`, `source_icon`, `image_url`, `pub_date`, `is_liked`, `is_bookmarked`
   - RLS policies so users can only see/manage their own saves
   - Since feed items come from external RSS (no internal ID), we use `link` as the unique identifier per user

2. **Action Buttons on Each Card**
   - A small overlay row at the bottom of every news/scholarship card with Heart, Bookmark, and Share icons
   - Tapping stops the card link from opening (event.preventDefault on the buttons)
   - Heart toggles `is_liked`, Bookmark toggles `is_bookmarked`
   - Share uses the Web Share API on mobile, falls back to clipboard copy on desktop
   - Filled/colored icons when active (red heart, blue bookmark)

3. **Custom Hook -- `useFeedSaves`**
   - Follows the same pattern as `useModuleFavorites` and `useFavorites`
   - Loads all user saves on mount, provides `toggleLike`, `toggleBookmark`, `isLiked`, `isBookmarked` helpers
   - Upserts the row on first interaction (creates if not exists, updates flags)

4. **Saved Feed Page**
   - New route `/saved-feed` accessible from the sidebar
   - Displays all bookmarked and/or liked items in a grid layout
   - Filter tabs: All, News, Scholarships, Liked Only
   - Each card links out to the original article and has remove/unlike buttons

5. **UI Updates to Slider Cards**
   - Both `NewsFeedSlider` and `ScholarshipFeedSlider` cards get the action button row
   - The outer `<a>` tag becomes a `<div>` with an `onClick` handler so inner buttons can stop propagation
   - Keeps the same visual style (dark cards, hover effects)

---

### Technical Details

**Migration SQL:**
```text
CREATE TABLE public.gw_feed_saves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  feed_type TEXT NOT NULL CHECK (feed_type IN ('news', 'scholarship')),
  title TEXT NOT NULL,
  link TEXT NOT NULL,
  description TEXT,
  source TEXT,
  source_icon TEXT,
  image_url TEXT,
  pub_date TIMESTAMPTZ,
  is_liked BOOLEAN DEFAULT false,
  is_bookmarked BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, link)
);

ALTER TABLE public.gw_feed_saves ENABLE ROW LEVEL SECURITY;

-- RLS: users manage only their own saves
CREATE POLICY "Users can view own feed saves"
  ON public.gw_feed_saves FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own feed saves"
  ON public.gw_feed_saves FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own feed saves"
  ON public.gw_feed_saves FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own feed saves"
  ON public.gw_feed_saves FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_feed_saves_user ON public.gw_feed_saves(user_id);
CREATE INDEX idx_feed_saves_type ON public.gw_feed_saves(user_id, feed_type);
```

**New files:**
- `src/hooks/useFeedSaves.ts` -- hook for like/bookmark/share logic
- `src/pages/SavedFeed.tsx` -- saved feed page
- Updated slider components to include action buttons

**Files modified:**
- `src/components/dashboard/NewsFeedSlider.tsx` -- add action buttons
- `src/components/dashboard/ScholarshipFeedSlider.tsx` -- add action buttons
- Router config -- add `/saved-feed` route
- Sidebar navigation -- add "Saved Feed" link with bookmark icon

