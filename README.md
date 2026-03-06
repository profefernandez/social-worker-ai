# soicalworkerai
AI - Human Crisis Monitoring Platform

## Overview

A crisis-aware AI chatbot platform provided by **60 Watts of Clarity** as a service to therapists and social workers. The chatbot serves as a client-facing support tool that detects crisis situations and activates a protocol connecting a trained AI social worker, human intervention, and multi-channel notifications.

## Architecture

```
[End User — Chatbot Widget]
       ↕  WebSocket (real-time, encrypted)
[Node.js Backend Server (Docker Container)]
       ↕  REST API (secured endpoints)
[Launch Lemonade API — Social Worker AI Agent]
       ↕
[Twilio — SMS + Voice Call Notifications]
[SendGrid — Email Notifications]

[Therapist / 60 Watts Admin — Dashboard]
       ↕  WebSocket (authenticated, same server)
[Node.js Backend]
       ↕
[MySQL Database (SPanel)]
```

## Project Structure

```
├── chatbot/          # Embeddable widget for therapist websites (React + Vite)
├── dashboard/        # Admin monitoring panel (React + Vite)
├── server/           # Node.js backend (Express + Socket.io)
├── Dockerfile
├── docker-compose.yml
└── .env.example
```

## Quick Start

### 1. Clone and configure

```bash
cp .env.example .env
# Fill in all required values in .env
```

### 2. Install dependencies

```bash
npm install --ignore-scripts
```

### 3. Set up MySQL

Run `server/models/schema.sql` against your MySQL instance:

```bash
mysql -u <user> -p <database> < server/models/schema.sql
```

### 4. Run in development

```bash
npm run dev
```

This starts:
- Server on `http://localhost:3000`
- Chatbot widget on `http://localhost:5173`
- Dashboard on `http://localhost:5174`

### 5. Deploy with Docker

```bash
docker-compose up -d
```

## Embedding the Chatbot Widget

Add this snippet to any therapist website:

```html
<script src="https://your-domain.com/widget.js" data-session-id="<session-id>"></script>
```

## Security

- All chat messages encrypted at rest with AES-256-CBC
- JWT authentication for dashboard and WebSocket connections
- Rate limiting on all public API endpoints
- HTTP security headers via Helmet
- Admin access to chat data only when crisis protocol is active
- Full audit trail of all crisis session access

## Environment Variables

See `.env.example` for all required configuration values.

