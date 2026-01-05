// Centralized header icon sizing - change these values to resize all header icons at once
// Mobile icons reduced by 25% (6 -> 4.5 rounded to 5, buttons 10 -> 7.5 rounded to 8)
export const HEADER_ICON_SIZES = {
  // Button container sizes (mobile reduced 25%)
  button: "h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:w-12 lg:h-14 lg:w-14",
  
  // SVG icon sizes (with !important to override button defaults) (mobile reduced 25%)
  icon: "!h-5 !w-5 md:!h-8 md:!w-8 lg:!h-11 lg:!w-11",
  
  // For use with [&_svg] selector in className (mobile reduced 25%)
  svgSelector: "[&_svg]:!size-5 md:[&_svg]:!size-8 lg:[&_svg]:!size-11",
  
  // Avatar specific (slightly smaller than button) (mobile reduced 25%)
  avatar: "h-7 w-7 sm:h-9 sm:w-9 md:h-11 md:w-11 lg:h-13 lg:w-13",
} as const;
