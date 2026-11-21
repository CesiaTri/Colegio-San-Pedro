const SUPABASE_URL = 'https://ysodorfyloeodalkkphn.supabase.co';
const SUPABASE_KEY = 'sb_publishable_F_Ro8XGajrgNbBdlRPaTvQ_hZHiOOhO';

// Cliente de Supabase independiente para cambio de contraseña del profesor
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

// --- FORMULARIO DE CAMBIO DE CONTRASEÑA ---
const formPassword = document.getElementById('formPassword');
const mensajeAlerta = document.getElementById('mensajeAlerta');
const inputCorreo = document.getElementById('correo');

function mostrarAlerta(texto, tipo) {
    if (!mensajeAlerta) return;
    mensajeAlerta.textContent = texto;
    mensajeAlerta.style.display = 'block';
    mensajeAlerta.className = tipo === 'error'
        ? 'mensaje-alerta alerta-error'
        : 'mensaje-alerta alerta-exito';
}

// Precargar correo del usuario si existe en la tabla usuario
async function precargarCorreoUsuario() {
    if (!ciGuardado || !inputCorreo) return;
    try {
        const { data, error } = await supabaseClient
            .from('usuario')
            .select('correo')
            .eq('ci_persona', ciGuardado)
            .single();

        if (!error && data && data.correo) {
            inputCorreo.value = data.correo;
        }
    } catch (err) {
        console.warn('No se pudo precargar el correo:', err);
    }
}

precargarCorreoUsuario();

if (formPassword) {
    formPassword.addEventListener('submit', async function (event) {
        event.preventDefault();

        const correo = document.getElementById('correo').value.trim();
        const passAnterior = document.getElementById('password-anterior').value.trim();
        const passNueva = document.getElementById('password-nueva').value.trim();
        const passConfirmar = document.getElementById('password-confirmar').value.trim();

        if (!ciGuardado) {
            mostrarAlerta('No se encontró una sesión activa.', 'error');
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

        try {
            // Buscar registro en la tabla usuario vinculado a ci_persona
            const { data: usuarioData, error: consultaError } = await supabaseClient
                .from('usuario')
                .select('id, correo, password, ci_persona')
                .eq('ci_persona', ciGuardado)
                .single();

            if (consultaError || !usuarioData) {
                mostrarAlerta('No se encontró el usuario asociado a tu cuenta.', 'error');
                return;
            }

            if (usuarioData.correo.trim().toLowerCase() !== correo.toLowerCase()) {
                mostrarAlerta('El correo electrónico no coincide con el registrado.', 'error');
                return;
            }

            if (usuarioData.password !== passAnterior) {
                mostrarAlerta('La contraseña anterior es incorrecta.', 'error');
                return;
            }

            // Actualizar contraseña en la tabla usuario
            const { error: updateError } = await supabaseClient
                .from('usuario')
                .update({ password: passNueva })
                .eq('id', usuarioData.id)
                .eq('ci_persona', ciGuardado);

            if (updateError) {
                console.error('Error al actualizar contraseña:', updateError);
                mostrarAlerta('No se pudo actualizar la contraseña en la base de datos.', 'error');
                return;
            }

            mostrarAlerta('¡Contraseña cambiada exitosamente!', 'exito');
            formPassword.reset();
            if (inputCorreo) inputCorreo.value = usuarioData.correo;
        } catch (err) {
            console.error('Error inesperado al cambiar contraseña:', err);
            mostrarAlerta('Ocurrió un error al procesar la solicitud.', 'error');
        }
    });
}