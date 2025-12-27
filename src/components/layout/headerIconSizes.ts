// Centralized header icon sizing - change these values to resize all header icons at once
export const HEADER_ICON_SIZES = {
  // Button container sizes
  button: "h-8 w-8 sm:h-8 sm:w-8 md:h-10 md:w-10 lg:h-12 lg:w-12",
  
  // SVG icon sizes (with !important to override button defaults)
  icon: "!h-5 !w-5 md:!h-7 md:!w-7 lg:!h-10 lg:!w-10",
  
  // For use with [&_svg] selector in className
  svgSelector: "[&_svg]:!size-5 md:[&_svg]:!size-7 lg:[&_svg]:!size-10",
  
  // Avatar specific (slightly smaller than button)
  avatar: "h-7 w-7 sm:h-7 sm:w-7 md:h-9 md:w-9 lg:h-11 lg:w-11",
} as const;
