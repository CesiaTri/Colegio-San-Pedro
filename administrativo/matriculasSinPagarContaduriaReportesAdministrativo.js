const SUPABASE_URL = 'https://ysodorfyloeodalkkphn.supabase.co';
const SUPABASE_KEY = 'sb_publishable_F_Ro8XGajrgNbBdlRPaTvQ_hZHiOOhO';

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
const CACHE_MATRICULAS_SIN_PAGAR = 'cache_matriculas_sin_pagar_san_pedro_v1';

// --- MENÚ LATERAL Y SUBMENÚS ---
const btnAbrirMenu = document.getElementById('btnAbrirMenu');
const btnCerrarMenu = document.getElementById('btnCerrarMenu');
const menuLateral = document.getElementById('menuLateral');
const overlay = document.getElementById('overlay');
const btnCerrarSesion = document.getElementById('btnCerrarSesion');

function abrirMenu() {
    if (!menuLateral || !overlay) return;
    menuLateral.classList.add('abierto');
    overlay.classList.add('activo');
}

function cerrarMenu() {
    if (!menuLateral || !overlay) return;
    menuLateral.classList.remove('abierto');
    overlay.classList.remove('activo');
}

if (btnAbrirMenu) btnAbrirMenu.addEventListener('click', abrirMenu);
if (btnCerrarMenu) btnCerrarMenu.addEventListener('click', cerrarMenu);
if (overlay) overlay.addEventListener('click', cerrarMenu);

window.toggleSubMenu = function toggleSubMenu(idSubMenu) {
    const submenu = document.getElementById(idSubMenu);
    if (!submenu) return;
    const boton = submenu.previousElementSibling;

    submenu.classList.toggle('abierto');
    if (boton) boton.classList.toggle('activo');
};

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

// --- FORMATEO Y RENDERIZADO ---
const cuerpoTabla = document.getElementById('cuerpo-tabla');

function formatearCursoVisible(nivelRaw) {
    const digitos = String(nivelRaw || '').replace(/\D/g, '');
    const sufijos = {
        '1': '1ro',
        '2': '2do',
        '3': '3ro',
        '4': '4to',
        '5': '5to',
        '6': '6to'
    };
    return sufijos[digitos] || (digitos ? `${digitos}°` : (nivelRaw || '—'));
}

function formatearCapitalizado(val) {
    const limpio = String(val || '').trim();
    if (!limpio) return '—';
    return limpio.charAt(0).toUpperCase() + limpio.slice(1).toLowerCase();
}

function renderizarTabla(lista, mensajeVacio = 'No hay matrículas sin pagar registradas.') {
    if (!cuerpoTabla) return;
    cuerpoTabla.innerHTML = '';

    if (!lista || lista.length === 0) {
        cuerpoTabla.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; padding: 28px; color: #64748b; font-weight: 600;">
                    ${mensajeVacio}
                </td>
            </tr>
        `;
        return;
    }

    lista.forEach((item) => {
        const fila = document.createElement('tr');
        fila.innerHTML = `
            <td>${item.ciEstudiante}</td>
            <td>${item.curso}</td>
            <td>${item.paralelo}</td>
            <td>${item.grado}</td>
            <td>${item.turno}</td>
            <td class="celda-numero">${item.matriculasAcumuladas}</td>
            <td>${item.telefonoTutor}</td>
        `;
        cuerpoTabla.appendChild(fila);
    });
}

async function cargarMatriculasSinPagar() {
    try {
        const cached = localStorage.getItem(CACHE_MATRICULAS_SIN_PAGAR);
        if (cached) {
            renderizarTabla(JSON.parse(cached));
        }
    } catch (_) {
        // Ignorar errores de caché
    }

    try {
        const { data: filasVista, error } = await supabaseClient
            .from('vista_matriculas_sin_pagar_administrativo')
            .select('ci_estudiante, nivel, paralelo, grado, turno, matriculas_acumuladas, telefono_tutor');

        if (error) {
            console.error('Error cargando vista de matrículas sin pagar:', error);
            renderizarTabla([], 'No se pudieron cargar las matrículas sin pagar desde Supabase.');
            return;
        }

        const filas = (filasVista || []).map((item) => ({
            ciEstudiante: item.ci_estudiante ?? '—',
            curso: item.nivel ? formatearCursoVisible(item.nivel) : '—',
            paralelo: item.paralelo || '—',
            grado: item.grado ? formatearCapitalizado(item.grado) : '—',
            turno: item.turno ? formatearCapitalizado(item.turno) : '—',
            matriculasAcumuladas: item.matriculas_acumuladas ?? 1,
            telefonoTutor: item.telefono_tutor || '—'
        }));

        renderizarTabla(filas, 'No hay matrículas sin pagar en esta gestión.');

        try {
            localStorage.setItem(CACHE_MATRICULAS_SIN_PAGAR, JSON.stringify(filas));
        } catch (_) {
            // Ignorar errores de caché
        }
    } catch (err) {
        console.error('Error inesperado cargando matrículas sin pagar:', err);
        renderizarTabla([], 'Ocurrió un error al comunicarse con Supabase.');
    }
}

if (verificarSesionAdmin()) {
    cargarMatriculasSinPagar();
}