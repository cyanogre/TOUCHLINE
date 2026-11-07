/* TOUCHLINE — portadas vivas («splash art» animado) para elegir fútbol masculino o femenino.
   Todo se pinta en la GPU (WebGL) para que vaya fluido también en el móvil:
   - «Esqueleto»: huesos invisibles que deforman la acuarela (la copa sube y baja, los puños
     se agitan, las cabezas botan), como las animaciones por mallas de los splash arts.
   - Cintas, banderas y pelo que ondean; cámara lenta y parallax con el puntero.
   - Rayos y halo en la copa, un reflejo que la cruza, destellos en las medallas y
     flashes de cámara en la grada.
   - Confeti y polvo dorado (partículas en la GPU) y un estallido al elegir.
   - Revelado de acuarela al entrar.
   Sin WebGL o con «reducir movimiento», la acuarela se ve quieta. */
(function () {
  const TL = window.TL = window.TL || {};
  const reduce = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const easeInOut = x => (x = clamp(x, 0, 1)) < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
  const rnd = (a, b) => a + Math.random() * (b - a);

  // Coordenadas normalizadas (0–1) sobre cada imagen (887×887): fg = la gente recortada, bg = el estadio.
  // bones: esqueleto de cada persona. [ax, ay, bx, by, padre, giroº, frecuencia, fase, radio, rebote]
  //   El hueso gira sobre su articulación (a); sus hijos heredan el movimiento. Movimientos leves:
  //   1-4 grados, como respirar, reír o agitar el puño.
  // ribbons/flags: [x0, y0, x1, y1, ampX, ampY, ondas, velocidad, fase, sujeta(0 arriba/izq, 1 abajo/der)]
  const ART = {
    F: {
      fg: 'assets/splash/fem-fg.webp', bg: 'assets/splash/fem-bg.webp', focus: [0.5, 0.42],
      trophy: [0.538, 0.1], cup: [0.538, 0.1, 0.085, 0.09],
      bones: [
        [0.55, 0.72, 0.53, 0.48, -1, 0.7, 1.7, 0, 0.07, 0.0025],   // 0 capitana: torso (rebota un poco)
        [0.53, 0.48, 0.53, 0.37, 0, 2.5, 1.7, 0.9, 0.05, 0],       // 1 su cabeza
        [0.44, 0.444, 0.459, 0.316, 0, 1.4, 1.3, 0.3, 0.035, 0],   // 2 brazo izquierdo
        [0.459, 0.316, 0.519, 0.207, 2, 0.8, 1.3, 0.5, 0.032, 0],  // 3 antebrazo izquierdo
        [0.624, 0.466, 0.617, 0.323, 0, 1.4, 1.3, 0.3, 0.035, 0],  // 4 brazo derecho
        [0.617, 0.323, 0.575, 0.214, 4, 0.8, 1.3, 0.5, 0.032, 0],  // 5 antebrazo derecho
        [0.545, 0.21, 0.535, 0.03, 3, -1.0, 1.3, 0.2, 0.075, 0],   // 6 la copa (en sus manos)
        [0.25, 0.75, 0.3, 0.55, -1, 0.6, 2.0, 1.5, 0.06, 0],       // 7 jugadora del puño: torso
        [0.316, 0.541, 0.33, 0.44, 7, 2.5, 2.0, 2.2, 0.045, 0],    // 8 su cabeza
        [0.21, 0.555, 0.235, 0.43, 7, 2.5, 2.6, 1.0, 0.03, 0],     // 9 brazo en alto
        [0.235, 0.43, 0.29, 0.345, 9, 2.0, 2.6, 1.3, 0.03, 0],     // 10 puño
        [0.27, 0.47, 0.06, 0.52, 8, 2.0, 1.4, 0, 0.045, 0],        // 11 melena al viento
        [0.39, 0.6, 0.39, 0.52, -1, 2.0, 1.8, 3.0, 0.04, 0],       // 12 cabeza (detrás, izquierda)
        [0.526, 0.692, 0.52, 0.6, -1, 1.5, 1.6, 0.4, 0.05, 0],     // 13 cabeza (delante, de espaldas)
        [0.451, 0.609, 0.34, 0.714, 13, 3.0, 2.2, 1.0, 0.04, 0],   // 14 su coleta
        [0.68, 0.617, 0.68, 0.52, -1, 2.5, 2.2, 2.6, 0.045, 0],    // 15 cabeza (medalla, centro)
        [0.76, 0.57, 0.76, 0.49, -1, 2.0, 1.9, 4.1, 0.04, 0],      // 16 cabeza (detrás, derecha)
        [0.79, 0.58, 0.8, 0.5, -1, 2.0, 2.1, 5.0, 0.04, 0],        // 17 cabeza (mirando arriba)
        [0.88, 0.53, 0.93, 0.58, 17, 3.0, 2.4, 0.3, 0.03, 0],      // 18 su coleta
        [0.8, 0.72, 0.83, 0.6, -1, 1.5, 1.7, 3.6, 0.05, 0],        // 19 cabeza (rubia)
        [0.935, 0.66, 0.97, 0.8, 19, 4.0, 2.0, 0.7, 0.04, 0],      // 20 su coleta
        [0.977, 0.571, 0.94, 0.466, -1, 2.5, 2.8, 2.0, 0.035, 0],  // 21 portera: brazo
        [0.94, 0.466, 0.906, 0.41, 21, 2.0, 2.8, 2.3, 0.03, 0],    // 22 su puño
      ],
      ribbons: [
        [0.33, 0.04, 0.47, 0.29, 0.004, 0, 1.1, 2.0, 0, 0],
        [0.6, 0.04, 0.71, 0.3, 0.004, 0, 1.2, 2.3, 1.7, 0],
      ],
      flags: [
        [0.15, 0.12, 0.32, 0.27, 0, 0.004, 1.1, 2.2, 0, 0],      // banderines en mástil (arriba, izquierda)
        [0.37, 0.34, 0.45, 0.5, 0.004, 0, 1.0, 1.8, 0.7, 0],     // estandartes colgantes
        [0.53, 0.34, 0.59, 0.49, 0.004, 0, 1.0, 1.9, 2.1, 0],
        [0.38, 0.49, 0.8, 0.56, 0.003, 0, 2.5, 2.4, 1.3, 0],     // banderitas sobre la grada
        [0.69, 0.22, 0.77, 0.29, 0.003, 0, 1.0, 2.6, 0.4, 0],
      ],
      glints: [[0.42, 0.04], [0.6, 0.035], [0.56, 0.29], [0.575, 0.583], [0.675, 0.75]],
      stands: [[0.02, 0.25, 0.35, 0.5], [0.6, 0.28, 0.98, 0.5]],
      colors: ['#5b2a86', '#8e5cc2', '#c9a7e8', '#f2c94c', '#fff4d6'],
    },
    M: {
      fg: 'assets/splash/masc-fg.webp', bg: 'assets/splash/masc-bg.webp', focus: [0.55, 0.42],
      trophy: [0.571, 0.11], cup: [0.571, 0.1, 0.085, 0.085],
      bones: [
        [0.556, 0.83, 0.564, 0.519, -1, 0.6, 1.6, 0, 0.08, 0.0025], // 0 capitán: torso
        [0.564, 0.519, 0.556, 0.42, 0, 2.5, 1.6, 0.9, 0.05, 0],     // 1 su cabeza
        [0.444, 0.496, 0.481, 0.361, 0, 1.4, 1.2, 0.3, 0.035, 0],   // 2 brazo izquierdo
        [0.481, 0.361, 0.556, 0.226, 2, 0.8, 1.2, 0.5, 0.032, 0],   // 3 antebrazo izquierdo
        [0.662, 0.489, 0.647, 0.353, 0, 1.4, 1.2, 0.3, 0.035, 0],   // 4 brazo derecho
        [0.647, 0.353, 0.617, 0.233, 4, 0.8, 1.2, 0.5, 0.032, 0],   // 5 antebrazo derecho
        [0.59, 0.235, 0.571, 0.03, 3, -1.0, 1.2, 0.2, 0.08, 0],     // 6 la copa
        [0.083, 0.669, 0.12, 0.541, -1, 3.0, 2.6, 1.0, 0.03, 0],    // 7 brazo en alto (izquierda)
        [0.12, 0.541, 0.175, 0.447, 7, 2.0, 2.6, 1.3, 0.03, 0],     // 8 su puño
        [0.21, 0.744, 0.2, 0.62, -1, 2.5, 2.1, 2.0, 0.05, 0],       // 9 cabeza (delante, izquierda)
        [0.346, 0.647, 0.33, 0.53, -1, 2.5, 1.9, 3.1, 0.05, 0],     // 10 cabeza (sonriendo)
        [0.714, 0.737, 0.71, 0.63, -1, 2.5, 2.3, 4.0, 0.05, 0],     // 11 cabeza (gritando)
        [0.82, 0.714, 0.815, 0.6, -1, 2.0, 2.0, 5.1, 0.05, 0],      // 12 cabeza (derecha)
        [0.94, 0.714, 0.925, 0.6, -1, -3.0, 2.7, 2.4, 0.035, 0],    // 13 brazo en alto (derecha)
        [0.925, 0.6, 0.865, 0.504, 13, -2.0, 2.7, 2.7, 0.03, 0],    // 14 su puño
      ],
      ribbons: [
        [0.32, 0.06, 0.5, 0.36, 0.004, 0, 1.2, 2.1, 0.9, 0],
        [0.64, 0.08, 0.76, 0.38, 0.004, 0, 1.1, 2.4, 2.9, 0],
      ],
      flags: [
        [0.02, 0.04, 0.15, 0.32, 0.004, 0, 1.1, 2.0, 0, 0],      // estandartes grandes
        [0.17, 0.19, 0.26, 0.38, 0.004, 0, 1.1, 2.3, 1.4, 0],
        [0.88, 0.15, 1.0, 0.4, 0.004, 0, 1.0, 2.1, 2.2, 0],
        [0.46, 0.37, 0.51, 0.48, 0, 0.004, 1.2, 3.0, 0.5, 0],    // banderas en mástil
        [0.54, 0.43, 0.59, 0.5, 0, 0.004, 1.2, 3.2, 1.9, 1],
        [0.655, 0.37, 0.75, 0.45, 0, 0.005, 1.2, 2.9, 3.0, 0],
      ],
      glints: [[0.5, 0.03], [0.66, 0.07], [0.6, 0.3], [0.585, 0.673], [0.224, 0.92], [0.38, 0.833]],
      stands: [[0.0, 0.33, 0.4, 0.6], [0.62, 0.4, 1.0, 0.6]],
      colors: ['#1d4e9e', '#4f86d9', '#ffffff', '#f2c94c', '#cfe0ff'],
    },
  };

  const imgs = {};
  function image(src) {
    if (!imgs[src]) { const im = new Image(); im.decoding = 'async'; im.src = src; imgs[src] = im; }
    return imgs[src];
  }
  const preload = () => { for (const k in ART) { image(ART[k].fg); image(ART[k].bg); } };

  // ------------------------------------------------------------ Shaders
  const VS_QUAD = `attribute vec2 aPos; varying vec2 vUv;
void main(){ vUv = vec2(aPos.x * 0.5 + 0.5, 0.5 - aPos.y * 0.5); gl_Position = vec4(aPos, 0.0, 1.0); }`;

  const FS_ART = `#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
varying vec2 vUv;
uniform sampler2D uBg, uFg;
uniform vec2 uRes, uPar;
uniform vec4 uMap;
uniform float uT, uRev, uGlow, uOn, uFlash, uSeed;
uniform vec2 uTroC;
uniform vec4 uCup;
uniform vec4 uSeg[24]; uniform vec4 uI0[24]; uniform vec4 uI1[24]; uniform float uNB;
uniform vec4 uRr[4]; uniform vec4 uRp[4]; uniform vec2 uRq[4]; uniform float uNR;
uniform vec4 uFr[6]; uniform vec4 uFp[6]; uniform vec2 uFq[6]; uniform float uNF;
uniform vec2 uGl[6]; uniform float uNG;
uniform vec4 uSt[2];

const float FG = 1.25, BG = 0.45;   // profundidad de cada capa para el parallax

float hash(float n) { return fract(sin(n) * 43758.5453123); }
float hash2(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash2(i), hash2(i + vec2(1.0, 0.0)), f.x), mix(hash2(i + vec2(0.0, 1.0)), hash2(i + vec2(1.0, 1.0)), f.x), f.y);
}
float fbm(vec2 p) { float v = 0.0, a = 0.5; for (int i = 0; i < 4; i++) { v += a * noise(p); p *= 2.03; a *= 0.5; } return v; }
vec3 screen(vec3 a, vec3 b) { return 1.0 - (1.0 - a) * (1.0 - b); }
float star(vec2 d, float s) {
  float l1 = exp(-abs(d.y) / (s * 0.035)) * exp(-abs(d.x) / (s * 0.45));
  float l2 = exp(-abs(d.x) / (s * 0.035)) * exp(-abs(d.y) / (s * 0.45));
  return (l1 + l2) * 0.85 + exp(-dot(d, d) / (s * s * 0.025));
}

// Esqueleto: cada píxel sigue a los huesos que tiene cerca (piel ponderada por distancia al hueso).
// Las matrices llegan ya invertidas: de la pose actual a la de reposo de la imagen.
vec2 skin(vec2 p) {
  float ws = 0.12; vec2 acc = p * ws;
  for (int i = 0; i < 24; i++) {
    if (float(i) >= uNB) break;
    vec4 sg = uSeg[i], r0 = uI0[i], r1 = uI1[i];
    vec2 ab = sg.zw - sg.xy;
    float h = clamp(dot(p - sg.xy, ab) / dot(ab, ab), 0.0, 1.0);
    vec2 dv = p - sg.xy - ab * h;
    float w = exp(-dot(dv, dv) / (r0.w * r0.w));
    if (w < 0.003) continue;
    acc += w * vec2(dot(r0.xyz, vec3(p, 1.0)), dot(r1.xyz, vec3(p, 1.0)));
    ws += w;
  }
  return acc / ws;
}
vec2 wave(vec2 p, vec4 r, vec4 w, vec2 x) {
  vec2 l = (p - r.xy) / (r.zw - r.xy);
  if (l.x < 0.0 || l.y < 0.0 || l.x > 1.0 || l.y > 1.0) return vec2(0.0);
  float win = smoothstep(0.0, 0.25, l.x) * smoothstep(0.0, 0.25, 1.0 - l.x) * smoothstep(0.0, 0.12, l.y) * smoothstep(0.0, 0.3, 1.0 - l.y);
  float along = w.x != 0.0 ? l.y : l.x;
  float env = x.y > 0.5 ? 1.0 - along : along;
  float wv = sin(6.2832 * w.z * along - uT * w.w + x.x) * 0.8 + sin(6.2832 * w.z * 2.3 * along - uT * w.w * 1.7 + x.x * 2.0) * 0.2;
  return w.xy * env * wv * win;
}
vec2 ribbons(vec2 p) { vec2 d = vec2(0.0); for (int i = 0; i < 4; i++) { if (float(i) >= uNR) break; d += wave(p, uRr[i], uRp[i], uRq[i]); } return d; }
vec2 flags(vec2 p) { vec2 d = vec2(0.0); for (int i = 0; i < 6; i++) { if (float(i) >= uNF) break; d += wave(p, uFr[i], uFp[i], uFq[i]); } return d; }

void main() {
  vec2 uv = vUv;
  float asp = uRes.x / uRes.y;
  vec2 base = uv * uMap.xy + uMap.zw;

  // Estadio (más lejos: se mueve menos)
  vec2 pb = base + uPar * BG;
  vec3 col = texture2D(uBg, pb - flags(pb)).rgb;

  // La gente: esqueleto + cintas, con una sombra suave sobre el estadio
  vec2 pf = base + uPar * FG;
  vec2 qf = skin(pf);
  qf -= ribbons(qf);
  float sh = (texture2D(uFg, qf + vec2(-0.006, -0.012)).a + texture2D(uFg, qf + vec2(-0.012, -0.022)).a) * 0.5;
  col *= 1.0 - 0.22 * sh;
  vec4 fg = texture2D(uFg, qf);
  col = col * (1.0 - fg.a) + fg.rgb;

  // Luz de la copa: rayos que giran y halo que respira
  vec2 d = (uv - uTroC) * vec2(asp, 1.0);
  float r = length(d), a = atan(d.y, d.x);
  float rays = pow(0.5 + 0.5 * sin(a * 7.0 + uT * 0.25 + 1.7 * sin(a * 3.0 - uT * 0.17)), 5.0);
  rays *= exp(-r * 2.3) * (1.0 - exp(-r * 25.0));
  float halo = exp(-r * r * 14.0);
  col = screen(col, (rays * 0.6 + halo * 0.4) * uGlow * vec3(1.0, 0.94, 0.8));

  // Reflejo que cruza la copa cada pocos segundos (solo sobre la copa)
  vec2 c = (qf - uCup.xy) / uCup.zw;
  float sp = mod(uT + uSeed, 4.6) / 1.2;
  if (sp < 1.0) {
    float band = dot(c, normalize(vec2(1.0, -0.65)));
    float z = (band - mix(-1.4, 1.4, sp)) / 0.22;
    float s = exp(-z * z) * smoothstep(1.0, 0.55, dot(c, c)) * sin(3.14159 * sp) * fg.a;
    col = screen(col, vec3(s * 0.8 * uOn));
  }

  // Destellos en el borde de la copa y en las medallas
  for (int i = 0; i < 6; i++) {
    if (float(i) >= uNG) break;
    float fi = float(i);
    float tw = pow(max(0.0, sin(uT * (0.8 + 0.13 * fi) + 2.1 * fi)), 14.0);
    if (tw < 0.01) continue;
    vec2 g = (uv - uGl[i]) * uRes;
    float gs = uRes.x * 0.05;
    if (dot(g, g) > gs * gs * 4.0) continue;
    float ang = uT * 0.7 + fi; float ca = cos(ang), sa = sin(ang);
    g = vec2(ca * g.x - sa * g.y, sa * g.x + ca * g.y);
    col += star(g, gs * (0.55 + 0.45 * tw)) * tw * uOn * vec3(1.0, 0.97, 0.88);
  }

  // Flashes de cámara en la grada (capa del estadio)
  for (int j = 0; j < 4; j++) {
    float fj = float(j);
    float tt = uT * 0.6 + fj * 0.31 + uSeed;
    float life = fract(tt) * 4.0;
    if (life < 1.0) {
      float slot = floor(tt);
      float h1 = hash(slot * 7.13 + fj * 31.7), h2 = hash(slot * 3.71 + fj * 17.3), h3 = hash(slot * 9.17 + fj * 5.1);
      vec4 R = h3 < 0.5 ? uSt[0] : uSt[1];
      vec2 P = vec2(mix(R.x, R.z, h1), mix(R.y, R.w, h2));
      vec2 fp = (uv - (P - uMap.zw - uPar * BG) / uMap.xy) * uRes;
      float fs = uRes.x * 0.03;
      if (dot(fp, fp) > fs * fs * 4.0) continue;
      vec2 qq = (P - uPar * BG + uPar * FG);
      float behind = 1.0 - texture2D(uFg, skin(qq)).a;   // si hay alguien delante, no se ve
      col += star(fp, fs) * pow(1.0 - life, 2.0) * uOn * behind * vec3(1.0, 0.98, 0.94);
    }
  }

  // Fogonazo al elegir
  col = screen(col, vec3(uFlash * exp(-r * 1.4)));

  // Revelado de acuarela: la pintura se extiende desde la copa con borde de pigmento
  if (uRev < 1.0) {
    float n = fbm(uv * vec2(4.0 * asp, 4.0) + uSeed);
    float v = r + n * 0.45;
    float th = uRev * 1.95;
    float m = smoothstep(th, th - 0.06, v);
    float edge = smoothstep(th - 0.11, th - 0.02, v) * m;
    col = mix(vec3(0.937, 0.898, 0.812), col * (1.0 - edge * 0.28), m);
  }
  gl_FragColor = vec4(col, 1.0);
}`;

  // Partículas: confeti (0), polvo dorado (1) y estallido (2); todo se calcula en la GPU
  const VS_PART = `attribute vec4 aA; attribute vec4 aB; attribute vec3 aC;
uniform float uT, uBT, uOn; uniform vec2 uRes, uPtr, uOrig;
varying vec3 vCol; varying float vRot, vFlip, vKind, vAlpha;
void main() {
  float kind = aB.z; vec2 pos; float alpha = uOn;
  if (kind < 0.5) {
    pos = vec2(aA.x + sin(uT * 1.3 + aA.w) * 0.035, fract(aA.y + uT * aA.z) * 1.25 - 0.12);
  } else if (kind < 1.5) {
    pos = vec2(aA.x + sin(uT * 0.8 + aA.w) * 0.02, 1.08 - fract(aA.y + uT * aA.z) * 1.2);
    alpha *= 0.45 + 0.4 * sin(uT * 2.2 + aA.w);
  } else {
    float tau = uT - uBT;
    if (tau < 0.0 || tau > 2.6) { gl_Position = vec4(2.0, 2.0, 0.0, 1.0); gl_PointSize = 0.0; return; }
    float ang = aA.x * 6.2832;
    vec2 v = vec2(cos(ang) * 0.8, sin(ang)) * aA.z - vec2(0.0, 0.4);
    pos = uOrig + v * (1.0 - exp(-1.4 * tau)) / 1.4 + vec2(0.0, 0.48 * tau * tau);
    alpha = 1.0 - smoothstep(1.9, 2.6, tau);
  }
  pos -= uPtr * vec2(0.03, 0.02) * aB.y;
  vCol = aC; vKind = kind; vAlpha = alpha;
  vRot = uT * (aA.w - 3.0) * 0.7 + aA.w * 5.0;
  vFlip = cos(uT * (3.0 + aA.w) + aA.w * 2.0);
  gl_Position = vec4(pos.x * 2.0 - 1.0, 1.0 - pos.y * 2.0, 0.0, 1.0);
  gl_PointSize = aB.x * aB.y * uRes.x;
}`;
  const FS_PART = `precision mediump float;
varying vec3 vCol; varying float vRot, vFlip, vKind, vAlpha;
void main() {
  vec2 c = gl_PointCoord - 0.5;
  if (vKind > 0.5 && vKind < 1.5) { float g = exp(-dot(c, c) * 16.0); gl_FragColor = vec4(vCol * g * vAlpha, 0.0); return; }
  float cr = cos(vRot), sr = sin(vRot);
  vec2 r = vec2(cr * c.x - sr * c.y, sr * c.x + cr * c.y);
  r.y /= max(0.15, abs(vFlip));
  if (abs(r.x) > 0.45 || abs(r.y) > 0.22) discard;
  float a = vAlpha * 0.92;
  gl_FragColor = vec4(vCol * (vFlip < 0.0 ? 0.72 : 1.0) * a, a);
}`;

  function compile(gl, vs, fs) {
    const sh = (type, src) => {
      const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
      return s;
    };
    const p = gl.createProgram();
    gl.attachShader(p, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    // Ubicaciones de los uniformes (null si el compilador quitó alguno: WebGL lo ignora)
    const u = new Proxy({}, { get: (o, k) => (k in o ? o[k] : (o[k] = gl.getUniformLocation(p, k))) });
    return { p, u };
  }
  const rgb = hex => { const n = parseInt(hex.slice(1), 16); return [(n >> 16) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]; };

  function particles(A) {
    const out = [];
    const push = (a, b, c) => out.push(...a, ...b, ...c);
    for (let i = 0; i < 34; i++) push([Math.random(), Math.random(), rnd(0.05, 0.1), rnd(0, 6.28)], [rnd(0.016, 0.026), rnd(0.5, 1.4), 0, 0], rgb(A.colors[i % A.colors.length]));
    for (let i = 0; i < 18; i++) push([rnd(0.12, 0.88), Math.random(), rnd(0.02, 0.05), rnd(0, 6.28)], [rnd(0.03, 0.05), rnd(0.6, 1.2), 1, 0], [1, 0.85, 0.5]);
    for (let i = 0; i < 90; i++) push([Math.random(), 0, rnd(0.25, 0.95), rnd(0, 6.28)], [rnd(0.018, 0.03), rnd(0.8, 1.5), 2, 0], rgb(A.colors[i % A.colors.length]));
    return { data: new Float32Array(out), count: 34 + 18 + 90 };
  }

  // ------------------------------------------------------------ Bucle
  const live = new Set();
  let raf = 0, last = 0;
  let paused = false;
  const kick = () => { if (!raf && !paused && live.size && !document.hidden) { last = performance.now(); raf = requestAnimationFrame(loop); } };
  function loop(now) {
    raf = 0;
    if (paused) return;
    const dt = Math.min(0.05, Math.max(0, (now - last) / 1000)); last = now;
    for (const st of live) {
      if (!st.btn.isConnected) { dispose(st); continue; }
      if (!st.visible) continue;
      try { frame(st, dt, now); } catch (e) { console.warn('splash', e); dispose(st); }
    }
    kick();
  }
  document.addEventListener('visibilitychange', kick);
  function dispose(st) {
    live.delete(st);
    if (st.io) st.io.disconnect();
    const lose = st.gl && st.gl.getExtension('WEBGL_lose_context');
    if (lose) lose.loseContext();
    st.gl = null;
  }

  /** Pose del esqueleto en el instante t: cada hueso gira sobre su articulación (y arrastra a sus
      hijos). Se envían las matrices inversas (pose → reposo), que es lo que necesita el shader. */
  function skeleton(A, t, I0, I1) {
    const Wm = [];
    A.bones.forEach((b, i) => {
      const [ax, ay, , , parent, deg, f, ph, sig, bounce] = b;
      const o = Math.sin(t * f + ph) + 0.25 * Math.sin(2 * (t * f + ph) + 0.8);
      const th = (deg * Math.PI / 180) * o, c = Math.cos(th), sn = Math.sin(th);
      let M = [c, -sn, ax - c * ax + sn * ay, sn, c, ay - sn * ax - c * ay - (bounce || 0) * Math.max(0, o)];
      if (parent >= 0) {
        const P = Wm[parent];
        M = [P[0] * M[0] + P[1] * M[3], P[0] * M[1] + P[1] * M[4], P[0] * M[2] + P[1] * M[5] + P[2],
          P[3] * M[0] + P[4] * M[3], P[3] * M[1] + P[4] * M[4], P[3] * M[2] + P[4] * M[5] + P[5]];
      }
      Wm[i] = M;
      const det = M[0] * M[4] - M[1] * M[3];
      const ia = M[4] / det, ib = -M[1] / det, id = -M[3] / det, ie = M[0] / det;
      I0.set([ia, ib, -(ia * M[2] + ib * M[5]), sig], i * 4);
      I1.set([id, ie, -(id * M[2] + ie * M[5]), 0], i * 4);
    });
  }

  /** Monta la animación en un botón `.sp-card` que contiene un `canvas.sp-art`. */
  function mount(btn, kind, delay) {
    const A = ART[kind], cv = btn && btn.querySelector('canvas.sp-art');
    if (!A || !cv) return;
    const fgImg = image(A.fg), bgImg = image(A.bg);
    const st = { btn, cv, A, fgImg, bgImg, delay: delay || 0, ready: 0, t: rnd(0, 30), seed: rnd(0, 10), px: 0, py: 0, tx: 0, ty: 0, hov: 0, hovT: 0, press: 0, down: 0, flash: 0, boost: 0, bt: -99, visible: true, css: '' };
    btn._sp = st;
    const pos = `${A.focus[0] * 100}% ${A.focus[1] * 100}% / cover no-repeat`;
    const fallback = () => { cv.style.background = `url(${A.fg}) ${pos}, url(${A.bg}) ${pos}`; };
    let gl = null;
    if (!reduce) {
      try { gl = cv.getContext('webgl', { alpha: false, antialias: false, premultipliedAlpha: true, preserveDrawingBuffer: false, powerPreference: 'low-power' }); } catch (e) { gl = null; }
    }
    if (!gl) { fallback(); return; }
    try {
      st.gl = gl;
      st.art = compile(gl, VS_QUAD, FS_ART);
      st.part = compile(gl, VS_PART, FS_PART);
      st.quad = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, st.quad);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
      const P = particles(A); st.pcount = P.count;
      st.pbuf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, st.pbuf); gl.bufferData(gl.ARRAY_BUFFER, P.data, gl.STATIC_DRAW);
      st.texFg = gl.createTexture(); st.texBg = gl.createTexture();
      cv.addEventListener('webglcontextlost', e => { e.preventDefault(); dispose(st); fallback(); });
    } catch (e) { console.warn('splash', e); st.gl = null; fallback(); return; }

    const slot = btn.parentElement || btn;
    const aim = e => {
      const r = slot.getBoundingClientRect();
      st.tx = clamp(((e.clientX - r.left) / r.width) * 2 - 1, -1, 1);
      st.ty = clamp(((e.clientY - r.top) / r.height) * 2 - 1, -1, 1);
    };
    slot.addEventListener('pointermove', e => { if (e.pointerType === 'mouse') { st.hovT = 1; aim(e); } });
    slot.addEventListener('pointerleave', () => { st.hovT = 0; st.down = 0; });
    slot.addEventListener('pointerdown', () => { st.down = 1; });
    slot.addEventListener('pointerup', () => { st.down = 0; });
    slot.addEventListener('pointercancel', () => { st.down = 0; });
    if ('IntersectionObserver' in window) { st.io = new IntersectionObserver(es => { st.visible = es[es.length - 1].isIntersecting; kick(); }); st.io.observe(cv); }
    live.add(st); kick();
  }

  function frame(st, dt, now) {
    const { gl, cv, A, fgImg, bgImg } = st;
    // Resolución adaptativa: si el dispositivo no llega a ~60 fps, se pinta con menos píxeles
    const cap = Math.min(1.5, window.devicePixelRatio || 1);
    if (st.q == null) { st.q = cap; st.ema = 1 / 60; }
    st.ema += (dt - st.ema) * 0.08;
    if (!paused && st.ema > 0.024 && st.q > 0.6) { st.q = Math.max(0.6, st.q * 0.85); st.ema = 1 / 60; }
    else if (!paused && st.ema < 0.0175 && st.q < cap) st.q = Math.min(cap, st.q * 1.01);
    const dpr = Math.max(0.5, Math.round(st.q * 4) / 4); // a saltos, para no redimensionar cada fotograma
    const cw = cv.clientWidth, ch = cv.clientHeight;
    if (!cw || !ch || !gl) return;
    const W = Math.round(cw * dpr), H = Math.round(ch * dpr);
    if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
    if (!fgImg.complete || !fgImg.naturalWidth || !bgImg.complete || !bgImg.naturalWidth) return;
    if (!st.texOk) {
      const up = (tex, im, fmt, premul) => {
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, premul);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texImage2D(gl.TEXTURE_2D, 0, fmt, fmt, gl.UNSIGNED_BYTE, im);
      };
      up(st.texBg, bgImg, gl.RGB, false);
      up(st.texFg, fgImg, gl.RGBA, true);   // alfa premultiplicado: bordes limpios al filtrar
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
      st.texOk = true; st.ready = now + st.delay;
    }
    st.t += dt;
    const t = st.t;
    const rev = easeInOut((now - st.ready) / 1600), on = clamp((now - st.ready) / 1600, 0, 1);

    // Puntero suavizado; sin ratón, un vaivén para que el parallax respire
    if (!st.hovT) { st.tx = 0.55 * Math.sin(t * 0.25 + st.seed); st.ty = 0.35 * Math.sin(t * 0.19 + st.seed * 2); }
    const k = Math.min(1, dt * 5);
    st.px += (st.tx - st.px) * k; st.py += (st.ty - st.py) * k;
    st.hov += (st.hovT - st.hov) * Math.min(1, dt * 6);
    st.press += (st.down - st.press) * Math.min(1, dt * 14);
    st.flash = Math.max(0, st.flash - dt * 1.6);
    st.boost = Math.max(0, st.boost - dt * 0.5);

    // Cámara: plano que se acerca y se aleja + parallax (en coordenadas de la imagen)
    const iw = fgImg.naturalWidth, ih = fgImg.naturalHeight;
    const s = Math.max(W / iw, H / ih) * (1.1 + 0.02 * Math.sin(t * 0.13) + 0.03 * st.hov);
    let ox = W / 2 - A.focus[0] * iw * s + Math.sin(t * 0.09) * W * 0.012;
    let oy = H / 2 - A.focus[1] * ih * s + Math.cos(t * 0.07) * H * 0.01;
    // margen para que el parallax de la gente (1,25×) no enseñe el borde de la imagen
    const mx = W * 0.04, my = H * 0.03;
    ox = clamp(ox, W - iw * s + mx, -mx); oy = clamp(oy, H - ih * s + my, -my);
    const map = [W / (s * iw), H / (s * ih), -ox / (s * iw), -oy / (s * ih)];
    // Parallax: desplazamiento en coordenadas de la imagen por unidad de profundidad
    const par = [st.px * 0.03 * map[0], st.py * 0.022 * map[1]];
    const FGD = 1.25;
    const toC = (u, v, dep = FGD) => [(u - map[2] - par[0] * dep) / map[0], (v - map[3] - par[1] * dep) / map[1]];
    const tro = toC(A.trophy[0], A.trophy[1]);
    st.tro = tro;

    gl.viewport(0, 0, W, H);
    gl.disable(gl.BLEND);
    const { p, u } = st.art;
    gl.useProgram(p);
    gl.bindBuffer(gl.ARRAY_BUFFER, st.quad);
    const ap = gl.getAttribLocation(p, 'aPos');
    gl.enableVertexAttribArray(ap); gl.vertexAttribPointer(ap, 2, gl.FLOAT, false, 0, 0);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, st.texBg); gl.uniform1i(u.uBg, 0);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, st.texFg); gl.uniform1i(u.uFg, 1);
    gl.uniform2f(u.uPar, par[0], par[1]);
    gl.uniform2f(u.uRes, W, H);
    gl.uniform4f(u.uMap, map[0], map[1], map[2], map[3]);
    gl.uniform1f(u.uT, t % 1000);
    gl.uniform1f(u.uRev, rev);
    gl.uniform1f(u.uOn, on);
    gl.uniform1f(u.uGlow, on * (0.45 + 0.12 * Math.sin(t * 1.1) + 0.25 * st.hov + st.boost));
    gl.uniform1f(u.uFlash, st.flash * 0.75);
    gl.uniform1f(u.uSeed, st.seed);
    gl.uniform2f(u.uTroC, tro[0], tro[1]);
    gl.uniform4f(u.uCup, A.cup[0], A.cup[1], A.cup[2], A.cup[3]);
    if (!st.static) {
      // Datos fijos de cada portada: segmentos de los huesos, zonas que ondean y gradas
      const SEG = new Float32Array(96);
      A.bones.forEach((b, i) => SEG.set(b.slice(0, 4), i * 4));
      const pack = list => {
        const R = new Float32Array(24), P = new Float32Array(24), Q = new Float32Array(12);
        list.forEach((w, i) => { R.set(w.slice(0, 4), i * 4); P.set(w.slice(4, 8), i * 4); Q.set(w.slice(8, 10), i * 2); });
        return { R, P, Q, n: list.length };
      };
      const ST = new Float32Array(8); A.stands.slice(0, 2).forEach((r, i) => ST.set(r, i * 4));
      st.static = { SEG, rib: pack(A.ribbons), flg: pack(A.flags), ST, I0: new Float32Array(96), I1: new Float32Array(96) };
    }
    const S = st.static;
    skeleton(A, t, S.I0, S.I1);
    gl.uniform4fv(u.uSeg, S.SEG); gl.uniform4fv(u.uI0, S.I0); gl.uniform4fv(u.uI1, S.I1); gl.uniform1f(u.uNB, A.bones.length);
    gl.uniform4fv(u.uRr, S.rib.R); gl.uniform4fv(u.uRp, S.rib.P); gl.uniform2fv(u.uRq, S.rib.Q); gl.uniform1f(u.uNR, S.rib.n);
    gl.uniform4fv(u.uFr, S.flg.R); gl.uniform4fv(u.uFp, S.flg.P); gl.uniform2fv(u.uFq, S.flg.Q); gl.uniform1f(u.uNF, S.flg.n);
    gl.uniform4fv(u.uSt, S.ST);
    const GL = new Float32Array(12); A.glints.slice(0, 6).forEach((g, i) => GL.set(toC(g[0], g[1]), i * 2));
    gl.uniform2fv(u.uGl, GL); gl.uniform1f(u.uNG, Math.min(6, A.glints.length));
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.disableVertexAttribArray(ap);

    // Partículas
    const q = st.part;
    gl.useProgram(q.p);
    gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.bindBuffer(gl.ARRAY_BUFFER, st.pbuf);
    const la = gl.getAttribLocation(q.p, 'aA'), lb = gl.getAttribLocation(q.p, 'aB'), lc = gl.getAttribLocation(q.p, 'aC');
    gl.enableVertexAttribArray(la); gl.vertexAttribPointer(la, 4, gl.FLOAT, false, 44, 0);
    gl.enableVertexAttribArray(lb); gl.vertexAttribPointer(lb, 4, gl.FLOAT, false, 44, 16);
    gl.enableVertexAttribArray(lc); gl.vertexAttribPointer(lc, 3, gl.FLOAT, false, 44, 32);
    gl.uniform1f(q.u.uT, t % 1000); gl.uniform1f(q.u.uBT, st.bt % 1000); gl.uniform1f(q.u.uOn, on);
    gl.uniform2f(q.u.uRes, W, H); gl.uniform2f(q.u.uPtr, st.px, st.py); gl.uniform2f(q.u.uOrig, tro[0], tro[1]);
    gl.drawArrays(gl.POINTS, 0, st.pcount);
    gl.disableVertexAttribArray(la); gl.disableVertexAttribArray(lb); gl.disableVertexAttribArray(lc);

    // La tarjeta se inclina hacia el ratón (solo se toca el estilo si cambia)
    const css = `rotateX(${(-st.py * 5 * st.hov).toFixed(1)}deg) rotateY(${(st.px * 7 * st.hov).toFixed(1)}deg) translateY(${(-4 * st.hov).toFixed(1)}px) scale(${(1 + 0.012 * st.hov - 0.035 * st.press).toFixed(3)})`;
    if (css !== st.css) {
      st.css = css;
      const b = st.btn.style;
      b.transform = css;
      b.setProperty('--hov', st.hov.toFixed(2));
      b.setProperty('--gx', ((st.px * 0.5 + 0.5) * 100).toFixed(0) + '%');
      b.setProperty('--gy', ((st.py * 0.5 + 0.5) * 100).toFixed(0) + '%');
    }
  }

  /** Celebración al elegir: estallido de confeti desde la copa, fogonazo y aplausos. */
  function burst(btn) {
    const st = btn && btn._sp;
    if (!st) return false;
    if (TL.SFX && TL.SFX.applause) TL.SFX.applause(1.8, 0.4);
    if (!st.gl) return false;
    st.bt = st.t; st.flash = 1; st.boost = 0.9;
    kick();
    return true;
  }

  TL.Splash = { mount, burst, preload, ART,
    // para grabar vídeos de prueba fotograma a fotograma
    _debug: { live, frame, pause: v => { paused = !!v; kick(); } } };
})();
