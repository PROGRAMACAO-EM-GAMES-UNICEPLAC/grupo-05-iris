/* ============================================================
   PROJETO ÍRIS — ÁUDIO
   Música e efeitos sonoros 100% gerados por código (Web Audio API).
   Nenhum arquivo de áudio externo é necessário.
   ============================================================ */

const Sound = (() => {
  let ctx = null, master, comp, musicBus, sfxBus, sfxWet, revIn, noiseBuf;
  let padG, arpG, bassG, drumG;
  const vol = { music: 0.55, sfx: 0.8, muted: false };

  let song = null, transpose = 0, step = 0, nextTime = 0;
  let intensity = 0, intensityTarget = 0;

  const mtof = m => 440 * Math.pow(2, (m - 69) / 12);

  /* ---------------- SETUP ---------------- */
  function g(v, dest) { const n = ctx.createGain(); n.gain.value = v; if (dest) n.connect(dest); return n; }

  function impulse(seconds, decay) {
    const len = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
    return buf;
  }

  function init() {
    if (ctx) { if (ctx.state === "suspended") ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();

    master = g(vol.muted ? 0 : 1, ctx.destination);
    comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16; comp.knee.value = 10; comp.ratio.value = 4;
    comp.attack.value = 0.005; comp.release.value = 0.2;
    comp.connect(master);

    const conv = ctx.createConvolver();
    conv.buffer = impulse(3.2, 2.6);
    conv.connect(g(0.5, comp));
    revIn = g(1, conv);

    musicBus = g(vol.music, comp);
    const musicSend = g(0.55, revIn); musicBus.connect(musicSend);
    sfxBus = g(vol.sfx, comp);
    sfxWet = g(vol.sfx, revIn);

    padG = g(0.55, musicBus);
    arpG = g(0.32, musicBus);
    bassG = g(0.5, musicBus);
    drumG = g(0, musicBus);

    // eco no arpejo
    const dly = ctx.createDelay(1.5); dly.delayTime.value = 0.36;
    const fb = g(0.38); arpG.connect(dly); dly.connect(fb); fb.connect(dly);
    dly.connect(g(0.45, musicBus));

    const nlen = ctx.sampleRate * 2;
    noiseBuf = ctx.createBuffer(1, nlen, ctx.sampleRate);
    const nd = noiseBuf.getChannelData(0);
    for (let i = 0; i < nlen; i++) nd[i] = Math.random() * 2 - 1;

    setInterval(scheduler, 25);
  }

  /* ---------------- INSTRUMENTOS ---------------- */
  function pad(notes, t, dur) {
    const f = ctx.createBiquadFilter(); f.type = "lowpass"; f.Q.value = 1.5;
    f.frequency.setValueAtTime(350, t);
    f.frequency.linearRampToValueAtTime(1300, t + dur * 0.5);
    f.frequency.linearRampToValueAtTime(450, t + dur);
    const env = ctx.createGain();
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(0.06, t + Math.min(1.4, dur * 0.3));
    env.gain.setValueAtTime(0.06, t + dur * 0.8);
    env.gain.linearRampToValueAtTime(0, t + dur + 0.9);
    f.connect(env); env.connect(padG);
    notes.forEach(n => {
      [-8, 8].forEach(det => {
        const o = ctx.createOscillator(); o.type = "sawtooth";
        o.frequency.value = mtof(n); o.detune.value = det;
        o.connect(f); o.start(t); o.stop(t + dur + 1);
      });
    });
  }

  function arp(n, t, v = 0.12, len = 0.5, type = "triangle") {
    const o = ctx.createOscillator(); o.type = type; o.frequency.value = mtof(n);
    const e = ctx.createGain();
    e.gain.setValueAtTime(0.0001, t);
    e.gain.exponentialRampToValueAtTime(v, t + 0.006);
    e.gain.exponentialRampToValueAtTime(0.0001, t + len);
    o.connect(e); e.connect(arpG); o.start(t); o.stop(t + len + 0.05);
  }

  function bass(n, t, dur, v = 0.35) {
    const o = ctx.createOscillator(); o.type = "sawtooth"; o.frequency.value = mtof(n);
    const f = ctx.createBiquadFilter(); f.type = "lowpass"; f.Q.value = 5;
    f.frequency.setValueAtTime(900, t); f.frequency.exponentialRampToValueAtTime(180, t + Math.min(dur, 0.4));
    const e = ctx.createGain();
    e.gain.setValueAtTime(0.0001, t);
    e.gain.exponentialRampToValueAtTime(v, t + 0.01);
    e.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(f); f.connect(e); e.connect(bassG); o.start(t); o.stop(t + dur + 0.05);
  }

  function kick(t, v = 0.9) {
    const o = ctx.createOscillator(); o.type = "sine";
    o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.12);
    const e = ctx.createGain();
    e.gain.setValueAtTime(v, t); e.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
    o.connect(e); e.connect(drumG); o.start(t); o.stop(t + 0.4);
  }

  function noiseHit(t, type, freq, dur, v, dest, q = 1) {
    const s = ctx.createBufferSource(); s.buffer = noiseBuf;
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    const e = ctx.createGain();
    e.gain.setValueAtTime(v, t); e.gain.exponentialRampToValueAtTime(0.001, t + dur);
    s.connect(f); f.connect(e); e.connect(dest);
    s.start(t, Math.random() * 1.5); s.stop(t + dur + 0.02);
  }
  const hat = (t, v = 0.12) => noiseHit(t, "highpass", 7500, 0.05, v, drumG);
  const snare = (t, v = 0.35) => {
    noiseHit(t, "bandpass", 1600, 0.18, v, drumG, 0.8);
    const o = ctx.createOscillator(); o.type = "triangle"; o.frequency.value = 190;
    const e = ctx.createGain(); e.gain.setValueAtTime(0.25, t); e.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
    o.connect(e); e.connect(drumG); o.start(t); o.stop(t + 0.12);
  };

  /* ---------------- MÚSICAS ---------------- */
  // progressões em notas MIDI (50 = Ré3)
  const SONGS = {
    menu: {
      bpm: 64, bars: 2, prog: [[50, 53, 57], [46, 50, 53], [43, 46, 50], [45, 49, 52]],
      pattern(i, s, ch, t) {
        if (i === 0 && s % 32 === 0) bass(ch[0] - 12, t, 3.5, 0.22);
        if (i === 0 || i === 6 || i === 10) arp(ch[(s >> 2) % 3] + 24, t, 0.07, 1.2, "sine");
      }
    },
    explore: {
      bpm: 92, bars: 2, prog: [[50, 53, 57], [53, 57, 60], [48, 52, 55], [46, 50, 53]],
      pattern(i, s, ch, t, sd) {
        if (i === 0 || i === 8) bass(ch[0] - 12, t, sd * 6, 0.3);
        if (intensity > 0.3 && (i === 3 || i === 11 || i === 14)) bass(ch[0] - 12, t, sd * 2, 0.22);
        if (i % 4 === 2) arp(ch[(s >> 2) % 3] + 12, t, 0.06, 0.4);
        if (intensity > 0.05) {
          if (i === 0 || i === 8 || (intensity > 0.6 && i === 10)) kick(t);
          if (i % 4 === 2) hat(t);
          if (intensity > 0.5 && (i === 4 || i === 12)) snare(t);
        }
      }
    },
    archive: {
      bpm: 98, bars: 2, prog: [[45, 48, 52], [41, 45, 48], [43, 47, 50], [40, 44, 47]],
      pattern(i, s, ch, t, sd) {
        if (i % 4 === 0) bass(ch[0] - 12, t, sd * 3, 0.26);
        if (i % 2 === 0 && (i % 6 !== 4)) arp(ch[(s >> 1) % 3] + 24, t, 0.045, 0.25, "square");
        if (intensity > 0.05) {
          if (i === 0 || i === 6 || i === 8) kick(t);
          if (i % 2 === 1) hat(t, 0.08);
          if (intensity > 0.5 && (i === 4 || i === 12)) snare(t);
        }
      }
    },
    core: {
      bpm: 76, bars: 2, prog: [[50, 53, 56], [49, 52, 56], [47, 50, 53], [46, 49, 53]],
      pattern(i, s, ch, t, sd) {
        if (i === 0) bass(ch[0] - 12, t, sd * 14, 0.3);
        if (i === 0 || i === 7 || i === 10) arp(ch[(s >> 2) % 3] + 24, t, 0.06, 1.0, "sine");
        if (intensity > 0.05 && (i === 0 || i === 8)) kick(t, 0.7);
      }
    },
    boss: {
      bpm: 134, bars: 1, drums: true, prog: [[50, 53, 57], [46, 50, 53], [48, 52, 55], [45, 49, 52]],
      pattern(i, s, ch, t, sd) {
        bass(ch[0] - 12 + (i % 4 === 2 ? 12 : 0), t, sd * 0.9, 0.3);
        const up = [0, 1, 2, 1];
        arp(ch[up[i % 4]] + 24 + (i >= 8 ? 12 : 0), t, 0.05, 0.18, "square");
        if (i % 4 === 0) kick(t);
        if (i % 4 === 2) hat(t, 0.14);
        if (i === 4 || i === 12) snare(t, 0.4);
        if (i === 15 && s % 64 === 63) snare(t, 0.3);
      }
    },
    endingDark: {
      bpm: 56, bars: 2, prog: [[50, 53, 57], [43, 46, 50], [45, 49, 52], [50, 53, 57]],
      pattern(i, s, ch, t) {
        if (i === 0 && s % 32 === 0) bass(ch[0] - 12, t, 4, 0.2);
        if (i === 0 || i === 8) arp(ch[(s >> 3) % 3] + 24, t, 0.05, 1.6, "sine");
      }
    },
    endingLight: {
      bpm: 60, bars: 2, prog: [[53, 57, 60], [48, 52, 55], [50, 53, 57], [46, 50, 53]],
      pattern(i, s, ch, t) {
        if (i === 0 && s % 32 === 0) bass(ch[0] - 12, t, 4, 0.2);
        if (i % 4 === 0) arp(ch[(s >> 2) % 3] + 24, t, 0.06, 1.4, "sine");
      }
    }
  };

  function playStep(s, t) {
    const sd = 60 / song.bpm / 4;
    const per = song.bars * 16;
    const ci = Math.floor(s / per) % song.prog.length;
    const ch = song.prog[ci].map(n => n + transpose);
    if (s % per === 0) pad(ch, t, per * sd);
    song.pattern(s % 16, s, ch, t, sd);
  }

  function scheduler() {
    if (!ctx || !song) return;
    intensity += (intensityTarget - intensity) * 0.06;
    const now = ctx.currentTime;
    drumG.gain.setTargetAtTime(song.drums ? 0.9 : intensity * 0.85, now, 0.25);
    if (nextTime < now) nextTime = now + 0.05;
    while (nextTime < now + 0.15) {
      playStep(step, nextTime);
      nextTime += 60 / song.bpm / 4;
      step++;
    }
  }

  function playMusic(name, tr = 0) {
    if (!ctx) return;
    if (song === SONGS[name] && transpose === tr) return;
    song = SONGS[name] || null; transpose = tr; step = 0;
    nextTime = ctx.currentTime + 0.1;
  }
  function stopMusic() { song = null; }
  function setIntensity(v) { intensityTarget = v; }

  /* ---------------- EFEITOS ---------------- */
  function tone(o) {
    if (!ctx) return;
    const t = ctx.currentTime + (o.delay || 0);
    const osc = ctx.createOscillator(); osc.type = o.type || "sine";
    osc.frequency.setValueAtTime(o.f0, t);
    if (o.f1) osc.frequency.exponentialRampToValueAtTime(o.f1, t + o.dur);
    const e = ctx.createGain();
    e.gain.setValueAtTime(0.0001, t);
    e.gain.exponentialRampToValueAtTime(Math.max(0.0002, o.vol || 0.2), t + (o.attack || 0.005));
    e.gain.exponentialRampToValueAtTime(0.0001, t + o.dur);
    let node = osc;
    if (o.lp) { const f = ctx.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = o.lp; osc.connect(f); node = f; }
    node.connect(e); e.connect(sfxBus);
    if (o.wet) { const w = g(o.wet); e.connect(w); w.connect(sfxWet); }
    osc.start(t); osc.stop(t + o.dur + 0.05);
  }

  function noise(o) {
    if (!ctx) return;
    const t = ctx.currentTime + (o.delay || 0);
    const s = ctx.createBufferSource(); s.buffer = noiseBuf;
    const f = ctx.createBiquadFilter(); f.type = o.ft || "lowpass"; f.Q.value = o.q || 1;
    f.frequency.setValueAtTime(o.f0, t);
    if (o.f1) f.frequency.exponentialRampToValueAtTime(o.f1, t + o.dur);
    const e = ctx.createGain();
    e.gain.setValueAtTime(Math.max(0.0002, o.vol || 0.2), t);
    e.gain.exponentialRampToValueAtTime(0.0001, t + o.dur);
    s.connect(f); f.connect(e); e.connect(sfxBus);
    if (o.wet) { const w = g(o.wet); e.connect(w); w.connect(sfxWet); }
    s.start(t, Math.random() * 1.2); s.stop(t + o.dur + 0.05);
  }

  const sfx = {
    shoot() {
      tone({ type: "square", f0: 900, f1: 170, dur: 0.11, vol: 0.09, lp: 3200 });
      tone({ type: "sine", f0: 240, f1: 60, dur: 0.12, vol: 0.22 });
      noise({ ft: "highpass", f0: 3500, dur: 0.05, vol: 0.1 });
    },
    hit() { tone({ type: "square", f0: 1600, dur: 0.045, vol: 0.07, lp: 5000 }); },
    kill() { tone({ type: "square", f0: 1300, dur: 0.05, vol: 0.06 }); tone({ type: "square", f0: 1900, dur: 0.07, vol: 0.06, delay: 0.05 }); },
    enemyDie(v = 1) {
      noise({ ft: "lowpass", f0: 2400, f1: 80, dur: 0.6, vol: 0.4 * v });
      tone({ type: "sawtooth", f0: 420, f1: 40, dur: 0.5, vol: 0.12 * v, lp: 2000 });
    },
    enemyShoot(v = 1) { tone({ type: "sawtooth", f0: 720, f1: 190, dur: 0.2, vol: 0.06 * v, lp: 2600 }); },
    alert(v = 1) {
      tone({ type: "square", f0: 1150, dur: 0.06, vol: 0.04 * v });
      tone({ type: "square", f0: 860, dur: 0.09, vol: 0.04 * v, delay: 0.08 });
    },
    hurt() {
      tone({ f0: 170, f1: 50, dur: 0.3, vol: 0.4 });
      noise({ ft: "lowpass", f0: 900, dur: 0.16, vol: 0.22 });
    },
    pickup() {
      [0, 4, 7, 12].forEach((s, i) => tone({ type: "triangle", f0: mtof(74 + s), dur: 0.5, vol: 0.1, delay: i * 0.07, wet: 0.6 }));
    },
    memory() {
      [62, 69, 74, 78].forEach((n, i) => tone({ type: "sine", f0: mtof(n), dur: 2.4, vol: 0.05, attack: 0.3, delay: 0.3 + i * 0.12, wet: 0.9 }));
    },
    heal() { tone({ f0: 440, f1: 880, dur: 0.35, vol: 0.13, wet: 0.3 }); },
    terminal() {
      tone({ type: "square", f0: 880, dur: 0.06, vol: 0.05 });
      tone({ type: "square", f0: 1320, dur: 0.08, vol: 0.05, delay: 0.08 });
    },
    type() { tone({ type: "square", f0: 1800 + Math.random() * 600, dur: 0.012, vol: 0.014 }); },
    voice() { tone({ type: "sine", f0: 480 + Math.random() * 520, dur: 0.05, vol: 0.03, wet: 0.3 }); },
    sys() { tone({ type: "square", f0: 300 + Math.random() * 80, dur: 0.03, vol: 0.02 }); },
    door() {
      noise({ ft: "bandpass", f0: 200, f1: 1200, dur: 1.1, vol: 0.22, q: 2 });
      tone({ type: "sawtooth", f0: 55, f1: 85, dur: 1.1, vol: 0.08, lp: 300 });
    },
    denied() {
      tone({ type: "square", f0: 200, dur: 0.15, vol: 0.08 });
      tone({ type: "square", f0: 150, dur: 0.25, vol: 0.08, delay: 0.17 });
    },
    granted() { [0, 7, 12].forEach((s, i) => tone({ type: "square", f0: mtof(76 + s), dur: 0.12, vol: 0.05, delay: i * 0.09 })); },
    key() { tone({ type: "square", f0: 1000, dur: 0.03, vol: 0.04 }); },
    overheat() {
      tone({ type: "sawtooth", f0: 300, f1: 80, dur: 0.6, vol: 0.1, lp: 1200 });
      noise({ ft: "highpass", f0: 5000, dur: 0.5, vol: 0.07 });
    },
    dash() { noise({ ft: "bandpass", f0: 2500, f1: 400, dur: 0.22, vol: 0.22, q: 1 }); },
    step() { noise({ ft: "lowpass", f0: 280 + Math.random() * 160, dur: 0.06, vol: 0.05 }); },
    shield() { tone({ type: "triangle", f0: 320, f1: 250, dur: 0.12, vol: 0.08 }); },
    bossRoar() {
      tone({ type: "sawtooth", f0: 95, f1: 35, dur: 1.8, vol: 0.22, lp: 600 });
      noise({ ft: "lowpass", f0: 700, f1: 100, dur: 1.8, vol: 0.28, wet: 0.5 });
    },
    bigExplosion() {
      noise({ ft: "lowpass", f0: 3000, f1: 50, dur: 2.6, vol: 0.6, wet: 0.6 });
      tone({ f0: 120, f1: 28, dur: 2.2, vol: 0.45 });
    },
    complete() { [0, 4, 7, 11, 14].forEach((s, i) => tone({ type: "triangle", f0: mtof(62 + s), dur: 0.9, vol: 0.08, delay: i * 0.1, wet: 0.7 })); },
    uiHover() { tone({ f0: 1400, dur: 0.03, vol: 0.025 }); },
    uiClick() { tone({ type: "triangle", f0: 600, f1: 1100, dur: 0.08, vol: 0.07 }); }
  };

  /* ---------------- VOLUME ---------------- */
  function setMusicVolume(v) { vol.music = v; if (ctx) musicBus.gain.value = v; }
  function setSfxVolume(v) { vol.sfx = v; if (ctx) { sfxBus.gain.value = v; sfxWet.gain.value = v; } }
  function toggleMute() { vol.muted = !vol.muted; if (ctx) master.gain.value = vol.muted ? 0 : 1; return vol.muted; }

  return { init, playMusic, stopMusic, setIntensity, sfx, setMusicVolume, setSfxVolume, toggleMute, vol };
})();
