# Member access: who sees what an admin shares

One rule, in six parts. The code that enforces it lives in one migration,
`supabase/migrations/20261101120000_member_access.sql`.

## The rule

1. **Invited = member.** Inviting someone to a workspace (Yo-Doc, a choir
   site, any tenant) gives them a row in `gw_tenant_members` for that
   workspace with a member-level role. It does not matter whether they
   already had a GleeWorld account. Nothing else is ever consulted.
2. **Audience is not a member.** A public signup on a workspace's site, or
   someone who was only sent a playlist by email, gets a row with role `fan`.
   Fans and VIPs see what is shared to them by name or email. They never see
   what is shared with "Everyone". A self-signup cannot choose its own role.
3. **Member = scoped.** When a person with a row opens the workspace's site,
   every request is scoped to that workspace. A person can hold rows in many
   workspaces; their profile is homed in only one. That is normal.
4. **Shared = visible.** A member sees a score when a share names them:
   everyone, this person, their class, or their voice part. A member sees a
   playlist (MP3s) when it is public in the workspace or a share names them:
   everyone, staff, admins, their email, or their class.
5. **Admins of this workspace see everything in it, and only in it.** Admin
   means: a membership role of owner, director, admin, super-admin or
   librarian here, or a profile homed here that is flagged admin or
   super-admin or has role librarian. An admin of another choir who holds a
   plain row here is a member here, nothing more.
6. **You share with members, so the Share dialog lists members.** Not
   profiles. A GleeWorld account invited to Yo-Doc appears by name.

Uploaders always see their own scores. Disabled accounts see nothing.

## Where membership rows come from

| How the person arrived | What creates or promotes the row |
| --- | --- |
| Invited from People, a class, or onboarding | `gw-invite-student` calls `gw_grant_membership` |
| Roster import | `gw-roster-import` calls `gw_grant_membership` |
| Public signup on the site | signup trigger, always role `fan` |
| A playlist shared to their email | trigger in `20261008160000`, role `fan` |
| Already a GleeWorld member | mirror into Yo-Doc, `20261031120000` |
| Account homed in the workspace but no row | backfill in `20261101120000` |

`gw_grant_membership` creates a row or promotes a `fan` row to the invited
role. It never downgrades anyone and never grants an admin role. Promotion
to admin happens on the People page.

## The functions

| Function | Answers |
| --- | --- |
| `gw_member_role()` | The caller's role in the workspace this request is on, or null. |
| `gw_has_membership()` | Does the caller hold any row here (member or audience)? |
| `gw_is_member()` | Is the caller a member here (invited, not audience)? |
| `gw_is_admin_here()` | Does the caller run this workspace or its library? |
| `gw_share_reaches_me(everyone, users, courses, voice_parts)` | Does a score shared like this reach the caller? |
| `gw_sheet_music_browse` (view) | The scores the caller can see. The Scores tab reads this. |
| `gw_jukebox_playlist_visible(playlist_id)` | Can the caller see this playlist? Tracks inherit from playlists. |
| `gw_share_people()` | The members a share can name. Admins and librarians of this workspace may call it. |
| `gw_grant_membership(user, tenant, role)` | Service role only. Invitation creates or promotes a row. |
| `gw_my_access()` | Diagnostic: workspace, has row, role, member?, admin here?, can share? |

## "Someone I invited can't see the music"

Have them sign in on the workspace's site and run, or run it yourself with
their token:

```sql
select * from gw_my_access();
```

- `tenant_slug` is not the site they are on: they hold no row there. Invite
  them from People. No sign-out is needed afterwards; a page reload is
  enough.
- `member_role` is `fan`: they signed up on their own or were only sent a
  playlist. Invite them from People, which promotes the row.
- `is_member` is true: the share is the problem. Open the score's Share
  dialog and check that "Everyone" is on or that they are named. For a
  playlist, check its shares on the Jukebox page.

## Deploying

```
bash scripts/deploy-member-access.sh          # migrations, test, functions, web
bash scripts/deploy-member-access.sh --db-only
```

The script applies `20261031120000` and `20261101120000` (both safe to
re-run), verifies the functions exist, runs
`supabase/migrations/tests/member_access_test.sql` against the live data,
deploys the two invite edge functions, and deploys the web build.

## Known gaps left for a follow-up

- The base-table policies that let profile-flagged admins edit sheet music
  and manage Jukebox rows are still account-wide, not per workspace. Listing
  is per workspace now; editing is not yet.
- `gw_profiles.voice_part` is constrained to `S1`..`B2` in the schema while
  the Share dialog writes `soprano_1`..`bass_2`, so the voice-part lane only
  matches if that constraint was changed on the live database.
