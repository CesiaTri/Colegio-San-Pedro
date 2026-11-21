const SUPABASE_URL = 'https://ysodorfyloeodalkkphn.supabase.co';
const SUPABASE_KEY = 'sb_publishable_F_Ro8XGajrgNbBdlRPaTvQ_hZHiOOhO';

// Cliente de Supabase independiente para cambiar contraseña del estudiante
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
} else if (rolGuardado && rolGuardado !== 'estudiante') {
    window.location.href = `../${rolGuardado}/perfil_${rolGuardado}.html`;
}

// --- CAMBIO DE CONTRASEÑA EN SUPABASE ---
const formPassword = document.getElementById('formPassword');
const correoInput = document.getElementById('correo');
const passAnteriorInput = document.getElementById('password-anterior');
const passNuevaInput = document.getElementById('password-nueva');
const passConfirmarInput = document.getElementById('password-confirmar');
const mensajeAlerta = document.getElementById('mensajeAlerta');

function mostrarAlerta(texto, tipo = 'error') {
    if (!mensajeAlerta) return;
    mensajeAlerta.textContent = texto;
    mensajeAlerta.style.display = 'block';
    mensajeAlerta.className = tipo === 'error'
        ? 'mensaje-alerta alerta-error'
        : 'mensaje-alerta alerta-exito';
}

async function prellenarCorreoEstudiante() {
    if (!correoInput || !ciGuardado) return;
    try {
        const ciNum = Number(ciGuardado);
        const filtroCi = Number.isNaN(ciNum) ? ciGuardado : ciNum;

        // Consulta SQL:
        // SELECT correo FROM usuario WHERE ci_persona = <filtroCi> LIMIT 1;
        const { data, error } = await supabaseClient
            .from('usuario')
            .select('correo')
            .eq('ci_persona', filtroCi)
            .limit(1)
            .maybeSingle();

        if (!error && data && data.correo && !correoInput.value) {
            correoInput.value = data.correo;
        }
    } catch (err) {
        console.error('Error obteniendo correo del estudiante:', err);
    }
}

if (formPassword) {
    formPassword.addEventListener('submit', async function (e) {
        e.preventDefault();

        if (!ciGuardado) {
            mostrarAlerta('No se encontró una sesión activa.', 'error');
            return;
        }

        const correo = correoInput ? correoInput.value.trim().toLowerCase() : '';
        const passAnterior = passAnteriorInput ? passAnteriorInput.value : '';
        const passNueva = passNuevaInput ? passNuevaInput.value : '';
        const passConfirmar = passConfirmarInput ? passConfirmarInput.value : '';

        if (!correo || !passAnterior || !passNueva || !passConfirmar) {
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

        const btnSubmit = formPassword.querySelector('.btn-cambiar');
        if (btnSubmit) btnSubmit.disabled = true;

        try {
            const ciNum = Number(ciGuardado);
            const filtroCi = Number.isNaN(ciNum) ? ciGuardado : ciNum;

            // Consulta SQL:
            // SELECT id, correo, password, ci_persona, id_rol FROM usuario WHERE ci_persona = <filtroCi>;
            const { data: usuarios, error: selectErr } = await supabaseClient
                .from('usuario')
                .select('id, correo, password, ci_persona, id_rol')
                .eq('ci_persona', filtroCi);

            if (selectErr) {
                console.error('Error consultando usuario:', selectErr);
                mostrarAlerta('Error al verificar los datos del usuario.', 'error');
                if (btnSubmit) btnSubmit.disabled = false;
                return;
            }

            if (!usuarios || usuarios.length === 0) {
                mostrarAlerta('No se encontró el usuario asociado a este estudiante.', 'error');
                if (btnSubmit) btnSubmit.disabled = false;
                return;
            }

            const usuarioPorCorreo = usuarios.find(
                (u) => String(u.correo || '').trim().toLowerCase() === correo
            );

            if (!usuarioPorCorreo) {
                mostrarAlerta('El correo electrónico no coincide con el registrado.', 'error');
                if (btnSubmit) btnSubmit.disabled = false;
                return;
            }

            if (usuarioPorCorreo.password !== passAnterior) {
                mostrarAlerta('La contraseña anterior es incorrecta.', 'error');
                if (btnSubmit) btnSubmit.disabled = false;
                return;
            }

            const { error: updateErr } = await supabaseClient
                .from('usuario')
                .update({ password: passNueva })
                .eq('id', usuarioPorCorreo.id)
                .eq('ci_persona', filtroCi);

            if (updateErr) {
                console.error('Error actualizando contraseña:', updateErr);
                mostrarAlerta('No se pudo actualizar la contraseña en la base de datos.', 'error');
                if (btnSubmit) btnSubmit.disabled = false;
                return;
            }

            formPassword.reset();
            correoInput.value = usuarioPorCorreo.correo;
            mostrarAlerta('¡Contraseña cambiada exitosamente!', 'exito');
        } catch (err) {
            console.error('Error inesperado al cambiar contraseña:', err);
            mostrarAlerta('Ocurrió un error inesperado al cambiar la contraseña.', 'error');
        } finally {
            if (btnSubmit) btnSubmit.disabled = false;
        }
    });
}

prellenarCorreoEstudiante();