
# Stripe Terminal S710 Integration for GleeWorld POS

## Overview

The Stripe Reader S710 supports the **JavaScript SDK**, which means it can integrate directly with the existing web-based POS at `/pos` -- no native app required. Instead of generating QR codes for customers to scan, staff will tap "Charge" and the S710 reader handles the card/tap/wallet payment directly.

## How It Works

```text
Staff builds cart in POS (browser)
        |
        v
Click "Charge on Reader"
        |
        v
Edge Function creates PaymentIntent
        |
        v
JS SDK sends payment to S710 reader
        |
        v
Customer taps/inserts/swipes on reader
        |
        v
Payment confirmed, cart clears
```

## Implementation Steps

### 1. New Edge Function: `terminal-connection-token`
- Creates a Stripe Terminal ConnectionToken via the Stripe API
- Returns the `secret` to the frontend
- Required for the JS SDK to authenticate with the reader

### 2. New Edge Function: `terminal-create-payment-intent`
- Creates a PaymentIntent with `payment_method_types: ['card_present']` and `capture_method: 'automatic'`
- Accepts cart total, metadata (coupon, shipping info, etc.)
- Returns the `client_secret` to the frontend

### 3. Stripe Terminal JS SDK Integration
- Load `@stripe/terminal-js` npm package
- Create a `useStripeTerminal` hook that:
  - Initializes the Terminal SDK with the connection token fetcher
  - Discovers available S710 readers on the network
  - Connects to a selected reader
  - Exposes `collectPayment(amount)` function
- Reader connection status shown in the POS header

### 4. Update POS Checkout Flow
- Add a **"Charge on Reader"** button alongside the existing QR code option
- When clicked:
  1. Calls the edge function to create a PaymentIntent
  2. Calls `terminal.collectPaymentMethod(clientSecret)`
  3. Calls `terminal.processPayment()` on success
  4. Creates the order in `gw_orders` and decrements inventory
  5. Clears the cart and shows confirmation
- Coupon discounts are applied to the PaymentIntent amount before sending to the reader

### 5. Reader Management UI
- Small settings panel in POS to discover and connect/disconnect readers
- Show connected reader name and battery/status in the header
- Persist last-connected reader ID in localStorage for auto-reconnect

## Prerequisites

- **Stripe Terminal** must be enabled on the Stripe account (Dashboard > Terminal)
- **S710 reader** must be registered in the Stripe Dashboard under Terminal > Readers
- The reader and the POS browser must be on the same network (for JS SDK mode), OR use server-driven integration for internet-based connection
- No new secrets needed -- the existing `STRIPE_SECRET_KEY` covers Terminal API calls

## Files to Create/Modify

| File | Action |
|------|--------|
| `supabase/functions/terminal-connection-token/index.ts` | Create -- returns connection token |
| `supabase/functions/terminal-create-payment-intent/index.ts` | Create -- creates card_present PaymentIntent |
| `src/hooks/useStripeTerminal.ts` | Create -- SDK initialization, reader discovery, payment collection |
| `src/components/pos/ReaderStatus.tsx` | Create -- reader connection indicator |
| `src/components/pos/ReaderSettingsDialog.tsx` | Create -- discover/connect/disconnect readers |
| `src/pages/PointOfSale.tsx` | Modify -- add "Charge on Reader" button and reader status |

## Technical Notes

- The existing QR code checkout flow remains as a fallback for when no reader is connected
- The `@stripe/terminal-js` package is loaded from Stripe's CDN (`https://js.stripe.com/terminal/v1/`) as recommended by Stripe
- Coupon validation reuses the existing `validate_coupon` RPC -- the discount is applied to the PaymentIntent amount server-side
- Order creation logic (inventory decrement, email notifications) will be shared between both checkout paths
