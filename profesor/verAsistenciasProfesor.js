const SUPABASE_URL = 'https://ysodorfyloeodalkkphn.supabase.co';
const SUPABASE_KEY = 'sb_publishable_F_Ro8XGajrgNbBdlRPaTvQ_hZHiOOhO';

// Cliente de Supabase independiente para ver asistencias del profesor
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

// Pintar datos de cabecera de clase
const detallesCursoEl = document.querySelector('.datos-curso-detalle');
if (detallesCursoEl) {
    detallesCursoEl.innerHTML = `
        <span><strong>Materia:</strong> ${nombreMateriaParam}</span>
        <span><strong>Curso:</strong> ${nombreCursoParam}</span>
        <span><strong>Turno:</strong> ${turnoParam}</span>
    `;
}

const selectMes = document.getElementById('select-mes');
const filaEncabezado = document.getElementById('fila-encabezado-dias');
const cuerpoTabla = document.getElementById('cuerpo-tabla-asistencias');

function obtenerMesCalendario(valorSelect) {
    const idx = parseInt(valorSelect, 10);
    return Number.isNaN(idx) ? 11 : idx + 1;
}

function obtenerAnioActivo() {
    const anioGestion = parseInt(gestionParam, 10);
    return !Number.isNaN(anioGestion) && anioGestion > 2000 ? anioGestion : 2026;
}

function formatearEstadoCelda(estadoRaw, esDomingo) {
    if (esDomingo) {
        return `<span class="badge-estado estado-sin-clases" title="Sin clases">--</span>`;
    }
    const estado = (estadoRaw || '').trim().toLowerCase();
    if (!estado) {
        return `<span class="badge-estado estado-sin-clases" title="Sin registro">-</span>`;
    }
    if (estado === 'presente' || estado === 'p' || estado === '✓') {
        return `<span class="badge-estado estado-presente" title="Presente">✓</span>`;
    }
    if (estado === 'ausente' || estado === 'falta' || estado === 'f' || estado === '✗') {
        return `<span class="badge-estado estado-ausente" title="Ausente">✗</span>`;
    }
    if (estado === 'atraso' || estado === 'retraso' || estado === 't') {
        return `<span class="badge-estado estado-presente" title="Atraso">A</span>`;
    }
    if (estado === 'licencia' || estado === 'l') {
        return `<span class="badge-estado estado-sin-clases" title="Licencia">L</span>`;
    }
    return `<span class="badge-estado estado-sin-clases" title="${estadoRaw}">?</span>`;
}

async function cargarCuadriculaAsistencia() {
    if (!selectMes || !filaEncabezado || !cuerpoTabla) return;

    const mesIndexJS = parseInt(selectMes.value, 10);
    const mesSQL = obtenerMesCalendario(selectMes.value);
    const anio = obtenerAnioActivo();
    const totalDias = new Date(anio, mesIndexJS + 1, 0).getDate();

    let thHTML = '<th class="columna-estudiante">Estudiante</th>';
    for (let dia = 1; dia <= totalDias; dia++) {
        thHTML += `<th>${dia}</th>`;
    }
    filaEncabezado.innerHTML = thHTML;

    cuerpoTabla.innerHTML = `
        <tr>
            <td colspan="${totalDias + 1}">Cargando asistencias...</td>
        </tr>
    `;

    try {
        let query = supabaseClient
            .from('vista_asistencias_curso')
            .select('id_asistencia, id_matricula, id_estudiante, id_curso, gestion, ci_persona, nombre_completo, apellidos, nombres, fecha, anio, mes, dia, estado')
            .eq('anio', anio)
            .eq('mes', mesSQL);

        if (idCursoParam) {
            const cursoNum = Number(idCursoParam);
            query = query.eq('id_curso', Number.isNaN(cursoNum) ? idCursoParam : cursoNum);
        }

        const { data, error } = await query
            .order('apellidos', { ascending: true })
            .order('nombres', { ascending: true });

        if (error) {
            console.error('Error consultando vista_asistencias_curso:', error);
            cuerpoTabla.innerHTML = `
                <tr>
                    <td colspan="${totalDias + 1}">Error al cargar las asistencias.</td>
                </tr>
            `;
            return;
        }

        const filas = Array.isArray(data) ? data : [];
        if (filas.length === 0) {
            cuerpoTabla.innerHTML = `
                <tr>
                    <td colspan="${totalDias + 1}">No hay registros de asistencia para este mes.</td>
                </tr>
            `;
            return;
        }

        const estudiantesMap = new Map();
        for (const fila of filas) {
            const claveEst = fila.id_matricula ?? fila.id_estudiante ?? fila.ci_persona;
            if (!estudiantesMap.has(claveEst)) {
                estudiantesMap.set(claveEst, {
                    nombre: fila.nombre_completo || `${fila.apellidos || ''}, ${fila.nombres || ''}`.trim() || 'Sin nombre',
                    dias: {}
                });
            }
            const diaNum = Number(fila.dia);
            if (diaNum >= 1 && diaNum <= totalDias) {
                estudiantesMap.get(claveEst).dias[diaNum] = fila.estado;
            }
        }

        cuerpoTabla.innerHTML = '';
        estudiantesMap.forEach((est) => {
            const tr = document.createElement('tr');
            let tdHTML = `<td class="columna-estudiante">${est.nombre}</td>`;

            for (let dia = 1; dia <= totalDias; dia++) {
                const fechaActual = new Date(anio, mesIndexJS, dia);
                const esDomingo = fechaActual.getDay() === 0;
                const estadoDia = est.dias[dia] || '';
                tdHTML += `<td>${formatearEstadoCelda(estadoDia, esDomingo)}</td>`;
            }

            tr.innerHTML = tdHTML;
            cuerpoTabla.appendChild(tr);
        });
    } catch (err) {
        console.error('Error inesperado cargando asistencias:', err);
    }
}

if (selectMes) {
    cargarCuadriculaAsistencia();
    selectMes.addEventListener('change', cargarCuadriculaAsistencia);
}