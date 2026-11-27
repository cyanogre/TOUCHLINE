/* TOUCHLINE — Aurelio Garrido, la voz que te narra.
 *
 * Columnista de El Balcón desde hace cuarenta años. Ha visto pasar a todos los entrenadores, buenos y malos, y tiene
 * la mala costumbre de verlos venir antes que nadie. Cada semana escribe sobre ti (no siempre: hay semanas en que no
 * le das material). Mientras no sabe quién eres, escribe con dudas; cuando lo sabe, te pone nombre antes que nadie.
 * Y con los años, sin que se lo pidas, va escribiendo tu biografía no autorizada.
 *
 * columnas.duda   cuando todavía no tienes una personalidad clara
 * columnas.cambio cuando dejas de ser lo que eras
 * columnas.mala / .buena   para las semanas en que no hay nada que contar de ti, pero el resultado habla
 * biografia       títulos de capítulo para la biografía no autorizada (Panel → Expediente) */
(function () {
  const DB = window.TL_PRENSA_DB = window.TL_PRENSA_DB || {};
  DB.garrido = {
    nombre: 'Aurelio Garrido', medio: 'El Balcón',
    titulo: 'La columna de Garrido',
    columnas: {
      duda: [
        'Todavía no sé quién es el entrenador de {club}. Y eso, después de cuarenta años en este oficio, me inquieta más que cualquier alineación.',
        'He visto entrenadores con libro de estilo y entrenadores con libro de excusas. El de {club} todavía no ha abierto ninguno. Le estoy esperando.',
        'Hay técnicos que se te presentan en la primera rueda de prensa. Este va dejando migas. Yo, que ya tengo una edad, las voy recogiendo.',
        'Me preguntan en la redacción qué tipo de entrenador es {yo}. Les he dicho la verdad: el que él decida ser. Todavía está decidiendo.',
        'El fútbol no cambia a las personas: las desnuda. A {yo} todavía no se le ve. Pero la temporada es larga y el invierno, frío.'
      ],
      cambio: [
        'Algo ha cambiado en el entrenador de {club}. Lo que era hace un mes ya no es lo que es hoy. No sé si para bien. Sé que para siempre.',
        'Los entrenadores también mudan la piel. El de {club} está a mitad de muda. Fascinante y un poco incómodo de mirar.',
        'Escribí hace semanas que sabía quién era {yo}. Me equivoqué, o me engañó. A mi edad, ambas cosas son igual de humillantes.'
      ],
      buena: [
        'Hoy no escribo del entrenador de {club}: escribo de su equipo, que ha jugado como si nadie le estuviera mirando. Que es como se juega bien.',
        'Victoria de {club}. Si el entrenador sigue así de callado, voy a tener que escribir de táctica. Y nadie quiere eso.'
      ],
      mala: [
        'Mala semana en {club}. No voy a cargar contra el entrenador: ya lo hará él solo en la próxima rueda de prensa.',
        'Derrota de {club}. El silencio del vestuario, al salir, decía más que todas las crónicas que se escribirán mañana. Incluida esta.'
      ]
    },
    biografia: {
      inicio: ['Capítulo uno: el desconocido de {club}', 'Capítulo uno: llegó un lunes, sin hacer ruido'],
      revela: ['{mote}', 'El nacimiento de {mote}', 'Cuando todos empezaron a llamarle {mote}'],
      cambio: ['La muda', 'El día que dejó de ser {mote}'],
      despido: ['La caída', 'La noche en que se apagó la luz del despacho'],
      vuelta: ['El regreso', 'Volver a donde te echaron']
    }
  };
})();
