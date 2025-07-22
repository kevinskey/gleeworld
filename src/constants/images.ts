// Import default event images
import eventDefault1 from "@/assets/event-default-1.jpg";
import eventDefault2 from "@/assets/event-default-2.jpg";
import eventDefault3 from "@/assets/event-default-3.jpg";
import eventDefault4 from "@/assets/event-default-4.jpg";
import eventDefault5 from "@/assets/event-default-5.jpg";

// Array of default event images to rotate through
export const DEFAULT_EVENT_IMAGES = [
  eventDefault1,
  eventDefault2,
  eventDefault3,
  eventDefault4,
  eventDefault5,
];

// Function to get a rotating default event image
export const getDefaultEventImage = (eventId?: string): string => {
  if (eventId) {
    // Use event ID to consistently select the same image for the same event
    const index = eventId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % DEFAULT_EVENT_IMAGES.length;
    return DEFAULT_EVENT_IMAGES[index];
  }
  
  // Random selection for events without ID
  const randomIndex = Math.floor(Math.random() * DEFAULT_EVENT_IMAGES.length);
  return DEFAULT_EVENT_IMAGES[randomIndex];
};

// Legacy export for backward compatibility
export const DEFAULT_EVENT_IMAGE = DEFAULT_EVENT_IMAGES[0];