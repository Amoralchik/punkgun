import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { LightPool, type LightSpec } from './lightpool';
import { districtFor } from '../game/districts';
import { SightMask } from './sight';
import { SoundPings } from './pings';
import { BarkLabels } from './bark-labels';
import { FilmPass } from './film-pass';
import { TextureBank } from './textures';
import { WeatherField, weatherForLevel } from './weather';
import { Level, TILE, tileCenter } from '../game/map';
import { World } from '../game/world';
import type { Enemy, EnemyKind, ObjectiveNode, Player } from '../game/world-types';
import { WEAPONS, WeaponId } from '../game/weapons';
import { ENEMY_AIM_WINDUP } from '../game/enemy-data';
import { squadIntent } from '../game/world-ai';
import { LOOT_DEFS, LootKind } from '../game/economy';
import type { Palette } from '../core/settings';

const QUAD = new THREE.PlaneGeometry(1, 1);
const RELOAD_RING_GEO = new THREE.RingGeometry(34, 38, 40);
const BOSS_WEAK_GEO = new THREE.RingGeometry(44, 52, 40);
const VIEW_H = 520;
const RUN_VIEW_H = 640;
const DECALS_PER_TEX = 88;
const SPARKS = 220;
const BLOOD_DROPS = 200;
const BULLETS = 140;
const CONE_SEGMENTS = 18;

interface UnitView {
  root: THREE.Group;
  body: THREE.Mesh;
  weapon: THREE.Mesh;
  flash: THREE.Mesh;
  shadow: THREE.Mesh;
  mark: THREE.Mesh;
  intentMark: THREE.Mesh;
  targetMark: THREE.Mesh;
  shieldMesh: THREE.Mesh;
  laserMesh: THREE.Mesh;
  bossRing: THREE.Mesh;
  weakRing: THREE.Mesh;
  chargeRing: THREE.Mesh;
  reloadRing: THREE.Mesh;
  vision: THREE.Mesh | null;
  visionMat: THREE.MeshBasicMaterial | null;
  weaponId: WeaponId | null;
  bodyTex: THREE.Texture | null;
  corpse: boolean;
  markScale: number;
  weaponSwapT: number;
  deathT: number;
  spawnT: number;
  /** 0..1 fade for line-of-sight hiding. */
  seenK: number;
  /** Footstep ping cadence and last-known state for sound pings. */
  pingT: number;
  lastState: string;
  flashPinged: boolean;
}

interface WeaponVisual {
  w: number;
  h: number;
  x: number;
  y: number;
}

const WEAPON_VIS: Record<Exclude<WeaponId, 'fists'>, WeaponVisual> = {
  pistol: { w: 40, h: 20, x: 38, y: 5 },
  revolver: { w: 44, h: 21, x: 39, y: 5 },
  shotgun: { w: 54, h: 18, x: 40, y: 5 },
  bat: { w: 50, h: 15, x: 36, y: 5 },
  smg: { w: 46, h: 18, x: 34, y: 5 },
  carbine: { w: 54, h: 18, x: 38, y: 5 },
  needler: { w: 48, h: 17, x: 36, y: 5 },
  rifle: { w: 64, h: 15, x: 40, y: 5 },
  dmr: { w: 70, h: 15, x: 41, y: 5 },
  ak: { w: 58, h: 17, x: 38, y: 5 },
  lmg: { w: 72, h: 22, x: 42, y: 5 },
  plasma: { w: 60, h: 23, x: 40, y: 5 },
  railgun: { w: 78, h: 18, x: 42, y: 5 },
};

export class Renderer {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera: THREE.OrthographicCamera;
  readonly composer: EffectComposer;
  private readonly bloom: UnrealBloomPass;
  private readonly textures = new TextureBank();
  private readonly weather = new WeatherField();
  private readonly lights: LightPool;
  private readonly film: FilmPass;

  private readonly dynamic = new THREE.Group();
  private readonly fx = new THREE.Group();
  private readonly holoGroup = new THREE.Group();
  private readonly holoMats: THREE.MeshBasicMaterial[] = [];
  private mapMesh: THREE.Mesh | null = null;
  private mapLevel: Level | null = null;
  private exitMesh: THREE.Mesh | null = null;
  private exitMat: THREE.MeshBasicMaterial | null = null;
  private readonly unitViews = new Map<number, UnitView>();
  private readonly doorViews = new Map<number, { group: THREE.Group; door: World['doors'][number] }>();
  private readonly pickupViews = new Map<number, THREE.Group>();
  private readonly lootViews = new Map<number, THREE.Group>();
  private readonly objectiveViews = new Map<number, THREE.Group>();
  private readonly barrelViews = new Map<number, THREE.Mesh>();
  private readonly cameraViews = new Map<
    number,
    { group: THREE.Group; beam: THREE.Mesh; beamMat: THREE.MeshBasicMaterial }
  >();
  private readonly turretViews = new Map<
    number,
    { group: THREE.Group; beam: THREE.Mesh; beamMat: THREE.MeshBasicMaterial }
  >();
  private readonly laserViews = new Map<number, { mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial }>();
  private readonly smokeViews = new Map<number, THREE.Mesh>();
  private readonly grenadeViews = new Map<number, THREE.Mesh>();
  private readonly explosionViews = new Map<number, THREE.Mesh>();
  private readonly glassViews = new Map<
    number,
    { mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial }
  >();
  private readonly steamViews = new Map<number, { mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial }>();

  private readonly decalPools: THREE.Mesh[][] = [[], [], []];
  private readonly sparkPool: THREE.Mesh[] = [];
  private readonly bloodPool: THREE.Mesh[] = [];
  private readonly bulletPool: THREE.Mesh[] = [];
  private slashMesh!: THREE.Mesh;
  private slashMat!: THREE.MeshBasicMaterial;
  private readonly dashTrail: THREE.Mesh;
  private readonly quickhackRing: THREE.Mesh;
  private readonly quickhackMat: THREE.MeshBasicMaterial;

  private readonly laserMat = new THREE.MeshBasicMaterial({
    color: 0xff3b4e,
    transparent: true,
    opacity: 0.55,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  private readonly chargeMat = new THREE.MeshBasicMaterial({
    color: 0xff3b4e,
    transparent: true,
    opacity: 0.7,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
  private readonly matCache = new Map<string, THREE.MeshBasicMaterial>();
  private readonly weaponMats = new Map<WeaponId, THREE.MeshBasicMaterial>();
  private readonly ray = new THREE.Raycaster();
  private readonly ndc = new THREE.Vector2();
  private readonly plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
  private readonly hit = new THREE.Vector3();

  private viewH = VIEW_H;
  private camX = 0;
  private camY = 0;
  private aspect = 1;
  private shakeScale = 1;
  private bloomScale = 1;
  private conesVisible = true;
  private readonly sight = new SightMask();
  private readonly pings = new SoundPings();
  private readonly barkLabels = new BarkLabels();
  private laserLine!: THREE.Mesh;
  private laserDot!: THREE.Mesh;
  private laserLineMat!: THREE.MeshBasicMaterial;
  private laserDotMat!: THREE.MeshBasicMaterial;
  private executePrompt!: THREE.Mesh;
  private readonly civilianViews = new Map<
    number,
    { root: THREE.Group; body: THREE.Mesh; mat: THREE.MeshBasicMaterial; dead: boolean; tex: THREE.Texture | null }
  >();
  private reducedMotion = false;
  private palette = { cyan: 0x5ef1ff, magenta: 0xff2f8e, red: 0xff3b4e, amber: 0xffc46b };

  constructor(readonly canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.NoToneMapping;
    this.scene.background = new THREE.Color('#05070c');

    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 400);
    this.camera.position.set(0, 0, 120);
    this.camera.zoom = 1;

    this.scene.add(this.dynamic);
    this.scene.add(this.fx);
    this.scene.add(this.holoGroup);
    this.scene.add(this.weather.group);
    this.lights = new LightPool(this.textures.dot);
    this.scene.add(this.lights.group);
    this.scene.add(this.sight.mesh);
    this.scene.add(this.pings.group);
    this.scene.add(this.barkLabels.group);
    this.buildCombatAids();
    this.buildPools();
    this.slashMat = new THREE.MeshBasicMaterial({
      map: this.textures.slash,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.slashMesh = new THREE.Mesh(QUAD, this.slashMat);
    this.slashMesh.visible = false;
    this.slashMesh.position.z = 1.8;
    this.fx.add(this.slashMesh);

    this.dashTrail = new THREE.Mesh(
      QUAD,
      new THREE.MeshBasicMaterial({
        map: this.textures.dot,
        color: 0x5ef1ff,
        transparent: true,
        opacity: 0.25,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    this.dashTrail.visible = false;
    this.dashTrail.position.z = 1.25;
    this.fx.add(this.dashTrail);

    this.quickhackMat = new THREE.MeshBasicMaterial({
      map: this.textures.dot,
      color: 0x5ef1ff,
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.quickhackRing = new THREE.Mesh(QUAD, this.quickhackMat);
    this.quickhackRing.visible = false;
    this.quickhackRing.position.z = 1.4;
    this.fx.add(this.quickhackRing);

    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.38, 0.3, 0.72);
    this.composer.addPass(this.bloom);
    this.film = new FilmPass();
    this.composer.addPass(this.film);
    this.composer.addPass(new OutputPass());

    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  /* ------------------------------------------------------------------ */
  /* setup                                                               */
  /* ------------------------------------------------------------------ */

  /** Player laser sight and the floating EXECUTE prompt. */
  private buildCombatAids(): void {
    this.laserLineMat = new THREE.MeshBasicMaterial({
      color: 0x5ef1ff,
      transparent: true,
      opacity: 0.4,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.laserLine = new THREE.Mesh(QUAD, this.laserLineMat);
    this.laserLine.visible = false;
    this.laserDotMat = new THREE.MeshBasicMaterial({
      map: this.textures.dot,
      color: 0x9ffcff,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.laserDot = new THREE.Mesh(QUAD, this.laserDotMat);
    this.laserDot.visible = false;
    const c = document.createElement('canvas');
    c.width = 192;
    c.height = 48;
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = 'rgba(8, 10, 16, 0.82)';
    ctx.strokeStyle = '#ffc46b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(4, 6, 184, 36, 6);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#ffc46b';
    ctx.fillRect(12, 13, 22, 22);
    ctx.fillStyle = '#0a0c12';
    ctx.font = 'bold 17px Bahnschrift, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('E', 23, 25);
    ctx.fillStyle = '#ffc46b';
    ctx.textAlign = 'left';
    ctx.fillText('EXECUTE', 44, 25);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    this.executePrompt = new THREE.Mesh(
      QUAD,
      new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }),
    );
    this.executePrompt.scale.set(96, 24, 1);
    this.executePrompt.visible = false;
    this.scene.add(this.laserLine, this.laserDot, this.executePrompt);
  }

  private buildPools(): void {
    for (let t = 0; t < 3; t++) {
      for (let i = 0; i < DECALS_PER_TEX; i++) {
        const mat = new THREE.MeshBasicMaterial({
          map: this.textures.blood[t],
          transparent: true,
          opacity: 0.82,
          depthWrite: false,
        });
        const mesh = new THREE.Mesh(QUAD, mat);
        mesh.visible = false;
        mesh.position.z = 0.12;
        this.fx.add(mesh);
        this.decalPools[t].push(mesh);
      }
    }

    for (let i = 0; i < SPARKS; i++) {
      const mat = new THREE.MeshBasicMaterial({
        map: this.textures.dot,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(QUAD, mat);
      mesh.visible = false;
      mesh.position.z = 1.55;
      this.fx.add(mesh);
      this.sparkPool.push(mesh);
    }

    for (let i = 0; i < BLOOD_DROPS; i++) {
      const mat = new THREE.MeshBasicMaterial({
        map: this.textures.dot,
        transparent: true,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(QUAD, mat);
      mesh.visible = false;
      mesh.position.z = 1.5;
      this.fx.add(mesh);
      this.bloodPool.push(mesh);
    }

    for (let i = 0; i < BULLETS; i++) {
      const mat = new THREE.MeshBasicMaterial({
        map: this.textures.bullet,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(QUAD, mat);
      mesh.visible = false;
      mesh.position.z = 1.7;
      this.fx.add(mesh);
      this.bulletPool.push(mesh);
    }
  }

  private mat(tex: THREE.Texture, additive = false, opacity = 1, color = 0xffffff): THREE.MeshBasicMaterial {
    const key = `${tex.uuid}:${additive ? 1 : 0}:${opacity}:${color}`;
    let m = this.matCache.get(key);
    if (!m) {
      m = new THREE.MeshBasicMaterial({
        map: tex,
        transparent: true,
        opacity,
        color,
        depthWrite: false,
        blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
      });
      this.matCache.set(key, m);
    }
    return m;
  }

  private weaponMat(id: Exclude<WeaponId, 'fists'>): THREE.MeshBasicMaterial {
    let m = this.weaponMats.get(id);
    if (!m) {
      const tex = this.textures.weapons.get(id);
      if (!tex) throw new Error(`no texture for ${id}`);
      m = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false });
      this.weaponMats.set(id, m);
    }
    return m;
  }

  bind(world: World): void {
    this.viewH = world.level.id === 'safehouse' ? VIEW_H : RUN_VIEW_H;
    this.weather.setKind(weatherForLevel(world.level.id));
    this.resize();
    this.dynamic.clear();
    this.holoGroup.clear();
    this.holoMats.length = 0;
    this.unitViews.clear();
    this.doorViews.clear();
    this.pickupViews.clear();
    this.lootViews.clear();
    this.objectiveViews.clear();
    this.barrelViews.clear();
    for (const view of this.cameraViews.values()) view.beamMat.dispose();
    for (const view of this.turretViews.values()) view.beamMat.dispose();
    for (const view of this.laserViews.values()) view.mat.dispose();
    this.cameraViews.clear();
    this.turretViews.clear();
    this.laserViews.clear();
    for (const mesh of this.smokeViews.values()) {
      (mesh.material as THREE.Material).dispose();
    }
    for (const mesh of this.explosionViews.values()) {
      (mesh.material as THREE.Material).dispose();
    }
    for (const view of this.glassViews.values()) view.mat.dispose();
    for (const view of this.steamViews.values()) view.mat.dispose();
    this.smokeViews.clear();
    this.grenadeViews.clear();
    this.explosionViews.clear();
    this.glassViews.clear();
    this.steamViews.clear();
    this.exitMesh = null;
    this.exitMat = null;

    const level = world.level;
    if (!this.mapMesh || this.mapLevel !== level) {
      const tex = this.textures.map(level);
      const mat = new THREE.MeshBasicMaterial({ map: tex });
      const geo = new THREE.PlaneGeometry(level.w * TILE, level.h * TILE);
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set((level.w * TILE) / 2, (level.h * TILE) / 2, 0);
      this.mapMesh = mesh;
      this.mapLevel = level;
    }
    this.dynamic.add(this.mapMesh);
    // Runs sit a stop darker than the safehouse so light pools carve the
    // space (noir: light is information, darkness is the default). A
    // blackout floor drops another stop: only flashlights and neon remain.
    (this.mapMesh.material as THREE.MeshBasicMaterial).color.setScalar(
      level.id === 'safehouse' ? 1 : world.setpiece === 'blackoutFloor' ? 0.52 : 0.8,
    );
    for (const view of this.civilianViews.values()) this.dynamic.remove(view.root);
    this.civilianViews.clear();

    for (const d of world.doors) {
      const group = new THREE.Group();
      if (d.axis === 'h') {
        group.position.set(d.x - 30, d.y, 0.55);
      } else {
        group.position.set(d.x, d.y - 30, 0.55);
        group.rotation.z = Math.PI / 2;
      }
      const leaf = new THREE.Mesh(QUAD, this.mat(this.textures.door));
      leaf.scale.set(60, 16, 1);
      leaf.position.set(30, 0, 0);
      group.add(leaf);
      this.dynamic.add(group);
      this.doorViews.set(d.cy * level.w + d.cx, { group, door: d });
    }

    for (let index = 0; index < level.glass.length; index++) {
      if (level.glass[index] !== 1) continue;
      const cx = index % level.w;
      const cy = Math.floor(index / level.w);
      const center = tileCenter(cx, cy, level.h);
      const mat = new THREE.MeshBasicMaterial({
        map: this.textures.glass,
        transparent: true,
        opacity: 0.42,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const mesh = new THREE.Mesh(QUAD, mat);
      mesh.position.set(center.x, center.y, 0.8);
      mesh.scale.set(60, 60, 1);
      this.dynamic.add(mesh);
      this.glassViews.set(index, { mesh, mat });
    }

    for (const steam of world.steams) {
      const mat = new THREE.MeshBasicMaterial({
        map: this.textures.steam,
        transparent: true,
        opacity: 0.16,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const mesh = new THREE.Mesh(QUAD, mat);
      mesh.position.set(steam.x, steam.y, 0.75);
      mesh.scale.set(steam.r * 2, steam.r * 2, 1);
      mesh.visible = steam.active;
      this.dynamic.add(mesh);
      this.steamViews.set(steam.id, { mesh, mat });
    }

    this.unitViews.set(world.player.id, this.createUnitView('player', 0));
    world.enemies.forEach((e, i) => {
      this.unitViews.set(e.id, this.createUnitView('enemy', i % 2, e.kind));
    });

    for (const p of world.pickups) this.addPickupView(p.id, p.weapon);
    for (const l of world.loot) this.addLootView(l.id, l.kind);
    for (const node of world.objectives) this.addObjectiveView(node);
    if (level.id !== 'safehouse') this.addHoloAds(level);

    const exitTex = this.textures.exit;
    const exitMat = new THREE.MeshBasicMaterial({
      map: exitTex,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      opacity: 0.3,
    });
    const exit = new THREE.Mesh(QUAD, exitMat);
    exit.scale.set(118, 118, 1);
    exit.position.set(level.exit.x, level.exit.y, 0.3);
    this.dynamic.add(exit);
    this.exitMesh = exit;
    this.exitMat = exitMat;

    this.camX = world.player.x;
    this.camY = world.player.y;
    this.updateCamera(world, 1, true);
    this.pings.clear();
    this.barkLabels.clear();
    this.lights.clear();
    this.lights.setStatics(this.buildLightSpecs(world));
  }

  private holoPositions(level: Level): { x: number; y: number; scale: number }[] {
    return [
      { x: level.w * TILE * 0.5, y: level.h * TILE * 0.82, scale: 1 },
      { x: level.w * TILE * 0.22, y: level.h * TILE * 0.24, scale: 0.72 },
    ];
  }

  /** Static neon/hazard light pools baked when a level binds. */
  private buildLightSpecs(world: World): LightSpec[] {
    const level = world.level;
    const specs: LightSpec[] = [];
    const push = (x: number, y: number, size: number, color: number, intensity: number, pulse = 0) =>
      specs.push({ x, y, size, color, intensity, pulse });
    if (level.id !== 'safehouse') {
      for (const pos of this.holoPositions(level)) {
        push(pos.x, pos.y, 250 * pos.scale, pos.scale > 0.9 ? 0x5ef1ff : 0xff2f8e, 0.1, 0.25);
      }
    }
    push(level.exit.x, level.exit.y, 210, this.palette.cyan, 0.16, 0.4);
    for (const s of level.stations) push(s.x, s.y, 95, this.palette.cyan, 0.13, 0.15);
    for (const l of level.lasers) push(l.x, l.y, 150, this.palette.red, 0.18, 0.2);
    for (const t of level.turrets) push(t.x, t.y, 105, this.palette.amber, 0.2, 0.15);
    for (const c of level.cameras) push(c.x, c.y, 85, this.palette.red, 0.16, 0.3);
    for (const b of level.barrels) push(b.x, b.y, 95, this.palette.amber, 0.14, 0.1);
    for (const s of level.steam) push(s.x, s.y, 140, 0x9ffcff, 0.07, 0.3);
    for (const l of world.loot) push(l.x, l.y, 95, new THREE.Color(LOOT_DEFS[l.kind].color).getHex(), 0.22, 0.35);
    for (const p of world.pickups) push(p.x, p.y, 85, this.palette.magenta, 0.16, 0.3);
    for (const n of world.objectives) {
      const color = n.kind === 'zone' ? 0x7dffcf : n.kind === 'case' ? this.palette.amber : this.palette.cyan;
      push(n.x, n.y, n.kind === 'zone' ? n.radius * 1.5 : 130, color, 0.2, 0.3);
    }
    if (level.boss) push(level.boss.x, level.boss.y, 290, this.palette.amber, 0.25, 0.3);
    // Baked neon signage spills colour onto the street below it.
    const signs = this.textures.signLights.get(level.id) ?? [];
    for (const sign of signs) {
      push(sign.x, sign.y - 30, 120, new THREE.Color(sign.color).getHex(), 0.13, 0.12);
    }
    // Wet streets: every coloured source smears a long vertical reflection.
    if (level.id !== 'safehouse' && districtFor(level.id).weather === 'rain') {
      const sources = specs.length;
      for (let i = 0; i < sources; i++) {
        const src = specs[i];
        if (src.size < 90) continue;
        specs.push({
          x: src.x,
          y: src.y - src.size * 0.5,
          size: src.size,
          sx: src.size * 0.16,
          sy: src.size * 1.25,
          color: src.color,
          intensity: src.intensity * 0.55,
          pulse: src.pulse,
        });
      }
    }
    return specs;
  }

  private createUnitView(
    kind: 'player' | 'enemy',
    variant: number,
    enemyKind: EnemyKind = 'grunt',
  ): UnitView {
    const root = new THREE.Group();
    const shadow = new THREE.Mesh(QUAD, this.mat(this.textures.shadow, false, 0.9));
    shadow.scale.set(70, 34, 1);
    shadow.position.z = 0.2;

    const bodyTex = kind === 'player' ? this.textures.player : this.textures.enemy[variant];
    // Each unit gets its own material so the walk frame and camo opacity can
    // animate independently while preserving the enemy-kind tint.
    const bodyMat = this.mat(bodyTex).clone();
    bodyMat.transparent = true;
    const tint =
      enemyKind === 'shield'
        ? 0x9fe6ff
        : enemyKind === 'sniper'
          ? 0xffd08a
          : enemyKind === 'rusher'
            ? 0xff7a7a
            : enemyKind === 'gunner'
              ? 0x8affc1
              : enemyKind === 'marksman'
                ? 0xffe0a3
                : enemyKind === 'heavy'
                  ? 0xff9e6a
                  : enemyKind === 'grenadier'
                    ? 0xffb021
                    : enemyKind === 'blade'
                      ? 0xff4d9a
                      : enemyKind === 'netrunner'
                        ? 0x9f7aff
                        : enemyKind === 'operator'
                          ? 0xffd166
                          : enemyKind === 'hound'
                            ? 0xff7a4c
                            : enemyKind === 'medic'
                              ? 0x7dffcf
                              : enemyKind === 'boss'
                                ? 0xffc46b
                                : null;
    if (tint !== null) bodyMat.color.setHex(tint);
    const body = new THREE.Mesh(QUAD, bodyMat);
    body.scale.set(86, 86, 1);
    body.position.z = 1;

    const weapon = new THREE.Mesh(QUAD, this.weaponMat('pistol'));
    weapon.scale.set(1, 1, 1);
    weapon.visible = false;
    weapon.position.z = 1.15;

    const flash = new THREE.Mesh(QUAD, this.mat(this.textures.flash, true, 0.95));
    flash.scale.set(38, 38, 1);
    flash.position.set(58, 4, 1.3);
    flash.visible = false;

    root.add(shadow, body, weapon, flash);

    const mark = new THREE.Mesh(QUAD, this.mat(this.textures.alert, true, 0.95));
    mark.scale.set(26, 26, 1);
    mark.visible = false;
    mark.position.z = 2;

    const targetMark = new THREE.Mesh(QUAD, this.mat(this.textures.target, true, 0.95));
    targetMark.scale.set(34, 34, 1);
    targetMark.visible = false;
    targetMark.position.z = 2.1;

    const intentMark = new THREE.Mesh(
      QUAD,
      this.mat(this.textures.intent, true, 0.9, 0x5ef1ff),
    );
    intentMark.scale.set(26, 26, 1);
    intentMark.visible = false;
    intentMark.position.z = 2.12;

    const shieldMesh = new THREE.Mesh(QUAD, this.mat(this.textures.shield));
    shieldMesh.scale.set(24, 54, 1);
    shieldMesh.position.set(31, 0, 1.3);
    shieldMesh.visible = false;

    const laserMesh = new THREE.Mesh(QUAD, this.laserMat);
    laserMesh.scale.set(620, 2, 1);
    laserMesh.position.set(310, 4, 1.8);
    laserMesh.visible = false;
    const bossRing = new THREE.Mesh(
      QUAD,
      this.mat(this.textures.dot, true, 0.32, 0xffc46b),
    );
    bossRing.scale.set(112, 112, 1);
    bossRing.position.z = 0.25;
    bossRing.visible = false;
    const reloadRing = new THREE.Mesh(
      RELOAD_RING_GEO,
      new THREE.MeshBasicMaterial({
        color: 0xffc46b,
        transparent: true,
        opacity: 0.55,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
      }),
    );
    reloadRing.position.z = 0.65;
    reloadRing.visible = false;
    const weakRing = new THREE.Mesh(
      BOSS_WEAK_GEO,
      new THREE.MeshBasicMaterial({
        color: 0xff2f8e,
        transparent: true,
        opacity: 0.75,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
      }),
    );
    weakRing.position.z = 0.72;
    weakRing.visible = false;
    const chargeRing = new THREE.Mesh(RELOAD_RING_GEO, this.chargeMat);
    chargeRing.position.z = 0.74;
    chargeRing.visible = false;
    root.add(shieldMesh, laserMesh, bossRing, weakRing, chargeRing, reloadRing);
    if (enemyKind === 'boss') root.scale.setScalar(1.4);
    else if (enemyKind === 'heavy') root.scale.setScalar(1.12);
    else if (enemyKind === 'hound') root.scale.setScalar(0.78);

    let vision: THREE.Mesh | null = null;
    let visionMat: THREE.MeshBasicMaterial | null = null;
    if (kind === 'enemy') {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute(
        'position',
        new THREE.BufferAttribute(new Float32Array((CONE_SEGMENTS + 2) * 3), 3),
      );
      // Flashlight falloff: bright at the guard, fading to nothing at the
      // edge of their sight range.
      const colors = new Float32Array((CONE_SEGMENTS + 2) * 4);
      colors.set([1, 1, 1, 1], 0);
      for (let i = 1; i < CONE_SEGMENTS + 2; i++) colors.set([1, 1, 1, 0], i * 4);
      geo.setAttribute('color', new THREE.BufferAttribute(colors, 4));
      const indices: number[] = [];
      for (let i = 0; i < CONE_SEGMENTS; i++) indices.push(0, i + 1, i + 2);
      geo.setIndex(indices);
      visionMat = new THREE.MeshBasicMaterial({
        color: 0x5ef1ff,
        vertexColors: true,
        transparent: true,
        opacity: 0.14,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
      });
      vision = new THREE.Mesh(geo, visionMat);
      vision.position.z = 0.06;
      vision.frustumCulled = false;
      vision.visible = false;
      this.dynamic.add(vision);
    }

    this.dynamic.add(root);
    this.dynamic.add(mark);
    this.dynamic.add(intentMark);
    this.dynamic.add(targetMark);

    return {
      root,
      body,
      weapon,
      flash,
      shadow,
      mark,
      intentMark,
      targetMark,
      shieldMesh,
      laserMesh,
      bossRing,
      weakRing,
      chargeRing,
      reloadRing,
      vision,
      visionMat,
      weaponId: null,
      bodyTex: null,
      corpse: false,
      markScale: 1,
      weaponSwapT: 0,
      deathT: 0,
      seenK: 1,
      pingT: 0,
      lastState: 'idle',
      flashPinged: false,
      spawnT: kind === 'enemy' ? 0.4 : 0,
    };
  }

  private addLootView(id: number, kind: LootKind): void {
    const group = new THREE.Group();
    const icon = new THREE.Mesh(QUAD, this.mat(this.textures.loot[kind]));
    icon.scale.set(46, 46, 1);
    icon.position.z = 0.75;
    group.add(icon);
    const ring = new THREE.Mesh(
      QUAD,
      this.mat(this.textures.dot, true, 0.28, new THREE.Color(LOOT_DEFS[kind].color).getHex()),
    );
    ring.scale.set(58, 58, 1);
    ring.position.z = 0.45;
    group.add(ring);
    this.dynamic.add(group);
    this.lootViews.set(id, group);
  }

  private addPickupView(id: number, weapon: WeaponId): void {
    const group = new THREE.Group();
    if (weapon !== 'fists') {
      const vis = WEAPON_VIS[weapon];
      const mesh = new THREE.Mesh(QUAD, this.weaponMat(weapon));
      mesh.scale.set(vis.w, vis.h, 1);
      mesh.position.z = 1.05;
      group.add(mesh);
    }
    const ring = new THREE.Mesh(
      QUAD,
      this.mat(this.textures.dot, true, 0.3, 0xff2f8e),
    );
    ring.scale.set(46, 46, 1);
    ring.position.z = 0.35;
    group.add(ring);
    this.dynamic.add(group);
    this.pickupViews.set(id, group);
  }

  private addHoloAds(level: Level): void {
    const order = ['sector07', 'tenements', 'nightmarket', 'docks', 'spire', 'sublevel'];
    const index = Math.max(0, order.indexOf(level.id)) % this.textures.holo.length;
    const texture = this.textures.holo[index];
    const positions = this.holoPositions(level);
    for (const [i, pos] of positions.entries()) {
      const material = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        opacity: 0.16,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const mesh = new THREE.Mesh(QUAD, material);
      mesh.position.set(pos.x, pos.y, 0.18 + i * 0.01);
      mesh.scale.set(320 * pos.scale, 80 * pos.scale, 1);
      this.holoGroup.add(mesh);
      this.holoMats.push(material);
    }
  }

  private addObjectiveView(node: ObjectiveNode): void {
    const group = new THREE.Group();
    const color =
      node.kind === 'zone' ? 0x7dffcf : node.kind === 'case' ? 0xffc46b : 0x5ef1ff;
    const ring = new THREE.Mesh(QUAD, this.mat(this.textures.dot, true, 0.32, color));
    const size = node.kind === 'zone' ? node.radius * 2 : 78;
    ring.scale.set(size, size, 1);
    ring.position.z = 0.42;
    group.add(ring);
    if (node.kind !== 'zone') {
      const icon = new THREE.Mesh(
        QUAD,
        this.mat(node.kind === 'case' ? this.textures.loot.optic : this.textures.loot.shard),
      );
      icon.scale.set(48, 48, 1);
      icon.position.z = 0.8;
      group.add(icon);
    }
    group.position.set(node.x, node.y, 0);
    this.dynamic.add(group);
    this.objectiveViews.set(node.id, group);
  }

  private syncObjectives(world: World): void {
    for (const node of world.objectives) {
      let group = this.objectiveViews.get(node.id);
      if (!group) {
        this.addObjectiveView(node);
        group = this.objectiveViews.get(node.id);
      }
      if (!group) continue;
      group.visible = !node.completed;
      const pulse =
        node.kind === 'zone'
          ? 1 + Math.sin(performance.now() * 0.0025) * 0.02
          : 1 + Math.sin(performance.now() * 0.006 + node.id) * 0.08;
      group.scale.set(pulse, pulse, 1);
    }
  }

  /* ------------------------------------------------------------------ */
  /* frame                                                               */
  /* ------------------------------------------------------------------ */

  sync(world: World, dt: number): void {
    // Enemies can be spawned after bind() (heat reinforcements, boss adds).
    // Create their views here so nothing shoots from an invisible body.
    const seen = new Set<number>([world.player.id]);
    for (const e of world.enemies) {
      seen.add(e.id);
      if (!this.unitViews.has(e.id)) {
        this.unitViews.set(e.id, this.createUnitView('enemy', e.id % 2, e.kind));
      }
    }
    for (const [id, view] of this.unitViews) {
      if (seen.has(id)) continue;
      this.dynamic.remove(view.root);
      this.dynamic.remove(view.mark);
      this.dynamic.remove(view.intentMark);
      this.dynamic.remove(view.targetMark);
      if (view.vision) this.dynamic.remove(view.vision);
      this.unitViews.delete(id);
    }
    this.syncUnit(world.player, 0, true, dt);
    world.enemies.forEach((e, i) => this.syncUnit(e, i % 2, false, dt));
    if (world.civilians.length > 0) this.syncCivilians(world);
    this.syncCones(world);
    this.syncSightFade(world, dt);
    this.syncCombatAids(world);
    this.pings.update(dt);
    this.barkLabels.sync(world.barkState.barks, (id) => {
      const e = world.enemies.find((en) => en.id === id);
      if (!e || !e.alive) return null;
      const view = this.unitViews.get(id);
      return { x: e.x, y: e.y, seen: (view?.seenK ?? 1) > 0.3 };
    });
    this.syncDoors(world);
    this.syncGlass(world);
    this.syncSteam(world);
    this.syncBarrels(world);
    this.syncCameras(world);
    this.syncTurrets(world);
    this.syncLasers(world);
    this.syncPickups(world);
    this.syncLoot(world);
    this.syncObjectives(world);
    this.syncSupplyEffects(world);
    this.syncEffects(world);
    this.syncMelee(world);
    this.syncExit(world);
    this.syncCombatFx(world);
    this.syncLights(world, dt);
    this.updateCamera(world, dt, false);
    this.sight.setEnabled(world.level.id !== 'safehouse');
    this.sight.update(
      world,
      world.player.x,
      world.player.y,
      this.camX,
      this.camY,
      this.viewH * this.aspect,
      this.viewH,
    );
    this.weather.update(this.camX, this.camY, this.viewH * this.aspect, this.viewH, dt);
    const holoT = performance.now() * 0.0014;
    this.holoMats.forEach((material, index) => {
      material.opacity = 0.14 + Math.sin(holoT + index * 1.7) * 0.045;
    });

    this.bloom.strength =
      (0.4 + Math.sin(performance.now() * 0.0016) * 0.03 + world.shake * 0.15) * this.bloomScale;
    this.composer.render();
  }

  /** Dynamic light flashes: muzzle glows, explosions, dash, quickhack, exit. */
  private syncLights(world: World, dt: number): void {
    const t = performance.now() * 0.001;
    const muzzle = (x: number, y: number, angle: number, weapon: WeaponId) => {
      const rail = weapon === 'railgun';
      this.lights.flash(
        x + Math.cos(angle) * 62,
        y + Math.sin(angle) * 62,
        rail ? 190 : 120,
        rail ? 0x9ffcff : 0xffd48a,
        0.3,
        0.06,
      );
    };
    const p = world.player;
    if (p.alive && p.flashT > 0) muzzle(p.x, p.y, p.angle, p.weapon);
    for (const e of world.enemies) {
      if (e.alive && e.flashT > 0) muzzle(e.x, e.y, e.angle, e.weapon);
    }
    for (const ex of world.explosions) {
      const k = 1 - ex.life / ex.maxLife;
      this.lights.flash(ex.x, ex.y, 200 + k * 240, 0xffb35c, 0.6, 0.09);
    }
    if (p.alive && p.dashT > 0) this.lights.flash(p.x, p.y, 110, this.palette.cyan, 0.22, 0.07);
    if (world.quickhackFxT > 0) {
      this.lights.flash(world.quickhackX, world.quickhackY, 160, this.palette.cyan, 0.35, 0.07);
    }
    if (world.exitOpen) {
      this.lights.flash(
        world.level.exit.x,
        world.level.exit.y,
        300,
        world.exitContested ? this.palette.red : this.palette.cyan,
        0.3,
        0.12,
      );
    }
    this.lights.sync(dt, t);
    this.film.setTime(this.reducedMotion ? 0 : t);
  }

  private syncUnit(ent: Player | Enemy, variant: number, isPlayer: boolean, dt = 0): void {
    const view = this.unitViews.get(ent.id);
    if (!view) return;

    view.root.position.set(ent.x, ent.y, 0);
    const angle = ent.alive ? ent.angle : ent.corpseAngle;
    view.root.rotation.z = angle;
    if (!ent.alive && 'deathVx' in ent && !this.reducedMotion) {
      const k = Math.min(1, view.deathT / 0.24);
      view.root.position.set(
        ent.x + ent.deathVx * k * 0.14,
        ent.y + ent.deathVy * k * 0.14,
        0,
      );
    }

    if (!ent.alive) {
      if (!view.corpse) {
        view.deathT += dt;
        if (this.reducedMotion) view.deathT = 0.24;
        const k = Math.min(1, view.deathT / 0.24);
        const bodyMat = view.body.material as THREE.MeshBasicMaterial;
        bodyMat.transparent = true;
        bodyMat.opacity = 1 - k * 0.35;
        view.body.rotation.z = k * 1.35;
        view.body.scale.set(86 + k * 18, 86 - k * 26, 1);
        view.body.position.set(-k * 5, k * 4, 1);
        view.weapon.visible = false;
        view.flash.visible = false;
        view.mark.visible = false;
        view.targetMark.visible = false;
        view.shieldMesh.visible = false;
        view.laserMesh.visible = false;
        view.bossRing.visible = false;
        view.weakRing.visible = false;
        view.chargeRing.visible = false;
        view.reloadRing.visible = false;
        if (k >= 1) {
          view.corpse = true;
          view.body.rotation.z = 0;
          view.body.position.set(0, 0, 1);
          if (isPlayer) {
            view.body.material = this.mat(this.textures.playerCorpse, false, 0.95);
          } else {
            view.body.material = this.mat(this.textures.enemyCorpse[variant], false, 0.95);
          }
          view.body.scale.set(96, 96, 1);
          view.shadow.scale.set(84, 40, 1);
          view.shadow.material = this.mat(this.textures.shadow, false, 0.55);
        }
      }
      return;
    }

    if (view.weaponId !== ent.weapon) {
      view.weaponId = ent.weapon;
      view.weaponSwapT = 0.18;
      if (ent.weapon === 'fists') {
        view.weapon.visible = false;
      } else {
        const vis = WEAPON_VIS[ent.weapon];
        view.weapon.visible = true;
        view.weapon.material = this.weaponMat(ent.weapon);
        view.weapon.position.set(vis.x, vis.y, 1.15);
      }
    }
    view.weaponSwapT = Math.max(0, view.weaponSwapT - dt);

    view.spawnT = Math.max(0, view.spawnT - dt);
    const spawnK = view.spawnT > 0 ? 1 - view.spawnT / 0.4 : 1;
    const vis = ent.weapon === 'fists' ? null : WEAPON_VIS[ent.weapon];
    const speed = Math.hypot(ent.vx, ent.vy);
    const moving = Math.min(1, speed / 220);
    const frameCount = isPlayer
      ? this.textures.playerWalk.length
      : this.textures.enemyWalk[variant].length;
    const walkFrame =
      moving > 0.12
        ? Math.floor(performance.now() * 0.011 + ent.id * 0.63) % frameCount
        : 0;
    const bodyTex = isPlayer
      ? this.textures.playerWalk[walkFrame]
      : this.textures.enemyWalk[variant][walkFrame];
    if (view.bodyTex !== bodyTex) {
      view.bodyTex = bodyTex;
      const bodyMat = view.body.material as THREE.MeshBasicMaterial;
      bodyMat.map = bodyTex;
      bodyMat.needsUpdate = true;
    }
    const bob = Math.sin(performance.now() * 0.017 + ent.id * 1.7) * 2.2 * moving;
    const breathe = 1 + Math.sin(performance.now() * 0.0022 + ent.id * 1.3) * 0.008 * (1 - moving);
    const recoil = ent.flashT > 0 ? 2.2 : 0;
    view.body.position.set(-recoil, bob, 1);
    view.body.scale.set(86 * breathe * spawnK, 86 * breathe * spawnK, 1);
    if (vis) {
      const swap = 1 + view.weaponSwapT * 0.6;
      view.weapon.scale.set(vis.w * swap, vis.h * swap, 1);
      view.weapon.position.set(vis.x - recoil, vis.y + bob, 1.15);
      view.weapon.rotation.z = 0;
      if (isPlayer && 'swingT' in ent && ent.swingT > 0) {
        const t = 1 - ent.swingT / 0.24;
        view.weapon.rotation.z = 0.9 - t * 1.8;
      }
      if (isPlayer && 'reloadT' in ent && ent.reloadT > 0) {
        const def = WEAPONS[ent.weapon];
        const k = 1 - ent.reloadT / Math.max(0.01, def.reload);
        const dip = Math.sin(k * Math.PI);
        view.weapon.position.set(vis.x - 6 * dip, vis.y - 5 * dip, 1.15);
        view.weapon.rotation.z = -0.55 * dip;
      }
    }
    if (isPlayer && 'reloadT' in ent) {
      view.reloadRing.visible = ent.reloadT > 0;
      if (ent.reloadT > 0) {
        const def = WEAPONS[ent.weapon];
        const k = 1 - ent.reloadT / Math.max(0.01, def.reload);
        const pulse = 1 + Math.sin(k * Math.PI) * 0.12;
        view.reloadRing.scale.set(pulse, pulse, 1);
        (view.reloadRing.material as THREE.MeshBasicMaterial).opacity =
          0.35 + Math.sin(k * Math.PI) * 0.35;
      }
    }
    view.flash.position.set(58 - recoil, 4 + bob, 1.8);
    if (isPlayer) {
      const camo = 'camoT' in ent && ent.camoT > 0;
      const bodyMat = view.body.material as THREE.MeshBasicMaterial;
      bodyMat.transparent = true;
      bodyMat.opacity = camo ? 0.26 : 1;
      if (ent.weapon !== 'fists') view.weapon.visible = !camo;
    } else {
      (view.body.material as THREE.MeshBasicMaterial).opacity = spawnK;
    }

    const flashing = ent.flashT > 0;
    view.flash.visible = flashing;
    if (flashing) {
      const gunScale =
        ent.weapon === 'shotgun'
          ? 1.25
          : ent.weapon === 'lmg' || ent.weapon === 'railgun'
            ? 1.15
            : ent.weapon === 'rifle' || ent.weapon === 'dmr'
              ? 1.05
              : 1;
      const s = (30 + Math.random() * 18) * gunScale;
      view.flash.scale.set(s, s, 1);
      view.flash.rotation.z = Math.random() * Math.PI * 2;
    }

    const alertOn = !isPlayer && 'markT' in ent && ent.markT > 0;
    view.mark.visible = alertOn;
    if (alertOn) {
      view.mark.position.set(ent.x, ent.y + 52, 2);
      const pulse = 1 + Math.sin(performance.now() * 0.02) * 0.12;
      view.mark.scale.set(26 * pulse, 26 * pulse, 1);
    }

    const enemyKind = !isPlayer && 'kind' in ent ? ent.kind : null;
    view.shieldMesh.visible = enemyKind === 'shield';
    // The laser is a tell, not a permanent combat light: it only ignites in
    // the final aim window and thickens until the shot.
    const aiming = 'aiming' in ent && ent.aiming;
    view.laserMesh.visible = aiming;
    if (aiming) {
      const windup = (enemyKind && ENEMY_AIM_WINDUP[enemyKind]) || 0.32;
      const fireCd = 'fireCd' in ent ? ent.fireCd : 0;
      const charge = Math.max(0, Math.min(1, 1 - fireCd / windup));
      view.laserMesh.scale.set(620, 1.6 + charge * 3.4, 1);
    }

    const heavyArmor = enemyKind === 'heavy' && 'armor' in ent ? ent.armor : 0;
    view.bossRing.visible = enemyKind === 'boss' || (enemyKind === 'heavy' && heavyArmor > 0);
    if (view.bossRing.visible) {
      const ring = enemyKind === 'boss' ? 112 : 86;
      const phase =
        enemyKind === 'boss' && 'maxArmor' in ent && 'armor' in ent
          ? Math.max(1, ent.maxArmor - ent.armor + 1)
          : 1;
      const pulse =
        1 +
        Math.sin(performance.now() * (0.003 + phase * 0.0012)) *
          (0.03 + phase * 0.018);
      view.bossRing.scale.set(ring * pulse, ring * pulse, 1);
    }
    const charging =
      enemyKind === 'boss' &&
      'bossChargeT' in ent &&
      ent.bossChargeT > 0 &&
      ent.alive;
    view.chargeRing.visible = charging;
    if (charging) {
      const t = performance.now();
      const pulse = 1 + Math.sin(t * 0.024) * 0.1;
      view.chargeRing.scale.set(pulse, pulse, 1);
      (view.chargeRing.material as THREE.MeshBasicMaterial).opacity =
        0.45 + Math.sin(t * 0.032) * 0.3;
    }
    const weakOn =
      enemyKind === 'boss' && 'bossWeakT' in ent && ent.bossWeakT > 0 && ent.alive;
    view.weakRing.visible = weakOn;
    if (weakOn) {
      const pulse = 1 + Math.sin(performance.now() * 0.02) * 0.12;
      view.weakRing.scale.set(pulse, pulse, 1);
      (view.weakRing.material as THREE.MeshBasicMaterial).opacity =
        0.55 + Math.sin(performance.now() * 0.02) * 0.25;
    }
    const targetOn =
      !isPlayer && 'isTarget' in ent && ent.isTarget && ent.alive && enemyKind !== 'boss';
    view.targetMark.visible = targetOn;
    if (targetOn) {
      const t = performance.now() * 0.0035;
      view.targetMark.position.set(ent.x, ent.y + 78 + Math.sin(t) * 4, 2.1);
      view.targetMark.rotation.z = Math.sin(t * 0.8) * 0.12;
      const pulse = 34 + Math.sin(t * 2.2) * 3;
      view.targetMark.scale.set(pulse, pulse, 1);
    }
    const intent =
      !isPlayer && ent.alive && 'coverT' in ent && 'flankT' in ent
        ? squadIntent(ent)
        : null;
    view.intentMark.visible = intent !== null;
    if (intent && !isPlayer && 'coverT' in ent && 'flankT' in ent && ent.alive) {
      const cover = intent === 'cover';
      const tx = cover ? ent.coverX : ent.flankX;
      const ty = cover ? ent.coverY : ent.flankY;
      const material = this.mat(
        this.textures.intent,
        true,
        0.9,
        cover ? 0x7dffcf : 0x5ef1ff,
      );
      if (view.intentMark.material !== material) view.intentMark.material = material;
      view.intentMark.position.set(ent.x, ent.y + 64, 2.12);
      view.intentMark.rotation.z = Math.atan2(ty - ent.y, tx - ent.x);
      const pulse = 26 + Math.sin(performance.now() * 0.008 + ent.id) * 2.4;
      view.intentMark.scale.set(pulse, pulse, 1);
    }
  }

  private syncMelee(world: World): void {
    const p = world.player;
    const t = p.swingT;
    if (!p.alive || t <= 0) {
      this.slashMesh.visible = false;
      return;
    }
    const k = 1 - t / 0.24;
    this.slashMesh.visible = true;
    this.slashMesh.position.set(
      p.x + Math.cos(p.angle) * 26,
      p.y + Math.sin(p.angle) * 26,
      1.8,
    );
    this.slashMesh.rotation.z = p.angle - (0.9 - k * 1.8);
    const s = 86 + k * 32;
    this.slashMesh.scale.set(s, s, 1);
    this.slashMat.opacity = 0.9 * (1 - k * 0.75);
  }

  private syncCones(world: World): void {
    const show = this.conesVisible && world.state === 'playing';
    const half = world.visionHalfAngle;
    for (const enemy of world.enemies) {
      const range = world.visionRange * enemy.visionMult;
      const view = this.unitViews.get(enemy.id);
      if (!view?.vision || !view.visionMat) continue;
      if (!show || !enemy.alive) {
        view.vision.visible = false;
        continue;
      }
      const active = enemy.state === 'alert' || enemy.state === 'chase' || enemy.markT > 0;
      view.vision.visible = true;
      view.visionMat.color.setHex(active ? this.palette.magenta : this.palette.cyan);
      const torch = world.setpiece === 'blackoutFloor' ? 1.6 : 1;
      const hidden = view.seenK < 0.5 ? 0.45 : 1;
      view.visionMat.opacity = (active ? 0.16 : 0.09) * torch * hidden;

      const pos = view.vision.geometry.getAttribute('position') as THREE.BufferAttribute;
      pos.setXYZ(0, 0, 0, 0);
      for (let i = 0; i <= CONE_SEGMENTS; i++) {
        const angle = enemy.angle - half + (2 * half * i) / CONE_SEGMENTS;
        let distance = range;
        for (let r = 14; r < range; r += 14) {
          if (world.solidAt(enemy.x + Math.cos(angle) * r, enemy.y + Math.sin(angle) * r)) {
            distance = Math.max(10, r - 7);
            break;
          }
        }
        pos.setXYZ(i + 1, Math.cos(angle) * distance, Math.sin(angle) * distance, 0);
      }
      pos.needsUpdate = true;
      view.vision.position.set(enemy.x, enemy.y, 0.06);
    }
  }

  /**
   * Enemies and bystanders outside the operative's sightline fade out.
   * Telegraphs (laser aims, charge rings, intent chevrons) and muzzle flashes
   * stay on top of the darkness: you hear and see the threat, not the body.
   */
  /** Noise from an enemy the operative can't see becomes a ring in the dark. */
  private pingHidden(world: World, e: Enemy, view: UnitView, dt: number): void {
    const p = world.player;
    const d = Math.hypot(e.x - p.x, e.y - p.y);
    if (e.flashT > 0 && !view.flashPinged) {
      view.flashPinged = true;
      this.pings.emit(e.x, e.y, 120, this.palette.red, 0.55, 0.7);
      return;
    }
    if (e.state === 'chase' && view.lastState !== 'chase' && d < 900) {
      this.pings.emit(e.x, e.y, 90, this.palette.amber, 0.8, 0.6);
      return;
    }
    view.pingT -= dt;
    const moving = Math.hypot(e.vx, e.vy) > 40;
    if (moving && d < 440 && view.pingT <= 0) {
      // Closer footsteps are louder: brighter and more frequent.
      const near = 1 - d / 440;
      view.pingT = 0.75 - near * 0.3;
      this.pings.emit(e.x, e.y, 34 + near * 16, 0xa9c2d6, 0.6, 0.18 + near * 0.32);
    }
  }

  private syncSightFade(world: World, dt: number): void {
    const allSeen = world.level.id === 'safehouse' || !world.player.alive || world.state !== 'playing';
    const k = Math.min(1, dt * 7);
    for (const e of world.enemies) {
      const view = this.unitViews.get(e.id);
      if (!view) continue;
      if (!e.alive) {
        view.seenK = 1;
        continue;
      }
      const inSight = allSeen || world.playerSees(e.x, e.y);
      const seen = inSight || e.flashT > 0;
      if (!inSight) this.pingHidden(world, e, view, dt);
      view.lastState = e.state;
      if (e.flashT <= 0) view.flashPinged = false;
      view.seenK += ((seen ? 1 : 0) - view.seenK) * (seen ? 1 : k);
      const vis = view.seenK > 0.04;
      const bodyMat = view.body.material as THREE.MeshBasicMaterial;
      bodyMat.opacity *= view.seenK;
      view.body.visible = vis;
      view.shadow.visible = vis;
      if (!vis) {
        view.weapon.visible = false;
        view.shieldMesh.visible = false;
        view.mark.visible = false;
        view.targetMark.visible = false;
        view.bossRing.visible = false;
        view.weakRing.visible = false;
        view.reloadRing.visible = false;
      }
    }
    for (const c of world.civilians) {
      const view = this.civilianViews.get(c.id);
      if (!view) continue;
      view.root.visible = !c.alive || allSeen || world.playerSees(c.x, c.y);
    }
  }

  /**
   * Laser sight: runs from the muzzle to the first wall or body. It thins
   * and the dot tightens as the operative steadies — the spread made visible.
   * Staggered enemies get an amber ring; the one in reach gets EXECUTE.
   */
  private syncCombatAids(world: World): void {
    const p = world.player;
    const gun = p.weapon !== 'fists' && p.weapon !== 'bat';
    const show =
      world.level.id !== 'safehouse' && world.state === 'playing' && p.alive && gun && p.reloadT <= 0;
    this.laserLine.visible = show;
    this.laserDot.visible = show;
    if (show) {
      const steady = p.steady ?? 0;
      const ca = Math.cos(p.angle);
      const sa = Math.sin(p.angle);
      const sx = p.x + ca * 30;
      const sy = p.y + sa * 30;
      let len = 900;
      let onBody = false;
      for (let r = 8; r < 900; r += 8) {
        const x = sx + ca * r;
        const y = sy + sa * r;
        if (world.solidAt(x, y)) {
          len = r;
          break;
        }
        let hit = false;
        for (const e of world.enemies) {
          if (e.alive && (e.x - x) ** 2 + (e.y - y) ** 2 < e.r * e.r) {
            hit = true;
            break;
          }
        }
        if (hit) {
          len = r;
          onBody = true;
          break;
        }
      }
      this.laserLine.position.set(sx + (ca * len) / 2, sy + (sa * len) / 2, 1.85);
      this.laserLine.rotation.z = p.angle;
      this.laserLine.scale.set(len, 1.2 + (1 - steady) * 2.2, 1);
      this.laserLineMat.opacity = 0.12 + steady * 0.3;
      this.laserLineMat.color.setHex(onBody ? 0xff2f8e : 0x5ef1ff);
      const dot = 10 + (1 - steady) * 26;
      this.laserDot.position.set(sx + ca * len, sy + sa * len, 1.86);
      this.laserDot.scale.set(dot, dot, 1);
      this.laserDotMat.opacity = 0.45 + steady * 0.5;
      // Fully steadied = precise round ready: the dot locks white.
      const locked = steady >= 0.95;
      this.laserDotMat.color.setHex(locked ? 0xffffff : onBody ? 0xff6fb0 : 0x9ffcff);
      if (locked) this.laserDot.scale.setScalar(12 + Math.sin(performance.now() * 0.02) * 1.5);
    }

    const t = performance.now() * 0.001;
    for (const e of world.enemies) {
      if (!e.alive) continue;
      const view = this.unitViews.get(e.id);
      if (!view) continue;
      const staggered = (e.staggerT ?? 0) > 0 && view.seenK > 0.3;
      view.reloadRing.visible = staggered;
      if (staggered) {
        const mat = view.reloadRing.material as THREE.MeshBasicMaterial;
        mat.color.setHex(0xffc46b);
        mat.opacity = 0.5 + Math.sin(t * 18) * 0.3;
        view.reloadRing.rotation.z = t * 6;
        const k = 1.05 + Math.sin(t * 9) * 0.06;
        view.reloadRing.scale.set(k, k, 1);
      }
    }
    const target = world.state === 'playing' ? world.executionTarget() : null;
    this.executePrompt.visible = !!target;
    if (target) this.executePrompt.position.set(target.x, target.y + 58, 2.2);
  }

  private syncDoors(_world: World): void {
    for (const view of this.doorViews.values()) {
      const door = view.door;
      view.group.rotation.z = door.axis === 'h' ? door.angle : Math.PI / 2 + door.angle;
    }
  }

  private syncGlass(world: World): void {
    const shimmer = 0.42 + Math.sin(performance.now() * 0.002) * 0.08;
    for (const [index, view] of this.glassViews) {
      view.mesh.visible = !world.glassBroken.has(index);
      view.mat.opacity = shimmer;
    }
  }

  private syncSteam(world: World): void {
    for (const steam of world.steams) {
      const view = this.steamViews.get(steam.id);
      if (!view) continue;
      view.mesh.visible = steam.active;
      view.mat.opacity = 0.1 + Math.sin(performance.now() * 0.003 + steam.id) * 0.05;
      const pulse = 1 + Math.sin(performance.now() * 0.002 + steam.id) * 0.05;
      view.mesh.scale.set(steam.r * 2 * pulse, steam.r * 2 * pulse, 1);
    }
  }

  private syncBarrels(world: World): void {
    const seen = new Set<number>();
    for (const barrel of world.barrels) {
      if (!barrel.alive) continue;
      seen.add(barrel.id);
      let mesh = this.barrelViews.get(barrel.id);
      if (!mesh) {
        mesh = new THREE.Mesh(QUAD, this.mat(this.textures.barrel));
        mesh.scale.set(58, 58, 1);
        mesh.position.z = 0.45;
        this.dynamic.add(mesh);
        this.barrelViews.set(barrel.id, mesh);
      }
      mesh.position.set(barrel.x, barrel.y, 0.45);
    }
    for (const [id, mesh] of this.barrelViews) {
      if (seen.has(id)) continue;
      this.dynamic.remove(mesh);
      this.barrelViews.delete(id);
    }
  }

  private syncCameras(world: World): void {
    const seen = new Set<number>();
    for (const cam of world.cameras) {
      if (!cam.alive) continue;
      seen.add(cam.id);
      let view = this.cameraViews.get(cam.id);
      if (!view) {
        const group = new THREE.Group();
        const body = new THREE.Mesh(
          QUAD,
          this.mat(this.textures.dot, true, 0.85, 0xffc46b),
        );
        body.scale.set(28, 28, 1);
        body.position.z = 0.7;
        const beamMat = new THREE.MeshBasicMaterial({
          color: 0xffc46b,
          transparent: true,
          opacity: 0.22,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        });
        const beam = new THREE.Mesh(QUAD, beamMat);
        beam.scale.set(360, 2, 1);
        beam.position.set(180, 0, 0.45);
        group.add(body, beam);
        this.dynamic.add(group);
        view = { group, beam, beamMat };
        this.cameraViews.set(cam.id, view);
      }
      let beamLength = 360;
      for (let r = 18; r < 360; r += 14) {
        if (world.solidAt(cam.x + Math.cos(cam.angle) * r, cam.y + Math.sin(cam.angle) * r)) {
          beamLength = Math.max(12, r - 7);
          break;
        }
      }
      view.group.position.set(cam.x, cam.y, 0);
      view.group.rotation.z = cam.angle;
      view.beam.scale.set(beamLength, 2, 1);
      view.beam.position.x = beamLength / 2;
      view.beamMat.color.setHex(cam.alertT > 0 ? this.palette.red : this.palette.amber);
      view.beamMat.opacity = cam.alertT > 0 ? 0.5 : 0.22;
    }
    for (const [id, view] of this.cameraViews) {
      if (seen.has(id)) continue;
      this.dynamic.remove(view.group);
      view.beamMat.dispose();
      this.cameraViews.delete(id);
    }
  }

  private syncTurrets(world: World): void {
    const seen = new Set<number>();
    for (const turret of world.turrets) {
      if (!turret.alive) continue;
      seen.add(turret.id);
      let view = this.turretViews.get(turret.id);
      if (!view) {
        const group = new THREE.Group();
        const body = new THREE.Mesh(
          QUAD,
          this.mat(this.textures.dot, true, 0.9, 0xff8a3d),
        );
        body.scale.set(34, 34, 1);
        body.position.z = 0.8;
        const beamMat = new THREE.MeshBasicMaterial({
          color: 0xffc46b,
          transparent: true,
          opacity: 0.18,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        });
        const beam = new THREE.Mesh(QUAD, beamMat);
        beam.scale.set(560, 2, 1);
        beam.position.set(280, 0, 0.55);
        group.add(body, beam);
        this.dynamic.add(group);
        view = { group, beam, beamMat };
        this.turretViews.set(turret.id, view);
      }
      let beamLength = 560;
      for (let r = 18; r < 560; r += 14) {
        if (
          world.solidAt(
            turret.x + Math.cos(turret.angle) * r,
            turret.y + Math.sin(turret.angle) * r,
          )
        ) {
          beamLength = Math.max(12, r - 7);
          break;
        }
      }
      view.group.position.set(turret.x, turret.y, 0);
      view.group.rotation.z = turret.angle;
      view.beam.scale.set(beamLength, 2, 1);
      view.beam.position.x = beamLength / 2;
      view.beamMat.color.setHex(turret.aiming ? this.palette.red : this.palette.amber);
      view.beamMat.opacity = turret.aiming ? 0.5 : 0.18;
    }
    for (const [id, view] of this.turretViews) {
      if (seen.has(id)) continue;
      this.dynamic.remove(view.group);
      view.beamMat.dispose();
      this.turretViews.delete(id);
    }
  }

  private syncLasers(world: World): void {
    const seen = new Set<number>();
    for (const laser of world.lasers) {
      if (!laser.alive) continue;
      seen.add(laser.id);
      let view = this.laserViews.get(laser.id);
      if (!view) {
        const mat = new THREE.MeshBasicMaterial({
          color: 0xff3b4e,
          transparent: true,
          opacity: 0.8,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        });
        const mesh = new THREE.Mesh(QUAD, mat);
        mesh.position.z = 0.5;
        this.dynamic.add(mesh);
        view = { mesh, mat };
        this.laserViews.set(laser.id, view);
      }
      const active = (world.time + laser.phase) % 2.6 <= 1.35;
      const width = 4;
      const length = 62;
      view.mesh.scale.set(
        laser.axis === 'h' ? length : width,
        laser.axis === 'h' ? width : length,
        1,
      );
      view.mesh.position.set(laser.x, laser.y, 0.5);
      view.mat.color.setHex(active ? this.palette.red : this.palette.amber);
      view.mat.opacity = active ? 0.82 : 0.1;
    }
    for (const [id, view] of this.laserViews) {
      if (seen.has(id)) continue;
      this.dynamic.remove(view.mesh);
      view.mat.dispose();
      this.laserViews.delete(id);
    }
  }

  private syncPickups(world: World): void {
    const seen = new Set<number>();
    for (const p of world.pickups) {
      seen.add(p.id);
      let view = this.pickupViews.get(p.id);
      if (!view) {
        this.addPickupView(p.id, p.weapon);
        view = this.pickupViews.get(p.id)!;
      }
      view.position.set(p.x, p.y, 0);
      view.rotation.z = p.angle;
      view.scale.setScalar(p.flying ? 1.15 : 1);
    }
    for (const [id, view] of this.pickupViews) {
      if (seen.has(id)) continue;
      this.dynamic.remove(view);
      this.pickupViews.delete(id);
    }
  }

  private syncLoot(world: World): void {
    const now = performance.now() * 0.001;
    for (const item of world.loot) {
      let view = this.lootViews.get(item.id);
      if (!view) {
        this.addLootView(item.id, item.kind);
        view = this.lootViews.get(item.id)!;
      }
      view.visible = !item.collected;
      if (item.collected) continue;
      const bob = Math.sin(now * 2.4 + item.id * 1.7) * 4;
      view.position.set(item.x, item.y + bob + 4, 0);
      view.rotation.z = Math.sin(now * 1.3 + item.id) * 0.12;
    }
  }

  private syncSupplyEffects(world: World): void {
    const smokeIds = new Set<number>();
    for (const cloud of world.smokes) {
      smokeIds.add(cloud.id);
      let mesh = this.smokeViews.get(cloud.id);
      if (!mesh) {
        const mat = new THREE.MeshBasicMaterial({
          map: this.textures.smoke,
          transparent: true,
          opacity: 0.45,
          depthWrite: false,
          color: 0x8fa3bb,
        });
        mesh = new THREE.Mesh(QUAD, mat);
        mesh.position.z = 2.6;
        this.dynamic.add(mesh);
        this.smokeViews.set(cloud.id, mesh);
      }
      const t = Math.max(0, cloud.life / cloud.maxLife);
      const size = cloud.r * 2 * (1.15 - t * 0.15);
      mesh.scale.set(size, size, 1);
      mesh.position.set(cloud.x, cloud.y, 2.6);
      mesh.rotation.z = performance.now() * 0.0002 + cloud.id;
      (mesh.material as THREE.MeshBasicMaterial).opacity = 0.15 + t * 0.42;
    }
    for (const [id, mesh] of this.smokeViews) {
      if (smokeIds.has(id)) continue;
      this.dynamic.remove(mesh);
      (mesh.material as THREE.Material).dispose();
      this.smokeViews.delete(id);
    }

    const grenadeIds = new Set<number>();
    for (const grenade of world.grenades) {
      grenadeIds.add(grenade.id);
      let mesh = this.grenadeViews.get(grenade.id);
      if (!mesh) {
        const hostile = grenade.owner === 'enemy';
        mesh = new THREE.Mesh(
          QUAD,
          this.mat(this.textures.dot, true, 0.9, hostile ? 0xff3b4e : 0xffc46b),
        );
        mesh.scale.set(hostile ? 18 : 14, hostile ? 18 : 14, 1);
        mesh.position.z = 2;
        this.dynamic.add(mesh);
        this.grenadeViews.set(grenade.id, mesh);
      }
      mesh.position.set(grenade.x, grenade.y, 2);
      const hostile = grenade.owner === 'enemy';
      const base = hostile ? 18 : 14;
      const urgency = hostile
        ? Math.max(0, Math.min(1, 1 - grenade.life / 0.85))
        : 0;
      const pulse =
        1 + Math.sin(performance.now() * (0.01 + urgency * 0.05)) * (0.06 + urgency * 0.24);
      mesh.scale.set(base * pulse, base * pulse, 1);
    }
    for (const [id, mesh] of this.grenadeViews) {
      if (grenadeIds.has(id)) continue;
      this.dynamic.remove(mesh);
      this.grenadeViews.delete(id);
    }

    const explosionIds = new Set<number>();
    for (const explosion of world.explosions) {
      explosionIds.add(explosion.id);
      let mesh = this.explosionViews.get(explosion.id);
      if (!mesh) {
        const mat = new THREE.MeshBasicMaterial({
          map: this.textures.dot,
          transparent: true,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          color: 0xffd08a,
        });
        mesh = new THREE.Mesh(QUAD, mat);
        mesh.position.z = 1.9;
        this.dynamic.add(mesh);
        this.explosionViews.set(explosion.id, mesh);
      }
      const t = Math.max(0, explosion.life / explosion.maxLife);
      const size = 70 + (1 - t) * 220;
      mesh.scale.set(size, size, 1);
      mesh.position.set(explosion.x, explosion.y, 1.9);
      (mesh.material as THREE.MeshBasicMaterial).opacity = t * 0.75;
    }
    for (const [id, mesh] of this.explosionViews) {
      if (explosionIds.has(id)) continue;
      this.dynamic.remove(mesh);
      (mesh.material as THREE.Material).dispose();
      this.explosionViews.delete(id);
    }
  }

  private syncEffects(world: World): void {
    // decals
    const cursors = [0, 0, 0];
    for (const d of world.decals) {
      const pool = this.decalPools[d.tex];
      const idx = cursors[d.tex]++;
      if (idx >= pool.length) continue;
      const mesh = pool[idx];
      mesh.visible = true;
      mesh.position.set(d.x, d.y, 0.12);
      mesh.rotation.z = d.rot;
      mesh.scale.set(78 * d.scale, 78 * d.scale, 1);
    }
    for (let t = 0; t < 3; t++) {
      const pool = this.decalPools[t];
      for (let i = cursors[t]; i < pool.length; i++) pool[i].visible = false;
    }

    // particles
    let sparkIdx = 0;
    let bloodIdx = 0;
    for (const p of world.particles) {
      const t = Math.max(0, p.life / p.maxLife);
      if (p.kind === 'spark' || p.kind === 'casing') {
        if (sparkIdx >= this.sparkPool.length) continue;
        const mesh = this.sparkPool[sparkIdx++];
        mesh.visible = true;
        mesh.position.set(p.x, p.y, 1.55);
        const s = p.size * (0.6 + t * 1.4);
        mesh.scale.set(s, s, 1);
        mesh.rotation.z = Math.atan2(p.vy, p.vx);
        (mesh.material as THREE.MeshBasicMaterial).color.setHex(p.color);
        (mesh.material as THREE.MeshBasicMaterial).opacity = Math.min(1, t * 1.5);
      } else {
        if (bloodIdx >= this.bloodPool.length) continue;
        const mesh = this.bloodPool[bloodIdx++];
        mesh.visible = true;
        mesh.position.set(p.x, p.y, 1.5);
        const s = p.size * (0.8 + (1 - t) * 1.2);
        mesh.scale.set(s, s * 0.75, 1);
        mesh.rotation.z = Math.atan2(p.vy, p.vx);
        (mesh.material as THREE.MeshBasicMaterial).color.setHex(p.color);
        (mesh.material as THREE.MeshBasicMaterial).opacity = Math.min(0.9, t * 1.4);
      }
    }
    for (let i = sparkIdx; i < this.sparkPool.length; i++) this.sparkPool[i].visible = false;
    for (let i = bloodIdx; i < this.bloodPool.length; i++) this.bloodPool[i].visible = false;

    // bullets
    let bulletIdx = 0;
    for (const b of world.bullets) {
      if (bulletIdx >= this.bulletPool.length) break;
      const mesh = this.bulletPool[bulletIdx++];
      mesh.visible = true;
      mesh.position.set(b.x, b.y, 1.7);
      mesh.rotation.z = Math.atan2(b.vy, b.vx);
      mesh.scale.set(30, 8, 1);
    }
    for (let i = bulletIdx; i < this.bulletPool.length; i++) this.bulletPool[i].visible = false;
  }

  private syncCombatFx(world: World): void {
    const p = world.player;
    this.dashTrail.visible = p.alive && p.dashT > 0;
    if (this.dashTrail.visible) {
      this.dashTrail.position.set(p.x, p.y, 1.25);
      this.dashTrail.scale.set(90, 90, 1);
    }
    const fx = world.quickhackFxT;
    this.quickhackRing.visible = fx > 0;
    if (fx > 0) {
      const k = 1 - fx / 0.3;
      this.quickhackRing.position.set(world.quickhackX, world.quickhackY, 1.4);
      const size = 20 + k * 70;
      this.quickhackRing.scale.set(size, size, 1);
      this.quickhackMat.opacity = 0.55 * (1 - k);
    }
  }

  /** Market bystanders: umbrellas and hoods, no neon ring — never read as hostiles. */
  private syncCivilians(world: World): void {
    const now = performance.now();
    for (const c of world.civilians) {
      const look = c.look % this.textures.civilianWalk.length;
      let view = this.civilianViews.get(c.id);
      if (!view) {
        const root = new THREE.Group();
        const shadow = new THREE.Mesh(QUAD, this.mat(this.textures.shadow, false, 0.8));
        shadow.scale.set(64, 32, 1);
        shadow.position.z = 0.2;
        const mat = this.mat(this.textures.civilianWalk[look][0]).clone();
        mat.transparent = true;
        const body = new THREE.Mesh(QUAD, mat);
        body.scale.set(80, 80, 1);
        body.position.z = 0.95;
        root.add(shadow, body);
        this.dynamic.add(root);
        view = { root, body, mat, dead: false, tex: null };
        this.civilianViews.set(c.id, view);
      }
      view.root.position.set(c.x, c.y, 0);
      if (!c.alive) {
        if (!view.dead) {
          view.dead = true;
          view.mat.map = this.textures.civilianCorpse[look];
          view.mat.needsUpdate = true;
          view.mat.opacity = 0.92;
          view.body.scale.set(92, 92, 1);
          view.root.rotation.z = c.corpseAngle;
        }
        continue;
      }
      view.root.rotation.z = c.angle;
      const moving = Math.hypot(c.vx, c.vy) > 20;
      const frames = this.textures.civilianWalk[look];
      const tex = moving
        ? frames[Math.floor(now * (c.fleeT > 0 ? 0.016 : 0.008) + c.id) % frames.length]
        : frames[0];
      if (view.tex !== tex) {
        view.tex = tex;
        view.mat.map = tex;
        view.mat.needsUpdate = true;
      }
    }
  }

  private syncExit(world: World): void {
    if (!this.exitMesh || !this.exitMat) return;
    const t = performance.now() * 0.002;
    const open = world.exitOpen;
    // Defended extraction: the exit is open but held — pulse red until clear.
    const contested = open && world.exitContested;
    this.exitMat.opacity = open ? 0.55 + Math.sin(t * (contested ? 4 : 2)) * 0.2 : 0.16 + Math.sin(t) * 0.03;
    this.exitMat.color.setHex(
      contested ? this.palette.red : open ? this.palette.cyan : this.palette.magenta,
    );
    const s = open ? 118 + Math.sin(t * 2) * 6 : 108;
    this.exitMesh.scale.set(s, s, 1);
  }

  private updateCamera(world: World, dt: number, snap: boolean): void {
    const p = world.player;
    // No cursor-based lead: the crosshair must map exactly to the world point
    // under it, and a camera that chases the cursor breaks that mapping.
    const k = snap ? 1 : 1 - Math.exp(-7 * dt);
    this.camX += (p.x - this.camX) * k;
    this.camY += (p.y - this.camY) * k;

    const halfW = (this.viewH * this.aspect) / 2;
    const halfH = this.viewH / 2;
    const mapW = world.level.w * TILE;
    const mapH = world.level.h * TILE;
    this.camX =
      mapW > halfW * 2 ? THREE.MathUtils.clamp(this.camX, halfW, mapW - halfW) : mapW / 2;
    this.camY =
      mapH > halfH * 2 ? THREE.MathUtils.clamp(this.camY, halfH, mapH - halfH) : mapH / 2;

    const trauma = world.shake * world.shake * this.shakeScale;
    const ox = (Math.random() - 0.5) * 22 * trauma;
    const oy = (Math.random() - 0.5) * 22 * trauma;
    this.camera.position.set(this.camX + ox, this.camY + oy, 120);
    this.camera.rotation.z = (Math.random() - 0.5) * 0.016 * trauma;
    const targetZoom = 1 + Math.min(0.045, world.shake * 0.04);
    if (Math.abs(this.camera.zoom - targetZoom) > 0.0005) {
      this.camera.zoom = targetZoom;
      this.camera.updateProjectionMatrix();
    }
    this.camera.updateMatrixWorld();
  }

  setShakeScale(value: number): void {
    this.shakeScale = Math.max(0, value);
  }

  setBloomScale(value: number): void {
    this.bloomScale = Math.max(0, value);
  }

  setConesVisible(value: boolean): void {
    this.conesVisible = value;
  }

  setWeatherEnabled(value: boolean): void {
    this.weather.setEnabled(value);
  }

  setReducedMotion(value: boolean): void {
    this.reducedMotion = value;
    this.film.setReducedMotion(value);
    this.pings.setReducedMotion(value);
  }

  setPalette(palette: Palette): void {
    if (palette === 'deuteranopia') {
      this.palette = { cyan: 0x7fd4ff, magenta: 0xff8a3d, red: 0xff6a3d, amber: 0xffd166 };
    } else if (palette === 'protanopia') {
      this.palette = { cyan: 0x4ea8ff, magenta: 0xffb000, red: 0xff6b00, amber: 0xffe08a };
    } else if (palette === 'tritanopia') {
      this.palette = { cyan: 0x6bffb8, magenta: 0xff6b9d, red: 0xff4f7a, amber: 0xffd166 };
    } else {
      this.palette = { cyan: 0x5ef1ff, magenta: 0xff2f8e, red: 0xff3b4e, amber: 0xffc46b };
    }
    this.laserMat.color.setHex(this.palette.red);
  }

  /* ------------------------------------------------------------------ */
  /* input / resize                                                      */
  /* ------------------------------------------------------------------ */

  worldToScreen(x: number, y: number): { x: number; y: number } {
    const v = new THREE.Vector3(x, y, 0).project(this.camera);
    return {
      x: ((v.x + 1) / 2) * window.innerWidth,
      y: ((1 - v.y) / 2) * window.innerHeight,
    };
  }

  screenToWorld(clientX: number, clientY: number): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    this.ndc.set(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -(((clientY - rect.top) / rect.height) * 2 - 1),
    );
    this.ray.setFromCamera(this.ndc, this.camera);
    if (this.ray.ray.intersectPlane(this.plane, this.hit)) return { x: this.hit.x, y: this.hit.y };
    return { x: this.camera.position.x, y: this.camera.position.y };
  }

  resize(): void {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.aspect = w / h;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(w, h, false);
    this.composer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.composer.setSize(w, h);
    this.camera.left = (-this.viewH * this.aspect) / 2;
    this.camera.right = (this.viewH * this.aspect) / 2;
    this.camera.top = this.viewH / 2;
    this.camera.bottom = -this.viewH / 2;
    this.camera.updateProjectionMatrix();
  }
}
