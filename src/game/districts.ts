import type { LayoutId } from './map';

export type DistrictTheme =
  | 'housing'
  | 'market'
  | 'docks'
  | 'corporate'
  | 'blackSite'
  | 'transit'
  | 'rooftop'
  | 'alley'
  | 'safehouse';

export type DistrictWeather = 'rain' | 'ash' | 'embers' | 'none';
export type DistrictAmbience = 'rain' | 'wind' | 'embers' | 'none';
export type DistrictDecals = 'puddles' | 'cables' | 'hazards' | 'circuits' | 'stage' | 'none';

export interface DistrictDef {
  theme: DistrictTheme;
  weather: DistrictWeather;
  ambience: DistrictAmbience;
  floor: string[];
  wall: string;
  grid: string;
  neon: string[];
  decals: DistrictDecals;
}

const DEFAULT_FLOOR = ['#232f40', '#273446', '#1f2a39', '#2b384a'];
const DEFAULT_NEON = ['#5ef1ff', '#ff2f8e', '#8b6bff', '#ffc46b'];
const DEFAULT_GRID = 'rgba(84, 110, 150, 0.18)';
const DEFAULT_WALL = '#080d15';

function district(
  theme: DistrictTheme,
  weather: DistrictWeather,
  ambience: DistrictAmbience,
  decals: DistrictDecals,
  floor = DEFAULT_FLOOR,
  neon = DEFAULT_NEON,
  grid = DEFAULT_GRID,
  wall = DEFAULT_WALL,
): DistrictDef {
  return { theme, weather, ambience, floor, wall, grid, neon, decals };
}

export const DISTRICTS: Record<LayoutId, DistrictDef> = {
  safehouse: district(
    'safehouse',
    'none',
    'none',
    'none',
    ['#17131e', '#1a1622', '#14111b', '#1c1825'],
    DEFAULT_NEON,
    'rgba(130, 95, 150, 0.12)',
  ),
  sector07: district('housing', 'rain', 'rain', 'cables'),
  tenements: district('housing', 'ash', 'wind', 'cables'),
  nightmarket: district(
    'market',
    'rain',
    'rain',
    'puddles',
    ['#202b3c', '#253247', '#1b2432', '#2b394f'],
  ),
  docks: district(
    'docks',
    'rain',
    'rain',
    'hazards',
    ['#1b2a2d', '#22353a', '#162225', '#283d40'],
    ['#5ef1ff', '#7dffcf', '#ffc46b', '#ff8a4c'],
    'rgba(120, 200, 180, 0.14)',
  ),
  spire: district(
    'corporate',
    'ash',
    'wind',
    'circuits',
    ['#241f33', '#2a243b', '#1d1929', '#312a45'],
    ['#8b6bff', '#ff2f8e', '#5ef1ff', '#ffd08a'],
    'rgba(170, 130, 230, 0.14)',
  ),
  sublevel: district('blackSite', 'embers', 'embers', 'circuits'),
  transit: district('transit', 'rain', 'rain', 'cables'),
  arcology: district('corporate', 'ash', 'wind', 'circuits'),
  freighter: district('docks', 'rain', 'rain', 'hazards'),
  nightclub: district('market', 'rain', 'rain', 'stage'),
  rooftops: district(
    'rooftop',
    'rain',
    'rain',
    'puddles',
    ['#101820', '#0c1218', '#15232c'],
    ['#5ef1ff', '#ff7a4c'],
    'rgba(120, 180, 210, 0.16)',
    '#0b1219',
  ),
  neon_alley: district(
    'alley',
    'rain',
    'rain',
    'puddles',
    ['#14181c', '#0f1216', '#1b2226'],
    ['#ff2f8e', '#7dffcf', '#ffc46b'],
    'rgba(220, 90, 150, 0.16)',
    '#0a1014',
  ),
};

export function districtFor(id: LayoutId): DistrictDef {
  return DISTRICTS[id] ?? DISTRICTS.sector07;
}
