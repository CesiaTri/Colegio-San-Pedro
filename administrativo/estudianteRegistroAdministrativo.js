const SUPABASE_URL = 'https://ysodorfyloeodalkkphn.supabase.co';
const SUPABASE_KEY = 'sb_publishable_F_Ro8XGajrgNbBdlRPaTvQ_hZHiOOhO';

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ID del rol Estudiante en la tabla rol: (1, Administrativo), (2, Estudiante), (3, Profesor), (4, Tutor)
const ID_ROL_ESTUDIANTE = 2;

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

// --- SELECCIÓN DE GÉNERO ---
let generoSeleccionado = '';
const botonesGenero = document.querySelectorAll('#grupoGenero .btn-opcion');

botonesGenero.forEach((boton) => {
    boton.addEventListener('click', () => {
        botonesGenero.forEach((b) => b.classList.remove('seleccionado'));
        boton.classList.add('seleccionado');
        generoSeleccionado = boton.dataset.valor;
    });
});

// --- GUARDAR ESTUDIANTE EN SUPABASE ---
const formEstudiante = document.getElementById('formEstudiante');
const mensajeAlerta = document.getElementById('mensajeAlerta');
const btnGuardar = document.getElementById('btnGuardar');

function mostrarAlerta(texto, tipo) {
    mensajeAlerta.textContent = texto;
    mensajeAlerta.style.display = 'block';
    mensajeAlerta.className = tipo === 'error'
        ? 'mensaje-alerta alerta-error'
        : 'mensaje-alerta alerta-exito';
}

if (verificarSesionAdmin() && formEstudiante) {
    formEstudiante.addEventListener('submit', async function (event) {
        event.preventDefault();

        const ciLimpio = document.getElementById('ci').value.replace(/\D/g, '').trim();
        const ciNumero = Number.parseInt(ciLimpio, 10);
        const nombres = document.getElementById('nombres').value.trim();
        const apellidos = document.getElementById('apellidos').value.trim();
        const telefono = document.getElementById('telefono').value.trim();
        const direccion = document.getElementById('direccion').value.trim();
        const fechaNacimiento = document.getElementById('fecha-nacimiento').value.trim();
        const correo = document.getElementById('correo').value.trim().toLowerCase();
        const codigoRude = document.getElementById('codigo-rude').value.trim();

        mensajeAlerta.style.display = 'none';

        if (!ciLimpio || Number.isNaN(ciNumero) || ciNumero <= 0 || !nombres || !apellidos || !generoSeleccionado || !telefono || !direccion || !fechaNacimiento || !correo || !codigoRude) {
            mostrarAlerta('No se pudo guardar al estudiante: complete todos los campos con un CI numérico válido y seleccione el género.', 'error');
            return;
        }

        const correoValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo);
        if (!correoValido) {
            mostrarAlerta('No se pudo guardar al estudiante: ingrese un correo electrónico válido.', 'error');
            return;
        }

        const telefonoValido = /^[0-9+\-\s]{7,15}$/.test(telefono);
        if (!telefonoValido) {
            mostrarAlerta('No se pudo guardar al estudiante: ingrese un número de teléfono válido.', 'error');
            return;
        }

        btnGuardar.disabled = true;
        btnGuardar.textContent = 'Guardando...';

        try {
            // 1. Insertar o actualizar datos en la tabla persona
            const { error: personaError } = await supabaseClient
                .from('persona')
                .upsert({
                    ci: ciNumero,
                    nombres,
                    apellidos,
                    telefono,
                    direccion,
                    fecha_nacimiento: fechaNacimiento,
                    genero: generoSeleccionado
                }, { onConflict: 'ci' });

            if (personaError) {
                console.error('Error guardando persona:', personaError);
                mostrarAlerta(`Error al guardar datos personales: ${personaError.message}`, 'error');
                return;
            }

            // 2. Insertar en la tabla estudiante
            const { error: estudianteError } = await supabaseClient
                .from('estudiante')
                .insert({
                    ci_persona: ciNumero,
                    codigo_rude: codigoRude
                });

            if (estudianteError) {
                console.error('Error guardando estudiante:', estudianteError);
                if (estudianteError.code === '23505') {
                    mostrarAlerta('Ya existe un estudiante registrado con ese CI o Código RUDE.', 'error');
                } else {
                    mostrarAlerta(`Error al registrar estudiante: ${estudianteError.message}`, 'error');
                }
                return;
            }

            // 3. Crear usuario inicial para el estudiante (password inicial = CI)
            const { error: usuarioError } = await supabaseClient
                .from('usuario')
                .insert({
                    correo,
                    password: String(ciNumero),
                    ci_persona: ciNumero,
                    id_rol: ID_ROL_ESTUDIANTE
                });

            if (usuarioError) {
                console.error('Error creando usuario del estudiante:', usuarioError);
                if (usuarioError.code === '23505') {
                    mostrarAlerta('El estudiante se registró, pero el correo electrónico ya está en uso.', 'error');
                } else {
                    mostrarAlerta(`El estudiante se registró, pero hubo un error con su usuario: ${usuarioError.message}`, 'error');
                }
                return;
            }

            mostrarAlerta(`¡Estudiante ${nombres} ${apellidos} (CI: ${ciNumero}, RUDE: ${codigoRude}) guardado correctamente! Contraseña inicial: ${ciNumero}`, 'exito');
            formEstudiante.reset();
            generoSeleccionado = '';
            botonesGenero.forEach((b) => b.classList.remove('seleccionado'));
        } catch (err) {
            console.error('Error inesperado al guardar estudiante:', err);
            mostrarAlerta('Ocurrió un error al comunicarse con Supabase.', 'error');
        } finally {
            btnGuardar.disabled = false;
            btnGuardar.textContent = 'Guardar';
        }
    });
}