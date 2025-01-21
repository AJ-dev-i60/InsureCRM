# InsureCRM

A comprehensive CRM system for insurance brokers built with Supabase and Svelte.

## Features

- Broker registration and authentication
- Client management
- Policy tracking
- Document management
- Task management
- Communication history

## Tech Stack

- Backend: Supabase
  - Authentication
  - PostgreSQL Database
  - Storage for documents
  - Realtime subscriptions
- Frontend: Svelte (separate repository)

## Getting Started

1. Clone this repository
2. Set up your Supabase project and obtain your project URL and anon key
3. Copy `.env.example` to `.env` and fill in your Supabase credentials
4. Install dependencies with `npm install`
5. Run the development server with `npm run dev`

## Database Schema

The system uses the following main tables:

- `brokers` - Broker information and authentication
- `clients` - Client information
- `policies` - Insurance policy details
- `documents` - Document metadata
- `tasks` - Task management
- `communications` - Communication history

## API Documentation

Detailed API documentation can be found in the `/docs` directory.
