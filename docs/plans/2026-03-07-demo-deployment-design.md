# Demo Deployment Design — 60 Watts of Intelligence

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Deploy the full demo flow (Problem → Solution → Profe → Consent → Chatbot → Dashboard) to prototype.60wattsofclarity.com with Profe function call handling and dual Mistral agents.

**Architecture:** Docker Compose on Scala Hosting VPS. Express + Socket.io serves both React apps and API. Two Mistral agents (kiddo chatbot + Profe monitor) via Conversations API. MySQL on SPanel for persistence.

**Tech Stack:** Node.js 20, Express, Socket.io, Mistral Conversations API, MySQL, Docker, SPanel reverse proxy

---

## Architecture

```
prototype.60wattsofclarity.com (SPanel reverse proxy)
         │
         ▼
   Docker Container (port 3000)
   ┌─────────────────────────────────────┐
   │  Express + Socket.io Server         │
   │  ├── /api/* (REST routes)           │
   │  ├── WebSocket (chat + dashboard)   │
   │  ├── Static: chatbot React app      │
   │  └── Static: dashboard React app    │
   │                                     │
   │  Mistral Conversations API          │
   │  ├── Kiddo Agent (ag_019ccbc...)    │
   │  └── Profe Agent  (ag_019ccb9...)   │
   │                                     │
   │  MySQL (SPanel host) ◄─────────────┤
   └─────────────────────────────────────┘
```

## Mistral Agents

- **Kiddo chatbot:** `ag_019ccbc6615476aab923e1753beee83f` — the AI the child talks to
- **Profe monitor:** `ag_019ccb3989f970d1a478a8265009287a` — silent monitor + @profe engagement

## Message Flow

### Regular Message
1. Kid sends message via WebSocket
2. Server sends to Kiddo agent → gets response
3. Server sends same message + kiddo response to Profe (silent monitor)
4. Profe returns function calls (check_ai_response, flag_intervention, etc.)
5. Server processes function calls → updates dashboard, notifies parent, or intercepts
6. Kid sees kiddo response (unless Profe intervened)

### @profe Command
1. Kid types `@profe [question]`
2. Server intercepts, routes directly to Profe agent (not kiddo)
3. Profe responds with AI literacy teaching
4. Kid sees Profe's response directly

## Demo-Critical Profe Functions (5 of 13)

| Function | Server Action | User Sees |
|----------|--------------|-----------|
| `check_ai_response` | Save to profe_observations, emit to dashboard | Nothing (silent) |
| `flag_intervention` | Replace/append kiddo response with Profe's message | Profe's educational message |
| `log_observation` | Save to profe_observations, emit to dashboard | Nothing (dashboard only) |
| `notify_parent` | Save to notifications, emit to dashboard | Nothing (parent sees on dashboard) |
| `@profe` direct | Save to messages, emit as ai:message with sender profe | Profe's AI literacy response |

## Database Changes

### New Table: profe_observations
Stores check_ai_response and log_observation data. Feeds the parent dashboard.

### Modified: messages table
Add `sender_type` column: 'user', 'kiddo_ai', 'profe', 'admin'

### Modified: notifications table
Add `urgency` and `summary` columns for notify_parent data.

## Server Code Changes

### Modified: services/aiProxy.js
- Support two Mistral conversations with different agent IDs
- Parse function call responses from Profe (tool_calls in Mistral response)

### New: services/profeHandler.js
- Routes each Profe function call to its handler
- Returns whether an intervention occurred

### Modified: socket/handler.js
- Call kiddo agent AND Profe agent in parallel
- After Profe responds: pass function calls to profeHandler
- If intervention: send Profe's message instead of kiddo's
- On @profe: route to Profe agent, skip kiddo

## Deployment

1. Build server changes (Profe handlers, DB schema, aiProxy updates)
2. Build React apps (npm run build)
3. Push to GitHub, merge to main
4. SSH into VPS, clone repo to subdomain directory
5. Create .env on VPS with Mistral keys, agent IDs, MySQL creds
6. Run SQL schema via phpMyAdmin
7. docker compose up -d --build
8. SPanel reverse proxy: prototype.60wattsofclarity.com → localhost:3000
9. Verify health endpoint, WebSocket, full demo flow

## VPS Details

- **Domain:** prototype.60wattsofclarity.com
- **IP:** 165.140.156.47
- **User:** 60wattsofclaritycom
- **Home:** /home/60wattsofclaritycom
- **DB user:** 60wattsofclaritycom_profefernandez@localhost
- **DB name:** 60wattsofclaritycom_prototype60wattsofclaritycom_profefernandez
