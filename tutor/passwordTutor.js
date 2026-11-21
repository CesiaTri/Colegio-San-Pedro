const SUPABASE_URL = 'https://ysodorfyloeodalkkphn.supabase.co';
const SUPABASE_KEY = 'sb_publishable_F_Ro8XGajrgNbBdlRPaTvQ_hZHiOOhO';

// Cliente de Supabase independiente para cambiar contraseña del tutor
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

// Función para desplegar los submenús de estudiantes asociados
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

// --- CARGA DINÁMICA DE ESTUDIANTES ASOCIADOS EN EL MENÚ (CONSULTAS NORMALES) ---
async function poblarEstudiantesAsociadosMenu() {
    if (!ciGuardado) return;

    try {
        const ciNum = Number(ciGuardado);
        const filtroCi = Number.isNaN(ciNum) ? ciGuardado : ciNum;

        const { data: tutorData, error: tutorErr } = await supabaseClient
            .from('tutor')
            .select('id')
            .eq('ci_persona', filtroCi)
            .limit(1)
            .maybeSingle();

        if (tutorErr || !tutorData) return;

        const { data: vinculos, error: vincErr } = await supabaseClient
            .from('tutor_estudiante')
            .select('id_estudiante')
            .eq('id_tutor', tutorData.id);

        if (vincErr || !Array.isArray(vinculos) || vinculos.length === 0) return;

        const idsEstudiantes = [...new Set(vinculos.map((v) => v.id_estudiante).filter(Boolean))];
        if (idsEstudiantes.length === 0) return;

        const { data: estudiantesData, error: estErr } = await supabaseClient
            .from('estudiante')
            .select('id, ci_persona')
            .in('id', idsEstudiantes);

        if (estErr || !Array.isArray(estudiantesData) || estudiantesData.length === 0) return;

        const cisEstudiantes = [...new Set(estudiantesData.map((e) => e.ci_persona).filter(Boolean))];
        const { data: personasData, error: perErr } = await supabaseClient
            .from('persona')
            .select('ci, nombres, apellidos')
            .in('ci', cisEstudiantes);

        if (perErr) return;

        const mapaPersonas = new Map(
            (personasData || []).map((p) => [String(p.ci), p])
        );

        const listaEstudiantes = estudiantesData
            .map((est, idx) => {
                const per = mapaPersonas.get(String(est.ci_persona)) || {};
                const nombreCorto = `${per.nombres || ''} ${per.apellidos || ''}`.trim() || `Estudiante ${idx + 1}`;
                return {
                    id: est.id,
                    etiqueta: `${nombreCorto} (Estudiante ${idx + 1})`
                };
            });

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
            subMenuEl.innerHTML = listaEstudiantes
                .map((est) => `<a href="${destino}?id=${encodeURIComponent(est.id)}" class="sub-opcion">${est.etiqueta}</a>`)
                .join('');
        });
    } catch (err) {
        console.error('Error cargando estudiantes asociados del tutor:', err);
    }
}

// --- CAMBIO DE CONTRASEÑA CON CONSULTAS NORMALES A USUARIO ---
const formPassword = document.getElementById('formPassword');
const mensajeAlerta = document.getElementById('mensajeAlerta');
const btnCambiar = document.querySelector('.btn-cambiar');

function mostrarAlerta(texto, tipo) {
    if (!mensajeAlerta) return;
    mensajeAlerta.textContent = texto;
    mensajeAlerta.style.display = 'block';
    mensajeAlerta.className = tipo === 'error'
        ? 'mensaje-alerta alerta-error'
        : 'mensaje-alerta alerta-exito';
}

async function precargarCorreoTutor() {
    const inputCorreo = document.getElementById('correo');
    if (!inputCorreo || !ciGuardado) return;

    try {
        const ciNum = Number(ciGuardado);
        const filtroCi = Number.isNaN(ciNum) ? ciGuardado : ciNum;

        const { data, error } = await supabaseClient
            .from('usuario')
            .select('correo')
            .eq('ci_persona', filtroCi)
            .limit(1)
            .maybeSingle();

        if (!error && data && data.correo && !inputCorreo.value) {
            inputCorreo.value = data.correo;
        }
    } catch (err) {
        console.error('Error precargando correo del tutor:', err);
    }
}

if (formPassword) {
    formPassword.addEventListener('submit', async function (event) {
        event.preventDefault();

        const correoIngresado = document.getElementById('correo').value.trim();
        const passAnterior = document.getElementById('password-anterior').value.trim();
        const passNueva = document.getElementById('password-nueva').value.trim();
        const passConfirmar = document.getElementById('password-confirmar').value.trim();

        if (!correoIngresado || !passAnterior || !passNueva || !passConfirmar) {
            mostrarAlerta('Por favor completa todos los campos.', 'error');
            return;
        }

        if (passNueva.length < 6) {
            mostrarAlerta('La nueva contraseña debe tener al menos 6 caracteres.', 'error');
            return;
        }

        if (passNueva !== passConfirmar) {
            mostrarAlerta('Las nuevas contraseñas no coinciden.', 'error');
            return;
        }

        if (passAnterior === passNueva) {
            mostrarAlerta('La nueva contraseña debe ser diferente a la anterior.', 'error');
            return;
        }

        if (btnCambiar) {
            btnCambiar.disabled = true;
            btnCambiar.textContent = 'Actualizando...';
        }

        try {
            const ciNum = Number(ciGuardado);
            const filtroCi = Number.isNaN(ciNum) ? ciGuardado : ciNum;

            const { data: usuarioActual, error: consultaErr } = await supabaseClient
                .from('usuario')
                .select('id, correo, password, ci_persona')
                .eq('ci_persona', filtroCi)
                .limit(1)
                .maybeSingle();

            if (consultaErr) {
                console.error('Error consultando usuario:', consultaErr);
                mostrarAlerta('No se pudo verificar la cuenta del tutor.', 'error');
                return;
            }

            if (!usuarioActual) {
                mostrarAlerta('No se encontró un usuario vinculado a tu sesión.', 'error');
                return;
            }

            const correoBd = (usuarioActual.correo || '').trim().toLowerCase();
            if (correoBd !== correoIngresado.toLowerCase()) {
                mostrarAlerta('El correo electrónico no coincide con el registrado.', 'error');
                return;
            }

            if (usuarioActual.password !== passAnterior) {
                mostrarAlerta('La contraseña anterior es incorrecta.', 'error');
                return;
            }

            const { error: updateErr } = await supabaseClient
                .from('usuario')
                .update({ password: passNueva })
                .eq('id', usuarioActual.id);

            if (updateErr) {
                console.error('Error actualizando contraseña en usuario:', updateErr);
                mostrarAlerta('Ocurrió un error al actualizar la contraseña.', 'error');
                return;
            }

            mostrarAlerta('¡Contraseña cambiada exitosamente!', 'exito');
            formPassword.reset();
            await precargarCorreoTutor();
        } catch (err) {
            console.error('Error inesperado al cambiar contraseña:', err);
            mostrarAlerta('Error inesperado al cambiar la contraseña.', 'error');
        } finally {
            if (btnCambiar) {
                btnCambiar.disabled = false;
                btnCambiar.textContent = 'Cambiar Contraseña';
            }
        }
    });
}

precargarCorreoTutor();
poblarEstudiantesAsociadosMenu();