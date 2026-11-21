const SUPABASE_URL = 'https://ysodorfyloeodalkkphn.supabase.co';
const SUPABASE_KEY = 'sb_publishable_F_Ro8XGajrgNbBdlRPaTvQ_hZHiOOhO';

// Cliente de Supabase independiente para notas del estudiante visto por el tutor
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
const tbodyNotas = document.getElementById('cuerpo-tabla-notas');

function formatearTurno(turno) {
    if (!turno) return '-';
    const limpio = String(turno).trim().toLowerCase();
    if (!limpio) return '-';
    return limpio.charAt(0).toUpperCase() + limpio.slice(1);
}

function actualizarSubMenusEstudiantes(estudiantesUnicos, idActivo) {
    const subMenusConfig = [
        { id: 'sub-perfil', destino: 'perfil_est_tutor.html', esNotas: false },
        { id: 'sub-notas', destino: 'notas_est_tutor.html', esNotas: true },
        { id: 'sub-horario', destino: 'horario_est_tutor.html', esNotas: false },
        { id: 'sub-matricula', destino: 'matricula_est_tutor.html', esNotas: false },
        { id: 'sub-asistencia', destino: 'asistencia_est_tutor.html', esNotas: false }
    ];

    subMenusConfig.forEach(({ id, destino, esNotas }) => {
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
                const activaClase = esNotas && String(est.id_estudiante) === String(idActivo) ? ' activa' : '';
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

async function cargarNotasEstudianteTutor() {
    if (!tbodyNotas || !ciGuardado) return;

    tbodyNotas.innerHTML = `
        <tr>
            <td colspan="5" style="text-align:center;">Cargando calificaciones...</td>
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
            tbodyNotas.innerHTML = `
                <tr>
                    <td colspan="5" style="text-align:center;">Error al cargar los datos del estudiante.</td>
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
            tbodyNotas.innerHTML = `
                <tr>
                    <td colspan="5" style="text-align:center;">No se encontró un estudiante asociado válido.</td>
                </tr>
            `;
            return;
        }

        renderizarEncabezadoEstudiante(estudianteSel);

        const estNum = Number(estudianteSel.id_estudiante);
        const filtroEst = Number.isNaN(estNum) ? estudianteSel.id_estudiante : estNum;

        const { data: notasData, error: notasErr } = await supabaseClient
            .from('vista_notas_estudiante_tutor')
            .select('id_nota, trimestre, puntaje, id_matricula, gestion, id_estudiante, ci_tutor, curso_completo, turno, id_materia, nombre_materia')
            .eq('id_estudiante', filtroEst)
            .eq('ci_tutor', filtroCiTutor);

        if (notasErr) {
            console.error('Error consultando vista_notas_estudiante_tutor:', notasErr);
            tbodyNotas.innerHTML = `
                <tr>
                    <td colspan="5" style="text-align:center;">Error al cargar las calificaciones.</td>
                </tr>
            `;
            return;
        }

        const filasNotas = Array.isArray(notasData) ? notasData : [];
        if (filasNotas.length === 0) {
            tbodyNotas.innerHTML = `
                <tr>
                    <td colspan="5" style="text-align:center;">No hay calificaciones registradas para este estudiante.</td>
                </tr>
            `;
            return;
        }

        renderizarEncabezadoEstudiante(filasNotas[0]);

        const mapaMaterias = new Map();
        for (const fila of filasNotas) {
            const claveMateria = `${fila.gestion ?? ''}__${fila.id_materia ?? fila.nombre_materia}`;
            if (!mapaMaterias.has(claveMateria)) {
                mapaMaterias.set(claveMateria, {
                    materia: fila.nombre_materia || 'Sin materia',
                    trimestres: { 1: null, 2: null, 3: null }
                });
            }
            const registro = mapaMaterias.get(claveMateria);
            const trimNum = Number(fila.trimestre);
            const puntNum = Number(fila.puntaje);
            if ([1, 2, 3].includes(trimNum) && !Number.isNaN(puntNum)) {
                registro.trimestres[trimNum] = puntNum;
            }
        }

        const materiasOrdenadas = Array.from(mapaMaterias.values())
            .sort((a, b) => a.materia.localeCompare(b.materia, 'es'));

        tbodyNotas.innerHTML = '';
        materiasOrdenadas.forEach((item) => {
            const n1 = item.trimestres[1];
            const n2 = item.trimestres[2];
            const n3 = item.trimestres[3];

            const valoresPresentes = [n1, n2, n3].filter((v) => v !== null && v !== undefined);
            const notaFinal = valoresPresentes.length > 0
                ? Math.round(valoresPresentes.reduce((acc, val) => acc + val, 0) / valoresPresentes.length)
                : null;

            const tr = document.createElement('tr');
            if (notaFinal !== null && notaFinal < 51) {
                tr.classList.add('fila-reprobada');
            }

            tr.innerHTML = `
                <td>${item.materia}</td>
                <td>${n1 !== null && n1 !== undefined ? n1 : '-'}</td>
                <td>${n2 !== null && n2 !== undefined ? n2 : '-'}</td>
                <td>${n3 !== null && n3 !== undefined ? n3 : '-'}</td>
                <td><strong>${notaFinal !== null ? notaFinal : '-'}</strong></td>
            `;

            tbodyNotas.appendChild(tr);
        });
    } catch (err) {
        console.error('Error inesperado cargando notas del estudiante:', err);
        tbodyNotas.innerHTML = `
            <tr>
                <td colspan="5" style="text-align:center;">Error inesperado al cargar las calificaciones.</td>
            </tr>
        `;
    }
}

cargarNotasEstudianteTutor();