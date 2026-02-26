

## Add "Manage Products" Link to POS Page

### What This Does
Adds a clearly visible "Manage Products" button in the POS header bar that navigates to `/admin/products`. Since that page requires authentication, unauthenticated staff will be automatically redirected to the login page first.

### Changes

**File: `src/pages/PointOfSale.tsx`**

1. Add `useNavigate` import from `react-router-dom` and add a `Settings` (or `Pencil`) icon from `lucide-react`.
2. In the POS header bar (line ~237-246), add a "Manage Products" button between the title and the cart count. This button will call `navigate('/admin/products')`, which will:
   - If the user is already logged in as an admin, take them directly to the product management page.
   - If the user is not logged in, the `AdminProducts` page already redirects to `/auth`, so they will be prompted to sign in first.

### Technical Details

- The `AdminProducts` page (at `/admin/products`) already handles auth redirection -- if no user is logged in, it does `<Navigate to="/auth" replace />`.
- No new routes or auth logic needed; we are simply adding a navigation button to the existing POS UI.
- The button will be styled subtly (outline/ghost style, white text) to fit the dark header bar without distracting from the sales workflow.

