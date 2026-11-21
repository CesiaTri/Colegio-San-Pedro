const SUPABASE_URL = 'https://ysodorfyloeodalkkphn.supabase.co';
const SUPABASE_KEY = 'sb_publishable_F_Ro8XGajrgNbBdlRPaTvQ_hZHiOOhO';

// Cliente de Supabase independiente para ver información de estudiantes del profesor
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

const infoCursoBar = document.querySelector('.info-curso-bar');
if (infoCursoBar) {
    infoCursoBar.innerHTML = `
        <span><strong>Materia:</strong> ${nombreMateriaParam}</span>
        <span><strong>Curso:</strong> ${nombreCursoParam}</span>
        <span><strong>Turno:</strong> ${turnoParam}</span>
    `;
}

const cuerpoTablaInfo = document.getElementById('cuerpo-tabla-info');

function textoSeguro(valor, fallback = '-') {
    if (valor === null || valor === undefined) return fallback;
    const limpio = String(valor).trim();
    return limpio !== '' ? limpio : fallback;
}

async function cargarTablaInformacion() {
    if (!cuerpoTablaInfo) return;

    cuerpoTablaInfo.innerHTML = `
        <tr>
            <td colspan="6" style="text-align:center;">Cargando información de estudiantes...</td>
        </tr>
    `;

    try {
        let query = supabaseClient
            .from('vista_informacion_estudiantes_curso')
            .select('id_matricula, id_estudiante, id_curso, gestion, ci_estudiante, codigo_rude, apellidos_estudiante, nombres_estudiante, nombre_estudiante, direccion_estudiante, telefono_estudiante, id_tutor_estudiante, id_tutor, ci_tutor, nombre_tutor, nombres_tutor, apellidos_tutor, telefono_tutor, relacion_tutor_estudiante');

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
            .order('apellidos_estudiante', { ascending: true })
            .order('nombres_estudiante', { ascending: true });

        if (error) {
            console.error('Error consultando vista_informacion_estudiantes_curso:', error);
            cuerpoTablaInfo.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align:center;">Error al cargar la información de estudiantes.</td>
                </tr>
            `;
            return;
        }

        const filas = Array.isArray(data) ? data : [];
        if (filas.length === 0) {
            cuerpoTablaInfo.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align:center;">No hay estudiantes registrados para este curso.</td>
                </tr>
            `;
            return;
        }

        cuerpoTablaInfo.innerHTML = '';
        filas.forEach((item) => {
            const nombreEst = item.nombre_estudiante || `${item.apellidos_estudiante || ''}, ${item.nombres_estudiante || ''}`.trim() || 'Sin nombre';
            const nombreTut = item.nombre_tutor || `${item.nombres_tutor || ''} ${item.apellidos_tutor || ''}`.trim() || 'Sin tutor asignado';

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td class="celda-nombre col-estudiante">${textoSeguro(nombreEst)}</td>
                <td class="col-estudiante">${textoSeguro(item.direccion_estudiante)}</td>
                <td class="col-estudiante">${textoSeguro(item.telefono_estudiante)}</td>
                <td class="celda-nombre col-tutor">${textoSeguro(nombreTut)}</td>
                <td class="col-tutor">${textoSeguro(item.telefono_tutor)}</td>
                <td class="col-tutor">${textoSeguro(item.relacion_tutor_estudiante)}</td>
            `;

            cuerpoTablaInfo.appendChild(tr);
        });
    } catch (err) {
        console.error('Error inesperado cargando información de estudiantes:', err);
    }
}

cargarTablaInformacion();