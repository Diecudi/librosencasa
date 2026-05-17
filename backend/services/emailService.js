let nodemailer = null;

try {
    nodemailer = require("nodemailer");
} catch (error) {
    nodemailer = null;
}

const crearTransporter = () => {
    if (!nodemailer || !process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
        return null;
    }

    return nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 587),
        secure: process.env.SMTP_SECURE === "true",
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
        }
    });
};

const enviarCorreoRecuperacion = async ({ email, nombre, resetLink }) => {
    const transporter = crearTransporter();

    if (!transporter) {
        console.log("Link de recuperacion de contraseña:", resetLink);
        return {
            enviado: false,
            motivo: "SMTP no configurado o nodemailer no instalado"
        };
    }

    await transporter.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: email,
        subject: "Restablecer contraseña - Libros en Casa",
        html: `
            <div style="font-family: Arial, sans-serif; color: #2b241c; line-height: 1.5;">
                <h2>Hola ${nombre || ""}</h2>
                <p>Recibimos una solicitud para cambiar tu contraseña.</p>
                <p>
                    <a href="${resetLink}" style="background:#1f6f68;color:#fff;padding:12px 16px;border-radius:6px;text-decoration:none;font-weight:bold;">
                        Cambiar contraseña
                    </a>
                </p>
                <p>Este enlace vence en 1 hora.</p>
                <p>Si no solicitaste este cambio, puedes ignorar este correo.</p>
            </div>
        `
    });

    return {
        enviado: true
    };
};

module.exports = {
    enviarCorreoRecuperacion
};
