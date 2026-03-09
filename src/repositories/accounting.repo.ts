import { createClient } from '@/lib/supabase/server';

export class AccountingRepo {
    // ═══════════ CHI PHÍ VẬN HÀNH ═══════════
    static async getAllExpenses() {
        const supabase = await createClient();
        const { data, error } = await supabase
            .from('general_expenses')
            .select('*')
            .order('expense_date', { ascending: false });
        if (error) throw new Error(error.message);
        return data;
    }

    static async createExpense(expenseData: { title: string; amount: number; expense_date: string }) {
        const supabase = await createClient();
        const { error } = await supabase.from('general_expenses').insert([expenseData]);
        if (error) throw new Error(error.message);
        return true;
    }

    static async deleteExpense(id: string) {
        const supabase = await createClient();
        const { error } = await supabase.from('general_expenses').delete().eq('id', id);
        if (error) throw new Error(error.message);
        return true;
    }

    // ═══════════ VỐN GÓP ═══════════
    static async getAllCapitalTransactions() {
        const supabase = await createClient();
        const { data, error } = await supabase
            .from('capital_transactions')
            .select('*')
            .order('transaction_date', { ascending: false });
        if (error) throw new Error(error.message);
        return data;
    }

    static async createCapitalTransaction(txData: { investor: string; type: string; amount: number; note: string; transaction_date: string }) {
        const supabase = await createClient();
        const { error } = await supabase.from('capital_transactions').insert([txData]);
        if (error) throw new Error(error.message);
        return true;
    }

    static async deleteCapitalTransaction(id: string) {
        const supabase = await createClient();
        const { error } = await supabase.from('capital_transactions').delete().eq('id', id);
        if (error) throw new Error(error.message);
        return true;
    }
}
