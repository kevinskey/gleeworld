// Block registry for the public site builder. Adding a new block type =
// one new file in ./blocks + one entry here.
import type { BlockModule } from './types';
import { headerBlock } from './blocks/header';
import { heroBlock } from './blocks/hero';
import { eventsBlock } from './blocks/events';
import { aboutBlock } from './blocks/about';
import { contactBlock } from './blocks/contact';
import { donationsBlock } from './blocks/donations';
import { merchBlock } from './blocks/merch';
import { musicPlayerBlock } from './blocks/music-player';
import { soundcloudBlock } from './blocks/soundcloud';
import { videoGalleryBlock } from './blocks/video-gallery';
import { mediaGalleryBlock } from './blocks/media-gallery';
import { staffBlock } from './blocks/staff';
import { ensemblesBlock } from './blocks/ensembles';
import { concertTicketsBlock } from './blocks/concert-tickets';
import { concertRsvpBlock } from './blocks/concert-rsvp';
import { alumniSpotlightBlock } from './blocks/alumni-spotlight';
import { spotlightBlock } from './blocks/spotlight';
import { scholarshipBlock } from './blocks/scholarship';
import { appointmentBookingBlock } from './blocks/appointment-booking';
import { pressBlock } from './blocks/press';
import { supportBlock } from './blocks/support';
import { fanSignupBlock } from './blocks/fan-signup';
import { liturgicalCalendarBlock } from './blocks/liturgical-calendar';

export const BLOCK_REGISTRY: Record<string, BlockModule> = {
  [headerBlock.type]: headerBlock,
  [heroBlock.type]: heroBlock,
  [eventsBlock.type]: eventsBlock,
  [aboutBlock.type]: aboutBlock,
  [mediaGalleryBlock.type]: mediaGalleryBlock,
  [musicPlayerBlock.type]: musicPlayerBlock,
  [soundcloudBlock.type]: soundcloudBlock,
  [videoGalleryBlock.type]: videoGalleryBlock,
  [ensemblesBlock.type]: ensemblesBlock,
  [staffBlock.type]: staffBlock,
  [pressBlock.type]: pressBlock,
  [supportBlock.type]: supportBlock,
  [fanSignupBlock.type]: fanSignupBlock,
  [liturgicalCalendarBlock.type]: liturgicalCalendarBlock,
  [contactBlock.type]: contactBlock,
  [donationsBlock.type]: donationsBlock,
  [merchBlock.type]: merchBlock,
  [concertTicketsBlock.type]: concertTicketsBlock,
  [concertRsvpBlock.type]: concertRsvpBlock,
  [alumniSpotlightBlock.type]: alumniSpotlightBlock,
  [spotlightBlock.type]: spotlightBlock,
  [scholarshipBlock.type]: scholarshipBlock,
  [appointmentBookingBlock.type]: appointmentBookingBlock,
  // Back-compat: `video-gallery` was the original key for the Videos block.
  // Map it to the same module so stored configs continue to render.
  'video-gallery': videoGalleryBlock,
};

// Dedupe — back-compat aliases share a module instance with their canonical key.
export const BLOCK_LIST: BlockModule[] = Array.from(new Set(Object.values(BLOCK_REGISTRY)));

export function getBlockModule(type: string): BlockModule | undefined {
  return BLOCK_REGISTRY[type];
}

/** A block renders publicly only if free, or its required addon is active. */
export function isBlockAvailable(mod: BlockModule, activeAddons: string[]): boolean {
  return mod.tier === 'free' || !mod.requiredAddon || activeAddons.includes(mod.requiredAddon);
}
