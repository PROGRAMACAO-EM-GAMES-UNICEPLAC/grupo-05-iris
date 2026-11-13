/* ============================================================
   PROJETO ÍRIS — INTERFACE E FLUXO DO JOGO
   Menus, HUD, diálogos, terminais, escolhas e finais.
   ============================================================ */

const $ = s => document.querySelector(s);
const canvas = $("#game");
Game.init(canvas); // precisa vir antes dos outros listeners de teclado
let state = "splash";       // splash | menu | panel | intro | card | playing | paused | terminal | keypad | dead | transition | choice | ending
let cur = 0;                // setor atual
let playedStart = new Set();
let panelReturn = "menu";
let handHintShown = false;
const SECRET_TOTAL = Object.keys(STORY.secrets).length;

/* ---------------- SALVAMENTO ---------------- */
const settings = Object.assign({ music: 0.55, sfx: 0.8, sens: 1, hand: false, turn: 1 }, JSON.parse(localStorage.getItem("iris_settings") || "{}"));
const progress = Object.assign({ unlocked: 0, endings: [], secrets: [] }, JSON.parse(localStorage.getItem("iris_progress") || "{}"));
const saveSettings = () => localStorage.setItem("iris_settings", JSON.stringify(settings));
const saveProgress = () => localStorage.setItem("iris_progress", JSON.stringify(progress));
function applySettings() {
  Sound.setMusicVolume(settings.music); Sound.setSfxVolume(settings.sfx); Game.input.sens = settings.sens;
  Game.aim.turn = settings.turn;
}

/* ---------------- UTILITÁRIOS ---------------- */
const SCREENS = ["splash", "menu", "panel", "intro", "card", "pause", "terminal", "keypad", "dead", "choice", "ending"];
function show(id) { SCREENS.forEach(s => $("#" + s).classList.toggle("show", s === id)); }
function hideScreens() { SCREENS.forEach(s => $("#" + s).classList.remove("show")); }
function hud(on) { $("#hud").classList.toggle("hidden", !on); }

function wait(ms, breakFn) {
  return new Promise(res => {
    const t0 = performance.now();
    const iv = setInterval(() => {
      if (performance.now() - t0 >= ms || (breakFn && breakFn())) { clearInterval(iv); res(); }
    }, 30);
  });
}
function typeInto(el, text, speed, skipFn, tick) {
  return new Promise(res => {
    let i = 0;
    el.innerHTML = '<span class="cursor">▌</span>';
    const iv = setInterval(() => {
      if (skipFn && skipFn()) i = text.length; else i++;
      el.innerHTML = escapeHtml(text.slice(0, i)) + (i < text.length ? '<span class="cursor">▌</span>' : "");
      if (tick && i < text.length && text[i] !== " ") tick(i);
      if (i >= text.length) { clearInterval(iv); res(); }
    }, speed);
  });
}
function escapeHtml(s) { return s.replace(/[&<>]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c])); }
function fmtTime(s) { s = Math.floor(s); return String(Math.floor(s / 60)).padStart(2, "0") + ":" + String(s % 60).padStart(2, "0"); }

function requestLock() {
  try { const r = canvas.requestPointerLock(); if (r && r.catch) r.catch(() => {}); } catch (e) { }
}
function exitLock() { if (document.pointerLockElement) document.exitPointerLock(); }

/* ============================================================
   UI — chamadas feitas pelo motor do jogo
   ============================================================ */
const UI = (() => {
  let lastPrompt = null, toastT, hurtT, healT;
  const restart = (el, cls) => { el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); };
  return {
    prompt(text) {
      if (text === lastPrompt) return;
      lastPrompt = text;
      const el = $("#prompt");
      if (text) { el.textContent = text; el.classList.add("show"); } else el.classList.remove("show");
    },
    toast(text) {
      const el = $("#toast"); el.textContent = text; restart(el, "show");
      clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove("show"), 1400);
    },
    hitmarker(kill) {
      const el = $("#hitmarker"); el.classList.toggle("kill", !!kill); restart(el, "show");
    },
    hurt(angle) {
      const v = $("#hurtVignette"); v.classList.add("flash");
      clearTimeout(hurtT); hurtT = setTimeout(() => v.classList.remove("flash"), 80);
      const d = $("#dmgIndicator"); d.style.transform = `rotate(${angle}rad)`; restart(d, "show");
    },
    healFlash() {
      const v = $("#healVignette"); v.classList.add("flash");
      clearTimeout(healT); healT = setTimeout(() => v.classList.remove("flash"), 100);
    },
    bossBar(on, frac) {
      $("#bossBar").classList.toggle("show", !!on);
      if (frac !== undefined) $("#bossFill").style.width = (Math.max(0, frac) * 100) + "%";
    }
  };
})();

/* ---------------- DIÁLOGOS ---------------- */
const dq = []; let dBusy = false, dToken = 0;
function say(lines) {
  if (!lines || !lines.length) return;
  lines.forEach(l => dq.push(l));
  if (!dBusy) nextLine();
}
async function nextLine() {
  const box = $("#dialog");
  if (!dq.length) { dBusy = false; box.classList.remove("show"); return; }
  dBusy = true;
  const token = dToken;
  const [who, text] = dq.shift();
  box.classList.toggle("sys", who === "SISTEMA");
  box.querySelector(".who").textContent = who;
  box.classList.add("show");
  await typeInto(box.querySelector(".text"), text, 24, () => token !== dToken,
    i => { if (i % 2 === 0) (who === "ÍRIS" ? Sound.sfx.voice() : Sound.sfx.sys()); });
  await wait(1500 + text.length * 40, () => token !== dToken);
  if (token !== dToken) return;
  nextLine();
}
function clearDialog() { dToken++; dq.length = 0; dBusy = false; $("#dialog").classList.remove("show"); }

/* ---------------- MEMÓRIA / ENIGMA ---------------- */
let memT;
function showMemory(n) {
  const el = $("#memory");
  el.querySelector(".label").textContent = `FRAGMENTO DE MEMÓRIA ${n}/${TOTAL_FRAGMENTS} · HELENA VASQUEZ`;
  el.querySelector(".text").textContent = "“" + (STORY.memories[n - 1] || "...") + "”";
  el.classList.add("show");
  clearTimeout(memT); memT = setTimeout(() => el.classList.remove("show"), 7500);
}
function renderEnigma(collected) {
  const letters = [...ENIGMA_PHRASE].filter(c => c !== " " && c !== "-").length;
  const reveal = Math.round(collected / TOTAL_FRAGMENTS * letters);
  let n = 0, out = "";
  for (const ch of ENIGMA_PHRASE) {
    if (ch === " ") { out += "  "; continue; }
    if (ch === "-") { out += collected >= TOTAL_FRAGMENTS ? "-" : '<span class="slot">-</span>'; continue; }
    n++;
    out += n <= reveal ? ch : '<span class="slot">░</span>';
  }
  $("#enigma").innerHTML = out;
}
function setObjective(t) { $("#objective").textContent = t; }
function updateFragHud() {
  const w = Game.world;
  if (!w) return;
  $("#fragCount").textContent = w.fragTotal ? `FRAGMENTOS ${w.fragCollected}/${w.fragTotal}` : "FRASE-CHAVE RECUPERADA";
  renderEnigma(fragmentsBefore(cur) + w.fragCollected);
}

/* ============================================================
   MAIN — eventos vindos do motor
   ============================================================ */
const Main = {
  onEvent(name) {
    const S = STORY.sectors[cur];
    say(S.dialogues[name]);
    if (name === "allFragments" && S.objectiveDone) setObjective(S.objectiveDone);
    if (name === "exposed") setObjective("ATAQUE O NÚCLEO EXPOSTO");
    if (name === "half") setObjective("Sobreviva · continue atacando o núcleo");
  },
  onTrigger(d) {
    say(STORY.sectors[cur].dialogues["t" + d]);
    if (cur === 2 && d === "1") { Game.activateBoss(); setObjective("Destrua os 4 nós de proteção"); }
  },
  onFragment(global, local, total) {
    showMemory(global);
    updateFragHud();
    if (local < total) setObjective(`${STORY.sectors[cur].objective} (${local}/${total})`);
  },
  onSectorComplete() {
    state = "transition";
    Sound.sfx.complete(); UI.toast("SETOR CONCLUÍDO");
    progress.unlocked = Math.max(progress.unlocked, cur + 1); saveProgress();
    exitLock(); clearDialog();
    setTimeout(() => {
      $("#fade").classList.add("on");
      setTimeout(() => { startSector(cur + 1); $("#fade").classList.remove("on"); }, 700);
    }, 900);
  },
  onPlayerDeath() {
    state = "dead";
    exitLock(); clearDialog(); UI.prompt(null);
    const q = STORY.deathQuotes[Math.floor(Math.random() * STORY.deathQuotes.length)];
    $("#deadQuote").innerHTML = `<b>ÍRIS:</b> "${escapeHtml(q)}"`;
    Sound.setIntensity(0);
    setTimeout(() => { if (state === "dead") show("dead"); }, 500);
  },
  onBossDefeated() { showChoice(); },
  // EASTER EGGS: registra um segredo encontrado (salvo entre sessões)
  onSecret(id, quiet) {
    const S = STORY.secrets[id];
    const isNew = !progress.secrets.includes(id);
    if (isNew) { progress.secrets.push(id); saveProgress(); }
    if (quiet) return;
    if (isNew) { Sound.sfx.memory(); UI.toast(`SEGREDO ENCONTRADO · ${S.name} (${progress.secrets.length}/${SECRET_TOTAL})`); }
    else UI.toast(S.name);
    say(S.lines);
  },
  openTerminal(t) {
    state = "terminal";
    Game.markTerminalRead(t);
    $("#termTitle").textContent = t.log.title;
    $("#termCount").textContent = t.secret ? "REGISTRO SECRETO" : `REGISTROS ${Game.stats.logs.size}/${TOTAL_LOGS}`;
    show("terminal");
    termTyping = true;
    typeInto($("#termBody"), t.log.body, 8, () => !termTyping, i => { if (i % 3 === 0) Sound.sfx.type(); })
      .then(() => termTyping = false);
  },
  openKeypad(door) {
    state = "keypad"; keypadDoor = door; keyCode = "";
    renderKeypad(); $("#keyMsg").className = ""; $("#keyMsg").textContent = "DIGITE O CÓDIGO DE 4 DÍGITOS NO TECLADO";
    show("keypad");
  }
};

/* ---------------- TERMINAL / TECLADO ---------------- */
let termTyping = false, keypadDoor = null, keyCode = "";
function closeModal() {
  termTyping = false;
  $("#terminal").classList.remove("show"); $("#keypad").classList.remove("show");
  state = "playing"; Game.clearInput();
}
function renderKeypad() {
  [...$("#keySlots").children].forEach((s, i) => s.textContent = keyCode[i] || "");
}
function keypadInput(e) {
  if (/^[0-9]$/.test(e.key) && keyCode.length < 4) { keyCode += e.key; Sound.sfx.key(); renderKeypad(); }
  else if (e.code === "Backspace") { keyCode = keyCode.slice(0, -1); Sound.sfx.key(); renderKeypad(); }
  else if (e.code === "Enter" || e.code === "NumpadEnter") {
    const msg = $("#keyMsg");
    const joke = STORY.secretCodes[keyCode];
    if (joke && keyCode !== LEVELS[cur].code) {        // EASTER EGG: senhas engraçadas
      msg.className = "err"; msg.textContent = "ACESSO NEGADO";
      Sound.sfx.denied();
      clearDialog(); say([["ÍRIS", joke]]);
      Main.onSecret("code");
      keyCode = ""; setTimeout(renderKeypad, 300);
    } else if (keyCode === LEVELS[cur].code) {
      msg.className = "ok"; msg.textContent = "ACESSO LIBERADO";
      Sound.sfx.granted();
      const d = keypadDoor;
      setTimeout(() => { if (state === "keypad") closeModal(); Game.openDoor(d); say(STORY.sectors[cur].dialogues.codeRight); }, 700);
    } else {
      msg.className = "err"; msg.textContent = "ACESSO NEGADO";
      Sound.sfx.denied();
      const box = $(".keyBox"); box.classList.remove("shake"); void box.offsetWidth; box.classList.add("shake");
      const lines = STORY.sectors[cur].codeWrong || ["Errado."];
      clearDialog(); say([["ÍRIS", lines[Math.floor(Math.random() * lines.length)]]]);
      keyCode = ""; setTimeout(renderKeypad, 300);
    }
  }
  else if (e.code === "KeyE") closeModal();
}

/* ============================================================
   FLUXO
   ============================================================ */
function showMenu() {
  state = "menu";
  exitLock(); clearDialog(); hud(false); UI.bossBar(false);
  show("menu");
  $("#btnChapters").disabled = progress.unlocked < 1;
  $("#endingsSeen").textContent = (progress.endings.length || progress.secrets.length)
    ? `FINAIS DESCOBERTOS ${progress.endings.length}/3 · SEGREDOS ${progress.secrets.length}/${SECRET_TOTAL}` : "";
  // EASTER EGG: quem viu os 3 finais ganha um menu diferente
  const seenAll = progress.endings.length >= 3;
  $("#menu").classList.toggle("allseen", seenAll);
  $("#menu .subtitle").textContent = seenAll ? "ÍRIS VÊ VOCÊ" : "A MEMÓRIA NÃO É SUA";
  Sound.playMusic("menu");
}

/* ---- intro ---- */
let introSkip = false, introAdvance = false;
async function runIntro() {
  state = "intro"; show("intro"); hud(false);
  Sound.playMusic("menu");
  const box = $("#introText"); box.innerHTML = "";
  introSkip = introAdvance = false;
  for (const line of STORY.intro) {
    if (introSkip) break;
    [...box.children].forEach(c => c.classList.remove("cur"));
    const p = document.createElement("p"); p.className = "cur"; box.appendChild(p);
    if (box.children.length > 6) box.removeChild(box.firstChild);
    await typeInto(p, line, 28, () => introSkip || introAdvance, i => { if (i % 2 === 0) Sound.sfx.type(); });
    introAdvance = false;
    await wait(1100, () => introSkip || introAdvance);
    introAdvance = false;
  }
}

function newGame() {
  Game.resetStats(); playedStart = new Set();
  runIntro().then(() => { if (state === "intro") startSector(0); });
}

/* ---- setor ---- */
function startSector(i, retry) {
  cur = i;
  state = "card";
  clearDialog(); UI.bossBar(false); UI.prompt(null);
  Game.loadSector(i);
  const S = STORY.sectors[i];
  $("#sectorLabel").textContent = `${S.code} · ${S.name}`;
  const total = LEVELS[i].fragCount;
  setObjective(total ? `${S.objective} (0/${total})` : S.objective);
  updateFragHud();
  $("#cardCode").textContent = S.code;
  $("#cardName").textContent = S.name;
  $("#cardText").textContent = retry ? "Reconectando ao setor... ÍRIS lembra de você." : S.card;
  $("#cardObj").textContent = "OBJETIVO · " + S.objective.toUpperCase();
  hud(false);
  show("card");
}

function enterPlay() {
  hideScreens(); hud(true);
  state = "playing"; Game.clearInput();
  requestLock();
  if (!playedStart.has(cur)) { playedStart.add(cur); setTimeout(() => say(STORY.sectors[cur].dialogues.start), 600); }
  if (settings.hand && HandControl.st.running && !handHintShown) {
    handHintShown = true;
    setTimeout(() => say([
      ["SISTEMA", "MODO GESTOS · mova a palma da mão para mirar"],
      ["SISTEMA", "Encoste polegar e indicador para atirar · leve a mira à borda para girar"]
    ]), 700);
  } else if (settings.hand && !HandControl.st.running) {
    setTimeout(() => UI.toast("GESTOS INDISPONÍVEIS — USANDO MOUSE"), 800);
  }
}

function pause() {
  if (state !== "playing") return;
  state = "paused";
  const w = Game.world;
  $("#pauseInfo").innerHTML =
    `${STORY.sectors[cur].code} · ${STORY.sectors[cur].name}<br>` +
    (w.fragTotal ? `Fragmentos ${w.fragCollected}/${w.fragTotal} · ` : "") +
    `Registros lidos ${Game.stats.logs.size}/${TOTAL_LOGS} · Tempo ${fmtTime(Game.stats.time)}`;
  $("#lockNote").textContent = "";
  show("pause");
}
function resume() {
  hideScreens(); state = "playing"; Game.clearInput(); requestLock();
}

/* ---- escolha e finais ---- */
async function showChoice() {
  state = "choice";
  exitLock(); clearDialog(); hud(false);
  Sound.playMusic("endingDark");
  show("choice");
  const box = $("#choiceIntro"), list = $("#choiceList");
  box.innerHTML = ""; list.innerHTML = ""; list.classList.remove("show");
  for (const line of STORY.choiceIntro) {
    const p = document.createElement("p"); box.appendChild(p);
    await typeInto(p, line, 35, null, i => { if (i % 2 === 0) Sound.sfx.voice(); });
    await wait(700);
  }
  const C = STORY.choices, logs = Game.stats.logs.size;
  const mk = (kind, cls, locked) => {
    const b = document.createElement("button");
    b.className = "choiceBtn " + cls;
    b.innerHTML = `<span class="t">${C[kind].label}</span><span class="d">${locked
      ? `Registros insuficientes (${logs}/${TOTAL_LOGS}). Leia todos os terminais para descobrir a frase.`
      : C[kind].desc}</span>`;
    b.disabled = !!locked;
    b.onclick = () => { Sound.sfx.uiClick(); showEnding(kind); };
    list.appendChild(b);
  };
  mk("accept", "red");
  mk("wake", "");
  mk("free", "gold", logs < TOTAL_LOGS);
  list.classList.add("show");
}

async function showEnding(kind) {
  state = "ending";
  const E = STORY.endings[kind];
  if (!progress.endings.includes(kind)) { progress.endings.push(kind); saveProgress(); }
  if (progress.endings.length >= 3) Main.onSecret("endings", true);
  Sound.playMusic(kind === "free" ? "endingLight" : "endingDark");
  show("ending");
  $("#endTitle").textContent = E.title;
  const box = $("#endText"); box.innerHTML = "";
  ["#endTag", "#endStats", "#endButtons"].forEach(s => $(s).classList.remove("show"));
  for (const line of E.lines) {
    const p = document.createElement("p"); box.appendChild(p);
    await typeInto(p, line, 30, null, i => { if (i % 3 === 0) Sound.sfx.type(); });
    await wait(900);
  }
  const tag = $("#endTag");
  tag.textContent = E.tagline;
  tag.style.color = kind === "free" ? "var(--cyan)" : "var(--red)";
  tag.classList.add("show");
  Sound.sfx.memory();
  const st = Game.stats;
  const acc = st.shots ? Math.min(100, Math.round(st.hits / st.shots * 100)) : 0;
  $("#endStats").innerHTML =
    `TEMPO ${fmtTime(st.time)} · PRECISÃO ${acc}% · ABATES ${st.kills} · DESCONEXÕES ${st.deaths}<br>` +
    `REGISTROS ${st.logs.size}/${TOTAL_LOGS} · FINAIS DESCOBERTOS ${progress.endings.length}/3 · SEGREDOS ${progress.secrets.length}/${SECRET_TOTAL}<br><br>` +
    `PROJETO ÍRIS · ${CREDITS.grupo.map(escapeHtml).join(" · ")} · ${CREDITS.ano}`;
  await wait(1200);
  $("#endStats").classList.add("show");
  $("#endButtons").classList.add("show");
}

/* ---- painéis ---- */
function openPanel(kind, from) {
  panelReturn = from; state = "panel";
  const title = $("#panelTitle"), body = $("#panelBody");
  if (kind === "controls") {
    title.textContent = "CONTROLES";
    body.innerHTML = [
      ["W A S D", "mover"], ["MOUSE", "mirar"], ["CLIQUE ESQUERDO", "disparar (segure)"],
      ["SHIFT", "correr"], ["ESPAÇO", "esquiva rápida (atravessa projéteis)"],
      ["E", "interagir (terminais, painéis)"], ["M", "silenciar som"], ["ESC", "pausar"]
    ].map(([k, v]) => `<div><span class="k">${k}</span>${v}</div>`).join("") +
      `<br><div class="muted">A arma superaquece se você atirar sem parar — observe a barra no canto inferior direito.<br>` +
      `A integridade se regenera lentamente até 40 quando você fica fora de combate.</div>` +
      `<br><div><span class="k">MODO GESTOS</span>(ative em OPÇÕES · precisa de câmera e internet)</div>` +
      [["PALMA DA MÃO", "mirar"], ["PINÇA", "encostar polegar e indicador = atirar"],
       ["MIRA NA BORDA", "girar a visão"], ["WASD", "andar com a outra mão"]]
        .map(([k, v]) => `<div><span class="k">${k}</span>${v}</div>`).join("");
  } else if (kind === "options") {
    title.textContent = "OPÇÕES";
    body.innerHTML = `
      <div class="row"><label>VOLUME DA MÚSICA</label><input type="range" id="optMusic" min="0" max="1" step="0.05" value="${settings.music}"></div>
      <div class="row"><label>VOLUME DOS EFEITOS</label><input type="range" id="optSfx" min="0" max="1" step="0.05" value="${settings.sfx}"></div>
      <div class="row"><label>SENSIBILIDADE DO MOUSE</label><input type="range" id="optSens" min="0.3" max="2.5" step="0.05" value="${settings.sens}"></div>
      <div class="row"><label>CONTROLE POR GESTOS</label><button class="toggle" id="optHand">${settings.hand ? "LIGADO" : "DESLIGADO"}</button></div>
      <div class="row"><label>VELOCIDADE DE GIRO (GESTOS)</label><input type="range" id="optTurn" min="0.4" max="2" step="0.05" value="${settings.turn}"></div>
      <div class="handPanel">
        <canvas id="handPreview" width="240" height="180"></canvas>
        <div class="handInfo">
          <div id="handStatus">—</div><br>
          • Fique a uns 50 cm da câmera, com a palma virada para ela.<br>
          • Mova a mão dentro do retângulo tracejado para mirar.<br>
          • Encoste polegar e indicador para atirar (segure = rajada).<br>
          • Leve a mira até a borda da tela para girar.<br>
          • Use WASD com a outra mão para andar.
        </div>
      </div>`;
    HandControl.addPreview($("#handPreview"));
    updateHandStatus();
    $("#optTurn").oninput = e => { settings.turn = +e.target.value; applySettings(); saveSettings(); };
    $("#optHand").onclick = async e => {
      e.stopPropagation(); Sound.sfx.uiClick();
      settings.hand = !settings.hand; saveSettings();
      $("#optHand").textContent = settings.hand ? "LIGADO" : "DESLIGADO";
      if (settings.hand) {
        const ok = await HandControl.start();
        if (!ok) { settings.hand = false; saveSettings(); if ($("#optHand")) $("#optHand").textContent = "DESLIGADO"; }
      } else HandControl.stop();
      updateHandStatus();
    };
    $("#optMusic").oninput = e => { settings.music = +e.target.value; applySettings(); saveSettings(); };
    $("#optSfx").oninput = e => { settings.sfx = +e.target.value; applySettings(); saveSettings(); Sound.sfx.hit(); };
    $("#optSens").oninput = e => { settings.sens = +e.target.value; applySettings(); saveSettings(); };
  } else if (kind === "credits") {
    title.textContent = "CRÉDITOS";
    body.innerHTML = `
      <div><span class="k">JOGO</span>PROJETO ÍRIS</div>
      <div><span class="k">DESENVOLVIMENTO</span>${escapeHtml(CREDITS.autor)}</div>
      <div><span class="k">GRUPO</span>${CREDITS.grupo.map(escapeHtml).join(" · ")}</div>
      <div><span class="k">CONTEXTO</span>${escapeHtml(CREDITS.disciplina)} · ${CREDITS.ano}</div>
      <br>
      <div><span class="k">TECNOLOGIAS</span>HTML5 · CSS · JavaScript · Three.js (WebGL)</div>
      <div><span class="k">ÁUDIO</span>música e efeitos gerados por código (Web Audio API)</div>
      <div><span class="k">FONTES</span>Chakra Petch · JetBrains Mono</div>`;
  } else if (kind === "chapters") {
    title.textContent = "CAPÍTULOS";
    body.innerHTML = STORY.sectors.map((S, i) =>
      `<button class="chap" data-chap="${i}" ${i > progress.unlocked ? "disabled" : ""}>${S.code} · ${S.name}</button>`).join("") +
      `<div class="muted">Para o final verdadeiro, jogue desde o início e leia todos os registros.</div>`;
    body.querySelectorAll("[data-chap]").forEach(b => b.onclick = () => {
      Sound.sfx.uiClick(); Game.resetStats(); playedStart = new Set(); startSector(+b.dataset.chap);
    });
  }
  show("panel");
}
$("#panelBack").onclick = () => {
  Sound.sfx.uiClick();
  if (panelReturn === "pause") { state = "paused"; show("pause"); } else showMenu();
};

/* ============================================================
   ENTRADA (botões, teclado, pointer lock)
   ============================================================ */
$("#splash").addEventListener("click", () => {
  Sound.init(); applySettings(); Sound.sfx.uiClick();
  if (settings.hand) HandControl.start();
  showMenu();
});

document.addEventListener("click", e => {
  const b = e.target.closest("button[data-act]");
  if (!b) return;
  Sound.sfx.uiClick();
  const act = b.dataset.act;
  const inPause = state === "paused";
  switch (act) {
    case "new": newGame(); break;
    case "chapters": openPanel("chapters", "menu"); break;
    case "controls": openPanel("controls", inPause ? "pause" : "menu"); break;
    case "options": openPanel("options", inPause ? "pause" : "menu"); break;
    case "credits": openPanel("credits", "menu"); break;
    case "resume": resume(); break;
    case "restart": startSector(cur, true); break;
    case "retry": startSector(cur, true); break;
    case "quit": showMenu(); break;
  }
});
let lastHover = null;
document.addEventListener("mouseover", e => {
  const b = e.target.closest("button");
  if (b && b !== lastHover && !b.disabled) Sound.sfx.uiHover();
  lastHover = b;
});

$("#intro").addEventListener("click", () => { introAdvance = true; });
$("#card").addEventListener("click", () => { if (state === "card") { Sound.sfx.uiClick(); enterPlay(); } });
$("#terminal").addEventListener("click", () => { if (state === "terminal") closeModal(); });

/* ---- EASTER EGG: código Konami (↑ ↑ ↓ ↓ ← → ← → B A) liga o modo retrô ---- */
const KONAMI = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "KeyB", "KeyA"];
let konamiPos = 0;
window.addEventListener("keydown", e => {
  if (e.repeat) return;
  konamiPos = e.code === KONAMI[konamiPos] ? konamiPos + 1 : (e.code === KONAMI[0] ? 1 : 0);
  if (konamiPos === KONAMI.length) {
    konamiPos = 0;
    Game.setRetro(!Game.retro);
    if (Game.retro) Main.onSecret("konami"); else UI.toast("MODO RETRÔ DESLIGADO");
  }
});

window.addEventListener("keydown", e => {
  if (e.code === "KeyM" && state !== "keypad") {
    const m = Sound.toggleMute(); if (state === "playing") UI.toast(m ? "SOM DESLIGADO" : "SOM LIGADO");
  }
  if (e.repeat) return;
  switch (state) {
    case "splash": if (e.code === "Enter" || e.code === "Space") $("#splash").click(); break;
    case "intro": if (["Space", "Enter", "Escape"].includes(e.code)) introSkip = true; break;
    case "card": if (e.code === "Enter" || e.code === "Space") enterPlay(); break;
    case "terminal":
      if (e.code === "KeyE" || e.code === "Enter" || e.code === "Space") {
        if (termTyping) termTyping = false; else closeModal();
      }
      break;
    case "keypad": keypadInput(e); break;
    case "playing": if (e.code === "Escape" || e.code === "KeyP") { exitLock(); pause(); } break;
  }
});

document.addEventListener("pointerlockchange", () => {
  if (document.pointerLockElement === canvas) return;
  if (state === "playing") pause();
  else if (state === "terminal" || state === "keypad") { closeModal(); pause(); }
});
document.addEventListener("pointerlockerror", () => {
  if (state === "playing") { pause(); $("#lockNote").textContent = "Não foi possível capturar o mouse. Clique em CONTINUAR novamente."; }
});
window.addEventListener("blur", () => { if (state === "playing") { exitLock(); pause(); } });
canvas.addEventListener("click", () => { if (state === "playing" && !document.pointerLockElement) requestLock(); });

/* ============================================================
   LOOP PRINCIPAL
   ============================================================ */
const mm = $("#minimap").getContext("2d");
let last = performance.now(), mmT = 0;
const hudCache = {};
function setIfChanged(key, fn, val) { if (hudCache[key] !== val) { hudCache[key] = val; fn(val); } }

function updateHud(dt) {
  const p = Game.player;
  const hp = Math.ceil(p.hp);
  setIfChanged("hp", v => {
    $("#hpFill").style.width = v + "%"; $("#hpText").textContent = v;
    $("#hpText").classList.toggle("low", v <= 30);
    $("#hurtVignette").classList.toggle("low", v <= 30);
  }, hp);
  setIfChanged("heat", v => $("#heatFill").style.width = v + "%", Math.round(p.heat));
  setIfChanged("over", v => {
    document.querySelector(".bar.heat").classList.toggle("over", v);
    $("#crosshair").classList.toggle("hot", v);
  }, p.overheated);
  setIfChanged("dash", v => {
    $("#dashLbl").textContent = v ? "ESQUIVA PRONTA [ESPAÇO]" : "ESQUIVA RECARREGANDO";
    $("#dashLbl").classList.toggle("ready", v);
  }, p.dashCd <= 0);
  mmT -= dt;
  if (mmT <= 0) { mmT = 0.1; Game.drawMinimap(mm, 170); }

  // mira por gestos
  const a = Game.aim;
  setIfChanged("handmode", v => $("#hud").classList.toggle("handmode", v), a.hand);
  const cx = a.hand ? (a.x * 100).toFixed(2) + "%" : "50%", cy = a.hand ? (a.y * 100).toFixed(2) + "%" : "50%";
  setIfChanged("cx", v => { $("#crosshair").style.left = v; $("#hitmarker").style.left = v; }, cx);
  setIfChanged("cy", v => { $("#crosshair").style.top = v; $("#hitmarker").style.top = v; }, cy);
  if (a.hand) {
    setIfChanged("pinch", v => $("#crosshair").classList.toggle("pinch", v), a.fire && a.tracking);
    setIfChanged("track", v => {
      $("#crosshair").classList.toggle("lost", !v);
      const l = $("#handLbl"); l.className = v ? "ok" : "lost";
      l.textContent = v ? "MÃO DETECTADA" : "MÃO PERDIDA — MOSTRE A PALMA";
    }, a.tracking);
  }
  $("#edgeL").style.opacity = Math.max(0, -a.edgeX).toFixed(2);
  $("#edgeR").style.opacity = Math.max(0, a.edgeX).toFixed(2);
  $("#edgeU").style.opacity = Math.max(0, -a.edgeY).toFixed(2);
  $("#edgeD").style.opacity = Math.max(0, a.edgeY).toFixed(2);
}

function syncAim() {
  const h = HandControl.st, a = Game.aim;
  a.hand = settings.hand && h.running;
  a.tracking = a.hand && h.active;
  if (a.tracking) { a.x = h.x; a.y = h.y; }
  a.fire = h.pinch;
}

function updateHandStatus() {
  const el = $("#handStatus"); if (!el) return;
  const h = HandControl.st;
  let t = "DESLIGADO", c = "";
  if (h.loading) t = "CARREGANDO RECONHECIMENTO DE MÃO...";
  else if (h.error) { t = h.error; c = "err"; }
  else if (h.running) { t = h.active ? `MÃO DETECTADA · ${h.fps} FPS${h.pinch ? " · PINÇA" : ""}` : "ATIVO · MOSTRE A MÃO PARA A CÂMERA"; c = "ok"; }
  el.textContent = t; el.className = c;
}
setInterval(updateHandStatus, 200);
HandControl.onChange(updateHandStatus);
HandControl.addPreview($("#handCam"));

const RENDER_STATES = new Set(["playing", "paused", "terminal", "keypad", "dead", "transition"]);
function loop(now) {
  requestAnimationFrame(loop);
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  syncAim();
  if (state === "playing") Game.update(dt);
  if (Game.world && RENDER_STATES.has(state)) {
    Game.render();
    updateHud(dt);
  }
}
requestAnimationFrame(loop);
