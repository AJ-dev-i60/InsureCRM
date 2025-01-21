const { createClient } = require('@supabase/supabase-js');
const sanitizeHtml = require('sanitize-html');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

class ClientService {
  sanitizeInput(input) {
    if (typeof input !== 'string') return input;
    return sanitizeHtml(input.trim(), {
      allowedTags: [],
      allowedAttributes: {}
    });
  }

  async createClient(brokerId, clientData) {
    try {
      // Sanitize input data
      const sanitizedData = {
        broker_id: brokerId,
        email: this.sanitizeInput(clientData.email),
        full_name: this.sanitizeInput(clientData.fullName),
        phone: this.sanitizeInput(clientData.phone),
        address: this.sanitizeInput(clientData.address),
        date_of_birth: clientData.dateOfBirth,
        notes: this.sanitizeInput(clientData.notes),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Check if client already exists for this broker
      const { data: existingClient } = await supabase
        .from('clients')
        .select('id')
        .eq('broker_id', brokerId)
        .eq('email', sanitizedData.email)
        .single();

      if (existingClient) {
        throw new Error('Client with this email already exists');
      }

      // Create client
      const { data: client, error } = await supabase
        .from('clients')
        .insert([sanitizedData])
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create client: ${error.message}`);
      }

      // Log activity
      await this.logActivity(brokerId, client.id, 'client_created', 'New client created');

      return client;
    } catch (error) {
      throw error;
    }
  }

  async getClients(brokerId, options = {}) {
    try {
      let query = supabase
        .from('clients')
        .select('*, policies(count), tasks(count)')
        .eq('broker_id', brokerId);

      // Apply filters
      if (options.status) {
        query = query.eq('status', options.status);
      }
      if (options.search) {
        const searchTerm = `%${options.search}%`;
        query = query.or(`full_name.ilike.${searchTerm},email.ilike.${searchTerm}`);
      }

      // Apply pagination
      const page = options.page || 1;
      const limit = options.limit || 10;
      const startIndex = (page - 1) * limit;
      query = query.range(startIndex, startIndex + limit - 1);

      // Apply sorting
      const sortField = options.sortField || 'created_at';
      const sortOrder = options.sortOrder || 'desc';
      query = query.order(sortField, { ascending: sortOrder === 'asc' });

      const { data: clients, error, count } = await query;

      if (error) {
        throw new Error(`Failed to fetch clients: ${error.message}`);
      }

      return {
        clients,
        pagination: {
          page,
          limit,
          total: count,
          totalPages: Math.ceil(count / limit)
        }
      };
    } catch (error) {
      throw error;
    }
  }

  async getClientById(brokerId, clientId) {
    try {
      const { data: client, error } = await supabase
        .from('clients')
        .select(`
          *,
          policies (
            id,
            policy_number,
            policy_type,
            provider,
            status,
            expiry_date
          ),
          tasks (
            id,
            title,
            status,
            due_date
          )
        `)
        .eq('broker_id', brokerId)
        .eq('id', clientId)
        .single();

      if (error) {
        throw new Error(`Failed to fetch client: ${error.message}`);
      }

      if (!client) {
        throw new Error('Client not found');
      }

      return client;
    } catch (error) {
      throw error;
    }
  }

  async updateClient(brokerId, clientId, updateData) {
    try {
      // Sanitize input data
      const sanitizedData = {
        full_name: this.sanitizeInput(updateData.fullName),
        phone: this.sanitizeInput(updateData.phone),
        address: this.sanitizeInput(updateData.address),
        date_of_birth: updateData.dateOfBirth,
        notes: this.sanitizeInput(updateData.notes),
        status: updateData.status,
        updated_at: new Date().toISOString()
      };

      // Check if client exists
      const { data: existingClient } = await supabase
        .from('clients')
        .select('id')
        .eq('broker_id', brokerId)
        .eq('id', clientId)
        .single();

      if (!existingClient) {
        throw new Error('Client not found');
      }

      // Update client
      const { data: client, error } = await supabase
        .from('clients')
        .update(sanitizedData)
        .eq('broker_id', brokerId)
        .eq('id', clientId)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to update client: ${error.message}`);
      }

      // Log activity
      await this.logActivity(brokerId, clientId, 'client_updated', 'Client details updated');

      return client;
    } catch (error) {
      throw error;
    }
  }

  async deleteClient(brokerId, clientId) {
    try {
      // Check if client has any active policies
      const { data: activePolicies } = await supabase
        .from('policies')
        .select('id')
        .eq('client_id', clientId)
        .eq('status', 'active')
        .limit(1);

      if (activePolicies?.length > 0) {
        throw new Error('Cannot delete client with active policies');
      }

      // Delete client's tasks
      await supabase
        .from('tasks')
        .delete()
        .eq('client_id', clientId);

      // Delete client's policies
      await supabase
        .from('policies')
        .delete()
        .eq('client_id', clientId);

      // Delete client
      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('broker_id', brokerId)
        .eq('id', clientId);

      if (error) {
        throw new Error(`Failed to delete client: ${error.message}`);
      }

      // Log activity
      await this.logActivity(brokerId, clientId, 'client_deleted', 'Client and associated data deleted');

      return true;
    } catch (error) {
      throw error;
    }
  }

  async logActivity(brokerId, clientId, type, description) {
    try {
      await supabase
        .from('activity_logs')
        .insert([{
          broker_id: brokerId,
          client_id: clientId,
          type,
          description,
          created_at: new Date().toISOString()
        }]);
    } catch (error) {
      console.error('Failed to log activity:', error);
      // Don't throw the error as this is a non-critical operation
    }
  }
}

module.exports = new ClientService();
