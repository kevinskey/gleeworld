// The one reserved tool-group id, in a LEAF module on purpose.
//
// appDestinations.ts needs this value at runtime, and its import of
// myTools.ts is type-only precisely because myTools imports parseTileLayout
// back from it — a value import there would close that cycle (see the
// comment on that import). This file imports nothing, so anyone can take it.
//
// FAVORITES is an ordinary ToolGroup in the member's record — same shape,
// same save path — with two rules attached:
//
//   1. It bands FIRST on the Command Center grid (see bandDestinations).
//   2. It never renders in the sidebar shelf.
//
// That second rule is the point (Kevin, 2026-08-20: "i dont need to list
// favorites in the left nav because its on page cards"), and it is why
// favorites cannot simply BE the member's loose tools: loose is what the
// sidebar shows, and adding an app has to keep putting something in the nav
// or "add this to my left nav" becomes unreachable. Loose = nav; Favorites =
// page. Dragging between them on the grid moves an app from one to the other.
//
// Created lazily — a member who never puts anything in Favorites never grows
// the group.
export const FAVORITES_GROUP_ID = 'favorites';
export const FAVORITES_GROUP_NAME = 'Favorites';
