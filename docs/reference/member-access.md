# Member access: who sees what an admin shares

One rule, four parts. The code that enforces it lives in one migration,
`supabase/migrations/20261101120000_member_access.sql`.

## The rule

1. **Invited = member.** Inviting someone to a workspace (Yo-Doc, a choir
   site, any tenant) gives them a row in `gw_tenant_members` for that
   workspace. It does not matter whether they already had a GleeWorld
   account. Nothing else is ever consulted.
2. **Member = scoped.** When a member opens the workspace's site, every
   request is scoped to that workspace. A person can be a member of many
   workspaces; their profile is homed in only one. That is normal and does
   not affect what they can see.
3. **Shared = visible.** A member sees a score when a share names them:
   everyone, this person, their class, or their voice part. A member sees a
   playlist (MP3s) when it is public in the workspace or a share names them:
   everyone, staff, admins, their email, or their class.
4. **You share with members, so the Share dialog lists members.** Not
   profiles. A GleeWorld account invited to Yo-Doc appears by name.

Admins and librarians see everything in their workspace. Uploaders see their
own scores. Nobody sees anything in a workspace they are not a member of.

## Where membership rows come from

| How the person arrived | What creates the row |
| --- | --- |
| Invited from People, a class, or onboarding | `gw-invite-student` edge function |
| Roster import | `gw-roster-import` edge function |
| A playlist shared to their email | trigger in `20261008160000` (role `fan`) |
| Already a GleeWorld member | mirror into Yo-Doc, `20261031120000` |
| Account homed in the workspace but no row | backfill in `20261101120000` |

Fans and VIPs on gleeworld.org are the public audience and are not mirrored.

## The functions

| Function | Answers |
| --- | --- |
| `gw_is_member()` | Is the caller a member of the workspace this request is on? |
| `gw_member_role()` | Their membership role there, or null. |
| `gw_share_reaches_me(everyone, users, courses, voice_parts)` | Does a score shared like this reach the caller? |
| `gw_sheet_music_browse` (view) | The scores the caller can see. The Scores tab reads this. |
| `gw_jukebox_playlist_visible(playlist_id)` | Can the caller see this playlist? Tracks inherit from playlists. |
| `gw_share_people()` | The members a share can name. The Share dialog reads this. |
| `gw_my_access()` | Diagnostic: workspace, member?, role, can share? |

## "Someone I invited can't see the music"

Have them sign in on the workspace's site and run, or run it yourself with
their token:

```sql
select * from gw_my_access();
```

- `tenant_slug` is not the site they are on, or `is_member` is false: they
  are not a member there. Invite them from People. No sign-out is needed
  afterwards; a page reload is enough.
- `is_member` is true: the share is the problem. Open the score's Share
  dialog and check that "Everyone" is on or that they are named. For a
  playlist, check its shares in the Jukebox panel.

## Deploying

```
bash scripts/deploy-member-access.sh          # migrations + web
bash scripts/deploy-member-access.sh --db-only
```

The script applies `20261031120000` and `20261101120000` (both safe to
re-run), verifies the functions exist, runs
`supabase/migrations/tests/member_access_test.sql`, and deploys the web
build.
