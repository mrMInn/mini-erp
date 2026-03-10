import { createClient } from '@/lib/supabase/server';
import { MACHINE_STATUS } from '@/constants';

export class InventoryRepo {
  static async getAllInventory() {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('inventory')
      .select(`
        *,
        models (*),
        order_items (
          id, order_id, sale_price, historical_cost, warranty_end_date, status,
          orders (
            id, sale_date,
            customers ( full_name, phone )
          )
        )
      `)
      .neq('status', MACHINE_STATUS.ARCHIVED)
      .eq('is_deleted', false)
      .order('receive_date', { ascending: false });
    if (error) throw new Error(error.message);
    return data;
  }

  static async getInventoryItemWithModel(id: string) {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('inventory')
      .select(`
        *,
        models (*)
      `)
      .eq('id', id)
      .single();
    if (error) throw new Error(error.message);
    return data;
  }

  // Removed deprecated getSaleDetails

  static async getAllModels() {
    const supabase = await createClient();
    const { data, error } = await supabase.from('models').select('*').order('name', { ascending: true });
    if (error) throw new Error(error.message);
    return data;
  }

  static async createModel(modelData: any) {
    const supabase = await createClient();
    const { error } = await supabase.from('models').insert([modelData]);
    if (error) throw new Error(error.message);
    return true;
  }

  static async importMultipleInventory(items: any[]) {
    const supabase = await createClient();
    const { error } = await supabase.from('inventory').insert(items);
    if (error) throw new Error(error.message);
    return true;
  }

  static async updateInventory(id: string, updateData: any) {
    const supabase = await createClient();
    const { error } = await supabase.from('inventory').update(updateData).eq('id', id);
    if (error) throw new Error(error.message);
    return true;
  }

  static async deleteOrArchiveInventory(id: string) {
    const supabase = await createClient();
    // Kiểm tra bảng order_items xem máy đã từng bán chưa
    const { data: history } = await supabase.from('order_items').select('id').eq('inventory_id', id).limit(1);

    if (!history || history.length === 0) {
      // Chưa bán -> Xóa vĩnh viễn
      const { error } = await supabase.from('inventory').delete().eq('id', id);
      if (error) throw new Error(error.message);
      return 'deleted';
    } else {
      // Đã từng bán -> Soft delete (giữ lại cho kế toán)
      const { error } = await supabase.from('inventory').update({
        is_deleted: true,
        deleted_at: new Date().toISOString()
      }).eq('id', id);
      if (error) throw new Error(error.message);
      return 'archived';
    }
  }
}