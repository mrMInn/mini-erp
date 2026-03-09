import React from 'react';
import { fetchInventoryAction, fetchModelsAction } from '@/actions/inventory.actions';
import InventoryTable from '@/components/modules/inventory/InventoryTable';
import { Alert } from 'antd';

export const dynamic = 'force-dynamic';

export default async function InventoryPage() {
  const [invRes, modRes] = await Promise.all([
    fetchInventoryAction(),
    fetchModelsAction()
  ]);

  if (!invRes.success) return <Alert message="Lỗi tải dữ liệu" description={invRes.message} type="error" />;

  const inventoryData = invRes.data || [];

  return (
    <InventoryTable
      inventoryData={inventoryData}
      modelsData={modRes.success ? (modRes.data ?? []) : []}
    />
  );
}