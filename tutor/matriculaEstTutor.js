const SUPABASE_URL = 'https://ysodorfyloeodalkkphn.supabase.co';
const SUPABASE_KEY = 'sb_publishable_F_Ro8XGajrgNbBdlRPaTvQ_hZHiOOhO';

// Cliente de Supabase independiente para matrícula del estudiante visto por el tutor
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// --- MENÚ LATERAL ---
const btnAbrirMenu = document.getElementById('btnAbrirMenu');
const btnCerrarMenu = document.getElementById('btnCerrarMenu');
const menuLateral = document.getElementById('menuLateral');
const overlay = document.getElementById('overlay');
const btnCerrarSesion = document.getElementById('btnCerrarSesion');

function abrirMenu() {
    if (menuLateral) menuLateral.classList.add('abierto');
    if (overlay) overlay.classList.add('activo');
}

function cerrarMenu() {
    if (menuLateral) menuLateral.classList.remove('abierto');
    if (overlay) overlay.classList.remove('activo');
}

if (btnAbrirMenu) btnAbrirMenu.addEventListener('click', abrirMenu);
if (btnCerrarMenu) btnCerrarMenu.addEventListener('click', cerrarMenu);
if (overlay) overlay.addEventListener('click', cerrarMenu);

if (btnCerrarSesion) {
    btnCerrarSesion.addEventListener('click', function () {
        localStorage.removeItem('ci_usuario');
        localStorage.removeItem('rol_usuario');
        localStorage.removeItem('perfil_usuario');
    });
}

function toggleSubMenu(idSubMenu) {
    const submenu = document.getElementById(idSubMenu);
    if (!submenu) return;
    const boton = submenu.previousElementSibling;
    submenu.classList.toggle('abierto');
    if (boton) boton.classList.toggle('activo');
}

// --- VERIFICACIÓN DE SESIÓN Y ROL ---
const ciGuardado = localStorage.getItem('ci_usuario');
const rolGuardado = (localStorage.getItem('rol_usuario') || '').trim().toLowerCase();

if (!ciGuardado) {
    window.location.href = '../index.html';
} else if (rolGuardado && rolGuardado !== 'tutor') {
    window.location.href = `../${rolGuardado}/perfil_${rolGuardado}.html`;
}

// --- PARÁMETRO DE ESTUDIANTE DESDE LA URL ---
const urlParams = new URLSearchParams(window.location.search);
const idEstudianteParam = urlParams.get('id');

const matIdEl = document.getElementById('mat-id');
const matEstudianteEl = document.getElementById('mat-estudiante');
const matCursoEl = document.getElementById('mat-curso');
const matNivelEl = document.getElementById('mat-nivel');
const matTurnoEl = document.getElementById('mat-turno');
const matGestionEl = document.getElementById('mat-gestion');
const matFechaEl = document.getElementById('mat-fecha');
const spanEstado = document.getElementById('mat-estado');

function textoSeguro(valor, fallback = '-') {
    if (valor === null || valor === undefined) return fallback;
    const limpio = String(valor).trim();
    return limpio !== '' ? limpio : fallback;
}

function formatearFecha(fechaStr) {
    if (!fechaStr) return '-';
    const soloFecha = String(fechaStr).split('T')[0];
    const partes = soloFecha.split('-');
    if (partes.length === 3) {
        return `${partes[2]}/${partes[1]}/${partes[0]}`;
    }
    return soloFecha;
}

function actualizarSubMenusEstudiantes(estudiantesUnicos, idActivo) {
    const subMenusConfig = [
        { id: 'sub-perfil', destino: 'perfil_est_tutor.html', esMatricula: false },
        { id: 'sub-notas', destino: 'notas_est_tutor.html', esMatricula: false },
        { id: 'sub-horario', destino: 'horario_est_tutor.html', esMatricula: false },
        { id: 'sub-matricula', destino: 'matricula_est_tutor.html', esMatricula: true },
        { id: 'sub-asistencia', destino: 'asistencia_est_tutor.html', esMatricula: false }
    ];

    subMenusConfig.forEach(({ id, destino, esMatricula }) => {
        const subMenuEl = document.getElementById(id);
        if (!subMenuEl) return;

        if (estudiantesUnicos.length === 0) {
            subMenuEl.innerHTML = `<span class="sub-opcion">Sin estudiantes asociados</span>`;
            return;
        }

        subMenuEl.innerHTML = estudiantesUnicos
            .map((est, idx) => {
                const nombreCorto = `${est.nombres_estudiante || ''} ${est.apellidos_estudiante || ''}`.trim() || `Estudiante ${idx + 1}`;
                const etiqueta = `${nombreCorto} (Estudiante ${idx + 1})`;
                const activaClase = esMatricula && String(est.id_estudiante) === String(idActivo) ? ' activa' : '';
                return `<a href="${destino}?id=${encodeURIComponent(est.id_estudiante)}" class="sub-opcion${activaClase}">${etiqueta}</a>`;
            })
            .join('');
    });
}

function aplicarEstiloEstado(estadoTexto) {
    if (!spanEstado) return;
    const limpio = textoSeguro(estadoTexto, '-');
    spanEstado.textContent = limpio;
    spanEstado.className = 'estado-badge';

    const normalizado = limpio.toLowerCase();
    if (normalizado === 'pagado' || normalizado === 'pagada') {
        spanEstado.classList.add('estado-verde');
    } else {
        spanEstado.classList.add('estado-rojo');
    }
}

async function cargarMatriculaEstudianteTutor() {
    if (!ciGuardado) return;

    try {
        const ciNum = Number(ciGuardado);
        const filtroCiTutor = Number.isNaN(ciNum) ? ciGuardado : ciNum;

        // 1. Obtener estudiantes asociados al tutor desde vista_perfil_estudiante_tutor
        const { data: vinculosData, error: vinculosErr } = await supabaseClient
            .from('vista_perfil_estudiante_tutor')
            .select('id_estudiante, nombres, apellidos, gestion')
            .eq('ci_tutor', filtroCiTutor)
            .order('gestion', { ascending: false });

        if (vinculosErr) {
            console.error('Error consultando estudiantes asociados del tutor:', vinculosErr);
            return;
        }

        const mapaEstudiantes = new Map();
        for (const row of (vinculosData || [])) {
            if (row.id_estudiante !== null && row.id_estudiante !== undefined) {
                const clave = String(row.id_estudiante);
                if (!mapaEstudiantes.has(clave)) {
                    mapaEstudiantes.set(clave, {
                        id_estudiante: row.id_estudiante,
                        nombres_estudiante: row.nombres,
                        apellidos_estudiante: row.apellidos
                    });
                }
            }
        }

        const estudiantesUnicos = Array.from(mapaEstudiantes.values());
        let estudianteSel = null;
        if (idEstudianteParam) {
            estudianteSel = estudiantesUnicos.find((e) => String(e.id_estudiante) === String(idEstudianteParam)) || null;
        }
        if (!estudianteSel && estudiantesUnicos.length > 0) {
            estudianteSel = estudiantesUnicos[0];
        }

        const idEstActivo = estudianteSel ? estudianteSel.id_estudiante : idEstudianteParam;
        actualizarSubMenusEstudiantes(estudiantesUnicos, idEstActivo);

        if (!estudianteSel) return;

        // 2. Consultar matrícula desde vista_matricula_estudiante_tutor
        const estNum = Number(estudianteSel.id_estudiante);
        const filtroEst = Number.isNaN(estNum) ? estudianteSel.id_estudiante : estNum;

        const { data: matData, error: matErr } = await supabaseClient
            .from('vista_matricula_estudiante_tutor')
            .select('id_matricula, id_estudiante, id_curso, fecha_matricula, gestion, estado_matricula, ci_estudiante, codigo_rude, nombres_estudiante, apellidos_estudiante, nombre_completo_estudiante, id_tutor, parentesco, ci_tutor, turno, nivel_grado, grado, nivel, paralelo, curso_formateado')
            .eq('id_estudiante', filtroEst)
            .eq('ci_tutor', filtroCiTutor)
            .order('gestion', { ascending: false })
            .order('id_matricula', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (matErr) {
            console.error('Error consultando vista_matricula_estudiante_tutor:', matErr);
            return;
        }

        if (!matData) {
            if (matEstudianteEl) {
                matEstudianteEl.textContent = `${estudianteSel.nombres_estudiante || ''} ${estudianteSel.apellidos_estudiante || ''}`.trim() || '-';
            }
            aplicarEstiloEstado('Sin matrícula');
            return;
        }

        const nombreEst = matData.nombre_completo_estudiante
            || `${matData.nombres_estudiante || ''} ${matData.apellidos_estudiante || ''}`.trim()
            || '-';
        const cursoTexto = matData.curso_formateado
            || (matData.nivel && matData.grado && matData.paralelo
                ? `${matData.nivel}° de ${matData.grado} ("${matData.paralelo}")`
                : '-');

        if (matIdEl) matIdEl.textContent = textoSeguro(matData.id_matricula);
        if (matEstudianteEl) matEstudianteEl.textContent = textoSeguro(nombreEst);
        if (matCursoEl) matCursoEl.textContent = textoSeguro(cursoTexto);
        if (matNivelEl) matNivelEl.textContent = textoSeguro(matData.nivel_grado || matData.grado);
        if (matTurnoEl) matTurnoEl.textContent = textoSeguro(matData.turno);
        if (matGestionEl) matGestionEl.textContent = textoSeguro(matData.gestion);
        if (matFechaEl) matFechaEl.textContent = formatearFecha(matData.fecha_matricula);
        aplicarEstiloEstado(matData.estado_matricula);
    } catch (err) {
        console.error('Error inesperado cargando matrícula del estudiante:', err);
    }
}

cargarMatriculaEstudianteTutor();