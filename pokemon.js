// ============================================
// POKÉDEX — pokemon.js (Detail Page)
// ============================================

const API_BASE = 'https://pokeapi.co/api/v2';

const TYPE_NAMES_ES = {
    fire: 'Fuego', water: 'Agua', grass: 'Planta', electric: 'Eléctrico',
    ice: 'Hielo', fighting: 'Lucha', poison: 'Veneno', ground: 'Tierra',
    flying: 'Volador', psychic: 'Psíquico', bug: 'Bicho', rock: 'Roca',
    ghost: 'Fantasma', dragon: 'Dragón', dark: 'Siniestro', steel: 'Acero',
    fairy: 'Hada', normal: 'Normal', shadow: 'Sombra', unknown: 'Desconocido'
};

const STAT_NAMES_ES = {
    hp: 'HP',
    attack: 'Ataque',
    defense: 'Defensa',
    'special-attack': 'Atq. Esp.',
    'special-defense': 'Def. Esp.',
    speed: 'Velocidad'
};

// Type background colors for hero
const TYPE_GRADIENTS = {
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

// Stat color based on value
function getStatColor(value) {
    if (value >= 100) return '#4caf50';
    if (value >= 75)  return '#8bc34a';
    if (value >= 50)  return '#ffc107';
    if (value >= 25)  return '#ff9800';
    return '#f44336';
}

function formatId(id) {
    return String(id).padStart(3, '0');
}

function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1).replace(/-/g, ' ');
}

// ============================================
// FETCH
// ============================================

async function fetchPokemon(id) {
    const res = await fetch(`${API_BASE}/pokemon/${id}`);
    if (!res.ok) throw new Error(`Pokémon #${id} no encontrado`);
    return res.json();
}

async function fetchSpecies(id) {
    try {
        const res = await fetch(`${API_BASE}/pokemon-species/${id}`);
        if (!res.ok) return null;
        return res.json();
    } catch {
        return null;
    }
}

// ============================================
// RENDER DETAIL
// ============================================

async function renderPokemonDetail(pokemon, species) {
    const detail = document.getElementById('pokemon-detail');
    const types = pokemon.types.map(t => t.type.name);
    const primaryType = types[0];
    const gradient = TYPE_GRADIENTS[primaryType] || 'linear-gradient(135deg, #a4acaf, #7a8a8f)';

    // Get description in Spanish or English
    let description = '';
    if (species) {
        const entry = species.flavor_text_entries.find(e => e.language.name === 'es')
            || species.flavor_text_entries.find(e => e.language.name === 'en');
        if (entry) {
            description = entry.flavor_text.replace(/\f/g, ' ').replace(/\n/g, ' ');
        }
    }

    // Image
    const imgUrl = pokemon.sprites.other['official-artwork'].front_default
        || pokemon.sprites.front_default;

    // Types HTML
    const typesHtml = types.map(t =>
        `<span class="${t}">${TYPE_NAMES_ES[t] || t}</span>`
    ).join('');

    // Stats HTML
    const statsHtml = pokemon.stats.map(s => {
        const statName = STAT_NAMES_ES[s.stat.name] || capitalize(s.stat.name);
        const value = s.base_stat;
        const pct = Math.min((value / 150) * 100, 100);
        const color = getStatColor(value);
        return `
            <div class="stat-group">
                <span class="stat-name">${statName}</span>
                <div class="progress-bar-wrapper">
                    <div class="progress-bar" data-value="${pct}" style="background:${color}"></div>
                </div>
                <span class="stat-value">${value}</span>
            </div>
        `;
    }).join('');

    // Abilities HTML
    const abilitiesHtml = pokemon.abilities.map(a => {
        const isHidden = a.is_hidden;
        return `<span class="ability-badge ${isHidden ? 'hidden' : ''}">${capitalize(a.ability.name)}${isHidden ? ' (Oculta)' : ''}</span>`;
    }).join('');

    // Height / Weight
    const heightM = (pokemon.height / 10).toFixed(1);
    const weightKg = (pokemon.weight / 10).toFixed(1);

    // Build HTML
    detail.innerHTML = `
        <div class="pokemon-hero" style="background: ${gradient};">
            <div class="pokemon-hero-ball"></div>
            <div class="pokemon-img-wrapper">
                <img src="${imgUrl}" alt="${pokemon.name}" />
            </div>
            <div class="pokemon-hero-info">
                <span class="pokemon-number">#${formatId(pokemon.id)}</span>
                <h1>${capitalize(pokemon.name)}</h1>
                <div class="pokemon-hero-types">${typesHtml}</div>
                ${description ? `<p style="opacity:.85; font-size:14px; line-height:1.6; margin-bottom:24px; max-width:400px;">${description}</p>` : ''}
                <div class="pokemon-meta">
                    <div class="pokemon-meta-item">
                        <span class="label">Altura</span>
                        <span class="value">${heightM} m</span>
                    </div>
                    <div class="pokemon-meta-item">
                        <span class="label">Peso</span>
                        <span class="value">${weightKg} kg</span>
                    </div>
                    <div class="pokemon-meta-item">
                        <span class="label">Exp. base</span>
                        <span class="value">${pokemon.base_experience || '—'}</span>
                    </div>
                </div>
            </div>
        </div>

        ${await buildNavigation(pokemon.id)}

        <div class="container-stats">
            <h2 class="section-title">Estadísticas base</h2>
            <div class="stats">${statsHtml}</div>
        </div>

        <div class="abilities-section">
            <h2 class="section-title">Habilidades</h2>
            <div class="abilities-list">${abilitiesHtml}</div>
        </div>
    `;

    // Update page title
    document.title = `${capitalize(pokemon.name)} — Pokédex`;

    // Animate stat bars after render
    requestAnimationFrame(() => {
        setTimeout(() => {
            document.querySelectorAll('.progress-bar[data-value]').forEach(bar => {
                bar.style.width = bar.dataset.value + '%';
            });
        }, 100);
    });
}

// ============================================
// NAVIGATION (prev / next)
// ============================================

async function buildNavigation(currentId) {
    const prevId = currentId > 1 ? currentId - 1 : null;
    const nextId = currentId < 151 ? currentId + 1 : null;

    const [prevData, nextData] = await Promise.all([
        prevId ? fetchPokemon(prevId).catch(() => null) : Promise.resolve(null),
        nextId ? fetchPokemon(nextId).catch(() => null) : Promise.resolve(null),
    ]);

    const prevHtml = prevData ? `
        <a href="pokemon.html?id=${prevData.id}" class="pokemon-nav-btn prev">
            <img src="${prevData.sprites.other['official-artwork'].front_default || prevData.sprites.front_default}" alt="${prevData.name}" />
            <div class="nav-info">
                <div class="nav-label">← Anterior</div>
                <div class="nav-name">#${formatId(prevData.id)} ${capitalize(prevData.name)}</div>
            </div>
        </a>
    ` : '<div></div>';

    const nextHtml = nextData ? `
        <a href="pokemon.html?id=${nextData.id}" class="pokemon-nav-btn next">
            <img src="${nextData.sprites.other['official-artwork'].front_default || nextData.sprites.front_default}" alt="${nextData.name}" />
            <div class="nav-info">
                <div class="nav-label">Siguiente →</div>
                <div class="nav-name">#${formatId(nextData.id)} ${capitalize(nextData.name)}</div>
            </div>
        </a>
    ` : '<div></div>';

    return `<div class="pokemon-nav">${prevHtml}${nextHtml}</div>`;
}

// ============================================
// INIT
// ============================================

async function init() {
    const params = new URLSearchParams(window.location.search);
    const id = parseInt(params.get('id'));

    if (!id || isNaN(id)) {
        window.location.href = 'index.html';
        return;
    }

    try {
        const [pokemon, species] = await Promise.all([
            fetchPokemon(id),
            fetchSpecies(id),
        ]);
        await renderPokemonDetail(pokemon, species);
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

init();
