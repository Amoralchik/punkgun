export type ManualLocale = 'en' | 'es';

interface Localized {
  en: string;
  es: string;
}

export interface ManualSection {
  title: Localized;
  paragraphs: Localized[];
}

export const MANUAL_SECTIONS: ManualSection[] = [
  {
    title: { en: 'MOVEMENT & COMBAT', es: 'MOVIMIENTO Y COMBATE' },
    paragraphs: [
      {
        en: '<b>WASD</b> move · <b>MOUSE</b> aim · <b>LMB</b> strike/shoot · <b>R</b> reload · <b>RMB</b> throw weapon · <b>SPACE</b> dash · <b>E</b> execute stunned enemies',
        es: '<b>WASD</b> mover · <b>RATÓN</b> apuntar · <b>CLIC IZQ</b> golpear/disparar · <b>R</b> recargar · <b>CLIC DER</b> lanzar arma · <b>ESPACIO</b> impulso · <b>E</b> ejecutar enemigos aturdidos',
      },
      {
        en: '<b>GAMEPAD</b> — left stick move · right stick aim · RT fire · LT throw · A dash · B reload · X interact · Y quickhack · LB Sandevistan · RB camo · BACK supply · D-PAD abilities · START pause.',
        es: '<b>MANDO</b> — stick izq mover · stick der apuntar · RT disparar · LT lanzar · A impulso · B recargar · X interactuar · Y quickhack · LB Sandevistan · RB camuflaje · BACK suministro · CRUZ habilidades · START pausa.',
      },
      {
        en: 'Everyone dies in one hit. Armor plates from cyberware absorb one hit each and give a short grace window. Dash through a room, chain kills inside the combo window, and finish stunned targets with <b>E</b>. A <b>Z</b> quickhack needs an Intrusion Deck and a visible target.',
        es: 'Todos mueren de un golpe. Las placas de blindaje del ciberware absorben un impacto cada una y dan una breve ventana de gracia. Cruza la sala con el impulso, encadena muertes dentro de la ventana de combo y remata a los objetivos aturdidos con <b>E</b>. Un <b>quickhack Z</b> requiere un mazo de intrusión y un objetivo visible.',
      },
      {
        en: '<b>SHIELD</b> units block the front — flank, backstab, or throw. <b>SNIPERS</b> paint a red laser before firing. <b>RUSHERS</b> close fast with melee. <b>GRENADIERS</b> lob red fused grenades and keep their distance. <b>BLADES</b> are unarmed cyberpsychos that close faster than anything else. <b>NETRUNNERS</b> channel a visible hack that scrambles the HUD and locks active cyberware; break sight or kill them first. <b>OPERATORS</b> deploy turrets and carry a sidearm.',
        es: 'Las unidades con <b>ESCUDO</b> bloquean el frente: flanquéalas, apuñálalas por la espalda o lánzales algo. Los <b>FRANCOTIRADORES</b> pintan un láser rojo antes de disparar. Los <b>EMBESTIDORES</b> cierran rápido a melé. Los <b>GRANADEROS</b> lanzan granadas rojas con mecha y mantienen distancia. Las <b>HOJAS</b> son cyberpsicópatas sin armas que cierran más rápido que nadie. Los <b>NETRUNNERS</b> canalizan un hack visible que altera el HUD y bloquea el ciberware activo; rompe la línea de visión o mátalos primero. Los <b>OPERADORES</b> despliegan torretas y llevan pistola.',
      },
      {
        en: '<b>EXPLOSIVE BARRELS</b> chain-react. Shoot one beside a group, or throw a weapon into it. <b>SECURITY CAMERAS</b> sweep corridors and alert the sector; shoot them out. <b>TURRETS</b> paint a red line before firing — break line of sight or destroy them. <b>LASER GRIDS</b> pulse across corridors; cross on the dark phase or shoot the emitter.',
        es: 'Los <b>BARRILES EXPLOSIVOS</b> encadenan explosiones. Dispara a uno junto a un grupo o lánzale un arma. Las <b>CÁMARAS DE SEGURIDAD</b> barren los pasillos y alertan al sector; destrúyelas. Las <b>TORRETAS</b> pintan una línea roja antes de disparar: rompe la línea de visión o destrúyelas. Las <b>REDES LÁSER</b> pulsan en los pasillos; cruza en la fase oscura o dispara al emisor.',
      },
      {
        en: '<b>GLASS</b> blocks movement but not sight. Shoot a pane to open a route. <b>STEAM VENTS</b> pulse sight-blocking clouds; use them or wait out the cycle. <b>HOUNDS</b> leap; <b>MEDICS</b> restore ally plates; kill the medic first.',
        es: 'El <b>CRISTAL</b> bloquea el paso pero no la vista. Dispara a un panel para abrir ruta. Las <b>VENTILAS DE VAPOR</b> expulsan nubes que bloquean la visión; úsalas o espera el ciclo. Los <b>SABUESOS</b> saltan; los <b>MÉDICOS</b> restauran placas aliadas; mata primero al médico.',
      },
    ],
  },
  {
    title: { en: 'CONTRACTS', es: 'CONTRATOS' },
    paragraphs: [
      {
        en: '<b>PURGE</b> kill every hostile · <b>HIT</b> kill the marked target · <b>RECOVER</b> extract caches · <b>SABOTAGE</b> plant taps on marked terminals · <b>EXTRACTION</b> secure the case and survive the converge · <b>HUNT</b> chase a fleeing mark · <b>DEFENSE</b> hold the zone for 45 seconds. Exit opens when the objective is done.',
        es: '<b>PURGA</b> mata a todos los hostiles · <b>GOLPE</b> mata al objetivo marcado · <b>RECUPERA</b> extrae cachés · <b>SABOTAJE</b> coloca taps en terminales marcadas · <b>EXTRACCIÓN</b> asegura el maletín y sobrevive a la convergencia · <b>CAZA</b> persigue a un blanco que huye · <b>DEFENSA</b> mantén la zona 45 segundos. La salida se abre al cumplir el objetivo.',
      },
      {
        en: '<b>CHAPTERS</b> street, Sublevel, and Spire each gate on three clears and a boss. Six bosses: the augmented psycho, GRIN, DEADWEIGHT, the Board, SERAPH, and THE ARCHIVIST. The finale usually ends in one of three choices; the Sublevel REMEMBER choice opens a fourth.',
        es: '<b>CAPÍTULOS</b> calle, Subnivel y Aguja se abren con tres limpiezas y un jefe. Seis jefes: el psicópata aumentado, GRIN, DEADWEIGHT, el Consejo, SERAPH y EL ARCHIVISTA. El final suele terminar en una de tres decisiones; la elección RECORDAR del Subnivel abre una cuarta.',
      },
      {
        en: '<b>BOSS RUSH</b> unlocks after the finale: six bosses back-to-back in one arena. The exit stays sealed until the last one stops moving. <b>BREACH</b> terminals, cameras, and turrets with the row/column intrusion grid; success loops security, failure raises heat.',
        es: '<b>FURIA DE JEFES</b> se desbloquea tras el final: seis jefes seguidos en una arena. La salida queda sellada hasta que el último deje de moverse. <b>INFILTRACIÓN</b> en terminales, cámaras y torretas con la rejilla de filas/columnas; el éxito engaña a la seguridad y el fallo sube el calor.',
      },
      {
        en: '<b>BOSSES</b> break armor plates; every shattered plate summons adds and releases a radial shockwave. From phase 2 they telegraph a charge — break line of sight or sidestep. After a charge or plate break the magenta core is exposed; a hit in that window removes two plates.',
        es: '<b>JEFES</b> rompen placas de blindaje; cada placa destruida invoca refuerzos y libera una onda de choque radial. Desde la fase 2 telegrafían una carga: rompe la línea de visión o esquiva. Tras una carga o romper una placa, el núcleo magenta queda expuesto; un impacto en esa ventana elimina dos placas.',
      },
      {
        en: '<b>SAFEHOUSE</b> stations: CONTRACTS, MARKET, SUPPLIES, WORKBENCH, CLINIC, ARCHIVE, FABRICATOR, OPERATOR, SANCTUARY, and DEPLOY. <b>TAB</b> opens the terminal overview and the attaché case. SANCTUARY upgrades change the room and your run; the MARKET sells insurance and opens the EXCHANGE. The deploy pad always asks which contract to run before launch.',
        es: 'Estaciones del <b>REFUGIO</b>: CONTRATOS, MERCADO, SUMINISTROS, BANCO, CLÍNICA, ARCHIVO, FABRICADORA, OPERADOR, SANTUARIO y DESPLIEGUE. <b>TAB</b> abre el resumen del terminal y el maletín. Las mejoras del SANTUARIO cambian la sala y la partida; el MERCADO vende seguros y abre la BOLSA. La plataforma de despliegue siempre pregunta qué contrato ejecutar antes de lanzar.',
      },
    ],
  },
  {
    title: { en: 'LOOT & MONEY', es: 'BOTÍN Y DINERO' },
    paragraphs: [
      {
        en: '<b>E</b> grabs caches, weapons, and slams doors. Loot becomes contraband only on a clean exit; sell it in the safehouse. Contract pay + time bonus are banked on clear.',
        es: '<b>E</b> recoge cachés y armas, y cierra puertas de golpe. El botín solo se convierte en contrabando al salir limpio; véndelo en el refugio. El pago del contrato y el bono de tiempo se ingresan al limpiar.',
      },
      {
        en: '<b>Q</b> uses your packed supply: stim armor, smoke, flashbang, or frag grenade.',
        es: '<b>Q</b> usa tu suministro: placa estimulante, humo, granada cegadora o granada de fragmentación.',
      },
      {
        en: '<b>COMPONENTS</b> drop from kills; the FABRICATOR turns them into ammo, attachments, stims, and weapons that stow in the attaché case.',
        es: 'Los <b>COMPONENTES</b> caen de las muertes; la FABRICADORA los convierte en munición, accesorios, estimulantes y armas que se guardan en el maletín.',
      },
      {
        en: '<b>ATTACHMENTS</b> change behavior: magazine size, pellets, spread, cooldown, reload speed, pierce, or stealth noise. One attachment per gun; replacing it destroys the old one.',
        es: 'Los <b>ACCESORIOS</b> cambian el comportamiento: cargador, perdigones, dispersión, enfriamiento, recarga, perforación o ruido de sigilo. Un accesorio por arma; reemplazarlo destruye el anterior.',
      },
    ],
  },
  {
    title: { en: 'AUGMENTS & XP', es: 'AUMENTOS Y XP' },
    paragraphs: [
      {
        en: 'Clears grant XP and levels. Levels give perk points for the clinic; credits buy permanent cyberware. Armor, speed, spread, and enemy vision all come from your build.',
        es: 'Las limpiezas dan XP y niveles. Los niveles dan puntos de ventaja para la clínica; los créditos compran ciberware permanente. Blindaje, velocidad, dispersión y visión enemiga dependen de tu build.',
      },
      {
        en: "<b>ACTIVE 'WARE</b> — <b>SHIFT</b> Sandevistan slows the world; <b>C</b> Optical Camo breaks line of sight; <b>X</b> Microgenerator EMP; <b>V</b> Berserk; <b>G</b> Overclock; <b>H</b> Intrusion Deck. Second Heart, Biomonitor, Mantis Blades, and Gorilla Arms are passive installs.",
        es: "<b>CIBERWARE ACTIVO</b> — <b>MAYÚS</b> Sandevistan ralentiza el mundo; <b>C</b> Camuflaje óptico rompe la línea de visión; <b>X</b> EMP de microgenerador; <b>V</b> Berserk; <b>G</b> Overclock; <b>H</b> mazo de intrusión. Segundo Corazón, Biomonitor, Hojas Mantis y Brazos Gorila son instalaciones pasivas.",
      },
      {
        en: '<b>NEURAL LOAD</b> — every implant consumes humanity. Above 60% strain the ripperdoc may reject an install; above 85% armor and vision suffer. BODY and level raise capacity.',
        es: '<b>CARGA NEURAL</b> — cada implante consume humanidad. Por encima del 60% de tensión el ripperdoc puede rechazar la instalación; por encima del 85% sufren blindaje y visión. CUERPO y nivel aumentan la capacidad.',
      },
    ],
  },
  {
    title: { en: 'STEALTH & HEAT', es: 'SIGILO Y CALOR' },
    paragraphs: [
      {
        en: 'Vision cones show enemy sight. Approach from behind and press <b>E</b> for a silent takedown. Gunfire raises heat; at high heat, reinforcements breach the sector. Bodies can be discovered, and any enemy, camera, turret, or discovered body breaks a <b>GHOST RUN</b>; zero detections pays a 15% bonus.',
        es: 'Los conos de visión muestran el campo de visión enemigo. Acércate por detrás y pulsa <b>E</b> para un derribo silencioso. Los disparos suben el calor; con calor alto, llegan refuerzos. Los cuerpos pueden ser descubiertos, y cualquier enemigo, cámara, torreta o cuerpo descubierto rompe una <b>PARTIDA FANTASMA</b>; cero detecciones paga un bonus del 15%.',
      },
      {
        en: '<b>ACCESSIBILITY</b> — pause → settings: reduced motion, colorblind palettes, subtitles, event log, WASD/ESDF/ARROWS presets, and per-action key remapping. Click a remap slot, then press the new key.',
        es: '<b>ACCESIBILIDAD</b> — pausa → ajustes: movimiento reducido, paletas para daltonismo, subtítulos, registro de eventos, presets WASD/ESDF/FLECHAS y reasignación de teclas por acción. Haz clic en una ranura y pulsa la tecla nueva.',
      },
    ],
  },
  {
    title: { en: 'DEATH & RETRY', es: 'MUERTE Y REINTENTO' },
    paragraphs: [
      {
        en: 'On death, <b>R</b> retries the same contract with fists; <b>SPACE</b> returns to the safehouse. A clear extracts whatever weapon you are holding and pays out.',
        es: 'Al morir, <b>R</b> reintenta el mismo contrato con los puños; <b>ESPACIO</b> vuelve al refugio. Una limpieza extrae el arma que llevas y paga.',
      },
    ],
  },
];

export const TOUR_ITEMS: Localized[] = [
  {
    en: '<b>01 · CONTRACTS</b><span>Read the board, then pick a contract and insertion.</span>',
    es: '<b>01 · CONTRATOS</b><span>Lee el tablón y elige contrato e inserción.</span>',
  },
  {
    en: '<b>02 · MARKET</b><span>Buy gear, ammunition, insurance or faction hardware. Open the exchange for dividends.</span>',
    es: '<b>02 · MERCADO</b><span>Compra equipo, munición, seguro o hardware de facción. Abre la bolsa para dividendos.</span>',
  },
  {
    en: '<b>03 · SANCTUARY</b><span>Invest in the room. Upgrades change the diorama and the next run.</span>',
    es: '<b>03 · SANTUARIO</b><span>Invierte en la sala. Las mejoras cambian el diorama y la próxima partida.</span>',
  },
  {
    en: '<b>04 · DEPLOY</b><span>Choose an approach and a challenge. Fists, Glass and Rush change the rules.</span>',
    es: '<b>04 · DESPLIEGUE</b><span>Elige aproximación y desafío. Puños, Cristal y Prisa cambian las reglas.</span>',
  },
  {
    en: '<b>05 · THE SECTOR</b><span>Dash, flank, execute stunned targets, break glass and extract. The city is one hit deep.</span>',
    es: '<b>05 · EL SECTOR</b><span>Impúlsate, flanquea, ejecuta objetivos aturdidos, rompe cristales y extrae. La ciudad es de un solo golpe.</span>',
  },
];

export function renderManualSections(locale: ManualLocale): string {
  return MANUAL_SECTIONS.map(
    (section) =>
      `<section><h3>${section.title[locale]}</h3>${section.paragraphs
        .map((paragraph) => `<p>${paragraph[locale]}</p>`)
        .join('')}</section>`,
  ).join('');
}

export function renderTourItems(locale: ManualLocale): string {
  return TOUR_ITEMS.map((item) => `<div>${item[locale]}</div>`).join('');
}
