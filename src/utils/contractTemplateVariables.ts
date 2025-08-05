export interface GleeClubVariables {
  HOST_NAME: string;
  HOST_LOCATION: string;
  PERFORMANCE_DATE: string;
  START_TIME: string;
  END_TIME: string;
  VENUE_NAME: string;
  VENUE_ADDRESS: string;
  HONORARIUM_AMOUNT: string;
  DEPOSIT_AMOUNT: string;
  PERFORMER_COUNT: string;
  SOUND_CHECK_HOURS: string;
  EQUIPMENT_REQUIREMENTS: string;
  COLLEGE_SIGNATORY_NAME: string;
  COLLEGE_SIGNATORY_TITLE: string;
  COLLEGE_DEPARTMENT: string;
  DIRECTOR_NAME: string;
  HOST_SIGNATORY_NAME: string;
  HOST_SIGNATORY_TITLE: string;
  HOST_DEPARTMENT: string;
  HOST_CONTACT_NAME: string;
  HOST_CONTACT_TITLE: string;
  HOST_CONTACT_DEPARTMENT: string;
}

export const replaceTemplateVariables = (template: string, variables: Partial<GleeClubVariables>): string => {
  let result = template;
  
  // Replace all template variables
  Object.entries(variables).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      // Handle both {{VAR}} and \\{{VAR}} formats
      const regex1 = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      const regex2 = new RegExp(`\\\\\\{\\{${key}\\}\\}`, 'g');
      result = result.replace(regex1, value);
      result = result.replace(regex2, value);
    }
  });
  
  return result;
};

export const getDefaultGleeClubVariables = (): Partial<GleeClubVariables> => ({
  PERFORMER_COUNT: "22",
  SOUND_CHECK_HOURS: "2",
  COLLEGE_SIGNATORY_NAME: "Dawn Alston",
  COLLEGE_SIGNATORY_TITLE: "Vice President",
  COLLEGE_DEPARTMENT: "Business & Financial Affairs and Treasurer",
  DIRECTOR_NAME: "Dr. Kevin Johnson, D.M.A.",
  HONORARIUM_AMOUNT: "5000.00",
  EQUIPMENT_REQUIREMENTS: `a. Amplifier: NORD stage 3, Korg Kronos, Roland RD2000, or comparable stage synthesizer.
b. Four handheld dynamic microphones.
c. Five condenser mics: Three condenser microphones to mic the risers & two condenser microphones for African drums.
d. Mic'd drum set on a rug.`
});

export const calculateDepositAmount = (honorariumAmount: string): string => {
  const amount = parseFloat(honorariumAmount.replace(/[^0-9.]/g, ''));
  if (isNaN(amount)) return "2500.00";
  return (amount * 0.5).toFixed(2);
};