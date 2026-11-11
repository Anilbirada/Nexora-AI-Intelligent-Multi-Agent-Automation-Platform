# Nexora AI — REST API Documentation

All API endpoints require an active session authenticated via **Better Auth** session cookies and require an active tenant organization context. Requests must include standard JSON headers: `Content-Type: application/json`.

---

## 1. Project Management Endpoints

### 1.1 List / Create Opportunities
- **Endpoint**: `/api/projects`
- **Methods**: `GET`, `POST`
- **Query Parameters (GET)**:
  - `category` (optional): Filter by category (`ai_machine_learning`, `fullstack`, etc.)
  - `status` (optional): Filter by state (`discovered`, `qualified`, `disqualified`, `awaiting_approval`)
  - `limit` (default: 50): Number of records.
- **Request Body (POST)**:
  ```json
  {
    "title": "Enterprise RAG Pipeline Implementation",
    "description": "Seeking expert team to deploy multi-agent retrieval system on AWS.",
    "sourcePlatform": "rfp",
    "budgetMin": 15000,
    "budgetMax": 30000,
    "category": "ai_machine_learning"
  }
  ```
- **Response (201 Created)**:
  ```json
  {
    "success": true,
    "data": {
      "id": "e4b2d308-417c-48be-9b37-cf861c1b181a",
      "status": "discovered",
      "createdAt": "2026-11-11T12:00:00.000Z"
    }
  }
  ```

### 1.2 Get / Update Single Opportunity
- **Endpoint**: `/api/projects/[id]`
- **Methods**: `GET`, `PATCH`, `DELETE`
- **Response (200 OK)**: Complete Opportunity entity including `clientIntelligence`, `analysisReport`, and `qualificationScore`.

---

## 2. Proposal & Anil Approval Gate Endpoints

### 2.1 Generate Proposal
- **Endpoint**: `/api/projects/[id]/proposal`
- **Methods**: `GET`, `POST`
- **Request Body (POST)**:
  ```json
  {
    "customNotes": "Prioritize AWS Bedrock architecture over OpenAI",
    "discountPercentage": 5
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "proposal": {
      "id": "78a9c2f4-e51c-4b68-b7c4-fa06c7e2b109",
      "opportunityId": "e4b2d308-417c-48be-9b37-cf861c1b181a",
      "title": "Technical Proposal: Enterprise RAG Architecture",
      "totalBudget": 28500,
      "milestones": [
        {"phase": "Architecture & Data Ingest", "percentage": 30, "cost": 8550},
        {"phase": "Multi-Agent Orchestrator", "percentage": 40, "cost": 11400},
        {"phase": "UAT & Cloud Deployment", "percentage": 30, "cost": 8550}
      ],
      "approvalStatus": "pending_approval"
    }
  }
  ```

### 2.2 Submit Executive Approval Decision
- **Endpoint**: `/api/projects/[id]/proposal/approval`
- **Method**: `POST`
- **Request Body**:
  ```json
  {
    "action": "approve", // "approve" | "reject" | "revise"
    "feedback": "Approved for dispatch. Excellent milestone distribution.",
    "approverEmail": "anil@nexora.ai"
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "newStatus": "approved",
    "timestamp": "2026-11-11T12:30:00.000Z"
  }
  ```

---

## 3. Omnichannel Outreach Endpoints

### 3.1 Dispatch Outreach
- **Endpoint**: `/api/projects/[id]/outreach`
- **Methods**: `GET`, `POST`
- **Request Body (POST)**:
  ```json
  {
    "channel": "email", // "email" | "linkedin" | "whatsapp"
    "recipientEmail": "lead@clientcorp.com",
    "proposalId": "78a9c2f4-e51c-4b68-b7c4-fa06c7e2b109"
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "messageId": "msg-8931-df2a",
    "isSimulated": true, // Governed by ALLOW_EXTERNAL_OUTREACH
    "status": "delivered_simulated"
  }
  ```

### 3.2 Inbound Response Ingestion
- **Endpoint**: `/api/projects/[id]/followup/response`
- **Method**: `POST`
- **Request Body**:
  ```json
  {
    "channel": "email",
    "content": "Thanks Anil, we would love to review the architecture deck on Thursday.",
    "sender": "vp_engineering@clientcorp.com"
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "classifiedSentiment": "interested",
    "sequenceUpdated": "completed_positive",
    "crmDealCreated": true
  }
  ```

---

## 4. Multi-Agent Executive Dashboard Endpoints

### 4.1 System Overview
- **Endpoint**: `/api/project-manager/overview`
- **Method**: `GET`
- **Response (200 OK)**:
  ```json
  {
    "activeOpportunities": 142,
    "qualifiedCount": 68,
    "pendingApprovals": 7,
    "activeCampaigns": 14,
    "fleetHealth": "optimal",
    "agentsOnline": 8
  }
  ```

### 4.2 Pipeline Status
- **Endpoint**: `/api/project-manager/pipeline`
- **Method**: `GET`
- **Response (200 OK)**: Aggregated counts broken down by pipeline stage.

### 4.3 Trigger Agent Run
- **Endpoint**: `/api/project-manager/run`
- **Method**: `POST`
- **Request Body**:
  ```json
  {
    "agent": "global_project_hunter", // or "all"
    "force": false
  }
  ```
- **Response (202 Accepted)**:
  ```json
  {
    "status": "queued",
    "jobId": "job-712-ae"
  }
  ```

### 4.4 Generate Daily Intelligence Report
- **Endpoint**: `/api/project-manager/reports/generate`
- **Method**: `POST`
- **Response (200 OK)**: Returns the generated `dailyBusinessReport` markdown and metrics summary.
