
# Public Assistant for GleeWorld Landing Page

## Overview

You want a public-facing assistant on the landing page that helps visitors, potential fans, alumnae, and the general public with questions like:

- "How do I book the Glee Club?"
- "When is Christmas Carol?"
- "I'm an alumna, how do I login?"
- "How do I become a fan?"
- "What's the phone number?"
- "How can I email them?"
- "What time is the concert?"

The key difference from the authenticated Glee Assistant is that this public assistant:
1. Only answers PUBLIC information (no internal data)
2. Does NOT require login
3. Has a curated knowledge base of publicly shareable info
4. Queries only public calendar events
5. Never exposes private member data, grades, or internal policies

---

## What the Public Assistant Will Answer

| Category | Example Questions | Data Source |
|----------|-------------------|-------------|
| **Booking** | "How do I book the Glee Club for an event?" | Static knowledge + route to `/booking-request` |
| **Events/Calendar** | "When is Christmas Carol?" "What concerts are coming up?" | `gw_events` where `is_public = true` |
| **Contact Info** | "What's the phone number?" "How can I email?" | Press Kit static data: `(404) 270-5200`, `gleeclub@spelman.edu` |
| **Fan Registration** | "How do I become a fan?" | Route to `/auth` with fan signup |
| **Alumni Access** | "I'm an alumna, how do I login?" | Route to `/auth` or `/alumnae` |
| **General Info** | "Where is Spelman College?" "What does the Glee Club sing?" | Static knowledge base |
| **Website Info** | "What's the Spelman website?" | `spelman.edu` |
| **Auditions** | "How do I audition for the Glee Club?" | Static knowledge + route to `/auditioner` |
| **Social Media** | "What's your Instagram?" | Links to social platforms |
| **Performance Cost** | "How much does it cost to book a performance?" | Route to booking form, general info |

---

## Architecture

### New Components

```text
supabase/functions/public-assistant/index.ts    <-- NEW Edge Function
src/components/assistant/PublicAssistant.tsx    <-- NEW Component
```

### Integration Points

The public assistant will:
1. Appear as a chat bubble/button on the landing page (`GleeWorldLanding.tsx`)
2. Use a separate Edge Function (`public-assistant`) that only accesses public data
3. Have its own curated knowledge base with no private information
4. Query only `gw_events WHERE is_public = true`
5. NOT have access to grades, attendance, internal tools, admin features

---

## User Experience

### Visual Design
- Floating chat button in bottom-right corner of landing page
- Uses the same avatar image you provided (`glee-assistant-avatar.png`)
- Matches the Spelman Blue/Gold theme
- Text responses only (no audio TTS for public - reduces cost)
- Typewriter effect for responses

### Interaction Flow
1. Visitor clicks the chat bubble
2. Assistant greets: "Hi! I'm the Glee Club assistant. How can I help you today?"
3. Visitor types/asks question
4. Assistant responds with relevant info + action buttons when appropriate

### Action Buttons Examples
- "Book Us" → navigates to `/booking-request`
- "View Calendar" → navigates to `/public-calendar`
- "Become a Fan" → navigates to `/auth`
- "Contact Us" → shows phone/email info

---

## Technical Implementation

### Edge Function: `public-assistant`

**Tools (READ-ONLY, PUBLIC DATA ONLY):**

```text
get_public_events          → Query gw_events WHERE is_public = true
get_event_details          → Get specific public event info
search_public_knowledge    → Answer FAQs from static knowledge
get_contact_info           → Return public contact details
get_social_links           → Return social media links
navigate_public_page       → Suggest navigation to public pages
```

**Knowledge Base (Static, Curated):**

```markdown
## Spelman College Glee Club - Public Information

### About Us
- Established 1924, celebrating 100+ years of excellence
- Director: Dr. Kevin P. Johnson
- Motto: "To Amaze and Inspire"
- Approximately 50 talented voices
- Rehearses MWF 5:00-6:30pm

### Contact Information
- Email: gleeclub@spelman.edu
- Media: media@spelman.edu
- Phone: (404) 270-5200
- Address: 350 Spelman Lane SW, Atlanta, GA 30314

### Website & Social
- Spelman College: spelman.edu
- GleeWorld: gleeworld.lovable.app
- Instagram: @spelmanglee
- Facebook: /SpelmanGlee
- X (Twitter): @spelmanglee
- YouTube: Spelman College Glee Club

### Booking Performances
- Visit our "Book Us" page to submit a request
- We perform nationally and internationally
- Contact us for pricing and availability

### Becoming a Fan
- Create a free fan account on GleeWorld
- Access exclusive content, concert updates, and merchandise

### Alumni/Alumnae
- Former members can login to access the Alumnae Portal
- Connect with current members and stay updated

### Auditions
- Auditions held at the start of each semester
- Open to all Spelman students
- Prepare 30-60 seconds of any song
- Sight-reading test included

### Major Events
- Christmas Carol Concert (December)
- Spring Concert
- Commencement performances
- National/International Tours
```

### Security Constraints

**The public assistant MUST NOT:**
- Access any tables without `is_public = true` filter
- Query `gw_profiles` directly
- Access grades, attendance, or internal member data
- Execute any admin tools
- Reveal internal policies or handbook content
- Access message history or communications

**The public assistant CAN:**
- Query public events from `gw_events`
- Answer questions from the static knowledge base
- Provide navigation guidance to public pages
- Share public contact information

---

## Files to Create/Modify

### New Files

| File | Purpose |
|------|---------|
| `supabase/functions/public-assistant/index.ts` | Edge function with public-only tools and knowledge |
| `src/components/assistant/PublicAssistant.tsx` | Chat interface component for landing page |

### Modified Files

| File | Changes |
|------|---------|
| `src/pages/GleeWorldLanding.tsx` | Import and add `<PublicAssistant />` component |
| `supabase/config.toml` | Add `[functions.public-assistant]` configuration |

---

## Example Conversations

**Visitor:** "When is Christmas Carol?"

**Assistant:** "The 100th Annual Spelman Morehouse Christmas Carol is scheduled for **December 5, 2026 at 7:00 PM** at Sisters Chapel, Spelman College. This is a historic milestone celebrating 100 years of this beloved tradition! Would you like to view more upcoming events?"

[View Calendar] button

---

**Visitor:** "How do I book the Glee Club for my event?"

**Assistant:** "We'd love to perform at your event! To request a booking, please fill out our booking request form with details about your event, including date, location, and type of performance needed. Our team will review your request and contact you about availability and pricing."

[Book Us] button

---

**Visitor:** "What's your phone number?"

**Assistant:** "You can reach the Spelman College Glee Club at:
- **Phone:** (404) 270-5200
- **Email:** gleeclub@spelman.edu
- **Address:** 350 Spelman Lane SW, Atlanta, GA 30314

For media inquiries, contact media@spelman.edu"

---

**Visitor:** "I'm an alumna, how do I access my account?"

**Assistant:** "Welcome back, Sister! If you're a Glee Club alumna, you can login to access the Alumnae Portal where you can connect with current members, share memories, and stay updated on Glee Club activities."

[Login] [Create Account] buttons

---

## Cost & Performance Considerations

- Uses `google/gemini-3-flash-preview` (fast, cost-effective)
- No streaming TTS (text-only responses)
- Minimal tool calls (mostly static knowledge)
- Rate-limited to prevent abuse (public endpoint)
- Caches common questions in the knowledge base

---

## Summary

This implementation creates a helpful public-facing assistant that:
1. Answers visitor questions about the Glee Club
2. Queries ONLY public event data
3. Never exposes internal/private information
4. Guides users to booking, registration, and contact pages
5. Maintains the welcoming, helpful tone of the Glee Club brand
