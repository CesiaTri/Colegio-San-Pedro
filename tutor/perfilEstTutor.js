const SUPABASE_URL = 'https://ysodorfyloeodalkkphn.supabase.co';
const SUPABASE_KEY = 'sb_publishable_F_Ro8XGajrgNbBdlRPaTvQ_hZHiOOhO';

// Cliente de Supabase independiente para el perfil del estudiante visto por el tutor
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

const datoCiEl = document.getElementById('dato-ci');
const datoNombreEl = document.getElementById('dato-nombre');
const datoApellidoEl = document.getElementById('dato-apellido');
const datoTelefonoEl = document.getElementById('dato-telefono');
const datoDireccionEl = document.getElementById('dato-direccion');
const datoNacimientoEl = document.getElementById('dato-nacimiento');
const datoCursoEl = document.getElementById('dato-curso');
const datoTurnoEl = document.getElementById('dato-turno');
const datoRudeEl = document.getElementById('dato-rude');

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

function renderizarSubMenusEstudiantes(estudiantesUnicos) {
    const subMenusConfig = [
        { id: 'sub-perfil', destino: 'perfil_est_tutor.html' },
        { id: 'sub-notas', destino: 'notas_est_tutor.html' },
        { id: 'sub-horario', destino: 'horario_est_tutor.html' },
        { id: 'sub-matricula', destino: 'matricula_est_tutor.html' },
        { id: 'sub-asistencia', destino: 'asistencia_est_tutor.html' }
    ];

    subMenusConfig.forEach(({ id, destino }) => {
        const subMenuEl = document.getElementById(id);
        if (!subMenuEl) return;

        if (estudiantesUnicos.length === 0) {
            subMenuEl.innerHTML = `<span class="sub-opcion">Sin estudiantes asociados</span>`;
            return;
        }

        subMenuEl.innerHTML = estudiantesUnicos
            .map((est, idx) => {
                const nombreCorto = `${est.nombres || ''} ${est.apellidos || ''}`.trim() || `Estudiante ${idx + 1}`;
                const etiqueta = `${nombreCorto} (Estudiante ${idx + 1})`;
                return `<a href="${destino}?id=${encodeURIComponent(est.id_estudiante)}" class="sub-opcion">${etiqueta}</a>`;
            })
            .join('');
    });
}

async function cargarPerfilEstudianteTutor() {
    if (!ciGuardado) return;

    try {
        const ciNum = Number(ciGuardado);
        const filtroCiTutor = Number.isNaN(ciNum) ? ciGuardado : ciNum;

        const { data, error } = await supabaseClient
            .from('vista_perfil_estudiante_tutor')
            .select('id_estudiante, ci_persona, codigo_rude, nombres, apellidos, telefono, direccion, fecha_nacimiento, genero, id_tutor, parentesco, ci_tutor, id_matricula, gestion, estado_matricula, id_curso, turno, grado, nivel, paralelo, curso_completo')
            .eq('ci_tutor', filtroCiTutor)
            .order('gestion', { ascending: false });

        if (error) {
            console.error('Error consultando vista_perfil_estudiante_tutor:', error);
            return;
        }

        const filas = Array.isArray(data) ? data : [];
        if (filas.length === 0) return;

        const mapaEstudiantes = new Map();
        for (const fila of filas) {
            if (fila.id_estudiante !== null && fila.id_estudiante !== undefined) {
                const clave = String(fila.id_estudiante);
                if (!mapaEstudiantes.has(clave)) {
                    mapaEstudiantes.set(clave, fila);
                }
            }
        }

        const estudiantesUnicos = Array.from(mapaEstudiantes.values());
        renderizarSubMenusEstudiantes(estudiantesUnicos);

        let seleccionado = null;
        if (idEstudianteParam) {
            seleccionado = estudiantesUnicos.find((e) => String(e.id_estudiante) === String(idEstudianteParam)) || null;
        }
        if (!seleccionado && estudiantesUnicos.length > 0) {
            seleccionado = estudiantesUnicos[0];
        }

        if (!seleccionado) return;

        const cursoTexto = seleccionado.curso_completo
            || (seleccionado.nivel && seleccionado.paralelo && seleccionado.grado
                ? `${seleccionado.nivel}° "${seleccionado.paralelo}" de ${seleccionado.grado}`
                : '-');

        if (datoCiEl) datoCiEl.textContent = textoSeguro(seleccionado.ci_persona);
        if (datoNombreEl) datoNombreEl.textContent = textoSeguro(seleccionado.nombres);
        if (datoApellidoEl) datoApellidoEl.textContent = textoSeguro(seleccionado.apellidos);
        if (datoTelefonoEl) datoTelefonoEl.textContent = textoSeguro(seleccionado.telefono);
        if (datoDireccionEl) datoDireccionEl.textContent = textoSeguro(seleccionado.direccion);
        if (datoNacimientoEl) datoNacimientoEl.textContent = formatearFecha(seleccionado.fecha_nacimiento);
        if (datoCursoEl) datoCursoEl.textContent = textoSeguro(cursoTexto);
        if (datoTurnoEl) datoTurnoEl.textContent = textoSeguro(seleccionado.turno);
        if (datoRudeEl) datoRudeEl.textContent = textoSeguro(seleccionado.codigo_rude);
    } catch (err) {
        console.error('Error inesperado cargando perfil del estudiante para tutor:', err);
    }
}

cargarPerfilEstudianteTutor();