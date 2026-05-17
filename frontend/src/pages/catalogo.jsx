import { useEffect, useMemo, useState, useCallback} from "react";
import axios from "axios";
import * as pdfjsLib from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker.entry";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

    function normalizarRuta(ruta, carpeta) {
    if (!ruta) return "";
    if (ruta.startsWith("http")) return ruta;
    const rutaLimpia = ruta.startsWith("/") ? ruta : `/${ruta}`;
    return rutaLimpia.replace("/images/", `/${carpeta}/`);
    }

    function PdfPreview({ pdfUrl, titulo }) {
    const [paginas, setPaginas] = useState([]);
    const [estado, setEstado] = useState("Cargando vista previa...");

    useEffect(() => {
        let cancelado = false;

        async function cargarPreview() {
        try {
            setPaginas([]);
            setEstado("Cargando vista previa...");

            const pdf = await pdfjsLib.getDocument(pdfUrl).promise;
            const total = Math.min(pdf.numPages, 10);
            const renderizadas = [];

            for (let numero = 1; numero <= total; numero += 1) {
            if (cancelado) return;

            const pagina = await pdf.getPage(numero);
            const viewportOriginal = pagina.getViewport({ scale: 1 });
            const scale = Math.min(1.5, 1000 / viewportOriginal.width);
            const viewport = pagina.getViewport({ scale });
            const canvas = document.createElement("canvas");
            const context = canvas.getContext("2d");

            canvas.width = viewport.width;
            canvas.height = viewport.height;

            await pagina.render({
                canvasContext: context,
                viewport,
            }).promise;

            renderizadas.push({
                numero,
                src: canvas.toDataURL("image/jpeg", 0.88),
            });
            }

            if (!cancelado) {
            setPaginas(renderizadas);
            setEstado(`Mostrando ${renderizadas.length} primeras paginas`);
            }
        } catch (error) {
            if (!cancelado) {
            setEstado("No se pudo cargar la vista previa");
            }
        }
        }

        if (pdfUrl) {
        cargarPreview();
        }

        return () => {
        cancelado = true;
        };
    }, [pdfUrl]);

    return (
        <section className="preview-pdf" style={{ display: "flex", flexDirection: "column", width: "100%" }}>
        <div className="preview-pdf__header" style={{ marginBottom: "20px", textAlign: "center" }}>
            <p style={{ margin: "0", fontSize: "1.2rem", fontWeight: "bold" }}>Vista previa</p>
            <span style={{ color: "#666", fontSize: "0.9rem" }}>{estado}</span>
        </div>

        <div className="mini-lector" aria-label={`Vista previa de ${titulo}`} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "30px", width: "100%" }}>
            {paginas.length > 0 ? (
                paginas.map((pagina) => (
                    <img 
                        key={pagina.numero} 
                        src={pagina.src} 
                        alt={`Pagina ${pagina.numero} de ${titulo}`} 
                        style={{ maxWidth: "100%", height: "auto", boxShadow: "0 4px 12px rgba(0,0,0,0.15)", border: "1px solid #ddd" }} 
                    />
                ))
            ) : (
                <div className="mini-lector__cargando" style={{ padding: "40px" }}>Preparando paginas...</div>
            )}
        </div>
        </section>
    );
    }

    function Catalogo({ usuario, onLogout }) {
    const [libros, setLibros] = useState([]);
    const [busqueda, setBusqueda] = useState("");
    const [categoria, setCategoria] = useState("Todos");
    const [estado, setEstado] = useState("Cargando catalogo...");
    const [carrito, setCarrito] = useState([]);
    const [pagina, setPagina] = useState("inicio");
    const [libroActivo, setLibroActivo] = useState(null);
    const [mostrarMuestra, setMostrarMuestra] = useState(false);
    const [procesandoCompra, setProcesandoCompra] = useState(false);
    const [mensajeCompra, setMensajeCompra] = useState("");
    const [comentarios, setComentarios] = useState([]);
    const [nuevaResena, setNuevaResena] = useState("");
    const [nuevaValoracion, setNuevaValoracion] = useState(5);
    const [comentarioEditando, setComentarioEditando] = useState(null);
    const [misLibros, setMisLibros] = useState([]);
    const [adminTab, setAdminTab] = useState("libros");
    const [adminUsuarios, setAdminUsuarios] = useState([]);
    const [adminPedidos, setAdminPedidos] = useState([]);
    const [adminLibroForm, setAdminLibroForm] = useState(null);
    const [adminUsuarioForm, setAdminUsuarioForm] = useState(null);

    useEffect(() => {
        axios
        .get(`${API_URL}/api/libros`)
        .then((res) => {
            if (Array.isArray(res.data) && res.data.length > 0) {
            setLibros(res.data);
            setEstado("Catalogo conectado a la API");
            } else {
            setEstado("No hay libros disponibles");
            }
        })
        .catch(() => setEstado("Error al cargar los libros de la base de datos"));
    }, []);

    const cargarAdminDatos = useCallback(async () => {
        if (usuario?.rol !== "admin") return;
        try {
            const [resUsuarios, resPedidos, resLibros] = await Promise.all([
                axios.get(`${API_URL}/api/usuarios`),
                axios.get(`${API_URL}/api/pedidos`),
                axios.get(`${API_URL}/api/libros`)
            ]);
            setAdminUsuarios(resUsuarios.data);
            setAdminPedidos(resPedidos.data);
            setLibros(resLibros.data);
        } catch (error) {
            console.error("Error al cargar datos del panel de administrador", error);
        }
    }, [usuario]);

    useEffect(() => {
        if (pagina === "detalle" && libroActivo) {
            cargarComentarios(libroActivo._id);
        }
        if (pagina === "admin") {
            cargarAdminDatos();
        }
    }, [pagina, libroActivo, cargarAdminDatos]);

    

    const cargarMisLibros = useCallback(async () => {
        if (!usuario) return;
        try {
            const id = usuario.id || usuario._id;
            const { data } = await axios.get(`${API_URL}/api/usuarios/mis-libros/${id}`);
            setMisLibros(data);
        } catch (error) {
            console.error("Error al cargar mis libros", error);
        }
    });

    useEffect(() => {
        cargarMisLibros();
    }, [usuario,cargarMisLibros]);

    const yaComprado = (libro) => misLibros.some((l) => String(l._id) === String(libro._id));

    const categorias = useMemo(
        () => ["Todos", ...new Set(libros.map((libro) => libro.categoria).filter(Boolean))],
        [libros]
    );

    const destacados = useMemo(() => {
        const filtrados = libros.filter((libro) => libro.destacado);
        return filtrados.length > 0 ? filtrados.slice(0, 4) : libros.slice(0, 4);
    }, [libros]);

    const categoriasResumen = useMemo(
        () =>
        categorias
            .filter((item) => item !== "Todos")
            .map((item) => ({
            nombre: item,
            total: libros.filter((libro) => libro.categoria === item).length,
            })),
        [categorias, libros]
    );

    const librosFiltrados = useMemo(() => {
        const texto = busqueda.trim().toLowerCase();

        return libros.filter((libro) => {
        const coincideCategoria = categoria === "Todos" || libro.categoria === categoria;
        const coincideTexto =
            !texto ||
            [libro.titulo, libro.autor, libro.genero, libro.descripcion]
            .filter(Boolean)
            .some((valor) => valor.toLowerCase().includes(texto));

        return coincideCategoria && coincideTexto;
        });
    }, [busqueda, categoria, libros]);

    const totalCarrito = carrito.reduce((total, item) => total + item.precio * item.cantidad, 0);
    const cantidadCarrito = carrito.reduce((total, item) => total + item.cantidad, 0);

    const navegar = (destino) => {
        setPagina(destino);
        setMensajeCompra("");
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const cargarComentarios = async (libroId) => {
        try {
            const { data } = await axios.get(`${API_URL}/api/usuarios/comentarios/${libroId}`);
            setComentarios(data);
        } catch (error) {
            console.error("Error al cargar comentarios", error);
        }
    };

    const enviarComentario = async (e) => {
        e.preventDefault();
        if (!usuario?.id && !usuario?._id) {
            alert("Debes iniciar sesion para poder calificar un libro.");
            return;
        }

        try {
            if (comentarioEditando) {
                await axios.put(`${API_URL}/api/usuarios/comentarios/${comentarioEditando}`, {
                    valoracion: nuevaValoracion,
                    review: nuevaResena
                });
                setComentarioEditando(null);
            } else {
                await axios.post(`${API_URL}/api/usuarios/comentarios`, {
                    usuarioId: usuario.id || usuario._id,
                    libroId: libroActivo._id,
                    valoracion: nuevaValoracion,
                    review: nuevaResena,
                    nombreUsuario: usuario.nombre
                });
            }
            setNuevaResena("");
            setNuevaValoracion(5);
            cargarComentarios(libroActivo._id); // Recargar la lista
        } catch (error) {
            alert("Hubo un error al guardar tu reseña.");
        }
    };

    const iniciarEdicion = (comentario) => {
        setComentarioEditando(comentario._id);
        setNuevaResena(comentario.review);
        setNuevaValoracion(comentario.valoracion);
    };

    const cancelarEdicion = () => {
        setComentarioEditando(null);
        setNuevaResena("");
        setNuevaValoracion(5);
    };

    const abrirLibro = (libro) => {
        setLibroActivo(libro);
        setMostrarMuestra(false);
        navegar("detalle");
    };

    const agregarAlCarrito = (libro) => {
        if (yaComprado(libro)) {
            alert("Ya tienes este libro en tu biblioteca.");
            return;
        }

        setCarrito((items) => {
        const existe = items.find((item) => item._id === libro._id);

        if (existe) {
            return items.map((item) =>
            item._id === libro._id ? { ...item, cantidad: item.cantidad + 1 } : item
            );
        }

        return [...items, { ...libro, cantidad: 1 }];
        });
    };

    const cambiarCantidad = (id, cambio) => {
        setCarrito((items) =>
        items
            .map((item) =>
            item._id === id ? { ...item, cantidad: Math.max(0, item.cantidad + cambio) } : item
            )
            .filter((item) => item.cantidad > 0)
        );
    };

    const irACategoria = (item) => {
        setCategoria(item);
        navegar("catalogo");
    };

    const realizarCompra = async () => {
        if (carrito.length === 0) return;
        
        if (!usuario?.email) {
            setMensajeCompra("Error: Debes iniciar sesion para poder realizar la compra y recibir los libros.");
            return;
        }
        
        setProcesandoCompra(true);
        setMensajeCompra("");

        try {
            await axios.post(`${API_URL}/api/usuarios/comprar`, { 
                items: carrito, 
                email: usuario.email,
                usuarioId: usuario.id || usuario._id
            });

            setCarrito([]);
            setMensajeCompra(`¡Compra exitosa! Los libros han sido enviados a ${usuario?.email || "tu correo electrónico"}.`);
            cargarMisLibros(); // Refresca la biblioteca
        } catch (error) {
            setMensajeCompra(error.response?.data?.msg || "Hubo un error al procesar la compra. Inténtalo de nuevo.");
        } finally {
            setProcesandoCompra(false);
        }
    };

    const guardarLibro = async (e) => {
        e.preventDefault();
        try {
            if (adminLibroForm._id) {
                await axios.put(`${API_URL}/api/libros/${adminLibroForm._id}`, adminLibroForm);
            } else {
                await axios.post(`${API_URL}/api/libros`, adminLibroForm);
            }
            setAdminLibroForm(null);
            cargarAdminDatos();
            alert("Libro guardado correctamente");
        } catch (error) {
            alert("Error al guardar libro");
        }
    };

    const eliminarLibro = async (id) => {
        if (!window.confirm("¿Seguro que deseas eliminar este libro de la base de datos?")) return;
        try {
            await axios.delete(`${API_URL}/api/libros/${id}`);
            cargarAdminDatos();
        } catch (error) {
            alert("Error al eliminar libro");
        }
    };

    const guardarUsuario = async (e) => {
        e.preventDefault();
        try {
            if (adminUsuarioForm._id) {
                // Actualizar usuario existente
                await axios.put(`${API_URL}/api/usuarios/${adminUsuarioForm._id}`, {
                    nombre: adminUsuarioForm.nombre,
                    email: adminUsuarioForm.email,
                    rol: adminUsuarioForm.rol
                });
            } else {
                // Crear un nuevo usuario (usamos la ruta register)
                const { data } = await axios.post(`${API_URL}/api/usuarios/register`, adminUsuarioForm);
                // Si lo creamos como "admin", lo actualizamos porque el registro asigna "usuario" por defecto
                if (adminUsuarioForm.rol === "admin" && data.usuario?.id) {
                    await axios.put(`${API_URL}/api/usuarios/${data.usuario.id}`, { rol: "admin" });
                }
            }
            setAdminUsuarioForm(null);
            cargarAdminDatos();
            alert("Usuario guardado correctamente");
        } catch (error) {
            alert(error.response?.data?.msg || "Error al guardar usuario");
        }
    };

    const cambiarRolUsuario = async (id, rolActual) => {
        const nuevoRol = rolActual === "admin" ? "usuario" : "admin";
        try {
            await axios.put(`${API_URL}/api/usuarios/${id}`, { rol: nuevoRol });
            cargarAdminDatos();
        } catch (error) {
            alert("Error al cambiar rol");
        }
    };

    const eliminarUsuario = async (id) => {
        if (!window.confirm("¿Eliminar usuario? Esta acción es irreversible.")) return;
        try {
            await axios.delete(`${API_URL}/api/usuarios/${id}`);
            cargarAdminDatos();
        } catch (error) {
            alert("Error al eliminar usuario");
        }
    };

    const renderInicio = () => (
        <>
        <section className="hero-tienda">
            <div className="hero-tienda__texto">
            <p className="catalogo__etiqueta">Tienda online de lectura</p>
            <h1>Encuentra tu proxima lectura desde casa.</h1>
            <p>
                Compra libros clasicos, guias educativas y cuentos infantiles. Revisa cada ficha,
                agrega al carrito y mira una muestra de 10 paginas antes de comprar.
            </p>
            <div className="hero-tienda__acciones">
                <button type="button" onClick={() => navegar("catalogo")}>
                Ver catalogo
                </button>
            </div>
            </div>

            <div className="hero-tienda__vitrina" aria-label="Libros destacados de portada">
            {destacados.slice(0, 3).map((libro) => (
                <button key={libro._id} type="button" onClick={() => abrirLibro(libro)}>
                <img src={normalizarRuta(libro.imagen, "img")} alt={`Portada de ${libro.titulo}`} />
                </button>
            ))}
            </div>
        </section>

        <section className="metricas-tienda" aria-label="Beneficios de la tienda">
            <div>
            <strong>{libros.length}+</strong>
            <span>titulos disponibles</span>
            </div>
            <div>
            <strong>10</strong>
            <span>paginas de muestra</span>
            </div>
            <div>
            <strong>S/ 35</strong>
            <span>desde precios accesibles</span>
            </div>
            <div>
            <strong>PDF</strong>
            <span>vista previa inmediata</span>
            </div>
        </section>

      <section className="pagina-tienda">
        <div className="seccion-tienda__titulo">
          <p>Seleccion especial</p>
          <h2>Libros destacados</h2>
        </div>

        <div className="destacados-grid">
          {destacados.map((libro) => (
            <article className="destacado-card" key={libro._id}>
              <button type="button" onClick={() => abrirLibro(libro)}>
                <img src={normalizarRuta(libro.imagen, "img")} alt={`Portada de ${libro.titulo}`} />
              </button>
              <div>
                <span>{libro.categoria}</span>
                <h3>{libro.titulo}</h3>
                <p>{libro.autor}</p>
                <strong>S/ {Number(libro.precio || 0).toFixed(2)}</strong>
                {yaComprado(libro) ? (
                  <span style={{ display: "block", color: "#28a745", fontWeight: "bold", margin: "10px 0" }}>En Biblioteca</span>
                ) : (
                  <button type="button" onClick={() => agregarAlCarrito(libro)}>
                    Agregar al carrito
                  </button>
                )}
                <button type="button" className="btn-secundario" onClick={() => abrirLibro(libro)}>
                  Ver datos
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </>
    );

    const renderCategorias = () => (
        <section className="pagina-tienda">
        <div className="seccion-tienda__titulo">
            <p>Explora por tema</p>
            <h2>Catalogo por categoria</h2>
        </div>

        <div className="categoria-resumen">
            {categoriasResumen.map((item) => (
            <button key={item.nombre} type="button" onClick={() => irACategoria(item.nombre)}>
                <strong>{item.nombre}</strong>
                <span>{item.total} libros</span>
            </button>
            ))}
        </div>
        </section>
    );

    const renderCatalogo = () => (
        <section className="pagina-tienda catalogo-bloque">
        <div className="catalogo__encabezado">
            <div>
            <p className="catalogo__etiqueta">Libros en Casa</p>
            <h2>Catalogo de libros</h2>
            <p className="catalogo__intro">
                Filtra por categoria, busca por titulo o autor y abre la ventana de cada libro.
            </p>
            </div>
            <span className="catalogo__estado">{estado}</span>
        </div>

        <section className="catalogo__controles" aria-label="Filtros del catalogo">
            <label className="campo-busqueda">
            <span>Buscar</span>
            <input
                type="search"
                placeholder="Titulo, autor o genero"
                value={busqueda}
                onChange={(event) => setBusqueda(event.target.value)}
            />
            </label>

            <div className="categorias" aria-label="Categorias">
            {categorias.map((item) => (
                <button
                className={item === categoria ? "categoria categoria--activa" : "categoria"}
                key={item}
                type="button"
                onClick={() => setCategoria(item)}
                >
                {item}
                </button>
            ))}
            </div>
        </section>

        <div className="tienda-grid" aria-live="polite">
            {librosFiltrados.map((libro) => (
            <article className="producto-card" key={libro._id}>
                <button type="button" className="producto-card__imagen" onClick={() => abrirLibro(libro)}>
                <img src={normalizarRuta(libro.imagen, "img")} alt={`Portada de ${libro.titulo}`} />
                </button>
                <div className="producto-card__contenido">
                <span>{libro.categoria}</span>
                <h3>{libro.titulo}</h3>
                <p>{libro.autor}</p>
                <small>{libro.descripcion}</small>
                <dl>
                    <div>
                    <dt>Paginas</dt>
                    <dd>{libro.paginas ?? "-"}</dd>
                    </div>
                </dl>
                <div className="producto-card__acciones">
                    <strong>S/ {Number(libro.precio || 0).toFixed(2)}</strong>
                    {yaComprado(libro) ? (
                        <span style={{ color: "#28a745", fontWeight: "bold", fontSize: "0.9rem", padding: "10px 0" }}>En Biblioteca</span>
                    ) : (
                        <button type="button" onClick={() => agregarAlCarrito(libro)}>
                        Agregar
                        </button>
                    )}
                    <button type="button" className="btn-secundario" onClick={() => abrirLibro(libro)}>
                    Ver datos
                    </button>
                </div>
                </div>
            </article>
            ))}

            {librosFiltrados.length === 0 && (
            <div className="sin-resultados">
                <strong>No se encontraron libros</strong>
                <span>Prueba con otra busqueda o categoria.</span>
            </div>
            )}
        </div>
        </section>
    );

    const renderDetalle = () => {
        if (!libroActivo) return null;

        const portada = normalizarRuta(libroActivo?.imagen, "img");
        const pdf = normalizarRuta(libroActivo?.pdf, "pdf");

        const misComentarios = comentarios.filter(c => String(c.usuarioId) === String(usuario?.id || usuario?._id));
        const otrosComentarios = comentarios.filter(c => String(c.usuarioId) !== String(usuario?.id || usuario?._id));

        return (
        <section className="pagina-tienda detalle-pagina">
            <button className="volver-btn" type="button" onClick={() => navegar("catalogo")}>
            Volver al catalogo
            </button>

        <div className="detalle-libro-completo" style={{ display: "flex", gap: "30px", alignItems: "flex-start", flexWrap: "wrap", justifyContent: "space-between", width: "100%" }}>
            <div style={{ display: "flex", gap: "30px", flex: "1 1 500px", flexWrap: "wrap" }}>
                <div style={{ flex: "1 1 250px", maxWidth: "300px", display: "flex", flexDirection: "column", gap: "10px" }}>
                    <img 
                        src={portada} 
                        alt={`Portada de ${libroActivo.titulo}`} 
                        style={{ width: "100%", height: "auto", objectFit: "contain", borderRadius: "8px", cursor: "pointer", border: "1px solid #eee" }} 
                        onClick={() => setMostrarMuestra(true)}
                    />
                    <button type="button" onClick={() => setMostrarMuestra(true)} style={{ padding: "10px", background: "#b9c6d9", border: "1px solid #d5d9d9", borderRadius: "8px", cursor: "pointer", fontWeight: "bold", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                        Leer muestra
                    </button>
                </div>
                
                <div style={{ flex: "1 1 300px", minWidth: 0 }}>
                    <p className="catalogo__etiqueta" style={{ marginBottom: "5px" }}>{libroActivo.categoria}</p>
                    <h2 style={{ fontSize: "1.6rem", marginTop: "0", marginBottom: "10px" }}>{libroActivo.titulo}</h2>
                    <span style={{ fontSize: "1.1rem", fontWeight: "bold", color: "#555" }}>{libroActivo.autor}</span>
                    <p style={{ marginTop: "10px", marginBottom: "20px", lineHeight: "1.6" }}>{libroActivo.descripcion}</p>

                        <div className="detalle-info-compra">
                            <dl className="detalle-datos-grid">
                            <div>
                                <dt>Precio</dt>
                                <dd>S/ {Number(libroActivo.precio || 0).toFixed(2)}</dd>
                            </div>
                            <div>
                                <dt>Genero</dt>
                                <dd>{libroActivo.genero}</dd>
                            </div>
                            <div>
                                <dt>Categoria</dt>
                                <dd>{libroActivo.categoria}</dd>
                            </div>
                            <div>
                                <dt>Paginas</dt>
                                <dd>{libroActivo.paginas ?? "-"}</dd>
                            </div>
                            <div>
                                <dt>Anio</dt>
                                <dd>{libroActivo.anio ?? "-"}</dd>
                            </div>
                            </dl>

                            <div className="detalle-acciones">
                            {yaComprado(libroActivo) ? (
                                <a href={pdf} target="_blank" rel="noreferrer" style={{ padding: "10px 20px", background: "#28a745", color: "#fff", textDecoration: "none", borderRadius: "5px", fontWeight: "bold" }}>
                                    Leer PDF Completo
                                </a>
                            ) : (
                                <button type="button" onClick={() => agregarAlCarrito(libroActivo)}>
                                    Agregar al carrito
                                </button>
                            )}
                            </div>
                        </div>
                    </div>
                </div>
                {mostrarMuestra && (
                    <div style={{
                        position: "fixed",
                        top: 0,
                        left: 0,
                        width: "100vw",
                        height: "100vh",
                        backgroundColor: "rgba(0, 0, 0, 0.8)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        zIndex: 1000,
                        padding: "20px",
                        boxSizing: "border-box"
                    }}>
                        <div style={{
                            background: "#fff",
                            padding: "20px",
                            borderRadius: "12px",
                            width: "95%",
                            maxWidth: "1100px",
                            height: "95vh",
                            display: "flex",
                            flexDirection: "column",
                            position: "relative"
                        }}>
                            <button 
                                onClick={() => setMostrarMuestra(false)}
                                style={{ position: "absolute", top: "15px", right: "20px", background: "transparent", border: "none", fontSize: "1.5rem", cursor: "pointer", zIndex: 10, color: "#333" }}
                                aria-label="Cerrar muestra"
                            >
                                ✖
                            </button>
                            <div style={{ flex: 1, overflowY: "auto", padding: "10px", marginTop: "20px" }}>
                                <PdfPreview pdfUrl={pdf} titulo={libroActivo.titulo} />
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* SECCIÓN DE RESEÑAS */}
            <div className="seccion-comentarios" style={{ width: "100%", marginTop: "50px", borderTop: "1px solid #ddd", paddingTop: "30px" }}>
                <h3 style={{ fontSize: "1.4rem", marginBottom: "20px" }}>Comentarios y Reseñas</h3>
                
                <form onSubmit={enviarComentario} style={{ display: "flex", flexDirection: "column", gap: "15px", marginBottom: "40px", background: "#f9f9f9", padding: "20px", borderRadius: "8px" }}>
                    <h4 style={{ margin: 0, fontSize: "1.1rem" }}>{comentarioEditando ? "Editar tu reseña" : `Deja tu opinion sobre "${libroActivo.titulo}"`}</h4>
                    
                    <label style={{ fontWeight: "bold" }}>
                        Puntuacion:
                        <select value={nuevaValoracion} onChange={e => setNuevaValoracion(Number(e.target.value))} style={{ marginLeft: "10px", padding: "8px", borderRadius: "5px", border: "1px solid #ccc" }}>
                            <option value={5}>⭐⭐⭐⭐⭐ (5 Excelent)</option>
                            <option value={4}>⭐⭐⭐⭐ (4 Muy bueno)</option>
                            <option value={3}>⭐⭐⭐ (3 Bueno)</option>
                            <option value={2}>⭐⭐ (2 Regular)</option>
                            <option value={1}>⭐ (1 Malo)</option>
                        </select>
                    </label>
                    
                    <textarea
                        required
                        placeholder="Escribe tu opinion aqui..."
                        value={nuevaResena}
                        onChange={e => setNuevaResena(e.target.value)}
                        style={{ padding: "12px", borderRadius: "5px", border: "1px solid #ccc", minHeight: "100px", fontFamily: "inherit" }}
                    />
                    <div style={{ display: "flex", gap: "10px" }}>
                        <button type="submit" disabled={!usuario} style={{ padding: "10px 20px", background: usuario ? "#333" : "#ccc", color: "#fff", border: "none", borderRadius: "5px", cursor: usuario ? "pointer" : "not-allowed", fontWeight: "bold" }}>
                            {!usuario ? "Inicia sesion para publicar" : (comentarioEditando ? "Actualizar reseña" : "Publicar reseña")}
                        </button>
                        {comentarioEditando && (
                            <button type="button" onClick={cancelarEdicion} style={{ padding: "10px 20px", background: "#ccc", color: "#333", border: "none", borderRadius: "5px", cursor: "pointer", fontWeight: "bold" }}>
                                Cancelar
                            </button>
                        )}
                    </div>
                </form>

                <div className="lista-comentarios" style={{ display: "flex", flexDirection: "column", gap: "30px" }}>
                    {misComentarios.length > 0 && (
                        <div>
                            <h4 style={{ fontSize: "1.2rem", borderBottom: "2px solid #eee", paddingBottom: "10px", marginBottom: "15px" }}>Tus reseñas</h4>
                            {misComentarios.map(c => (
                                <div key={c._id} style={{ borderBottom: "1px solid #eee", paddingBottom: "15px", marginBottom: "15px" }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", alignItems: "center" }}>
                                        <div>
                                            <strong style={{ fontSize: "1.1rem" }}>{c.nombreUsuario}</strong>
                                            <span style={{ marginLeft: "10px", fontSize: "0.85rem", background: "#eee", padding: "2px 6px", borderRadius: "4px" }}>Tú</span>
                                        </div>
                                        <span style={{ letterSpacing: "2px" }}>{"⭐".repeat(c.valoracion)}</span>
                                    </div>
                                    <p style={{ margin: "0 0 10px 0", color: "#444", lineHeight: "1.5" }}>{c.review}</p>
                                    <button type="button" onClick={() => iniciarEdicion(c)} style={{ background: "none", border: "none", color: "#0066cc", cursor: "pointer", padding: 0, fontSize: "0.9rem", textDecoration: "underline" }}>Editar reseña</button>
                                </div>
                            ))}
                        </div>
                    )}

                    <div>
                        <h4 style={{ fontSize: "1.2rem", borderBottom: "2px solid #eee", paddingBottom: "10px", marginBottom: "15px" }}>Reseñas de los demas</h4>
                        {otrosComentarios.length > 0 ? otrosComentarios.map(c => (
                            <div key={c._id} style={{ borderBottom: "1px solid #eee", paddingBottom: "15px", marginBottom: "15px" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", alignItems: "center" }}>
                                    <strong style={{ fontSize: "1.1rem" }}>{c.nombreUsuario}</strong>
                                    <span style={{ letterSpacing: "2px" }}>{"⭐".repeat(c.valoracion)}</span>
                                </div>
                                <p style={{ margin: 0, color: "#444", lineHeight: "1.5" }}>{c.review}</p>
                            </div>
                        )) : (
                            <p style={{ color: "#777", fontStyle: "italic" }}>Aun no hay reseñas de otros usuarios. ¡Se el primero en calificar este libro!</p>
                        )}
                    </div>
                </div>
            </div>
        </section>
        );
    };

    const renderCarrito = () => (
        <section className="pagina-tienda carrito-panel">
        <div className="seccion-tienda__titulo">
            <p>Pedido</p>
            <h2>Carrito de compras</h2>
        </div>

        {carrito.length === 0 ? (
            <div className="carrito-vacio">
            <strong>Tu carrito esta vacio</strong>
            <span>Agrega libros desde destacados o desde el catalogo.</span>
            </div>
        ) : (
            <div className="carrito-lista">
            {carrito.map((item) => (
                <div className="carrito-item" key={item._id}>
                <img src={normalizarRuta(item.imagen, "img")} alt={`Portada de ${item.titulo}`} />
                <div>
                    <strong>{item.titulo}</strong>
                    <span>S/ {Number(item.precio || 0).toFixed(2)}</span>
                </div>
                <div className="cantidad-control">
                    <button type="button" onClick={() => cambiarCantidad(item._id, -1)}>
                    -
                    </button>
                    <span>{item.cantidad}</span>
                    <button type="button" onClick={() => cambiarCantidad(item._id, 1)}>
                    +
                    </button>
                </div>
                </div>
            ))}

            <div className="carrito-total">
                <span>Total</span>
                <strong>S/ {totalCarrito.toFixed(2)}</strong>
            </div>
            <button className="checkout-btn" type="button" onClick={realizarCompra} disabled={procesandoCompra} style={{ opacity: procesandoCompra ? 0.7 : 1 }}>
                {procesandoCompra ? "Procesando..." : "Comprar"}
            </button>
            </div>
        )}
        {mensajeCompra && (
            <div style={{ marginTop: "20px", padding: "15px", borderRadius: "8px", backgroundColor: mensajeCompra.includes("error") ? "#f8d7da" : "#d4edda", color: mensajeCompra.includes("error") ? "#721c24" : "#155724", textAlign: "center", border: "1px solid", borderColor: mensajeCompra.includes("error") ? "#f5c6cb" : "#c3e6cb", fontWeight: "bold" }}>
                {mensajeCompra}
            </div>
        )}
        </section>
    );

    const renderUsuario = () => (
        <section className="pagina-tienda usuario-panel">
        <div className="seccion-tienda__titulo">
            <p>Cuenta</p>
            <h2>Usuario</h2>
        </div>
        <dl>
            <div>
            <dt>Nombre</dt>
            <dd>{usuario?.nombre}</dd>
            </div>
            <div>
            <dt>Correo</dt>
            <dd>{usuario?.email}</dd>
            </div>
            <div>
            <dt>Rol</dt>
            <dd>{usuario?.rol || "usuario"}</dd>
            </div>
        </dl>

        <div className="seccion-tienda__titulo">
            <p>Tu Biblioteca</p>
            <h2>Mis Libros</h2>
        </div>
        
        {misLibros.length === 0 ? (
            <div className="sin-resultados">
                <strong>Aún no has comprado ningún libro</strong>
                <span>Tus compras aparecerán aquí para que puedas leerlas siempre.</span>
            </div>
            
        ) : (
            <div className="destacados-grid">
                {misLibros.map(libro => {
                    const pdfUrl = normalizarRuta(libro.pdf, "pdf");
                    return (
                        <article className="destacado-card" key={libro._id}>
                            <button type="button" onClick={() => abrirLibro(libro)}>
                                <img src={normalizarRuta(libro.imagen, "img")} alt={`Portada de ${libro.titulo}`} />
                            </button>
                            <div>
                                <span>{libro.categoria}</span>
                                <h3>{libro.titulo}</h3>
                                <p>{libro.autor}</p>
                                <a href={pdfUrl} target="_blank" rel="noreferrer" style={{ display: "block", padding: "10px", background: "#333", color: "#fff", borderRadius: "5px", textDecoration: "none", fontWeight: "bold", textAlign: "center", marginTop: "10px" }}>
                                    Leer / Descargar PDF
                                </a>
                            </div>
                        </article>
                    );
                })}
            </div>
        )}
        <button type="button" onClick={onLogout} style={{ marginBottom: "40px" }}>
            Cerrar sesion
        </button>
        </section>
    );

    const renderQuienesSomos = () => (
        <section className="pagina-tienda quienes-somos">
        <div>
            <p className="catalogo__etiqueta">Quienes somos</p>
            <h2>Una tienda creada para acercar libros a casa.</h2>
        </div>
        <p>
            Libros en Casa reune lecturas clasicas, materiales educativos y cuentos familiares en una
            experiencia simple: busca, revisa, arma tu pedido y consulta las primeras paginas antes de
            comprar.
        </p>
        </section>
    );

    const renderAdminLibros = () => (
        <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                <h3 style={{ margin: 0 }}>Gestión de Libros</h3>
                <button type="button" style={{ padding: "8px 16px", background: "#28a745", color: "white", border: "none", borderRadius: "4px", fontWeight: "bold", cursor: "pointer" }} onClick={() => setAdminLibroForm({ titulo: "", autor: "", genero: "", categoria: "", precio: 0, descripcion: "", imagen: "", pdf: "", paginas: 0, anio: new Date().getFullYear(), destacado: false })}>
                    + Nuevo Libro
                </button>
            </div>
            {adminLibroForm ? (
                <form onSubmit={guardarLibro} style={{ background: "#f9f9f9", padding: "20px", borderRadius: "8px", display: "grid", gap: "15px", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
                    <label>Título: <input type="text" value={adminLibroForm.titulo} onChange={e => setAdminLibroForm({...adminLibroForm, titulo: e.target.value})} required style={{ width: "100%", padding: "8px", marginTop: "5px" }} /></label>
                    <label>Autor: <input type="text" value={adminLibroForm.autor} onChange={e => setAdminLibroForm({...adminLibroForm, autor: e.target.value})} required style={{ width: "100%", padding: "8px", marginTop: "5px" }} /></label>
                    <label>Categoría: <input type="text" value={adminLibroForm.categoria} onChange={e => setAdminLibroForm({...adminLibroForm, categoria: e.target.value})} required style={{ width: "100%", padding: "8px", marginTop: "5px" }} /></label>
                    <label>Género: <input type="text" value={adminLibroForm.genero} onChange={e => setAdminLibroForm({...adminLibroForm, genero: e.target.value})} required style={{ width: "100%", padding: "8px", marginTop: "5px" }} /></label>
                    <label>Precio (S/): <input type="number" step="0.1" value={adminLibroForm.precio} onChange={e => setAdminLibroForm({...adminLibroForm, precio: Number(e.target.value)})} required style={{ width: "100%", padding: "8px", marginTop: "5px" }} /></label>
                    <label style={{ gridColumn: "1 / -1" }}>Descripción: <textarea value={adminLibroForm.descripcion} onChange={e => setAdminLibroForm({...adminLibroForm, descripcion: e.target.value})} required style={{ width: "100%", padding: "8px", marginTop: "5px", height: "80px", fontFamily: "inherit", resize: "vertical" }} /></label>
                    <label style={{ gridColumn: "1 / -1" }}>Imagen (Ruta local o URL URL): <input type="text" value={adminLibroForm.imagen} onChange={e => setAdminLibroForm({...adminLibroForm, imagen: e.target.value})} required style={{ width: "100%", padding: "8px", marginTop: "5px" }} /></label>
                    <label style={{ gridColumn: "1 / -1" }}>PDF (Ruta local o URL): <input type="text" value={adminLibroForm.pdf} onChange={e => setAdminLibroForm({...adminLibroForm, pdf: e.target.value})} required style={{ width: "100%", padding: "8px", marginTop: "5px" }} /></label>
                    <label>Páginas: <input type="number" value={adminLibroForm.paginas} onChange={e => setAdminLibroForm({...adminLibroForm, paginas: Number(e.target.value)})} required style={{ width: "100%", padding: "8px", marginTop: "5px" }} /></label>
                    <label>Año: <input type="number" value={adminLibroForm.anio} onChange={e => setAdminLibroForm({...adminLibroForm, anio: Number(e.target.value)})} required style={{ width: "100%", padding: "8px", marginTop: "5px" }} /></label>
                    <label style={{ display: "flex", alignItems: "center", gap: "10px", gridColumn: "1 / -1", marginTop: "15px", fontWeight: "bold" }}><input type="checkbox" checked={adminLibroForm.destacado} onChange={e => setAdminLibroForm({...adminLibroForm, destacado: e.target.checked})} style={{ width: "20px", height: "20px" }} /> Mostrar este libro en el apartado Destacado de Inicio</label>
                    {adminLibroForm._id && (
                        <div style={{ gridColumn: "1 / -1", display: "flex", gap: "20px", marginTop: "10px", padding: "10px", background: "#e9ecef", borderRadius: "5px", alignItems: "center", flexWrap: "wrap" }}>
                            <span><strong>Valoración Promedio:</strong> {Number(adminLibroForm.valoracion || 0).toFixed(1)} ⭐</span>
                            <span><strong>Total de Reseñas:</strong> {adminLibroForm.totalReviews || 0}</span>
                            <span style={{ fontSize: "0.85rem", color: "#6c757d" }}>(Estos valores se calculan automáticamente y no se pueden editar manualmente)</span>
                        </div>
                    )}
                    <div style={{ gridColumn: "1 / -1", display: "flex", gap: "10px", marginTop: "10px" }}>
                        <button type="submit" style={{ padding: "10px 20px", background: "#007bff", color: "white", border: "none", borderRadius: "5px", fontWeight: "bold", cursor: "pointer" }}>Guardar Registro</button>
                        <button type="button" onClick={() => setAdminLibroForm(null)} style={{ padding: "10px 20px", background: "#ccc", color: "#333", border: "none", borderRadius: "5px", fontWeight: "bold", cursor: "pointer" }}>Cancelar</button>
                    </div>
                </form>
            ) : (
                <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                        <thead>
                            <tr style={{ borderBottom: "2px solid #ddd" }}>
                                <th style={{ padding: "10px" }}>Título</th>
                                <th style={{ padding: "10px" }}>Autor</th>
                                <th style={{ padding: "10px" }}>Precio</th>
                                <th style={{ padding: "10px" }}>Valoración / Reseñas</th>
                                <th style={{ padding: "10px" }}>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {libros.map(libro => (
                                <tr key={libro._id} style={{ borderBottom: "1px solid #eee" }}>
                                    <td style={{ padding: "10px" }}>{libro.titulo} {libro.destacado && "⭐"}</td>
                                    <td style={{ padding: "10px" }}>{libro.autor}</td>
                                    <td style={{ padding: "10px" }}>S/ {Number(libro.precio || 0).toFixed(2)}</td>
                                    <td style={{ padding: "10px" }}>{Number(libro.valoracion || 0).toFixed(1)} ⭐ ({libro.totalReviews || 0})</td>
                                    <td style={{ padding: "10px", display: "flex", gap: "10px" }}>
                                        <button onClick={() => setAdminLibroForm(libro)} style={{ background: "#ffc107", border: "none", padding: "5px 10px", borderRadius: "3px", cursor: "pointer", fontWeight: "bold" }}>Editar</button>
                                        <button onClick={() => eliminarLibro(libro._id)} style={{ background: "#dc3545", color: "white", border: "none", padding: "5px 10px", borderRadius: "3px", cursor: "pointer", fontWeight: "bold" }}>Borrar</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );

    const renderAdminUsuarios = () => (
        <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                <h3 style={{ margin: 0 }}>Gestión de Usuarios</h3>
                <button type="button" style={{ padding: "8px 16px", background: "#28a745", color: "white", border: "none", borderRadius: "4px", fontWeight: "bold", cursor: "pointer" }} onClick={() => setAdminUsuarioForm({ nombre: "", email: "", password: "", rol: "usuario" })}>
                    + Nuevo Usuario
                </button>
            </div>
            {adminUsuarioForm ? (
                <form onSubmit={guardarUsuario} style={{ background: "#f9f9f9", padding: "20px", borderRadius: "8px", display: "grid", gap: "15px", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
                    <label>Nombre: <input type="text" value={adminUsuarioForm.nombre} onChange={e => setAdminUsuarioForm({...adminUsuarioForm, nombre: e.target.value})} required style={{ width: "100%", padding: "8px", marginTop: "5px" }} /></label>
                    <label>Email: <input type="email" value={adminUsuarioForm.email} onChange={e => setAdminUsuarioForm({...adminUsuarioForm, email: e.target.value})} required style={{ width: "100%", padding: "8px", marginTop: "5px" }} /></label>
                    {!adminUsuarioForm._id && (
                        <label>Contraseña: <input type="password" value={adminUsuarioForm.password || ""} onChange={e => setAdminUsuarioForm({...adminUsuarioForm, password: e.target.value})} required minLength="6" style={{ width: "100%", padding: "8px", marginTop: "5px" }} /></label>
                    )}
                    <label>Rol: 
                        <select value={adminUsuarioForm.rol || "usuario"} onChange={e => setAdminUsuarioForm({...adminUsuarioForm, rol: e.target.value})} style={{ width: "100%", padding: "8px", marginTop: "5px" }}>
                            <option value="usuario">Usuario</option>
                            <option value="admin">Administrador</option>
                        </select>
                    </label>
                    <div style={{ gridColumn: "1 / -1", display: "flex", gap: "10px", marginTop: "10px" }}>
                        <button type="submit" style={{ padding: "10px 20px", background: "#007bff", color: "white", border: "none", borderRadius: "5px", fontWeight: "bold", cursor: "pointer" }}>Guardar Registro</button>
                        <button type="button" onClick={() => setAdminUsuarioForm(null)} style={{ padding: "10px 20px", background: "#ccc", color: "#333", border: "none", borderRadius: "5px", fontWeight: "bold", cursor: "pointer" }}>Cancelar</button>
                    </div>
                </form>
            ) : (
                <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                        <thead>
                            <tr style={{ borderBottom: "2px solid #ddd" }}>
                                <th style={{ padding: "10px" }}>Nombre</th>
                                <th style={{ padding: "10px" }}>Email</th>
                                <th style={{ padding: "10px" }}>Rol</th>
                                <th style={{ padding: "10px" }}>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {adminUsuarios.map(u => (
                                <tr key={u._id} style={{ borderBottom: "1px solid #eee" }}>
                                    <td style={{ padding: "10px" }}>{u.nombre}</td>
                                    <td style={{ padding: "10px" }}>{u.email}</td>
                                    <td style={{ padding: "10px" }}><span style={{ padding: "3px 8px", borderRadius: "12px", background: u.rol === "admin" ? "#28a745" : "#6c757d", color: "white", fontSize: "0.85rem" }}>{u.rol || "usuario"}</span></td>
                                    <td style={{ padding: "10px", display: "flex", gap: "10px", flexWrap: "wrap" }}>
                                        <button onClick={() => setAdminUsuarioForm(u)} style={{ background: "#ffc107", border: "none", padding: "5px 10px", borderRadius: "3px", cursor: "pointer", fontWeight: "bold" }}>Editar</button>
                                    <button onClick={() => cambiarRolUsuario(u._id, u.rol)} style={{ background: "#17a2b8", color: "white", border: "none", padding: "5px 10px", borderRadius: "3px", cursor: "pointer", fontWeight: "bold" }}>{u.rol === "admin" ? "Quitar Admin" : "Hacer Admin"}</button>
                                    {usuario.email !== u.email && (
                                        <button onClick={() => eliminarUsuario(u._id)} style={{ background: "#dc3545", color: "white", border: "none", padding: "5px 10px", borderRadius: "3px", cursor: "pointer", fontWeight: "bold" }}>Eliminar</button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            )}
        </div>
    );

    const renderAdminPedidos = () => (
        <div>
            <h3 style={{ marginBottom: "20px" }}>Historial de Pedidos / Compras</h3>
            <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                    <thead>
                        <tr style={{ borderBottom: "2px solid #ddd" }}>
                            <th style={{ padding: "10px" }}>ID Pedido / Fecha</th>
                            <th style={{ padding: "10px" }}>Comprador</th>
                            <th style={{ padding: "10px" }}>Productos (ID Libro)</th>
                            <th style={{ padding: "10px" }}>Total Venta</th>
                        </tr>
                    </thead>
                    <tbody>
                        {adminPedidos.map(p => (
                            <tr key={p._id} style={{ borderBottom: "1px solid #eee" }}>
                                <td style={{ padding: "10px" }}>
                                    <div style={{ fontSize: "0.85rem", color: "#666" }}>{p._id}</div>
                                    <div>{new Date(p.fecha).toLocaleDateString()}</div>
                                </td>
                                <td style={{ padding: "10px", fontSize: "0.9rem" }}>
                                    {adminUsuarios.find(u => String(u._id) === String(p.usuario))?.nombre || p.usuario}
                                </td>
                                <td style={{ padding: "10px" }}>
                                    <ul style={{ margin: 0, paddingLeft: "20px", fontSize: "0.9rem" }}>
                                        {p.productos?.map((prod, i) => {
                                            const nombreLibro = libros.find(l => String(l._id) === String(prod.libro))?.titulo || prod.libro;
                                            return (
                                                <li key={nombreLibro}> {nombreLibro} (S/ {Number(prod.precio || 0).toFixed(2)})</li>
                                            );
                                        })}
                                    </ul>
                                </td>
                                <td style={{ padding: "10px", fontWeight: "bold", color: "#28a745" }}>S/ {Number(p.total || 0).toFixed(2)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {adminPedidos.length === 0 && <p style={{ padding: "20px", textAlign: "center", color: "#666" }}>Aún no hay pedidos registrados.</p>}
            </div>
        </div>
    );

    const renderAdmin = () => {
        if (usuario?.rol !== "admin") return <div style={{ padding: "40px", textAlign: "center" }}>Acceso denegado. No tienes permisos de administrador.</div>;

        return (
            <section className="pagina-tienda admin-panel">
                <div className="seccion-tienda__titulo">
                    <p>Panel de Control</p>
                    <h2>Administración general</h2>
                </div>

                <div style={{ display: "flex", gap: "10px", marginBottom: "30px", borderBottom: "2px solid #eee", paddingBottom: "10px" }}>
                    <button type="button" onClick={() => setAdminTab("libros")} style={{ padding: "10px 20px", border: "none", background: adminTab === "libros" ? "#333" : "transparent", color: adminTab === "libros" ? "white" : "#333", fontWeight: "bold", borderRadius: "5px", cursor: "pointer" }}>📚 Libros</button>
                    <button type="button" onClick={() => setAdminTab("pedidos")} style={{ padding: "10px 20px", border: "none", background: adminTab === "pedidos" ? "#333" : "transparent", color: adminTab === "pedidos" ? "white" : "#333", fontWeight: "bold", borderRadius: "5px", cursor: "pointer" }}>🛒 Historial de Pedidos</button>
                    <button type="button" onClick={() => setAdminTab("usuarios")} style={{ padding: "10px 20px", border: "none", background: adminTab === "usuarios" ? "#333" : "transparent", color: adminTab === "usuarios" ? "white" : "#333", fontWeight: "bold", borderRadius: "5px", cursor: "pointer" }}>👥 Usuarios</button>
                </div>

                <div style={{ background: "white", padding: "20px", borderRadius: "8px", boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}>
                    {adminTab === "libros" && renderAdminLibros()}
                    {adminTab === "usuarios" && renderAdminUsuarios()}
                    {adminTab === "pedidos" && renderAdminPedidos()}
                </div>
            </section>
        );
    };

    const paginas = {
        inicio: renderInicio,
        categorias: renderCategorias,
        catalogo: renderCatalogo,
        detalle: renderDetalle,
        carrito: renderCarrito,
        usuario: renderUsuario,
        quienes: renderQuienesSomos,
        admin: renderAdmin,
    };

    return (
        <div className="tienda">
        <header className="navbar">
            <button className="navbar__logo" type="button" onClick={() => navegar("inicio")}>
            <span>LC</span>
            <strong>Libros en Casa</strong>
            </button>

            <nav className="navbar__links" aria-label="Navegacion principal">
            <button type="button" onClick={() => navegar("inicio")}>Inicio</button>
            <button type="button" onClick={() => navegar("catalogo")}>Catalogo</button>
            <button type="button" onClick={() => navegar("carrito")}>Carrito ({cantidadCarrito})</button>
            <button type="button" onClick={() => navegar("usuario")}>Usuario</button>
            <button type="button" onClick={() => navegar("quienes")}>Quienes somos</button>
            {usuario?.rol === "admin" && (
                <button type="button" onClick={() => navegar("admin")} style={{ color: "#ffc107" }}>Panel Admin</button>
            )}
            </nav>

            <button className="navbar__logout" type="button" onClick={onLogout}>
            Cerrar sesion
            </button>
        </header>

        <main>{paginas[pagina]()}</main>

        <footer className="footer-tienda">
            <div>
            <strong>Libros en Casa</strong>
            <span>Lectura, educacion y cultura al alcance de tu hogar.</span>
            </div>
            <div>
            <button type="button" onClick={() => navegar("inicio")}>Inicio</button>
            <button type="button" onClick={() => navegar("catalogo")}>Catalogo</button>
            <button type="button" onClick={() => navegar("carrito")}>Carrito</button>
            <button type="button" onClick={() => navegar("quienes")}>Quienes somos</button>
            {usuario?.rol === "admin" && (
                <button type="button" onClick={() => navegar("admin")}>Panel Admin</button>
            )}
            </div>
            <p>© 2026 Libros en Casa. Todos los derechos reservados.</p>
        </footer>
        </div>
    );
}

export default Catalogo;
