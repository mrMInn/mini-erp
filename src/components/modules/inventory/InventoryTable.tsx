'use client';

import React, { useState } from 'react';
import { Table, Tag, Button, Space, Typography, Modal, Form, Input, InputNumber, Row, Col, Switch, Select, Popconfirm, message, Divider, Upload, DatePicker } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, CameraOutlined, RocketOutlined } from '@ant-design/icons';
import { removeVietnameseTones, getFullName } from '@/utils/helpers';
import { createModelAction, importInventoryAction, updateInventoryAction, deleteInventoryAction } from '@/actions/inventory.actions';
import { useRouter } from 'next/navigation';
import Tesseract from 'tesseract.js';
import dayjs from 'dayjs';
import { createClient } from '@/lib/supabase/client';
import './inventory.css';

const { Text } = Typography;
const { Search } = Input;

// ═══════════ HELPERS ═══════════
const formatSpecs = (specsObj: any) => {
  if (!specsObj) return null;
  return (
    <Space size={[0, 4]} wrap style={{ marginTop: 4 }}>
      {specsObj.cpu && <Tag className="spec-tag" color="blue">{specsObj.cpu}</Tag>}
      {specsObj.ram && <Tag className="spec-tag" color="cyan">RAM {specsObj.ram}</Tag>}
      {specsObj.storage && <Tag className="spec-tag" color="purple">SSD {specsObj.storage}</Tag>}
      {specsObj.battery && <Tag className="spec-tag" color="green">Pin: {specsObj.battery}</Tag>}
      {specsObj.mdm && <Tag className="spec-tag" color="red" style={{ fontWeight: 'bold' }}>CÓ MDM</Tag>}
    </Space>
  );
};

const getModelLabelWithSpecs = (model: any) => {
  if (!model) return 'Máy không rõ';
  const specsObj = model.specs || {};
  return `${getFullName(model)} - ${specsObj.cpu || ''} ${specsObj.ram || ''}`.trim();
};

type StatusFilter = 'all' | 'in_stock' | 'in_transit' | 'defective' | 'sold';

const FILTER_CONFIG: { key: StatusFilter; label: string; emoji: string }[] = [
  { key: 'all', label: 'Tất cả', emoji: '' },
  { key: 'in_stock', label: 'Còn hàng', emoji: '' },
  { key: 'in_transit', label: 'Đang vận chuyển', emoji: '' },
  { key: 'defective', label: 'Máy lỗi', emoji: '' },
  { key: 'sold', label: 'Đã bán', emoji: '' },
];

// ═══════════ COMPONENT ═══════════
export default function InventoryTable({ inventoryData, modelsData }: { inventoryData: any[], modelsData: any[] }) {
  const router = useRouter();
  const [searchText, setSearchText] = useState('');
  const [activeFilter, setActiveFilter] = useState<StatusFilter>('in_stock');

  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [importQuantity, setImportQuantity] = useState(1);
  const [editingId, setEditingId] = useState('');
  const [editingRecord, setEditingRecord] = useState<any>(null);
  const [scanningIndex, setScanningIndex] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCreatingModel, setIsCreatingModel] = useState(false);
  const [localModels, setLocalModels] = useState<any[]>(modelsData);

  const [importForm] = Form.useForm();
  const [editForm] = Form.useForm();

  const [currentUser, setCurrentUser] = useState<string>('Sếp / Ẩn danh');
  const supabase = createClient();

  const [localInventory, setLocalInventory] = useState<any[]>(
    inventoryData.filter((item: any) => item.is_deleted !== true)
  );

  React.useEffect(() => {
    setLocalInventory(inventoryData.filter((item: any) => item.is_deleted !== true));
  }, [inventoryData]);

  React.useEffect(() => {
    setLocalModels(modelsData);
  }, [modelsData]);

  React.useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user?.email) setCurrentUser(data.user.email);
    });
  }, []);

  // ═══════════ HANDLERS ═══════════
  const handleScanSerial = async (file: File, index: number, formInstance: any) => {
    try {
      setScanningIndex(index);
      message.loading({ content: 'Đang dùng AI quét ảnh...', key: 'ocr' });
      const { data: { text } } = await Tesseract.recognize(file, 'eng');
      const cleanText = text.replace(/[^a-zA-Z0-9]/g, ' ').split(' ').sort((a, b) => b.length - a.length)[0];
      if (cleanText && cleanText.length > 4) {
        const upperSerial = cleanText.toUpperCase();
        formInstance.setFieldValue(index === -1 ? 'serial' : `serial_${index}`, upperSerial);
        message.success({ content: `Đã quét được Serial: ${upperSerial}`, key: 'ocr' });
      } else {
        message.warning({ content: 'Ảnh mờ hoặc không có Serial!', key: 'ocr' });
      }
    } catch {
      message.error({ content: 'Lỗi nhận diện ảnh!', key: 'ocr' });
    } finally {
      setScanningIndex(null);
    }
  };

  const handleCreateModelInline = async () => {
    const brand = importForm.getFieldValue('new_brand');
    const name = importForm.getFieldValue('new_name');
    if (!brand || !brand.trim()) { message.error('Chưa nhập Hãng!'); return; }
    if (!name || !name.trim()) { message.error('Chưa nhập Tên Máy!'); return; }
    setIsSubmitting(true);
    const values = {
      brand, name,
      cpu: importForm.getFieldValue('new_cpu') || '',
      ram: importForm.getFieldValue('new_ram') || '',
      storage: importForm.getFieldValue('new_storage') || '',
      battery: importForm.getFieldValue('new_battery') || '',
      mdm: importForm.getFieldValue('new_mdm') || false,
      actor_email: currentUser,
    };
    const res = await createModelAction(values);
    if (res.success) {
      message.success('Đã tạo model! Đang tải lại...');
      setIsCreatingModel(false);
      // Clear inline fields
      importForm.setFieldsValue({ new_brand: undefined, new_name: undefined, new_cpu: undefined, new_ram: undefined, new_storage: undefined, new_battery: undefined, new_mdm: false });
      // Refresh to get the new model list with the new ID
      router.refresh();
    } else { message.error(res.message); }
    setIsSubmitting(false);
  };

  const handleImport = async (values: any) => {
    setIsSubmitting(true);
    const res = await importInventoryAction(values.model_id, importQuantity, values, currentUser);
    if (res.success) { message.success(res.message); setIsImportModalOpen(false); importForm.resetFields(); setImportQuantity(1); router.refresh(); }
    else message.error(res.message);
    setIsSubmitting(false);
  };

  const handleDelete = async (id: string) => {
    const hide = message.loading('Đang xóa...', 0);
    try {
      const res = await deleteInventoryAction(id, currentUser);
      hide();
      if (res.success) {
        message.success(res.message);
        setLocalInventory(prev => prev.filter(item => item.id !== id));
        // Background sync — don't block UI
        router.refresh();
      } else { message.error('Lỗi: ' + res.message); }
    } catch (error: any) { hide(); message.error('Lỗi: ' + error.message); }
  };

  const handleEdit = async (values: any) => {
    setIsSubmitting(true);
    const updateData: any = {
      model_id: values.model_id,
      serial: values.serial?.toUpperCase() || null,
      purchase_price: values.purchase_price,
      additional_cost: values.additional_cost || 0,
    };
    
    // Only update status if it's not already sold, and the new status won't be sold 
    // (user shouldn't be able to select 'sold', but protecting here just in case)
    if (editingRecord?.status !== 'sold' && values.status !== 'sold') {
      updateData.status = values.status;
    }

    if (values.order_date) {
        updateData.order_date = values.order_date.toISOString();
    }
    if (values.receive_date) {
        updateData.receive_date = values.receive_date.toISOString();
    } else {
        updateData.receive_date = null;
    }

    if (editingRecord?.status === 'in_transit' && values.serial && (!values.status || values.status === 'in_transit')) {
      updateData.receive_date = updateData.receive_date || new Date().toISOString();
      updateData.status = 'in_stock';
    }

    const res = await updateInventoryAction(editingId, updateData, currentUser);
    if (res.success) {
      message.success('Đã cập nhật!');
      setIsEditModalOpen(false);
      // Optimistic local update — instant UI feedback
      setLocalInventory(prev => prev.map(item =>
        item.id === editingId
          ? { ...item, ...updateData, models: modelsData.find(m => m.id === updateData.model_id) || item.models }
          : item
      ));
      // Background sync
      router.refresh();
    }
    else { message.error(res.message || 'Lỗi cập nhật!'); }
    setIsSubmitting(false);
  };

  // ═══════════ FILTERING ═══════════
  const searchFiltered = localInventory.filter(m => {
    if (!searchText) return true;
    const kw = removeVietnameseTones(searchText).toLowerCase();
    const fullName = removeVietnameseTones(getFullName(m.models)).toLowerCase();
    const serial = (m.serial || '').toLowerCase();
    const specsStr = removeVietnameseTones(JSON.stringify(m.models?.specs || {})).toLowerCase();
    return fullName.includes(kw) || serial.includes(kw) || specsStr.includes(kw);
  });

  const counts: Record<StatusFilter, number> = {
    all: searchFiltered.length,
    in_stock: searchFiltered.filter(m => m.status === 'in_stock').length,
    in_transit: searchFiltered.filter(m => m.status === 'in_transit').length,
    defective: searchFiltered.filter(m => m.status === 'defective').length,
    sold: searchFiltered.filter(m => m.status === 'sold').length,
  };

  const displayData = activeFilter === 'all'
    ? searchFiltered
    : searchFiltered.filter(m => m.status === activeFilter);

  // ═══════════ HELPERS — SALE INFO ═══════════
  const getSaleInfo = (record: any) => {
    const items = record.order_items;
    if (!items || items.length === 0) return null;
    const soldItem = items.find((i: any) => i.status === 'sold') || items[0];

    // Order details are now directly embedded by the Supabase JOIN:
    const orderDetails = soldItem.orders || null;
    return { ...soldItem, _order: orderDetails };
  };

  // ═══════════ COLUMNS ═══════════
  const baseColumns = [
    { title: 'STT', render: (_: any, __: any, idx: number) => <span style={{ color: '#94a3b8', fontWeight: 600 }}>{idx + 1}</span>, width: 50, align: 'center' as const },
    {
      title: 'Sản Phẩm',
      width: 280,
      render: (record: any) => (
        <div>
          <Text strong style={{ color: '#1d1d1f', fontSize: 14 }}>{getFullName(record.models)}</Text>
          {formatSpecs(record.models?.specs)}
        </div>
      )
    },
    {
      title: 'Serial', dataIndex: 'serial',
      width: 130,
      render: (val: string) => val
        ? <Text style={{ fontFamily: 'monospace', fontSize: 13 }}>{val}</Text>
        : <Text type="secondary" italic style={{ fontSize: 12 }}>Chưa có</Text>
    },
  ];

  const stockColumns = [
    ...baseColumns,
    {
      title: 'Tổng Vốn',
      render: (record: any) => {
        const total = Number(record.purchase_price || 0) + Number(record.additional_cost || 0);
        return (
          <div>
            <Text strong style={{ color: '#dc2626' }}>{total.toLocaleString()}đ</Text>
           
          </div>
        );
      },
      width: 130,
    },
    {
      title: 'Trạng Thái', dataIndex: 'status',
      render: (status: string, record: any) => {
        if (status === 'in_transit') return <Tag color="orange" style={{ borderRadius: 8 }}>✈️ Đang bay</Tag>;
        if (status === 'defective') return <Tag color="red" style={{ borderRadius: 8 }}>🛠️ Lỗi</Tag>;
        if (status === 'sold') return <Tag style={{ borderRadius: 8, color: '#94a3b8' }}>Đã bán</Tag>;
        let stockTag = <Tag color="green" style={{ borderRadius: 8 }}>Còn hàng</Tag>;
        if (record.receive_date) {
          const days = dayjs().diff(dayjs(record.receive_date), 'day');
          if (days >= 30) {
            return <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>{stockTag}<Tag color="volcano" style={{ borderRadius: 8, margin: 0 }}>Tồn {days} ngày</Tag></div>;
          }
        }
        return stockTag;
      },
      width: 120,
    },
    {
      title: 'Ngày Nhập', key: 'dates',
      render: (record: any) => {
        if (!record.order_date) return <Text type="secondary" italic style={{ fontSize: 12 }}>N/A</Text>;
        const orderDate = dayjs(record.order_date);
        const receiveDate = record.receive_date ? dayjs(record.receive_date) : null;
        if (receiveDate) {
          const days = receiveDate.diff(orderDate, 'day');
          return (
            <div style={{ fontSize: 12 }}>
              <div style={{ color: '#059669', fontWeight: 600 }}>{receiveDate.format('DD/MM/YYYY')}</div>
              {days > 0 && <div style={{ color: '#94a3b8' }}>{days} ngày ship</div>}
            </div>
          );
        }
        const waiting = dayjs().diff(orderDate, 'day');
        return <div style={{ fontSize: 12 }}><div style={{ color: '#94a3b8' }}>Order {orderDate.format('DD/MM/YYYY')}</div><Tag color="orange" style={{ fontSize: 11, borderRadius: 6 }}>Chờ {waiting} ngày</Tag></div>;
      },
      width: 120,
    },
    {
      title: 'Ngày Bán', key: 'sale_dates',
      render: (record: any) => {
        if (record.status !== 'sold') return <Text type="secondary" italic style={{ fontSize: 12 }}>-</Text>;
        const saleInfo = getSaleInfo(record);
        const order = saleInfo?._order;
        if (!order?.sale_date) return <Text type="secondary" italic style={{ fontSize: 12 }}>N/A</Text>;
        return (
          <div style={{ fontSize: 12, fontWeight: 500, color: '#1d1d1f' }}>
            {dayjs(order.sale_date).format('DD/MM/YYYY')}
          </div>
        );
      },
      width: 100,
    },
    {
      title: '', key: 'actions',
      render: (record: any) => (
        <Space size={4}>
          <Button size="small" type="text" icon={<EditOutlined />} style={{ color: '#0A84FF' }}
            onClick={() => {
              setEditingId(record.id); setEditingRecord(record);
              editForm.setFieldsValue({ 
                  model_id: record.model_id, 
                  serial: record.serial, 
                  purchase_price: record.purchase_price, 
                  additional_cost: record.additional_cost, 
                  status: record.status,
                  order_date: record.order_date ? dayjs(record.order_date) : null,
                  receive_date: record.receive_date ? dayjs(record.receive_date) : null
              });
              setIsEditModalOpen(true);
            }}
          />
          <Popconfirm title={<><Text strong type="danger">LƯU Ý!</Text><br />Chỉ xóa khi gõ sai thông tin.</>} onConfirm={() => handleDelete(record.id)} okButtonProps={{ danger: true }} okText="Xóa" cancelText="Hủy">
            <Button size="small" type="text" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
      width: 80,
    }
  ];

  const soldColumns = [
    ...baseColumns,
    {
      title: 'Giá Bán / Lãi',
      render: (record: any) => {
        const saleInfo = getSaleInfo(record);
        if (!saleInfo) return <Text type="secondary" italic style={{ fontSize: 12 }}>N/A</Text>;
        const salePrice = Number(saleInfo.sale_price || 0);
        const cost = Number(saleInfo.historical_cost || 0);
        const profit = salePrice - cost;
        return (
          <div>
            <div style={{ fontWeight: 600, color: '#1d1d1f', fontSize: 13 }}>{salePrice.toLocaleString()}đ</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: profit >= 0 ? '#34C759' : '#FF3B30' }}>
              {profit >= 0 ? '+' : ''}{profit.toLocaleString()}đ
            </div>
          </div>
        );
      },
      width: 140,
    },
    {
      title: 'Ngày Bán',
      render: (record: any) => {
        const saleInfo = getSaleInfo(record);
        const order = saleInfo?._order;
        if (!order?.sale_date) return <Text type="secondary" italic style={{ fontSize: 12 }}>N/A</Text>;
        return (
          <div style={{ fontSize: 13, fontWeight: 500, color: '#1d1d1f' }}>
            {dayjs(order.sale_date).format('DD/MM/YYYY')}
          </div>
        );
      },
      width: 100,
    },
    {
      title: 'Khách Hàng',
      render: (record: any) => {
        const saleInfo = getSaleInfo(record);
        const customer = saleInfo?._order?.customers;
        if (!customer) return <Text type="secondary" italic style={{ fontSize: 12 }}>N/A</Text>;
        return (
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#1d1d1f' }}>{customer.full_name}</div>
            <div style={{ fontSize: 11, color: '#86868b' }}>{customer.phone}</div>
          </div>
        );
      },
      width: 130,
    },
    {
      title: 'Bảo Hành',
      render: (record: any) => {
        const saleInfo = getSaleInfo(record);
        if (!saleInfo?.warranty_end_date) return <Tag style={{ borderRadius: 8, color: '#aeaeb2' }}>Không BH</Tag>;
        const endDate = dayjs(saleInfo.warranty_end_date);
        const daysLeft = endDate.diff(dayjs(), 'day');
        if (daysLeft < 0) {
          return <Tag color="default" style={{ borderRadius: 8, color: '#aeaeb2' }}>Hết hạn</Tag>;
        }
        if (daysLeft <= 14) {
          return <Tag color="volcano" style={{ borderRadius: 8 }}>⚠️ Còn {daysLeft} ngày</Tag>;
        }
        return <Tag color="green" style={{ borderRadius: 8 }}>✅ Còn {daysLeft} ngày</Tag>;
      },
      width: 110,
    },
  ];

  const columns = activeFilter === 'sold' ? soldColumns : stockColumns;

  return (
    <div className="inventory-page">
      {/* HEADER */}
      <div className="inv-header">
        <h2 className="inv-title">📦 Kho Hàng</h2>
        <Button
          type="primary"
          icon={<RocketOutlined />}
          onClick={() => { setIsCreatingModel(false); setIsImportModalOpen(true); }}
          style={{
            background: 'linear-gradient(135deg, #0A84FF, #0070E0)', border: 'none', borderRadius: 12, fontWeight: 600, height: 40, padding: '0 20px',
            boxShadow: '0 2px 12px rgba(10,132,255,0.3)',
          }}
        >
          Nhập Kho
        </Button>
      </div>

      {/* SEARCH */}
      <div className="inv-search">
        <Input
          placeholder="Tìm theo tên, cấu hình, serial..."
          allowClear
          onChange={(e) => setSearchText(e.target.value)}
          size="large"
          prefix={<SearchOutlined style={{ color: '#86868b' }} />}
          className="inv-search-input"
        />
      </div>

      {/* FILTER PILLS */}
      <div className="inv-filters">
        {FILTER_CONFIG.map(f => (
          <button
            key={f.key}
            className={`filter-pill status-${f.key} ${activeFilter === f.key ? 'active' : ''}`}
            onClick={() => setActiveFilter(f.key)}
          >
            {f.emoji} {f.label}
            <span className="filter-count">{counts[f.key]}</span>
          </button>
        ))}
      </div>

      {/* SEARCH RESULT BANNER */}
      {searchText && (
        <div className="search-banner">
          🔍 Tìm thấy {searchFiltered.length} máy cho &quot;{searchText}&quot;
        </div>
      )}

      {/* TABLE */}
      <div className="inv-table-container">
        <Table
          columns={columns}
          dataSource={displayData}
          rowKey="id"
          pagination={{ pageSize: 20, showSizeChanger: false, showTotal: (total) => <span style={{ color: '#94a3b8', fontSize: 13 }}>{total} máy</span> }}
          size="small"
          scroll={{ x: 900 }}
        />
      </div>

      {/* ═══════════ MODALS ═══════════ */}

      {/* Modal: Nhập Kho (with Inline Model Creation) */}
      <Modal title="Order Máy Mới (Nhập Hàng)" open={isImportModalOpen} confirmLoading={isSubmitting} onCancel={() => { setIsImportModalOpen(false); setIsCreatingModel(false); }} onOk={() => importForm.submit()} okText="Nhập Kho" width={800}
        okButtonProps={{ disabled: isCreatingModel }}
      >
        <Form form={importForm} layout="vertical" onFinish={handleImport}>
          {/* Model Selection */}
          <Form.Item name="model_id" label="Chọn Dòng Máy" rules={[{ required: !isCreatingModel }]} style={isCreatingModel ? { display: 'none' } : {}}>
            <Select showSearch size="large" placeholder="Gõ tên máy để tìm..." optionFilterProp="label"
              options={[
                { value: '__CREATE_NEW__', label: '＋ Tạo model mới...', raw: null },
                ...localModels.map(m => ({ value: m.id, label: getModelLabelWithSpecs(m), raw: m })),
              ]}
              onChange={(val) => {
                if (val === '__CREATE_NEW__') {
                  importForm.setFieldValue('model_id', undefined);
                  setIsCreatingModel(true);
                }
              }}
              optionRender={(option) => {
                if (option.data.value === '__CREATE_NEW__') {
                  return (<div style={{ padding: '8px 0', color: '#0A84FF', fontWeight: 600, fontSize: 15 }}>
                    <PlusOutlined style={{ marginRight: 8 }} />Tạo model mới...
                  </div>);
                }
                const m = option.data.raw;
                if (!m) return option.label;
                return (<div style={{ padding: '4px 0', borderBottom: '1px solid #f0f0f0' }}>
                  <div style={{ fontWeight: 'bold', fontSize: 15 }}>{m.brand} {m.name} {m.specs?.mdm ? <Tag color="red">MDM</Tag> : ''}</div>
                  <div style={{ fontSize: 13, color: '#8c8c8c' }}>CPU: {m.specs?.cpu || '?'} | RAM: {m.specs?.ram || '?'} | SSD: {m.specs?.storage || '?'}</div>
                </div>);
              }}
            />
          </Form.Item>

          {/* Inline Model Creation */}
          {isCreatingModel && (
            <div style={{ background: '#f0f5ff', borderRadius: 12, padding: '16px 20px', marginBottom: 16, border: '1px solid #adc6ff' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <Text strong style={{ fontSize: 15, color: '#0A84FF' }}><PlusOutlined /> Tạo Model Mới</Text>
                <Button size="small" type="link" danger onClick={() => setIsCreatingModel(false)}>Hủy</Button>
              </div>
              <Row gutter={12}>
                <Col xs={24} sm={12}><Form.Item name="new_brand" label="Hãng" rules={[{ required: true, message: 'Nhập hãng' }]} style={{ marginBottom: 8 }}><Input placeholder="Dell, Apple..." /></Form.Item></Col>
                <Col xs={24} sm={12}><Form.Item name="new_name" label="Tên Máy" rules={[{ required: true, message: 'Nhập tên' }]} style={{ marginBottom: 8 }}><Input placeholder="XPS 15, MacBook Pro..." /></Form.Item></Col>
              </Row>
              <Divider style={{ margin: '8px 0', borderColor: '#d6e4ff' }} />
              <Row gutter={12}>
                <Col xs={12} sm={8}><Form.Item name="new_cpu" label="CPU" style={{ marginBottom: 8 }}><Input placeholder="i7 12th" /></Form.Item></Col>
                <Col xs={12} sm={8}><Form.Item name="new_ram" label="RAM" style={{ marginBottom: 8 }}><Input placeholder="16GB" /></Form.Item></Col>
                <Col xs={12} sm={8}><Form.Item name="new_storage" label="SSD" style={{ marginBottom: 8 }}><Input placeholder="512GB" /></Form.Item></Col>
                <Col xs={12} sm={8}><Form.Item name="new_battery" label="Pin" style={{ marginBottom: 8 }}><Input placeholder="100%" /></Form.Item></Col>
                <Col xs={12} sm={8}><Form.Item name="new_mdm" label="MDM?" valuePropName="checked" style={{ marginBottom: 8 }}><Switch checkedChildren="Có" unCheckedChildren="Không" /></Form.Item></Col>
                <Col xs={24} sm={8} style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: 8 }}>
                  <Button type="primary" onClick={handleCreateModelInline} loading={isSubmitting}
                    style={{ width: '100%', borderRadius: 8, background: '#0A84FF', fontWeight: 600 }}
                  >Lưu Model</Button>
                </Col>
              </Row>
            </div>
          )}

          {/* Quantity & Items */}
          <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
            <Text strong>Số lượng:</Text>
            <InputNumber min={1} max={50} value={importQuantity} onChange={(val) => setImportQuantity(val || 1)} />
          </div>
          <div style={{ maxHeight: 400, overflowY: 'auto', paddingRight: 8 }}>
            {Array.from({ length: importQuantity }).map((_, i) => (
              <Row gutter={10} key={i} style={{ marginBottom: 8, padding: '12px 8px', background: '#f1f5f9', borderRadius: 10, border: '1px dashed #cbd5e1' }}>
                <Col span={1} style={{ display: 'flex', alignItems: 'center' }}><Text strong style={{ color: '#64748b' }}>{i + 1}.</Text></Col>
              <Col xs={24} md={12} style={{ display: 'flex', gap: 8 }}>
                <Form.Item name={`serial_${i}`} style={{ margin: 0, flex: 1 }}><Input placeholder="Serial (để trống nếu chưa có)" /></Form.Item>
                <Upload accept="image/*" showUploadList={false} beforeUpload={(file) => { handleScanSerial(file, i, importForm); return false; }}>
                  <Button type="primary" ghost icon={<CameraOutlined />} loading={scanningIndex === i} />
                </Upload>
              </Col>
              <Col xs={12} md={6}><Form.Item name={`price_${i}`} rules={[{ required: true }]} style={{ margin: 0 }}><InputNumber style={{ width: '100%' }} formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} placeholder="Giá nhập" /></Form.Item></Col>
              <Col xs={12} md={6}><Form.Item name={`additional_cost_${i}`} style={{ margin: 0 }}><InputNumber style={{ width: '100%' }} formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} placeholder="Phí ship/sạc" /></Form.Item></Col>
              </Row>
            ))}
          </div>
        </Form>
      </Modal>

      {/* Modal: Sửa */}
      <Modal title="Cập Nhật Thông Tin" open={isEditModalOpen} confirmLoading={isSubmitting} onCancel={() => setIsEditModalOpen(false)} onOk={() => editForm.submit()} okText="Cập nhật">
        <Form form={editForm} layout="vertical" onFinish={handleEdit}>
          <Form.Item name="model_id" label="Dòng Máy" rules={[{ required: true }]}>
            <Select showSearch options={modelsData.map(m => ({ value: m.id, label: getModelLabelWithSpecs(m) }))} />
          </Form.Item>
          <Form.Item label="Serial">
            <div style={{ display: 'flex', gap: 8 }}>
              <Form.Item name="serial" rules={[{ required: editingRecord?.status !== 'in_transit', message: 'Nhập Serial!' }]} style={{ margin: 0, flex: 1 }}>
                <Input placeholder="Nhập Serial..." />
              </Form.Item>
              <Upload accept="image/*" showUploadList={false} beforeUpload={(file) => { handleScanSerial(file, -1, editForm); return false; }}>
                <Button type="primary" icon={<CameraOutlined />} loading={scanningIndex === -1} style={{ background: '#0A84FF', borderColor: '#0A84FF' }} />
              </Upload>
            </div>
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}><Form.Item name="purchase_price" label="Giá nhập (VND)" rules={[{ required: true }]}><InputNumber style={{ width: '100%' }} formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} /></Form.Item></Col>
            <Col span={12}><Form.Item name="additional_cost" label="Phí phát sinh (VND)"><InputNumber style={{ width: '100%' }} formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} /></Form.Item></Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
                <Form.Item name="order_date" label="Ngày Nhập">
                    <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
                </Form.Item>
            </Col>
            <Col span={12}>
                <Form.Item name="receive_date" label="Ngày Nhận">
                    <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
                </Form.Item>
            </Col>
          </Row>
          <Form.Item name="status" label="Trạng thái">
            <Select 
                disabled={editingRecord?.status === 'sold'}
                options={
                    editingRecord?.status === 'sold' 
                    ? [{ value: 'sold', label: 'Đã bán (Không thể sửa)' }]
                    : [
                        { value: 'in_transit', label: 'Đang vận chuyển' },
                        { value: 'in_stock', label: 'Còn hàng' },
                        { value: 'defective', label: 'Lỗi' },
                    ]
                } 
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}