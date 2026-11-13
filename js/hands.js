/* ============================================================
   PROJETO ÍRIS — CONTROLE POR GESTOS (câmera + MediaPipe Hands)
   - A PALMA da mão controla a mira (estável mesmo ao fazer a pinça)
   - PINÇA (polegar + indicador) = atirar (segurar = rajada)
   - Mira na borda da tela = girar a câmera
   Requer internet (o modelo de reconhecimento vem da CDN).
   ============================================================ */

const HandControl = (() => {
  const CDN = "https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240/";
  const st = {
    running: false, loading: false, active: false, pinch: false,
    x: 0.5, y: 0.5, pinchAmount: 0, error: null, fps: 0
  };
  let hands = null, video = null, stream = null, busy = false, lastSeen = 0;
  let frames = 0, fpsT = performance.now();
  const previews = new Set();
  const listeners = new Set();

  // área da câmera usada para mirar (o centro da imagem vira a tela toda)
  const RANGE = { x0: 0.18, x1: 0.82, y0: 0.15, y1: 0.75 };
  // pinça: distância polegar–indicador dividida pelo tamanho da palma
  const PINCH_ON = 0.32, PINCH_OFF = 0.48;

  /* ---------- filtro "One Euro": tira tremedeira sem deixar a mira lenta ---------- */
  function OneEuro(minCutoff = 1.2, beta = 0.9, dCutoff = 1.0) {
    let xPrev = null, dxPrev = 0, tPrev = 0;
    const alpha = (cutoff, dt) => { const tau = 1 / (2 * Math.PI * cutoff); return 1 / (1 + tau / dt); };
    return (x, t) => {
      if (xPrev === null) { xPrev = x; tPrev = t; return x; }
      const dt = Math.max(1e-3, (t - tPrev) / 1000); tPrev = t;
      const dx = (x - xPrev) / dt;
      const aD = alpha(dCutoff, dt); dxPrev = aD * dx + (1 - aD) * dxPrev;
      const cutoff = minCutoff + beta * Math.abs(dxPrev);
      const a = alpha(cutoff, dt);
      xPrev = a * x + (1 - a) * xPrev;
      return xPrev;
    };
  }
  let fx = OneEuro(), fy = OneEuro();

  const clamp01 = v => Math.max(0, Math.min(1, v));
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

  function loadScript(src) {
    return new Promise((res, rej) => {
      if (document.querySelector(`script[src="${src}"]`)) return res();
      const s = document.createElement("script");
      s.src = src; s.crossOrigin = "anonymous";
      s.onload = res; s.onerror = () => rej(new Error("script"));
      document.head.appendChild(s);
    });
  }

  function emit() { listeners.forEach(fn => fn(st)); }

  async function start() {
    if (st.running || st.loading) return st.running;
    st.loading = true; st.error = null; emit();
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) throw new Error("nocam");
      try { await loadScript(CDN + "hands.js"); } catch (e) { throw new Error("offline"); }
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480, facingMode: "user" }, audio: false });
      } catch (e) { throw new Error(e.name === "NotAllowedError" ? "denied" : "nocam"); }
      video = document.createElement("video");
      video.playsInline = true; video.muted = true; video.srcObject = stream;
      await video.play();
      hands = new Hands({ locateFile: f => CDN + f });
      hands.setOptions({ maxNumHands: 1, modelComplexity: 0, minDetectionConfidence: 0.6, minTrackingConfidence: 0.5 });
      hands.onResults(onResults);
      await hands.initialize();
      st.running = true;
      fx = OneEuro(); fy = OneEuro();
      loop();
    } catch (e) {
      st.error = {
        offline: "Sem internet: o modo gestos precisa baixar o reconhecimento de mão.",
        denied: "Permissão da câmera negada. Libere a câmera no navegador (ícone ao lado do endereço).",
        nocam: "Nenhuma câmera encontrada."
      }[e.message] || "Falha ao iniciar o reconhecimento de mão.";
      stop();
    }
    st.loading = false; emit();
    return st.running;
  }

  function stop() {
    st.running = false; st.active = false; st.pinch = false;
    if (stream) stream.getTracks().forEach(t => t.stop());
    stream = null;
    if (hands) { try { hands.close(); } catch (e) { } hands = null; }
    emit();
  }

  async function loop() {
    if (!st.running) return;
    if (video && video.readyState >= 2 && !busy) {
      busy = true;
      try { await hands.send({ image: video }); } catch (e) { }
      busy = false;
    }
    if (st.active && performance.now() - lastSeen > 250) { st.active = false; st.pinch = false; }
    requestAnimationFrame(loop);
  }

  function onResults(res) {
    const now = performance.now();
    frames++;
    if (now - fpsT > 1000) { st.fps = frames; frames = 0; fpsT = now; }
    const lm = res.multiHandLandmarks && res.multiHandLandmarks[0];
    if (lm) {
      // centro da palma: pulso + bases dos dedos (não se mexe ao fazer a pinça)
      const ids = [0, 5, 9, 13, 17];
      let px = 0, py = 0; ids.forEach(i => { px += lm[i].x; py += lm[i].y; }); px /= 5; py /= 5;
      const mx = 1 - px; // espelhado
      const tx = clamp01((mx - RANGE.x0) / (RANGE.x1 - RANGE.x0));
      const ty = clamp01((py - RANGE.y0) / (RANGE.y1 - RANGE.y0));
      st.x = clamp01(fx(tx, now)); st.y = clamp01(fy(ty, now));
      const palm = dist(lm[0], lm[9]) || 0.1;
      const p = dist(lm[4], lm[8]) / palm;
      st.pinchAmount = clamp01((PINCH_OFF + 0.2 - p) / (PINCH_OFF + 0.2 - PINCH_ON * 0.5));
      if (!st.pinch && p < PINCH_ON) st.pinch = true;
      else if (st.pinch && p > PINCH_OFF) st.pinch = false;
      st.active = true; lastSeen = now;
    }
    previews.forEach(c => drawPreview(c, res, lm));
  }

  function drawPreview(c, res, lm) {
    if (!c.isConnected) { previews.delete(c); return; }
    if (c.offsetParent === null) return;
    const g = c.getContext("2d"), w = c.width, h = c.height;
    g.save(); g.translate(w, 0); g.scale(-1, 1);
    g.globalAlpha = 0.55; g.drawImage(res.image, 0, 0, w, h); g.globalAlpha = 1;
    // área de mira
    g.strokeStyle = "rgba(62,230,216,0.35)"; g.setLineDash([4, 4]);
    g.strokeRect((1 - RANGE.x1) * w, RANGE.y0 * h, (RANGE.x1 - RANGE.x0) * w, (RANGE.y1 - RANGE.y0) * h);
    g.setLineDash([]);
    if (lm) {
      g.fillStyle = "#3ee6d8";
      lm.forEach(p => { g.beginPath(); g.arc(p.x * w, p.y * h, 2, 0, Math.PI * 2); g.fill(); });
      g.strokeStyle = st.pinch ? "#ff2b3d" : "#e9ecef"; g.lineWidth = 2;
      g.beginPath(); g.moveTo(lm[4].x * w, lm[4].y * h); g.lineTo(lm[8].x * w, lm[8].y * h); g.stroke();
    }
    g.restore();
  }

  return {
    st, start, stop,
    addPreview(c) { previews.add(c); }, removePreview(c) { previews.delete(c); },
    onChange(fn) { listeners.add(fn); }
  };
})();
