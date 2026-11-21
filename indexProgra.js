const SUPABASE_URL = 'https://ysodorfyloeodalkkphn.supabase.co';
const SUPABASE_KEY = 'sb_publishable_F_Ro8XGajrgNbBdlRPaTvQ_hZHiOOhO';

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

document.getElementById('formLogin').addEventListener('submit', async function (event) {
    event.preventDefault();

    const correo = document.getElementById('correo').value.trim().toLowerCase();
    const password = document.getElementById('password').value.trim();
    const mensajeError = document.getElementById('mensajeError');

    mensajeError.textContent = 'Correo o contraseña incorrectos.';
    mensajeError.style.display = 'none';

    try {
        const { data, error } = await supabaseClient
            .from('usuario')
            .select(`
                ci_persona,
                password,
                id_rol,
                rol (
                    nombre_rol
                )
            `)
            .eq('correo', correo)
            .single();

        if (error || !data || data.password !== password) {
            mensajeError.style.display = 'block';
            return;
        }

        const ci = data.ci_persona;
        const nombreRol = (data.rol?.nombre_rol || '').trim().toLowerCase();

        if (!nombreRol) {
            mensajeError.textContent = 'El usuario no tiene un rol asignado.';
            mensajeError.style.display = 'block';
            return;
        }

        localStorage.setItem('ci_usuario', ci);
        localStorage.setItem('rol_usuario', nombreRol);

        // Como index.html ya está dentro de colegio-san-pedro, va directo a ./nombrerol/perfil_nombrerol.html
        window.location.href = `./${nombreRol}/perfil_${nombreRol}.html`;
    } catch (err) {
        console.error('Error al iniciar sesión:', err);
        mensajeError.textContent = 'Ocurrió un error al intentar iniciar sesión.';
        mensajeError.style.display = 'block';
    }
});