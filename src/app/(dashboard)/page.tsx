import DashboardClient from './DashboardClient';
import { fetchInventoryAction } from '@/actions/inventory.actions';
import { fetchProfitStatsAction, fetchDailyRevenueAction, fetchAllTimeProfitAction, fetchCapitalByInvestorAction } from '@/actions/orders.actions';
import { fetchExpensesAction } from '@/actions/accounting.actions';
import dayjs from 'dayjs';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function DashboardPage() {
  const s = dayjs().subtract(11, 'month').startOf('month').toISOString();
  const e = dayjs().endOf('day').toISOString();

  const [invRes, profitRes, dailyRes, allTimeRes, sdCapRes, expRes] = await Promise.all([
    fetchInventoryAction(),
    fetchProfitStatsAction(s, e),
    fetchDailyRevenueAction(s, e),
    fetchAllTimeProfitAction(),
    fetchCapitalByInvestorAction('Song Đăng'),
    fetchExpensesAction(),
  ]);

  return (
    <DashboardClient
      inventory={invRes.success ? invRes.data || [] : []}
      periodProfitItems={profitRes.success ? profitRes.data || [] : []}
      dailyRevenue={dailyRes.success ? dailyRes.data || [] : []}
      allTimeProfitItems={allTimeRes.success ? allTimeRes.data || [] : []}
      sdCapitalTx={sdCapRes.success ? sdCapRes.data || [] : []}
      expenses={expRes.success ? expRes.data || [] : []}
    />
  );
}