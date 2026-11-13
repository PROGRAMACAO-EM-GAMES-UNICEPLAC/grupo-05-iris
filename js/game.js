/* ============================================================
   PROJETO ÍRIS — MOTOR DO JOGO (Three.js)
   Mundo 3D, jogador, inimigos, chefe, itens, portas e terminais.
   A interface (menus, HUD, diálogos) fica em main.js.
   ============================================================ */

const CELL = 4, WALL_H = 4, EYE = 1.6, P_RAD = 0.45;

const Game = (() => {
  let renderer, scene, camera, gunScene, gunCam, gun, gunGlowMat, muzzleLight, muzzleFlash;
  let world = null;
  const raycaster = new THREE.Raycaster();
  const CENTER = new THREE.Vector2(0, 0);
  const shared = {};
  const matCache = {};
  const texCache = {};

  const player = {};
  const input = { keys: {}, pressed: {}, mouse: false, lookX: 0, lookY: 0, sens: 1 };
  const stats = { shots: 0, hits: 0, kills: 0, deaths: 0, time: 0, logs: new Set() };
  // mira por gestos (preenchida por main.js a partir de HandControl)
  const aim = { hand: false, tracking: false, x: 0.5, y: 0.5, fire: false, turn: 1, edgeX: 0, edgeY: 0 };

  /* ============================================================
     INICIALIZAÇÃO
     ============================================================ */
  function init(canvas) {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.autoClear = false;

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.05, 200);
    camera.rotation.order = "YXZ";

    gunScene = new THREE.Scene();
    gunCam = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.01, 10);
    gunScene.add(new THREE.AmbientLight(0x667788, 0.9));
    const dl = new THREE.DirectionalLight(0xffffff, 0.8); dl.position.set(1, 2, 1); gunScene.add(dl);
    buildGun();

    shared.droneGeo = new THREE.IcosahedronGeometry(0.45, 0);
    shared.hunterGeo = new THREE.OctahedronGeometry(0.55, 0);
    shared.eyeGeo = new THREE.SphereGeometry(0.16, 12, 10);
    shared.ringGeo = new THREE.TorusGeometry(0.66, 0.035, 6, 28);
    shared.projGeo = new THREE.SphereGeometry(0.12, 10, 8);
    shared.sparkGeo = new THREE.BoxGeometry(0.06, 0.06, 0.06);
    shared.fragGeo = new THREE.OctahedronGeometry(0.38, 0);
    shared.beamGeo = new THREE.CylinderGeometry(0.06, 0.06, WALL_H, 8, 1, true);
    const tg = new THREE.BoxGeometry(0.03, 0.03, 1); tg.translate(0, 0, 0.5); shared.tracerGeo = tg;
    shared.tracerMat = new THREE.MeshBasicMaterial({ color: 0x9ffcf4, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false });
    Object.values(shared).forEach(o => { o.userData.shared = true; });
    camera.add(new THREE.PointLight(0xcfeeff, 0.7, 13)); // lanterna do jogador

    window.addEventListener("resize", onResize);
    window.addEventListener("keydown", e => {
      if (!input.keys[e.code] && !e.repeat) input.pressed[e.code] = true;
      input.keys[e.code] = true;
      if (["Space", "ArrowUp", "ArrowDown", "Tab"].includes(e.code)) e.preventDefault();
    });
    window.addEventListener("keyup", e => { input.keys[e.code] = false; });
    window.addEventListener("mousedown", e => { if (e.button === 0) input.mouse = true; });
    window.addEventListener("mouseup", e => { if (e.button === 0) input.mouse = false; });
    window.addEventListener("mousemove", e => {
      if (document.pointerLockElement) { input.lookX += e.movementX; input.lookY += e.movementY; }
    });
    window.addEventListener("blur", () => { input.keys = {}; input.mouse = false; });
  }

  function onResize() {
    const w = window.innerWidth, h = window.innerHeight;
    camera.aspect = w / h; camera.updateProjectionMatrix();
    gunCam.aspect = w / h; gunCam.updateProjectionMatrix();
    renderer.setSize(w, h);
  }

  function clearInput() { input.pressed = {}; input.mouse = false; input.lookX = input.lookY = 0; input.keys = {}; }

  function basicMat(color, glow) {
    const k = color + (glow ? "g" : "");
    if (!matCache[k]) {
      matCache[k] = glow
        ? new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.25, blending: THREE.AdditiveBlending, depthWrite: false })
        : new THREE.MeshBasicMaterial({ color });
      matCache[k].userData.shared = true;
    }
    return matCache[k];
  }

  /* ============================================================
     ARMA (renderizada numa cena separada para não atravessar paredes)
     ============================================================ */
  function buildGun() {
    gun = new THREE.Group();
    const dark = new THREE.MeshStandardMaterial({ color: 0x1c242e, metalness: 0.6, roughness: 0.4 });
    const mid = new THREE.MeshStandardMaterial({ color: 0x2c3846, metalness: 0.5, roughness: 0.5 });
    gunGlowMat = new THREE.MeshBasicMaterial({ color: 0x3ee6d8 });

    const body = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.1, 0.42), dark); gun.add(body);
    const top = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.04, 0.28), mid); top.position.set(0, 0.07, -0.02); gun.add(top);
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.03, 0.26, 10), dark);
    barrel.rotation.x = Math.PI / 2; barrel.position.set(0, 0.01, -0.32); gun.add(barrel);
    const strip = new THREE.Mesh(new THREE.BoxGeometry(0.095, 0.016, 0.3), gunGlowMat); strip.position.set(0, -0.02, -0.02); gun.add(strip);
    for (let i = 0; i < 3; i++) {
      const c = new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.008, 6, 14), gunGlowMat);
      c.position.set(0, 0.01, -0.26 - i * 0.05); gun.add(c);
    }
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.15, 0.08), mid);
    grip.position.set(0, -0.1, 0.1); grip.rotation.x = 0.3; gun.add(grip);

    muzzleFlash = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6),
      new THREE.MeshBasicMaterial({ color: 0xbffff9, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending }));
    muzzleFlash.position.set(0, 0.01, -0.47); muzzleFlash.visible = false; gun.add(muzzleFlash);
    muzzleLight = new THREE.PointLight(0x3ee6d8, 0, 3); muzzleLight.position.set(0, 0.02, -0.5); gun.add(muzzleLight);

    gun.scale.setScalar(0.62);
    gun.position.set(0.2, -0.16, -0.42);
    gunScene.add(gun);
  }

  /* ============================================================
     TEXTURAS PROCEDURAIS
     ============================================================ */
  function canvasTex(w, h, draw) {
    const c = document.createElement("canvas"); c.width = w; c.height = h;
    draw(c.getContext("2d"), w, h);
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = 4;
    return t;
  }

  function levelTextures(pal) {
    const key = pal.a1 + pal.a2;
    if (texCache[key]) return texCache[key];
    const S = 256;
    const wall = canvasTex(S, S, (g) => {
      g.fillStyle = "#0c1117"; g.fillRect(0, 0, S, S);
      for (let i = 0; i < 500; i++) {
        g.fillStyle = `rgba(255,255,255,${Math.random() * 0.025})`;
        g.fillRect(Math.random() * S, Math.random() * S, 2, 2);
      }
      g.strokeStyle = "#1a2530"; g.lineWidth = 3;
      g.strokeRect(10, 10, S / 2 - 15, S * 0.6); g.strokeRect(S / 2 + 5, 10, S / 2 - 15, S * 0.6);
      g.fillStyle = "#111921"; g.fillRect(10, S * 0.7, S - 20, S * 0.12);
      g.fillStyle = "#1e2a35";
      [[18, 18], [S - 22, 18], [18, S * 0.6], [S - 22, S * 0.6]].forEach(([x, y]) => g.fillRect(x, y, 4, 4));
    });
    const wallE = canvasTex(S, S, (g) => {
      g.fillStyle = "#000"; g.fillRect(0, 0, S, S);
      g.fillStyle = pal.a1; g.globalAlpha = 0.9; g.fillRect(0, S * 0.9, S, 4);
      g.globalAlpha = 0.25; g.fillRect(0, S * 0.9 - 4, S, 12);
      g.globalAlpha = 0.9; g.fillStyle = pal.a2;
      g.fillRect(S / 2 - 30, S * 0.74, 14, 5); g.fillRect(S / 2 + 16, S * 0.74, 6, 5);
      g.globalAlpha = 0.35; g.fillStyle = pal.a1; g.fillRect(S / 2 - 1, 10, 2, S * 0.6);
    });
    const floor = canvasTex(S, S, (g) => {
      g.fillStyle = "#07090c"; g.fillRect(0, 0, S, S);
      for (let i = 0; i < 300; i++) {
        g.fillStyle = `rgba(255,255,255,${Math.random() * 0.03})`;
        g.fillRect(Math.random() * S, Math.random() * S, 2, 2);
      }
      g.strokeStyle = "#16202a"; g.lineWidth = 4; g.strokeRect(0, 0, S, S);
      g.strokeStyle = "#10171f"; g.lineWidth = 2;
      g.beginPath(); g.moveTo(S / 2, 0); g.lineTo(S / 2, S); g.moveTo(0, S / 2); g.lineTo(S, S / 2); g.stroke();
    });
    const floorE = canvasTex(S, S, (g) => {
      g.fillStyle = "#000"; g.fillRect(0, 0, S, S);
      g.fillStyle = pal.a1; g.globalAlpha = 0.18;
      g.fillRect(0, 0, S, 2); g.fillRect(0, 0, 2, S);
      g.globalAlpha = 0.5; g.fillRect(S / 2 - 3, S / 2 - 3, 6, 6);
    });
    const ceil = canvasTex(S, S, (g) => {
      g.fillStyle = "#05070a"; g.fillRect(0, 0, S, S);
      g.strokeStyle = "#0f151c"; g.lineWidth = 3; g.strokeRect(0, 0, S, S);
    });
    const ceilE = canvasTex(S, S, (g) => {
      g.fillStyle = "#000"; g.fillRect(0, 0, S, S);
      g.fillStyle = "#c8f4ff"; g.globalAlpha = 0.18; g.fillRect(S * 0.3, S * 0.45, S * 0.4, S * 0.1);
    });
    texCache[key] = { wall, wallE, floor, floorE, ceil, ceilE };
    return texCache[key];
  }

  function terminalScreenTex(title, read) {
    return canvasTex(256, 160, (g, w, h) => {
      g.fillStyle = read ? "#071012" : "#04161a"; g.fillRect(0, 0, w, h);
      g.fillStyle = read ? "#3a5a5c" : "#3ee6d8";
      g.font = "bold 18px monospace"; g.fillText("ÍRIS // TERMINAL", 14, 28);
      g.font = "14px monospace"; g.fillText(title.slice(0, 26), 14, 54);
      g.globalAlpha = 0.5;
      for (let i = 0; i < 5; i++) g.fillRect(14, 72 + i * 14, 60 + Math.random() * 160, 5);
      g.globalAlpha = 1;
      g.fillStyle = read ? "#556" : "#ff2b3d"; g.font = "bold 14px monospace";
      g.fillText(read ? "[LIDO]" : "[NOVO REGISTRO]", 14, 150);
    });
  }

  /* ============================================================
     MONTAGEM DO SETOR
     ============================================================ */
  function disposeScene() {
    if (!scene) return;
    scene.traverse(o => {
      if (o.geometry && !o.geometry.userData.shared) o.geometry.dispose();
      if (o.material) {
        (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => {
          if (m.userData.shared) return;
          if (m.map && m.map.userData && m.map.userData.screen) m.map.dispose();
          m.dispose();
        });
      }
    });
  }

  function loadSector(idx) {
    disposeScene();
    const L = LEVELS[idx];
    scene = new THREE.Scene();
    scene.background = new THREE.Color(L.palette.fog);
    scene.fog = new THREE.Fog(L.palette.fog, 3, 32);
    scene.add(camera);

    const grid = L.map.map(r => r.split(""));
    const rows = grid.length, cols = grid[0].length;
    world = {
      idx, L, grid, rows, cols, time: 0,
      enemies: [], projectiles: [], particles: [], tracers: [], fragments: [], terminals: [],
      doors: [], doorMap: {}, pickups: [], obstacles: [], shootables: [], triggers: {}, fired: new Set(), cups: [],
      fragCollected: 0, fragTotal: L.fragCount, exitOpen: false, exitCell: null, exitPad: null,
      boss: null, dead: false, complete: false, firstKill: false, firstFragment: false,
      explored: new Uint8Array(rows * cols), hurtT: 99, nearest: null
    };

    const tex = levelTextures(L.palette);

    // chão e teto
    const W = cols * CELL, H = rows * CELL;
    const fTex = tex.floor.clone(); fTex.needsUpdate = true; fTex.repeat.set(cols, rows);
    const fE = tex.floorE.clone(); fE.needsUpdate = true; fE.repeat.set(cols, rows);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, H),
      new THREE.MeshStandardMaterial({ map: fTex, emissive: 0xffffff, emissiveMap: fE, roughness: 0.85, metalness: 0.2 }));
    floor.rotation.x = -Math.PI / 2;
    floor.position.set((cols - 1) * CELL / 2, 0, (rows - 1) * CELL / 2);
    scene.add(floor);
    const cTex = tex.ceil.clone(); cTex.needsUpdate = true; cTex.repeat.set(cols, rows);
    const cE = tex.ceilE.clone(); cE.needsUpdate = true; cE.repeat.set(cols, rows);
    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(W, H),
      new THREE.MeshStandardMaterial({ map: cTex, emissive: 0xffffff, emissiveMap: cE, roughness: 1 }));
    ceil.rotation.x = Math.PI / 2;
    ceil.position.set((cols - 1) * CELL / 2, WALL_H, (rows - 1) * CELL / 2);
    scene.add(ceil);

    // paredes (instanciadas — só as que fazem fronteira com o chão)
    const wallCells = [];
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      if (grid[r][c] === "S") { wallCells.push([c, r]); continue; } // EASTER EGG: parede falsa
      if (grid[r][c] !== "#") continue;
      let edge = false;
      for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
        const ch = (grid[r + dr] || [])[c + dc];
        if (ch && ch !== "#") edge = true;
      }
      if (edge) wallCells.push([c, r]);
    }
    const wallMat = new THREE.MeshStandardMaterial({ map: tex.wall, emissive: 0xffffff, emissiveMap: tex.wallE, roughness: 0.7, metalness: 0.25 });
    wallMat.userData.shared = true;
    const walls = new THREE.InstancedMesh(new THREE.BoxGeometry(CELL, WALL_H, CELL), wallMat, wallCells.length);
    const m4 = new THREE.Matrix4();
    wallCells.forEach(([c, r], i) => { m4.makeTranslation(c * CELL, WALL_H / 2, r * CELL); walls.setMatrixAt(i, m4); });
    walls.instanceMatrix.needsUpdate = true;
    walls.userData.ent = { onHit: (pt) => { sparks(pt, 0x9adfe0, 5, 3); return false; } };
    scene.add(walls); world.shootables.push(walls);

    // luzes
    scene.add(new THREE.AmbientLight(0x2a3644, 0.9));
    scene.add(new THREE.HemisphereLight(0x3a4a5a, 0x050505, 0.5));
    placeLights(grid, L.palette.lights);

    // entidades
    let logIdx = logsBefore(idx);
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const ch = grid[r][c], x = c * CELL, z = r * CELL;
      switch (ch) {
        case "P": Object.assign(player, { x, z }); break;
        case "F": spawnFragment(x, z); break;
        case "T": spawnTerminal(c, r, logIdx++); break;
        case "D": case "R": spawnEnemy(ch, x, z, false); break;
        case "H": spawnHealth(x, z, 35); break;
        case "X": spawnDoor(c, r, "exit"); break;
        case "L": spawnDoor(c, r, "lock"); break;
        case "E": spawnExitPad(c, r); break;
        case "B": spawnBoss(x, z); break;
        case "Q": spawnTerminal(c, r, -1); break;      // EASTER EGG: terminal secreto
        case "C": spawnCup(x, z); break;               // EASTER EGG: caneca da Helena
        default: if (/[1-9]/.test(ch)) world.triggers[c + "," + r] = ch;
      }
    }

    Object.assign(player, {
      yaw: L.startYaw, pitch: 0, vx: 0, vz: 0, hp: 100, maxHp: 100, heat: 0, overheated: false,
      fireCd: 0, dashCd: 0, dashT: 0, dashDir: { x: 0, z: 0 }, bobT: 0, stepAcc: 0, shake: 0,
      recoil: 0, flashT: 0, invuln: 0
    });
    clearInput();
    Sound.playMusic(L.song, L.transpose);
    Sound.setIntensity(0);
  }

  function placeLights(grid, colors) {
    const picked = [];
    const floors = [];
    grid.forEach((row, r) => row.forEach((ch, c) => { if (ch !== "#") floors.push([c, r]); }));
    for (let i = floors.length - 1; i > 0; i--) { const j = (i * 7919) % (i + 1); [floors[i], floors[j]] = [floors[j], floors[i]]; }
    for (const [c, r] of floors) {
      if (picked.length >= 7) break;
      if (picked.every(([pc, pr]) => Math.abs(pc - c) + Math.abs(pr - r) >= 5)) picked.push([c, r]);
    }
    picked.forEach(([c, r], i) => {
      const l = new THREE.PointLight(colors[i % colors.length], 1.4, 17, 1.5);
      l.position.set(c * CELL, WALL_H - 0.6, r * CELL);
      scene.add(l);
    });
  }

  /* ============================================================
     COLISÃO E GRID
     ============================================================ */
  function gridCh(c, r) { if (r < 0 || r >= world.rows || c < 0 || c >= world.cols) return "#"; return world.grid[r][c]; }

  // retorna a caixa sólida de uma célula (ou null)
  function cellBox(c, r) {
    const ch = gridCh(c, r);
    const x = c * CELL, z = r * CELL, h = CELL / 2;
    if (ch === "#") return [x - h, x + h, z - h, z + h];
    const d = world.doorMap[c + "," + r];
    if (d && d.openT < 0.7) {
      return d.spanX ? [x - h, x + h, z - 0.3, z + 0.3] : [x - 0.3, x + 0.3, z - h, z + h];
    }
    return null;
  }

  function pointSolid(x, z) {
    const b = cellBox(Math.round(x / CELL), Math.round(z / CELL));
    return b && x >= b[0] && x <= b[1] && z >= b[2] && z <= b[3];
  }

  function los(ax, az, bx, bz) {
    const dx = bx - ax, dz = bz - az, d = Math.hypot(dx, dz), n = Math.ceil(d / 0.4);
    for (let i = 1; i < n; i++) if (pointSolid(ax + dx * i / n, az + dz * i / n)) return false;
    return true;
  }

  function resolve(e, rad, isPlayer) {
    const c0 = Math.round(e.x / CELL), r0 = Math.round(e.z / CELL);
    for (let r = r0 - 1; r <= r0 + 1; r++) for (let c = c0 - 1; c <= c0 + 1; c++) {
      const b = cellBox(c, r); if (!b) continue;
      const nx = Math.max(b[0], Math.min(e.x, b[1])), nz = Math.max(b[2], Math.min(e.z, b[3]));
      const dx = e.x - nx, dz = e.z - nz, d2 = dx * dx + dz * dz;
      if (d2 >= rad * rad) continue;
      if (d2 > 1e-8) {
        const d = Math.sqrt(d2); e.x += dx / d * (rad - d); e.z += dz / d * (rad - d);
      } else { // centro dentro da caixa: empurra pelo menor eixo
        const pen = [e.x - b[0], b[1] - e.x, e.z - b[2], b[3] - e.z];
        const m = pen.indexOf(Math.min(...pen));
        if (m === 0) e.x = b[0] - rad; else if (m === 1) e.x = b[1] + rad; else if (m === 2) e.z = b[2] - rad; else e.z = b[3] + rad;
      }
    }
    if (isPlayer) {
      for (const o of world.obstacles) {
        const dx = e.x - o.x, dz = e.z - o.z, d = Math.hypot(dx, dz), min = rad + o.r;
        if (d < min && d > 1e-6) { e.x += dx / d * (min - d); e.z += dz / d * (min - d); }
      }
    }
  }

  function moveCircle(e, dx, dz, rad, isPlayer) {
    const steps = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dz)) / 0.2));
    for (let i = 0; i < steps; i++) { e.x += dx / steps; e.z += dz / steps; resolve(e, rad, isPlayer); }
  }

  function removeShootable(o) { const i = world.shootables.indexOf(o); if (i >= 0) world.shootables.splice(i, 1); }

  /* ============================================================
     ENTIDADES
     ============================================================ */
  function spawnEnemy(type, x, z, alerted) {
    const strong = type === "R", diff = world.L.diff;
    const color = strong ? 0xffa31a : 0xff2b3d;
    const e = {
      type, x, z, y: 1.9, color, hp: strong ? 4 : 2, speed: strong ? 4.3 : 2.7,
      fireInt: (strong ? 1.25 : 2.1) * diff.fire, dmg: Math.round((strong ? 11 : 8) * diff.dmg),
      projSpeed: strong ? 15 : 11, range: strong ? 22 : 17, radius: strong ? 0.6 : 0.5,
      alert: !!alerted, seen: false, losT: 0, shootT: 1 + Math.random() * 1.5, seed: Math.random() * 10,
      flash: 0, lastX: x, lastZ: z, dead: false
    };
    const g = new THREE.Group();
    e.bodyMat = new THREE.MeshStandardMaterial({ color: 0x2a323c, metalness: 0.7, roughness: 0.35, flatShading: true });
    e.body = new THREE.Mesh(strong ? shared.hunterGeo : shared.droneGeo, e.bodyMat);
    e.eye = new THREE.Mesh(shared.eyeGeo, basicMat(color)); e.eye.position.z = strong ? 0.5 : 0.38;
    e.ring = new THREE.Mesh(shared.ringGeo, basicMat(color)); e.ring.scale.setScalar(strong ? 1.2 : 1);
    const glow = new THREE.Mesh(shared.eyeGeo, basicMat(color, true)); glow.scale.setScalar(2.2); e.eye.add(glow);
    g.add(e.body, e.eye, e.ring);
    e.body.userData.ent = e; e.eye.userData.ent = e;
    e.onHit = (pt) => { damageEnemy(e, 1, pt); return true; };
    e.mesh = g; g.position.set(x, e.y, z);
    scene.add(g); world.shootables.push(e.body, e.eye);
    world.enemies.push(e);
    return e;
  }

  function alertEnemy(e) {
    if (e.alert) return;
    e.alert = true;
    const d = Math.hypot(player.x - e.x, player.z - e.z);
    Sound.sfx.alert(Math.max(0.2, 1 - d / 25));
  }

  function damageEnemy(e, n, pt) {
    if (e.dead) return;
    e.hp -= n; e.flash = 0.08; alertEnemy(e);
    sparks(pt, e.color, 6, 4);
    stats.hits++;
    if (e.hp <= 0) { killEnemy(e); UI.hitmarker(true); Sound.sfx.kill(); }
    else { UI.hitmarker(false); Sound.sfx.hit(); }
  }

  function killEnemy(e, silent) {
    e.dead = true;
    scene.remove(e.mesh); removeShootable(e.body); removeShootable(e.eye);
    e.bodyMat.dispose();
    world.enemies = world.enemies.filter(o => o !== e);
    if (silent) return;
    const p = new THREE.Vector3(e.x, e.y, e.z);
    sparks(p, e.color, 26, 7, 0.7, 1.6);
    sparks(p, 0x445566, 12, 4, 0.9, 2);
    const d = Math.hypot(player.x - e.x, player.z - e.z);
    Sound.sfx.enemyDie(Math.max(0.3, 1 - d / 30));
    stats.kills++;
    if (Math.random() < 0.3) spawnHealth(e.x, e.z, 20);
    if (!world.firstKill) { world.firstKill = true; Main.onEvent("firstKill"); }
  }

  function enemyShoot(e) {
    const from = new THREE.Vector3(e.x, e.y, e.z);
    const to = new THREE.Vector3(player.x, EYE - 0.35, player.z);
    const dir = to.sub(from).normalize();
    dir.x += (Math.random() - 0.5) * 0.05; dir.z += (Math.random() - 0.5) * 0.05; dir.normalize();
    from.addScaledVector(dir, 0.6);
    spawnProjectile(from, dir.multiplyScalar(e.projSpeed), e.dmg, e.color, 1);
    const d = Math.hypot(player.x - e.x, player.z - e.z);
    Sound.sfx.enemyShoot(Math.max(0.25, 1 - d / 28));
  }

  function spawnProjectile(pos, vel, dmg, color, size) {
    const m = new THREE.Mesh(shared.projGeo, basicMat(color));
    m.scale.setScalar(size); m.position.copy(pos);
    const halo = new THREE.Mesh(shared.projGeo, basicMat(color, true)); halo.scale.setScalar(2.6); m.add(halo);
    scene.add(m);
    world.projectiles.push({ mesh: m, vel, dmg, color, life: 6 });
  }

  function spawnFragment(x, z) {
    const g = new THREE.Group();
    const core = new THREE.Mesh(shared.fragGeo, new THREE.MeshStandardMaterial({
      color: 0x3ee6d8, emissive: 0x3ee6d8, emissiveIntensity: 1.1, flatShading: true, metalness: 0.3, roughness: 0.2 }));
    const wire = new THREE.Mesh(shared.fragGeo, new THREE.MeshBasicMaterial({ color: 0xbffcf7, wireframe: true, transparent: true, opacity: 0.5 }));
    wire.scale.setScalar(1.6);
    const beam = new THREE.Mesh(shared.beamGeo, basicMat(0x3ee6d8, true)); beam.position.y = WALL_H / 2;
    const light = new THREE.PointLight(0x3ee6d8, 1.2, 7); light.position.y = 1.4;
    core.position.y = wire.position.y = 1.4;
    g.add(core, wire, beam, light); g.position.set(x, 0, z);
    scene.add(g);
    world.fragments.push({ x, z, mesh: g, core, wire, taken: false });
  }

  function spawnHealth(x, z, amount) {
    const g = new THREE.Group();
    const mat = basicMat(0x6dff9c);
    const a = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.16, 0.16), mat);
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.5, 0.16), mat);
    const halo = new THREE.Mesh(new THREE.SphereGeometry(0.45, 12, 10), basicMat(0x6dff9c, true));
    const cross = new THREE.Group(); cross.add(a, b, halo); cross.position.y = 0.9;
    g.add(cross); g.position.set(x, 0, z);
    scene.add(g);
    world.pickups.push({ x, z, mesh: g, cross, amount, t: Math.random() * 6 });
  }

  function spawnTerminal(c, r, logIndex) {
    let x = c * CELL, z = r * CELL, rot = Math.PI;
    for (const [dx, dz] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) {
      if (gridCh(c + dx, r + dz) === "#") {
        x += dx * (CELL / 2 - 0.45); z += dz * (CELL / 2 - 0.45);
        rot = Math.atan2(-dx, -dz); break;
      }
    }
    const secret = logIndex < 0;
    const log = secret ? STORY.secretLog : (STORY.logs[logIndex] || { title: "LOG ??", body: "..." });
    const read = !secret && stats.logs.has(logIndex);
    const g = new THREE.Group();
    const dark = new THREE.MeshStandardMaterial({ color: 0x1a222b, metalness: 0.6, roughness: 0.4 });
    const base = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.1, 0.55), dark); base.position.y = 0.55; g.add(base);
    const head = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.75, 0.12), dark); head.position.set(0, 1.4, -0.05); head.rotation.x = -0.25; g.add(head);
    const tex = terminalScreenTex(log.title, read); tex.userData = { screen: true };
    const screenMat = new THREE.MeshBasicMaterial({ map: tex });
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.98, 0.62), screenMat);
    screen.position.set(0, 1.405, 0.015); screen.rotation.x = -0.25; g.add(screen);
    const ledMat = new THREE.MeshBasicMaterial({ color: read ? 0x334 : 0xff2b3d });
    const led = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.04, 0.02), ledMat); led.position.set(0, 0.95, 0.28); g.add(led);
    const light = new THREE.PointLight(0x3ee6d8, read ? 0.3 : 0.9, 4); light.position.set(0, 1.6, 0.8); g.add(light);
    g.position.set(x, 0, z); g.rotation.y = rot;
    scene.add(g);
    world.obstacles.push({ x, z, r: 0.55 });
    world.terminals.push({ x, z, mesh: g, screenMat, ledMat, light, logIndex, log, read, secret });
  }

  function markTerminalRead(t) {
    if (t.read) return;
    t.read = true;
    if (t.secret) Main.onSecret("room"); else stats.logs.add(t.logIndex);
    const old = t.screenMat.map;
    const tex = terminalScreenTex(t.log.title, true); tex.userData = { screen: true };
    t.screenMat.map = tex; t.screenMat.needsUpdate = true; old.dispose();
    t.ledMat.color.setHex(0x334455); t.light.intensity = 0.3;
  }

  function spawnDoor(c, r, kind) {
    const spanX = gridCh(c - 1, r) === "#" && gridCh(c + 1, r) === "#";
    const geo = spanX ? new THREE.BoxGeometry(CELL, WALL_H, 0.5) : new THREE.BoxGeometry(0.5, WALL_H, CELL);
    const mat = new THREE.MeshStandardMaterial({ color: 0x1b232c, metalness: 0.7, roughness: 0.35 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(c * CELL, WALL_H / 2, r * CELL);
    const barMat = new THREE.MeshBasicMaterial({ color: 0xff2b3d });
    const barGeo = spanX ? new THREE.BoxGeometry(CELL * 0.8, 0.12, 0.56) : new THREE.BoxGeometry(0.56, 0.12, CELL * 0.8);
    const bar = new THREE.Mesh(barGeo, barMat); bar.position.y = 0.2; mesh.add(bar);
    const bar2 = bar.clone(); bar2.position.y = -0.6; mesh.add(bar2);
    const signGeo = spanX ? new THREE.BoxGeometry(0.5, 0.5, 0.56) : new THREE.BoxGeometry(0.56, 0.5, 0.5);
    const sign = new THREE.Mesh(signGeo, barMat); sign.position.y = -0.2; mesh.add(sign);
    scene.add(mesh);
    const d = { c, r, kind, spanX, mesh, barMat, openT: 0, opening: false, locked: true,
      x: c * CELL, z: r * CELL };
    mesh.userData.ent = { onHit: (pt) => { sparks(pt, 0xff8888, 5, 3); return false; } };
    world.shootables.push(mesh);
    world.doors.push(d); world.doorMap[c + "," + r] = d;
  }

  function openDoor(d) {
    if (!d.locked) return;
    d.locked = false; d.opening = true;
    d.barMat.color.setHex(0x6dff9c);
    Sound.sfx.door();
  }

  function spawnExitPad(c, r) {
    const g = new THREE.Group();
    const padMat = new THREE.MeshBasicMaterial({ color: 0x552222 });
    const pad = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.5, 0.12, 32), padMat); pad.position.y = 0.06;
    const beamMat = new THREE.MeshBasicMaterial({ color: 0x6dff9c, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.3, WALL_H, 24, 1, true), beamMat); beam.position.y = WALL_H / 2;
    g.add(pad, beam); g.position.set(c * CELL, 0, r * CELL);
    scene.add(g);
    world.exitCell = c + "," + r;
    world.exitPad = { padMat, beamMat, beam };
  }

  function openExit() {
    world.exitOpen = true;
    world.doors.filter(d => d.kind === "exit").forEach(openDoor);
    if (world.exitPad) { world.exitPad.padMat.color.setHex(0x6dff9c); world.exitPad.beamMat.opacity = 0.25; }
  }

  /* ============================================================
     EASTER EGG — A CANECA DE CAFÉ FRIO DE HELENA
     Uma mesinha com uma caneca escondida no canto do Setor 2.
     Examinar (E) restaura toda a integridade e conta como segredo.
     ============================================================ */
  function spawnCup(x, z) {
    const g = new THREE.Group();
    const dark = new THREE.MeshStandardMaterial({ color: 0x1a222b, metalness: 0.5, roughness: 0.5 });
    const table = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.9, 0.9), dark); table.position.y = 0.45;
    const cupMat = new THREE.MeshStandardMaterial({ color: 0xe9ecef, roughness: 0.4 });
    const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.09, 0.22, 16), cupMat); cup.position.y = 1.01;
    const handle = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.018, 6, 12), cupMat);
    handle.position.set(0.13, 1.01, 0); handle.rotation.y = Math.PI / 2;
    const coffee = new THREE.Mesh(new THREE.CircleGeometry(0.095, 16), new THREE.MeshBasicMaterial({ color: 0x3a1f10 }));
    coffee.rotation.x = -Math.PI / 2; coffee.position.y = 1.1;
    const light = new THREE.PointLight(0xffd166, 0.6, 3); light.position.y = 1.6;
    g.add(table, cup, handle, coffee, light);
    g.position.set(x - 1.2, 0, z + 1.2); // encostada no canto
    scene.add(g);
    world.obstacles.push({ x: x - 1.2, z: z + 1.2, r: 0.6 });
    world.cups.push({ x: x - 1.2, z: z + 1.2, used: false, coffee });
  }

  function useCup(cup) {
    if (cup.used) return;
    cup.used = true; cup.coffee.visible = false;
    player.hp = player.maxHp;
    Sound.sfx.heal(); UI.healFlash();
    Main.onSecret("coffee");
  }

  // EASTER EGG — modo retrô (código Konami): renderiza em baixa resolução, estilo anos 90
  let retro = false;
  function setRetro(on) {
    retro = on;
    renderer.setPixelRatio(on ? 0.22 : Math.min(window.devicePixelRatio, 1.5));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.domElement.style.imageRendering = on ? "pixelated" : "";
  }

  /* ============================================================
     CHEFE — O OLHO DE ÍRIS
     ============================================================ */
  function spawnBoss(x, z) {
    const b = {
      x, z, y: 3.0, hp: 36, maxHp: 36, active: false, dead: false, phase: "shield", vulnT: 0,
      burstT: 3.2, aimT: 2, addsSpawned: false, t: 0, flash: 0, deathT: 0, nodes: [], exposedOnce: false, gone: false
    };
    const root = new THREE.Group(); root.position.set(x, b.y, z); scene.add(root);
    const head = new THREE.Group(); root.add(head);
    b.coreMat = new THREE.MeshStandardMaterial({ color: 0x14181e, metalness: 0.85, roughness: 0.25, emissive: 0x000000 });
    const core = new THREE.Mesh(new THREE.SphereGeometry(1.5, 32, 24), b.coreMat); head.add(core);
    const irisTex = canvasTex(256, 256, (g) => {
      const grd = g.createRadialGradient(128, 128, 20, 128, 128, 128);
      grd.addColorStop(0, "#ffd0d4"); grd.addColorStop(0.25, "#ff2b3d"); grd.addColorStop(0.8, "#5a0a14"); grd.addColorStop(1, "#1a0306");
      g.fillStyle = grd; g.beginPath(); g.arc(128, 128, 128, 0, Math.PI * 2); g.fill();
      g.strokeStyle = "rgba(255,180,190,0.35)"; g.lineWidth = 2;
      for (let i = 0; i < 48; i++) {
        const a = i / 48 * Math.PI * 2;
        g.beginPath(); g.moveTo(128 + Math.cos(a) * 45, 128 + Math.sin(a) * 45);
        g.lineTo(128 + Math.cos(a) * (100 + Math.random() * 25), 128 + Math.sin(a) * (100 + Math.random() * 25)); g.stroke();
      }
    });
    irisTex.wrapS = irisTex.wrapT = THREE.ClampToEdgeWrapping;
    const iris = new THREE.Mesh(new THREE.CircleGeometry(0.95, 40), new THREE.MeshBasicMaterial({ map: irisTex, transparent: true }));
    iris.position.z = 1.52; head.add(iris);
    b.pupil = new THREE.Mesh(new THREE.CircleGeometry(0.34, 32), new THREE.MeshBasicMaterial({ color: 0x000000 }));
    b.pupil.position.z = 1.53; head.add(b.pupil);
    const lens = new THREE.Mesh(new THREE.RingGeometry(0.95, 1.08, 48), new THREE.MeshBasicMaterial({ color: 0x3ee6d8 }));
    lens.position.z = 1.525; head.add(lens);

    const coreEnt = { onHit: (pt) => bossHitCore(pt) };
    [core, iris, b.pupil].forEach(m => { m.userData.ent = coreEnt; world.shootables.push(m); });
    b.coreParts = [core, iris, b.pupil];

    b.shield = new THREE.Mesh(new THREE.SphereGeometry(2.4, 24, 16),
      new THREE.MeshBasicMaterial({ color: 0x3ee6d8, transparent: true, opacity: 0.1, depthWrite: false }));
    const wire = new THREE.Mesh(new THREE.SphereGeometry(2.42, 16, 10),
      new THREE.MeshBasicMaterial({ color: 0x3ee6d8, wireframe: true, transparent: true, opacity: 0.22 }));
    b.shield.add(wire); root.add(b.shield);
    b.shield.userData.ent = { onHit: (pt) => { sparks(pt, 0x3ee6d8, 6, 3); Sound.sfx.shield(); if (world.time - (b.toastT || -9) > 2.5) { b.toastT = world.time; UI.toast("BLINDADO — DESTRUA OS NÓS"); } return false; } };
    world.shootables.push(b.shield);

    b.pivot = new THREE.Group(); root.add(b.pivot);
    for (let i = 0; i < 4; i++) {
      const a = i / 4 * Math.PI * 2;
      const mat = new THREE.MeshStandardMaterial({ color: 0xff2b3d, emissive: 0xff2b3d, emissiveIntensity: 0.8, flatShading: true });
      const mesh = new THREE.Mesh(new THREE.OctahedronGeometry(0.5, 0), mat);
      mesh.position.set(Math.cos(a) * 3.6, (i % 2 ? 0.7 : -0.7), Math.sin(a) * 3.6);
      const n = { hp: 5, alive: true, mesh, mat, flash: 0 };
      n.onHit = (pt) => bossHitNode(n, pt);
      mesh.userData.ent = n;
      b.pivot.add(mesh); world.shootables.push(mesh);
      b.nodes.push(n);
    }
    b.rings = [];
    [[4.4, 0xff2b3d], [5.0, 0x3ee6d8]].forEach(([rad, col], i) => {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(rad, 0.04, 6, 80), basicMat(col));
      ring.rotation.x = Math.PI / 2 + (i ? 0.4 : -0.3); root.add(ring); b.rings.push(ring);
    });
    b.light = new THREE.PointLight(0xff2b3d, 2.2, 30); root.add(b.light);
    b.root = root; b.head = head;
    world.obstacles.push({ x, z, r: 2.6 });
    world.boss = b;
  }

  function activateBoss() {
    const b = world.boss; if (!b || b.active) return;
    b.active = true;
    Sound.playMusic("boss"); Sound.sfx.bossRoar();
    UI.bossBar(true, 1); player.shake = 1;
  }

  function setShield(on) {
    const b = world.boss;
    b.shield.visible = on;
    if (on) { if (!world.shootables.includes(b.shield)) world.shootables.push(b.shield); }
    else removeShootable(b.shield);
  }

  function bossHitNode(n, pt) {
    if (!n.alive) return false;
    n.hp--; n.flash = 0.08; stats.hits++;
    sparks(pt, 0xff2b3d, 6, 4);
    if (n.hp <= 0) {
      n.alive = false; n.mesh.visible = false; removeShootable(n.mesh);
      const wp = new THREE.Vector3(); n.mesh.getWorldPosition(wp);
      sparks(wp, 0xff2b3d, 24, 7, 0.7, 1.5);
      Sound.sfx.enemyDie(); UI.hitmarker(true);
    } else { UI.hitmarker(false); Sound.sfx.hit(); }
    return true;
  }

  function bossHitCore(pt) {
    const b = world.boss;
    if (!b.active || b.dead) return false;
    if (b.phase !== "exposed") { sparks(pt, 0xffffff, 4, 2); Sound.sfx.shield(); return false; }
    b.hp--; b.flash = 0.08; stats.hits++;
    sparks(pt, 0xff2b3d, 8, 5);
    UI.hitmarker(false); Sound.sfx.hit();
    UI.bossBar(true, b.hp / b.maxHp);
    if (b.hp <= b.maxHp / 2 && !b.addsSpawned) {
      b.addsSpawned = true;
      [[2, 8], [12, 8], [7, 14]].forEach(([c, r]) => {
        const e = spawnEnemy(r === 14 ? "R" : "D", c * CELL, r * CELL, true);
        sparks(new THREE.Vector3(e.x, e.y, e.z), 0xff2b3d, 20, 5, 0.6, 1.5);
      });
      Main.onEvent("half");
    }
    if (b.hp <= 0) bossDie();
    return true;
  }

  function bossDie() {
    const b = world.boss;
    b.dead = true; b.deathT = 0;
    world.projectiles.forEach(p => scene.remove(p.mesh)); world.projectiles = [];
    world.enemies.slice().forEach(e => killEnemy(e, false));
    b.coreParts.forEach(removeShootable); b.nodes.forEach(n => removeShootable(n.mesh)); removeShootable(b.shield);
    UI.bossBar(false);
    Sound.sfx.bigExplosion(); Sound.stopMusic(); Sound.setIntensity(0);
    player.shake = 1.5;
  }

  function updateBoss(dt) {
    const b = world.boss;
    b.t += dt;
    if (b.dead) {
      if (b.gone) return;
      b.deathT += dt;
      b.root.position.set(b.x + (Math.random() - 0.5) * 0.4, b.y + (Math.random() - 0.5) * 0.4, b.z + (Math.random() - 0.5) * 0.4);
      b.coreMat.emissive.setHex(Math.random() < 0.5 ? 0xffffff : 0xff2b3d);
      b.light.intensity = 2 + Math.random() * 4;
      if (Math.random() < 0.5) {
        const p = new THREE.Vector3(b.x + (Math.random() - 0.5) * 3, b.y + (Math.random() - 0.5) * 3, b.z + (Math.random() - 0.5) * 3);
        sparks(p, Math.random() < 0.5 ? 0xff2b3d : 0xffffff, 8, 6, 0.6, 1.4);
      }
      if (b.deathT > 3) {
        b.gone = true;
        sparks(new THREE.Vector3(b.x, b.y, b.z), 0xffffff, 60, 12, 1.2, 2);
        scene.remove(b.root);
        Sound.sfx.enemyDie(1.5);
        setTimeout(() => Main.onBossDefeated(), 1200);
      }
      return;
    }
    b.root.position.y = b.y + Math.sin(b.t * 1.2) * 0.3;
    b.head.lookAt(player.x, EYE, player.z);
    const half = b.hp <= b.maxHp / 2;
    b.pivot.rotation.y += dt * (b.phase === "shield" ? 0.7 : 1.4) * (half ? 1.5 : 1);
    b.rings[0].rotation.z += dt * 0.4; b.rings[1].rotation.z -= dt * 0.25;
    b.nodes.forEach(n => {
      n.mesh.rotation.x += dt * 2; n.mesh.rotation.y += dt * 1.5;
      if (n.flash > 0) { n.flash -= dt; n.mat.emissive.setHex(n.flash > 0 ? 0xffffff : 0xff2b3d); }
    });
    if (b.flash > 0) { b.flash -= dt; b.coreMat.emissive.setHex(b.flash > 0 ? 0x662222 : 0x000000); }
    const ps = b.phase === "exposed" ? 1.6 + Math.sin(b.t * 10) * 0.2 : 1 + Math.sin(b.t * 2) * 0.1;
    b.pupil.scale.setScalar(ps);

    if (!b.active) {
      if (Math.hypot(player.x - b.x, player.z - b.z) < 16 && !world.fired.has("1")) { world.fired.add("1"); Main.onTrigger("1"); }
      return;
    }

    if (b.phase === "shield" && b.nodes.every(n => !n.alive)) {
      b.phase = "exposed"; b.vulnT = 7.5; setShield(false);
      Sound.sfx.bossRoar(); player.shake = 0.6;
      if (!b.exposedOnce) { b.exposedOnce = true; Main.onEvent("exposed"); }
      else UI.toast("NÚCLEO EXPOSTO");
    }
    if (b.phase === "exposed") {
      b.vulnT -= dt;
      if (b.vulnT <= 0) {
        b.phase = "shield"; setShield(true);
        b.nodes.forEach(n => { n.alive = true; n.hp = 5; n.mesh.visible = true; if (!world.shootables.includes(n.mesh)) world.shootables.push(n.mesh); });
        Sound.sfx.shield(); UI.toast("ESCUDO RESTAURADO");
      }
    }
    b.burstT -= dt;
    if (b.burstT <= 0) {
      const n = half ? 18 : 12, off = b.t;
      for (let i = 0; i < n; i++) {
        const a = off + i / n * Math.PI * 2;
        const dir = new THREE.Vector3(Math.cos(a), 0, Math.sin(a));
        const from = new THREE.Vector3(b.x + dir.x * 2.8, 1.3, b.z + dir.z * 2.8);
        spawnProjectile(from, dir.multiplyScalar(half ? 8.5 : 7.5), 12, 0xff2b3d, 1.6);
      }
      Sound.sfx.enemyShoot(1.5);
      b.burstT = half ? 2.6 : 3.6;
    }
    b.aimT -= dt;
    if (b.aimT <= 0) {
      const from = b.head.localToWorld(new THREE.Vector3(0, 0, 1.8));
      const base = new THREE.Vector3(player.x, EYE - 0.35, player.z).sub(from).normalize();
      const spreads = half ? [-0.14, 0, 0.14] : [0];
      spreads.forEach(s => {
        const d = base.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), s);
        spawnProjectile(from.clone(), d.multiplyScalar(16), 10, 0xffffff, 1.2);
      });
      Sound.sfx.enemyShoot(1.2);
      b.aimT = half ? 1.1 : 1.6;
    }
  }

  /* ============================================================
     EFEITOS
     ============================================================ */
  function sparks(pos, color, n, speed = 4, life = 0.4, size = 1) {
    if (world.particles.length > 350) return;
    for (let i = 0; i < n; i++) {
      const m = new THREE.Mesh(shared.sparkGeo, basicMat(color));
      m.position.copy(pos);
      const v = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.3, Math.random() - 0.5).normalize().multiplyScalar(speed * (0.4 + Math.random() * 0.8));
      scene.add(m);
      world.particles.push({ mesh: m, vel: v, life: life * (0.6 + Math.random() * 0.6), max: life, size });
    }
  }

  function tracer(a, b) {
    const m = new THREE.Mesh(shared.tracerGeo, shared.tracerMat);
    m.position.copy(a); m.lookAt(b); m.scale.z = a.distanceTo(b);
    scene.add(m);
    world.tracers.push({ mesh: m, life: 0.05 });
  }

  /* ============================================================
     JOGADOR
     ============================================================ */
  function fire() {
    const p = player;
    p.fireCd = 0.15; p.heat += 8.5; p.recoil = 1; p.flashT = 0.05;
    if (p.heat >= 100) { p.heat = 100; p.overheated = true; Sound.sfx.overheat(); UI.toast("SUPERAQUECIDO"); }
    stats.shots++; Sound.sfx.shoot();
    camera.updateMatrixWorld();
    const ndc = aim.hand ? new THREE.Vector2(aim.x * 2 - 1, -(aim.y * 2 - 1)) : CENTER;
    raycaster.setFromCamera(ndc, camera); raycaster.far = 90;
    if (aim.hand) assistAim(ndc);
    const hits = raycaster.intersectObjects(world.shootables, false);
    let end;
    if (hits.length) {
      end = hits[0].point;
      const ent = hits[0].object.userData.ent;
      if (ent && ent.onHit) ent.onHit(end);
    } else {
      end = raycaster.ray.origin.clone().addScaledVector(raycaster.ray.direction, 60);
    }
    const start = camera.localToWorld(new THREE.Vector3(0.18, -0.16, -0.6));
    tracer(start, end);
  }

  // ajuda de mira (só no modo gestos): puxa o tiro para o alvo mais próximo da mira
  function assistAim(ndc) {
    const cands = [];
    world.enemies.forEach(e => cands.push(new THREE.Vector3(e.x, e.y, e.z)));
    const b = world.boss;
    if (b && b.active && !b.dead) {
      if (b.phase === "exposed") cands.push(b.head.localToWorld(new THREE.Vector3(0, 0, 1.5)));
      else b.nodes.forEach(n => { if (n.alive) cands.push(n.mesh.getWorldPosition(new THREE.Vector3())); });
    }
    const camPos = camera.position, fwd = new THREE.Vector3(); camera.getWorldDirection(fwd);
    let best = null, bd = 0.25;
    for (const c of cands) {
      if (c.clone().sub(camPos).dot(fwd) <= 0) continue; // atrás da câmera
      const pr = c.clone().project(camera);
      const d = Math.hypot((pr.x - ndc.x) * camera.aspect, pr.y - ndc.y);
      if (d < bd) { bd = d; best = c; }
    }
    if (best) raycaster.ray.direction.copy(best).sub(raycaster.ray.origin).normalize();
  }

  function damagePlayer(dmg, from) {
    const p = player;
    if (p.invuln > 0 || world.dead) return;
    if (aim.hand) dmg = Math.round(dmg * 0.75); // modo gestos: um pouco mais fácil
    p.hp -= dmg; p.invuln = 0.12; p.shake = Math.min(1.2, p.shake + 0.5);
    world.hurtT = 0;
    Sound.sfx.hurt();
    const vx = from.x - p.x, vz = from.z - p.z;
    const fx = -Math.sin(p.yaw), fz = -Math.cos(p.yaw), rx = Math.cos(p.yaw), rz = -Math.sin(p.yaw);
    UI.hurt(Math.atan2(vx * rx + vz * rz, vx * fx + vz * fz));
    if (p.hp <= 0) {
      p.hp = 0; world.dead = true; stats.deaths++;
      Main.onPlayerDeath();
    }
  }

  function updatePlayer(dt) {
    const p = player, k = input.keys;
    p.yaw -= input.lookX * 0.0022 * input.sens;
    p.pitch -= input.lookY * 0.0022 * input.sens;
    input.lookX = input.lookY = 0;
    if (aim.hand && aim.tracking) {
      // mira perto da borda da tela = girar (zona morta no meio)
      const EX = 0.28, EY = 0.2;
      const ex = aim.x < EX ? -(EX - aim.x) / EX : aim.x > 1 - EX ? (aim.x - (1 - EX)) / EX : 0;
      const ey = aim.y < EY ? -(EY - aim.y) / EY : aim.y > 1 - EY ? (aim.y - (1 - EY)) / EY : 0;
      p.yaw -= Math.sign(ex) * Math.pow(Math.abs(ex), 1.3) * 2.8 * aim.turn * dt;
      p.pitch -= Math.sign(ey) * Math.pow(Math.abs(ey), 1.3) * 1.2 * aim.turn * dt;
      if (ey === 0) p.pitch *= 1 - Math.min(1, dt * 0.6); // volta devagar ao horizonte
      p.pitch = Math.max(-0.7, Math.min(0.7, p.pitch));
      aim.edgeX = ex; aim.edgeY = ey;
    } else { aim.edgeX = aim.edgeY = 0; }
    p.pitch = Math.max(-1.45, Math.min(1.45, p.pitch));

    const mx = (k.KeyD || k.ArrowRight ? 1 : 0) - (k.KeyA || k.ArrowLeft ? 1 : 0);
    const mz = (k.KeyW || k.ArrowUp ? 1 : 0) - (k.KeyS || k.ArrowDown ? 1 : 0);
    const s = Math.sin(p.yaw), c = Math.cos(p.yaw);
    let dx = -s * mz + c * mx, dz = -c * mz - s * mx;
    const len = Math.hypot(dx, dz); if (len > 0) { dx /= len; dz /= len; }
    const sprint = k.ShiftLeft || k.ShiftRight;
    const speed = sprint ? 7.5 : 4.8;

    p.dashCd -= dt;
    if (input.pressed.Space && p.dashCd <= 0) {
      p.dashT = 0.2; p.dashCd = 1.0;
      p.dashDir = len > 0 ? { x: dx, z: dz } : { x: -s, z: -c };
      Sound.sfx.dash();
    }
    let tvx = dx * speed, tvz = dz * speed;
    if (p.dashT > 0) { p.dashT -= dt; tvx = p.dashDir.x * 19; tvz = p.dashDir.z * 19; }
    const a = Math.min(1, dt * (p.dashT > 0 ? 30 : 12));
    p.vx += (tvx - p.vx) * a; p.vz += (tvz - p.vz) * a;
    moveCircle(p, p.vx * dt, p.vz * dt, P_RAD, true);

    const hsp = Math.hypot(p.vx, p.vz);
    if (hsp > 0.5 && p.dashT <= 0) {
      p.bobT += dt * hsp * 1.6; p.stepAcc += hsp * dt;
      if (p.stepAcc > 2.1) { p.stepAcc = 0; Sound.sfx.step(); }
    }
    const bob = Math.sin(p.bobT) * 0.05 * Math.min(1, hsp / 5);
    p.shake = Math.max(0, p.shake - dt * 2.5);
    const sh = p.shake * 0.12;
    camera.position.set(p.x + (Math.random() - 0.5) * sh, EYE + bob + (Math.random() - 0.5) * sh, p.z + (Math.random() - 0.5) * sh);
    camera.rotation.set(p.pitch, p.yaw, 0);

    // arma
    p.fireCd -= dt; p.invuln -= dt;
    p.heat = Math.max(0, p.heat - (p.overheated ? 40 : 28) * dt);
    if (p.overheated && p.heat <= 20) p.overheated = false;
    const wantFire = input.mouse || (aim.hand && aim.tracking && aim.fire);
    if (wantFire && p.fireCd <= 0 && !p.overheated) fire();
    p.recoil = Math.max(0, p.recoil - dt * 9);
    gun.position.set(
      0.2 + Math.cos(p.bobT * 0.5) * 0.012 * Math.min(1, hsp / 5),
      -0.16 - Math.abs(Math.sin(p.bobT * 0.5)) * 0.012 * Math.min(1, hsp / 5) - p.recoil * 0.015,
      -0.42 + p.recoil * 0.05);
    gun.rotation.x = p.recoil * 0.12;
    const h = p.heat / 100;
    gunGlowMat.color.setRGB(0.24 + h * 0.76, 0.9 * (1 - h) + 0.17 * h, 0.85 * (1 - h) + 0.24 * h);
    p.flashT -= dt;
    muzzleFlash.visible = p.flashT > 0;
    muzzleLight.intensity = p.flashT > 0 ? 3 : 0;

    // regeneração lenta até 40 depois de 4s sem dano
    world.hurtT += dt;
    if (world.hurtT > 4 && p.hp < 40) p.hp = Math.min(40, p.hp + 5 * dt);

    // mapa explorado
    const pc = Math.round(p.x / CELL), pr = Math.round(p.z / CELL);
    for (let r = pr - 2; r <= pr + 2; r++) for (let cc = pc - 2; cc <= pc + 2; cc++) {
      if (r >= 0 && r < world.rows && cc >= 0 && cc < world.cols) world.explored[r * world.cols + cc] = 1;
    }
  }

  /* ============================================================
     ATUALIZAÇÕES
     ============================================================ */
  function updateEnemies(dt) {
    for (const e of world.enemies.slice()) {
      const dx = player.x - e.x, dz = player.z - e.z, d = Math.hypot(dx, dz) || 0.001;
      e.losT -= dt;
      if (e.losT <= 0) { e.losT = 0.2; e.seen = d < 30 && los(e.x, e.z, player.x, player.z); }
      if (!e.alert && e.seen && d < e.range) alertEnemy(e);
      let mvx = 0, mvz = 0;
      if (e.alert) {
        if (e.seen) {
          e.lastX = player.x; e.lastZ = player.z;
          const nx = dx / d, nz = dz / d;
          const fwd = d > 9 ? 1 : d < 5 ? -0.8 : 0;
          const strafe = Math.sin(world.time * 0.9 + e.seed) * (e.type === "R" ? 1 : 0.6);
          mvx = nx * fwd - nz * strafe; mvz = nz * fwd + nx * strafe;
          e.shootT -= dt;
          if (e.shootT <= 0 && d < e.range + 6) { enemyShoot(e); e.shootT = e.fireInt * (aim.hand ? 1.3 : 1) * (0.75 + Math.random() * 0.5); }
        } else {
          const lx = e.lastX - e.x, lz = e.lastZ - e.z, ld = Math.hypot(lx, lz);
          if (ld > 1) { mvx = lx / ld; mvz = lz / ld; }
          e.shootT = Math.max(e.shootT, 0.6);
        }
      } else {
        mvx = Math.sin(world.time * 0.4 + e.seed) * 0.15; mvz = Math.cos(world.time * 0.3 + e.seed) * 0.15;
      }
      for (const o of world.enemies) {
        if (o === e) continue;
        const ox = e.x - o.x, oz = e.z - o.z, od = Math.hypot(ox, oz);
        if (od < 1.8 && od > 0.001) { mvx += ox / od * 0.8; mvz += oz / od * 0.8; }
      }
      const ml = Math.hypot(mvx, mvz); if (ml > 1) { mvx /= ml; mvz /= ml; }
      moveCircle(e, mvx * e.speed * dt, mvz * e.speed * dt, e.radius, false);
      e.y = 1.9 + Math.sin(world.time * 2 + e.seed) * 0.18;
      e.mesh.position.set(e.x, e.y, e.z);
      e.mesh.lookAt(player.x, EYE - 0.2, player.z);
      e.ring.rotation.x = Math.PI / 2 + Math.sin(world.time * 2 + e.seed) * 0.35;
      e.ring.rotation.y = Math.cos(world.time * 1.5 + e.seed) * 0.35;
      const tele = e.alert && e.seen && e.shootT < 0.4;
      e.eye.scale.setScalar(tele ? 1.35 + Math.sin(world.time * 40) * 0.25 : 1);
      if (e.flash > 0) { e.flash -= dt; e.bodyMat.emissive.setHex(e.flash > 0 ? 0x999999 : 0x000000); }
    }
  }

  function updateProjectiles(dt) {
    world.projectiles = world.projectiles.filter(pr => {
      pr.mesh.position.addScaledVector(pr.vel, dt);
      pr.life -= dt;
      const p = pr.mesh.position;
      if (pr.life <= 0 || p.y < 0.05 || p.y > WALL_H || pointSolid(p.x, p.z)) {
        sparks(p, pr.color, 4, 2, 0.25); scene.remove(pr.mesh); return false;
      }
      const hx = p.x - player.x, hz = p.z - player.z;
      if (hx * hx + hz * hz < 0.5 * 0.5 && p.y > 0.2 && p.y < 2.0) {
        if (player.dashT > 0) return true; // esquiva atravessa o projétil
        damagePlayer(pr.dmg, p); scene.remove(pr.mesh); return false;
      }
      return true;
    });
  }

  function updateItems(dt) {
    const p = player;
    for (const f of world.fragments) {
      if (f.taken) continue;
      f.core.rotation.y += dt * 1.5; f.core.rotation.x += dt * 0.7;
      f.wire.rotation.y -= dt; f.wire.rotation.z += dt * 0.5;
      const yy = 1.4 + Math.sin(world.time * 2 + f.x) * 0.15;
      f.core.position.y = f.wire.position.y = yy;
      if (Math.hypot(p.x - f.x, p.z - f.z) < 1.4) {
        f.taken = true; scene.remove(f.mesh);
        world.fragCollected++;
        sparks(new THREE.Vector3(f.x, 1.4, f.z), 0x3ee6d8, 30, 5, 0.8, 1.3);
        Sound.sfx.pickup(); Sound.sfx.memory();
        const global = fragmentsBefore(world.idx) + world.fragCollected;
        Main.onFragment(global, world.fragCollected, world.fragTotal);
        if (!world.firstFragment) { world.firstFragment = true; if (world.fragCollected < world.fragTotal) Main.onEvent("firstFragment"); }
        if (world.fragCollected >= world.fragTotal) { openExit(); Main.onEvent("allFragments"); }
      }
    }
    world.pickups = world.pickups.filter(h => {
      h.t += dt;
      h.cross.rotation.y += dt * 2; h.cross.position.y = 0.9 + Math.sin(h.t * 3) * 0.1;
      if (Math.hypot(p.x - h.x, p.z - h.z) < 1.2 && p.hp < p.maxHp) {
        p.hp = Math.min(p.maxHp, p.hp + h.amount);
        Sound.sfx.heal(); UI.healFlash(); UI.toast(`+${h.amount} INTEGRIDADE`);
        scene.remove(h.mesh); return false;
      }
      return true;
    });
    if (world.exitPad && world.exitOpen) world.exitPad.beam.rotation.y += dt;
  }

  function updateDoors(dt) {
    for (const d of world.doors) {
      if (!d.opening) continue;
      d.openT = Math.min(1, d.openT + dt * 0.8);
      d.mesh.position.y = WALL_H / 2 + d.openT * (WALL_H - 0.3);
      if (d.openT >= 1) { d.opening = false; removeShootable(d.mesh); }
    }
  }

  function updateFx(dt) {
    world.particles = world.particles.filter(pt => {
      pt.life -= dt;
      if (pt.life <= 0) { scene.remove(pt.mesh); return false; }
      pt.vel.y -= 9 * dt;
      pt.mesh.position.addScaledVector(pt.vel, dt);
      pt.mesh.scale.setScalar(pt.size * Math.max(0.1, pt.life / pt.max));
      return true;
    });
    world.tracers = world.tracers.filter(t => {
      t.life -= dt;
      if (t.life <= 0) { scene.remove(t.mesh); return false; }
      return true;
    });
  }

  function updateTriggersAndInteract() {
    const p = player;
    const key = Math.round(p.x / CELL) + "," + Math.round(p.z / CELL);
    const tr = world.triggers[key];
    if (tr && !world.fired.has(tr)) { world.fired.add(tr); Main.onTrigger(tr); }
    if (world.exitOpen && key === world.exitCell && !world.complete) {
      world.complete = true; Main.onSectorComplete(); return;
    }

    let best = null, bestD = 1e9;
    for (const t of world.terminals) {
      const d = Math.hypot(p.x - t.x, p.z - t.z);
      if (d < 2.4 && d < bestD) { best = { kind: "terminal", t }; bestD = d; }
    }
    for (const d of world.doors) {
      if (!d.locked) continue;
      const dist = Math.hypot(p.x - d.x, p.z - d.z);
      if (dist < 3.2 && dist < bestD) { best = { kind: d.kind, d }; bestD = dist; }
    }
    for (const cup of world.cups) {
      const d = Math.hypot(p.x - cup.x, p.z - cup.z);
      if (d < 2 && d < bestD) { best = { kind: "cup", cup }; bestD = d; }
    }
    world.nearest = best;
    if (!best) UI.prompt(null);
    else if (best.kind === "terminal") UI.prompt(best.t.read ? "[E] RELER REGISTRO" : "[E] ACESSAR TERMINAL");
    else if (best.kind === "lock") UI.prompt("[E] PAINEL DE ACESSO — CÓDIGO NECESSÁRIO");
    else if (best.kind === "cup") UI.prompt(best.cup.used ? "UMA CANECA VAZIA" : "[E] EXAMINAR CANECA");
    else UI.prompt(`PORTA SELADA — FRAGMENTOS ${world.fragCollected}/${world.fragTotal}`);

    if (input.pressed.KeyE && best) {
      if (best.kind === "terminal") { Sound.sfx.terminal(); Main.openTerminal(best.t); }
      else if (best.kind === "lock") { Sound.sfx.terminal(); Main.openKeypad(best.d); }
      else if (best.kind === "cup") useCup(best.cup);
      else Sound.sfx.denied();
    }
  }

  function update(dt) {
    if (!world || world.dead) return;
    world.time += dt; stats.time += dt;
    updatePlayer(dt);
    updateEnemies(dt);
    if (world.boss) updateBoss(dt);
    updateProjectiles(dt);
    updateItems(dt);
    updateDoors(dt);
    updateFx(dt);
    if (!world.complete) updateTriggersAndInteract();
    const danger = world.enemies.some(e => e.alert && Math.hypot(e.x - player.x, e.z - player.z) < 28);
    Sound.setIntensity(danger ? 1 : 0);
    input.pressed = {};
  }

  function render() {
    if (!world) return;
    renderer.clear();
    renderer.render(scene, camera);
    renderer.clearDepth();
    renderer.render(gunScene, gunCam);
  }

  /* ============================================================
     MINIMAPA
     ============================================================ */
  function drawMinimap(g, S) {
    g.clearRect(0, 0, S, S);
    if (!world) return;
    const s = Math.floor(Math.min(S / world.cols, S / world.rows));
    const ox = (S - s * world.cols) / 2, oy = (S - s * world.rows) / 2;
    const toMap = (x, z) => [ox + (x / CELL + 0.5) * s, oy + (z / CELL + 0.5) * s];
    const ex = (x, z) => world.explored[Math.round(z / CELL) * world.cols + Math.round(x / CELL)];
    for (let r = 0; r < world.rows; r++) for (let c = 0; c < world.cols; c++) {
      if (!world.explored[r * world.cols + c]) continue;
      g.fillStyle = (world.grid[r][c] === "#" || world.grid[r][c] === "S") ? "#22303c" : "rgba(62,230,216,0.07)";
      g.fillRect(ox + c * s, oy + r * s, s, s);
    }
    const dot = (x, z, col, rad) => { const [mx, my] = toMap(x, z); g.fillStyle = col; g.beginPath(); g.arc(mx, my, rad, 0, Math.PI * 2); g.fill(); };
    world.doors.forEach(d => { if (ex(d.x, d.z)) { const [mx, my] = toMap(d.x, d.z); g.fillStyle = d.locked ? "#ff2b3d" : "#6dff9c"; g.fillRect(mx - s / 2, my - s / 2, s, s); } });
    world.fragments.forEach(f => { if (!f.taken && ex(f.x, f.z)) dot(f.x, f.z, "#3ee6d8", 3); });
    world.terminals.forEach(t => { if (ex(t.x, t.z)) dot(t.x, t.z, t.read ? "#55606a" : "#ffd166", 2.5); });
    world.pickups.forEach(h => { if (ex(h.x, h.z)) dot(h.x, h.z, "#6dff9c", 2); });
    world.enemies.forEach(e => { if (e.alert || Math.hypot(e.x - player.x, e.z - player.z) < 12) dot(e.x, e.z, e.type === "R" ? "#ffa31a" : "#ff2b3d", 2.5); });
    if (world.boss && !world.boss.gone && ex(world.boss.x, world.boss.z)) dot(world.boss.x, world.boss.z, "#ff2b3d", 5);
    const [px, py] = toMap(player.x, player.z);
    const ang = Math.atan2(-Math.cos(player.yaw), -Math.sin(player.yaw));
    g.save(); g.translate(px, py); g.rotate(ang);
    g.fillStyle = "#e9ecef"; g.beginPath(); g.moveTo(6, 0); g.lineTo(-4, 4); g.lineTo(-2, 0); g.lineTo(-4, -4); g.closePath(); g.fill();
    g.restore();
  }

  /* ============================================================
     API PÚBLICA
     ============================================================ */
  return {
    init, loadSector, update, render, clearInput, drawMinimap, activateBoss, openDoor, markTerminalRead,
    setRetro, get retro() { return retro; },
    player, input, stats, aim,
    get world() { return world; },
    resetStats() { Object.assign(stats, { shots: 0, hits: 0, kills: 0, deaths: 0, time: 0 }); stats.logs = new Set(); }
  };
})();
