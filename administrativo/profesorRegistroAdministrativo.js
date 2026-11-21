const SUPABASE_URL = 'https://ysodorfyloeodalkkphn.supabase.co';
const SUPABASE_KEY = 'sb_publishable_F_Ro8XGajrgNbBdlRPaTvQ_hZHiOOhO';

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ID del rol Profesor en la tabla rol: (1, Administrativo), (2, Estudiante), (3, Profesor), (4, Tutor)
const ID_ROL_PROFESOR = 3;

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

// --- GUARDAR PROFESOR EN SUPABASE ---
const formProfesor = document.getElementById('formProfesor');
const mensajeAlerta = document.getElementById('mensajeAlerta');
const btnGuardar = document.getElementById('btnGuardar');

function mostrarAlerta(texto, tipo) {
    mensajeAlerta.textContent = texto;
    mensajeAlerta.style.display = 'block';
    mensajeAlerta.className = tipo === 'error'
        ? 'mensaje-alerta alerta-error'
        : 'mensaje-alerta alerta-exito';
}

if (verificarSesionAdmin() && formProfesor) {
    formProfesor.addEventListener('submit', async function (event) {
        event.preventDefault();

        const ciLimpio = document.getElementById('ci').value.replace(/\D/g, '').trim();
        const ciNumero = Number.parseInt(ciLimpio, 10);
        const nombres = document.getElementById('nombres').value.trim();
        const apellidos = document.getElementById('apellidos').value.trim();
        const telefono = document.getElementById('telefono').value.trim();
        const direccion = document.getElementById('direccion').value.trim();
        const correo = document.getElementById('correo').value.trim().toLowerCase();
        const especialidad = document.getElementById('especialidad').value.trim();

        mensajeAlerta.style.display = 'none';

        if (!ciLimpio || Number.isNaN(ciNumero) || ciNumero <= 0 || !nombres || !apellidos || !telefono || !direccion || !correo || !especialidad) {
            mostrarAlerta('No se pudo guardar al profesor: complete todos los campos obligatorios con un CI numérico válido.', 'error');
            return;
        }

        const correoValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo);
        if (!correoValido) {
            mostrarAlerta('No se pudo guardar al profesor: ingrese un correo electrónico válido.', 'error');
            return;
        }

        const telefonoValido = /^[0-9+\-\s]{7,15}$/.test(telefono);
        if (!telefonoValido) {
            mostrarAlerta('No se pudo guardar al profesor: ingrese un número de teléfono válido.', 'error');
            return;
        }

        btnGuardar.disabled = true;
        btnGuardar.textContent = 'Guardando...';

        try {
            // 1. Insertar o actualizar en persona
            const { error: personaError } = await supabaseClient
                .from('persona')
                .upsert({
                    ci: ciNumero,
                    nombres,
                    apellidos,
                    telefono,
                    direccion
                }, { onConflict: 'ci' });

            if (personaError) {
                console.error('Error guardando persona:', personaError);
                mostrarAlerta(`Error al guardar datos personales: ${personaError.message}`, 'error');
                return;
            }

            // 2. Revisar si ya existe en profesor; si no, insertar; si ya existe, actualizar especialidad
            const { data: profExistente, error: consultaProfError } = await supabaseClient
                .from('profesor')
                .select('id, ci_persona')
                .eq('ci_persona', ciNumero)
                .maybeSingle();

            if (consultaProfError) {
                console.error('Error consultando profesor:', consultaProfError);
                mostrarAlerta(`Error al verificar profesor: ${consultaProfError.message}`, 'error');
                return;
            }

            if (!profExistente) {
                const { error: profError } = await supabaseClient
                    .from('profesor')
                    .insert({
                        ci_persona: ciNumero,
                        especialidad: especialidad.slice(0, 100)
                    });

                if (profError) {
                    console.error('Error guardando profesor:', profError);
                    mostrarAlerta(`Error al registrar profesor: ${profError.message}`, 'error');
                    return;
                }
            } else {
                const { error: updateProfError } = await supabaseClient
                    .from('profesor')
                    .update({
                        especialidad: especialidad.slice(0, 100)
                    })
                    .eq('id', profExistente.id);

                if (updateProfError) {
                    console.error('Error actualizando profesor:', updateProfError);
                    mostrarAlerta(`Error al actualizar especialidad del profesor: ${updateProfError.message}`, 'error');
                    return;
                }
            }

            // 3. Crear usuario inicial para el profesor (contraseña por defecto = CI, rol = 3 Profesor)
            const { data: usuarioExistente } = await supabaseClient
                .from('usuario')
                .select('ci_persona')
                .eq('ci_persona', ciNumero)
                .maybeSingle();

            if (!usuarioExistente) {
                const { error: usuarioError } = await supabaseClient
                    .from('usuario')
                    .insert({
                        correo,
                        password: String(ciNumero),
                        ci_persona: ciNumero,
                        id_rol: ID_ROL_PROFESOR
                    });

                if (usuarioError) {
                    console.error('Error creando usuario del profesor:', usuarioError);
                    if (usuarioError.code === '23505') {
                        mostrarAlerta('El profesor se registró, pero el correo electrónico ya está en uso.', 'error');
                    } else {
                        mostrarAlerta(`El profesor se registró, pero hubo un error con su usuario: ${usuarioError.message}`, 'error');
                    }
                    return;
                }
            }

            mostrarAlerta(`¡Profesor ${nombres} ${apellidos} (${especialidad}) guardado correctamente! Contraseña inicial: ${ciNumero}`, 'exito');
            formProfesor.reset();
        } catch (err) {
            console.error('Error inesperado al guardar profesor:', err);
            mostrarAlerta('Ocurrió un error al comunicarse con Supabase.', 'error');
        } finally {
            btnGuardar.disabled = false;
            btnGuardar.textContent = 'Guardar';
        }
    });
}