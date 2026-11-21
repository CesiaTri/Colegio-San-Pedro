const SUPABASE_URL = 'https://ysodorfyloeodalkkphn.supabase.co';
const SUPABASE_KEY = 'sb_publishable_F_Ro8XGajrgNbBdlRPaTvQ_hZHiOOhO';

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
const CACHE_REPORTE_CURSOS = 'cache_reporte_cursos_san_pedro';

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

// --- NORMALIZACIÓN Y TABLA DE CURSOS ---
let filasCursos = [];

const cuerpoTabla = document.getElementById('cuerpo-tabla');
const btnBuscar = document.getElementById('btnBuscar');

function normalizarTexto(val) {
    return String(val || '')
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
}

function normalizarNivel(nivelRaw) {
    const digitos = String(nivelRaw || '').replace(/\D/g, '');
    return digitos || normalizarTexto(nivelRaw);
}

function renderizarTabla(lista) {
    cuerpoTabla.innerHTML = '';

    if (!lista || lista.length === 0) {
        cuerpoTabla.innerHTML = `
            <tr>
                <td colspan="6" class="mensaje-vacio">No se encontraron cursos con los filtros seleccionados.</td>
            </tr>
        `;
        return;
    }

    lista.forEach((item) => {
        const idParam = encodeURIComponent(item.id);
        const fila = document.createElement('tr');
        fila.innerHTML = `
            <td>${item.id}</td>
            <td>${item.cursoVisible}</td>
            <td>${item.paralelo}</td>
            <td>${item.gradoVisible}</td>
            <td>${item.turnoVisible}</td>
            <td class="celda-acciones">
                <div class="grupo-botones-accion">
                    <a href="notas_reportes_administrativo.html?id=${idParam}" class="btn-accion btn-notas">Notas</a>
                    <a href="asistencias_reportes_administrativo.html?id=${idParam}" class="btn-accion btn-asistencias">Asistencias</a>
                    <a href="informacion_reportes_administrativo.html?id=${idParam}" class="btn-accion btn-informacion">Informacion</a>
                </div>
            </td>
        `;
        cuerpoTabla.appendChild(fila);
    });
}

function filtrarCursos() {
    const filtroCurso = normalizarNivel(document.getElementById('filtro-curso').value);
    const filtroParalelo = normalizarTexto(document.getElementById('filtro-paralelo').value);
    const filtroGrado = normalizarTexto(document.getElementById('filtro-grado').value);
    const filtroTurno = normalizarTexto(document.getElementById('filtro-turno').value);

    const filtrados = filasCursos.filter((item) => {
        const coincideCurso = !filtroCurso || normalizarNivel(item.nivel) === filtroCurso;
        const coincideParalelo = !filtroParalelo || normalizarTexto(item.paralelo) === filtroParalelo;
        const coincideGrado = !filtroGrado || normalizarTexto(item.grado) === filtroGrado;
        const coincideTurno = !filtroTurno || normalizarTexto(item.turno) === filtroTurno;

        return coincideCurso && coincideParalelo && coincideGrado && coincideTurno;
    });

    renderizarTabla(filtrados);
}

async function cargarCursosDesdeBD() {
    try {
        const cached = localStorage.getItem(CACHE_REPORTE_CURSOS);
        if (cached) {
            filasCursos = JSON.parse(cached);
            renderizarTabla(filasCursos);
        }
    } catch (_) {
        // Ignorar errores de caché
    }

    try {
        const { data: cursos, error } = await supabaseClient
            .from('vista_reporte_cursos_administrativo')
            .select('id, nivel, curso_visible, paralelo, grado, grado_visible, turno, turno_visible')
            .order('id', { ascending: true });

        if (error) {
            console.error('Error cargando cursos desde la vista:', error);
            if (filasCursos.length === 0) {
                cuerpoTabla.innerHTML = `
                    <tr>
                        <td colspan="6" class="mensaje-vacio">No se pudieron cargar los cursos desde Supabase.</td>
                    </tr>
                `;
            }
            return;
        }

        filasCursos = (cursos || []).map((c) => ({
            id: c.id,
            nivel: c.nivel || '',
            cursoVisible: c.curso_visible || '—',
            paralelo: c.paralelo || '—',
            grado: c.grado || '',
            gradoVisible: c.grado_visible || '—',
            turno: c.turno || '',
            turnoVisible: c.turno_visible || '—'
        }));

        renderizarTabla(filasCursos);

        try {
            localStorage.setItem(CACHE_REPORTE_CURSOS, JSON.stringify(filasCursos));
        } catch (_) {
            // Ignorar errores de caché
        }
    } catch (err) {
        console.error('Error inesperado cargando cursos:', err);
        if (filasCursos.length === 0) {
            cuerpoTabla.innerHTML = `
                <tr>
                    <td colspan="6" class="mensaje-vacio">Ocurrió un error al comunicarse con Supabase.</td>
                </tr>
            `;
        }
    }
}

btnBuscar.addEventListener('click', filtrarCursos);

if (verificarSesionAdmin()) {
    cargarCursosDesdeBD();
}