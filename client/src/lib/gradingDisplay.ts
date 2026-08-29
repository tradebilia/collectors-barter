const OTHER_GRADING_COMPANY = "other";

/**
 * Resolve the user-facing grading-company label without leaking the form's
 * sentinel value when a member supplied a custom company name.
 */
export function getDisplayedGradingCompany(
  declaredCompany?: string | null,
  customGradingCompany?: string | null,
  fallback = "Graded",
): string {
  const declared = declaredCompany?.trim() ?? "";
  const custom = customGradingCompany?.trim() ?? "";

  if (declared.toLowerCase() === OTHER_GRADING_COMPANY) {
    return custom || "Grading company not specified";
  }

  return declared || fallback;
}
