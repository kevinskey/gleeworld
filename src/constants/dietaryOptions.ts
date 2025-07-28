// Standardized dietary restrictions and preferences
export const DIETARY_PREFERENCES = [
  "Vegetarian",
  "Vegan", 
  "Pescatarian",
  "Keto",
  "Paleo",
  "Gluten-Free",
  "Dairy-Free",
  "Kosher",
  "Halal",
  "Low Sodium",
  "Low Sugar"
] as const;

export const FOOD_ALLERGIES = [
  "Nut Allergy",
  "Peanut Allergy", 
  "Shellfish Allergy",
  "Soy Allergy",
  "Egg Allergy",
  "Fish Allergy",
  "Lactose Intolerant",
  "Sesame Allergy"
] as const;

// Combined list for backward compatibility and convenience
export const ALL_DIETARY_OPTIONS = [
  ...DIETARY_PREFERENCES,
  ...FOOD_ALLERGIES
] as const;

export type DietaryPreference = typeof DIETARY_PREFERENCES[number];
export type FoodAllergy = typeof FOOD_ALLERGIES[number];
export type DietaryOption = typeof ALL_DIETARY_OPTIONS[number];