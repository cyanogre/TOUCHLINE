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
  const FILES = { color: 'assets/estadio/color.jpg', normal: 'assets/estadio/normal.jpg', mask: 'assets/estadio/mascara.jpg', height: 'assets/estadio/altura.jpg' };
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
uniform sampler2D tC, tN, tM, tH;
uniform vec2 tilt;       // gesto del ratón/dedo (-1..1)
uniform vec3 sun;        // dirección de la luz
uniform float t, night, aspect;
uniform vec3 tint;
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
float noise(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
  return mix(mix(hash(i),hash(i+vec2(1,0)),f.x), mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x), f.y); }
float fbm(vec2 p){ float v=0., a=.5; for(int i=0;i<5;i++){ v+=a*noise(p); p*=2.03; a*=.5; } return v; }
void main(){
  // Paralaje: lo alto se desplaza más con el gesto (sensación de volumen)
  float h0 = texture2D(tH, uv).r;
  vec2 par = tilt * vec2(0.012, 0.012*aspect);
  vec2 q = uv - par * h0;
  float h = texture2D(tH, q).r;
  q = uv - par * h;
  vec3 col = texture2D(tC, q).rgb;
  vec3 n = normalize(texture2D(tN, q).rgb*2.-1.);
  vec4 m = texture2D(tM, q);
  float grass = smoothstep(.5,.8,m.g) * (1.-smoothstep(.4,.7,m.r));
  // Sol (de día) o luz fría ambiente (de noche)
  vec3 L = normalize(sun);
  float dif = max(dot(n, L), 0.);
  // Sombras proyectadas por lo alto (gradas, banquillos) sobre lo bajo
  float sh = 1.;
  vec2 st = -L.xy * vec2(1., aspect) * 0.006;
  for (int i=1;i<=10;i++){ float hh = texture2D(tH, q - st*float(i)).r; sh = min(sh, 1. - clamp((hh - h - float(i)*0.025)*5., 0., 1.)*0.55); }
  // Nubes que pasan
  vec2 cp = uv*vec2(3.,3.*aspect) + vec2(t*0.018, t*0.007);
  float cl = smoothstep(.45,.75, fbm(cp));
  float cloud = 1. - cl*0.32*(1.-night);
  float amb = mix(0.62, 0.28, night);
  float lit = amb + (1.-amb)*dif*sh*mix(1.,0.15,night);
  vec3 c = col * lit * cloud * tint;
  // Brillo del césped al sol (especular suave) que se mueve con el gesto
  vec3 V = normalize(vec3(-tilt*0.6, 1.));
  float spec = pow(max(dot(reflect(-L, n), V), 0.), 24.) * grass * (1.-night) * 0.18;
  c += spec;
  // Noche: cuatro focos en las esquinas
  if (night > 0.5) {
    vec2 a = vec2(uv.x, uv.y/aspect);
    float f = 0.;
    f += 0.55/(1.+18.*dot(a-vec2(0.,0.), a-vec2(0.,0.)));
    f += 0.55/(1.+18.*dot(a-vec2(1.,0.), a-vec2(1.,0.)));
    f += 0.55/(1.+18.*dot(a-vec2(0.,1./aspect), a-vec2(0.,1./aspect)));
    f += 0.55/(1.+18.*dot(a-vec2(1.,1./aspect), a-vec2(1.,1./aspect)));
    c += col * f * vec3(1.,.97,.88) * (0.6 + 0.4*n.z);
  }
  gl_FragColor = vec4(c, 1.);
}`;

  const S = { state: 'idle', imgs: {}, warped: null, gl: null };

  function load() {
    if (S.state !== 'idle') return;
    S.state = 'loading';
    let left = 4;
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
    cv.width = Math.round(W.color.width * 0.75); cv.height = Math.round(W.color.height * 0.75);
    const gl = cv.getContext('webgl', { premultipliedAlpha: false, preserveDrawingBuffer: true });
    if (!gl) return null;
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
    const U = n => gl.getUniformLocation(pr, n);
    return { cv, gl, u: { tint: U('tint'), tilt: U('tilt'), sun: U('sun'), t: U('t'), night: U('night'), aspect: U('aspect') } };
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
      for (const k in FILES) S.warped[k] = warp(S.imgs[k], o.VIEW, o.L, o.Wd, 12);
      try { S.gl = setupGL(S.warped); } catch (e) { S.gl = null; }
    }
    if (!S.gl) return S.warped.color;
    const { gl, cv, u } = S.gl;
    // El sol gira despacio a lo largo del partido; el gesto lo inclina
    const a = o.t * 0.01;
    // Día, tarde (sol bajo y cálido: sombras largas) o noche (focos)
    const dusk = o.time === 'tarde', night = o.time === 'noche';
    const tint = night ? [0.78, 0.84, 1.0] : dusk ? [1.12, 0.9, 0.72] : [1, 1, 1];
    gl.uniform3f(u.tint, tint[0], tint[1], tint[2]);
    gl.viewport(0, 0, cv.width, cv.height);
    gl.uniform2f(u.tilt, o.tilt.x, o.tilt.y);
    gl.uniform3f(u.sun, Math.cos(a) * 0.55 - o.tilt.x * 0.35, Math.sin(a) * 0.45 - o.tilt.y * 0.35, dusk ? 0.32 : 0.8);
    gl.uniform1f(u.t, o.t);
    gl.uniform1f(u.night, night ? 1 : 0);
    gl.uniform1f(u.aspect, cv.height / cv.width);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    return cv;
  }

  TL.StadiumGL = { render };
})();
