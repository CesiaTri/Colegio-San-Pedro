const SUPABASE_URL = 'https://ysodorfyloeodalkkphn.supabase.co';
const SUPABASE_KEY = 'sb_publishable_F_Ro8XGajrgNbBdlRPaTvQ_hZHiOOhO';

// Cliente de Supabase independiente para el perfil del tutor
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

// Función para desplegar los submenús de los estudiantes asociados
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

// --- ELEMENTOS DEL PERFIL Y ESTUDIANTES ASOCIADOS ---
const tutorCiEl = document.getElementById('tutor-ci');
const tutorNombreEl = document.getElementById('tutor-nombre');
const tutorApellidoEl = document.getElementById('tutor-apellido');
const tutorTelefonoEl = document.getElementById('tutor-telefono');
const tutorDireccionEl = document.getElementById('tutor-direccion');
const panelDatosEl = document.querySelector('.panel-datos');

function textoSeguro(valor, fallback = '-') {
    if (valor === null || valor === undefined) return fallback;
    const limpio = String(valor).trim();
    return limpio !== '' ? limpio : fallback;
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
                const nombreCorto = `${est.nombres_estudiante || ''} ${est.apellidos_estudiante || ''}`.trim() || `Estudiante ${idx + 1}`;
                const etiqueta = `${nombreCorto} (Estudiante ${idx + 1})`;
                return `<a href="${destino}?id=${encodeURIComponent(est.id_estudiante)}" class="sub-opcion">${etiqueta}</a>`;
            })
            .join('');
    });
}

function renderizarTarjetasEstudiantes(estudiantesUnicos) {
    if (!panelDatosEl) return;

    panelDatosEl.querySelectorAll('.tarjeta-estudiante, .mensaje-sin-estudiantes').forEach((el) => el.remove());

    if (estudiantesUnicos.length === 0) {
        const aviso = document.createElement('p');
        aviso.className = 'mensaje-sin-estudiantes';
        aviso.style.color = '#64748b';
        aviso.style.fontSize = '14px';
        aviso.textContent = 'No hay estudiantes asociados a este tutor.';
        panelDatosEl.appendChild(aviso);
        return;
    }

    estudiantesUnicos.forEach((est, idx) => {
        const tarjeta = document.createElement('div');
        tarjeta.className = 'tarjeta-estudiante';
        tarjeta.innerHTML = `
            <h3>Estudiante ${idx + 1}</h3>
            <div class="lista-datos">
                <div class="fila-dato">
                    <span class="etiqueta">Nombre:</span>
                    <span class="valor">${textoSeguro(est.nombres_estudiante)}</span>
                </div>
                <div class="fila-dato">
                    <span class="etiqueta">Apellido:</span>
                    <span class="valor">${textoSeguro(est.apellidos_estudiante)}</span>
                </div>
                <div class="fila-dato">
                    <span class="etiqueta">Parentesco:</span>
                    <span class="valor">${textoSeguro(est.parentesco)}</span>
                </div>
            </div>
        `;
        panelDatosEl.appendChild(tarjeta);
    });
}

async function cargarPerfilTutor() {
    if (!ciGuardado) return;

    try {
        const ciNum = Number(ciGuardado);
        const filtroCi = Number.isNaN(ciNum) ? ciGuardado : ciNum;

        const { data, error } = await supabaseClient
            .from('vista_perfil_tutor_estudiantes')
            .select('id_tutor, ci_tutor, nombres_tutor, apellidos_tutor, telefono_tutor, direccion_tutor, id_tutor_estudiante, id_estudiante, parentesco, ci_estudiante, codigo_rude, nombres_estudiante, apellidos_estudiante')
            .eq('ci_tutor', filtroCi);

        if (error) {
            console.error('Error consultando vista_perfil_tutor_estudiantes:', error);
            return;
        }

        const filas = Array.isArray(data) ? data : [];
        if (filas.length === 0) return;

        const primero = filas[0];
        if (tutorCiEl) tutorCiEl.textContent = textoSeguro(primero.ci_tutor);
        if (tutorNombreEl) tutorNombreEl.textContent = textoSeguro(primero.nombres_tutor);
        if (tutorApellidoEl) tutorApellidoEl.textContent = textoSeguro(primero.apellidos_tutor);
        if (tutorTelefonoEl) tutorTelefonoEl.textContent = textoSeguro(primero.telefono_tutor);
        if (tutorDireccionEl) tutorDireccionEl.textContent = textoSeguro(primero.direccion_tutor);

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
        renderizarTarjetasEstudiantes(estudiantesUnicos);
        renderizarSubMenusEstudiantes(estudiantesUnicos);
    } catch (err) {
        console.error('Error inesperado cargando perfil del tutor:', err);
    }
}

cargarPerfilTutor();