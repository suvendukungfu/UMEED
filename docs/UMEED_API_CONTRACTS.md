# UMEED API Contracts & Interface Documentation

**Document Version**: 2.0.0  
**Status**: APPROVED SPECIFICATION  
**Base URL**: `/api`  

---

## 1. Authentication Endpoints

### `POST /api/auth/sign-in`
- **Description**: Authenticate user via email and password; issues HttpOnly `umeed_session` cookie.
- **Request Body**:
  ```json
  {
    "email": "coordinator@umeed.org",
    "password": "UmeedSecurePassword2026!"
  }
  ```
- **Success Response (200 OK)**:
  ```json
  {
    "status": "success",
    "data": {
      "user": { "userId": "usr_...", "email": "...", "name": "...", "accountState": "ACTIVE" },
      "session": { "sessionId": "sess_...", "activeRole": "COORDINATOR", "expiresAt": "..." },
      "memberships": [],
      "permissions": ["incident:review", "case:dispatch", ...]
    }
  }
  ```

### `GET /api/auth/session`
- **Description**: Retrieve current active session and authenticated user profile.
- **Headers**: Cookie `umeed_session` or `Authorization: Bearer <token>`
- **Response**: `200 OK` with `AuthContext` or `401 Unauthorized`.

### `POST /api/auth/sign-out`
- **Description**: Revoke session token and clear session cookie.

### `POST /api/auth/switch-org`
- **Description**: Switch tenant context to another organization where the user has active membership.
- **Request Body**: `{ "organizationId": "NGO-DELHI-002" }`

---

## 2. Incident Intake & Citizen Endpoints

### `POST /api/incidents/ingest`
- **Description**: Intake citizen distress report or crawler signal.
- **Headers**: Optional `Authorization: Bearer <token>` for authenticated citizens.
- **Request Body**: Canonical incident payload conforming to `CanonicalIncidentSchema`.
- **Response (201 Created)**:
  ```json
  {
    "status": "success",
    "data": {
      "public_reference": "UMD-99BF-400A",
      "tracking_token": "trk_...",
      "status": "REPORTED",
      "requires_human_review": true
    }
  }
  ```

### `GET /api/incidents/:publicReference`
- **Description**: Retrieve incident details.
- **Headers**: Required `x-tracking-token: trk_...` or coordinator authorization.
- **Response (200 OK)**: Incident details (redacted for non-coordinators).

---

## 3. Assistance Engine & NGO Endpoints

### `POST /api/assistance/requirements/:requirementId/outreach/first-wave`
- **Description**: Initiate first-round outreach wave to top ranked eligible NGOs.
- **Headers**: Coordinator authorization required.

### `POST /api/assistance/outreach/:attemptId/accept`
- **Description**: NGO accepts an outreach offer atomically.
- **Headers**: Authorized NGO token or session.

### `POST /api/assistance/assignments/:assignmentId/progress`
- **Description**: Field responder records progress or status update.
- **Headers**: Responder token or session.
- **Guard**: Fails with `409 Conflict` if case is in terminal `RESOLVED` status.

