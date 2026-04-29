// ============================================
// POKÉDEX — main.js
// ============================================

const API_BASE = 'https://pokeapi.co/api/v2';
const TAMAÑO_LOTE = 20;       // Pokémon que se cargan por vez
const TOTAL_POKEMON = 151;    // Solo Gen 1 (Kanto)

// Nombres de tipos traducidos al español
const NOMBRES_TIPOS_ES = {
    fire: 'Fuego', water: 'Agua', grass: 'Planta', electric: 'Eléctrico',
    ice: 'Hielo', fighting: 'Lucha', poison: 'Veneno', ground: 'Tierra',
    flying: 'Volador', psychic: 'Psíquico', bug: 'Bicho', rock: 'Roca',
    ghost: 'Fantasma', dragon: 'Dragón', dark: 'Siniestro', steel: 'Acero',
    fairy: 'Hada', normal: 'Normal', shadow: 'Sombra', unknown: 'Desconocido'
};

// ============================================
// ESTADO DE LA APLICACIÓN
// ============================================
let todosLosPokemon = [];     // Lista completa cargada desde la API
let pokemonFiltrados = [];    // Resultado luego de aplicar filtros y búsqueda
let tiposActivos = new Set(); // Tipos seleccionados en el panel lateral
let textoBusqueda = '';       // Texto del campo de búsqueda
let offset = 0;               // Cuántos Pokémon llevamos cargados
let cargando = false;         // Flag para evitar carga duplicada

// ============================================
// REFERENCIAS AL DOM
// ============================================
const listaPokemon = document.getElementById('pokemon-list');
const inputBusqueda = document.getElementById('search-input');
const btnBuscar = document.getElementById('btn-search');
const btnFiltrar = document.getElementById('btn-filter');
const contenedorFiltros = document.getElementById('container-filters');
const overlay = document.getElementById('overlay');
const contenedorTipos = document.getElementById('filter-types');
const btnLimpiarFiltros = document.getElementById('btn-clear-filters');
const contadorResultados = document.getElementById('results-count');
const btnCargarMas = document.getElementById('btn-load-more');

// ============================================
// PETICIONES A LA POKEAPI
// ============================================

// Obtiene los datos de un Pokémon individual por su ID
async function obtenerPokemon(id) {
    const res = await fetch(`${API_BASE}/pokemon/${id}`);
    if (!res.ok) throw new Error(`Error al obtener el Pokémon #${id}`);
    return res.json();
}

// Carga un lote de Pokémon en paralelo a partir de un índice de inicio
async function cargarLote(inicio, cantidad) {
    const ids = Array.from({ length: cantidad }, (_, i) => inicio + i + 1);
    const promesas = ids.map(id => obtenerPokemon(id).catch(() => null));
    const resultados = await Promise.all(promesas);
    return resultados.filter(Boolean); // Filtrar resultados nulos por errores
}

// Carga el primer lote de Pokémon al iniciar la página
async function cargarPokemonInicial() {
    cargando = true;
    try {
        const lote = await cargarLote(0, TAMAÑO_LOTE);
        todosLosPokemon = [...todosLosPokemon, ...lote];
        offset = TAMAÑO_LOTE;
        aplicarFiltros();

        // Mostrar botón de "Cargar más" si quedan Pokémon por cargar
        if (offset < TOTAL_POKEMON) {
            btnCargarMas.style.display = 'block';
        }
    } catch (err) {
        console.error('Error al cargar los Pokémon:', err);
        listaPokemon.innerHTML = `<div class="no-results">
            <h3>¡Ups!</h3>
            <p>No se pudieron cargar los Pokémon. Revisa tu conexión.</p>
        </div>`;
    } finally {
        cargando = false;
    }
}

// ============================================
// RENDERIZADO DE TARJETAS
// ============================================

// Extrae el array de tipos de un Pokémon
function obtenerTipos(pokemon) {
    return pokemon.types.map(t => t.type.name);
}

// Formatea el número de ID con ceros a la izquierda (ej: 1 → "001")
function formatearId(id) {
    return String(id).padStart(3, '0');
}

// Capitaliza la primera letra de un string
function capitalizar(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

// Crea y devuelve el elemento HTML de una tarjeta de Pokémon
function crearTarjeta(pokemon, indice) {
    const tipos = obtenerTipos(pokemon);
    const htmlTipos = tipos.map(tipo => {
        const nombreEs = NOMBRES_TIPOS_ES[tipo] || tipo;
        return `<span class="${tipo}">${nombreEs}</span>`;
    }).join('');

    // Usar el artwork oficial, con fallback al sprite normal
    const urlImagen = pokemon.sprites.other['official-artwork'].front_default
        || pokemon.sprites.front_default
        || `https://assets.pokemon.com/assets/cms2/img/pokedex/detail/${formatearId(pokemon.id)}.png`;

    const tarjeta = document.createElement('a');
    tarjeta.href = `pokemon.html?id=${pokemon.id}`;
    tarjeta.className = 'card-pokemon';

    // Retraso escalonado en la animación de entrada para efecto cascada
    tarjeta.style.animationDelay = `${(indice % TAMAÑO_LOTE) * 0.05}s`;
    tarjeta.innerHTML = `
        <div class="card-img">
            <img src="${urlImagen}" alt="${pokemon.name}" loading="lazy" />
        </div>
        <div class="card-info">
            <span class="pokemon-id">#${formatearId(pokemon.id)}</span>
            <h3>${capitalizar(pokemon.name)}</h3>
            <div class="card-types">${htmlTipos}</div>
        </div>
    `;
    return tarjeta;
}

// Renderiza el array de Pokémon en la grilla principal
function renderizarPokemon(arrayPokemon) {
    listaPokemon.innerHTML = '';

    if (arrayPokemon.length === 0) {
        listaPokemon.innerHTML = `<div class="no-results">
            <h3>Sin resultados</h3>
            <p>No se encontraron Pokémon con esos criterios.</p>
        </div>`;
        contadorResultados.textContent = '0 Pokémon encontrados';
        return;
    }

    arrayPokemon.forEach((pokemon, indice) => {
        listaPokemon.appendChild(crearTarjeta(pokemon, indice));
    });

    // Actualizar el contador de resultados visible
    const total = pokemonFiltrados.length;
    const mostrados = arrayPokemon.length;
    contadorResultados.textContent = `Mostrando ${mostrados} de ${total} Pokémon`;
}

// ============================================
// FILTROS Y BÚSQUEDA
// ============================================

// Aplica los filtros activos (búsqueda + tipos) y re-renderiza la lista
function aplicarFiltros() {
    let resultado = [...todosLosPokemon];

    // Filtrar por texto de búsqueda (nombre o número)
    if (textoBusqueda.trim()) {
        const q = textoBusqueda.trim().toLowerCase();
        resultado = resultado.filter(p =>
            p.name.toLowerCase().includes(q) ||
            formatearId(p.id).includes(q) ||
            String(p.id).includes(q)
        );
    }

    // Filtrar por tipos seleccionados (debe tener TODOS los tipos activos)
    if (tiposActivos.size > 0) {
        resultado = resultado.filter(p => {
            const tipos = obtenerTipos(p);
            return [...tiposActivos].every(t => tipos.includes(t));
        });
    }

    pokemonFiltrados = resultado;
    renderizarPokemon(pokemonFiltrados);
}

// ============================================
// PANEL LATERAL DE FILTROS POR TIPO
// ============================================

// Construye dinámicamente los checkboxes de tipos en el panel lateral
function construirPanelFiltros() {
    const tipos = Object.keys(NOMBRES_TIPOS_ES);
    contenedorTipos.innerHTML = '';

    tipos.forEach(tipo => {
        const div = document.createElement('div');
        div.className = 'group-type';

        div.innerHTML = `
            <input type="checkbox" name="${tipo}" id="filtro-${tipo}" />
            <label for="filtro-${tipo}">
                <span class="type-dot ${tipo}"></span>
                ${NOMBRES_TIPOS_ES[tipo]}
            </label>
        `;

        // Registrar / desregistrar el tipo activo al cambiar el checkbox
        div.querySelector('input').addEventListener('change', (e) => {
            if (e.target.checked) {
                tiposActivos.add(tipo);
            } else {
                tiposActivos.delete(tipo);
            }
            aplicarFiltros();
        });

        contenedorTipos.appendChild(div);
    });
}

// Limpia todos los filtros de tipo y re-renderiza
function limpiarFiltros() {
    tiposActivos.clear();
    contenedorTipos.querySelectorAll('input[type="checkbox"]').forEach(cb => {
        cb.checked = false;
    });
    aplicarFiltros();
}

// ============================================
// CARGAR MÁS POKÉMON
// ============================================

async function cargarMas() {
    if (cargando || offset >= TOTAL_POKEMON) return;
    cargando = true;
    btnCargarMas.textContent = 'Cargando...';
    btnCargarMas.disabled = true;

    try {
        const restantes = TOTAL_POKEMON - offset;
        const cantidad = Math.min(TAMAÑO_LOTE, restantes);
        const lote = await cargarLote(offset, cantidad);
        todosLosPokemon = [...todosLosPokemon, ...lote];
        offset += cantidad;
        aplicarFiltros();

        // Ocultar el botón si ya cargamos todos
        if (offset >= TOTAL_POKEMON) {
            btnCargarMas.style.display = 'none';
        }
    } catch (err) {
        console.error('Error al cargar más Pokémon:', err);
    } finally {
        cargando = false;
        btnCargarMas.textContent = 'Cargar más Pokémon';
        btnCargarMas.disabled = false;
    }
}

// ============================================
// EVENTOS
// ============================================

// Buscar al hacer click en el botón
btnBuscar.addEventListener('click', () => {
    textoBusqueda = inputBusqueda.value;
    aplicarFiltros();
});

// Buscar al presionar Enter en el campo
inputBusqueda.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        textoBusqueda = inputBusqueda.value;
        aplicarFiltros();
    }
});

// Búsqueda en tiempo real con debounce de 300ms para no saturar renders
let timeoutBusqueda;
inputBusqueda.addEventListener('input', () => {
    clearTimeout(timeoutBusqueda);
    timeoutBusqueda = setTimeout(() => {
        textoBusqueda = inputBusqueda.value;
        aplicarFiltros();
    }, 300);
});

// Abrir / cerrar el panel lateral de filtros
btnFiltrar.addEventListener('click', () => {
    contenedorFiltros.classList.toggle('active');
    overlay.classList.toggle('active');
});

// Cerrar el panel al hacer click en el overlay oscuro
overlay.addEventListener('click', () => {
    contenedorFiltros.classList.remove('active');
    overlay.classList.remove('active');
});

// Limpiar todos los filtros de tipo
btnLimpiarFiltros.addEventListener('click', limpiarFiltros);

// Cargar el siguiente lote de Pokémon
btnCargarMas.addEventListener('click', cargarMas);

// ============================================
// INICIALIZACIÓN
// ============================================

construirPanelFiltros();
cargarPokemonInicial();
