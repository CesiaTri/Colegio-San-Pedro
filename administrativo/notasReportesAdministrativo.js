const SUPABASE_URL = 'https://ysodorfyloeodalkkphn.supabase.co';
const SUPABASE_KEY = 'sb_publishable_F_Ro8XGajrgNbBdlRPaTvQ_hZHiOOhO';

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
const PREFIJO_CACHE_NOTAS_CURSO = 'cache_notas_curso_materias_admin_v2_';

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

// --- FORMATEO Y RENDERIZADO ---
const elCursoNombre = document.getElementById('curso-nombre');
const elCursoParalelo = document.getElementById('curso-paralelo');
const elCursoGrado = document.getElementById('curso-grado');
const elCursoTurno = document.getElementById('curso-turno');
const elCursoReprobados = document.getElementById('curso-reprobados');
const cuerpoTabla = document.getElementById('cuerpo-tabla');

function extraerIdCurso(raw) {
    if (!raw) return null;
    const digitos = String(raw).replace(/\D/g, '').trim();
    const num = Number.parseInt(digitos, 10);
    return Number.isNaN(num) || num <= 0 ? null : num;
}

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

function renderizarCabeceraCurso(curso, totalReprobadosCurso = 0) {
    if (!curso) {
        elCursoNombre.textContent = '—';
        elCursoParalelo.textContent = '—';
        elCursoGrado.textContent = '—';
        elCursoTurno.textContent = '—';
        elCursoReprobados.textContent = '0';
        return;
    }
    elCursoNombre.textContent = formatearCursoVisible(curso.nivel);
    elCursoParalelo.textContent = String(curso.paralelo || '—').trim().toUpperCase();
    elCursoGrado.textContent = formatearCapitalizado(curso.grado);
    elCursoTurno.textContent = formatearCapitalizado(curso.turno);
    elCursoReprobados.textContent = String(totalReprobadosCurso ?? 0);
}

function renderizarMaterias(cursoId, lista) {
    cuerpoTabla.innerHTML = '';

    if (!lista || lista.length === 0) {
        cuerpoTabla.innerHTML = `
            <tr>
                <td colspan="4" class="mensaje-vacio">No hay materias asignadas a este curso.</td>
            </tr>
        `;
        return;
    }

    lista.forEach((item) => {
        const params = new URLSearchParams();
        if (item.idAsignacion) params.set('id_asignacion', item.idAsignacion);
        if (cursoId) params.set('id_curso', cursoId);
        if (item.idMateria) params.set('id_materia', item.idMateria);

        const urlVer = `ver_notas_reportes_administrativo.html?${params.toString()}`;
        const fila = document.createElement('tr');
        fila.innerHTML = `
            <td>${item.materia}</td>
            <td>${item.profesor}</td>
            <td class="celda-reprobados">${item.reprobados ?? 0}</td>
            <td class="celda-accion">
                <a href="${urlVer}" class="btn-ver">Ver</a>
            </td>
        `;
        cuerpoTabla.appendChild(fila);
    });
}

async function cargarMateriasDelCurso() {
    const params = new URLSearchParams(window.location.search);
    const idCursoParam = extraerIdCurso(params.get('id'));

    if (idCursoParam) {
        try {
            const cached = localStorage.getItem(`${PREFIJO_CACHE_NOTAS_CURSO}${idCursoParam}`);
            if (cached) {
                const parsed = JSON.parse(cached);
                renderizarCabeceraCurso(parsed.curso, parsed.totalReprobadosCurso ?? 0);
                renderizarMaterias(idCursoParam, parsed.materias);
            }
        } catch (_) {
            // Ignorar errores de caché
        }
    }

    try {
        let idCursoObjetivo = idCursoParam;

        if (!idCursoObjetivo) {
            const { data: primerCurso, error: primerError } = await supabaseClient
                .from('vista_notas_curso_administrativo')
                .select('id_curso')
                .order('id_curso', { ascending: true })
                .limit(1)
                .maybeSingle();

            if (primerError) {
                console.error('Error consultando primer curso en la vista:', primerError);
                cuerpoTabla.innerHTML = `
                    <tr>
                        <td colspan="4" class="mensaje-vacio">No se pudo cargar la información del curso.</td>
                    </tr>
                `;
                return;
            }

            idCursoObjetivo = primerCurso?.id_curso ?? null;
        }

        if (!idCursoObjetivo) {
            renderizarCabeceraCurso(null, 0);
            cuerpoTabla.innerHTML = `
                <tr>
                    <td colspan="4" class="mensaje-vacio">No se encontró el curso solicitado.</td>
                </tr>
            `;
            return;
        }

        const { data: filasVista, error: vistaError } = await supabaseClient
            .from('vista_notas_curso_administrativo')
            .select('id_curso, nivel, paralelo, grado, turno, total_reprobados_curso, id_asignacion, id_materia, materia, profesor, reprobados')
            .eq('id_curso', idCursoObjetivo);

        if (vistaError) {
            console.error('Error cargando vista de notas del curso:', vistaError);
            cuerpoTabla.innerHTML = `
                <tr>
                    <td colspan="4" class="mensaje-vacio">No se pudieron cargar las materias del curso.</td>
                </tr>
            `;
            return;
        }

        if (!filasVista || filasVista.length === 0) {
            renderizarCabeceraCurso(null, 0);
            cuerpoTabla.innerHTML = `
                <tr>
                    <td colspan="4" class="mensaje-vacio">No se encontró el curso solicitado.</td>
                </tr>
            `;
            return;
        }

        const primeraFila = filasVista[0];
        const cursoInfo = {
            id: primeraFila.id_curso,
            nivel: primeraFila.nivel,
            paralelo: primeraFila.paralelo,
            grado: primeraFila.grado,
            turno: primeraFila.turno
        };
        const totalReprobadosCurso = primeraFila.total_reprobados_curso ?? 0;

        renderizarCabeceraCurso(cursoInfo, totalReprobadosCurso);

        // Si el curso no tiene asignaciones docentes, la vista devuelve 1 fila con id_asignacion = null
        const filasMaterias = filasVista
            .filter((f) => f.id_asignacion !== null && f.id_asignacion !== undefined)
            .map((f) => ({
                idAsignacion: f.id_asignacion,
                idMateria: f.id_materia,
                materia: f.materia || '—',
                profesor: f.profesor || '—',
                reprobados: f.reprobados ?? 0
            }));

        renderizarMaterias(cursoInfo.id, filasMaterias);

        try {
            localStorage.setItem(
                `${PREFIJO_CACHE_NOTAS_CURSO}${cursoInfo.id}`,
                JSON.stringify({
                    curso: cursoInfo,
                    totalReprobadosCurso,
                    materias: filasMaterias
                })
            );
        } catch (_) {
            // Ignorar errores de caché
        }
    } catch (err) {
        console.error('Error inesperado cargando materias del curso:', err);
        cuerpoTabla.innerHTML = `
            <tr>
                <td colspan="4" class="mensaje-vacio">Ocurrió un error al comunicarse con Supabase.</td>
            </tr>
        `;
    }
}

if (verificarSesionAdmin()) {
    cargarMateriasDelCurso();
}