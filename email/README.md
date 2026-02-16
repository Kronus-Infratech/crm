# Kronus Email Microservice

Standalone email service for Kronus CRM. This microservice handles all email operations including transactional emails, notifications, and template-based communications.

## Features

- ✅ **Template-based emails** - 8 pre-built templates for common scenarios
- ✅ **Queue system** - Asynchronous processing with retry logic
- ✅ **API key authentication** - Secure access control
- ✅ **Rate limiting** - Protection against abuse
- ✅ **Exponential backoff** - Smart retry mechanism (1m, 5m, 15m)
- ✅ **Statistics tracking** - Monitor sent, failed, and retrying emails

## Installation

```bash
cd email
npm install
```

## Configuration

1. Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

2. Update environment variables:
```env
PORT=3001
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
EMAIL_FROM=noreply@kronusinfra.com
FRONTEND_URL=http://localhost:3000
EMAIL_SERVICE_API_KEY=your-strong-random-api-key-here
```

## Running the Service

### Development
```bash
npm run dev
```

### Production
```bash
npm start
```

## API Endpoints

### Health Check
```http
GET /health
```

No authentication required.

### Send Generic Email
```http
POST /api/email/send
Content-Type: application/json
X-API-Key: your-api-key

{
  "to": "user@example.com",
  "subject": "Test Email",
  "html": "<h1>Hello</h1><p>This is a test email.</p>",
  "text": "Hello, this is a test email.",
  "fromName": "Kronus CRM" (optional)
}
```

### Send Template Email
```http
POST /api/email/send-template
Content-Type: application/json
X-API-Key: your-api-key

{
  "template": "PASSWORD_RESET",
  "to": "user@example.com",
  "data": {
    "name": "John Doe",
    "resetUrl": "https://crm.kronusinfra.com/reset/token123"
  }
}
```

**Available Templates:**
- `PASSWORD_RESET` - Password reset email
- `WELCOME` - Welcome email for new users
- `LEAD_ASSIGNMENT` - Lead assignment notification
- `FOLLOW_UP_REMINDER` - Follow-up reminder for agents
- `LEAD_WELCOME` - Welcome email for new leads
- `LEAD_FEEDBACK` - Feedback request for closed leads
- `LEDGER_OPENED` - Ledger opened notification
- `CEO_NOTIFICATION` - CEO notification for critical updates

### Queue Status
```http
GET /api/email/queue/status
X-API-Key: your-api-key
```

Response:
```json
{
  "success": true,
  "data": {
    "queueSize": 5,
    "isProcessing": true,
    "stats": {
      "sent": 120,
      "failed": 3,
      "retrying": 2
    }
  }
}
```

## Architecture

```
email/
├── src/
│   ├── index.js              # Express server
│   ├── config/
│   │   ├── nodemailer.js     # Email transporter
│   │   └── constants.js      # Constants
│   ├── services/
│   │   ├── emailService.js   # Core email logic
│   │   └── queueService.js   # Queue management
│   ├── templates/            # Email templates
│   ├── routes/
│   │   └── emailRoutes.js    # API routes
│   ├── middleware/
│   │   ├── auth.js           # Authentication
│   │   └── errorHandler.js   # Error handling
│   └── utils/
│       └── logger.js         # Logging utility
└── package.json
```

## Security

- **API Key Authentication**: All endpoints (except `/health`) require `X-API-Key` header
- **Rate Limiting**: 100 requests per minute per IP
- **Helmet**: Security headers enabled
- **Input Validation**: All inputs are validated

## Deployment

### Docker (Recommended)
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3001
CMD ["npm", "start"]
```

### PM2
```bash
pm2 start src/index.js --name email-service
```

## Monitoring

Check queue status regularly:
```bash
curl -H "X-API-Key: your-key" http://localhost:3001/api/email/queue/status
```

## Troubleshooting

### Emails not sending
1. Check SMTP credentials in `.env`
2. Verify `EMAIL_HOST` and `EMAIL_PORT`
3. For Gmail, use App Password (not regular password)
4. Check queue status endpoint for errors

### Authentication errors
1. Verify `EMAIL_SERVICE_API_KEY` matches in both services
2. Ensure `X-API-Key` header is included in requests