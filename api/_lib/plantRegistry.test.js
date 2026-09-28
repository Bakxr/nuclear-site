import { describe, expect, it } from 'vitest';
import { diffStations, groupStations, mergePlants, stationBase, summarizeStations } from './plantRegistry.js';

const unit = (unitName, statusName, net, countryName = 'China', model = 'CAP1000') => ({ unitName, statusName, netElectricalCapacity: net, countryName, model, typeCode: 'PWR' });

const reactors = [
  unit('SANMEN-1', 'Operational', 1157),
  unit('SANMEN-2', 'Operational', 1157),
  unit('SANMEN-3', 'Under Construction', 1163),
  unit('QINSHAN-1', 'Operational', 308),
  unit('QINSHAN 2-1', 'Operational', 610),
  unit('QINSHAN 3-1', 'Operational', 677),
  unit('BAILONG-1', 'Under Construction', 1160),
  unit('HEYSHAM A-1', 'Operational', 575, 'United Kingdom', 'AGR'),
  unit('HEYSHAM B-1', 'Operational', 610, 'United Kingdom', 'AGR'),
  unit('TSURUGA-2', 'Suspended Operation', 1108, 'Japan', 'PWR'),
  unit('OLDSITE-1', 'Permanent Shutdown', 500, 'United States of America'),
];

describe('plant registry', () => {
  it('derives station names from unit names', () => {
    expect(stationBase('SAEUL-1 ')).toBe('SAEUL');
    expect(stationBase('LENINGRAD 2-3')).toBe('LENINGRAD 2');
    expect(stationBase('DARLINGTON SMR1')).toBe('DARLINGTON SMR');
    expect(stationBase('HINKLEY POINT C-1')).toBe('HINKLEY POINT C');
  });

  it('takes status, units and capacity from PRIS and folds new builds into operating sites', () => {
    const curated = [
      { name: 'Sanmen', country: 'China', lat: 29.1, lng: 121.6, capacity: 2500, status: 'Operating', reactors: 2, type: 'AP1000' },
      { name: 'Sanmen 3-4', country: 'China', lat: 29.1, lng: 121.6, capacity: 2500, status: 'Construction', reactors: 2, type: 'CAP1000' },
    ];
    const { plants } = mergePlants(curated, groupStations(reactors), {});
    const sanmen = plants.filter((p) => p.name.startsWith('Sanmen'));
    expect(sanmen).toHaveLength(1); // duplicate curated entry collapses
    expect(sanmen[0]).toMatchObject({ status: 'Operating', reactors: 2, capacity: 2314, underConstruction: { reactors: 1, capacity: 1163 }, type: 'AP1000', source: 'iaea' });
  });

  it('lets one curated entry cover several PRIS stations', () => {
    const curated = [{ name: 'Qinshan', country: 'China', lat: 30.4, lng: 120.9, capacity: 0, status: 'Operating', reactors: 0, type: 'PWR/PHWR' }];
    const qinshan = mergePlants(curated, groupStations(reactors), {}).plants.find((p) => p.name === 'Qinshan');
    expect(qinshan).toMatchObject({ reactors: 3, capacity: 1595 });
  });

  it('adds new PRIS stations with known coordinates and merges ones sharing an article', () => {
    const coords = {
      'china:bailong': { name: 'Bailong', lat: 21.55, lng: 108.29, wiki: 'Bailong' },
      'uk:heyshama': { name: 'Heysham', lat: 54.03, lng: -2.92, wiki: 'Heysham nuclear power station' },
      'uk:heyshamb': { name: 'Heysham', lat: 54.03, lng: -2.92, wiki: 'Heysham nuclear power station' },
    };
    const { plants, missingCoords } = mergePlants([], groupStations(reactors), coords);
    expect(plants.find((p) => p.name === 'Bailong')).toMatchObject({ status: 'Construction', reactors: 1, capacity: 1160 });
    expect(plants.filter((p) => p.name === 'Heysham')).toHaveLength(1);
    expect(plants.find((p) => p.name === 'Heysham')).toMatchObject({ reactors: 2, capacity: 1185 });
    expect(missingCoords).toContain('japan:tsuruga'); // idled units still count as a live station
    expect(missingCoords).not.toContain('usa:oldsite'); // fully shut stations aren't added
  });

  it('keeps curated entries PRIS does not track', () => {
    const curated = [{ name: 'Kemmerer', country: 'USA', lat: 41.7, lng: -110.5, capacity: 345, status: 'Construction', reactors: 1, type: 'SFR' }];
    const { plants, unmatchedCurated } = mergePlants(curated, groupStations(reactors), {});
    expect(plants[0]).toMatchObject({ name: 'Kemmerer', status: 'Construction', source: 'curated' });
    expect(unmatchedCurated).toEqual(['Kemmerer']);
  });

  it('reports construction starts, new operation and new stations between two days', () => {
    const before = summarizeStations(groupStations(reactors));
    const after = summarizeStations(groupStations([
      ...reactors.filter((r) => r.unitName !== 'SANMEN-3'),
      unit('SANMEN-3', 'Operational', 1163),
      unit('BAILONG-2', 'Under Construction', 1160),
      unit('NEWSITE-1', 'Under Construction', 1000),
    ]));
    const changes = diffStations(before, after).map((c) => c.kind + ':' + (c.unit || c.station));
    expect(changes).toEqual(expect.arrayContaining(['operating:SANMEN-3', 'construction-start:BAILONG-2', 'new-station:Newsite (China)']));
    expect(changes).not.toContain('removed:SANMEN-3');
  });
});
