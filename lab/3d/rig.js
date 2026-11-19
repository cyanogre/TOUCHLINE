/* TOUCHLINE · laboratorio 3D — jugadoras procedurales con esqueleto y animación (del prototipo de prueba).
 * Geometría, material por zonas, locomoción y acciones con fotograma de contacto. Sin simulación: los datos llegan de fuera. */
import {
	BoxGeometry, CylinderGeometry, Float32BufferAttribute, Uint16BufferAttribute, BufferGeometry,
	InterpolationSamplingMode, InterpolationSamplingType, Quaternion, SphereGeometry, Vector3,
	Mesh, SkinnedMesh, Skeleton, Bone, PlaneGeometry, Color, Scene, PerspectiveCamera, DirectionalLight, HemisphereLight,
	MeshStandardMaterial, WebGPURenderer, CanvasTexture, SRGBColorSpace
} from 'three';
import { MeshStandardNodeMaterial } from 'three/webgpu';
import { array, attribute, color, cos, float, fract, mix, positionGeometry, select, sin, smoothstep, uniform, uv, varying, vec3 } from 'three/tsl';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const clamp = ( v, a = 0, b = 1 ) => Math.max( a, Math.min( b, v ) );
const wrapA = a => Math.atan2( Math.sin( a ), Math.cos( a ) );

// ================= GEOMETRÍA (pose de referencia, piernas y brazos rectos) =================
class LoftGeometry extends BufferGeometry {
	constructor( sections, { capStart = false, capEnd = false } = {} ) {
		super();
		const pos = [], uvs = [], idx = [];
		const S = sections.length, N = sections[ 0 ].length;
		for ( let i = 0; i < S; i ++ ) for ( let j = 0; j <= N; j ++ ) {
			const p = sections[ i ][ j % N ]; pos.push( p.x, p.y, p.z ); uvs.push( i / ( S - 1 ), j / N );
		}
		for ( let i = 0; i < S - 1; i ++ ) for ( let j = 0; j < N; j ++ ) {
			const a = i * ( N + 1 ) + j, b = a + N + 1; idx.push( a, b, a + 1, a + 1, b, b + 1 );
		}
		const cap = ( ring, flip, u ) => {
			const c = new Vector3(); ring.forEach( p => c.add( p ) ); c.divideScalar( ring.length );
			const base = pos.length / 3; pos.push( c.x, c.y, c.z ); uvs.push( u, 0.5 );
			ring.forEach( p => { pos.push( p.x, p.y, p.z ); uvs.push( u, 0.5 ); } );
			for ( let j = 0; j < N; j ++ ) { const a = base + 1 + j, b = base + 1 + ( j + 1 ) % N; flip ? idx.push( base, b, a ) : idx.push( base, a, b ); }
		};
		if ( capStart ) cap( sections[ 0 ], true, 0 );
		if ( capEnd ) cap( sections[ S - 1 ], false, 1 );
		this.setAttribute( 'position', new Float32BufferAttribute( pos, 3 ) );
		this.setAttribute( 'uv', new Float32BufferAttribute( uvs, 2 ) );
		this.setIndex( idx ); this.computeVertexNormals();
		const mid = Math.floor( S / 2 ), c = new Vector3();
		sections[ mid ].forEach( p => c.add( p ) ); c.divideScalar( N );
		const v = mid * ( N + 1 ), n = new Vector3().fromBufferAttribute( this.attributes.normal, v );
		if ( n.dot( new Vector3().fromBufferAttribute( this.attributes.position, v ).sub( c ) ) < 0 ) {
			for ( let k = 0; k < idx.length; k += 3 ) [ idx[ k + 1 ], idx[ k + 2 ] ] = [ idx[ k + 2 ], idx[ k + 1 ] ];
			this.setIndex( idx ); this.computeVertexNormals();
		}
	}
}
const _down = new Vector3( 0, - 1, 0 );
function ring( center, rx, rz, segments = 6, phase = 0 ) {
	return Array.from( { length: segments }, ( _, i ) => { const a = i / segments * Math.PI * 2 + phase; return new Vector3( center.x + Math.cos( a ) * rx, center.y, center.z + Math.sin( a ) * rz ); } );
}
function limbSections( joints, segments = 6 ) {
	const rotation = new Quaternion();
	return joints.map( ( [ center, rx, rz ], i ) => {
		const before = joints[ Math.max( 0, i - 1 ) ][ 0 ], after = joints[ Math.min( joints.length - 1, i + 1 ) ][ 0 ];
		rotation.setFromUnitVectors( _down, after.clone().sub( before ).normalize() );
		return ring( new Vector3(), rx, rz, segments ).map( p => p.applyQuaternion( rotation ).add( center ) );
	} );
}
const limb = ( joints, capEnd = true, segments = 6 ) => new LoftGeometry( limbSections( joints, segments ), { capEnd } );
const V = ( x, y, z = 0 ) => new Vector3( x, y, z );
function torsoSection( y, width, depth ) {
	return [ V( width, y, depth * 0.45 ), V( width * 0.65, y, depth ), V( - width * 0.65, y, depth ), V( - width, y, depth * 0.45 ), V( - width, y, - depth * 0.45 ), V( - width * 0.65, y, - depth ), V( width * 0.65, y, - depth ), V( width, y, - depth * 0.45 ) ];
}
function shoeSection( z, width, top ) {
	return [ V( width, top - 0.025, z ), V( width * 0.7, top, z ), V( - width * 0.7, top, z ), V( - width, top - 0.025, z ), V( - width * 0.9, - 0.085, z ), V( width * 0.9, - 0.085, z ) ];
}

// ---- esqueleto: 16 huesos. R = lado derecho de la jugadora (x negativa) ----
const HIPS = 0, SP = 1, CH = 2, NK = 3, HD = 4, UAR = 5, FAR = 6, UAL = 7, FAL = 8, THR = 9, SHR = 10, FTR = 11, THL = 12, SHL = 13, FTL = 14, PT = 15;
const NB = 16, ROOT = 48, GW = 51, PLEN = 52;
const RIG = [
	[ - 1, 0, 0.92, 0 ], [ HIPS, 0, 0.13, 0 ], [ SP, 0, 0.2, 0 ], [ CH, 0, 0.22, 0 ], [ NK, 0, 0.08, 0 ],
	[ CH, - 0.168, 0.165, 0.008 ], [ UAR, - 0.022, - 0.275, - 0.008 ], [ CH, 0.168, 0.165, 0.008 ], [ UAL, 0.022, - 0.275, - 0.008 ],
	[ HIPS, - 0.088, - 0.02, 0 ], [ THR, - 0.002, - 0.43, 0 ], [ SHR, 0, - 0.385, 0 ],
	[ HIPS, 0.088, - 0.02, 0 ], [ THL, 0.002, - 0.43, 0 ], [ SHL, 0, - 0.385, 0 ], [ HD, 0, 0.11, - 0.1 ]
];

const SKIN = 0, HEAD = 1, SHIRT = 2, SHORTS = 3, SOCKS = 4, BOOTS = 5, HAIR = 6, SLEEVE = 7;

function part( geometry, id, weights ) {
	const g = geometry.index ? geometry.toNonIndexed() : geometry;
	for ( const k of Object.keys( g.attributes ) ) if ( ! [ 'position', 'normal', 'uv' ].includes( k ) ) g.deleteAttribute( k );
	const n = g.attributes.position.count, si = new Uint16Array( n * 4 ), sw = new Float32Array( n * 4 );
	for ( let i = 0; i < n; i ++ ) {
		const w = weights( g.attributes.position.getX( i ), g.attributes.position.getY( i ), g.attributes.position.getZ( i ) );
		w.forEach( ( [ b, v ], k ) => { si[ i * 4 + k ] = b; sw[ i * 4 + k ] = v; } );
	}
	g.setAttribute( 'skinIndex', new Uint16BufferAttribute( si, 4 ) );
	g.setAttribute( 'skinWeight', new Float32BufferAttribute( sw, 4 ) );
	g.setAttribute( 'partId', new Float32BufferAttribute( new Float32Array( n ).fill( id ), 1 ) );
	return g;
}
// pesos de piel: mezcla suave cerca de cada articulación
const one = b => () => [ [ b, 1 ] ];
const torsoW = ( x, y ) => y >= 1.3 ? [ [ CH, 1 ] ] : y >= 1.15 ? [ [ CH, ( y - 1.15 ) / 0.15 ], [ SP, 1 - ( y - 1.15 ) / 0.15 ] ] : y >= 1.0 ? [ [ SP, ( y - 1 ) / 0.15 ], [ HIPS, 1 - ( y - 1 ) / 0.15 ] ] : [ [ HIPS, 1 ] ];
const neckW = ( x, y ) => y < 1.49 ? [ [ CH, 0.5 ], [ NK, 0.5 ] ] : [ [ NK, 1 - clamp( ( y - 1.49 ) / 0.07 ) ], [ HD, clamp( ( y - 1.49 ) / 0.07 ) ] ];
const pelvisW = ( x, y ) => { const t = clamp( ( 0.93 - y ) / 0.08 ) * 0.6; return [ [ HIPS, 1 - t ], [ x < 0 ? THR : THL, t ] ]; };
const legW = side => ( x, y ) => {
	const [ th, sh, ft ] = side < 0 ? [ THR, SHR, FTR ] : [ THL, SHL, FTL ];
	if ( y > 0.8 ) { const w = clamp( ( 0.97 - y ) / 0.13, 0.35, 1 ); return [ [ th, w ], [ HIPS, 1 - w ] ]; }
	if ( y > 0.3 ) { const s = clamp( ( 0.51 - y ) / 0.08 ); return [ [ sh, s ], [ th, 1 - s ] ]; }
	const f = clamp( ( 0.13 - y ) / 0.06 ); return [ [ ft, f ], [ sh, 1 - f ] ];
};
const armW = side => ( x, y ) => {
	const [ ua, fa ] = side < 0 ? [ UAR, FAR ] : [ UAL, FAL ];
	if ( y > 1.3 ) { const t = clamp( ( 1.43 - y ) / 0.08 ); return [ [ ua, t ], [ CH, 1 - t ] ]; }
	const f = clamp( ( 1.18 - y ) / 0.08 ); return [ [ fa, f ], [ ua, 1 - f ] ];
};

function buildPlayerGeometry() {
	const parts = [];
	const add = ( g, id, w ) => parts.push( part( g, id, w ) );
	const headProfile = [ [ 1.75, 0.014, 0.014, - 0.012 ], [ 1.708, 0.081, 0.081, - 0.01 ], [ 1.656, 0.091, 0.084, 0 ], [ 1.617, 0.083, 0.075, 0.009 ], [ 1.561, 0.068, 0.062, 0.012 ], [ 1.532, 0.043, 0.041, 0.005 ] ];
	const hs = headProfile.map( ( [ y, rx, rz, z ] ) => ring( V( 0, y, z ), rx, rz, 10, Math.PI / 2 ) );
	hs[ 3 ][ 0 ].z += 0.02;
	const head = new LoftGeometry( hs, { capStart: true, capEnd: true } );
	for ( let i = 0; i < head.attributes.position.count; i ++ ) head.attributes.uv.setX( i, head.attributes.position.getY( i ) );
	add( head, HEAD, one( HD ) );
	for ( const s of [ - 1, 1 ] ) add( new SphereGeometry( 1, 4, 2 ).scale( 0.015, 0.024, 0.017 ).translate( s * 0.089, 1.62, - 0.004 ), SKIN, one( HD ) );
	add( new SphereGeometry( 1, 6, 4 ).scale( 0.045, 0.035, 0.04 ).translate( 0, 1.69, - 0.085 ), HAIR, one( HD ) );
	add( new SphereGeometry( 1, 6, 5 ).scale( 0.032, 0.085, 0.03 ).translate( 0, 1.585, - 0.11 ), HAIR, one( PT ) );
	add( new CylinderGeometry( 0.042, 0.048, 0.10, 5, 1, true ).translate( 0, 1.515, 0 ), SKIN, neckW );
	const shirt = [ [ 1.5, 0.05, 0.048 ], [ 1.42, 0.172, 0.092 ], [ 1.36, 0.168, 0.104 ], [ 1.27, 0.148, 0.1 ], [ 1.16, 0.128, 0.088 ], [ 1.03, 0.15, 0.098 ] ];
	add( new LoftGeometry( shirt.map( s => torsoSection( ...s ) ), { capEnd: true } ), SHIRT, torsoW );
	add( new LoftGeometry( [ ring( V( 0, 1.06, 0 ), 0.145, 0.095, 10 ), ring( V( 0, 0.93, 0 ), 0.168, 0.106, 10 ), ring( V( 0, 0.85, 0 ), 0.15, 0.098, 10 ) ], { capEnd: true } ), SHORTS, pelvisW );
	for ( const side of [ - 1, 1 ] ) {
		const hip = V( side * 0.088, 0.9 ), knee = V( side * 0.09, 0.47 ), ankle = V( side * 0.09, 0.085 );
		const thighMid = hip.clone().lerp( knee, 0.45 ), sockTop = knee.clone().lerp( ankle, 0.12 ), calf = knee.clone().lerp( ankle, 0.4 );
		add( limb( [ [ hip, 0.092, 0.094 ], [ thighMid, 0.084, 0.086 ] ], false, 7 ), SHORTS, legW( side ) );
		add( limb( [ [ thighMid, 0.074, 0.077 ], [ knee, 0.052, 0.055 ], [ sockTop, 0.052, 0.054 ] ], false, 7 ), SKIN, legW( side ) );
		add( limb( [ [ sockTop, 0.056, 0.058 ], [ calf, 0.06, 0.061 ], [ ankle.clone().add( V( 0, - 0.018 ) ), 0.042, 0.043 ] ], true, 7 ), SOCKS, legW( side ) );
		const shoe = new LoftGeometry( [ shoeSection( - 0.07, 0.041, - 0.01 ), shoeSection( 0.015, 0.05, 0.012 ), shoeSection( 0.12, 0.05, - 0.028 ), shoeSection( 0.17, 0.032, - 0.045 ) ], { capStart: true, capEnd: true } );
		for ( let i = 0; i < shoe.attributes.position.count; i ++ ) shoe.attributes.uv.setXY( i, shoe.attributes.position.getY( i ), shoe.attributes.position.getZ( i ) );
		add( shoe.translate( ankle.x, ankle.y, ankle.z ), BOOTS, one( side < 0 ? FTR : FTL ) );
		const sh = V( side * 0.168, 1.415, 0.008 ), el = V( side * 0.19, 1.14 ), wr = V( side * 0.2, 0.9 );
		const midUp = sh.clone().lerp( el, 0.45 );
		add( limb( [ [ V( side * 0.12, 1.405 ), 0.022, 0.032 ], [ V( side * 0.172, 1.35 ), 0.058, 0.056 ], [ midUp, 0.05, 0.049 ] ], false, 6 ), SLEEVE, armW( side ) );
		add( limb( [ [ midUp, 0.042, 0.042 ], [ el, 0.037, 0.037 ], [ wr, 0.025, 0.028 ], [ V( side * 0.203, 0.855 ), 0.028, 0.034 ], [ V( side * 0.205, 0.815 ), 0.017, 0.022 ] ], true, 5 ), SKIN, armW( side ) );
	}
	return mergeGeometries( parts );
}

// ================= MATERIAL =================
const KIT_SHIRT = [ 0xc81e36, 0x1f4fa8, 0x2fbf71, 0xf2c230, 0x151515 ];
const KIT_SHORTS = [ 0xf4f4f4, 0x1a3f86, 0x151515, 0x151515, 0x151515 ];
const KIT_SOCKS = [ 0xc81e36, 0xf4f4f4, 0x2fbf71, 0xf2c230, 0x151515 ];
const SKIN_COLORS = [ 0xc68863, 0xa96f4c, 0x8a5535, 0x6b3d24, 0xd9a077, 0xe8b996 ];
const HAIR_COLORS = [ 0x1a1512, 0x3a2a1a, 0x584022, 0xb08850, 0x2a2624, 0x7a3a1a ];
const BOOT_COLORS = [ 0x151515, 0xf2f2f2, 0xff5a1f, 0x2a6df4, 0xe8e030 ];

function createPlayerMaterial() {
	const partId = varying( attribute( 'partId', 'float' ) ).setInterpolation( InterpolationSamplingType.FLAT, InterpolationSamplingMode.EITHER );
	const is = id => partId.equal( id );
	const seed = uniform( 0 ).onObjectUpdate( ( { object } ) => object.userData.seed );
	const team = uniform( 0 ).onObjectUpdate( ( { object } ) => object.userData.kit );
	const lane = salt => fract( sin( seed.add( salt ).mul( 12.9898 ) ).mul( 43758.5453 ) );
	const pick = ( colors, salt ) => array( colors.map( c => color( c ) ) ).element( lane( salt ).mul( colors.length ).floor().min( colors.length - 1 ) );
	const kit = colors => array( colors.map( c => color( c ) ) ).element( team );
	const q = positionGeometry, tc = uv();
	const angle = tc.y.mul( Math.PI * 2 );
	const face = vec3( sin( angle ).mul( 0.09 ), tc.x, cos( angle ).mul( 0.09 ) );
	const style = lane( 13.0 );
	const hairline = mix( float( 1.6 ), mix( float( 1.68 ), float( 1.71 ), style ), smoothstep( - 0.025, 0.07, face.z ) );
	const hair = smoothstep( hairline.sub( 0.003 ), hairline.add( 0.003 ), face.y );
	const forward = smoothstep( 0.045, 0.075, face.z );
	const eyeWidth = smoothstep( 0.012, 0.005, face.x.abs().sub( 0.034 ).abs() );
	const eyes = eyeWidth.mul( smoothstep( 0.005, 0.0015, face.y.sub( 1.651 ).abs() ) ).mul( forward );
	const brows = eyeWidth.mul( smoothstep( 0.003, 0.001, face.y.sub( 1.664 ).abs() ) ).mul( forward );
	const mouth = smoothstep( 0.026, 0.014, face.x.abs() ).mul( smoothstep( 0.004, 0.001, face.y.sub( 1.582 ).abs() ) ).mul( forward );
	const skin = pick( SKIN_COLORS, 17.0 ), hairColor = pick( HAIR_COLORS, 3.0 );
	const head = mix( skin.mul( eyes.mul( 0.7 ).add( brows.mul( 0.35 ) ).add( mouth.mul( 0.3 ) ).oneMinus() ), hairColor, hair );
	const shirtC = kit( KIT_SHIRT ), trim = kit( KIT_SHORTS );
	const collar = smoothstep( 1.43, 1.45, q.y );
	const stripe = smoothstep( 0.012, 0.004, q.x.abs().sub( 0.13 ).abs() ).mul( smoothstep( 1.4, 1.38, q.y ) );
	const shirt = mix( shirtC, trim, collar.max( stripe.mul( 0.8 ) ) );
	const sleeve = mix( shirtC, trim, smoothstep( 0.82, 0.9, tc.x ) );
	const socks = kit( KIT_SOCKS ).mul( smoothstep( 0.03, 0.0, tc.x ).mul( 0.25 ).oneMinus() );
	const boots = mix( pick( BOOT_COLORS, 5.0 ), color( 0x1b1b1b ), smoothstep( - 0.064, - 0.074, tc.x ) );
	const m = new MeshStandardNodeMaterial();
	m.colorNode = select( is( SKIN ), skin, select( is( HEAD ), head, select( is( SHIRT ), shirt, select( is( SLEEVE ), sleeve,
		select( is( SHORTS ), trim.mul( 0.97 ), select( is( SOCKS ), socks, select( is( BOOTS ), boots, hairColor ) ) ) ) ) ) );
	m.roughnessNode = select( is( SKIN ).or( is( HEAD ) ), float( 0.6 ), select( is( BOOTS ), float( 0.4 ), float( 0.8 ) ) );
	m.metalness = 0;
	return m;
}

// ================= ANIMACIÓN =================
// Pose = rotaciones de 16 huesos + desplazamiento de cadera + peso de apoyo en el suelo.
function kf( u, keys ) {
	if ( u <= keys[ 0 ][ 0 ] ) return keys[ 0 ][ 1 ];
	for ( let i = 1; i < keys.length; i ++ ) if ( u <= keys[ i ][ 0 ] ) {
		const [ u0, v0 ] = keys[ i - 1 ], [ u1, v1 ] = keys[ i ], t = ( u - u0 ) / ( u1 - u0 );
		return v0 + ( v1 - v0 ) * t * t * ( 3 - 2 * t );
	}
	return keys[ keys.length - 1 ][ 1 ];
}
const R = ( P, b, ax, v ) => { P[ b * 3 + ax ] = v; };
function neutral( P ) {
	P.fill( 0 );
	R( P, UAR, 2, - 0.08 ); R( P, UAL, 2, 0.08 ); R( P, FAR, 0, - 0.15 ); R( P, FAL, 0, - 0.15 );
	R( P, SHR, 0, 0.06 ); R( P, SHL, 0, 0.06 ); R( P, PT, 0, 0.15 ); P[ GW ] = 1;
}

// Locomoción: un único ciclo cuya fase avanza con la distancia recorrida (los pies no patinan)
// y que mezcla parada, paso, trote y sprint según la velocidad, más carrera lateral y de espaldas.
function loco( P, p, t ) {
	const v = p.speed, wI = clamp( v / 1.4 ), k = clamp( ( v - 2 ) / 5.5 );
	const fwd = v > 0.05 ? p.lf / v : 1, side = v > 0.05 ? p.ls / v : 0;
	const s = Math.sin( p.ph ), c = Math.cos( p.ph );
	neutral( P );
	const A = ( 0.28 + 0.5 * k ) * wI;
	for ( const [ th, sh, ft, sg ] of [ [ THR, SHR, FTR, 1 ], [ THL, SHL, FTL, - 1 ] ] ) {
		const sw = sg * s, swing = Math.max( 0, sg * c * Math.sign( fwd || 1 ) );
		R( P, th, 0, - A * fwd * sw - 0.06 * k );
		R( P, th, 2, A * side * 0.45 * sw - sg * 0.03 );
		R( P, sh, 0, 0.06 + wI * ( 0.08 + 0.12 * k + ( 0.45 + 1.2 * k ) * swing ** 1.5 ) );
		R( P, ft, 0, wI * ( - 0.15 * Math.max( 0, sw ) + ( 0.15 + 0.35 * k ) * Math.max( 0, - sw ) ) );
	}
	const Aa = ( 0.22 + 0.55 * k ) * wI;
	R( P, UAR, 0, Aa * s * fwd ); R( P, UAL, 0, - Aa * s * fwd );
	R( P, UAR, 2, - 0.1 - 0.08 * k - 0.25 * Math.abs( side ) * wI ); R( P, UAL, 2, 0.1 + 0.08 * k + 0.25 * Math.abs( side ) * wI );
	R( P, FAR, 0, - ( 0.25 * wI + 0.15 + 1.2 * k ) ); R( P, FAL, 0, - ( 0.25 * wI + 0.15 + 1.2 * k ) );
	R( P, HIPS, 1, - 0.12 * k * s * wI * fwd ); R( P, CH, 1, 0.2 * k * s * wI * fwd );
	R( P, HIPS, 2, clamp( - p.yawRate * v * 0.035, - 0.35, 0.35 ) );
	R( P, SP, 0, 0.04 + 0.1 * k + clamp( p.accF * 0.03, - 0.3, 0.22 ) );
	R( P, CH, 0, 0.03 + 0.08 * k + 0.015 * Math.sin( t * 1.7 + p.seed ) * ( 1 - wI ) );
	// postura de marcaje: rodillas flexionadas, centro de gravedad bajo, brazos abiertos
	const j = p.jockey;
	if ( j > 0.01 ) {
		for ( const [ th, sh ] of [ [ THR, SHR ], [ THL, SHL ] ] ) { P[ th * 3 ] -= 0.35 * j; P[ sh * 3 ] += 0.6 * j; }
		P[ SP * 3 ] += 0.22 * j; P[ UAR * 3 + 2 ] -= 0.3 * j; P[ UAL * 3 + 2 ] += 0.3 * j; P[ FAR * 3 ] -= 0.4 * j; P[ FAL * 3 ] -= 0.4 * j;
	}
	R( P, PT, 0, 0.2 + 0.45 * k + 0.15 * Math.sin( p.ph * 2 ) * wI ); R( P, PT, 2, 0.2 * Math.sin( p.ph ) * wI );
	P[ GW ] = 1;
}

// Acciones con su fotograma de contacto (c) o ventana de contacto (win).
// vmax limita la carrera durante la acción; upper = solo tren superior (se mezcla con la carrera).
const ACT = {
	pass: { dur: 0.6, c: 0.5, vmax: 3, f( u, P ) {
		R( P, THR, 0, kf( u, [ [ 0, 0 ], [ 0.3, 0.55 ], [ 0.5, - 0.35 ], [ 0.75, - 0.55 ], [ 1, 0 ] ] ) );
		R( P, SHR, 0, kf( u, [ [ 0, 0.1 ], [ 0.3, 1.1 ], [ 0.5, 0.15 ], [ 0.75, 0.3 ], [ 1, 0.05 ] ] ) );
		R( P, THR, 1, kf( u, [ [ 0, 0 ], [ 0.3, 0.5 ], [ 0.6, 0.7 ], [ 1, 0 ] ] ) );
		R( P, THL, 0, - 0.1 ); R( P, SHL, 0, 0.3 );
		R( P, UAL, 2, kf( u, [ [ 0, 0.1 ], [ 0.4, 0.5 ], [ 1, 0.1 ] ] ) ); R( P, UAR, 2, - kf( u, [ [ 0, 0.1 ], [ 0.4, 0.4 ], [ 1, 0.1 ] ] ) );
		R( P, CH, 1, kf( u, [ [ 0, 0 ], [ 0.3, 0.3 ], [ 0.6, - 0.2 ], [ 1, 0 ] ] ) ); R( P, CH, 0, 0.1 ); R( P, NK, 0, 0.25 ); R( P, HD, 0, 0.2 );
	} },
	long: { dur: 0.85, c: 0.52, vmax: 3, f( u, P ) {
		R( P, THR, 0, kf( u, [ [ 0, 0 ], [ 0.38, 0.95 ], [ 0.52, - 0.4 ], [ 0.8, - 1.1 ], [ 1, 0 ] ] ) );
		R( P, SHR, 0, kf( u, [ [ 0, 0.1 ], [ 0.38, 1.5 ], [ 0.52, 0.1 ], [ 0.8, 0.4 ], [ 1, 0.05 ] ] ) );
		R( P, FTR, 0, kf( u, [ [ 0, 0 ], [ 0.5, 0.4 ], [ 1, 0 ] ] ) );
		R( P, THL, 0, - 0.15 ); R( P, SHL, 0, 0.45 ); R( P, SP, 0, kf( u, [ [ 0, 0 ], [ 0.5, - 0.18 ], [ 1, 0 ] ] ) );
		R( P, UAL, 2, kf( u, [ [ 0, 0.1 ], [ 0.45, 1.0 ], [ 1, 0.1 ] ] ) ); R( P, UAL, 0, - 0.4 ); R( P, UAR, 2, - kf( u, [ [ 0, 0.1 ], [ 0.45, 0.7 ], [ 1, 0.1 ] ] ) );
		R( P, CH, 1, kf( u, [ [ 0, 0 ], [ 0.38, 0.35 ], [ 0.7, - 0.3 ], [ 1, 0 ] ] ) );
	} },
	shot: { dur: 0.8, c: 0.5, vmax: 3, f( u, P ) {
		R( P, THR, 0, kf( u, [ [ 0, 0 ], [ 0.36, 1.15 ], [ 0.5, - 0.5 ], [ 0.78, - 1.35 ], [ 1, 0 ] ] ) );
		R( P, SHR, 0, kf( u, [ [ 0, 0.1 ], [ 0.36, 1.75 ], [ 0.5, 0.05 ], [ 0.78, 0.35 ], [ 1, 0.05 ] ] ) );
		R( P, FTR, 0, kf( u, [ [ 0, 0 ], [ 0.45, 0.6 ], [ 0.6, 0.5 ], [ 1, 0 ] ] ) );
		R( P, THL, 0, - 0.2 ); R( P, SHL, 0, 0.5 );
		R( P, SP, 0, kf( u, [ [ 0, 0.05 ], [ 0.36, - 0.05 ], [ 0.5, 0.3 ], [ 0.78, 0.15 ], [ 1, 0.05 ] ] ) );
		R( P, UAL, 2, kf( u, [ [ 0, 0.1 ], [ 0.4, 1.1 ], [ 0.7, 0.8 ], [ 1, 0.1 ] ] ) ); R( P, UAL, 0, kf( u, [ [ 0, 0 ], [ 0.5, - 0.5 ], [ 1, 0 ] ] ) );
		R( P, UAR, 2, - kf( u, [ [ 0, 0.1 ], [ 0.4, 0.9 ], [ 1, 0.1 ] ] ) );
		R( P, HIPS, 1, kf( u, [ [ 0, 0 ], [ 0.36, 0.35 ], [ 0.6, - 0.4 ], [ 1, 0 ] ] ) );
	} },
	trap: { dur: 0.5, c: 0.3, vmax: 3.5, f( u, P ) {
		R( P, THR, 0, kf( u, [ [ 0, 0 ], [ 0.3, - 0.45 ], [ 0.6, - 0.2 ], [ 1, 0 ] ] ) );
		R( P, SHR, 0, kf( u, [ [ 0, 0.1 ], [ 0.3, 0.65 ], [ 1, 0.1 ] ] ) ); R( P, THR, 1, 0.5 ); R( P, FTR, 0, - 0.2 );
		R( P, SHL, 0, 0.25 ); R( P, UAR, 2, - 0.35 ); R( P, UAL, 2, 0.35 ); R( P, NK, 0, 0.35 ); R( P, HD, 0, 0.25 );
	} },
	chest: { dur: 0.65, c: 0.35, vmax: 2.5, f( u, P ) {
		R( P, SP, 0, kf( u, [ [ 0, 0.05 ], [ 0.3, - 0.3 ], [ 0.5, - 0.15 ], [ 1, 0 ] ] ) );
		R( P, CH, 0, kf( u, [ [ 0, 0 ], [ 0.3, - 0.25 ], [ 1, 0 ] ] ) );
		R( P, UAL, 2, kf( u, [ [ 0, 0.1 ], [ 0.3, 0.9 ], [ 1, 0.1 ] ] ) ); R( P, UAR, 2, - kf( u, [ [ 0, 0.1 ], [ 0.3, 0.9 ], [ 1, 0.1 ] ] ) );
		R( P, SHR, 0, 0.35 ); R( P, SHL, 0, 0.35 ); R( P, THR, 0, - 0.15 ); R( P, THL, 0, - 0.15 ); R( P, NK, 0, 0.35 );
	} },
	header: { dur: 0.95, c: 0.45, vmax: 9, f( u, P ) {
		P[ GW ] = kf( u, [ [ 0, 1 ], [ 0.2, 1 ], [ 0.3, 0 ], [ 0.8, 0 ], [ 0.9, 1 ] ] );
		P[ ROOT + 1 ] = kf( u, [ [ 0, 0 ], [ 0.2, - 0.1 ], [ 0.45, 0.42 ], [ 0.75, 0.05 ], [ 0.85, - 0.05 ], [ 1, 0 ] ] );
		const kn = kf( u, [ [ 0, 0.1 ], [ 0.18, 0.9 ], [ 0.45, 0.7 ], [ 0.8, 0.5 ], [ 1, 0.1 ] ] );
		R( P, SHR, 0, kn ); R( P, SHL, 0, kn * 1.2 ); R( P, THR, 0, - kn * 0.4 ); R( P, THL, 0, - kn * 0.5 );
		R( P, SP, 0, kf( u, [ [ 0, 0 ], [ 0.3, - 0.35 ], [ 0.47, 0.35 ], [ 0.7, 0.1 ], [ 1, 0 ] ] ) );
		R( P, NK, 0, kf( u, [ [ 0, 0 ], [ 0.3, - 0.3 ], [ 0.47, 0.3 ], [ 1, 0 ] ] ) );
		const ar = kf( u, [ [ 0, 0 ], [ 0.3, - 1.6 ], [ 0.6, - 1.2 ], [ 1, 0 ] ] );
		R( P, UAR, 0, ar ); R( P, UAL, 0, ar ); R( P, UAR, 2, - 0.5 ); R( P, UAL, 2, 0.5 ); R( P, FAR, 0, - 0.6 ); R( P, FAL, 0, - 0.6 );
	} },
	tackle: { dur: 0.7, c: 0.4, vmax: 2.5, f( u, P ) {
		R( P, THR, 0, kf( u, [ [ 0, 0 ], [ 0.4, - 1.1 ], [ 0.65, - 0.9 ], [ 1, 0 ] ] ) );
		R( P, SHR, 0, kf( u, [ [ 0, 0.2 ], [ 0.25, 0.9 ], [ 0.4, 0.1 ], [ 1, 0.1 ] ] ) );
		R( P, THR, 2, kf( u, [ [ 0, 0 ], [ 0.4, - 0.25 ], [ 1, 0 ] ] ) );
		const kn = kf( u, [ [ 0, 0.1 ], [ 0.4, 1.0 ], [ 0.7, 0.8 ], [ 1, 0.1 ] ] );
		R( P, THL, 0, kn * 0.35 ); R( P, SHL, 0, kn ); R( P, SP, 0, kn * 0.3 );
		R( P, UAR, 2, - 0.6 ); R( P, UAL, 2, 0.6 ); R( P, FAR, 0, - 0.5 ); R( P, FAL, 0, - 0.5 );
	} },
	slide: { dur: 1.5, win: [ 0.12, 0.55 ], vmax: 99, f( u, P ) {
		P[ GW ] = kf( u, [ [ 0, 1 ], [ 0.08, 0 ], [ 0.85, 0 ], [ 1, 1 ] ] );
		R( P, HIPS, 0, kf( u, [ [ 0, 0 ], [ 0.15, - 1.05 ], [ 0.55, - 1.15 ], [ 0.78, - 0.6 ], [ 1, 0 ] ] ) );
		P[ ROOT + 1 ] = kf( u, [ [ 0, 0 ], [ 0.15, - 0.62 ], [ 0.55, - 0.68 ], [ 0.8, - 0.3 ], [ 1, 0 ] ] );
		R( P, THR, 0, kf( u, [ [ 0, 0 ], [ 0.15, - 0.25 ], [ 0.6, - 0.2 ], [ 1, 0 ] ] ) ); R( P, SHR, 0, 0.05 );
		R( P, THL, 0, kf( u, [ [ 0, 0 ], [ 0.15, - 0.3 ], [ 0.75, - 0.9 ], [ 1, 0 ] ] ) ); R( P, SHL, 0, kf( u, [ [ 0, 0.1 ], [ 0.15, 1.7 ], [ 0.8, 1.9 ], [ 1, 0.1 ] ] ) );
		R( P, UAL, 0, kf( u, [ [ 0, 0 ], [ 0.2, 0.6 ], [ 0.7, 0.4 ], [ 1, 0 ] ] ) ); R( P, UAL, 2, 0.9 );
		R( P, UAR, 0, - 0.6 ); R( P, UAR, 2, - 0.5 ); R( P, SP, 0, 0.35 ); R( P, NK, 0, 0.3 );
	} },
	fall: { dur: 2.0, vmax: 99, f( u, P ) {
		P[ GW ] = kf( u, [ [ 0, 1 ], [ 0.1, 0 ], [ 0.9, 0 ], [ 1, 1 ] ] );
		R( P, HIPS, 0, kf( u, [ [ 0, 0 ], [ 0.25, 0.9 ], [ 0.35, 1.45 ], [ 0.65, 1.45 ], [ 0.85, 0.6 ], [ 1, 0 ] ] ) );
		P[ ROOT + 1 ] = kf( u, [ [ 0, 0 ], [ 0.25, - 0.3 ], [ 0.35, - 0.78 ], [ 0.65, - 0.8 ], [ 0.85, - 0.35 ], [ 1, 0 ] ] );
		const ar = kf( u, [ [ 0, 0 ], [ 0.3, - 1.6 ], [ 0.6, - 1.8 ], [ 0.85, - 0.8 ], [ 1, 0 ] ] );
		R( P, UAR, 0, ar ); R( P, UAL, 0, ar ); R( P, FAR, 0, - 0.3 ); R( P, FAL, 0, - 0.3 );
		const kn = kf( u, [ [ 0, 0.2 ], [ 0.3, 0.4 ], [ 0.65, 1.2 ], [ 0.85, 1.4 ], [ 1, 0.1 ] ] );
		R( P, SHR, 0, kn ); R( P, SHL, 0, kn * 0.8 ); R( P, THR, 0, - kn * 0.6 ); R( P, THL, 0, - kn * 0.4 );
	} },
	dive: { dur: 1.6, win: [ 0.18, 0.55 ], vmax: 99, f( u, P, a ) {
		const d = a.dir;
		P[ GW ] = kf( u, [ [ 0, 1 ], [ 0.15, 0 ], [ 0.9, 0 ], [ 1, 1 ] ] );
		R( P, HIPS, 2, kf( u, [ [ 0, 0 ], [ 0.12, 0 ], [ 0.35, - d * 1.35 ], [ 0.7, - d * 1.45 ], [ 0.88, - d * 0.6 ], [ 1, 0 ] ] ) );
		P[ ROOT + 1 ] = kf( u, [ [ 0, 0 ], [ 0.12, - 0.15 ], [ 0.32, 0.25 ], [ 0.55, - 0.2 ], [ 0.7, - 0.65 ], [ 0.9, - 0.3 ], [ 1, 0 ] ] );
		const ar = kf( u, [ [ 0, 0 ], [ 0.1, - 0.5 ], [ 0.3, - 2.75 ], [ 0.7, - 2.6 ], [ 0.9, - 1 ], [ 1, 0 ] ] );
		R( P, UAR, 0, ar ); R( P, UAL, 0, ar ); R( P, FAR, 0, - 0.15 ); R( P, FAL, 0, - 0.15 );
		R( P, UAR, 2, - 0.15 + d * 0.2 ); R( P, UAL, 2, 0.15 + d * 0.2 );
		R( P, SHR, 0, 0.4 ); R( P, SHL, 0, 0.6 ); R( P, d > 0 ? THL : THR, 2, d * 0.35 );
	} },
	catch: { dur: 0.75, c: 0.35, vmax: 2, f( u, P ) {
		const ar = kf( u, [ [ 0, 0 ], [ 0.3, - 1.35 ], [ 0.6, - 0.9 ], [ 1, - 0.6 ] ] );
		R( P, UAR, 0, ar ); R( P, UAL, 0, ar ); R( P, FAR, 0, - 0.5 ); R( P, FAL, 0, - 0.7 ); R( P, UAR, 2, 0.15 ); R( P, UAL, 2, - 0.15 );
		R( P, SHR, 0, 0.45 ); R( P, SHL, 0, 0.45 ); R( P, THR, 0, - 0.25 ); R( P, THL, 0, - 0.25 ); R( P, SP, 0, 0.25 );
	} },
	celebrate: { dur: 3.5, upper: true, vmax: 7, f( u, P, a, t ) {
		const w = Math.sin( t * 7 ) * 0.15;
		R( P, UAR, 0, - 2.6 + w ); R( P, UAL, 0, - 2.6 - w ); R( P, UAR, 2, - 0.45 ); R( P, UAL, 2, 0.45 );
		R( P, FAR, 0, - 0.2 ); R( P, FAL, 0, - 0.2 ); R( P, SP, 0, - 0.15 ); R( P, HD, 0, - 0.3 );
	} }
};
const UPPER = [ SP, CH, NK, HD, UAR, FAR, UAL, FAL ];

function startAction( p, type, extra = {} ) {
	p.act = { type, t: 0, fired: false, ...ACT[ type ], ...extra };
}

export { buildPlayerGeometry, createPlayerMaterial, RIG, NB, ROOT, GW, PLEN, HIPS, NK, HD, FTR, FTL, UPPER, loco, neutral, ACT, startAction, clamp, wrapA, V };
