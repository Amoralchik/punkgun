import { describe, expect, it, vi } from 'vitest';
import type { Input } from '../core/input';
import type { Renderer } from '../render/renderer';
import type { MenuNavigation } from '../ui/menu-navigation';
import type { World } from './world';
import { FrameShell } from './frame-shell';

describe('frame shell', () => {
  it('polls input/menu and finalizes rendering', () => {
    const input = { pollGamepad: vi.fn(), endFrame: vi.fn() } as unknown as Input;
    const menu = { poll: vi.fn() } as unknown as MenuNavigation;
    const renderer = { sync: vi.fn() } as unknown as Renderer;
    const world = {} as World;
    const shell = new FrameShell(input, menu);
    shell.begin(0.016);
    expect(input.pollGamepad).toHaveBeenCalledWith(0.016);
    expect(menu.poll).toHaveBeenCalled();
    shell.finish(renderer, world, 0.016, true, 'playing');
    expect(renderer.sync).toHaveBeenCalledWith(world, 0.016);
    expect(input.endFrame).toHaveBeenCalled();
  });
});
