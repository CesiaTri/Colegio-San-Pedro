const SUPABASE_URL = 'https://ysodorfyloeodalkkphn.supabase.co';
const SUPABASE_KEY = 'sb_publishable_F_Ro8XGajrgNbBdlRPaTvQ_hZHiOOhO';

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
const PREFIJO_CACHE_PROFESOR = 'cache_perfil_profesor_admin_';

// --- MENÚ LATERAL Y SUBMENÚS ---
const btnAbrirMenu = document.getElementById('btnAbrirMenu');
const btnCerrarMenu = document.getElementById('btnCerrarMenu');
const menuLateral = document.getElementById('menuLateral');
const overlay = document.getElementById('overlay');
const btnCerrarSesion = document.getElementById('btnCerrarSesion');

function abrirMenu() {
    menuLateral.classList.add('abierto');
    overlay.classList.add('activo');
}

function cerrarMenu() {
    menuLateral.classList.remove('abierto');
    overlay.classList.remove('activo');
}

btnAbrirMenu.addEventListener('click', abrirMenu);
btnCerrarMenu.addEventListener('click', cerrarMenu);
overlay.addEventListener('click', cerrarMenu);

function toggleSubMenu(idSubMenu) {
    const submenu = document.getElementById(idSubMenu);
    const boton = submenu.previousElementSibling;

    submenu.classList.toggle('abierto');
    boton.classList.toggle('activo');
}

if (btnCerrarSesion) {
    btnCerrarSesion.addEventListener('click', function () {
        localStorage.removeItem('ci_usuario');
        localStorage.removeItem('rol_usuario');
        localStorage.removeItem('perfil_usuario');
    });
}

// --- VERIFICAR SESIÓN ADMINISTRATIVA ---
function verificarSesionAdmin() {
    const ciGuardado = localStorage.getItem('ci_usuario');
    const rolGuardado = (localStorage.getItem('rol_usuario') || '').trim().toLowerCase();

    if (!ciGuardado) {
        window.location.href = '../index.html';
        return false;
    }

    if (rolGuardado && rolGuardado !== 'administrativo') {
        window.location.href = `../${rolGuardado}/perfil_${rolGuardado}.html`;
        return false;
    }

    return true;
}

// --- RENDERIZAR DATOS DEL PROFESOR ---
const elCi = document.getElementById('profesor-ci');
const elNombre = document.getElementById('profesor-nombre');
const elApellido = document.getElementById('profesor-apellido');
const elTelefono = document.getElementById('profesor-telefono');
const elDireccion = document.getElementById('profesor-direccion');
const elEspecialidad = document.getElementById('profesor-especialidad');
const mensajeEstado = document.getElementById('mensajeEstado');

function mostrarError(texto) {
    if (!mensajeEstado) return;
    mensajeEstado.textContent = texto;
    mensajeEstado.style.display = 'block';
}

function ocultarError() {
    if (!mensajeEstado) return;
    mensajeEstado.textContent = '';
    mensajeEstado.style.display = 'none';
}

function renderizarPerfilProfesor(datos) {
    elCi.textContent = datos.ci ?? '—';
    elNombre.textContent = datos.nombres || '—';
    elApellido.textContent = datos.apellidos || '—';
    elTelefono.textContent = datos.telefono || '—';
    elDireccion.textContent = datos.direccion || '—';
    elEspecialidad.textContent = datos.especialidad || '—';
}

function extraerCiNumerico(ciRaw) {
    const digitos = String(ciRaw || '').replace(/\D/g, '').trim();
    const num = Number.parseInt(digitos, 10);
    return Number.isNaN(num) || num <= 0 ? null : num;
}

async function cargarPerfilProfesor() {
    const params = new URLSearchParams(window.location.search);
    const ciParamRaw = params.get('ci');
    const ciNumerico = extraerCiNumerico(ciParamRaw);

    if (ciParamRaw && !ciNumerico) {
        renderizarPerfilProfesor({
            ci: ciParamRaw,
            nombres: '—',
            apellidos: '—',
            telefono: '—',
            direccion: '—',
            especialidad: '—'
        });
        mostrarError(`El CI "${ciParamRaw}" no es válido.`);
        return;
    }

    if (ciNumerico) {
        try {
            const cached = localStorage.getItem(`${PREFIJO_CACHE_PROFESOR}${ciNumerico}`);
            if (cached) {
                renderizarPerfilProfesor(JSON.parse(cached));
            }
        } catch (_) {
            // Ignorar errores de caché
        }
    }

    try {
        let profesorRow = null;

        if (ciNumerico) {
            const { data, error } = await supabaseClient
                .from('profesor')
                .select('id, ci_persona, especialidad')
                .eq('ci_persona', ciNumerico)
                .maybeSingle();

            if (error) {
                console.error('Error buscando profesor por CI:', error);
                mostrarError('No se pudo consultar el profesor en Supabase.');
                return;
            }
            profesorRow = data;
        } else {
            const { data, error } = await supabaseClient
                .from('profesor')
                .select('id, ci_persona, especialidad')
                .order('id', { ascending: true })
                .limit(1)
                .maybeSingle();

            if (error) {
                console.error('Error buscando primer profesor:', error);
                mostrarError('No se pudo consultar el profesor en Supabase.');
                return;
            }
            profesorRow = data;
        }

        if (!profesorRow) {
            renderizarPerfilProfesor({
                ci: ciNumerico || '—',
                nombres: '—',
                apellidos: '—',
                telefono: '—',
                direccion: '—',
                especialidad: '—'
            });
            mostrarError('No se encontró un profesor registrado con ese CI.');
            return;
        }

        const { data: personaRow, error: perError } = await supabaseClient
            .from('persona')
            .select('ci, nombres, apellidos, telefono, direccion')
            .eq('ci', profesorRow.ci_persona)
            .maybeSingle();

        if (perError) {
            console.error('Error cargando datos de persona:', perError);
            mostrarError('No se pudieron cargar los datos personales del profesor.');
            return;
        }

        const perfilCompleto = {
            ci: personaRow?.ci ?? profesorRow.ci_persona,
            nombres: personaRow?.nombres || '—',
            apellidos: personaRow?.apellidos || '—',
            telefono: personaRow?.telefono || '—',
            direccion: personaRow?.direccion || '—',
            especialidad: profesorRow.especialidad || '—'
        };

        ocultarError();
        renderizarPerfilProfesor(perfilCompleto);

        try {
            localStorage.setItem(`${PREFIJO_CACHE_PROFESOR}${perfilCompleto.ci}`, JSON.stringify(perfilCompleto));
        } catch (_) {
            // Ignorar errores de caché
        }
    } catch (err) {
        console.error('Error inesperado cargando perfil de profesor:', err);
        mostrarError('Ocurrió un error al comunicarse con Supabase.');
    }
}

if (verificarSesionAdmin()) {
    cargarPerfilProfesor();
}