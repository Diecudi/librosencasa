import { useMemo, useState } from "react";
import axios from "axios";

const API_URL = "https://librosencasa.onrender.com";

function Auth({ onLogin }) {
  const tokenReset = useMemo(() => {
    const partes = window.location.pathname.split("/");
    return partes[1] === "reset-password" ? partes[2] : "";
  }, []);

  const [modo, setModo] = useState(tokenReset ? "reset" : "login");
  const [form, setForm] = useState({
    nombre: "",
    email: "",
    password: "",
    confirmarPassword: "",
  });
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);
  const [resetLink, setResetLink] = useState("");

  const titulo = {
    login: "Iniciar sesion",
    registro: "Crear cuenta",
    olvido: "Recuperar contraseña",
    reset: "Cambiar contraseña",
  }[modo];

  const actualizarCampo = (event) => {
    setForm({
      ...form,
      [event.target.name]: event.target.value,
    });
  };

  const limpiarMensajes = () => {
    setMensaje("");
    setError("");
    setResetLink("");
  };

  const cambiarModo = (nuevoModo) => {
    limpiarMensajes();
    setModo(nuevoModo);
  };

  const enviarFormulario = async (event) => {
    event.preventDefault();
    limpiarMensajes();
    setCargando(true);

    try {
      if (modo === "login") {
        const { data } = await axios.post(`${API_URL}/api/usuarios/login`, {
          email: form.email,
          password: form.password,
        });

        localStorage.setItem("authToken", data.token);
        localStorage.setItem("authUser", JSON.stringify(data.usuario));
        onLogin(data.usuario);
        return;
      }

      if (modo === "registro") {
        await axios.post(`${API_URL}/api/usuarios/register`, {
          nombre: form.nombre,
          email: form.email,
          password: form.password,
        });

        setMensaje("Cuenta creada. Ahora puedes iniciar sesion.");
        setModo("login");
        return;
      }

      if (modo === "olvido") {
        const { data } = await axios.post(`${API_URL}/api/usuarios/forgot-password`, {
          email: form.email,
        });

        setMensaje(data.msg);
        setResetLink(data.resetLink || "");
        return;
      }

      if (modo === "reset") {
        if (form.password !== form.confirmarPassword) {
          setError("Las contraseñas no coinciden");
          return;
        }

        await axios.post(`${API_URL}/api/usuarios/reset-password/${tokenReset}`, {
          password: form.password,
        });

        window.history.replaceState({}, "", "/");
        setMensaje("Contraseña actualizada. Inicia sesion con tu nueva contraseña.");
        setModo("login");
      }
    } catch (err) {
      setError(err.response?.data?.msg || "No se pudo completar la operacion");
    } finally {
      setCargando(false);
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-panel">
        <div className="auth-copy">
          <p>Libros en Casa</p>
          <h1>Tu biblioteca digital protegida.</h1>
          <span>Accede al catalogo, revisa cada libro y abre sus PDFs desde una cuenta personal.</span>
        </div>

        <form className="auth-card" onSubmit={enviarFormulario}>
          <div className="auth-card__header">
            <span>{modo === "reset" ? "Recuperacion" : "Acceso"}</span>
            <h2>{titulo}</h2>
          </div>

          {modo === "registro" && (
            <label>
              Nombre
              <input
                autoComplete="name"
                name="nombre"
                onChange={actualizarCampo}
                required
                type="text"
                value={form.nombre}
              />
            </label>
          )}

          {(modo === "login" || modo === "registro" || modo === "olvido") && (
            <label>
              Correo
              <input
                autoComplete="email"
                name="email"
                onChange={actualizarCampo}
                required
                type="email"
                value={form.email}
              />
            </label>
          )}

          {(modo === "login" || modo === "registro" || modo === "reset") && (
            <label>
              Contraseña
              <input
                autoComplete={modo === "login" ? "current-password" : "new-password"}
                minLength="6"
                name="password"
                onChange={actualizarCampo}
                required
                type="password"
                value={form.password}
              />
            </label>
          )}

          {modo === "reset" && (
            <label>
              Confirmar contraseña
              <input
                autoComplete="new-password"
                minLength="6"
                name="confirmarPassword"
                onChange={actualizarCampo}
                required
                type="password"
                value={form.confirmarPassword}
              />
            </label>
          )}

          {mensaje && <div className="auth-alert auth-alert--ok">{mensaje}</div>}
          {error && <div className="auth-alert auth-alert--error">{error}</div>}

          {resetLink && (
            <a className="auth-reset-link" href={resetLink}>
              Abrir link de recuperacion local
            </a>
          )}

          <button className="auth-submit" disabled={cargando} type="submit">
            {cargando ? "Procesando..." : titulo}
          </button>

          <div className="auth-switch">
            {modo === "login" && (
              <>
                <button type="button" onClick={() => cambiarModo("registro")}>
                  Crear cuenta
                </button>
                <button type="button" onClick={() => cambiarModo("olvido")}>
                  Olvide mi contraseña
                </button>
              </>
            )}

            {(modo === "registro" || modo === "olvido") && (
              <button type="button" onClick={() => cambiarModo("login")}>
                Volver al login
              </button>
            )}
          </div>
        </form>
      </section>
    </main>
  );
}

export default Auth;
