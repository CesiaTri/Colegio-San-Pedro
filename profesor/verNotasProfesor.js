const SUPABASE_URL = 'https://ysodorfyloeodalkkphn.supabase.co';
const SUPABASE_KEY = 'sb_publishable_F_Ro8XGajrgNbBdlRPaTvQ_hZHiOOhO';

// Cliente de Supabase independiente para ver notas del profesor
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
const idAsignacionParam = urlParams.get('asignacion');
const idCursoParam = urlParams.get('curso');
const gestionParam = urlParams.get('gestion');
const nombreMateriaParam = urlParams.get('nombreMateria') || 'Matemáticas';
const nombreCursoParam = urlParams.get('nombreCurso') || '3° A';
const turnoParam = urlParams.get('turno') || 'Mañana';

const infoCursoBar = document.querySelector('.info-curso-bar');
if (infoCursoBar) {
    infoCursoBar.innerHTML = `
        <span><strong>Materia:</strong> ${nombreMateriaParam}</span>
        <span><strong>Curso:</strong> ${nombreCursoParam}</span>
        <span><strong>Turno:</strong> ${turnoParam}</span>
    `;
}

const cuerpoTablaNotas = document.getElementById('cuerpo-tabla-notas');

function formatearPuntaje(valor) {
    if (valor === null || valor === undefined || valor === '') return '-';
    const num = Number(valor);
    if (Number.isNaN(num)) return '-';
    return Number.isInteger(num) ? String(num) : num.toFixed(2);
}

async function cargarTablaNotas() {
    if (!cuerpoTablaNotas) return;

    cuerpoTablaNotas.innerHTML = `
        <tr>
            <td colspan="5">Cargando notas...</td>
        </tr>
    `;

    try {
        let query = supabaseClient
            .from('vista_notas_curso_asignacion')
            .select('id_matricula, id_estudiante, id_curso, gestion, ci_persona, apellidos, nombres, nombre_completo, id_nota, id_asignacion_docente, trimestre, puntaje');

        if (idCursoParam) {
            const cursoNum = Number(idCursoParam);
            query = query.eq('id_curso', Number.isNaN(cursoNum) ? idCursoParam : cursoNum);
        }

        if (gestionParam) {
            const gestionNum = Number(gestionParam);
            if (!Number.isNaN(gestionNum)) {
                query = query.eq('gestion', gestionNum);
            }
        }

        const { data, error } = await query
            .order('apellidos', { ascending: true })
            .order('nombres', { ascending: true });

        if (error) {
            console.error('Error consultando vista_notas_curso_asignacion:', error);
            cuerpoTablaNotas.innerHTML = `
                <tr>
                    <td colspan="5">Error al cargar las notas.</td>
                </tr>
            `;
            return;
        }

        const filas = Array.isArray(data) ? data : [];
        const asigNum = idAsignacionParam ? Number(idAsignacionParam) : null;
        const mapaEstudiantes = new Map();

        for (const fila of filas) {
            const idMat = fila.id_matricula;
            if (!mapaEstudiantes.has(idMat)) {
                mapaEstudiantes.set(idMat, {
                    nombre: fila.nombre_completo || `${fila.apellidos || ''}, ${fila.nombres || ''}`.trim() || 'Sin nombre',
                    t1: null,
                    t2: null,
                    t3: null
                });
            }

            const coincideAsignacion =
                !idAsignacionParam ||
                fila.id_asignacion_docente === null ||
                (asigNum !== null && !Number.isNaN(asigNum)
                    ? Number(fila.id_asignacion_docente) === asigNum
                    : String(fila.id_asignacion_docente) === String(idAsignacionParam));

            if (coincideAsignacion && fila.puntaje !== null && fila.puntaje !== undefined) {
                const est = mapaEstudiantes.get(idMat);
                const trim = Number(fila.trimestre);
                const puntajeNum = Number(fila.puntaje);
                if (!Number.isNaN(puntajeNum)) {
                    if (trim === 1) est.t1 = puntajeNum;
                    else if (trim === 2) est.t2 = puntajeNum;
                    else if (trim === 3) est.t3 = puntajeNum;
                }
            }
        }

        const estudiantes = Array.from(mapaEstudiantes.values());
        if (estudiantes.length === 0) {
            cuerpoTablaNotas.innerHTML = `
                <tr>
                    <td colspan="5">No hay estudiantes matriculados para esta clase.</td>
                </tr>
            `;
            return;
        }

        cuerpoTablaNotas.innerHTML = '';
        estudiantes.forEach((est) => {
            const notasCargadas = [est.t1, est.t2, est.t3].filter((n) => typeof n === 'number' && !Number.isNaN(n));
            const promedioFinal = notasCargadas.length > 0
                ? notasCargadas.reduce((acc, val) => acc + val, 0) / notasCargadas.length
                : null;

            const tr = document.createElement('tr');
            if (promedioFinal !== null && promedioFinal < 51) {
                tr.className = 'fila-reprobada';
            }

            const finalTexto = promedioFinal === null
                ? '-'
                : (Number.isInteger(promedioFinal) ? String(promedioFinal) : promedioFinal.toFixed(1));

            tr.innerHTML = `
                <td class="columna-estudiante">${est.nombre}</td>
                <td>${formatearPuntaje(est.t1)}</td>
                <td>${formatearPuntaje(est.t2)}</td>
                <td>${formatearPuntaje(est.t3)}</td>
                <td><strong>${finalTexto}</strong></td>
            `;

            cuerpoTablaNotas.appendChild(tr);
        });
    } catch (err) {
        console.error('Error inesperado cargando notas:', err);
    }
}

cargarTablaNotas();