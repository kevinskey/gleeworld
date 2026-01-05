// Centralized header icon sizing - change these values to resize all header icons at once
// Responsive scaling: mobile (sm-) → tablet (md) → desktop (lg) → large (xl)
export const HEADER_ICON_SIZES = {
  // Button container sizes - more gradual responsive scaling
  button: "h-7 w-7 sm:h-8 sm:w-8 md:h-9 md:w-9 lg:h-10 lg:w-10 xl:h-11 xl:w-11",
  
  // SVG icon sizes (with !important to override button defaults)
  icon: "!h-4 !w-4 sm:!h-5 sm:!w-5 md:!h-5 md:!w-5 lg:!h-6 lg:!w-6 xl:!h-7 xl:!w-7",
  
  // For use with [&_svg] selector in className
  svgSelector: "[&_svg]:!size-4 sm:[&_svg]:!size-5 md:[&_svg]:!size-5 lg:[&_svg]:!size-6 xl:[&_svg]:!size-7",
  
  // Avatar specific (slightly smaller than button)
  avatar: "h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 lg:h-9 lg:w-9 xl:h-10 xl:w-10",
} as const;
