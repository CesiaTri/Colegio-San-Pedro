const SUPABASE_URL = 'https://ysodorfyloeodalkkphn.supabase.co';
const SUPABASE_KEY = 'sb_publishable_F_Ro8XGajrgNbBdlRPaTvQ_hZHiOOhO';

// Cliente de Supabase independiente para horario del estudiante visto por el tutor
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

const infoBloqueEl = document.querySelector('.info-bloque');
const cuerpoTablaHorario = document.getElementById('cuerpo-tabla-horario');

const DIAS_SEMANA = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
const HORARIOS_MANANA = {
    1: '08:00 - 08:40',
    2: '08:40 - 09:20',
    3: '09:20 - 10:00',
    4: '10:15 - 10:55',
    5: '10:55 - 11:35',
    6: '11:35 - 12:15'
};
const HORARIOS_TARDE = {
    1: '14:00 - 14:40',
    2: '14:40 - 15:20',
    3: '15:20 - 16:00',
    4: '16:15 - 16:55',
    5: '16:55 - 17:35',
    6: '17:35 - 18:15'
};

function formatearTurno(turno) {
    if (!turno) return '-';
    const limpio = String(turno).trim().toLowerCase();
    if (!limpio) return '-';
    return limpio.charAt(0).toUpperCase() + limpio.slice(1);
}

function normalizarDia(dia) {
    if (!dia) return '';
    const limpio = String(dia).trim().toLowerCase();
    const mapaDias = {
        'lunes': 'Lunes',
        'martes': 'Martes',
        'miercoles': 'Miércoles',
        'miércoles': 'Miércoles',
        'jueves': 'Jueves',
        'viernes': 'Viernes'
    };
    return mapaDias[limpio] || (limpio.charAt(0).toUpperCase() + limpio.slice(1));
}

function obtenerRangoHora(periodoNum, turnoTexto) {
    const esTarde = String(turnoTexto || '').trim().toLowerCase() === 'tarde';
    const tablaHoras = esTarde ? HORARIOS_TARDE : HORARIOS_MANANA;
    return tablaHoras[periodoNum] || `Periodo ${periodoNum}`;
}

function actualizarSubMenusEstudiantes(estudiantesUnicos, idActivo) {
    const subMenusConfig = [
        { id: 'sub-perfil', destino: 'perfil_est_tutor.html', esHorario: false },
        { id: 'sub-notas', destino: 'notas_est_tutor.html', esHorario: false },
        { id: 'sub-horario', destino: 'horario_est_tutor.html', esHorario: true },
        { id: 'sub-matricula', destino: 'matricula_est_tutor.html', esHorario: false },
        { id: 'sub-asistencia', destino: 'asistencia_est_tutor.html', esHorario: false }
    ];

    subMenusConfig.forEach(({ id, destino, esHorario }) => {
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
                const activaClase = esHorario && String(est.id_estudiante) === String(idActivo) ? ' activa' : '';
                return `<a href="${destino}?id=${encodeURIComponent(est.id_estudiante)}" class="sub-opcion${activaClase}">${etiqueta}</a>`;
            })
            .join('');
    });
}

function renderizarEncabezadoEstudiante(filaEst) {
    if (!infoBloqueEl || !filaEst) return;
    const nombreCompleto = filaEst.nombre_completo_estudiante
        || `${filaEst.nombres_estudiante || ''} ${filaEst.apellidos_estudiante || ''}`.trim()
        || '-';
    const cursoTexto = filaEst.curso_completo
        || (filaEst.nivel && filaEst.paralelo && filaEst.grado
            ? `${filaEst.nivel}° "${filaEst.paralelo}" de ${filaEst.grado}`
            : '-');
    const turnoTexto = formatearTurno(filaEst.turno);

    infoBloqueEl.innerHTML = `
        <div class="info-linea"><strong>Estudiante:</strong> ${nombreCompleto}</div>
        <div class="info-linea"><strong>Curso:</strong> ${cursoTexto} | <strong>Turno:</strong> ${turnoTexto}</div>
    `;
}

async function cargarHorarioEstudianteTutor() {
    if (!cuerpoTablaHorario || !ciGuardado) return;

    cuerpoTablaHorario.innerHTML = `
        <tr>
            <td colspan="6" style="text-align:center;">Cargando horario...</td>
        </tr>
    `;

    try {
        const ciNum = Number(ciGuardado);
        const filtroCiTutor = Number.isNaN(ciNum) ? ciGuardado : ciNum;

        const { data: vinculosData, error: vinculosErr } = await supabaseClient
            .from('vista_perfil_estudiante_tutor')
            .select('id_estudiante, nombres, apellidos, curso_completo, nivel, paralelo, grado, turno, gestion')
            .eq('ci_tutor', filtroCiTutor)
            .order('gestion', { ascending: false });

        if (vinculosErr) {
            console.error('Error consultando estudiantes asociados del tutor:', vinculosErr);
            cuerpoTablaHorario.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align:center;">Error al cargar los datos del estudiante.</td>
                </tr>
            `;
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
                        apellidos_estudiante: row.apellidos,
                        nombre_completo_estudiante: `${row.nombres || ''} ${row.apellidos || ''}`.trim(),
                        curso_completo: row.curso_completo,
                        nivel: row.nivel,
                        paralelo: row.paralelo,
                        grado: row.grado,
                        turno: row.turno,
                        gestion: row.gestion
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

        if (!estudianteSel) {
            cuerpoTablaHorario.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align:center;">No se encontró un estudiante asociado válido.</td>
                </tr>
            `;
            return;
        }

        renderizarEncabezadoEstudiante(estudianteSel);

        const estNum = Number(estudianteSel.id_estudiante);
        const filtroEst = Number.isNaN(estNum) ? estudianteSel.id_estudiante : estNum;

        const { data: horarioData, error: horarioErr } = await supabaseClient
            .from('vista_horario_estudiante_tutor')
            .select('id_horario, id_curso, id_asignacion_docente, dia_semana, periodo, turno, grado, nivel, paralelo, curso_completo, id_profesor, id_materia, gestion, nombre_materia, nombre_profesor, id_matricula, id_estudiante, ci_estudiante, nombre_completo_estudiante, id_tutor, parentesco, ci_tutor')
            .eq('id_estudiante', filtroEst)
            .eq('ci_tutor', filtroCiTutor)
            .order('periodo', { ascending: true });

        if (horarioErr) {
            console.error('Error consultando vista_horario_estudiante_tutor:', horarioErr);
            cuerpoTablaHorario.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align:center;">Error al cargar el horario del estudiante.</td>
                </tr>
            `;
            return;
        }

        const filasHorario = Array.isArray(horarioData) ? horarioData : [];
        if (filasHorario.length === 0) {
            cuerpoTablaHorario.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align:center;">No hay horario registrado para este estudiante.</td>
                </tr>
            `;
            return;
        }

        renderizarEncabezadoEstudiante(filasHorario[0]);
        const turnoActual = filasHorario[0].turno || estudianteSel.turno || 'Mañana';

        const mapaPeriodos = new Map();
        for (const fila of filasHorario) {
            const perNum = Number(fila.periodo);
            if (Number.isNaN(perNum)) continue;
            if (!mapaPeriodos.has(perNum)) {
                mapaPeriodos.set(perNum, {});
            }
            const diaNorm = normalizarDia(fila.dia_semana);
            if (diaNorm) {
                mapaPeriodos.get(perNum)[diaNorm] = fila.nombre_materia || '-';
            }
        }

        const periodosOrdenados = Array.from(mapaPeriodos.keys()).sort((a, b) => a - b);

        cuerpoTablaHorario.innerHTML = '';
        periodosOrdenados.forEach((per) => {
            const materiasDia = mapaPeriodos.get(per) || {};
            const tr = document.createElement('tr');
            const celdasDias = DIAS_SEMANA
                .map((dia) => `<td>${materiasDia[dia] || '-'}</td>`)
                .join('');

            tr.innerHTML = `
                <td class="col-hora">${obtenerRangoHora(per, turnoActual)}</td>
                ${celdasDias}
            `;

            cuerpoTablaHorario.appendChild(tr);
        });
    } catch (err) {
        console.error('Error inesperado cargando horario del estudiante:', err);
        cuerpoTablaHorario.innerHTML = `
            <tr>
                <td colspan="6" style="text-align:center;">Error inesperado al cargar el horario.</td>
            </tr>
        `;
    }
}

cargarHorarioEstudianteTutor();