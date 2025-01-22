const supabase = require('../config/supabase');
const crypto = require('crypto');

class DocumentService {
    constructor() {
        this.bucketName = 'documents';
    }

    /**
     * Initialize storage bucket if it doesn't exist
     */
    async initializeBucket() {
        const { data: buckets } = await supabase.storage.listBuckets();
        const bucketExists = buckets.some(bucket => bucket.name === this.bucketName);
        
        if (!bucketExists) {
            await supabase.storage.createBucket(this.bucketName, {
                public: false,
                fileSizeLimit: 52428800 // 50MB limit
            });
        }
    }

    /**
     * Upload a document
     */
    async uploadDocument(file, metadata) {
        const { brokerId, clientId, policyId, type } = metadata;
        const fileExt = file.name.split('.').pop();
        const uniqueId = crypto.randomBytes(16).toString('hex');
        const filePath = `${brokerId}/${clientId || 'general'}/${uniqueId}.${fileExt}`;

        // Upload file to storage
        const { data: uploadData, error: uploadError } = await supabase.storage
            .from(this.bucketName)
            .upload(filePath, file.buffer, {
                contentType: file.mimetype,
                upsert: false
            });

        if (uploadError) throw uploadError;

        // Store metadata in documents table
        const { data: docData, error: docError } = await supabase
            .from('documents')
            .insert({
                broker_id: brokerId,
                client_id: clientId,
                policy_id: policyId,
                file_path: filePath,
                file_name: file.originalname,
                file_type: file.mimetype,
                file_size: file.size,
                document_type: type,
                uploaded_at: new Date().toISOString()
            })
            .select()
            .single();

        if (docError) {
            // Rollback storage upload if metadata insertion fails
            await this.deleteFile(filePath);
            throw docError;
        }

        return docData;
    }

    /**
     * Get document metadata and download URL
     */
    async getDocument(documentId, brokerId) {
        const { data: doc, error } = await supabase
            .from('documents')
            .select('*')
            .eq('id', documentId)
            .eq('broker_id', brokerId)
            .single();

        if (error) throw error;
        if (!doc) throw new Error('Document not found');

        // Generate temporary download URL
        const { data: { signedUrl }, error: urlError } = await supabase.storage
            .from(this.bucketName)
            .createSignedUrl(doc.file_path, 3600); // 1 hour expiry

        if (urlError) throw urlError;

        return { ...doc, download_url: signedUrl };
    }

    /**
     * List documents with optional filtering
     */
    async listDocuments(brokerId, filters = {}) {
        let query = supabase
            .from('documents')
            .select('*')
            .eq('broker_id', brokerId);

        // Apply filters
        if (filters.clientId) query = query.eq('client_id', filters.clientId);
        if (filters.policyId) query = query.eq('policy_id', filters.policyId);
        if (filters.type) query = query.eq('document_type', filters.type);

        // Add pagination
        const { from, to } = filters;
        if (from !== undefined && to !== undefined) {
            query = query.range(from, to);
        }

        const { data, error } = await query.order('uploaded_at', { ascending: false });
        if (error) throw error;

        return data;
    }

    /**
     * Update document metadata
     */
    async updateDocument(documentId, brokerId, updates) {
        const { data, error } = await supabase
            .from('documents')
            .update(updates)
            .eq('id', documentId)
            .eq('broker_id', brokerId)
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    /**
     * Delete document and its metadata
     */
    async deleteDocument(documentId, brokerId) {
        // Get document metadata first
        const { data: doc, error: fetchError } = await supabase
            .from('documents')
            .select('file_path')
            .eq('id', documentId)
            .eq('broker_id', brokerId)
            .single();

        if (fetchError) throw fetchError;
        if (!doc) throw new Error('Document not found');

        // Delete from storage
        const { error: storageError } = await supabase.storage
            .from(this.bucketName)
            .remove([doc.file_path]);

        if (storageError) throw storageError;

        // Delete metadata
        const { error: deleteError } = await supabase
            .from('documents')
            .delete()
            .eq('id', documentId)
            .eq('broker_id', brokerId);

        if (deleteError) throw deleteError;
    }

    /**
     * Helper method to delete a file from storage
     */
    async deleteFile(filePath) {
        const { error } = await supabase.storage
            .from(this.bucketName)
            .remove([filePath]);
        
        if (error) throw error;
    }
}

module.exports = new DocumentService();
