import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const source = readFileSync(resolve(process.cwd(), 'client/src/pages/AddInventory.tsx'), 'utf8');
const selectorSource = readFileSync(resolve(process.cwd(), 'client/src/components/CategoryItemTypeSelector.tsx'), 'utf8');

describe('Add Inventory submit action', () => {
  it('uses the blue Submit Collectible action without changing submit behavior', () => {
    expect(source).toContain('type="submit" className="bg-blue-600 text-white hover:bg-blue-700"');
    expect(source).toContain('{isEditMode ? "Update Listing" : "Submit Collectible"}');
    expect(source).toContain('createListingMutation.isPending || updateListingMutation.isPending');
    expect(source).toContain('Loader2 className="mr-2 h-4 w-4 animate-spin"');
  });

  it('uses the enlarged responsive Add To Your Inventory hero artwork', () => {
    expect(source).toContain('className="h-auto w-[140%] max-w-none sm:w-[130%] lg:w-[140%]"');
    expect(source).toContain('alt="Add To Your Inventory"');
    expect(selectorSource).toContain('bg-white text-slate-900 placeholder:text-slate-500 border-slate-300');
    expect(selectorSource).toContain('disabled:bg-white disabled:text-slate-500 disabled:opacity-100');
  });

  it('does not issue an invalid draft query when a member opens a new inventory form', () => {
    expect(source).toContain("const parsedDraftId = isDraftMode ? Number.parseInt(params.listingId!.replace('draft-', ''), 10) : null;");
    expect(source).toContain('const draftId = parsedDraftId && parsedDraftId > 0 ? parsedDraftId : null;');
    expect(source).toContain('{ draftId: draftId ?? 1 }');
    expect(source).toContain('{ enabled: isDraftMode && draftId !== null }');
    expect(source).not.toContain('{ draftId: draftId || 0 }');
  });
});
