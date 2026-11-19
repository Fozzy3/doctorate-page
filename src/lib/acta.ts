/**
 * "Acta 014 2018" o "en 2018, ¿qué pasó en el acta #14?" → "14-2018".
 * El indexador lo guarda en la metadata `acta` y /api/chat filtra por él:
 * entre ~300 actas casi iguales el embedding no distingue números.
 * Número tras "acta" + un año en cualquier parte. Un número seguido de mes
 * es una fecha ("Acta 11 jul 2013", "acta 23 de agosto"), no el número.
 * ponytail: números escritos en letras ("catorce") no se reconocen.
 */
const NUMERO =
  /\bactas?\s+(?:n(?:o|º|°|úmero|umero)?\.?\s*|#\s*)?0*(\d{1,3})(?!\d)(?!\s*(?:de\s+)?(?:ene|feb|mar|abr|may|jun|jul|ago|agt|sep|oct|nov|dic))/i;
const ANIO = /\b((?:19|20)\d{2})\b/;

export function actaDe(texto: string): string | undefined {
  const n = texto.match(NUMERO)?.[1];
  const anio = texto.match(ANIO)?.[1];
  return n && anio ? `${n}-${anio}` : undefined;
}
