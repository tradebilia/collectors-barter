import { invokeLLM } from "./_core/llm";

export type UspsTrackingEvidenceReview = {
  classification: "recognized_result" | "tracking_not_available" | "mismatched_tracking_number" | "needs_review";
  detectedTrackingNumber: string | null;
  detectedStatusText: string | null;
  summary: string;
};

export function normalizeUspsEvidenceTrackingNumber(value: string | null | undefined) {
  return String(value ?? "").replace(/[^a-z0-9]/gi, "").toUpperCase();
}

export async function reviewUspsTrackingEvidence(input: {
  trackingNumber: string;
  imageDataUrl: string;
}): Promise<UspsTrackingEvidenceReview> {
  const response = await invokeLLM({
    model: "gemini-3-flash-preview",
    maxTokens: 600,
    messages: [
      {
        role: "system",
        content: "You review user-provided screenshots as limited evidence. Analyze only explicit text visible in an official USPS tracking result. Never infer validity from color, layout, logo alone, package imagery, or a CAPTCHA. Do not claim the screenshot is authentic or that USPS API verification occurred. Return JSON only.",
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `Submitted tracking number: ${input.trackingNumber}\n\nClassify the screenshot as exactly one of: recognized_result (an explicit USPS tracking status such as Delivered, In Transit, USPS in Possession of Item, Shipping Label Created, or another tracking event is visible), tracking_not_available (the explicit phrase “Tracking Not Available” or equivalent USPS unable-to-find result is visible), mismatched_tracking_number (a visible tracking number differs from the submitted one), or needs_review (cropped, unreadable, CAPTCHA, non-USPS page, no explicit tracking result, or insufficient evidence). Extract the visible tracking number and explicit status text when present.`,
          },
          { type: "image_url", image_url: { url: input.imageDataUrl, detail: "high" } },
        ],
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "usps_tracking_screenshot_review",
        strict: true,
        schema: {
          type: "object",
          properties: {
            classification: { type: "string", enum: ["recognized_result", "tracking_not_available", "mismatched_tracking_number", "needs_review"] },
            detectedTrackingNumber: { type: ["string", "null"] },
            detectedStatusText: { type: ["string", "null"] },
            summary: { type: "string" },
          },
          required: ["classification", "detectedTrackingNumber", "detectedStatusText", "summary"],
          additionalProperties: false,
        },
      },
    },
  });

  const raw = response.choices[0]?.message?.content;
  if (!raw) throw new Error("AI could not review the USPS evidence. Please try again.");

  let review: UspsTrackingEvidenceReview;
  try {
    const text = typeof raw === "string" ? raw : JSON.stringify(raw);
    review = JSON.parse(text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim()) as UspsTrackingEvidenceReview;
  } catch {
    throw new Error("AI returned an unreadable USPS evidence review. Please try again.");
  }

  const expected = normalizeUspsEvidenceTrackingNumber(input.trackingNumber);
  const observed = normalizeUspsEvidenceTrackingNumber(review.detectedTrackingNumber);
  if (observed && observed !== expected) {
    return {
      classification: "mismatched_tracking_number",
      detectedTrackingNumber: review.detectedTrackingNumber,
      detectedStatusText: review.detectedStatusText,
      summary: "The USPS evidence shows a different tracking number from the one entered for this trade.",
    };
  }

  return review;
}
