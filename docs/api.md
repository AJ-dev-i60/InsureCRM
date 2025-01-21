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
Register a new broker.

**Request Body**
```json
{
  "email": "broker@example.com",
  "password": "securepassword",
  "fullName": "John Doe",
  "phone": "+1234567890",
  "companyName": "Insurance Pro Ltd",
  "licenseNumber": "INS123456"
}
```

**Response**
```json
{
  "id": "uuid",
  "email": "broker@example.com",
  "fullName": "John Doe",
  "phone": "+1234567890",
  "companyName": "Insurance Pro Ltd",
  "licenseNumber": "INS123456",
  "created_at": "timestamp",
  "updated_at": "timestamp"
}
```

### GET /brokers/profile
Get the current broker's profile.

**Response**
```json
{
  "id": "uuid",
  "email": "broker@example.com",
  "fullName": "John Doe",
  "phone": "+1234567890",
  "companyName": "Insurance Pro Ltd",
  "licenseNumber": "INS123456",
  "created_at": "timestamp",
  "updated_at": "timestamp"
}
```

### PUT /brokers/profile
Update the current broker's profile.

**Request Body**
```json
{
  "fullName": "John Doe Updated",
  "phone": "+1234567890",
  "companyName": "Insurance Pro Ltd",
  "licenseNumber": "INS123456"
}
```

**Response**
```json
{
  "id": "uuid",
  "email": "broker@example.com",
  "fullName": "John Doe Updated",
  "phone": "+1234567890",
  "companyName": "Insurance Pro Ltd",
  "licenseNumber": "INS123456",
  "updated_at": "timestamp"
}
```

### GET /brokers/dashboard-stats
Get broker's dashboard statistics.

**Response**
```json
{
  "totalClients": 100,
  "totalPolicies": 150,
  "pendingTasks": 5
}
```

## Client Management

### GET /clients
Get all clients for the current broker.

**Response**
```json
{
  "message": "Get all clients endpoint"
}
```

### GET /clients/:id
Get a specific client.

**Parameters**
- `id`: Client UUID

**Response**
```json
{
  "message": "Get specific client endpoint"
}
```

### POST /clients
Create a new client.

**Response**
```json
{
  "message": "Create client endpoint"
}
```

### PUT /clients/:id
Update a client.

**Parameters**
- `id`: Client UUID

**Response**
```json
{
  "message": "Update client endpoint"
}
```

### DELETE /clients/:id
Delete a client.

**Parameters**
- `id`: Client UUID

**Response**
```json
{
  "message": "Delete client endpoint"
}
```

## Policy Management

### GET /policies
Get all policies.

**Response**
```json
{
  "message": "Get all policies endpoint"
}
```

### GET /policies/:id
Get a specific policy.

**Parameters**
- `id`: Policy UUID

**Response**
```json
{
  "message": "Get specific policy endpoint"
}
```

### POST /policies
Create a new policy.

**Response**
```json
{
  "message": "Create policy endpoint"
}
```

### PUT /policies/:id
Update a policy.

**Parameters**
- `id`: Policy UUID

**Response**
```json
{
  "message": "Update policy endpoint"
}
```

### DELETE /policies/:id
Delete a policy.

**Parameters**
- `id`: Policy UUID

**Response**
```json
{
  "message": "Delete policy endpoint"
}
```

## Task Management

### GET /tasks
Get all tasks.

**Response**
```json
{
  "message": "Get all tasks endpoint"
}
```

### GET /tasks/:id
Get a specific task.

**Parameters**
- `id`: Task UUID

**Response**
```json
{
  "message": "Get specific task endpoint"
}
```

### POST /tasks
Create a new task.

**Response**
```json
{
  "message": "Create task endpoint"
}
```

### PUT /tasks/:id
Update a task.

**Parameters**
- `id`: Task UUID

**Response**
```json
{
  "message": "Update task endpoint"
}
```

### DELETE /tasks/:id
Delete a task.

**Parameters**
- `id`: Task UUID

**Response**
```json
{
  "message": "Delete task endpoint"
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
