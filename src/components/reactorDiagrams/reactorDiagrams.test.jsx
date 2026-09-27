import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import ReactorSchematic from './ReactorSchematic.jsx';
import { SCHEMATICS } from './schematic/layouts.jsx';
import { buildReactorScene } from './three/build.js';

const TYPES = Object.keys(SCHEMATICS);

describe('reactor schematics', () => {
  afterEach(cleanup);

  it('covers all six designs', () => {
    expect(TYPES.sort()).toEqual(['BWR', 'Other', 'PHWR', 'PWR', 'SMR', 'VVER']);
  });

  it.each(TYPES)('%s: every interactive part has a label and description', (type) => {
    const { container } = render(<ReactorSchematic type={type} />);
    const ids = [...container.querySelectorAll('.npx-part')].map((node) => node.getAttribute('aria-label'));
    expect(ids.length).toBeGreaterThan(5);
    for (const id of ids) {
      expect(SCHEMATICS[type].parts[id], `${type}: missing copy for part "${id}"`).toMatchObject({
        label: expect.any(String),
        description: expect.any(String),
      });
    }
  });
});

describe('reactor 3D models', () => {
  it.each(TYPES)('%s: builds, and every hotspot maps to described copy', (type) => {
    const model = buildReactorScene(type);
    expect(model.root.children.length).toBeGreaterThan(5);
    expect(model.hotspots.length).toBeGreaterThan(3);
    for (const { id, anchor } of model.hotspots) {
      expect(SCHEMATICS[type].parts[id], `${type}: missing copy for hotspot "${id}"`).toBeTruthy();
      expect(anchor).toHaveLength(3);
    }
    model.update(1.5);
    model.dispose();
  });
});
