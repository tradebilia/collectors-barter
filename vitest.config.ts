import { defineConfig } from "vitest/config";
import path from "path";

const templateRoot = path.resolve(import.meta.dirname);

export default defineConfig({
  root: templateRoot,
  resolve: {
    alias: {
      "@": path.resolve(templateRoot, "client", "src"),
      "@shared": path.resolve(templateRoot, "shared"),
      "@assets": path.resolve(templateRoot, "attached_assets"),
    },
  },
  test: {
    environment: "node",
    include: ["server/**/*.test.ts", "server/**/*.spec.ts", "client/**/*.test.ts", "client/**/*.spec.ts", "shared/**/*.test.ts", "shared/**/*.spec.ts", "server/testAiSafeImage.test.tsx", "server/testAiUiStability.test.tsx", "server/testAiTitleEvidenceDisplay.test.tsx", "server/testAiVisualFailureDisplay.test.tsx", "server/testAiObservedDifferences.test.tsx", "server/testAiCandidateStatus.test.tsx", "server/testAiMetadataComparisonTable.test.tsx"],
    setupFiles: ["./vitest.setup.ts"],
  },
});
