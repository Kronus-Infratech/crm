/**
 * Base HTML template for all emails
 */
const baseTemplate = (content, title) => `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title || 'Kronus Infratech and Consultants'}</title>
    <style>
      body { 
        margin: 0; 
        padding: 0; 
        font-family: 'Outfit', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
        background-color: #f7f7f7; 
        color: #4a4a4a; 
        -webkit-font-smoothing: antialiased;
      }
      .wrapper { width: 100%; padding: 40px 0; }
      .container { 
        max-width: 600px; 
        margin: 0 auto; 
        background: #ffffff; 
        border-radius: 24px; 
        overflow: hidden; 
        box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
        border: 1px solid #e5e7eb;
      }
      .header { 
        background: #4a4a4a; 
        padding: 40px 32px; 
        text-align: center;
        border-bottom: 4px solid #009688;
      }
      .logo { 
        color: #ffffff; 
        font-size: 28px; 
        font-weight: 900; 
        letter-spacing: -0.05em; 
        margin: 0; 
        text-transform: uppercase;
      }
      .logo span { color: #fbb03b; }
      .content { padding: 48px 40px; line-height: 1.8; background: #ffffff; }
      h1 { font-size: 28px; font-weight: 800; color: #4a4a4a; margin-top: 0; margin-bottom: 24px; letter-spacing: -0.02em; }
      p { margin-bottom: 24px; font-size: 16px; color: #666666; }
      .button { 
        display: inline-block; 
        background: #009688; 
        color: #ffffff !important; 
        padding: 16px 32px; 
        border-radius: 12px; 
        font-weight: 700; 
        text-decoration: none; 
        margin: 32px 0;
        box-shadow: 0 10px 15px -3px rgba(0, 150, 136, 0.3);
      }
      .card { 
        background: #fdfdfd; 
        border-radius: 16px; 
        padding: 24px; 
        border: 1px solid #f3f4f6; 
        margin: 32px 0;
        border-left: 4px solid #fbb03b;
      }
      .footer { 
        background: #4a4a4a;
        text-align: center; 
        padding: 48px 32px; 
        font-size: 14px; 
        color: #e5e5e5; 
      }
      .social-links { margin-bottom: 24px; }
      .social-links a { 
        display: inline-block; 
        margin: 0 12px; 
        color: #fbb03b; 
        text-decoration: none; 
        font-weight: 700;
        font-size: 13px;
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }
      .social-links a:hover { color: #ffffff; }
      .badge { 
        display: inline-block; 
        padding: 6px 14px; 
        border-radius: 8px; 
        background: #fbb03b; 
        color: #4a4a4a; 
        font-size: 11px; 
        font-weight: 800; 
        text-transform: uppercase; 
        margin-bottom: 16px; 
        letter-spacing: 0.1em;
      }
      .divider { height: 1px; background: #555555; margin: 24px 0; }
    </style>
  </head>
  <body>
    <div class="wrapper">
      <div class="container">
        <div class="header">
          <div class="logo">KRONUS<span> Infratech and Consultants</span></div>
        </div>
        <div class="content">
          ${content}
        </div>
        <div class="footer">
          <div class="social-links">
            <a href="https://www.kronusinfra.com">Website</a>
            <a href="https://www.instagram.com/kronus_infratech">Instagram</a>
            <a href="https://www.youtube.com/@kronusinfratech">YouTube</a>
            <a href="https://www.facebook.com/Kronusinfra/">Facebook</a>
          </div>
          <div class="divider"></div>
          <p style="color: #cccccc; font-size: 12px; margin-bottom: 0;">
            © ${new Date().getFullYear()} Kronus Infratech & Consultants. <br>
            Office: Sonipat, Haryana, India.
          </p>
        </div>
      </div>
    </div>
  </body>
  </html>
`;

module.exports = { baseTemplate };
