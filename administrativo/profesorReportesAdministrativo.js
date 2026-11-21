const SUPABASE_URL = 'https://ysodorfyloeodalkkphn.supabase.co';
const SUPABASE_KEY = 'sb_publishable_F_Ro8XGajrgNbBdlRPaTvQ_hZHiOOhO';

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
const CACHE_REPORTE_PROFESORES = 'cache_reporte_profesores_san_pedro';
const CACHE_MATERIAS_PROFESORES = 'cache_materias_reporte_profesores_san_pedro';

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

// --- NORMALIZACIÓN Y SELECT DE MATERIAS ---
let filasProfesores = [];

const selectMateria = document.getElementById('filtro-materia');
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

function formatearCursoVisible(nivelRaw) {
    const digitos = String(nivelRaw || '').replace(/\D/g, '');
    if (!digitos) return nivelRaw || '—';
    const sufijos = {
        '1': '1ro',
        '2': '2do',
        '3': '3ro',
        '4': '4to',
        '5': '5to',
        '6': '6to'
    };
    return sufijos[digitos] || `${digitos}°`;
}

function poblarSelectMaterias(listaNombres) {
    if (!selectMateria) return;

    const valorPrevio = selectMateria.value;
    const unicosOrdenados = Array.from(
        new Set(
            (listaNombres || [])
                .map((m) => String(m || '').trim())
                .filter((m) => m.length > 0 && m !== '—')
        )
    ).sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }));

    selectMateria.innerHTML = '<option value="">Todas las materias</option>';

    unicosOrdenados.forEach((nombreMateria) => {
        const option = document.createElement('option');
        option.value = nombreMateria;
        option.textContent = nombreMateria;
        selectMateria.appendChild(option);
    });

    if (valorPrevio && unicosOrdenados.some((m) => normalizarTexto(m) === normalizarTexto(valorPrevio))) {
        const coincidencia = unicosOrdenados.find((m) => normalizarTexto(m) === normalizarTexto(valorPrevio));
        selectMateria.value = coincidencia;
    } else {
        selectMateria.value = '';
    }
}

function renderizarTabla(lista) {
    cuerpoTabla.innerHTML = '';

    if (!lista || lista.length === 0) {
        cuerpoTabla.innerHTML = `
            <tr>
                <td colspan="9" class="mensaje-vacio">No se encontraron profesores con los filtros seleccionados.</td>
            </tr>
        `;
        return;
    }

    lista.forEach((prof) => {
        const fila = document.createElement('tr');
        fila.innerHTML = `
            <td>${prof.ci}</td>
            <td>${prof.nombre}</td>
            <td>${prof.apellido}</td>
            <td>${prof.materia}</td>
            <td>${prof.cursoVisible}</td>
            <td>${prof.paralelo}</td>
            <td>${prof.grado}</td>
            <td>${prof.turno}</td>
            <td class="celda-accion">
                <a href="perfil_profesor_administrativo.html?ci=${encodeURIComponent(prof.ci)}" class="btn-ver">Ver</a>
            </td>
        `;
        cuerpoTabla.appendChild(fila);
    });
}

function filtrarProfesores() {
    const filtroMateria = normalizarTexto(selectMateria ? selectMateria.value : '');
    const filtroCurso = normalizarNivel(document.getElementById('filtro-curso').value);
    const filtroParalelo = normalizarTexto(document.getElementById('filtro-paralelo').value);
    const filtroGrado = normalizarTexto(document.getElementById('filtro-grado').value);
    const filtroTurno = normalizarTexto(document.getElementById('filtro-turno').value);

    const filtrados = filasProfesores.filter((prof) => {
        const coincideMateria = !filtroMateria || normalizarTexto(prof.materia) === filtroMateria;
        const coincideCurso = !filtroCurso || normalizarNivel(prof.curso) === filtroCurso;
        const coincideParalelo = !filtroParalelo || normalizarTexto(prof.paralelo) === filtroParalelo;
        const coincideGrado = !filtroGrado || normalizarTexto(prof.grado) === filtroGrado;
        const coincideTurno = !filtroTurno || normalizarTexto(prof.turno) === filtroTurno;

        return coincideMateria && coincideCurso && coincideParalelo && coincideGrado && coincideTurno;
    });

    renderizarTabla(filtrados);
}

// --- CARGAR MATERIAS Y PROFESORES DESDE LA VISTA EN SUPABASE ---
async function cargarProfesoresDesdeBD() {
    try {
        const cachedMaterias = localStorage.getItem(CACHE_MATERIAS_PROFESORES);
        if (cachedMaterias) {
            poblarSelectMaterias(JSON.parse(cachedMaterias));
        }
    } catch (_) {
        // Ignorar errores de caché
    }

    try {
        const cachedFilas = localStorage.getItem(CACHE_REPORTE_PROFESORES);
        if (cachedFilas) {
            filasProfesores = JSON.parse(cachedFilas);
            renderizarTabla(filasProfesores);
        }
    } catch (_) {
        // Ignorar errores de caché
    }

    try {
        const [
            { data: vistaFilas, error: vistaError },
            { data: materiasCatalogo, error: matError }
        ] = await Promise.all([
            supabaseClient
                .from('vista_reporte_profesores_administrativo')
                .select('ci, nombre, apellido, materia, curso, paralelo, grado, turno, gestion'),
            supabaseClient
                .from('materia')
                .select('nombre')
                .order('nombre')
        ]);

        if (vistaError) {
            console.error('Error cargando vista de profesores:', vistaError);
            if (filasProfesores.length === 0) {
                cuerpoTabla.innerHTML = `
                    <tr>
                        <td colspan="9" class="mensaje-vacio">No se pudieron cargar los profesores desde Supabase.</td>
                    </tr>
                `;
            }
            return;
        }

        const nombresMateriasBD = [];
        if (!matError && materiasCatalogo) {
            materiasCatalogo.forEach((m) => {
                if (m.nombre) nombresMateriasBD.push(m.nombre);
            });
        }

        const construidas = (vistaFilas || []).map((fila) => {
            const nombreMateria = fila.materia || '—';
            if (nombreMateria !== '—') {
                nombresMateriasBD.push(nombreMateria);
            }

            const nivelLimpio = fila.curso ? String(fila.curso).trim() : '';

            return {
                ci: fila.ci,
                nombre: fila.nombre || '—',
                apellido: fila.apellido || '—',
                materia: nombreMateria,
                curso: nivelLimpio,
                cursoVisible: nivelLimpio ? formatearCursoVisible(nivelLimpio) : '—',
                paralelo: fila.paralelo || '—',
                grado: fila.grado || '—',
                turno: fila.turno || '—'
            };
        });

        poblarSelectMaterias(nombresMateriasBD);
        filasProfesores = construidas;
        renderizarTabla(filasProfesores);

        try {
            localStorage.setItem(CACHE_MATERIAS_PROFESORES, JSON.stringify(nombresMateriasBD));
            localStorage.setItem(CACHE_REPORTE_PROFESORES, JSON.stringify(filasProfesores));
        } catch (_) {
            // Ignorar errores de caché
        }
    } catch (err) {
        console.error('Error inesperado cargando profesores:', err);
        if (filasProfesores.length === 0) {
            cuerpoTabla.innerHTML = `
                <tr>
                    <td colspan="9" class="mensaje-vacio">Ocurrió un error al comunicarse con Supabase.</td>
                </tr>
            `;
        }
    }
}

btnBuscar.addEventListener('click', filtrarProfesores);

if (verificarSesionAdmin()) {
    cargarProfesoresDesdeBD();
}