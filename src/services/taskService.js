const { createClient } = require('@supabase/supabase-js');
const sanitizeHtml = require('sanitize-html');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

class TaskService {
  sanitizeInput(input) {
    if (typeof input !== 'string') return input;
    return sanitizeHtml(input.trim(), {
      allowedTags: [],
      allowedAttributes: {}
    });
  }

  async createTask(brokerId, taskData) {
    try {
      // Verify client belongs to broker if clientId is provided
      if (taskData.clientId) {
        const { data: client } = await supabase
          .from('clients')
          .select('id')
          .eq('broker_id', brokerId)
          .eq('id', taskData.clientId)
          .single();

        if (!client) {
          throw new Error('Client not found or does not belong to broker');
        }
      }

      // Verify policy belongs to broker if policyId is provided
      if (taskData.policyId) {
        const { data: policy } = await supabase
          .from('policies')
          .select('id')
          .eq('broker_id', brokerId)
          .eq('id', taskData.policyId)
          .single();

        if (!policy) {
          throw new Error('Policy not found or does not belong to broker');
        }
      }

      // Sanitize input data
      const sanitizedData = {
        broker_id: brokerId,
        client_id: taskData.clientId,
        policy_id: taskData.policyId,
        title: this.sanitizeInput(taskData.title),
        description: this.sanitizeInput(taskData.description),
        priority: taskData.priority || 'medium',
        status: taskData.status || 'pending',
        due_date: taskData.dueDate,
        reminder_date: taskData.reminderDate,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Create task
      const { data: task, error } = await supabase
        .from('tasks')
        .insert([sanitizedData])
        .select(`
          *,
          client:clients (
            id,
            full_name,
            email
          ),
          policy:policies (
            id,
            policy_number,
            policy_type
          )
        `)
        .single();

      if (error) {
        throw new Error(`Failed to create task: ${error.message}`);
      }

      // Log activity
      await this.logActivity(brokerId, task.client_id, task.policy_id, task.id, 'task_created', 'New task created');

      return task;
    } catch (error) {
      throw error;
    }
  }

  async getTasks(brokerId, options = {}) {
    try {
      let query = supabase
        .from('tasks')
        .select(`
          *,
          client:clients (
            id,
            full_name,
            email
          ),
          policy:policies (
            id,
            policy_number,
            policy_type
          )
        `)
        .eq('broker_id', brokerId);

      // Apply filters
      if (options.status) {
        query = query.eq('status', options.status);
      }
      if (options.priority) {
        query = query.eq('priority', options.priority);
      }
      if (options.clientId) {
        query = query.eq('client_id', options.clientId);
      }
      if (options.policyId) {
        query = query.eq('policy_id', options.policyId);
      }
      if (options.dueBefore) {
        query = query.lte('due_date', options.dueBefore);
      }
      if (options.dueAfter) {
        query = query.gte('due_date', options.dueAfter);
      }
      if (options.search) {
        const searchTerm = `%${options.search}%`;
        query = query.or(`title.ilike.${searchTerm},description.ilike.${searchTerm}`);
      }

      // Apply pagination
      const page = options.page || 1;
      const limit = options.limit || 10;
      const startIndex = (page - 1) * limit;
      query = query.range(startIndex, startIndex + limit - 1);

      // Apply sorting
      const sortField = options.sortField || 'due_date';
      const sortOrder = options.sortOrder || 'asc';
      query = query.order(sortField, { ascending: sortOrder === 'asc' });

      const { data: tasks, error, count } = await query;

      if (error) {
        throw new Error(`Failed to fetch tasks: ${error.message}`);
      }

      return {
        tasks,
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

  async getTaskById(brokerId, taskId) {
    try {
      const { data: task, error } = await supabase
        .from('tasks')
        .select(`
          *,
          client:clients (
            id,
            full_name,
            email,
            phone
          ),
          policy:policies (
            id,
            policy_number,
            policy_type,
            provider,
            expiry_date
          )
        `)
        .eq('broker_id', brokerId)
        .eq('id', taskId)
        .single();

      if (error) {
        throw new Error(`Failed to fetch task: ${error.message}`);
      }

      if (!task) {
        throw new Error('Task not found');
      }

      return task;
    } catch (error) {
      throw error;
    }
  }

  async updateTask(brokerId, taskId, updateData) {
    try {
      // Check if task exists and belongs to broker
      const { data: existingTask } = await supabase
        .from('tasks')
        .select('id, status')
        .eq('broker_id', brokerId)
        .eq('id', taskId)
        .single();

      if (!existingTask) {
        throw new Error('Task not found');
      }

      // Verify client belongs to broker if clientId is being updated
      if (updateData.clientId) {
        const { data: client } = await supabase
          .from('clients')
          .select('id')
          .eq('broker_id', brokerId)
          .eq('id', updateData.clientId)
          .single();

        if (!client) {
          throw new Error('Client not found or does not belong to broker');
        }
      }

      // Verify policy belongs to broker if policyId is being updated
      if (updateData.policyId) {
        const { data: policy } = await supabase
          .from('policies')
          .select('id')
          .eq('broker_id', brokerId)
          .eq('id', updateData.policyId)
          .single();

        if (!policy) {
          throw new Error('Policy not found or does not belong to broker');
        }
      }

      // Sanitize input data
      const sanitizedData = {
        client_id: updateData.clientId,
        policy_id: updateData.policyId,
        title: updateData.title ? this.sanitizeInput(updateData.title) : undefined,
        description: updateData.description ? this.sanitizeInput(updateData.description) : undefined,
        priority: updateData.priority,
        status: updateData.status,
        due_date: updateData.dueDate,
        reminder_date: updateData.reminderDate,
        updated_at: new Date().toISOString()
      };

      // Remove undefined values
      Object.keys(sanitizedData).forEach(key => 
        sanitizedData[key] === undefined && delete sanitizedData[key]
      );

      // Update task
      const { data: task, error } = await supabase
        .from('tasks')
        .update(sanitizedData)
        .eq('broker_id', brokerId)
        .eq('id', taskId)
        .select(`
          *,
          client:clients (
            id,
            full_name,
            email
          ),
          policy:policies (
            id,
            policy_number,
            policy_type
          )
        `)
        .single();

      if (error) {
        throw new Error(`Failed to update task: ${error.message}`);
      }

      // Log activity
      if (existingTask.status !== task.status) {
        await this.logActivity(
          brokerId,
          task.client_id,
          task.policy_id,
          taskId,
          'task_updated',
          `Task status changed from ${existingTask.status} to ${task.status}`
        );
      }

      return task;
    } catch (error) {
      throw error;
    }
  }

  async deleteTask(brokerId, taskId) {
    try {
      // Check if task exists and belongs to broker
      const { data: task } = await supabase
        .from('tasks')
        .select('id, client_id, policy_id, status')
        .eq('broker_id', brokerId)
        .eq('id', taskId)
        .single();

      if (!task) {
        throw new Error('Task not found');
      }

      // Delete task
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('broker_id', brokerId)
        .eq('id', taskId);

      if (error) {
        throw new Error(`Failed to delete task: ${error.message}`);
      }

      // Log activity
      await this.logActivity(
        brokerId,
        task.client_id,
        task.policy_id,
        taskId,
        'task_deleted',
        'Task deleted'
      );

      return true;
    } catch (error) {
      throw error;
    }
  }

  async logActivity(brokerId, clientId, policyId, taskId, type, description) {
    try {
      await supabase
        .from('activity_logs')
        .insert([{
          broker_id: brokerId,
          client_id: clientId,
          policy_id: policyId,
          task_id: taskId,
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

module.exports = new TaskService();
