/**
 * Parrilla del canal de ciencia: 24 horas, 7 días, en bloques de 3 horas.
 * El bloque CanalCiencia.astro elige la franja vigente según la hora de
 * Bogotá, así que todos los visitantes ven el mismo programa a la misma hora.
 *
 * Para reprogramar solo hay que tocar dos cosas de este archivo:
 *   - CATALOGO: qué playlists existen
 *   - PARRILLA: qué se emite cada día, en orden de HORAS
 *
 * Todos los IDs se verificaron contra YouTube en agosto de 2026. Para añadir
 * uno: abre la playlist y copia el valor del parámetro `list=`. La playlist
 * con TODAS las subidas de un canal es su ID de canal cambiando `UC` por `UU`
 * (YouTube la titula "Cargas de <canal>").
 */
export interface Programa {
  titulo: string;
  idioma: 'es' | 'en';
  playlist: string;
  fuente: string;
  /** Se muestra bajo el reproductor cuando el programa está al aire */
  sinopsis: string;
}

export interface Franja extends Programa {
  /** 0 domingo … 6 sábado */
  dia: number;
  /** Hora de inicio, 0-23, en América/Bogotá */
  hora: number;
}

export const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

/** Ocho bloques de tres horas cubren el día completo. */
export const HORAS = [0, 3, 6, 9, 12, 15, 18, 21];

const MIT = 'MIT OpenCourseWare';
const RI = 'The Royal Institution';
const CHM = 'Computer History Museum';
const WOS = 'Web of Stories';
const NOBEL = 'Nobel Prize';
const IFT = 'Instituto de Física Teórica (UAM-CSIC)';
const MARCH = 'Fundación Juan March';
const BBVA = 'Aprendemos Juntos (BBVA)';
const VOLTIO = 'Date un Voltio';
const LEX = 'Lex Fridman';

export const CATALOGO: Record<string, Programa> = {
  // ── Entrevistas a grandes figuras ────────────────────────────────────────
  entrevistas: {
    titulo: 'Los grandes nombres de la ciencia',
    idioma: 'en',
    playlist: 'PLuz7RUvtFdHLTEv5kJH-H3ch0ozr26-72',
    fuente: WOS,
    sinopsis: 'Entrevistas de vida a científicos legendarios, contadas por ellos mismos.',
  },
  vidas: {
    titulo: 'Vidas de la ciencia',
    idioma: 'en',
    playlist: 'UUrN1lcGgsCB9axGjZjpOqiQ',
    fuente: WOS,
    sinopsis: 'Archivo completo de testimonios de científicos, escritores y artistas.',
  },
  pioneros: {
    titulo: 'Pioneros de la computación',
    idioma: 'en',
    playlist: 'UUHDr4RtxwA1KqKGwxgdK4Vg',
    fuente: CHM,
    sinopsis: 'Historias orales de quienes construyeron la era digital.',
  },
  nobel: {
    titulo: 'Conversaciones Nobel',
    idioma: 'en',
    playlist: 'PLJE9rmV1-0uBv0ZRl6Dk48-o945rOLjEg',
    fuente: NOBEL,
    sinopsis: 'Entrevistas a galardonados con el Premio Nobel.',
  },
  nobelCanal: {
    titulo: 'Archivo Nobel',
    idioma: 'en',
    playlist: 'UU-V6odR7HzLCuqjYeowPjLA',
    fuente: NOBEL,
    sinopsis: 'Conferencias, ceremonias y entrevistas del Premio Nobel.',
  },
  tecnologia: {
    titulo: 'Diálogos sobre tecnología',
    idioma: 'en',
    playlist: 'UUSHZKyawb77ixDdsGog4iWA',
    fuente: LEX,
    sinopsis: 'Entrevistas largas con investigadores en IA, física y computación.',
  },

  // ── Clásicos ─────────────────────────────────────────────────────────────
  feynmanMessenger: {
    titulo: 'Feynman — The Messenger Lectures',
    idioma: 'en',
    playlist: 'PL71D034A47B46E643',
    fuente: 'Cornell / BBC (1964)',
    sinopsis: 'Las siete conferencias de Richard Feynman sobre el carácter de la ley física.',
  },
  feynmanBBC: {
    titulo: 'Feynman — Fun to Imagine',
    idioma: 'en',
    playlist: 'PL04B3F5636096478C',
    fuente: 'BBC (1983)',
    sinopsis: 'Feynman explicando el mundo cotidiano desde la física, sin una sola ecuación.',
  },

  // ── Conferencias ─────────────────────────────────────────────────────────
  royal: {
    titulo: 'Conferencias de la Royal Institution',
    idioma: 'en',
    playlist: 'UUYeF244yNGuFefuFKqxIAXw',
    fuente: RI,
    sinopsis: 'Doscientos años de conferencias públicas de ciencia en Londres.',
  },

  // ── Cursos completos ─────────────────────────────────────────────────────
  fisica1: {
    titulo: 'Física I: Mecánica Clásica',
    idioma: 'en',
    playlist: 'PLyQSN7X0ro203puVhQsmCj9qhlFQ-As8e',
    fuente: MIT,
    sinopsis: 'Curso 8.01x completo.',
  },
  fisica2: {
    titulo: 'Física II: Electricidad y Magnetismo',
    idioma: 'en',
    playlist: 'PLyQSN7X0ro2314mKyUiOILaOC2hk6Pc3j',
    fuente: MIT,
    sinopsis: 'Curso 8.02x completo.',
  },
  algebra: {
    titulo: 'Álgebra Lineal — Gilbert Strang',
    idioma: 'en',
    playlist: 'PLE7DDD91010BC51F8',
    fuente: MIT,
    sinopsis: 'Curso 18.06, uno de los más vistos de la historia del MIT.',
  },
  algoritmos: {
    titulo: 'Introducción a los Algoritmos',
    idioma: 'en',
    playlist: 'PLUl4u3cNGP63EdVPNLG3ToM6LaEUuStEY',
    fuente: MIT,
    sinopsis: 'Curso 6.006 completo.',
  },
  biologia: {
    titulo: 'Fundamentos de Biología',
    idioma: 'en',
    playlist: 'PLF83B8D8C87426E44',
    fuente: MIT,
    sinopsis: 'Curso 7.01SC completo.',
  },

  // ── En español ───────────────────────────────────────────────────────────
  march: {
    titulo: 'Conferencias de la Fundación Juan March',
    idioma: 'es',
    playlist: 'UU6tnZjVb8hAsReWCoB4DaqA',
    fuente: MARCH,
    sinopsis: 'Ciclos de conferencias de humanidades y ciencia, en Madrid.',
  },
  ift: {
    titulo: 'El sendero de la física fundamental',
    idioma: 'es',
    playlist: 'PLD6feQfcW6kwjQg1CzlFdnPkQEfcpNLMy',
    fuente: IFT,
    sinopsis: 'Ciclo de charlas de física fundamental para público general.',
  },
  iftCanal: {
    titulo: 'Charlas del IFT',
    idioma: 'es',
    playlist: 'UUk195x4zYdMx4LhqEwhcPng',
    fuente: IFT,
    sinopsis: 'Seminarios y divulgación del Instituto de Física Teórica.',
  },
  bbva: {
    titulo: 'Aprendemos Juntos',
    idioma: 'es',
    playlist: 'PL6pSwfbQSL9HEtElIuuaVbegrUqrMu_S9',
    fuente: BBVA,
    sinopsis: 'Entrevistas y charlas con referentes del pensamiento y la ciencia.',
  },
  voltio: {
    titulo: 'Divulgación: física y matemáticas',
    idioma: 'es',
    playlist: 'UUns-8DssCBba7M4nu7wk7Aw',
    fuente: VOLTIO,
    sinopsis: 'Divulgación científica en español.',
  },
};

/**
 * Qué se emite cada día, un programa por cada hora de HORAS (00, 03, 06, 09,
 * 12, 15, 18, 21). Cada fila es un día completo: se lee de corrido.
 *
 * El patrón del día: madrugada de conferencias, mañana de cursos, mediodía de
 * entrevistas, tarde de clásicos y noche en español.
 */
export const PARRILLA: Record<number, string[]> = {
  // Lunes — Física
  1: ['royal', 'vidas', 'fisica1', 'fisica1', 'entrevistas', 'feynmanMessenger', 'ift', 'bbva'],
  // Martes — Matemáticas
  2: ['march', 'pioneros', 'algebra', 'algebra', 'nobel', 'feynmanBBC', 'bbva', 'voltio'],
  // Miércoles — Computación
  3: ['royal', 'pioneros', 'algoritmos', 'algoritmos', 'tecnologia', 'entrevistas', 'iftCanal', 'march'],
  // Jueves — Ciencias de la vida
  4: ['march', 'vidas', 'biologia', 'biologia', 'nobelCanal', 'royal', 'ift', 'bbva'],
  // Viernes — Ingeniería y tecnología
  5: ['royal', 'pioneros', 'fisica2', 'algoritmos', 'tecnologia', 'feynmanMessenger', 'bbva', 'voltio'],
  // Sábado — Maratón de entrevistas
  6: ['vidas', 'entrevistas', 'nobel', 'pioneros', 'tecnologia', 'feynmanBBC', 'march', 'iftCanal'],
  // Domingo — Clásicos y repaso
  0: ['royal', 'vidas', 'feynmanMessenger', 'fisica1', 'entrevistas', 'nobelCanal', 'bbva', 'ift'],
};

/** La parrilla expandida: una entrada por casilla de la semana. */
export const PROGRAMACION: Franja[] = Object.entries(PARRILLA).flatMap(([dia, ids]) =>
  ids.map((id, i) => {
    const programa = CATALOGO[id];
    if (!programa) throw new Error(`La parrilla usa un programa inexistente: "${id}"`);
    return { ...programa, dia: Number(dia), hora: HORAS[i] };
  })
);

/** Ordena la semana entera sobre una sola recta, para poder comparar franjas. */
export const peso = (dia: number, hora: number) => dia * 24 + hora;

/**
 * La franja vigente es la última que ya empezó. Si ninguna empezó todavía
 * (antes de las 00:00 del domingo no existe), sigue la última de la semana
 * anterior: la parrilla es un bucle, no una lista con principio y fin.
 */
export function franjaVigente(pesoActual: number, franjas: Franja[] = PROGRAMACION): Franja {
  const empezadas = franjas.filter((f) => peso(f.dia, f.hora) <= pesoActual);
  const candidatas = empezadas.length ? empezadas : franjas;
  return candidatas.reduce((a, b) => (peso(a.dia, a.hora) > peso(b.dia, b.hora) ? a : b));
}

/** El programa que sigue, para el aviso "A continuación". */
export function franjaSiguiente(pesoActual: number, franjas: Franja[] = PROGRAMACION): Franja {
  const porVenir = franjas.filter((f) => peso(f.dia, f.hora) > pesoActual);
  // Si no queda ninguna, la semana da la vuelta y sigue la primera de todas
  const candidatas = porVenir.length ? porVenir : franjas;
  return candidatas.reduce((a, b) => (peso(a.dia, a.hora) < peso(b.dia, b.hora) ? a : b));
}
