const SUPABASE_URL = 'https://ysodorfyloeodalkkphn.supabase.co';
const SUPABASE_KEY = 'sb_publishable_F_Ro8XGajrgNbBdlRPaTvQ_hZHiOOhO';

// Cliente de Supabase independiente para registrar asistencias del profesor
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

// --- VERIFICACIÓN DE SESIÓN Y ROL ---
const ciGuardado = localStorage.getItem('ci_usuario');
const rolGuardado = (localStorage.getItem('rol_usuario') || '').trim().toLowerCase();

if (!ciGuardado) {
    window.location.href = '../index.html';
} else if (rolGuardado && rolGuardado !== 'profesor') {
    window.location.href = `../${rolGuardado}/perfil_${rolGuardado}.html`;
}

// --- PARÁMETROS DE LA CLASE DESDE LA URL ---
const urlParams = new URLSearchParams(window.location.search);
const idCursoParam = urlParams.get('curso');
const gestionParam = urlParams.get('gestion');
const nombreMateriaParam = urlParams.get('nombreMateria') || 'Matemáticas';
const nombreCursoParam = urlParams.get('nombreCurso') || '3° A';
const turnoParam = urlParams.get('turno') || 'Mañana';

const detallesCursoEl = document.querySelector('.datos-curso-detalle');
if (detallesCursoEl) {
    detallesCursoEl.innerHTML = `
        <span><strong>Materia:</strong> ${nombreMateriaParam}</span>
        <span><strong>Curso:</strong> ${nombreCursoParam}</span>
        <span><strong>Turno:</strong> ${turnoParam}</span>
    `;
}

const inputFecha = document.getElementById('input-fecha');
const cuerpoTablaRegistro = document.getElementById('cuerpo-tabla-registro');
const btnGuardar = document.querySelector('.btn-guardar');

// Estado local de estudiantes: { id_matricula, id_asistencia, nombre, estado }
let filasEstudiantes = [];

function obtenerGestionActiva() {
    const anioGestion = parseInt(gestionParam, 10);
    if (!Number.isNaN(anioGestion) && anioGestion > 2000) return anioGestion;
    if (inputFecha && inputFecha.value) {
        const anioFecha = parseInt(inputFecha.value.slice(0, 4), 10);
        if (!Number.isNaN(anioFecha)) return anioFecha;
    }
    return 2026;
}

function cambiarEstado(index, estado) {
    if (!filasEstudiantes[index]) return;
    filasEstudiantes[index].estado = estado;

    const btnPresente = document.getElementById(`btn-p-${index}`);
    const btnAusente = document.getElementById(`btn-a-${index}`);

    if (estado === 'Presente') {
        if (btnPresente) btnPresente.className = 'btn-estado activo-presente';
        if (btnAusente) btnAusente.className = 'btn-estado';
    } else {
        if (btnPresente) btnPresente.className = 'btn-estado';
        if (btnAusente) btnAusente.className = 'btn-estado activo-ausente';
    }
}

function renderizarTablaEstudiantes() {
    if (!cuerpoTablaRegistro) return;

    if (filasEstudiantes.length === 0) {
        cuerpoTablaRegistro.innerHTML = `
            <tr>
                <td colspan="2">No hay estudiantes matriculados en este curso.</td>
            </tr>
        `;
        return;
    }

    cuerpoTablaRegistro.innerHTML = '';
    filasEstudiantes.forEach((est, index) => {
        const esPresente = (est.estado || 'Presente').toLowerCase() !== 'ausente';
        const tr = document.createElement('tr');

        tr.innerHTML = `
            <td class="columna-nombre">${est.nombre}</td>
            <td class="columna-estado">
                <div class="grupo-botones-estado">
                    <button type="button" class="btn-estado ${esPresente ? 'activo-presente' : ''}" id="btn-p-${index}">Presente</button>
                    <button type="button" class="btn-estado ${!esPresente ? 'activo-ausente' : ''}" id="btn-a-${index}">Ausente</button>
                </div>
            </td>
        `;

        cuerpoTablaRegistro.appendChild(tr);

        const btnP = document.getElementById(`btn-p-${index}`);
        const btnA = document.getElementById(`btn-a-${index}`);
        if (btnP) btnP.addEventListener('click', () => cambiarEstado(index, 'Presente'));
        if (btnA) btnA.addEventListener('click', () => cambiarEstado(index, 'Ausente'));
    });
}

async function cargarEstudiantesYAsistenciaFecha() {
    if (!cuerpoTablaRegistro) return;

    const fechaSeleccionada = inputFecha ? inputFecha.value : '';
    const gestion = obtenerGestionActiva();

    cuerpoTablaRegistro.innerHTML = `
        <tr>
            <td colspan="2">Cargando lista de estudiantes...</td>
        </tr>
    `;

    try {
        let query = supabaseClient
            .from('vista_estudiantes_asistencia_fecha')
            .select('id_matricula, id_estudiante, id_curso, gestion, ci_persona, apellidos, nombres, nombre_completo, id_asistencia, fecha, estado_asistencia')
            .eq('gestion', gestion);

        if (idCursoParam) {
            const cursoNum = Number(idCursoParam);
            query = query.eq('id_curso', Number.isNaN(cursoNum) ? idCursoParam : cursoNum);
        }

        const { data, error } = await query
            .order('apellidos', { ascending: true })
            .order('nombres', { ascending: true });

        if (error) {
            console.error('Error consultando vista_estudiantes_asistencia_fecha:', error);
            cuerpoTablaRegistro.innerHTML = `
                <tr>
                    <td colspan="2">Error al cargar los estudiantes.</td>
                </tr>
            `;
            return;
        }

        const registros = Array.isArray(data) ? data : [];
        const mapaPorMatricula = new Map();

        for (const fila of registros) {
            const idMat = fila.id_matricula;
            if (!mapaPorMatricula.has(idMat)) {
                mapaPorMatricula.set(idMat, {
                    id_matricula: idMat,
                    id_asistencia: null,
                    nombre: fila.nombre_completo || `${fila.apellidos || ''}, ${fila.nombres || ''}`.trim() || 'Sin nombre',
                    estado: 'Presente'
                });
            }

            if (fechaSeleccionada && fila.fecha === fechaSeleccionada) {
                const actual = mapaPorMatricula.get(idMat);
                actual.id_asistencia = fila.id_asistencia;
                const estLower = (fila.estado_asistencia || '').trim().toLowerCase();
                actual.estado = estLower === 'ausente' ? 'Ausente' : 'Presente';
            }
        }

        filasEstudiantes = Array.from(mapaPorMatricula.values());
        renderizarTablaEstudiantes();
    } catch (err) {
        console.error('Error inesperado cargando estudiantes para asistencia:', err);
    }
}

async function guardarAsistencia() {
    const fechaSeleccionada = inputFecha ? inputFecha.value : '';
    if (!fechaSeleccionada) {
        alert('Por favor, seleccione una fecha.');
        return;
    }

    if (filasEstudiantes.length === 0) {
        alert('No hay estudiantes para registrar asistencia.');
        return;
    }

    if (btnGuardar) {
        btnGuardar.disabled = true;
        btnGuardar.textContent = 'Guardando...';
    }

    try {
        for (const est of filasEstudiantes) {
            if (est.id_asistencia) {
                const { error: updErr } = await supabaseClient
                    .from('asistencia')
                    .update({
                        estado: est.estado,
                        fecha: fechaSeleccionada
                    })
                    .eq('id', est.id_asistencia);

                if (updErr) throw updErr;
            } else {
                const { error: insErr } = await supabaseClient
                    .from('asistencia')
                    .insert({
                        id_matricula: est.id_matricula,
                        fecha: fechaSeleccionada,
                        estado: est.estado
                    });

                if (insErr) throw insErr;
            }
        }

        alert('¡Asistencia registrada exitosamente para la fecha seleccionada!');
        window.location.href = 'asistencias_profesor.html';
    } catch (err) {
        console.error('Error guardando asistencia:', err);
        alert('Ocurrió un error al guardar la asistencia.');
        if (btnGuardar) {
            btnGuardar.disabled = false;
            btnGuardar.textContent = 'Guardar Asistencia';
        }
    }
}

if (btnGuardar) {
    btnGuardar.addEventListener('click', guardarAsistencia);
}

if (inputFecha) {
    inputFecha.addEventListener('change', cargarEstudiantesYAsistenciaFecha);
}

cargarEstudiantesYAsistenciaFecha();