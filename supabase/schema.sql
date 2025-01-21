-- Enable necessary extensions
create extension if not exists "uuid-ossp";

-- Brokers table
create table public.brokers (
    id uuid default uuid_generate_v4() primary key,
    email text unique not null,
    full_name text not null,
    phone text,
    company_name text,
    license_number text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Clients table
create table public.clients (
    id uuid default uuid_generate_v4() primary key,
    broker_id uuid references public.brokers(id) not null,
    first_name text not null,
    last_name text not null,
    email text,
    phone text,
    address text,
    date_of_birth date,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Policies table
create table public.policies (
    id uuid default uuid_generate_v4() primary key,
    client_id uuid references public.clients(id) not null,
    broker_id uuid references public.brokers(id) not null,
    policy_number text not null,
    policy_type text not null,
    provider text not null,
    start_date date not null,
    end_date date not null,
    premium_amount decimal(10,2) not null,
    status text not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Documents table
create table public.documents (
    id uuid default uuid_generate_v4() primary key,
    client_id uuid references public.clients(id),
    policy_id uuid references public.policies(id),
    broker_id uuid references public.brokers(id) not null,
    document_type text not null,
    file_name text not null,
    file_path text not null,
    uploaded_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Tasks table
create table public.tasks (
    id uuid default uuid_generate_v4() primary key,
    broker_id uuid references public.brokers(id) not null,
    client_id uuid references public.clients(id),
    policy_id uuid references public.policies(id),
    title text not null,
    description text,
    due_date timestamp with time zone,
    status text not null,
    priority text not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Communications table
create table public.communications (
    id uuid default uuid_generate_v4() primary key,
    broker_id uuid references public.brokers(id) not null,
    client_id uuid references public.clients(id) not null,
    type text not null,
    subject text not null,
    content text not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Row Level Security (RLS) Policies
alter table public.brokers enable row level security;
alter table public.clients enable row level security;
alter table public.policies enable row level security;
alter table public.documents enable row level security;
alter table public.tasks enable row level security;
alter table public.communications enable row level security;

-- Broker can only see their own data
create policy "Brokers can view own data" on public.brokers
    for select using (auth.uid() = id);

-- Broker can only see their own clients
create policy "Brokers can view own clients" on public.clients
    for all using (auth.uid() = broker_id);

-- Broker can only see their own policies
create policy "Brokers can view own policies" on public.policies
    for all using (auth.uid() = broker_id);

-- Broker can only see their own documents
create policy "Brokers can view own documents" on public.documents
    for all using (auth.uid() = broker_id);

-- Broker can only see their own tasks
create policy "Brokers can view own tasks" on public.tasks
    for all using (auth.uid() = broker_id);

-- Broker can only see their own communications
create policy "Brokers can view own communications" on public.communications
    for all using (auth.uid() = broker_id);
