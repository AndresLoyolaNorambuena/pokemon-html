// ============================================
// POKÉDEX — pokemon.js (Página de detalle)
// ============================================

const API_BASE = 'https://pokeapi.co/api/v2';

// Nombres de tipos en español
const NOMBRES_TIPOS_ES = {
    fire: 'Fuego', water: 'Agua', grass: 'Planta', electric: 'Eléctrico',
    ice: 'Hielo', fighting: 'Lucha', poison: 'Veneno', ground: 'Tierra',
    flying: 'Volador', psychic: 'Psíquico', bug: 'Bicho', rock: 'Roca',
    ghost: 'Fantasma', dragon: 'Dragón', dark: 'Siniestro', steel: 'Acero',
    fairy: 'Hada', normal: 'Normal', shadow: 'Sombra', unknown: 'Desconocido'
};

// Nombres de estadísticas en español
const NOMBRES_STATS_ES = {
    hp: 'HP',
    attack: 'Ataque',
    defense: 'Defensa',
    'special-attack': 'Atq. Esp.',
    'special-defense': 'Def. Esp.',
    speed: 'Velocidad'
};

// Gradientes de color para el héroe según el tipo primario
const GRADIENTES_TIPO = {
    fire:     'linear-gradient(135deg, #ff7402, #ff4400)',
    water:    'linear-gradient(135deg, #4592c4, #1a6fa8)',
    grass:    'linear-gradient(135deg, #78c850, #4a9c28)',
    electric: 'linear-gradient(135deg, #f8d030, #e6a800)',
    ice:      'linear-gradient(135deg, #51c4e7, #1fa8d4)',
    fighting: 'linear-gradient(135deg, #c03028, #961e1a)',
    poison:   'linear-gradient(135deg, #a040a0, #7a2080)',
    ground:   'linear-gradient(135deg, #e0c068, #c9a030)',
    flying:   'linear-gradient(135deg, #3dc7ef, #1aa8d6)',
    psychic:  'linear-gradient(135deg, #f366b9, #e0349a)',
    bug:      'linear-gradient(135deg, #a8b820, #7a8c10)',
    rock:     'linear-gradient(135deg, #b8a038, #8c7820)',
    ghost:    'linear-gradient(135deg, #705898, #503878)',
    dragon:   'linear-gradient(135deg, #7038f8, #4a18d8)',
    dark:     'linear-gradient(135deg, #705848, #503830)',
    steel:    'linear-gradient(135deg, #9eb7b8, #6a9a9c)',
    fairy:    'linear-gradient(135deg, #ee99ac, #d06880)',
    normal:   'linear-gradient(135deg, #a4acaf, #7a8a8f)',
};

// ============================================
// UTILIDADES
// ============================================

// Devuelve un color según el valor de la estadística
function colorStat(valor) {
    if (valor >= 100) return '#4caf50';
    if (valor >= 75)  return '#8bc34a';
    if (valor >= 50)  return '#ffc107';
    if (valor >= 25)  return '#ff9800';
    return '#f44336';
}

// Formatea el ID con ceros a la izquierda (ej: 1 → "001")
function formatearId(id) {
    return String(id).padStart(3, '0');
}

// Capitaliza la primera letra y reemplaza guiones por espacios
function capitalizar(str) {
    return str.charAt(0).toUpperCase() + str.slice(1).replace(/-/g, ' ');
}

// ============================================
// PETICIONES A LA POKEAPI
// ============================================

// Obtiene los datos principales de un Pokémon por su ID
async function obtenerPokemon(id) {
    const res = await fetch(`${API_BASE}/pokemon/${id}`);
    if (!res.ok) throw new Error(`Pokémon #${id} no encontrado`);
    return res.json();
}

// Obtiene los datos de especie (incluye descripciones e idiomas)
async function obtenerEspecie(id) {
    try {
        const res = await fetch(`${API_BASE}/pokemon-species/${id}`);
        if (!res.ok) return null;
        return res.json();
    } catch {
        return null;
    }
}

// ============================================
// RENDERIZADO DE LA PÁGINA DE DETALLE
// ============================================

async function renderizarDetalle(pokemon, especie) {
    const contenedor = document.getElementById('pokemon-detail');
    const tipos = pokemon.types.map(t => t.type.name);
    const tipoPrimario = tipos[0];
    const gradiente = GRADIENTES_TIPO[tipoPrimario] || 'linear-gradient(135deg, #a4acaf, #7a8a8f)';

    // Obtener descripción: primero en español, luego en inglés como fallback
    let descripcion = '';
    if (especie) {
        const entrada = especie.flavor_text_entries.find(e => e.language.name === 'es')
            || especie.flavor_text_entries.find(e => e.language.name === 'en');
        if (entrada) {
            let textoDesc = entrada.flavor_text.replace(/\f/g, ' ').replace(/\n/g, ' ');

            // Si el texto viene en inglés, lo traducimos con Claude
            if (entrada.language.name === 'en') {
                textoDesc = await traducir(textoDesc);
            }
            descripcion = textoDesc;
        }
    }

    // URL de la imagen oficial del artwork
    const urlImagen = pokemon.sprites.other['official-artwork'].front_default
        || pokemon.sprites.front_default;

    // HTML de los tipos del Pokémon
    const htmlTipos = tipos.map(t =>
        `<span class="${t}">${NOMBRES_TIPOS_ES[t] || t}</span>`
    ).join('');

    // Traducir todos los nombres de habilidades en paralelo (una sola llamada a la API)
    const nombresHabilidades = pokemon.abilities.map(a => a.ability.name);
    const habilidadesTraducidas = await traducirHabilidades(nombresHabilidades);

    // HTML de las estadísticas base con barras de progreso animadas
    const htmlStats = pokemon.stats.map(s => {
        const nombreStat = NOMBRES_STATS_ES[s.stat.name] || capitalizar(s.stat.name);
        const valor = s.base_stat;
        const porcentaje = Math.min((valor / 150) * 100, 100);
        const color = colorStat(valor);
        return `
            <div class="stat-group">
                <span class="stat-name">${nombreStat}</span>
                <div class="progress-bar-wrapper">
                    <div class="progress-bar" data-value="${porcentaje}" style="background:${color}"></div>
                </div>
                <span class="stat-value">${valor}</span>
            </div>
        `;
    }).join('');

    // HTML de las habilidades (con badge especial si es habilidad oculta)
    const htmlHabilidades = pokemon.abilities.map((a, i) => {
        const esOculta = a.is_hidden;
        const nombreTraducido = habilidadesTraducidas[i];
        return `<span class="ability-badge ${esOculta ? 'hidden' : ''}">${nombreTraducido}${esOculta ? ' (Oculta)' : ''}</span>`;
    }).join('');

    // Convertir altura y peso a unidades legibles
    const alturaM = (pokemon.height / 10).toFixed(1);
    const pesoKg = (pokemon.weight / 10).toFixed(1);

    // Construir el HTML completo de la página de detalle
    contenedor.innerHTML = `
        <div class="pokemon-hero" style="background: ${gradiente};">
            <div class="pokemon-hero-ball"></div>
            <div class="pokemon-img-wrapper">
                <img src="${urlImagen}" alt="${pokemon.name}" />
            </div>
            <div class="pokemon-hero-info">
                <span class="pokemon-number">#${formatearId(pokemon.id)}</span>
                <h1>${capitalizar(pokemon.name)}</h1>
                <div class="pokemon-hero-types">${htmlTipos}</div>
                ${descripcion ? `<p style="opacity:.85; font-size:14px; line-height:1.6; margin-bottom:24px; max-width:400px;">${descripcion}</p>` : ''}
                <div class="pokemon-meta">
                    <div class="pokemon-meta-item">
                        <span class="label">Altura</span>
                        <span class="value">${alturaM} m</span>
                    </div>
                    <div class="pokemon-meta-item">
                        <span class="label">Peso</span>
                        <span class="value">${pesoKg} kg</span>
                    </div>
                    <div class="pokemon-meta-item">
                        <span class="label">Exp. base</span>
                        <span class="value">${pokemon.base_experience || '—'}</span>
                    </div>
                </div>
            </div>
        </div>

        ${await construirNavegacion(pokemon.id)}

        <div class="container-stats">
            <h2 class="section-title">Estadísticas base</h2>
            <div class="stats">${htmlStats}</div>
        </div>

        <div class="abilities-section">
            <h2 class="section-title">Habilidades</h2>
            <div class="abilities-list">${htmlHabilidades}</div>
        </div>
    `;

    // Actualizar el título de la pestaña del navegador
    document.title = `${capitalizar(pokemon.name)} — Pokédex`;

    // Animar las barras de estadísticas con un pequeño retraso para el efecto visual
    requestAnimationFrame(() => {
        setTimeout(() => {
            document.querySelectorAll('.progress-bar[data-value]').forEach(barra => {
                barra.style.width = barra.dataset.value + '%';
            });
        }, 100);
    });
}

// ============================================
// NAVEGACIÓN ENTRE POKÉMON (anterior / siguiente)
// ============================================

async function construirNavegacion(idActual) {
    const idAnterior = idActual > 1 ? idActual - 1 : null;
    const idSiguiente = idActual < 151 ? idActual + 1 : null;

    // Cargar datos del anterior y siguiente en paralelo
    const [datosAnterior, datosSiguiente] = await Promise.all([
        idAnterior ? obtenerPokemon(idAnterior).catch(() => null) : Promise.resolve(null),
        idSiguiente ? obtenerPokemon(idSiguiente).catch(() => null) : Promise.resolve(null),
    ]);

    const htmlAnterior = datosAnterior ? `
        <a href="pokemon.html?id=${datosAnterior.id}" class="pokemon-nav-btn prev">
            <img src="${datosAnterior.sprites.other['official-artwork'].front_default || datosAnterior.sprites.front_default}" alt="${datosAnterior.name}" />
            <div class="nav-info">
                <div class="nav-label">← Anterior</div>
                <div class="nav-name">#${formatearId(datosAnterior.id)} ${capitalizar(datosAnterior.name)}</div>
            </div>
        </a>
    ` : '<div></div>';

    const htmlSiguiente = datosSiguiente ? `
        <a href="pokemon.html?id=${datosSiguiente.id}" class="pokemon-nav-btn next">
            <img src="${datosSiguiente.sprites.other['official-artwork'].front_default || datosSiguiente.sprites.front_default}" alt="${datosSiguiente.name}" />
            <div class="nav-info">
                <div class="nav-label">Siguiente →</div>
                <div class="nav-name">#${formatearId(datosSiguiente.id)} ${capitalizar(datosSiguiente.name)}</div>
            </div>
        </a>
    ` : '<div></div>';

    return `<div class="pokemon-nav">${htmlAnterior}${htmlSiguiente}</div>`;
}

// ============================================
// INICIALIZACIÓN
// ============================================

async function iniciar() {
    // Leer el ID del Pokémon desde los parámetros de la URL
    const params = new URLSearchParams(window.location.search);
    const id = parseInt(params.get('id'));

    // Si no hay ID válido, redirigir al índice
    if (!id || isNaN(id)) {
        window.location.href = 'index.html';
        return;
    }

    try {
        // Cargar datos del Pokémon y su especie en paralelo
        const [pokemon, especie] = await Promise.all([
            obtenerPokemon(id),
            obtenerEspecie(id),
        ]);
        await renderizarDetalle(pokemon, especie);
    } catch (err) {
        console.error(err);
        document.getElementById('pokemon-detail').innerHTML = `
            <div class="no-results">
                <h3>Pokémon no encontrado</h3>
                <p>No se pudo cargar la información. <a href="index.html">Volver al Pokédex</a></p>
            </div>
        `;
    }
}

iniciar();
