# Supabase Schema and Deployment

## Schema Overview

### Tables
1. `brokers` - Stores broker information and profiles
2. `clients` - Stores client information
3. `policies` - Stores insurance policy details
4. `tasks` - Stores tasks and reminders
5. `activity_logs` - Stores system activity logs

### Enums
- `user_status`: pending_verification, active, suspended
- `policy_status`: draft, active, expired, cancelled
- `task_status`: pending, in_progress, completed, cancelled
- `client_status`: active, inactive

### Functions
- `get_broker_dashboard_stats(broker_id UUID)`: Returns comprehensive dashboard statistics

### Security
- Row Level Security (RLS) is enabled on all tables
- Each table has policies ensuring brokers can only access their own data
- All sensitive operations are protected by RLS policies

## Deployment Steps

1. Log in to your Supabase Dashboard
2. Navigate to your project
3. Go to the SQL Editor
4. Copy the contents of `migrations/20250121_init.sql`
5. Execute the SQL in the editor
6. Verify the schema and RLS policies in the Database section

## Database Indexes
The following indexes are created for better query performance:
- `idx_clients_broker_id`
- `idx_policies_broker_id`
- `idx_policies_client_id`
- `idx_tasks_broker_id`
- `idx_tasks_client_id`
- `idx_tasks_policy_id`
- `idx_activity_logs_broker_id`
- `idx_activity_logs_created_at`

## Automatic Updates
- Triggers are set up to automatically update the `updated_at` timestamp when records are modified
- The `created_at` field is automatically set to the current timestamp when records are created

## Row Level Security (RLS) Policies
All tables have RLS enabled with policies that:
1. Restrict access to only authenticated users
2. Ensure brokers can only access their own data
3. Prevent unauthorized modifications

## Post-Deployment Verification
After deploying the schema:
1. Check the Tables section to verify all tables were created
2. Verify the RLS policies under each table's Policies tab
3. Test the `get_broker_dashboard_stats` function in the SQL editor
4. Verify indexes were created under each table's Configuration tab

## Notes
- Always backup your data before running migrations in production
- Test any schema changes in a development project first
- Monitor the query performance after deployment
- Keep track of any errors in the SQL editor for troubleshooting
