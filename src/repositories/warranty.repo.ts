import { createClient } from '@/lib/supabase/server';

export class WarrantyRepo {
    static async getAllWarrantyLogs() {
        const supabase = await createClient();
        const { data, error } = await supabase
            .from('warranty_logs')
            .select(`
        *,
        order_items (
          *,
          inventory (
            *,
            models (*)
          )
        )
      `)
            .order('created_at', { ascending: false });
        if (error) throw new Error(error.message);
        return data;
    }

    static async createWarrantyLog(logData: {
        order_item_id: string;
        receive_date: string;
        issue_description: string;
        note?: string;
    }) {
        const supabase = await createClient();
        const { error } = await supabase.from('warranty_logs').insert([logData]);
        if (error) throw new Error(error.message);
        return true;
    }

    static async updateWarrantyLog(id: string, updateData: any) {
        const supabase = await createClient();
        const { error } = await supabase.from('warranty_logs').update(updateData).eq('id', id);
        if (error) throw new Error(error.message);
        return true;
    }

    // Lấy các máy đang trong thời hạn bảo hành (warranty_end_date > now)
    static async getActiveWarrantyItems() {
        const supabase = await createClient();
        const { data, error } = await supabase
            .from('order_items')
            .select(`
        *,
        inventory (
          *,
          models (*)
        )
      `)
            .eq('status', 'sold')
            .gte('warranty_end_date', new Date().toISOString());
        if (error) throw new Error(error.message);
        return data;
    }
}
