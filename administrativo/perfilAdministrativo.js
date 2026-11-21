const SUPABASE_URL = 'https://ysodorfyloeodalkkphn.supabase.co';
const SUPABASE_KEY = 'sb_publishable_F_Ro8XGajrgNbBdlRPaTvQ_hZHiOOhO';

// 1. Cliente creado una sola vez
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

function pintarDatosPerfil(datos, ciFallback) {
    const elCi = document.getElementById('admin-ci');
    const elNombre = document.getElementById('admin-nombre');
    const elApellido = document.getElementById('admin-apellido');
    const elCargo = document.getElementById('admin-cargo');
    const elTelefono = document.getElementById('admin-telefono');

    if (!datos) return;

    if (elCi) elCi.textContent = datos.ci ?? ciFallback ?? '-';
    if (elNombre) elNombre.textContent = datos.nombres || 'Sin registrar';
    if (elApellido) elApellido.textContent = datos.apellidos || 'Sin registrar';
    if (elCargo) elCargo.textContent = datos.cargo || 'Administrativo';
    if (elTelefono) elTelefono.textContent = datos.telefono || 'Sin registrar';
}

async function cargarPerfilRapido() {
    const ciGuardado = localStorage.getItem('ci_usuario');
    const rolGuardado = (localStorage.getItem('rol_usuario') || '').trim().toLowerCase();

    if (!ciGuardado) {
        window.location.href = '../index.html';
        return;
    }

    if (rolGuardado && rolGuardado !== 'administrativo') {
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

    // 3. Una sola consulta fetch pidiendo solo las columnas necesarias
    try {
        const { data, error } = await supabaseClient
            .from('persona')
            .select(`
                ci,
                nombres,
                apellidos,
                telefono,
                administrativo (
                    cargo
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

        const cargo = Array.isArray(data.administrativo)
            ? data.administrativo[0]?.cargo
            : data.administrativo?.cargo;

        const datosActualizados = {
            ci: data.ci ?? ciGuardado,
            nombres: data.nombres || '',
            apellidos: data.apellidos || '',
            telefono: data.telefono || '',
            cargo: cargo || ''
        };

        localStorage.setItem('perfil_usuario', JSON.stringify(datosActualizados));
        pintarDatosPerfil(datosActualizados, ciGuardado);
    } catch (err) {
        console.error('Error en fetch a Supabase:', err);
    }
}

// 4. Ejecución directa al ir al final del body
cargarPerfilRapido();
document.addEventListener('DOMContentLoaded', cargarPerfilAdministrativo);