# InsureCRM API Documentation

## Base URL
```
http://localhost:3000/api
```

## Authentication
All protected endpoints require a Bearer token in the Authorization header:
```
Authorization: Bearer <supabase_access_token>
```

The access token is obtained from Supabase authentication after user login.

## Health Check
### GET /health
Check if the API is running.

**Response**
```json
{
  "status": "ok"
}
```

## Broker Management

### POST /brokers/register
Register a new broker. Creates a new broker account and sends a verification email.

**Request Body**
```json
{
  "email": "broker@example.com",
  "password": "SecureP@ss123",
  "fullName": "John Doe",
  "phone": "+1234567890",
  "companyName": "Insurance Pro Ltd",
  "licenseNumber": "INS123456"
}
```

**Validation Rules**
- `email`: Valid email address format
- `password`: Minimum 8 characters, must contain:
  - At least one uppercase letter
  - At least one lowercase letter
  - At least one number
  - At least one special character (@$!%*?&)
- `fullName`: 2-100 characters
- `phone`: Valid phone number format (optional)
- `companyName`: 2-100 characters (optional)
- `licenseNumber`: String (optional)

**Success Response (201 Created)**
```json
{
  "status": "success",
  "data": {
    "id": "uuid",
    "email": "broker@example.com",
    "full_name": "John Doe",
    "phone": "+1234567890",
    "company_name": "Insurance Pro Ltd",
    "license_number": "INS123456",
    "status": "pending_verification",
    "created_at": "timestamp",
    "updated_at": "timestamp",
    "message": "Registration successful. Please check your email to verify your account."
  }
}
```

**Error Responses**

*Validation Error (400 Bad Request)*
```json
{
  "status": "error",
  "errors": [
    {
      "field": "password",
      "message": "Password must contain at least one uppercase letter, one lowercase letter, one number and one special character"
    }
  ]
}
```

*Email Already Exists (409 Conflict)*
```json
{
  "status": "error",
  "message": "Email already registered"
}
```

*Server Error (500 Internal Server Error)*
```json
{
  "status": "error",
  "message": "An error occurred during registration. Please try again later."
}
```

### GET /brokers/profile
Get the current broker's profile with additional statistics.

**Success Response (200 OK)**
```json
{
  "status": "success",
  "data": {
    "id": "uuid",
    "email": "broker@example.com",
    "full_name": "John Doe",
    "phone": "+1234567890",
    "company_name": "Insurance Pro Ltd",
    "license_number": "INS123456",
    "status": "active",
    "created_at": "timestamp",
    "updated_at": "timestamp",
    "stats": {
      "total_clients": 25,
      "active_policies": 40,
      "pending_tasks": 5
    }
  }
}
```

**Error Responses**

*Not Found (404)*
```json
{
  "status": "error",
  "message": "Broker profile not found"
}
```

*Server Error (500)*
```json
{
  "status": "error",
  "message": "Failed to fetch broker profile: [error details]"
}
```

### PUT /brokers/profile
Update the current broker's profile.

**Request Body**
```json
{
  "fullName": "John Doe Updated",
  "phone": "+1234567890",
  "companyName": "Insurance Pro Ltd Updated",
  "licenseNumber": "INS123456-A"
}
```

**Validation Rules**
- `fullName`: 2-100 characters
- `phone`: Valid phone number format
- `companyName`: 2-100 characters
- `licenseNumber`: String

**Success Response (200 OK)**
```json
{
  "status": "success",
  "data": {
    "id": "uuid",
    "email": "broker@example.com",
    "full_name": "John Doe Updated",
    "phone": "+1234567890",
    "company_name": "Insurance Pro Ltd Updated",
    "license_number": "INS123456-A",
    "status": "active",
    "created_at": "timestamp",
    "updated_at": "timestamp"
  }
}
```

**Error Responses**

*Validation Error (400)*
```json
{
  "status": "error",
  "errors": [
    {
      "field": "fullName",
      "message": "Full name must be between 2 and 100 characters"
    }
  ]
}
```

*Not Found (404)*
```json
{
  "status": "error",
  "message": "Broker not found"
}
```

*Server Error (500)*
```json
{
  "status": "error",
  "message": "Failed to update broker profile: [error details]"
}
```

### GET /brokers/dashboard-stats
Get comprehensive broker dashboard statistics.

**Success Response (200 OK)**
```json
{
  "status": "success",
  "data": {
    "clients": {
      "total": 25,
      "active": 20
    },
    "policies": {
      "total": 40,
      "active": 35,
      "expiring_soon": 3
    },
    "tasks": {
      "total": 15,
      "pending": 5,
      "overdue": 2
    },
    "recent_activity": [
      {
        "id": "uuid",
        "type": "policy_created",
        "description": "New policy created for client John Smith",
        "created_at": "timestamp"
      }
    ]
  }
}
```

**Error Response**

*Server Error (500)*
```json
{
  "status": "error",
  "message": "Failed to fetch dashboard stats: [error details]"
}
```

## Client Management

### GET /clients
Get all clients for the current broker with pagination, filtering, and sorting.

**Query Parameters**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)
- `status` (optional): Filter by status ('active' or 'inactive')
- `search` (optional): Search in full name and email
- `sortField` (optional): Field to sort by (default: 'created_at')
- `sortOrder` (optional): Sort order ('asc' or 'desc', default: 'desc')

**Success Response (200 OK)**
```json
{
  "status": "success",
  "data": [
    {
      "id": "uuid",
      "email": "client@example.com",
      "full_name": "John Smith",
      "phone": "+1234567890",
      "address": "123 Main St",
      "date_of_birth": "1990-01-01",
      "status": "active",
      "notes": "VIP client",
      "created_at": "timestamp",
      "updated_at": "timestamp",
      "policies": 3,
      "tasks": 2
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 50,
    "totalPages": 5
  }
}
```

### GET /clients/:id
Get detailed information about a specific client, including their policies and tasks.

**Success Response (200 OK)**
```json
{
  "status": "success",
  "data": {
    "id": "uuid",
    "email": "client@example.com",
    "full_name": "John Smith",
    "phone": "+1234567890",
    "address": "123 Main St",
    "date_of_birth": "1990-01-01",
    "status": "active",
    "notes": "VIP client",
    "created_at": "timestamp",
    "updated_at": "timestamp",
    "policies": [
      {
        "id": "uuid",
        "policy_number": "POL123",
        "policy_type": "Life Insurance",
        "provider": "Insurance Co",
        "status": "active",
        "expiry_date": "2024-12-31"
      }
    ],
    "tasks": [
      {
        "id": "uuid",
        "title": "Policy Renewal",
        "status": "pending",
        "due_date": "2024-12-15"
      }
    ]
  }
}
```

**Error Response (404 Not Found)**
```json
{
  "status": "error",
  "message": "Client not found"
}
```

### POST /clients
Create a new client.

**Request Body**
```json
{
  "email": "client@example.com",
  "fullName": "John Smith",
  "phone": "+1234567890",
  "address": "123 Main St",
  "dateOfBirth": "1990-01-01",
  "notes": "VIP client"
}
```

**Validation Rules**
- `email`: Valid email address format (required)
- `fullName`: 2-100 characters (required)
- `phone`: Valid phone number format
- `address`: Maximum 200 characters
- `dateOfBirth`: Valid ISO date in the past
- `notes`: Maximum 1000 characters

**Success Response (201 Created)**
```json
{
  "status": "success",
  "data": {
    "id": "uuid",
    "email": "client@example.com",
    "full_name": "John Smith",
    "phone": "+1234567890",
    "address": "123 Main St",
    "date_of_birth": "1990-01-01",
    "status": "active",
    "notes": "VIP client",
    "created_at": "timestamp",
    "updated_at": "timestamp"
  }
}
```

**Error Responses**

*Validation Error (400 Bad Request)*
```json
{
  "status": "error",
  "errors": [
    {
      "field": "email",
      "message": "Email is required"
    }
  ]
}
```

*Conflict Error (409 Conflict)*
```json
{
  "status": "error",
  "message": "Client with this email already exists"
}
```

### PUT /clients/:id
Update an existing client.

**Request Body**
```json
{
  "fullName": "John Smith Updated",
  "phone": "+1234567890",
  "address": "456 New St",
  "dateOfBirth": "1990-01-01",
  "notes": "Updated notes",
  "status": "inactive"
}
```

**Validation Rules**
- `fullName`: 2-100 characters
- `phone`: Valid phone number format
- `address`: Maximum 200 characters
- `dateOfBirth`: Valid ISO date in the past
- `notes`: Maximum 1000 characters
- `status`: Either 'active' or 'inactive'

**Success Response (200 OK)**
```json
{
  "status": "success",
  "data": {
    "id": "uuid",
    "email": "client@example.com",
    "full_name": "John Smith Updated",
    "phone": "+1234567890",
    "address": "456 New St",
    "date_of_birth": "1990-01-01",
    "status": "inactive",
    "notes": "Updated notes",
    "updated_at": "timestamp"
  }
}
```

**Error Responses**

*Not Found (404)*
```json
{
  "status": "error",
  "message": "Client not found"
}
```

*Validation Error (400)*
```json
{
  "status": "error",
  "errors": [
    {
      "field": "status",
      "message": "Status must be either active or inactive"
    }
  ]
}
```

### DELETE /clients/:id
Delete a client and their associated data. Cannot delete clients with active policies.

**Success Response (200 OK)**
```json
{
  "status": "success",
  "message": "Client deleted successfully"
}
```

**Error Responses**

*Bad Request (400)*
```json
{
  "status": "error",
  "message": "Cannot delete client with active policies"
}
```

*Not Found (404)*
```json
{
  "status": "error",
  "message": "Client not found"
}
```

## Policy Management

### GET /policies
Get all policies for the current broker with pagination, filtering, and sorting.

**Query Parameters**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)
- `status` (optional): Filter by status ('draft', 'pending', 'active', 'cancelled', 'expired')
- `clientId` (optional): Filter by client ID
- `policyType` (optional): Filter by policy type
- `provider` (optional): Filter by insurance provider
- `expiringBefore` (optional): Filter policies expiring before a specific date (ISO format)
- `search` (optional): Search in policy number and type
- `sortField` (optional): Field to sort by (default: 'created_at')
- `sortOrder` (optional): Sort order ('asc' or 'desc', default: 'desc')

**Success Response (200 OK)**
```json
{
  "status": "success",
  "data": [
    {
      "id": "uuid",
      "policy_number": "POL123",
      "policy_type": "Life Insurance",
      "provider": "Insurance Co",
      "premium_amount": 1500.00,
      "start_date": "2025-01-01",
      "expiry_date": "2026-01-01",
      "status": "active",
      "coverage_details": {
        "coverage_amount": 500000,
        "deductible": 1000,
        "beneficiaries": ["John Smith"]
      },
      "created_at": "timestamp",
      "updated_at": "timestamp",
      "client": {
        "id": "uuid",
        "full_name": "John Smith",
        "email": "john@example.com"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 50,
    "totalPages": 5
  }
}
```

### GET /policies/:id
Get detailed information about a specific policy, including client details and related tasks.

**Success Response (200 OK)**
```json
{
  "status": "success",
  "data": {
    "id": "uuid",
    "policy_number": "POL123",
    "policy_type": "Life Insurance",
    "provider": "Insurance Co",
    "premium_amount": 1500.00,
    "start_date": "2025-01-01",
    "expiry_date": "2026-01-01",
    "status": "active",
    "coverage_details": {
      "coverage_amount": 500000,
      "deductible": 1000,
      "beneficiaries": ["John Smith"]
    },
    "created_at": "timestamp",
    "updated_at": "timestamp",
    "client": {
      "id": "uuid",
      "full_name": "John Smith",
      "email": "john@example.com",
      "phone": "+1234567890"
    },
    "tasks": [
      {
        "id": "uuid",
        "title": "Policy Renewal",
        "status": "pending",
        "due_date": "2025-12-15"
      }
    ]
  }
}
```

**Error Response (404 Not Found)**
```json
{
  "status": "error",
  "message": "Policy not found"
}
```

### POST /policies
Create a new policy.

**Request Body**
```json
{
  "clientId": "uuid",
  "policyNumber": "POL123",
  "policyType": "Life Insurance",
  "provider": "Insurance Co",
  "premiumAmount": 1500.00,
  "startDate": "2025-01-01",
  "expiryDate": "2026-01-01",
  "coverageDetails": {
    "coverage_amount": 500000,
    "deductible": 1000,
    "beneficiaries": ["John Smith"]
  },
  "status": "draft"
}
```

**Validation Rules**
- `clientId`: Valid UUID of an existing client (required)
- `policyNumber`: Maximum 50 characters (required)
- `policyType`: Maximum 100 characters (required)
- `provider`: Maximum 100 characters (required)
- `premiumAmount`: Positive number (required)
- `startDate`: Valid ISO date (required)
- `expiryDate`: Valid ISO date after startDate (required)
- `coverageDetails`: JSON object with policy-specific details (required)
- `status`: One of: 'draft', 'pending', 'active', 'cancelled', 'expired' (default: 'draft')

**Success Response (201 Created)**
```json
{
  "status": "success",
  "data": {
    "id": "uuid",
    "policy_number": "POL123",
    "policy_type": "Life Insurance",
    "provider": "Insurance Co",
    "premium_amount": 1500.00,
    "start_date": "2025-01-01",
    "expiry_date": "2026-01-01",
    "status": "draft",
    "coverage_details": {
      "coverage_amount": 500000,
      "deductible": 1000,
      "beneficiaries": ["John Smith"]
    },
    "created_at": "timestamp",
    "updated_at": "timestamp",
    "client": {
      "id": "uuid",
      "full_name": "John Smith",
      "email": "john@example.com"
    }
  }
}
```

**Error Responses**

*Validation Error (400 Bad Request)*
```json
{
  "status": "error",
  "errors": [
    {
      "field": "premiumAmount",
      "message": "Premium amount must be a positive number"
    }
  ]
}
```

*Conflict Error (409 Conflict)*
```json
{
  "status": "error",
  "message": "Policy number already exists"
}
```

*Not Found Error (404 Not Found)*
```json
{
  "status": "error",
  "message": "Client not found or does not belong to broker"
}
```

### PUT /policies/:id
Update an existing policy.

**Request Body**
```json
{
  "policyType": "Term Life Insurance",
  "provider": "New Insurance Co",
  "premiumAmount": 1800.00,
  "startDate": "2025-02-01",
  "expiryDate": "2026-02-01",
  "coverageDetails": {
    "coverage_amount": 600000,
    "deductible": 1000,
    "beneficiaries": ["John Smith", "Jane Smith"]
  },
  "status": "active"
}
```

**Validation Rules**
- `policyType`: Maximum 100 characters
- `provider`: Maximum 100 characters
- `premiumAmount`: Positive number
- `startDate`: Valid ISO date
- `expiryDate`: Valid ISO date after startDate
- `coverageDetails`: JSON object with policy-specific details
- `status`: One of: 'draft', 'pending', 'active', 'cancelled', 'expired'
- At least one field must be provided for update

**Success Response (200 OK)**
```json
{
  "status": "success",
  "data": {
    "id": "uuid",
    "policy_number": "POL123",
    "policy_type": "Term Life Insurance",
    "provider": "New Insurance Co",
    "premium_amount": 1800.00,
    "start_date": "2025-02-01",
    "expiry_date": "2026-02-01",
    "status": "active",
    "coverage_details": {
      "coverage_amount": 600000,
      "deductible": 1000,
      "beneficiaries": ["John Smith", "Jane Smith"]
    },
    "updated_at": "timestamp",
    "client": {
      "id": "uuid",
      "full_name": "John Smith",
      "email": "john@example.com"
    }
  }
}
```

**Error Responses**

*Not Found (404)*
```json
{
  "status": "error",
  "message": "Policy not found"
}
```

*Validation Error (400)*
```json
{
  "status": "error",
  "errors": [
    {
      "field": "status",
      "message": "Status must be one of [draft, pending, active, cancelled, expired]"
    }
  ]
}
```

### DELETE /policies/:id
Delete a policy and its associated tasks. Cannot delete active policies.

**Success Response (200 OK)**
```json
{
  "status": "success",
  "message": "Policy deleted successfully"
}
```

**Error Responses**

*Bad Request (400)*
```json
{
  "status": "error",
  "message": "Cannot delete an active policy"
}
```

*Not Found (404)*
```json
{
  "status": "error",
  "message": "Policy not found"
}
```

## Task Management

### GET /tasks
Get all tasks for the current broker with pagination, filtering, and sorting.

**Query Parameters**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)
- `status` (optional): Filter by status ('pending', 'in_progress', 'completed', 'cancelled')
- `priority` (optional): Filter by priority ('low', 'medium', 'high')
- `clientId` (optional): Filter by client ID
- `policyId` (optional): Filter by policy ID
- `dueBefore` (optional): Filter tasks due before a specific date (ISO format)
- `dueAfter` (optional): Filter tasks due after a specific date (ISO format)
- `search` (optional): Search in title and description
- `sortField` (optional): Field to sort by (default: 'due_date')
- `sortOrder` (optional): Sort order ('asc' or 'desc', default: 'asc')

**Success Response (200 OK)**
```json
{
  "status": "success",
  "data": [
    {
      "id": "uuid",
      "title": "Policy Renewal",
      "description": "Contact client about policy renewal",
      "priority": "high",
      "status": "pending",
      "due_date": "2025-12-15",
      "reminder_date": "2025-12-01",
      "created_at": "timestamp",
      "updated_at": "timestamp",
      "client": {
        "id": "uuid",
        "full_name": "John Smith",
        "email": "john@example.com"
      },
      "policy": {
        "id": "uuid",
        "policy_number": "POL123",
        "policy_type": "Life Insurance"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 50,
    "totalPages": 5
  }
}
```

### GET /tasks/:id
Get detailed information about a specific task, including client and policy details.

**Success Response (200 OK)**
```json
{
  "status": "success",
  "data": {
    "id": "uuid",
    "title": "Policy Renewal",
    "description": "Contact client about policy renewal",
    "priority": "high",
    "status": "pending",
    "due_date": "2025-12-15",
    "reminder_date": "2025-12-01",
    "created_at": "timestamp",
    "updated_at": "timestamp",
    "client": {
      "id": "uuid",
      "full_name": "John Smith",
      "email": "john@example.com",
      "phone": "+1234567890"
    },
    "policy": {
      "id": "uuid",
      "policy_number": "POL123",
      "policy_type": "Life Insurance",
      "provider": "Insurance Co",
      "expiry_date": "2026-01-01"
    }
  }
}
```

**Error Response (404 Not Found)**
```json
{
  "status": "error",
  "message": "Task not found"
}
```

### POST /tasks
Create a new task.

**Request Body**
```json
{
  "clientId": "uuid",
  "policyId": "uuid",
  "title": "Policy Renewal",
  "description": "Contact client about policy renewal",
  "priority": "high",
  "status": "pending",
  "dueDate": "2025-12-15",
  "reminderDate": "2025-12-01"
}
```

**Validation Rules**
- `clientId`: Valid UUID of an existing client (optional)
- `policyId`: Valid UUID of an existing policy (optional)
- At least one of `clientId` or `policyId` must be provided
- `title`: Maximum 200 characters (required)
- `description`: Maximum 1000 characters
- `priority`: One of: 'low', 'medium', 'high' (default: 'medium')
- `status`: One of: 'pending', 'in_progress', 'completed', 'cancelled' (default: 'pending')
- `dueDate`: Valid ISO date (required)
- `reminderDate`: Valid ISO date before dueDate

**Success Response (201 Created)**
```json
{
  "status": "success",
  "data": {
    "id": "uuid",
    "title": "Policy Renewal",
    "description": "Contact client about policy renewal",
    "priority": "high",
    "status": "pending",
    "due_date": "2025-12-15",
    "reminder_date": "2025-12-01",
    "created_at": "timestamp",
    "updated_at": "timestamp",
    "client": {
      "id": "uuid",
      "full_name": "John Smith",
      "email": "john@example.com"
    },
    "policy": {
      "id": "uuid",
      "policy_number": "POL123",
      "policy_type": "Life Insurance"
    }
  }
}
```

**Error Responses**

*Validation Error (400 Bad Request)*
```json
{
  "status": "error",
  "errors": [
    {
      "field": "dueDate",
      "message": "Due date is required"
    }
  ]
}
```

*Not Found Error (404 Not Found)*
```json
{
  "status": "error",
  "message": "Client not found or does not belong to broker"
}
```

### PUT /tasks/:id
Update an existing task.

**Request Body**
```json
{
  "clientId": "uuid",
  "policyId": "uuid",
  "title": "Policy Renewal Follow-up",
  "description": "Follow up on policy renewal discussion",
  "priority": "high",
  "status": "in_progress",
  "dueDate": "2025-12-20",
  "reminderDate": "2025-12-05"
}
```

**Validation Rules**
- `clientId`: Valid UUID of an existing client
- `policyId`: Valid UUID of an existing policy
- `title`: Maximum 200 characters
- `description`: Maximum 1000 characters
- `priority`: One of: 'low', 'medium', 'high'
- `status`: One of: 'pending', 'in_progress', 'completed', 'cancelled'
- `dueDate`: Valid ISO date
- `reminderDate`: Valid ISO date before dueDate
- At least one field must be provided for update

**Success Response (200 OK)**
```json
{
  "status": "success",
  "data": {
    "id": "uuid",
    "title": "Policy Renewal Follow-up",
    "description": "Follow up on policy renewal discussion",
    "priority": "high",
    "status": "in_progress",
    "due_date": "2025-12-20",
    "reminder_date": "2025-12-05",
    "updated_at": "timestamp",
    "client": {
      "id": "uuid",
      "full_name": "John Smith",
      "email": "john@example.com"
    },
    "policy": {
      "id": "uuid",
      "policy_number": "POL123",
      "policy_type": "Life Insurance"
    }
  }
}
```

**Error Responses**

*Not Found (404)*
```json
{
  "status": "error",
  "message": "Task not found"
}
```

*Validation Error (400)*
```json
{
  "status": "error",
  "errors": [
    {
      "field": "status",
      "message": "Status must be one of [pending, in_progress, completed, cancelled]"
    }
  ]
}
```

### DELETE /tasks/:id
Delete a task.

**Success Response (200 OK)**
```json
{
  "status": "success",
  "message": "Task deleted successfully"
}
```

**Error Response (404 Not Found)**
```json
{
  "status": "error",
  "message": "Task not found"
}
```

## Document Management

### GET /documents
Get all documents.

**Response**
```json
{
  "message": "Get all documents endpoint"
}
```

### GET /documents/:id
Get a specific document.

**Parameters**
- `id`: Document UUID

**Response**
```json
{
  "message": "Get specific document endpoint"
}
```

### POST /documents
Upload a new document.

**Response**
```json
{
  "message": "Upload document endpoint"
}
```

### PUT /documents/:id
Update document metadata.

**Parameters**
- `id`: Document UUID

**Response**
```json
{
  "message": "Update document metadata endpoint"
}
```

### DELETE /documents/:id
Delete a document.

**Parameters**
- `id`: Document UUID

**Response**
```json
{
  "message": "Delete document endpoint"
}
```

---

## Error Responses
All endpoints may return the following error responses:

### 401 Unauthorized
```json
{
  "error": "No token provided"
}
```
or
```json
{
  "error": "Invalid token"
}
```

### 500 Internal Server Error
```json
{
  "error": "Something went wrong!"
}
```

## Notes
- All timestamps are in ISO 8601 format
- All IDs are UUIDs
- All protected endpoints require authentication
- Request/Response bodies should be JSON encoded

This documentation will be updated as new features are implemented and endpoints are modified.
