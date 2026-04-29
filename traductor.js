// ============================================
// POKÉDEX — traductor.js
// Módulo de traducción usando la API de Claude
// ============================================

// Cache para no repetir llamadas a la API con los mismos textos
const cacheTraduccion = new Map();

// ============================================
// FUNCIÓN PRINCIPAL DE TRADUCCIÓN
// ============================================

/**
 * Traduce un texto del inglés al español usando Claude.
 * Si el texto ya fue traducido antes, devuelve el resultado del caché.
 * @param {string} texto - Texto en inglés a traducir
 * @returns {Promise<string>} - Texto traducido al español
 */
async function traducir(texto) {
    if (!texto || texto.trim() === '') return texto;

    // Verificar si ya está en caché
    const clave = texto.trim().toLowerCase();
    if (cacheTraduccion.has(clave)) {
        return cacheTraduccion.get(clave);
    }

    try {
        const respuesta = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'claude-sonnet-4-20250514',
                max_tokens: 1000,
                messages: [
                    {
                        role: 'user',
                        content: `Traduce el siguiente texto del inglés al español. 
Contexto: es texto de un Pokédex (juego Pokémon), puede ser nombre de habilidad, descripción u otro término del juego.
Responde ÚNICAMENTE con la traducción, sin explicaciones ni comillas.
Si el texto ya está en español, devuélvelo tal cual.
Si es un nombre propio de Pokémon, devuélvelo tal cual sin traducir.

Texto a traducir: ${texto}`
                    }
                ]
            })
        });

        if (!respuesta.ok) {
            console.warn('Error en la API de traducción, devolviendo texto original');
            return texto;
        }

        const datos = await respuesta.json();
        const traduccion = datos.content?.[0]?.text?.trim() || texto;

        // Guardar en caché
        cacheTraduccion.set(clave, traduccion);
        return traduccion;

    } catch (error) {
        console.warn('Error al traducir:', error);
        // Si falla la API, devolvemos el texto original sin romper la app
        return texto;
    }
}

// ============================================
// TRADUCCIÓN EN LOTE
// ============================================

/**
 * Traduce múltiples textos en paralelo de forma eficiente.
 * @param {string[]} textos - Array de textos en inglés
 * @returns {Promise<string[]>} - Array de textos traducidos
 */
async function traducirLote(textos) {
    if (!textos || textos.length === 0) return [];

    // Separar los que ya están en caché de los que hay que traducir
    const pendientes = [];
    const indices = [];

    textos.forEach((texto, i) => {
        const clave = texto.trim().toLowerCase();
        if (!cacheTraduccion.has(clave)) {
            pendientes.push(texto);
            indices.push(i);
        }
    });

    // Si hay textos pendientes, traducirlos todos en una sola llamada a la API
    if (pendientes.length > 0) {
        try {
            const listaFormateada = pendientes.map((t, i) => `${i + 1}. ${t}`).join('\n');

            const respuesta = await fetch('https://api.anthropic.com/v1/messages', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: 'claude-sonnet-4-20250514',
                    max_tokens: 1000,
                    messages: [
                        {
                            role: 'user',
                            content: `Traduce los siguientes términos del inglés al español. 
Contexto: son nombres de habilidades de Pokémon.
Responde ÚNICAMENTE con una lista numerada en el mismo formato, sin explicaciones adicionales.
Si algún término ya está en español, mantenlo igual.
Si es un nombre propio, mantenlo sin traducir.

${listaFormateada}`
                        }
                    ]
                })
            });

            if (respuesta.ok) {
                const datos = await respuesta.json();
                const contenido = datos.content?.[0]?.text?.trim() || '';

                // Parsear la respuesta numerada
                const lineas = contenido.split('\n').filter(l => l.trim());
                lineas.forEach((linea, i) => {
                    if (i < pendientes.length) {
                        // Remover el número del inicio (ej: "1. ")
                        const traduccion = linea.replace(/^\d+\.\s*/, '').trim();
                        const clave = pendientes[i].trim().toLowerCase();
                        cacheTraduccion.set(clave, traduccion);
                    }
                });
            }
        } catch (error) {
            console.warn('Error al traducir en lote:', error);
            // Si falla, usar los textos originales
            pendientes.forEach(texto => {
                cacheTraduccion.set(texto.trim().toLowerCase(), texto);
            });
        }
    }

    // Devolver todos los textos (desde caché)
    return textos.map(texto => {
        const clave = texto.trim().toLowerCase();
        return cacheTraduccion.get(clave) || texto;
    });
}

// ============================================
// FORMATEO DE NOMBRES DE HABILIDADES
// ============================================

/**
 * Formatea un nombre de habilidad en inglés (snake-case) a texto legible
 * antes de enviarlo a traducción. Ej: "overgrow" → "Overgrow"
 * @param {string} nombre - Nombre de habilidad en snake-case
 * @returns {string} - Nombre formateado
 */
function formatearNombreHabilidad(nombre) {
    return nombre
        .split('-')
        .map(palabra => palabra.charAt(0).toUpperCase() + palabra.slice(1))
        .join(' ');
}

/**
 * Traduce un nombre de habilidad del inglés al español.
 * Formatea primero el nombre y luego lo traduce.
 * @param {string} nombreHabilidad - Nombre en snake-case (ej: "overgrow")
 * @returns {Promise<string>} - Nombre traducido al español
 */
async function traducirHabilidad(nombreHabilidad) {
    const formateado = formatearNombreHabilidad(nombreHabilidad);
    return await traducir(formateado);
}

/**
 * Traduce múltiples nombres de habilidades en una sola llamada a la API.
 * @param {string[]} nombres - Array de nombres en snake-case
 * @returns {Promise<string[]>} - Array de nombres traducidos
 */
async function traducirHabilidades(nombres) {
    const formateados = nombres.map(formatearNombreHabilidad);
    return await traducirLote(formateados);
}
