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

export const BLOCK_REGISTRY: Record<string, BlockModule> = {
  [headerBlock.type]: headerBlock,
  [heroBlock.type]: heroBlock,
  [eventsBlock.type]: eventsBlock,
  [aboutBlock.type]: aboutBlock,
  [contactBlock.type]: contactBlock,
  [donationsBlock.type]: donationsBlock,
  [merchBlock.type]: merchBlock,
};

export const BLOCK_LIST: BlockModule[] = Object.values(BLOCK_REGISTRY);

export function getBlockModule(type: string): BlockModule | undefined {
  return BLOCK_REGISTRY[type];
}

/** A block renders publicly only if free, or its required addon is active. */
export function isBlockAvailable(mod: BlockModule, activeAddons: string[]): boolean {
  return mod.tier === 'free' || !mod.requiredAddon || activeAddons.includes(mod.requiredAddon);
}
