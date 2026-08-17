// Carries the admin type-switcher control from DateCardSlot into whichever
// frame the active card renders (CardFrame for most, LiturgicalDayCard's own
// plate for liturgical), so the carat sits inline at the end of the eyebrow
// row instead of floating in the corner — where it collided with the card's
// own '›' action chevron. Null (the default) means no switcher: members, the
// settings-panel preview, and LiturgicalDayCard used outside the slot.
import { createContext } from 'react';
import type { ReactNode } from 'react';

export const DateCardSwitcherContext = createContext<ReactNode>(null);
