const SUPABASE_URL = 'https://ysodorfyloeodalkkphn.supabase.co';
const SUPABASE_KEY = 'sb_publishable_F_Ro8XGajrgNbBdlRPaTvQ_hZHiOOhO';

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
const PREFIJO_CACHE_ASISTENCIAS = 'cache_asistencias_curso_admin_';

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

// --- FORMATEO Y CUADRÍCULA DE ASISTENCIA ---
const elCursoNombre = document.getElementById('curso-nombre');
const elCursoGrado = document.getElementById('curso-grado');
const elCursoTurno = document.getElementById('curso-turno');
const selectMes = document.getElementById('select-mes');
const filaEncabezado = document.getElementById('fila-encabezado-dias');
const cuerpoTabla = document.getElementById('cuerpo-tabla-asistencias');

let cursoActual = null;
let estudiantesMatriculados = []; // [{ id_matricula, nombre_completo }]
let mapaAsistencias = new Map(); // `${id_matricula}-${dia}` -> estado

function formatearCursoVisible(nivelRaw, paraleloRaw) {
    const digitos = String(nivelRaw || '').replace(/\D/g, '');
    const sufijos = {
        '1': '1ro',
        '2': '2do',
        '3': '3ro',
        '4': '4to',
        '5': '5to',
        '6': '6to'
    };
    const nivelTexto = sufijos[digitos] || (digitos ? `${digitos}°` : (nivelRaw || '—'));
    const paraleloTexto = String(paraleloRaw || '').trim().toUpperCase();
    return paraleloTexto ? `${nivelTexto} ${paraleloTexto}` : nivelTexto;
}

function formatearCapitalizado(val) {
    const limpio = String(val || '').trim();
    if (!limpio) return '—';
    return limpio.charAt(0).toUpperCase() + limpio.slice(1).toLowerCase();
}

function renderizarCabeceraCurso(curso) {
    if (!curso) {
        elCursoNombre.textContent = '—';
        elCursoGrado.textContent = '—';
        elCursoTurno.textContent = '—';
        return;
    }
    elCursoNombre.textContent = formatearCursoVisible(curso.nivel, curso.paralelo);
    elCursoGrado.textContent = formatearCapitalizado(curso.grado);
    elCursoTurno.textContent = formatearCapitalizado(curso.turno);
}

function obtenerBadgePorEstado(estadoRaw, esDomingo) {
    if (esDomingo) {
        return `<span class="badge-estado estado-sin-clases" title="Sin clases">--</span>`;
    }

    const estado = String(estadoRaw || '').trim().toLowerCase();
    if (estado === 'presente') {
        return `<span class="badge-estado estado-presente" title="Presente">✓</span>`;
    }
    if (estado === 'ausente') {
        return `<span class="badge-estado estado-ausente" title="Ausente">✗</span>`;
    }
    if (estado === 'atraso') {
        return `<span class="badge-estado estado-atraso" title="Atraso">A</span>`;
    }
    if (estado === 'licencia') {
        return `<span class="badge-estado estado-licencia" title="Licencia">L</span>`;
    }

    return `<span class="badge-estado estado-sin-clases" title="Sin registro">-</span>`;
}

function generarCuadriculaAsistencia(mesIndex) {
    const anio = 2026;
    const totalDias = new Date(anio, mesIndex + 1, 0).getDate();

    let thHTML = '<th class="columna-estudiante">Estudiante</th>';
    for (let dia = 1; dia <= totalDias; dia++) {
        thHTML += `<th>${dia}</th>`;
    }
    filaEncabezado.innerHTML = thHTML;

    if (!estudiantesMatriculados || estudiantesMatriculados.length === 0) {
        cuerpoTabla.innerHTML = `
            <tr>
                <td colspan="${totalDias + 1}" class="mensaje-vacio">No hay estudiantes matriculados en este curso.</td>
            </tr>
        `;
        return;
    }

    cuerpoTabla.innerHTML = '';
    estudiantesMatriculados.forEach((est) => {
        const tr = document.createElement('tr');
        let tdHTML = `<td class="columna-estudiante">${est.nombre_completo}</td>`;

        for (let dia = 1; dia <= totalDias; dia++) {
            const fechaActual = new Date(anio, mesIndex, dia);
            const esDomingo = fechaActual.getDay() === 0;
            const estado = mapaAsistencias.get(`${est.id_matricula}-${dia}`) || '';

            tdHTML += `<td>${obtenerBadgePorEstado(estado, esDomingo)}</td>`;
        }

        tr.innerHTML = tdHTML;
        cuerpoTabla.appendChild(tr);
    });
}

function extraerIdCurso(idRaw) {
    if (!idRaw) return null;
    const digitos = String(idRaw).replace(/\D/g, '').trim();
    const num = Number.parseInt(digitos, 10);
    return Number.isNaN(num) || num <= 0 ? null : num;
}

async function cargarAsistenciasMes(idCurso, mesIndex) {
    const anio = 2026;
    const mesNumero = mesIndex + 1;
    const mesPad = String(mesNumero).padStart(2, '0');

    const cacheKey = `${PREFIJO_CACHE_ASISTENCIAS}${idCurso}_${anio}_${mesPad}`;
    try {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
            const parsed = JSON.parse(cached);
            estudiantesMatriculados = parsed.estudiantes || [];
            mapaAsistencias = new Map(parsed.asistencias || []);
            generarCuadriculaAsistencia(mesIndex);
        }
    } catch (_) {
        // Ignorar errores de caché
    }

    try {
        // Filtra asistencias del mes/año solicitado y también trae matrículas del curso sin asistencia ese mes
        const { data: filasVista, error: vistaError } = await supabaseClient
            .from('vista_asistencias_curso_administrativo')
            .select('id_matricula, nombre_completo, anio, mes, dia, estado')
            .eq('id_curso', idCurso)
            .or(`and(anio.eq.${anio},mes.eq.${mesNumero}),anio.is.null`);

        if (vistaError) {
            console.error('Error cargando vista de asistencias:', vistaError);
            if (estudiantesMatriculados.length === 0) {
                generarCuadriculaAsistencia(mesIndex);
            }
            return;
        }

        const mapaEstudiantes = new Map();
        const nuevoMapaAsist = new Map();

        (filasVista || []).forEach((fila) => {
            if (fila.id_matricula != null && !mapaEstudiantes.has(fila.id_matricula)) {
                mapaEstudiantes.set(fila.id_matricula, {
                    id_matricula: fila.id_matricula,
                    nombre_completo: fila.nombre_completo || '—'
                });
            }

            if (
                fila.id_matricula != null &&
                fila.anio === anio &&
                fila.mes === mesNumero &&
                fila.dia != null &&
                fila.estado
            ) {
                nuevoMapaAsist.set(`${fila.id_matricula}-${fila.dia}`, fila.estado);
            }
        });

        estudiantesMatriculados = Array.from(mapaEstudiantes.values()).sort((a, b) =>
            a.nombre_completo.localeCompare(b.nombre_completo, 'es', { sensitivity: 'base' })
        );
        mapaAsistencias = nuevoMapaAsist;
        generarCuadriculaAsistencia(mesIndex);

        try {
            localStorage.setItem(
                cacheKey,
                JSON.stringify({
                    estudiantes: estudiantesMatriculados,
                    asistencias: Array.from(mapaAsistencias.entries())
                })
            );
        } catch (_) {
            // Ignorar errores de caché
        }
    } catch (err) {
        console.error('Error inesperado cargando asistencias:', err);
        if (estudiantesMatriculados.length === 0) {
            generarCuadriculaAsistencia(mesIndex);
        }
    }
}

async function inicializarAsistencias() {
    const params = new URLSearchParams(window.location.search);
    const idParam = extraerIdCurso(params.get('id'));
    const mesIndexInicial = Number.parseInt(selectMes.value, 10) || 10;

    try {
        let cursoRow = null;
        if (idParam) {
            const { data } = await supabaseClient
                .from('curso')
                .select('id, turno, grado, nivel, paralelo')
                .eq('id', idParam)
                .maybeSingle();
            cursoRow = data;
        } else {
            const { data } = await supabaseClient
                .from('curso')
                .select('id, turno, grado, nivel, paralelo')
                .order('id', { ascending: true })
                .limit(1)
                .maybeSingle();
            cursoRow = data;
        }

        cursoActual = cursoRow || null;
        renderizarCabeceraCurso(cursoActual);

        if (cursoActual?.id) {
            await cargarAsistenciasMes(cursoActual.id, mesIndexInicial);
        } else {
            estudiantesMatriculados = [];
            mapaAsistencias = new Map();
            generarCuadriculaAsistencia(mesIndexInicial);
        }
    } catch (err) {
        console.error('Error inicializando asistencias:', err);
        renderizarCabeceraCurso(null);
        generarCuadriculaAsistencia(mesIndexInicial);
    }
}

selectMes.addEventListener('change', function () {
    const mesIndex = Number.parseInt(this.value, 10);
    if (cursoActual?.id) {
        cargarAsistenciasMes(cursoActual.id, mesIndex);
    } else {
        generarCuadriculaAsistencia(mesIndex);
    }
});

if (verificarSesionAdmin()) {
    inicializarAsistencias();
}