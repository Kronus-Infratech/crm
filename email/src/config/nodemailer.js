const nodemailer = require('nodemailer');

/**
 * Create and configure email transporter
 */
const createTransporter = () => {
  const host = (process.env.EMAIL_HOST).trim();
  const port = parseInt(process.env.EMAIL_PORT);
  const user = process.env.EMAIL_USER?.trim();
  const pass = (process.env.EMAIL_PASSWORD || process.env.EMAIL_PASS)?.trim();
  
  // Secure: true for 465 (Direct SSL), false for 587 (STARTTLS)
  const isSecure = port === 465;

  console.log(`[EmailService] Initializing transporter: ${host}:${port} (Secure: ${isSecure})`);

  const config = {
    host,
    port,
    secure: isSecure,
    auth: {
      user: user,
      pass: pass,
    },
    // Extensive timeouts for cloud network jumps
    connectionTimeout: 45000, 
    greetingTimeout: 45000,
    socketTimeout: 60000,
    tls: {
      rejectUnauthorized: false,
      minVersion: 'TLSv1.2'
    },
    debug: true,
    logger: true,
  };

  // For Gmail on port 465, use service helper
  if (isSecure && (user?.endsWith('@gmail.com') || host.includes('google'))) {
    config.service = 'gmail';
  }

  return nodemailer.createTransport(config);
};

// Singleton transporter instance
const transporter = createTransporter();

module.exports = { transporter };
