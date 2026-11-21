const SUPABASE_URL = 'https://ysodorfyloeodalkkphn.supabase.co';
const SUPABASE_KEY = 'sb_publishable_F_Ro8XGajrgNbBdlRPaTvQ_hZHiOOhO';

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ID del rol Tutor en la tabla rol: (1, Administrativo), (2, Estudiante), (3, Profesor), (4, Tutor)
const ID_ROL_TUTOR = 4;

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

// --- VERIFICADOR DE CI DE ALUMNOS ---
const selectCantidadHijos = document.getElementById('cantidad-hijos');
const contenedorHijos = document.getElementById('contenedorHijos');

function marcarEstadoCiAlumno(inputEl, estadoEl, tipo, texto) {
    inputEl.classList.remove('ci-invalido', 'ci-valido');
    estadoEl.classList.remove('error', 'ok', 'pendiente');

    if (tipo === 'error') {
        inputEl.classList.add('ci-invalido');
        estadoEl.classList.add('error');
    } else if (tipo === 'ok') {
        inputEl.classList.add('ci-valido');
        estadoEl.classList.add('ok');
    } else {
        estadoEl.classList.add('pendiente');
    }

    estadoEl.textContent = texto || '';
}

async function verificarCiEstudianteEnBD(indice) {
    const inputCi = document.getElementById(`ci-estudiante-${indice}`);
    const estadoEl = document.getElementById(`estado-ci-${indice}`);
    if (!inputCi || !estadoEl) return { valido: false, ci: null, idEstudiante: null };

    const ciLimpio = inputCi.value.replace(/\D/g, '').trim();
    const ciNumero = Number.parseInt(ciLimpio, 10);

    if (!ciLimpio || Number.isNaN(ciNumero) || ciNumero <= 0) {
        marcarEstadoCiAlumno(
            inputCi,
            estadoEl,
            'error',
            'CI inválido: ingrese un número de CI de estudiante registrado.'
        );
        return { valido: false, ci: null, idEstudiante: null };
    }

    marcarEstadoCiAlumno(inputCi, estadoEl, 'pendiente', 'Verificando CI del estudiante...');

    try {
        const { data: estData, error: estError } = await supabaseClient
            .from('estudiante')
            .select('id, ci_persona')
            .eq('ci_persona', ciNumero)
            .maybeSingle();

        if (estError || !estData) {
            marcarEstadoCiAlumno(
                inputCi,
                estadoEl,
                'error',
                `No existe ningún estudiante registrado con el CI ${ciNumero}.`
            );
            return { valido: false, ci: ciNumero, idEstudiante: null };
        }

        const { data: perData } = await supabaseClient
            .from('persona')
            .select('nombres, apellidos')
            .eq('ci', ciNumero)
            .maybeSingle();

        const nombreAlumno = perData
            ? `${perData.nombres || ''} ${perData.apellidos || ''}`.trim()
            : '';

        marcarEstadoCiAlumno(
            inputCi,
            estadoEl,
            'ok',
            nombreAlumno
                ? `Estudiante verificado: ${nombreAlumno}`
                : `Estudiante verificado (CI ${ciNumero})`
        );

        return { valido: true, ci: ciNumero, idEstudiante: estData.id };
    } catch (err) {
        console.error('Error verificando CI de estudiante:', err);
        marcarEstadoCiAlumno(
            inputCi,
            estadoEl,
            'error',
            'Error al verificar el CI en Supabase.'
        );
        return { valido: false, ci: ciNumero, idEstudiante: null };
    }
}

function renderizarCamposHijos() {
    const cantidad = Number.parseInt(selectCantidadHijos.value, 10) || 0;
    contenedorHijos.innerHTML = '';

    for (let i = 1; i <= cantidad; i++) {
        const tarjeta = document.createElement('div');
        tarjeta.className = 'tarjeta-hijo';
        tarjeta.innerHTML = `
            <h3>Hijo / Estudiante ${i}</h3>
            <div class="grupo-input">
                <label for="ci-estudiante-${i}">CI del estudiante</label>
                <input type="text" id="ci-estudiante-${i}" name="ci_estudiante_${i}" placeholder="Ej. 8745123" required>
                <span id="estado-ci-${i}" class="estado-ci-alumno pendiente"></span>
            </div>
            <div class="grupo-input">
                <label for="relacion-estudiante-${i}">Relación con el estudiante</label>
                <input type="text" id="relacion-estudiante-${i}" name="relacion_estudiante_${i}" placeholder="Ej. Padre, Madre, Abuelo/a, Tutor legal" required>
            </div>
        `;
        contenedorHijos.appendChild(tarjeta);

        const inputCi = document.getElementById(`ci-estudiante-${i}`);
        let temporizador;

        inputCi.addEventListener('input', () => {
            clearTimeout(temporizador);
            if (!inputCi.value.trim()) {
                const estadoEl = document.getElementById(`estado-ci-${i}`);
                marcarEstadoCiAlumno(inputCi, estadoEl, 'pendiente', '');
                return;
            }
            temporizador = setTimeout(() => verificarCiEstudianteEnBD(i), 350);
        });

        inputCi.addEventListener('blur', () => {
            clearTimeout(temporizador);
            if (inputCi.value.trim()) {
                verificarCiEstudianteEnBD(i);
            }
        });
    }
}

selectCantidadHijos.addEventListener('change', renderizarCamposHijos);
renderizarCamposHijos();

// --- GUARDAR TUTOR Y RELACIONES EN SUPABASE ---
const formTutor = document.getElementById('formTutor');
const mensajeAlerta = document.getElementById('mensajeAlerta');
const btnGuardar = document.getElementById('btnGuardar');

function mostrarAlerta(texto, tipo) {
    mensajeAlerta.textContent = texto;
    mensajeAlerta.style.display = 'block';
    mensajeAlerta.className = tipo === 'error'
        ? 'mensaje-alerta alerta-error'
        : 'mensaje-alerta alerta-exito';
}

if (verificarSesionAdmin() && formTutor) {
    formTutor.addEventListener('submit', async function (event) {
        event.preventDefault();

        const ciLimpio = document.getElementById('ci').value.replace(/\D/g, '').trim();
        const ciNumero = Number.parseInt(ciLimpio, 10);
        const nombres = document.getElementById('nombres').value.trim();
        const apellidos = document.getElementById('apellidos').value.trim();
        const telefono = document.getElementById('telefono').value.trim();
        const direccion = document.getElementById('direccion').value.trim();
        const correo = document.getElementById('correo').value.trim().toLowerCase();
        const cantidadHijos = Number.parseInt(selectCantidadHijos.value, 10) || 0;

        mensajeAlerta.style.display = 'none';

        if (!ciLimpio || Number.isNaN(ciNumero) || ciNumero <= 0 || !nombres || !apellidos || !telefono || !direccion || !correo) {
            mostrarAlerta('No se pudo guardar al tutor: complete todos los datos personales obligatorios con un CI numérico válido.', 'error');
            return;
        }

        const correoValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo);
        if (!correoValido) {
            mostrarAlerta('No se pudo guardar al tutor: ingrese un correo electrónico válido.', 'error');
            return;
        }

        const telefonoValido = /^[0-9+\-\s]{7,15}$/.test(telefono);
        if (!telefonoValido) {
            mostrarAlerta('No se pudo guardar al tutor: ingrese un número de teléfono válido.', 'error');
            return;
        }

        // Validar todos los hijos y verificar sus CIs en Supabase antes de guardar
        const hijos = [];
        let hayErrorHijo = false;

        for (let i = 1; i <= cantidadHijos; i++) {
            const relacionEstudiante = document.getElementById(`relacion-estudiante-${i}`).value.trim();
            const verificacion = await verificarCiEstudianteEnBD(i);

            if (!verificacion.valido || !verificacion.idEstudiante) {
                hayErrorHijo = true;
            }

            if (!relacionEstudiante) {
                hayErrorHijo = true;
                mostrarAlerta(`Complete la relación con el estudiante del hijo/estudiante ${i}.`, 'error');
            }

            hijos.push({
                indice: i,
                ciEstudiante: verificacion.ci,
                idEstudiante: verificacion.idEstudiante,
                relacionEstudiante
            });
        }

        if (hayErrorHijo) {
            mostrarAlerta('Revise los campos señalados en rojo: uno o más CI de estudiantes no son válidos o no existen.', 'error');
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

            // 2. Revisar si el tutor ya existe por ci_persona; si no, insertarlo y obtener su id
            const { data: tutorExistente, error: consultaTutorError } = await supabaseClient
                .from('tutor')
                .select('id, ci_persona')
                .eq('ci_persona', ciNumero)
                .maybeSingle();

            if (consultaTutorError) {
                console.error('Error consultando tutor:', consultaTutorError);
                mostrarAlerta(`Error al verificar tutor: ${consultaTutorError.message}`, 'error');
                return;
            }

            let idTutor = tutorExistente?.id ?? null;
            let tutorYaRegistrado = false;

            if (!tutorExistente) {
                const { data: tutorInsertado, error: tutorError } = await supabaseClient
                    .from('tutor')
                    .insert({
                        ci_persona: ciNumero
                    })
                    .select('id')
                    .single();

                if (tutorError || !tutorInsertado) {
                    console.error('Error guardando tutor:', tutorError);
                    mostrarAlerta(`Error al registrar tutor: ${tutorError?.message || 'No se obtuvo el ID del tutor.'}`, 'error');
                    return;
                }

                idTutor = tutorInsertado.id;
            } else {
                tutorYaRegistrado = true;
            }

            // 3. Crear usuario inicial solo si aún no tiene usuario registrado con ese CI
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
                        id_rol: ID_ROL_TUTOR
                    });

                if (usuarioError) {
                    console.error('Error creando usuario del tutor:', usuarioError);
                    if (usuarioError.code === '23505') {
                        mostrarAlerta('El tutor se registró, pero el correo electrónico ya está en uso.', 'error');
                    } else {
                        mostrarAlerta(`El tutor se registró, pero hubo un error con su usuario: ${usuarioError.message}`, 'error');
                    }
                    return;
                }
            }

            // 4. Asociar hijos/estudiantes en tutor_estudiante con id_tutor, id_estudiante y parentesco
            let relacionesNuevas = 0;

            for (const hijo of hijos) {
                const { data: relacionExistente } = await supabaseClient
                    .from('tutor_estudiante')
                    .select('id')
                    .eq('id_tutor', idTutor)
                    .eq('id_estudiante', hijo.idEstudiante)
                    .maybeSingle();

                if (!relacionExistente) {
                    const { error: relacionError } = await supabaseClient
                        .from('tutor_estudiante')
                        .insert({
                            id_tutor: idTutor,
                            id_estudiante: hijo.idEstudiante,
                            parentesco: hijo.relacionEstudiante.slice(0, 50)
                        });

                    if (relacionError) {
                        console.error(`Error asociando hijo ${hijo.indice}:`, relacionError);
                        mostrarAlerta(`Error al asociar al estudiante CI ${hijo.ciEstudiante} en tutor_estudiante: ${relacionError.message}`, 'error');
                        return;
                    }
                    relacionesNuevas++;
                }
            }

            const mensajeFinal = tutorYaRegistrado
                ? `El tutor con CI ${ciNumero} ya estaba registrado (no se duplicó). Se agregaron ${relacionesNuevas} relación(es) nueva(s) en tutor_estudiante.`
                : `¡Tutor ${nombres} ${apellidos} (CI: ${ciNumero}) guardado correctamente (${relacionesNuevas} estudiante(s) asociado(s))! Contraseña inicial: ${ciNumero}`;

            mostrarAlerta(mensajeFinal, 'exito');
            formTutor.reset();
            renderizarCamposHijos();
        } catch (err) {
            console.error('Error inesperado al guardar tutor:', err);
            mostrarAlerta('Ocurrió un error al comunicarse con Supabase.', 'error');
        } finally {
            btnGuardar.disabled = false;
            btnGuardar.textContent = 'Guardar';
        }
    });
}