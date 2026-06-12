// Scroll only the chat's own scroll container. scrollIntoView also scrolls
// ancestor containers (including the page on mobile), yanking the header
// offscreen when the thread loads.
export function scrollChatToBottom(end: HTMLElement | null, behavior: ScrollBehavior = 'smooth') {
  const viewport = end?.closest<HTMLElement>('[data-radix-scroll-area-viewport], .overflow-y-auto');
  viewport?.scrollTo({ top: viewport.scrollHeight, behavior });
}
