// ============================================
// POKÉDEX — main.js
// ============================================

const API_BASE = 'https://pokeapi.co/api/v2';
const BATCH_SIZE = 20;
const TOTAL_POKEMON = 151; // Gen 1

// Type names in Spanish
const TYPE_NAMES_ES = {
    fire: 'Fuego', water: 'Agua', grass: 'Planta', electric: 'Eléctrico',
    ice: 'Hielo', fighting: 'Lucha', poison: 'Veneno', ground: 'Tierra',
    flying: 'Volador', psychic: 'Psíquico', bug: 'Bicho', rock: 'Roca',
    ghost: 'Fantasma', dragon: 'Dragón', dark: 'Siniestro', steel: 'Acero',
    fairy: 'Hada', normal: 'Normal', shadow: 'Sombra', unknown: 'Desconocido'
};

// State
let allPokemon = [];
let filteredPokemon = [];
let activeTypes = new Set();
let searchQuery = '';
let offset = 0;
let isLoading = false;

// DOM elements
const pokemonList = document.getElementById('pokemon-list');
const searchInput = document.getElementById('search-input');
const btnSearch = document.getElementById('btn-search');
const btnFilter = document.getElementById('btn-filter');
const containerFilters = document.getElementById('container-filters');
const overlay = document.getElementById('overlay');
const filterTypesContainer = document.getElementById('filter-types');
const btnClearFilters = document.getElementById('btn-clear-filters');
const resultsCount = document.getElementById('results-count');
const btnLoadMore = document.getElementById('btn-load-more');

// ============================================
// FETCH POKEMON DATA
// ============================================

async function fetchPokemon(id) {
    const res = await fetch(`${API_BASE}/pokemon/${id}`);
    if (!res.ok) throw new Error(`Error fetching Pokémon #${id}`);
    return res.json();
}

async function loadBatch(start, count) {
    const ids = Array.from({ length: count }, (_, i) => start + i + 1);
    const promises = ids.map(id => fetchPokemon(id).catch(() => null));
    const results = await Promise.all(promises);
    return results.filter(Boolean);
}

async function loadInitialPokemon() {
    isLoading = true;
    try {
        const batch = await loadBatch(0, BATCH_SIZE);
        allPokemon = [...allPokemon, ...batch];
        offset = BATCH_SIZE;
        applyFilters();
        if (offset < TOTAL_POKEMON) {
            btnLoadMore.style.display = 'block';
        }
    } catch (err) {
        console.error('Error loading Pokémon:', err);
        pokemonList.innerHTML = `<div class="no-results">
            <h3>¡Ups!</h3>
            <p>No se pudieron cargar los Pokémon. Revisa tu conexión.</p>
        </div>`;
    } finally {
        isLoading = false;
    }
}

// ============================================
// RENDER
// ============================================

function getPokemonTypes(pokemon) {
    return pokemon.types.map(t => t.type.name);
}

function formatId(id) {
    return String(id).padStart(3, '0');
}

function createPokemonCard(pokemon, index) {
    const types = getPokemonTypes(pokemon);
    const typeSpans = types.map(type => {
        const nameEs = TYPE_NAMES_ES[type] || type;
        return `<span class="${type}">${nameEs}</span>`;
    }).join('');

    const imgUrl = pokemon.sprites.other['official-artwork'].front_default
        || pokemon.sprites.front_default
        || `https://assets.pokemon.com/assets/cms2/img/pokedex/detail/${formatId(pokemon.id)}.png`;

    const card = document.createElement('a');
    card.href = `pokemon.html?id=${pokemon.id}`;
    card.className = 'card-pokemon';
    card.style.animationDelay = `${(index % BATCH_SIZE) * 0.05}s`;
    card.innerHTML = `
        <div class="card-img">
            <img src="${imgUrl}" alt="${pokemon.name}" loading="lazy" />
        </div>
        <div class="card-info">
            <span class="pokemon-id">#${formatId(pokemon.id)}</span>
            <h3>${capitalize(pokemon.name)}</h3>
            <div class="card-types">${typeSpans}</div>
        </div>
    `;
    return card;
}

function renderPokemon(pokemonArray) {
    pokemonList.innerHTML = '';

    if (pokemonArray.length === 0) {
        pokemonList.innerHTML = `<div class="no-results">
            <h3>Sin resultados</h3>
            <p>No se encontraron Pokémon con esos criterios.</p>
        </div>`;
        resultsCount.textContent = '0 Pokémon encontrados';
        return;
    }

    pokemonArray.forEach((pokemon, index) => {
        pokemonList.appendChild(createPokemonCard(pokemon, index));
    });

    const total = filteredPokemon.length;
    const shown = pokemonArray.length;
    resultsCount.textContent = `Mostrando ${shown} de ${total} Pokémon`;
}

// ============================================
// FILTERS & SEARCH
// ============================================

function applyFilters() {
    let result = [...allPokemon];

    // Filter by search query
    if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        result = result.filter(p =>
            p.name.toLowerCase().includes(q) ||
            formatId(p.id).includes(q) ||
            String(p.id).includes(q)
        );
    }

    // Filter by active types
    if (activeTypes.size > 0) {
        result = result.filter(p => {
            const types = getPokemonTypes(p);
            return [...activeTypes].every(t => types.includes(t));
        });
    }

    filteredPokemon = result;
    renderPokemon(filteredPokemon);
}

// ============================================
// FILTER SIDEBAR BUILD
// ============================================

function buildFilterPanel() {
    const types = Object.keys(TYPE_NAMES_ES);
    filterTypesContainer.innerHTML = '';

    types.forEach(type => {
        const div = document.createElement('div');
        div.className = 'group-type';

        div.innerHTML = `
            <input type="checkbox" name="${type}" id="filter-${type}" />
            <label for="filter-${type}">
                <span class="type-dot ${type}"></span>
                ${TYPE_NAMES_ES[type]}
            </label>
        `;

        div.querySelector('input').addEventListener('change', (e) => {
            if (e.target.checked) {
                activeTypes.add(type);
            } else {
                activeTypes.delete(type);
            }
            applyFilters();
        });

        filterTypesContainer.appendChild(div);
    });
}

function clearFilters() {
    activeTypes.clear();
    filterTypesContainer.querySelectorAll('input[type="checkbox"]').forEach(cb => {
        cb.checked = false;
    });
    applyFilters();
}

// ============================================
// LOAD MORE
// ============================================

async function loadMore() {
    if (isLoading || offset >= TOTAL_POKEMON) return;
    isLoading = true;
    btnLoadMore.textContent = 'Cargando...';
    btnLoadMore.disabled = true;

    try {
        const remaining = TOTAL_POKEMON - offset;
        const count = Math.min(BATCH_SIZE, remaining);
        const batch = await loadBatch(offset, count);
        allPokemon = [...allPokemon, ...batch];
        offset += count;
        applyFilters();

        if (offset >= TOTAL_POKEMON) {
            btnLoadMore.style.display = 'none';
        }
    } catch (err) {
        console.error('Error loading more:', err);
    } finally {
        isLoading = false;
        btnLoadMore.textContent = 'Cargar más Pokémon';
        btnLoadMore.disabled = false;
    }
}

// ============================================
// EVENT LISTENERS
// ============================================

// Search
btnSearch.addEventListener('click', () => {
    searchQuery = searchInput.value;
    applyFilters();
});

searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        searchQuery = searchInput.value;
        applyFilters();
    }
});

// Real-time search (debounced)
let searchTimeout;
searchInput.addEventListener('input', () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
        searchQuery = searchInput.value;
        applyFilters();
    }, 300);
});

// Filter sidebar toggle
btnFilter.addEventListener('click', () => {
    containerFilters.classList.toggle('active');
    overlay.classList.toggle('active');
});

overlay.addEventListener('click', () => {
    containerFilters.classList.remove('active');
    overlay.classList.remove('active');
});

// Clear filters
btnClearFilters.addEventListener('click', clearFilters);

// Load more
btnLoadMore.addEventListener('click', loadMore);

// ============================================
// UTILITIES
// ============================================

function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

// ============================================
// INIT
// ============================================

buildFilterPanel();
loadInitialPokemon();
