const { createClient } = require('@supabase/supabase-js');
const sanitizeHtml = require('sanitize-html');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

class PolicyService {
  sanitizeInput(input) {
    if (typeof input !== 'string') return input;
    return sanitizeHtml(input.trim(), {
      allowedTags: [],
      allowedAttributes: {}
    });
  }

  async createPolicy(brokerId, clientId, policyData) {
    try {
      // Verify client belongs to broker
      const { data: client } = await supabase
        .from('clients')
        .select('id')
        .eq('broker_id', brokerId)
        .eq('id', clientId)
        .single();

      if (!client) {
        throw new Error('Client not found or does not belong to broker');
      }

      // Sanitize input data
      const sanitizedData = {
        broker_id: brokerId,
        client_id: clientId,
        policy_number: this.sanitizeInput(policyData.policyNumber),
        policy_type: this.sanitizeInput(policyData.policyType),
        provider: this.sanitizeInput(policyData.provider),
        premium_amount: policyData.premiumAmount,
        start_date: policyData.startDate,
        expiry_date: policyData.expiryDate,
        status: policyData.status || 'draft',
        coverage_details: policyData.coverageDetails,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Check if policy number already exists
      const { data: existingPolicy } = await supabase
        .from('policies')
        .select('id')
        .eq('policy_number', sanitizedData.policy_number)
        .single();

      if (existingPolicy) {
        throw new Error('Policy number already exists');
      }

      // Create policy
      const { data: policy, error } = await supabase
        .from('policies')
        .insert([sanitizedData])
        .select(`
          *,
          client:clients (
            id,
            full_name,
            email
          )
        `)
        .single();

      if (error) {
        throw new Error(`Failed to create policy: ${error.message}`);
      }

      // Log activity
      await this.logActivity(brokerId, clientId, policy.id, 'policy_created', 'New policy created');

      return policy;
    } catch (error) {
      throw error;
    }
  }

  async getPolicies(brokerId, options = {}) {
    try {
      let query = supabase
        .from('policies')
        .select(`
          *,
          client:clients (
            id,
            full_name,
            email
          )
        `)
        .eq('broker_id', brokerId);

      // Apply filters
      if (options.status) {
        query = query.eq('status', options.status);
      }
      if (options.clientId) {
        query = query.eq('client_id', options.clientId);
      }
      if (options.policyType) {
        query = query.eq('policy_type', options.policyType);
      }
      if (options.provider) {
        query = query.eq('provider', options.provider);
      }
      if (options.expiringBefore) {
        query = query.lte('expiry_date', options.expiringBefore);
      }
      if (options.search) {
        const searchTerm = `%${options.search}%`;
        query = query.or(`policy_number.ilike.${searchTerm},policy_type.ilike.${searchTerm}`);
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

      const { data: policies, error, count } = await query;

      if (error) {
        throw new Error(`Failed to fetch policies: ${error.message}`);
      }

      return {
        policies,
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

  async getPolicyById(brokerId, policyId) {
    try {
      const { data: policy, error } = await supabase
        .from('policies')
        .select(`
          *,
          client:clients (
            id,
            full_name,
            email,
            phone
          ),
          tasks (
            id,
            title,
            status,
            due_date
          )
        `)
        .eq('broker_id', brokerId)
        .eq('id', policyId)
        .single();

      if (error) {
        throw new Error(`Failed to fetch policy: ${error.message}`);
      }

      if (!policy) {
        throw new Error('Policy not found');
      }

      return policy;
    } catch (error) {
      throw error;
    }
  }

  async updatePolicy(brokerId, policyId, updateData) {
    try {
      // Check if policy exists and belongs to broker
      const { data: existingPolicy } = await supabase
        .from('policies')
        .select('id, status')
        .eq('broker_id', brokerId)
        .eq('id', policyId)
        .single();

      if (!existingPolicy) {
        throw new Error('Policy not found');
      }

      // Sanitize input data
      const sanitizedData = {
        policy_type: this.sanitizeInput(updateData.policyType),
        provider: this.sanitizeInput(updateData.provider),
        premium_amount: updateData.premiumAmount,
        start_date: updateData.startDate,
        expiry_date: updateData.expiryDate,
        status: updateData.status,
        coverage_details: updateData.coverageDetails,
        updated_at: new Date().toISOString()
      };

      // Update policy
      const { data: policy, error } = await supabase
        .from('policies')
        .update(sanitizedData)
        .eq('broker_id', brokerId)
        .eq('id', policyId)
        .select(`
          *,
          client:clients (
            id,
            full_name,
            email
          )
        `)
        .single();

      if (error) {
        throw new Error(`Failed to update policy: ${error.message}`);
      }

      // Log activity
      await this.logActivity(
        brokerId,
        policy.client_id,
        policyId,
        'policy_updated',
        `Policy status changed from ${existingPolicy.status} to ${policy.status}`
      );

      return policy;
    } catch (error) {
      throw error;
    }
  }

  async deletePolicy(brokerId, policyId) {
    try {
      // Check if policy exists and belongs to broker
      const { data: policy } = await supabase
        .from('policies')
        .select('id, client_id, status')
        .eq('broker_id', brokerId)
        .eq('id', policyId)
        .single();

      if (!policy) {
        throw new Error('Policy not found');
      }

      if (policy.status === 'active') {
        throw new Error('Cannot delete an active policy');
      }

      // Delete associated tasks
      await supabase
        .from('tasks')
        .delete()
        .eq('policy_id', policyId);

      // Delete policy
      const { error } = await supabase
        .from('policies')
        .delete()
        .eq('broker_id', brokerId)
        .eq('id', policyId);

      if (error) {
        throw new Error(`Failed to delete policy: ${error.message}`);
      }

      // Log activity
      await this.logActivity(
        brokerId,
        policy.client_id,
        policyId,
        'policy_deleted',
        'Policy and associated tasks deleted'
      );

      return true;
    } catch (error) {
      throw error;
    }
  }

  async logActivity(brokerId, clientId, policyId, type, description) {
    try {
      await supabase
        .from('activity_logs')
        .insert([{
          broker_id: brokerId,
          client_id: clientId,
          policy_id: policyId,
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

module.exports = new PolicyService();
