// PocketForge rig runtime (browser). Exposes window.PF.
// Poses only transform parts and switch face/prop states; they never redraw the character.
(function (g) {
  const PF = {};

  PF.ease = {
    linear: (t) => t, // for non-character values only (e.g. progress counters)
    inOutSine: (t) => -(Math.cos(Math.PI * t) - 1) / 2,
    inOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
    outCubic: (t) => 1 - Math.pow(1 - t, 3),
    inCubic: (t) => t * t * t,
    outBack: (t) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
  };

  /** Analytic damped spring 0 -> 1. t in seconds. */
  PF.spring = (t, { stiffness = 170, damping = 18, mass = 1 } = {}) => {
    if (t <= 0) return 0;
    const w0 = Math.sqrt(stiffness / mass);
    const zeta = damping / (2 * Math.sqrt(stiffness * mass));
    if (zeta < 1) {
      const wd = w0 * Math.sqrt(1 - zeta * zeta);
      return 1 - Math.exp(-zeta * w0 * t) * (Math.cos(wd * t) + ((zeta * w0) / wd) * Math.sin(wd * t));
    }
    return 1 - Math.exp(-w0 * t) * (1 + w0 * t);
  };

  PF.clamp01 = (x) => Math.max(0, Math.min(1, x));
  /** Progress of t inside [a, b], clamped and eased. */
  PF.seg = (t, a, b, ease = PF.ease.inOutCubic) => ease(PF.clamp01((t - a) / (b - a)));

  /** Insert rig SVG text into a container. Returns the <svg>. */
  PF.mount = (container, svgText, viewBox) => {
    container.innerHTML = svgText;
    const svg = container.querySelector('svg');
    if (viewBox) svg.setAttribute('viewBox', viewBox);
    svg.removeAttribute('width');
    svg.removeAttribute('height');
    svg.style.width = '100%';
    svg.style.height = '100%';
    svg.style.overflow = 'visible';
    return svg;
  };

  PF.applyPose = (svg, pose = {}) => {
    const view = pose.view || 'front';
    svg.querySelectorAll('[data-view]').forEach((v) => (v.style.display = v.dataset.view === view ? '' : 'none'));
    const root = svg.querySelector(`[data-view="${view}"]`);
    if (!root) throw new Error(`rig has no view "${view}"`);
    const parts = pose.parts || {};
    root.querySelectorAll('[data-part]').forEach((p) => {
      const spec = parts[p.dataset.part] || {};
      const [px, py] = (p.dataset.pivot || '0 0').split(/[ ,]+/).map(Number);
      const tr = spec.translate || [0, 0];
      let t = `translate(${tr[0]} ${tr[1]})`;
      if (spec.rotate) t += ` rotate(${spec.rotate} ${px} ${py})`;
      const sx = spec.scaleX ?? 1, sy = spec.scaleY ?? 1;
      if (sx !== 1 || sy !== 1) t += ` translate(${px} ${py}) scale(${sx} ${sy}) translate(${-px} ${-py})`;
      p.setAttribute('transform', t);
    });
    const face = Object.assign({ eyes: 'open', brows: 'neutral', mouth: 'neutral' }, pose.face);
    root.querySelectorAll('[data-face]').forEach((f) => {
      const want = face[f.dataset.face];
      f.querySelectorAll(':scope > [data-state]').forEach((s) => (s.style.display = s.dataset.state === want ? '' : 'none'));
    });
    const props = new Set(pose.props || []);
    root.querySelectorAll('[data-prop]').forEach((p) => (p.style.display = props.has(p.dataset.prop) ? '' : 'none'));
    return root;
  };

  /** Interpolate numeric part values. Face and props switch at t = 0.5. */
  PF.lerpPose = (a, b, t) => {
    const pa = a.parts || {}, pb = b.parts || {};
    const L = (x, y, d) => (x ?? d) + ((y ?? d) - (x ?? d)) * t;
    const parts = {};
    for (const n of new Set([...Object.keys(pa), ...Object.keys(pb)])) {
      const A = pa[n] || {}, B = pb[n] || {};
      parts[n] = {
        rotate: L(A.rotate, B.rotate, 0),
        translate: [L(A.translate?.[0], B.translate?.[0], 0), L(A.translate?.[1], B.translate?.[1], 0)],
        scaleX: L(A.scaleX, B.scaleX, 1),
        scaleY: L(A.scaleY, B.scaleY, 1),
      };
    }
    const src = t < 0.5 ? a : b;
    return { view: src.view || 'front', gaze: src.gaze, parts, face: Object.assign({}, src.face), props: src.props || [] };
  };

  /** Merge part specs (adds rotations/translations). Use to layer breathing on top of a pose. */
  PF.addParts = (pose, extra) => {
    const parts = JSON.parse(JSON.stringify(pose.parts || {}));
    for (const [n, e] of Object.entries(extra)) {
      const p = parts[n] || (parts[n] = {});
      if (e.rotate) p.rotate = (p.rotate || 0) + e.rotate;
      if (e.translate) p.translate = [(p.translate?.[0] || 0) + e.translate[0], (p.translate?.[1] || 0) + e.translate[1]];
      if (e.scaleY) p.scaleY = (p.scaleY ?? 1) * e.scaleY;
    }
    return Object.assign({}, pose, { parts });
  };

  /** Eye state for a deterministic blink schedule: times = blink start seconds. */
  PF.blinkAt = (t, times, dur = 0.18) => {
    for (const s of times) {
      const d = t - s;
      if (d >= 0 && d <= dur) { const p = d / dur; return p < 0.25 || p > 0.75 ? 'half' : 'closed'; }
    }
    return 'open';
  };

  g.PF = PF;
})(typeof window !== 'undefined' ? window : globalThis);
