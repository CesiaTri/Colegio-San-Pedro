const SUPABASE_URL = 'https://ysodorfyloeodalkkphn.supabase.co';
const SUPABASE_KEY = 'sb_publishable_F_Ro8XGajrgNbBdlRPaTvQ_hZHiOOhO';

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

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

// --- CAMBIO DE CONTRASEÑA EN SUPABASE ---
const formPassword = document.getElementById('formPassword');
const mensajeAlerta = document.getElementById('mensajeAlerta');
const btnCambiar = document.getElementById('btnCambiar');

function mostrarAlerta(texto, tipo) {
    mensajeAlerta.textContent = texto;
    mensajeAlerta.style.display = 'block';
    mensajeAlerta.className = tipo === 'error'
        ? 'mensaje-alerta alerta-error'
        : 'mensaje-alerta alerta-exito';
}

function verificarSesionAdmin() {
    const ciGuardado = localStorage.getItem('ci_usuario');
    const rolGuardado = (localStorage.getItem('rol_usuario') || '').trim().toLowerCase();

    if (!ciGuardado) {
        window.location.href = '../index.html';
        return null;
    }

    if (rolGuardado && rolGuardado !== 'administrativo') {
        window.location.href = `../${rolGuardado}/perfil_${rolGuardado}.html`;
        return null;
    }

    return ciGuardado;
}

const ciActivo = verificarSesionAdmin();

if (formPassword && ciActivo) {
    formPassword.addEventListener('submit', async function (event) {
        event.preventDefault();

        const correo = document.getElementById('correo').value.trim().toLowerCase();
        const passAnterior = document.getElementById('password-anterior').value.trim();
        const passNueva = document.getElementById('password-nueva').value.trim();
        const passConfirmar = document.getElementById('password-confirmar').value.trim();

        mensajeAlerta.style.display = 'none';

        if (!correo || !passAnterior || !passNueva || !passConfirmar) {
            mostrarAlerta('Completa todos los campos del formulario.', 'error');
            return;
        }

        if (passNueva.length < 6) {
            mostrarAlerta('La nueva contraseña debe tener al menos 6 caracteres.', 'error');
            return;
        }

        if (passNueva !== passConfirmar) {
            mostrarAlerta('La nueva contraseña y su confirmación no coinciden.', 'error');
            return;
        }

        if (passAnterior === passNueva) {
            mostrarAlerta('La nueva contraseña debe ser diferente a la anterior.', 'error');
            return;
        }

        btnCambiar.disabled = true;
        btnCambiar.textContent = 'Guardando...';

        try {
            // 1. Buscar el usuario por correo y verificar CI + contraseña anterior
            const { data: usuarioData, error: consultaError } = await supabaseClient
                .from('usuario')
                .select('id, correo, password, ci_persona')
                .eq('correo', correo)
                .eq('ci_persona', ciActivo)
                .single();

            if (consultaError || !usuarioData) {
                mostrarAlerta('El correo electrónico no coincide con el usuario actual.', 'error');
                return;
            }

            if (usuarioData.password !== passAnterior) {
                mostrarAlerta('La contraseña anterior es incorrecta.', 'error');
                return;
            }

            // 2. Actualizar la contraseña en Supabase
            const { error: updateError } = await supabaseClient
                .from('usuario')
                .update({ password: passNueva })
                .eq('id', usuarioData.id)
                .eq('ci_persona', ciActivo);

            if (updateError) {
                console.error('Error actualizando contraseña en Supabase:', updateError);
                mostrarAlerta('No se pudo actualizar la contraseña en la base de datos.', 'error');
                return;
            }

            mostrarAlerta('¡Contraseña actualizada exitosamente en la base de datos!', 'exito');
            formPassword.reset();
        } catch (err) {
            console.error('Error inesperado al cambiar contraseña:', err);
            mostrarAlerta('Ocurrió un error al comunicarse con Supabase.', 'error');
        } finally {
            btnCambiar.disabled = false;
            btnCambiar.textContent = 'Cambiar Contraseña';
        }
    });
}