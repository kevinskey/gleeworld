// Centralized header icon sizing - change these values to resize all header icons at once
export const HEADER_ICON_SIZES = {
  // Button container sizes
  button: "h-10 w-10 sm:h-10 sm:w-10 md:h-12 md:w-12 lg:h-14 lg:w-14",
  
  // SVG icon sizes (with !important to override button defaults)
  icon: "!h-6 !w-6 md:!h-8 md:!w-8 lg:!h-11 lg:!w-11",
  
  // For use with [&_svg] selector in className
  svgSelector: "[&_svg]:!size-6 md:[&_svg]:!size-8 lg:[&_svg]:!size-11",
  
  // Avatar specific (slightly smaller than button)
  avatar: "h-9 w-9 sm:h-9 sm:w-9 md:h-11 md:w-11 lg:h-13 lg:w-13",
} as const;
