const SUPABASE_URL = 'https://ysodorfyloeodalkkphn.supabase.co';
const SUPABASE_KEY = 'sb_publishable_F_Ro8XGajrgNbBdlRPaTvQ_hZHiOOhO';

// 1. Cliente de Supabase independiente
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

function pintarDatosPerfil(datos, ciFallback) {
    const elCi = document.getElementById('profesor-ci');
    const elNombre = document.getElementById('profesor-nombre');
    const elApellido = document.getElementById('profesor-apellido');
    const elTelefono = document.getElementById('profesor-telefono');
    const elDireccion = document.getElementById('profesor-direccion');
    const elEspecialidad = document.getElementById('profesor-especialidad');

    if (!datos) return;

    if (elCi) elCi.textContent = datos.ci ?? ciFallback ?? '-';
    if (elNombre) elNombre.textContent = datos.nombres || 'Sin registrar';
    if (elApellido) elApellido.textContent = datos.apellidos || 'Sin registrar';
    if (elTelefono) elTelefono.textContent = datos.telefono || 'Sin registrar';
    if (elDireccion) elDireccion.textContent = datos.direccion || 'Sin registrar';
    if (elEspecialidad) elEspecialidad.textContent = datos.especialidad || 'Sin registrar';
}

async function cargarPerfilProfesor() {
    const ciGuardado = localStorage.getItem('ci_usuario');
    const rolGuardado = (localStorage.getItem('rol_usuario') || '').trim().toLowerCase();

    if (!ciGuardado) {
        window.location.href = '../index.html';
        return;
    }

    if (rolGuardado && rolGuardado !== 'profesor') {
        window.location.href = `../${rolGuardado}/perfil_${rolGuardado}.html`;
        return;
    }

    // 2. Pintado instantáneo desde localStorage (0 ms)
    let cacheDatos = null;
    try {
        const rawCache = localStorage.getItem('perfil_usuario');
        if (rawCache) {
            cacheDatos = JSON.parse(rawCache);
            if (String(cacheDatos.ci) === String(ciGuardado)) {
                pintarDatosPerfil(cacheDatos, ciGuardado);
            }
        }
    } catch (e) {
        console.warn('Error leyendo caché:', e);
    }

    // 3. Consulta directa a Supabase (tablas 'persona' y 'profesor')
    try {
        const { data, error } = await supabaseClient
            .from('persona')
            .select(`
                ci,
                nombres,
                apellidos,
                telefono,
                direccion,
                profesor (
                    especialidad
                )
            `)
            .eq('ci', ciGuardado)
            .single();

        if (error || !data) {
            if (!cacheDatos) {
                pintarDatosPerfil({ ci: ciGuardado, nombres: 'No encontrado' }, ciGuardado);
            }
            return;
        }

        const especialidad = Array.isArray(data.profesor)
            ? data.profesor[0]?.especialidad
            : data.profesor?.especialidad;

        const datosActualizados = {
            ci: data.ci ?? ciGuardado,
            nombres: data.nombres || '',
            apellidos: data.apellidos || '',
            telefono: data.telefono || '',
            direccion: data.direccion || '',
            especialidad: especialidad || ''
        };

        localStorage.setItem('perfil_usuario', JSON.stringify(datosActualizados));
        pintarDatosPerfil(datosActualizados, ciGuardado);
    } catch (err) {
        console.error('Error en fetch a Supabase:', err);
    }
}

// 4. Ejecución directa al cargar el script al final del body
cargarPerfilProfesor();