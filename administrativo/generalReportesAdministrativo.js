const SUPABASE_URL = 'https://ysodorfyloeodalkkphn.supabase.co';
const SUPABASE_KEY = 'sb_publishable_F_Ro8XGajrgNbBdlRPaTvQ_hZHiOOhO';

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
const CACHE_REPORTE_GENERAL = 'cache_reporte_general_san_pedro_v2';

// --- MENÚ LATERAL Y SUBMENÚS ---
const btnAbrirMenu = document.getElementById('btnAbrirMenu');
const btnCerrarMenu = document.getElementById('btnCerrarMenu');
const menuLateral = document.getElementById('menuLateral');
const overlay = document.getElementById('overlay');
const btnCerrarSesion = document.getElementById('btnCerrarSesion');

function abrirMenu() {
    menuLateral.classList.add('abierto');
    overlay.classList.add('activo');
}

function cerrarMenu() {
    menuLateral.classList.remove('abierto');
    overlay.classList.remove('activo');
}

btnAbrirMenu.addEventListener('click', abrirMenu);
btnCerrarMenu.addEventListener('click', cerrarMenu);
overlay.addEventListener('click', cerrarMenu);

function toggleSubMenu(idSubMenu) {
    const submenu = document.getElementById(idSubMenu);
    const boton = submenu.previousElementSibling;

    submenu.classList.toggle('abierto');
    boton.classList.toggle('activo');
}

if (btnCerrarSesion) {
    btnCerrarSesion.addEventListener('click', function () {
        localStorage.removeItem('ci_usuario');
        localStorage.removeItem('rol_usuario');
        localStorage.removeItem('perfil_usuario');
    });
}

// --- VERIFICAR SESIÓN ADMINISTRATIVA ---
function verificarSesionAdmin() {
    const ciGuardado = localStorage.getItem('ci_usuario');
    const rolGuardado = (localStorage.getItem('rol_usuario') || '').trim().toLowerCase();

    if (!ciGuardado) {
        window.location.href = '../index.html';
        return false;
    }

    if (rolGuardado && rolGuardado !== 'administrativo') {
        window.location.href = `../${rolGuardado}/perfil_${rolGuardado}.html`;
        return false;
    }

    return true;
}

// --- RENDERIZAR ESTADÍSTICAS ---
const elPrimariaTotal = document.getElementById('primaria-total');
const elPrimariaNinas = document.getElementById('primaria-ninas');
const elPrimariaNinos = document.getElementById('primaria-ninos');
const elPrimariaReprobados = document.getElementById('primaria-reprobados');

const elSecundariaTotal = document.getElementById('secundaria-total');
const elSecundariaNinas = document.getElementById('secundaria-ninas');
const elSecundariaNinos = document.getElementById('secundaria-ninos');
const elSecundariaReprobados = document.getElementById('secundaria-reprobados');

const estadoReporte = document.getElementById('estadoReporte');

function renderizarEstadisticas(stats) {
    elPrimariaTotal.textContent = stats.primaria.total;
    elPrimariaNinas.textContent = stats.primaria.ninas;
    elPrimariaNinos.textContent = stats.primaria.ninos;
    elPrimariaReprobados.textContent = stats.primaria.reprobados ?? 0;

    elSecundariaTotal.textContent = stats.secundaria.total;
    elSecundariaNinas.textContent = stats.secundaria.ninas;
    elSecundariaNinos.textContent = stats.secundaria.ninos;
    elSecundariaReprobados.textContent = stats.secundaria.reprobados ?? 0;
}

function mostrarErrorReporte(mensaje) {
    if (!estadoReporte) return;
    estadoReporte.textContent = mensaje;
    estadoReporte.className = 'estado-reporte error';
}

function ocultarErrorReporte() {
    if (!estadoReporte) return;
    estadoReporte.textContent = '';
    estadoReporte.className = 'estado-reporte';
}

async function cargarReporteGeneral() {
    // 1. Mostrar caché local al instante si existe
    try {
        const cached = localStorage.getItem(CACHE_REPORTE_GENERAL);
        if (cached) {
            renderizarEstadisticas(JSON.parse(cached));
        }
    } catch (_) {
        // Ignorar errores de lectura de caché
    }

    try {
        // 2. Consultar directamente la vista precalculada en PostgreSQL
        const { data, error } = await supabaseClient
            .from('vista_reporte_general_administrativo')
            .select('grado, total, ninas, ninos, reprobados');

        if (error) {
            console.error('Error cargando vista del reporte general:', error);
            mostrarErrorReporte('No se pudieron cargar las estadísticas desde Supabase.');
            return;
        }

        const estadisticas = {
            primaria: { total: 0, ninas: 0, ninos: 0, reprobados: 0 },
            secundaria: { total: 0, ninas: 0, ninos: 0, reprobados: 0 }
        };

        (data || []).forEach((fila) => {
            if (fila.grado === 'primaria' || fila.grado === 'secundaria') {
                estadisticas[fila.grado] = {
                    total: fila.total ?? 0,
                    ninas: fila.ninas ?? 0,
                    ninos: fila.ninos ?? 0,
                    reprobados: fila.reprobados ?? 0
                };
            }
        });

        ocultarErrorReporte();
        renderizarEstadisticas(estadisticas);

        try {
            localStorage.setItem(CACHE_REPORTE_GENERAL, JSON.stringify(estadisticas));
        } catch (_) {
            // Ignorar si el almacenamiento está lleno
        }
    } catch (err) {
        console.error('Error inesperado en reporte general:', err);
        mostrarErrorReporte('Ocurrió un error al comunicarse con Supabase.');
    }
}

if (verificarSesionAdmin()) {
    cargarReporteGeneral();
}