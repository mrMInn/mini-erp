import { supabase } from '@/lib/supabase';

export class LogsRepo {
    static async getAuditLogs() {
        const { data, error } = await supabase
            .from('audit_logs')
            .select('*')
            .order('changed_at', { ascending: false });

        if (error) throw new Error(error.message);
        return data.map(log => ({
            ...log,
            created_at: log.changed_at ? (log.changed_at.endsWith('Z') ? log.changed_at : `${log.changed_at}Z`) : '',
            description: log.new_data?.description || log.old_data?.description || '',
            record_id: log.new_data?.record_id || log.old_data?.record_id || ''
        }));
    }
}
