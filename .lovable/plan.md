

# Plan: Enable Executive Board Members to Add Users

## Problem Summary

Kennidy Troupe (Alumnae Liaison) is unable to add users through the User Management module. The edge function logs confirm:

```
Permission denied. Caller is not admin. {
  adminErr: null,
  adminProfile: { is_admin: false, is_super_admin: false }
}
```

Kennidy's profile:
- `is_admin: false`
- `is_super_admin: false`  
- `is_exec_board: true`
- `exec_board_role: alumnae-liaison`

**Root Cause**: The `auto-enroll-user` edge function only checks `is_admin` or `is_super_admin` flags, ignoring `is_exec_board`.

---

## Solution

Modify the `auto-enroll-user` edge function to also allow users with `is_exec_board: true` to add new users.

---

## Implementation Details

### File to Modify

`supabase/functions/auto-enroll-user/index.ts`

### Changes

**Current Code (lines 60-72):**
```typescript
// Check admin privileges via profile flags
const { data: adminProfile, error: adminErr } = await supabase
  .from("gw_profiles")
  .select("is_admin, is_super_admin")
  .eq("user_id", userResult.user.id)
  .single();

if (adminErr || !(adminProfile?.is_admin || adminProfile?.is_super_admin)) {
  console.error("Permission denied. Caller is not admin.", { adminErr, adminProfile });
  return new Response(JSON.stringify({ error: "Permission denied" }), ...);
}
```

**Updated Code:**
```typescript
// Check admin/exec board privileges via profile flags
const { data: callerProfile, error: profileErr } = await supabase
  .from("gw_profiles")
  .select("is_admin, is_super_admin, is_exec_board")
  .eq("user_id", userResult.user.id)
  .single();

const hasPermission = 
  callerProfile?.is_admin || 
  callerProfile?.is_super_admin || 
  callerProfile?.is_exec_board;

if (profileErr || !hasPermission) {
  console.error("Permission denied. Caller lacks required privileges.", { 
    profileErr, 
    callerProfile 
  });
  return new Response(JSON.stringify({ error: "Permission denied" }), ...);
}
```

---

## Security Considerations

- Executive board members are trusted elected student officers
- This aligns with existing patterns where `is_exec_board` grants elevated permissions (calendar, messenger, music library, etc.)
- The edge function still requires authentication and profile verification
- Only profile creation/update is allowed, not deletion (which remains super-admin only)

---

## Testing

After implementation:
1. Kennidy logs in and navigates to Admin → User Management
2. Goes to "Add User" tab
3. Enters email and name for a new user
4. System should successfully create the user without "Permission denied" error

---

## Summary

| Step | Description |
|------|-------------|
| 1 | Update edge function permission check to include `is_exec_board` |
| 2 | Update logging for clarity |
| 3 | Deploy and test with Kennidy's account |

