/**
 * Check de la parrilla del canal. Correr con:
 *   node --experimental-strip-types scripts/probar-programacion.ts
 *
 * Cubre lo que no es obvio: que la semana esté cubierta hora por hora y qué
 * programa está vigente en los bordes (entre franjas y en el bucle semanal).
 */
import assert from 'node:assert/strict';
import {
  PROGRAMACION,
  PARRILLA,
  CATALOGO,
  HORAS,
  franjaVigente,
  franjaSiguiente,
  peso,
} from '../src/data/programacion.ts';

// ── Integridad de la parrilla ────────────────────────────────────────────────

// Los 7 días con sus 8 bloques: 24/7 sin huecos
assert.equal(PROGRAMACION.length, 7 * HORAS.length, 'la semana no está completa');
for (let dia = 0; dia < 7; dia++) {
  assert.equal(PARRILLA[dia]?.length, HORAS.length, `el día ${dia} no cubre las 24 horas`);
  for (const hora of HORAS) {
    const casilla = PROGRAMACION.filter((f) => f.dia === dia && f.hora === hora);
    assert.equal(casilla.length, 1, `día ${dia} ${hora}:00 debe tener exactamente un programa`);
  }
}

// Los bloques cubren el día entero sin solaparse ni dejar hueco
assert.equal(HORAS[0], 0, 'el día debe empezar a las 00:00');
for (let i = 1; i < HORAS.length; i++) {
  assert.ok(HORAS[i] > HORAS[i - 1], 'las horas deben ir en orden ascendente');
}
assert.ok(HORAS.at(-1)! < 24, 'ninguna franja puede empezar a las 24:00 o más');

// Toda playlist tiene forma de ID de YouTube
for (const p of Object.values(CATALOGO)) {
  assert.match(p.playlist, /^(PL|UU)[\w-]{10,}$/, `playlist sospechosa: ${p.playlist}`);
  assert.ok(p.sinopsis.length > 10, `falta sinopsis en "${p.titulo}"`);
}

// Todo programa del catálogo se usa (si no, es peso muerto)
const usados = new Set(Object.values(PARRILLA).flat());
for (const id of Object.keys(CATALOGO)) {
  assert.ok(usados.has(id), `el programa "${id}" está en el catálogo pero no en la parrilla`);
}

// Ambos idiomas presentes: el usuario pidió español e inglés
const idiomas = new Set(PROGRAMACION.map((f) => f.idioma));
assert.ok(idiomas.has('es') && idiomas.has('en'), 'la parrilla debe mezclar español e inglés');

// ── Qué está al aire ─────────────────────────────────────────────────────────

// Lunes 7:00 → sigue el bloque que empezó a las 6:00
assert.equal(franjaVigente(peso(1, 7)).hora, 6);
assert.equal(franjaVigente(peso(1, 7)).dia, 1);

// Lunes 9:00 en punto → entra el bloque nuevo
assert.equal(franjaVigente(peso(1, 9)).hora, 9);

// Lunes 00:00 → primer bloque del lunes, no el último del domingo
assert.equal(franjaVigente(peso(1, 0)).dia, 1);
assert.equal(franjaVigente(peso(1, 0)).hora, 0);

// Sábado 23:00 → último bloque de la semana
assert.equal(franjaVigente(peso(6, 23)).dia, 6);
assert.equal(franjaVigente(peso(6, 23)).hora, 21);

// El bucle: después del último bloque del sábado sigue el primero del domingo
const tras = franjaSiguiente(peso(6, 23));
assert.equal(tras.dia, 0, 'tras el sábado a las 21:00 debe seguir el domingo');
assert.equal(tras.hora, 0);

// "A continuación" siempre apunta al bloque siguiente, no al actual
const ahora = franjaVigente(peso(3, 13));
const luego = franjaSiguiente(peso(3, 13));
assert.equal(ahora.hora, 12);
assert.equal(luego.hora, 15);

console.log(
  `✓ parrilla 24/7 íntegra: ${PROGRAMACION.length} franjas, ` +
    `${HORAS.length} bloques diarios, ${Object.keys(CATALOGO).length} programas`
);
