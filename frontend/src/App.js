import "./App.css";
import { useState } from "react";
import Auth from "./pages/Auth";
import Catalogo from "./pages/catalogo";

function App() {
  const [usuario, setUsuario] = useState(() => {
    const usuarioGuardado = localStorage.getItem("authUser");
    return usuarioGuardado ? JSON.parse(usuarioGuardado) : null;
  });

  const cerrarSesion = () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("authUser");
    setUsuario(null);
  };

  if (!usuario || window.location.pathname.startsWith("/reset-password/")) {
    return <Auth onLogin={setUsuario} />;
  }

  return <Catalogo usuario={usuario} onLogout={cerrarSesion} />;
}

export default App;
