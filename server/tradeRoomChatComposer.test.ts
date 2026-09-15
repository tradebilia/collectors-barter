import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const projectRoot = resolve(import.meta.dirname, '..');
const warRoomSource = readFileSync(resolve(projectRoot, 'client/src/pages/WarRoom.tsx'), 'utf8');

describe('Trade Room chat composer typography', () => {
  it('uses a larger font only for the typed message input', () => {
    expect(warRoomSource).toContain('placeholder="Type a message..."');
    expect(warRoomSource).toContain('className="flex-1 min-w-0 bg-transparent pr-24 text-base text-gray-900 focus:outline-none placeholder:text-gray-400"');
  });

  it('retains the existing compact send control and does not change message history markup', () => {
    expect(warRoomSource).toContain('className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white hover:bg-blue-700 transition disabled:opacity-50 shrink-0"');
    expect(warRoomSource).toContain('<div ref={messagesEndRef} />');
  });
});
