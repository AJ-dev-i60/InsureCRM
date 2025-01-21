const { createClient } = require('@supabase/supabase-js');
const sanitizeHtml = require('sanitize-html');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

class BrokerService {
  sanitizeInput(input) {
    if (typeof input !== 'string') return input;
    return sanitizeHtml(input.trim(), {
      allowedTags: [],
      allowedAttributes: {}
    });
  }

  async registerBroker(brokerData) {
    try {
      // Sanitize input data
      const sanitizedData = {
        email: this.sanitizeInput(brokerData.email),
        password: brokerData.password, // Don't sanitize password
        fullName: this.sanitizeInput(brokerData.fullName),
        phone: this.sanitizeInput(brokerData.phone),
        companyName: this.sanitizeInput(brokerData.companyName),
        licenseNumber: this.sanitizeInput(brokerData.licenseNumber),
      };

      // Check if email already exists
      const { data: existingBroker } = await supabase
        .from('brokers')
        .select('email')
        .eq('email', sanitizedData.email)
        .single();

      if (existingBroker) {
        throw new Error('Email already registered');
      }

      // Create auth user with email verification
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: sanitizedData.email,
        password: sanitizedData.password,
        options: {
          emailRedirectTo: `${process.env.APP_URL}/verify-email`,
          data: {
            full_name: sanitizedData.fullName,
            role: 'broker'
          }
        }
      });

      if (authError) {
        throw new Error(`Authentication error: ${authError.message}`);
      }

      if (!authData.user) {
        throw new Error('Failed to create user account');
      }

      // Create broker profile
      const { data: brokerProfile, error: profileError } = await supabase
        .from('brokers')
        .insert([
          {
            id: authData.user.id,
            email: sanitizedData.email,
            full_name: sanitizedData.fullName,
            phone: sanitizedData.phone || null,
            company_name: sanitizedData.companyName || null,
            license_number: sanitizedData.licenseNumber || null,
            status: 'pending_verification',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          },
        ])
        .select()
        .single();

      if (profileError) {
        // Cleanup auth user if profile creation fails
        await supabase.auth.admin.deleteUser(authData.user.id);
        throw new Error(`Profile creation failed: ${profileError.message}`);
      }

      return {
        ...brokerProfile,
        message: 'Registration successful. Please check your email to verify your account.'
      };
    } catch (error) {
      throw error;
    }
  }

  async getBrokerProfile(brokerId) {
    try {
      // Get broker profile with additional stats
      const { data: profile, error: profileError } = await supabase
        .from('brokers')
        .select(`
          *,
          clients:clients(count),
          active_policies:policies(count).eq('status', 'active'),
          pending_tasks:tasks(count).eq('status', 'pending')
        `)
        .eq('id', brokerId)
        .single();

      if (profileError) {
        throw new Error(`Failed to fetch broker profile: ${profileError.message}`);
      }

      if (!profile) {
        throw new Error('Broker profile not found');
      }

      // Format the response
      return {
        ...profile,
        stats: {
          total_clients: profile.clients,
          active_policies: profile.active_policies,
          pending_tasks: profile.pending_tasks
        }
      };
    } catch (error) {
      throw error;
    }
  }

  async updateBrokerProfile(brokerId, updateData) {
    try {
      // Sanitize input data
      const sanitizedData = {
        full_name: this.sanitizeInput(updateData.fullName),
        phone: this.sanitizeInput(updateData.phone),
        company_name: this.sanitizeInput(updateData.companyName),
        license_number: this.sanitizeInput(updateData.licenseNumber),
        updated_at: new Date().toISOString()
      };

      // Check if broker exists
      const { data: existingBroker } = await supabase
        .from('brokers')
        .select('id')
        .eq('id', brokerId)
        .single();

      if (!existingBroker) {
        throw new Error('Broker not found');
      }

      // Update profile
      const { data: updatedProfile, error: updateError } = await supabase
        .from('brokers')
        .update(sanitizedData)
        .eq('id', brokerId)
        .select(`
          id,
          email,
          full_name,
          phone,
          company_name,
          license_number,
          status,
          created_at,
          updated_at
        `)
        .single();

      if (updateError) {
        throw new Error(`Failed to update broker profile: ${updateError.message}`);
      }

      return updatedProfile;
    } catch (error) {
      throw error;
    }
  }

  async getBrokerDashboardStats(brokerId) {
    try {
      // Get comprehensive dashboard statistics
      const { data: stats, error: statsError } = await supabase
        .rpc('get_broker_dashboard_stats', { broker_id: brokerId });

      if (statsError) {
        throw new Error(`Failed to fetch dashboard stats: ${statsError.message}`);
      }

      // If RPC not set up yet, fallback to direct queries
      if (!stats) {
        const [
          { data: clients },
          { data: policies },
          { data: tasks },
          { data: recentActivity }
        ] = await Promise.all([
          // Get client statistics
          supabase
            .from('clients')
            .select('id, status', { count: 'exact' })
            .eq('broker_id', brokerId),
          
          // Get policy statistics
          supabase
            .from('policies')
            .select('id, status', { count: 'exact' })
            .eq('broker_id', brokerId),
          
          // Get task statistics
          supabase
            .from('tasks')
            .select('id, status', { count: 'exact' })
            .eq('broker_id', brokerId),
          
          // Get recent activity
          supabase
            .from('activity_logs')
            .select('*')
            .eq('broker_id', brokerId)
            .order('created_at', { ascending: false })
            .limit(5)
        ]);

        return {
          clients: {
            total: clients?.length || 0,
            active: clients?.filter(c => c.status === 'active').length || 0
          },
          policies: {
            total: policies?.length || 0,
            active: policies?.filter(p => p.status === 'active').length || 0,
            expiring_soon: policies?.filter(p => {
              const expiryDate = new Date(p.expiry_date);
              const thirtyDaysFromNow = new Date();
              thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
              return expiryDate <= thirtyDaysFromNow;
            }).length || 0
          },
          tasks: {
            total: tasks?.length || 0,
            pending: tasks?.filter(t => t.status === 'pending').length || 0,
            overdue: tasks?.filter(t => {
              return t.status === 'pending' && new Date(t.due_date) < new Date();
            }).length || 0
          },
          recent_activity: recentActivity || []
        };
      }

      return stats;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new BrokerService();
