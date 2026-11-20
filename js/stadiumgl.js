/* TOUCHLINE — estadio dibujado con luz dinámica (prueba).
 *
 * Cuatro imágenes del mismo estadio: color, normales, máscara (césped/gradas/banquillos/porterías) y altura.
 * Se enderezan una vez a vista cenital (el campo encaja con los metros del 2D) y un shader WebGL las combina:
 *  - Luz del sol que se mueve despacio (y focos en los partidos de noche) sobre el mapa de normales.
 *  - Sombras de las gradas sobre el césped a partir del mapa de altura.
 *  - Sombras de nubes que cruzan el campo.
 *  - Volumen: al mover el ratón o el dedo, lo alto (gradas, banquillos) se desplaza más que el césped
 *    (paralaje) y la luz acompaña al gesto.
 * Si el navegador no tiene WebGL, se usa la imagen de color sin efectos.
 */
(function () {
  'use strict';
  const TL = window.TL;
  // Imágenes ya enderezadas a vista cenital (tools: se generan una vez desde las originales): ~200 KB en vez de 1,2 MB y sin cálculo al cargar
  const FILES = { color: 'assets/estadio/color-top.webp', normal: 'assets/estadio/normal-top.webp', mask: 'assets/estadio/mascara-top.webp', height: 'assets/estadio/altura-top.webp', light: 'assets/estadio/luz-noche-top.webp', goals: 'assets/estadio/porterias-top.webp' };
  // Esquinas del campo en las imágenes (2000×1116): arriba-izq, arriba-der, abajo-izq, abajo-der
  const CORNERS = [[362, 188], [1636, 188], [292, 951], [1709, 951]];
  const lerp = (a, b, t) => a + (b - a) * t;

  /** Endereza una imagen en perspectiva a vista cenital (malla de triángulos). */
  function warp(im, VIEW, L, Wd, k) {
    const Wv = VIEW.x1 - VIEW.x0, Hv = VIEW.y1 - VIEW.y0;
    const cv = document.createElement('canvas'); cv.width = Math.round(Wv * k); cv.height = Math.round(Hv * k);
    const g = cv.getContext('2d');
    const sx = im.naturalWidth / 2000, sy = im.naturalHeight / 1116;
    const C = CORNERS.map(([x, y]) => [x * sx, y * sy]);
    const src = (wx, wy) => { const u = wx / L, v = wy / Wd; return [lerp(lerp(C[0][0], C[1][0], u), lerp(C[2][0], C[3][0], u), v), lerp(lerp(C[0][1], C[1][1], u), lerp(C[2][1], C[3][1], u), v)]; };
    const D = (wx, wy) => [(wx - VIEW.x0) * k, (wy - VIEW.y0) * k];
    const tri = (s0, s1, s2, d0, d1, d2) => {
      g.save(); g.beginPath(); g.moveTo(d0[0], d0[1]); g.lineTo(d1[0], d1[1]); g.lineTo(d2[0], d2[1]); g.closePath(); g.clip();
      const den = (s1[0] - s0[0]) * (s2[1] - s0[1]) - (s2[0] - s0[0]) * (s1[1] - s0[1]);
      const a = ((d1[0] - d0[0]) * (s2[1] - s0[1]) - (d2[0] - d0[0]) * (s1[1] - s0[1])) / den;
      const b = ((d1[1] - d0[1]) * (s2[1] - s0[1]) - (d2[1] - d0[1]) * (s1[1] - s0[1])) / den;
      const c = ((d2[0] - d0[0]) * (s1[0] - s0[0]) - (d1[0] - d0[0]) * (s2[0] - s0[0])) / den;
      const d = ((d2[1] - d0[1]) * (s1[0] - s0[0]) - (d1[1] - d0[1]) * (s2[0] - s0[0])) / den;
      g.setTransform(a, b, c, d, d0[0] - a * s0[0] - c * s0[1], d0[1] - b * s0[0] - d * s0[1]);
      g.drawImage(im, 0, 0); g.restore();
    };
    const N = 48, M = 36, e = 0.02;
    for (let i = 0; i < N; i++) for (let j = 0; j < M; j++) {
      const w0 = VIEW.x0 + Wv * i / N, w1 = VIEW.x0 + Wv * (i + 1) / N, h0 = VIEW.y0 + Hv * j / M, h1 = VIEW.y0 + Hv * (j + 1) / M;
      tri(src(w0, h0), src(w1, h0), src(w0, h1), D(w0 - e, h0 - e), D(w1 + e, h0 - e), D(w0 - e, h1 + e));
      tri(src(w1, h0), src(w1, h1), src(w0, h1), D(w1 + e, h0 - e), D(w1 + e, h1 + e), D(w0 - e, h1 + e));
    }
    return cv;
  }

  const VS = `attribute vec2 p; varying vec2 uv; void main(){ uv = vec2(p.x*0.5+0.5, 0.5-p.y*0.5); gl_Position = vec4(p,0.,1.); }`;
  const FS = `precision mediump float;
varying vec2 uv;
uniform sampler2D tC, tN, tM, tH, tG, tL;
uniform vec4 ballL;     // balón con efecto: posición (uv), radio, intensidad
uniform vec3 ballC;     // su color
uniform float mode;      // 0 = estadio, 1 = solo las porterías (misma luz y misma profundidad)
uniform vec2 tilt;       // gesto del ratón/dedo (-1..1)
uniform vec3 sun;        // dirección de la luz
uniform float t, night, aspect;
uniform vec3 tint;
uniform float wet, snow, heat, cover;
void main(){
  // Profundidad: lo alto (gradas, banquillos, porterías) se desplaza más que el césped con el gesto
  vec2 par = tilt * vec2(0.022, 0.022*aspect);
  float h = texture2D(tH, uv).r;
  vec2 q = uv - par * h;
  h = texture2D(tH, q).r;
  q = uv - par * h;
  // Líneas del campo (blancas en la máscara: rojo, verde y azul altos a la vez): sin volumen ni desplazamiento,
  // quedan planas y rectas sobre el césped
  vec4 m0 = texture2D(tM, uv);
  float lineM = smoothstep(.5, .72, min(m0.r, min(m0.g, m0.b)));
  // Máscara rectangular del terreno de juego (de -2,5 m a 107,5 m y de -2,5 m a 70,5 m, con borde suave): ahí todo
  // es suelo plano y no se desplaza con el gesto (ni césped ni líneas, así no se duplican). Fuera del rectángulo
  // (gradas, banquillos) y la capa de las porterías conservan la profundidad.
  vec2 wpos = vec2(-21. + uv.x * 147., -16.5 + uv.y * 99.);
  float inX = smoothstep(-4., -2.5, wpos.x) * (1. - smoothstep(107.5, 109., wpos.x));
  float inY = smoothstep(-4., -2.5, wpos.y) * (1. - smoothstep(70.5, 72., wpos.y));
  float pitchM = mode > 0.5 ? lineM : max(lineM, inX * inY);
  q = mix(q, uv, pitchM);
  h = mix(h, 0.176, lineM);   // la línea, a la altura del césped
  vec4 gg = texture2D(tG, q);
  vec3 col = mode > 0.5 ? gg.rgb : texture2D(tC, q).rgb;
  vec4 m = texture2D(tM, q);
  float grass = smoothstep(.5,.8,m.g) * (1.-smoothstep(.4,.7,m.r));
  // Normales: solo dan relieve a lo que tiene volumen (el césped se queda plano: sin bandas)
  vec3 n = normalize(texture2D(tN, q).rgb*2.-1.);
  n = normalize(mix(n, vec3(0.,0.,1.), max(grass, lineM)));
  vec3 L = normalize(sun);
  // Luz relativa a una superficie plana: lo plano conserva su color, el relieve se ilumina o se oscurece
  float rel = dot(n, L) - L.z;
  // Sombras que proyecta lo alto sobre lo bajo (mapa de altura)
  float sh = 0.;
  vec2 st = -L.xy * vec2(1., aspect) * 0.007;
  for (int i=1;i<=12;i++){
    vec2 sq = q - st*float(i);
    vec4 sm = texture2D(tM, sq);
    // Las líneas del campo están algo elevadas en el mapa de altura: no proyectan sombra (era la «segunda línea»)
    float hh = mix(texture2D(tH, sq).r, h, smoothstep(.5, .72, min(sm.r, min(sm.g, sm.b))));
    sh = max(sh, clamp((hh - h - float(i)*0.02)*4., 0., 1.));
  }
  float lit = 1. + rel*0.9 - sh*0.5;
  // De noche: casi todo a oscuras salvo lo que iluminan los focos (mapa de luces: el campo, banquillos y zonas
  // técnicas); la grada en penumbra
  float lightMap = texture2D(tL, q).r;
  float amb = mix(1., 0.16, night);
  vec3 c = col * lit * tint * amb;
  if (night > 0.01) {
    float f = smoothstep(.12, .85, lightMap);
    c += col * f * night * 1.15 * vec3(1.,.97,.9) * (0.75 + 0.25*n.z) * (1. - sh*0.45);
  }
  // Luz del balón con efecto: ilumina a su alrededor con su color (mucho más de noche)
  if (ballL.w > 0.001) {
    vec2 d = (uv - ballL.xy) * vec2(1., aspect);
    float gl = exp(-dot(d, d) / (ballL.z * ballL.z));
    c += (col * 0.8 + 0.12) * ballC * gl * ballL.w;
  }
  gl_FragColor = mode > 0.5 ? vec4(c, gg.a) : vec4(c, 1.);
}`;

  const S = { state: 'idle', imgs: {}, warped: null, gl: null };

  function load() {
    if (S.state !== 'idle') return;
    S.state = 'loading';
    let left = Object.keys(FILES).length;
    for (const k in FILES) {
      const im = new Image();
      im.onload = () => { if (--left === 0) S.state = 'loaded'; };
      im.onerror = () => { S.state = 'error'; };
      im.src = FILES[k];
      S.imgs[k] = im;
    }
  }

  function setupGL(W) {
    const cv = document.createElement('canvas');
    // Se pinta a resolución moderada (es fondo) para ir fluido en móvil
    cv.width = Math.round(W.color.naturalWidth * 0.8); cv.height = Math.round(W.color.naturalHeight * 0.8);
    const gl = cv.getContext('webgl', { premultipliedAlpha: false, preserveDrawingBuffer: true });
    if (!gl) return null;
    // En el móvil, al cambiar de app el sistema puede quitarle la memoria gráfica al juego:
    // mientras tanto se enseña la imagen plana y, al volver, se reconstruye todo.
    cv.addEventListener('webglcontextlost', e => { e.preventDefault(); if (S.gl && S.gl.cv === cv) S.gl = null; S.lost = true; });
    cv.addEventListener('webglcontextrestored', () => { S.lost = false; S.warped = null; });
    const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
    const pr = gl.createProgram();
    gl.attachShader(pr, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(pr);
    if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) return null;
    gl.useProgram(pr);
    const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(pr, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    ['color', 'normal', 'mask', 'height'].forEach((k, i) => {
      const tx = gl.createTexture(); gl.activeTexture(gl.TEXTURE0 + i); gl.bindTexture(gl.TEXTURE_2D, tx);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, W[k]);
      gl.uniform1i(gl.getUniformLocation(pr, ['tC', 'tN', 'tM', 'tH'][i]), i);
    });
    // Mapa de luces nocturnas en la unidad 5
    if (W.light) {
      const tx = gl.createTexture(); gl.activeTexture(gl.TEXTURE5); gl.bindTexture(gl.TEXTURE_2D, tx);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, W.light);
      gl.uniform1i(gl.getUniformLocation(pr, 'tL'), 5);
    }
    // Porterías (con transparencia) en la unidad 4
    if (W.goals) {
      const tx = gl.createTexture(); gl.activeTexture(gl.TEXTURE4); gl.bindTexture(gl.TEXTURE_2D, tx);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, W.goals);
      gl.uniform1i(gl.getUniformLocation(pr, 'tG'), 4);
    }
    const U = n => gl.getUniformLocation(pr, n);
    return { cv, gl, u: { wet: U('wet'), snow: U('snow'), heat: U('heat'), cover: U('cover'), tint: U('tint'), tilt: U('tilt'), sun: U('sun'), t: U('t'), night: U('night'), aspect: U('aspect'), mode: U('mode'), ballL: U('ballL'), ballC: U('ballC') } };
  }

  /**
   * Devuelve el lienzo del estadio listo para dibujar (o null mientras carga).
   * o: { VIEW, L, Wd, t, tilt: {x, y}, night }
   */
  function render(o) {
    load();
    if (S.state !== 'loaded') return null;
    if (!S.warped) {
      S.warped = {};
      for (const k in FILES) S.warped[k] = S.imgs[k];
      try { S.gl = setupGL(S.warped); } catch (e) { S.gl = null; }
    }
    if (S.gl && S.gl.gl.isContextLost()) { S.gl = null; S.lost = true; }
    if (!S.gl) {
      // Tras perder el contexto, se reintenta de vez en cuando con un lienzo nuevo
      if (S.lost && (!S.retry || performance.now() > S.retry)) { S.retry = performance.now() + 1500; try { S.gl = setupGL(S.warped); if (S.gl) S.lost = false; } catch (e) { S.gl = null; } }
      if (!S.gl) return S.warped.color;
    }
    const { gl, cv, u } = S.gl;
    // El sol gira despacio a lo largo del partido; el gesto lo inclina
    const a = o.t * 0.01;
    // Día, tarde (sol bajo y cálido: sombras largas) o noche (focos)
    const dusk = o.time === 'tarde', night = o.time === 'noche';
    // Cielo según el tiempo: cubierto (luz fría y apagada, sombras suaves), temporal (muy oscuro), calor (cálido)
    const W8 = o.weather || 'despejado', SKY = { nublado: [0.9, 0.92, 0.96], lluvia: [0.8, 0.85, 0.92], temporal: [0.62, 0.68, 0.8], nieve: [0.92, 0.96, 1.04], niebla: [0.9, 0.92, 0.95], calor: [1.08, 1.0, 0.88], viento: [0.98, 0.98, 1] };
    const wetSky = !!SKY[W8] && W8 !== 'calor' && W8 !== 'viento';
    let tint = night ? [0.78, 0.84, 1.0] : dusk ? [1.12, 0.9, 0.72] : [1, 1, 1];
    if (SKY[W8]) tint = tint.map((v, i) => v * SKY[W8][i]);
    gl.uniform3f(u.tint, tint[0], tint[1], tint[2]);
    gl.viewport(0, 0, cv.width, cv.height);
    gl.uniform2f(u.tilt, o.tilt.x, o.tilt.y);
    // Sol según la hora: a mediodía alto (sombras cortas); por la tarde cada vez más bajo (sombras largas que crecen); de noche, la luz de los focos
    const prog = Math.min(1, (o.min || 0) / 90);
    const el = wetSky && !night ? 0.97 : night ? 0.6 : dusk ? 0.42 - prog * 0.24 : 0.9 - prog * 0.08;   // con nubes, sombras casi verticales y suaves
    const az = (night ? -2.2 : dusk ? 0.35 : -0.6 + prog * 0.5) + a * 0.15;
    gl.uniform3f(u.sun, Math.cos(az) * (1 - el) - o.tilt.x * 0.3, Math.sin(az) * (1 - el) - o.tilt.y * 0.3, el);
    gl.uniform1f(u.t, o.t);
    gl.uniform1f(u.night, o.dark != null ? o.dark : night ? 1 : 0);
    const bl = o.ballLight;
    if (bl) { gl.uniform4f(u.ballL, bl.u, bl.v, bl.r, bl.k); gl.uniform3f(u.ballC, bl.c[0], bl.c[1], bl.c[2]); } else gl.uniform4f(u.ballL, 0, 0, 0.01, 0);
    const w = o.weather || 'despejado';
    gl.uniform1f(u.wet, w === 'lluvia' || w === 'temporal' ? 1 : 0);
    gl.uniform1f(u.snow, w === 'nieve' ? Math.min(1, 0.06 + o.t / 1200) : 0);
    gl.uniform1f(u.heat, w === 'calor' ? 1 : 0);
    gl.uniform1f(u.cover, w === 'despejado' || w === 'calor' ? 0 : w === 'nublado' ? 0.6 : 1);
    gl.uniform1f(u.aspect, cv.height / cv.width);
    // Primero el estadio (se copia a un lienzo aparte) y después, en el mismo lienzo GL, solo las porterías
    gl.uniform1f(u.mode, 0);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    const base = S.baseCv || (S.baseCv = document.createElement('canvas'));
    if (base.width !== cv.width || base.height !== cv.height) { base.width = cv.width; base.height = cv.height; }
    base.getContext('2d').drawImage(cv, 0, 0);
    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform1f(u.mode, 1);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    S.goalsCv = cv;
    return base;
  }

  // Si el estadio dibujado está activo, se descarga en segundo plano nada más abrir el juego
  try {
    const q = new URLSearchParams(location.search).get('campo');
    if (q === 'arte' || (!q && localStorage.getItem('touchline.campo') === '1')) setTimeout(load, 1500);
  } catch (e) { /* nada */ }
  TL.StadiumGL = { image: k => (S.state === 'loaded' ? S.imgs[{ mask: 'mask' }[k] || k] : null), render, goals: () => S.goalsCv || null, load, ready: () => S.state === 'loaded' || S.state === 'error' };
})();
