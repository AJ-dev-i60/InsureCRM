const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

class BrokerService {
  async registerBroker(brokerData) {
    try {
      // First create the auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: brokerData.email,
        password: brokerData.password,
      });

      if (authError) throw authError;

      // Then create the broker profile
      const { data: brokerProfile, error: profileError } = await supabase
        .from('brokers')
        .insert([
          {
            id: authData.user.id,
            email: brokerData.email,
            full_name: brokerData.fullName,
            phone: brokerData.phone,
            company_name: brokerData.companyName,
            license_number: brokerData.licenseNumber,
          },
        ])
        .select()
        .single();

      if (profileError) throw profileError;

      return brokerProfile;
    } catch (error) {
      throw error;
    }
  }

  async getBrokerProfile(brokerId) {
    try {
      const { data, error } = await supabase
        .from('brokers')
        .select('*')
        .eq('id', brokerId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      throw error;
    }
  }

  async updateBrokerProfile(brokerId, updateData) {
    try {
      const { data, error } = await supabase
        .from('brokers')
        .update(updateData)
        .eq('id', brokerId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      throw error;
    }
  }

  async getBrokerDashboardStats(brokerId) {
    try {
      const [
        { count: clientCount },
        { count: policyCount },
        { count: taskCount },
      ] = await Promise.all([
        supabase
          .from('clients')
          .select('*', { count: 'exact' })
          .eq('broker_id', brokerId),
        supabase
          .from('policies')
          .select('*', { count: 'exact' })
          .eq('broker_id', brokerId),
        supabase
          .from('tasks')
          .select('*', { count: 'exact' })
          .eq('broker_id', brokerId)
          .eq('status', 'pending'),
      ]);

      return {
        totalClients: clientCount,
        totalPolicies: policyCount,
        pendingTasks: taskCount,
      };
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new BrokerService();
