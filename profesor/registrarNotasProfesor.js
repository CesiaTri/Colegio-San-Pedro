const SUPABASE_URL = 'https://ysodorfyloeodalkkphn.supabase.co';
const SUPABASE_KEY = 'sb_publishable_F_Ro8XGajrgNbBdlRPaTvQ_hZHiOOhO';

// Cliente de Supabase independiente para registrar notas del profesor
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

const detallesCursoEl = document.querySelector('.datos-curso-detalle');
if (detallesCursoEl) {
    detallesCursoEl.innerHTML = `
        <span><strong>Materia:</strong> ${nombreMateriaParam}</span>
        <span><strong>Curso:</strong> ${nombreCursoParam}</span>
        <span><strong>Turno:</strong> ${turnoParam}</span>
    `;
}

const selectTrimestre = document.getElementById('select-trimestre');
const cuerpoTablaRegistroNotas = document.getElementById('cuerpo-tabla-registro-notas');
const btnGuardar = document.querySelector('.btn-guardar');

// Estado local: { id_matricula, id_nota, nombre, puntaje }
let filasNotas = [];

async function resolverAsignacionDocenteSiFalta() {
    if (idAsignacionParam) {
        const asigNum = Number(idAsignacionParam);
        return Number.isNaN(asigNum) ? idAsignacionParam : asigNum;
    }

    if (!idCursoParam) return null;

    const cursoNum = Number(idCursoParam);
    const filtroCurso = Number.isNaN(cursoNum) ? idCursoParam : cursoNum;

    let query = supabaseClient
        .from('vista_clases_notas_profesor')
        .select('id_asignacion_docente')
        .eq('id_curso', filtroCurso);

    if (ciGuardado) {
        const ciNum = Number(ciGuardado);
        query = query.eq('ci_persona', Number.isNaN(ciNum) ? ciGuardado : ciNum);
    }

    if (gestionParam) {
        const gestionNum = Number(gestionParam);
        if (!Number.isNaN(gestionNum)) {
            query = query.eq('gestion', gestionNum);
        }
    }

    const { data, error } = await query.limit(1).maybeSingle();
    if (error || !data) return null;
    return data.id_asignacion_docente;
}

function renderizarTablaNotas() {
    if (!cuerpoTablaRegistroNotas) return;

    if (filasNotas.length === 0) {
        cuerpoTablaRegistroNotas.innerHTML = `
            <tr>
                <td colspan="2">No hay estudiantes matriculados en este curso.</td>
            </tr>
        `;
        return;
    }

    cuerpoTablaRegistroNotas.innerHTML = '';
    filasNotas.forEach((est, index) => {
        const valorInput = est.puntaje !== null && est.puntaje !== undefined ? est.puntaje : '';
        const tr = document.createElement('tr');

        tr.innerHTML = `
            <td class="columna-nombre">${est.nombre}</td>
            <td class="columna-puntaje">
                <input type="number" min="0" max="100" step="0.01" class="input-puntaje" value="${valorInput}" id="nota-${index}" placeholder="0 - 100">
            </td>
        `;

        cuerpoTablaRegistroNotas.appendChild(tr);

        const inputEl = document.getElementById(`nota-${index}`);
        if (inputEl) {
            inputEl.addEventListener('input', (e) => {
                const raw = e.target.value;
                filasNotas[index].puntaje = raw === '' ? null : Number(raw);
            });
        }
    });
}

async function cargarEstudiantesYNotasTrimestre() {
    if (!cuerpoTablaRegistroNotas) return;

    const trimestreSeleccionado = selectTrimestre ? Number(selectTrimestre.value) : 1;
    const idAsignacionResuelto = await resolverAsignacionDocenteSiFalta();

    cuerpoTablaRegistroNotas.innerHTML = `
        <tr>
            <td colspan="2">Cargando estudiantes y notas...</td>
        </tr>
    `;

    try {
        let query = supabaseClient
            .from('vista_estudiantes_notas_trimestre')
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
            console.error('Error consultando vista_estudiantes_notas_trimestre:', error);
            cuerpoTablaRegistroNotas.innerHTML = `
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
                    id_nota: null,
                    nombre: fila.nombre_completo || `${fila.apellidos || ''}, ${fila.nombres || ''}`.trim() || 'Sin nombre',
                    puntaje: null
                });
            }

            const coincideTrimestre = Number(fila.trimestre) === trimestreSeleccionado;
            const coincideAsignacion =
                !idAsignacionResuelto ||
                Number(fila.id_asignacion_docente) === Number(idAsignacionResuelto);

            if (coincideTrimestre && coincideAsignacion && fila.puntaje !== null && fila.puntaje !== undefined) {
                const actual = mapaPorMatricula.get(idMat);
                actual.id_nota = fila.id_nota;
                actual.puntaje = Number(fila.puntaje);
            }
        }

        filasNotas = Array.from(mapaPorMatricula.values());
        renderizarTablaNotas();
    } catch (err) {
        console.error('Error inesperado cargando notas para registro:', err);
    }
}

async function guardarNotas() {
    const trimestreSeleccionado = selectTrimestre ? Number(selectTrimestre.value) : 1;
    const idAsignacionResuelto = await resolverAsignacionDocenteSiFalta();

    if (!idAsignacionResuelto) {
        alert('No se pudo identificar la asignación docente de esta clase.');
        return;
    }

    if (filasNotas.length === 0) {
        alert('No hay estudiantes para registrar notas.');
        return;
    }

    for (let i = 0; i < filasNotas.length; i++) {
        const inputEl = document.getElementById(`nota-${i}`);
        const valStr = inputEl ? inputEl.value.trim() : '';
        if (valStr !== '') {
            const num = Number(valStr);
            if (Number.isNaN(num) || num < 0 || num > 100) {
                alert(`El puntaje de ${filasNotas[i].nombre} debe estar entre 0 y 100.`);
                if (inputEl) inputEl.focus();
                return;
            }
            filasNotas[i].puntaje = num;
        } else {
            filasNotas[i].puntaje = null;
        }
    }

    if (btnGuardar) {
        btnGuardar.disabled = true;
        btnGuardar.textContent = 'Guardando...';
    }

    try {
        for (const est of filasNotas) {
            if (est.puntaje === null) continue;

            if (est.id_nota) {
                const { error: updErr } = await supabaseClient
                    .from('nota')
                    .update({
                        puntaje: est.puntaje,
                        trimestre: trimestreSeleccionado,
                        id_asignacion_docente: idAsignacionResuelto
                    })
                    .eq('id', est.id_nota);

                if (updErr) throw updErr;
            } else {
                const { error: insErr } = await supabaseClient
                    .from('nota')
                    .insert({
                        id_matricula: est.id_matricula,
                        id_asignacion_docente: idAsignacionResuelto,
                        trimestre: trimestreSeleccionado,
                        puntaje: est.puntaje
                    });

                if (insErr) throw insErr;
            }
        }

        alert('¡Notas registradas exitosamente para el trimestre seleccionado!');
        window.location.href = 'notas_profesor.html';
    } catch (err) {
        console.error('Error guardando notas:', err);
        alert('Ocurrió un error al guardar las notas.');
        if (btnGuardar) {
            btnGuardar.disabled = false;
            btnGuardar.textContent = 'Guardar Notas';
        }
    }
}

if (btnGuardar) {
    btnGuardar.addEventListener('click', guardarNotas);
}

if (selectTrimestre) {
    selectTrimestre.addEventListener('change', cargarEstudiantesYNotasTrimestre);
}

cargarEstudiantesYNotasTrimestre();