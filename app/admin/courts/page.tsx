"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  App,
  Button,
  Card,
  Checkbox,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Skeleton,
  Space,
  Table,
  Tag,
  Typography,
} from "antd";
import type { ColumnsType, TableProps } from "antd/es/table";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import { AdminLayout } from "@/components/admin/AdminLayout";
import {
  getAllCourts,
  createCourt,
  updateCourt,
  deleteCourt,
} from "../../actions/courts";
import type { Court, CourtPricingPeriod, PricingLabel } from "@/types";

const { Text } = Typography;
const { TextArea } = Input;

export default function CourtsPage() {
  const { message } = App.useApp();
  const { data: session } = useSession();
  const router = useRouter();
  const [courts, setCourts] = useState<Court[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showCourtModal, setShowCourtModal] = useState(false);
  const [editingCourt, setEditingCourt] = useState<Court | null>(null);
  const [isSubmittingCourt, setIsSubmittingCourt] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingCourt, setDeletingCourt] = useState<Court | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [sortColumn, setSortColumn] = useState<keyof Court | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [courtForm, setCourtForm] = useState<{
    name: string;
    type: "PADEL" | "CRICKET" | "PICKLEBALL" | "FUTSAL";
    description: string;
    pricePerHour: number;
    isActive: boolean;
    timeBasedPricingEnabled: boolean;
    pricingPeriods: CourtPricingPeriod[];
  }>({
    name: "",
    type: "PADEL",
    description: "",
    pricePerHour: 0,
    isActive: true,
    timeBasedPricingEnabled: false,
    pricingPeriods: [],
  });

  const userRole = (session?.user as { role?: string })?.role;
  const isSuperAdmin = userRole === "super_admin";

  useEffect(() => {
    if (session) {
      if (!isSuperAdmin) {
        router.push("/admin/bookings");
        return;
      }
      loadData();
    }
  }, [session, isSuperAdmin, router]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const result = await getAllCourts();
      if (result.success) {
        setCourts(result.courts);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCourtSubmit = async () => {
    setIsSubmittingCourt(true);

    try {
      if (editingCourt) {
        const result = await updateCourt({
          courtId: editingCourt._id,
          ...courtForm,
        });

        if (result.success) {
          setShowCourtModal(false);
          setEditingCourt(null);
          resetCourtForm();
          loadData();
        } else {
          message.error(result.error || "Failed to update court");
        }
      } else {
        const result = await createCourt({
          ...courtForm,
          image: "",
        });

        if (result.success) {
          setShowCourtModal(false);
          resetCourtForm();
          loadData();
        } else {
          message.error(result.error || "Failed to create court");
        }
      }
    } catch (error) {
      message.error(
        error instanceof Error ? error.message : "An error occurred",
      );
    } finally {
      setIsSubmittingCourt(false);
    }
  };

  const resetCourtForm = () => {
    setCourtForm({
      name: "",
      type: "PADEL",
      description: "",
      pricePerHour: 0,
      isActive: true,
      timeBasedPricingEnabled: false,
      pricingPeriods: [],
    });
    setEditingCourt(null);
  };

  const handleEditCourt = (court: Court) => {
    setEditingCourt(court);
    setCourtForm({
      name: court.name,
      type: court.type,
      description: court.description,
      pricePerHour: court.pricePerHour,
      isActive: court.isActive,
      timeBasedPricingEnabled: court.timeBasedPricingEnabled ?? false,
      pricingPeriods: court.pricingPeriods ?? [],
    });
    setShowCourtModal(true);
  };

  const addPricingPeriod = (label: PricingLabel) => {
    setCourtForm((prev) => {
      const last = prev.pricingPeriods[prev.pricingPeriods.length - 1];
      const defaultStart = last ? last.endHour : 0;
      let defaultEnd = defaultStart + 4;
      if (defaultEnd <= defaultStart) {
        defaultEnd = defaultStart + 1;
      }
      if (defaultEnd > 24) {
        defaultEnd = 24;
      }

      return {
        ...prev,
        timeBasedPricingEnabled: true,
        pricingPeriods: [
          ...prev.pricingPeriods,
          {
            label,
            startHour: defaultStart,
            endHour: defaultEnd,
            pricePerHour: prev.pricePerHour || 0,
            allDay: false,
          },
        ],
      };
    });
  };

  const updatePricingPeriod = (
    index: number,
    updates: Partial<CourtPricingPeriod>,
  ) => {
    setCourtForm((prev) => {
      const updated = [...prev.pricingPeriods];
      updated[index] = { ...updated[index], ...updates };
      return { ...prev, pricingPeriods: updated };
    });
  };

  const removePricingPeriod = (index: number) => {
    setCourtForm((prev) => {
      const updated = [...prev.pricingPeriods];
      updated.splice(index, 1);
      return {
        ...prev,
        pricingPeriods: updated,
        timeBasedPricingEnabled:
          updated.length > 0 ? prev.timeBasedPricingEnabled : false,
      };
    });
  };

  const formatHourLabel = (hour: number) => {
    const totalMinutes = Math.round(hour * 60);
    const h = Math.floor(totalMinutes / 60) % 24;
    const m = totalMinutes % 60;
    const suffix = h >= 12 ? "PM" : "AM";
    const displayHour = h % 12 === 0 ? 12 : h % 12;
    const minuteStr = m.toString().padStart(2, "0");
    return `${displayHour}:${minuteStr} ${suffix}`;
  };

  const timeOptions: { value: number; label: string }[] = [];
  for (let h = 0; h < 24; h++) {
    timeOptions.push({ value: h, label: formatHourLabel(h) });
    timeOptions.push({
      value: h + 0.5,
      label: formatHourLabel(h + 0.5),
    });
  }
  timeOptions.push({ value: 24, label: formatHourLabel(24) });

  const handleDeleteCourt = (court: Court) => {
    setDeletingCourt(court);
    setShowDeleteModal(true);
  };

  const confirmDeleteCourt = async () => {
    if (!deletingCourt) return;

    setIsDeleting(true);
    try {
      const result = await deleteCourt(deletingCourt._id);
      if (result.success) {
        setShowDeleteModal(false);
        setDeletingCourt(null);
        loadData();
      } else {
        message.error(result.error || "Failed to delete court");
      }
    } catch (error) {
      message.error(
        error instanceof Error ? error.message : "An error occurred",
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const handleTableChange: TableProps<Court>["onChange"] = (
    _pagination,
    _filters,
    sorter,
  ) => {
    const activeSorter = Array.isArray(sorter) ? sorter[0] : sorter;
    if (activeSorter?.columnKey && activeSorter.order) {
      setSortColumn(activeSorter.columnKey as keyof Court);
      setSortDirection(activeSorter.order === "descend" ? "desc" : "asc");
    } else {
      setSortColumn(null);
      setSortDirection("asc");
    }
  };

  const sortedCourts = [...courts].sort((a, b) => {
    if (!sortColumn) return 0;

    let aValue: string | number | boolean = a[sortColumn] as
      | string
      | number
      | boolean;
    let bValue: string | number | boolean = b[sortColumn] as
      | string
      | number
      | boolean;

    if (typeof aValue === "string" && typeof bValue === "string") {
      aValue = aValue.toLowerCase();
      bValue = bValue.toLowerCase();
    }

    if (typeof aValue === "number" && typeof bValue === "number") {
      return sortDirection === "asc" ? aValue - bValue : bValue - aValue;
    }

    if (typeof aValue === "boolean" && typeof bValue === "boolean") {
      return sortDirection === "asc"
        ? aValue === bValue
          ? 0
          : aValue
            ? 1
            : -1
        : aValue === bValue
          ? 0
          : aValue
            ? -1
            : 1;
    }

    if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
    if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
    return 0;
  });

  const sortOrderFor = (column: keyof Court) =>
    sortColumn === column
      ? sortDirection === "asc"
        ? "ascend"
        : "descend"
      : null;

  const columns: ColumnsType<Court> = [
    {
      title: "Court Name",
      dataIndex: "name",
      key: "name",
      sorter: (a, b) => a.name.localeCompare(b.name),
      sortOrder: sortOrderFor("name"),
      render: (name: string) => (
        <span className="font-medium text-white">{name}</span>
      ),
    },
    {
      title: "Type",
      dataIndex: "type",
      key: "type",
      sorter: (a, b) => a.type.localeCompare(b.type),
      sortOrder: sortOrderFor("type"),
      render: (type: string) => <Tag>{type}</Tag>,
    },
    {
      title: "Description",
      dataIndex: "description",
      key: "description",
      ellipsis: true,
      render: (description: string) => (
        <Text className="text-zinc-300">{description}</Text>
      ),
    },
    {
      title: "Price/Hour",
      dataIndex: "pricePerHour",
      key: "pricePerHour",
      sorter: (a, b) => a.pricePerHour - b.pricePerHour,
      sortOrder: sortOrderFor("pricePerHour"),
      render: (price: number) => (
        <Space size="small">
          <span className="font-semibold text-[#2DD4BF]">
            PKR {price.toLocaleString()}
          </span>
          {price === 0 && <Tag>Free</Tag>}
        </Space>
      ),
    },
    {
      title: "Status",
      dataIndex: "isActive",
      key: "isActive",
      sorter: (a, b) => Number(a.isActive) - Number(b.isActive),
      sortOrder: sortOrderFor("isActive"),
      render: (isActive: boolean) => (
        <Tag color={isActive ? "cyan" : "error"}>
          {isActive ? "Active" : "Inactive"}
        </Tag>
      ),
    },
    {
      title: "Actions",
      key: "actions",
      align: "right",
      render: (_: unknown, court: Court) => (
        <Space size="small">
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => handleEditCourt(court)}
            title="Edit"
          />
          <Button
            type="text"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDeleteCourt(court)}
            title="Delete"
          />
        </Space>
      ),
    },
  ];

  if (!isSuperAdmin) {
    return null;
  }

  return (
    <AdminLayout
      title="Court Management"
      description="Manage court settings"
      onRefresh={loadData}
      isLoading={isLoading}
      actionButton={
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => {
            resetCourtForm();
            setShowCourtModal(true);
          }}
        >
          <span className="hidden sm:inline">Add Court</span>
        </Button>
      }
    >
      <div className="space-y-4">
        <Card className="border-zinc-800" styles={{ body: { padding: 0 } }}>
          {isLoading && courts.length === 0 ? (
            <div className="p-4">
              <Skeleton active paragraph={{ rows: 8 }} />
            </div>
          ) : (
            <Table<Court>
              rowKey="_id"
              columns={columns}
              dataSource={sortedCourts}
              loading={isLoading}
              onChange={handleTableChange}
              pagination={false}
              scroll={{ x: "max-content" }}
              locale={{
                emptyText: "No courts found. Create your first court to get started.",
              }}
            />
          )}
        </Card>
      </div>

      <Modal
        title={editingCourt ? "Edit Court" : "Add New Court"}
        open={showCourtModal}
        onCancel={() => {
          setShowCourtModal(false);
          resetCourtForm();
        }}
        footer={null}
        width={672}
        destroyOnHidden
      >
        <Text type="secondary" className="mb-4 block">
          {editingCourt
            ? "Update court details and pricing"
            : "Create a new court with details and pricing"}
        </Text>

        <Form layout="vertical" onFinish={handleCourtSubmit}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Form.Item label="Court Name" required>
              <Input
                value={courtForm.name}
                onChange={(e) =>
                  setCourtForm({ ...courtForm, name: e.target.value })
                }
                placeholder="Court Alpha"
              />
            </Form.Item>
            <Form.Item label="Court Type" required>
              <Select
                value={courtForm.type}
                onChange={(v) =>
                  setCourtForm({
                    ...courtForm,
                    type: v as Court["type"],
                  })
                }
                options={[
                  { value: "PADEL", label: "Padel" },
                  { value: "CRICKET", label: "Cricket" },
                  { value: "PICKLEBALL", label: "Pickleball" },
                  { value: "FUTSAL", label: "Futsal" },
                ]}
              />
            </Form.Item>
          </div>

          <Form.Item label="Description" required>
            <TextArea
              value={courtForm.description}
              onChange={(e) =>
                setCourtForm({ ...courtForm, description: e.target.value })
              }
              rows={3}
              placeholder="Professional court with premium features..."
            />
          </Form.Item>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Form.Item
              label="Base Price Per Hour (PKR)"
              required
              extra={
                <Text type="secondary" className="text-[11px]">
                  Used when peak/off-peak pricing is disabled. When peak/off-peak
                  is enabled, prices from the periods below are used instead.
                </Text>
              }
            >
              <InputNumber
                className="w-full"
                min={0}
                step={0.01}
                value={courtForm.pricePerHour}
                onChange={(v) =>
                  setCourtForm({
                    ...courtForm,
                    pricePerHour: typeof v === "number" ? v : 0,
                  })
                }
                placeholder="5000"
                disabled={courtForm.timeBasedPricingEnabled}
              />
            </Form.Item>
            <Form.Item label="Settings">
              <Space direction="vertical">
                <Checkbox
                  checked={courtForm.isActive}
                  onChange={(e) =>
                    setCourtForm({ ...courtForm, isActive: e.target.checked })
                  }
                >
                  Active
                </Checkbox>
                <Checkbox
                  checked={courtForm.timeBasedPricingEnabled}
                  onChange={(e) =>
                    setCourtForm({
                      ...courtForm,
                      timeBasedPricingEnabled: e.target.checked,
                    })
                  }
                >
                  Enable peak/off-peak pricing
                </Checkbox>
              </Space>
            </Form.Item>
          </div>

          {courtForm.timeBasedPricingEnabled && (
            <div className="mt-2 space-y-3 rounded-lg border border-zinc-800 p-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-zinc-100">
                    Peak & Off-peak Hours
                  </p>
                  <Text type="secondary" className="text-xs">
                    Set peak and off-peak rates for the full 24-hour day. Periods
                    must cover every half-hour from 12:00 AM to 12:00 AM with no
                    gaps.
                  </Text>
                </div>
                <Space>
                  <Button size="small" onClick={() => addPricingPeriod("off_peak")}>
                    Add Off-peak
                  </Button>
                  <Button size="small" onClick={() => addPricingPeriod("peak")}>
                    Add Peak
                  </Button>
                </Space>
              </div>

              {courtForm.pricingPeriods.length === 0 ? (
                <Text type="secondary" className="text-xs">
                  No dynamic pricing periods yet. Use the buttons above to add
                  off-peak or peak ranges.
                </Text>
              ) : (
                <div className="space-y-2">
                  {courtForm.pricingPeriods.map((period, index) => {
                    const previous = courtForm.pricingPeriods[index - 1];
                    const minStart = previous ? previous.endHour : 0;
                    const startOptions = timeOptions.filter(
                      (opt) => opt.value >= minStart && opt.value <= 24,
                    );
                    const endOptions = timeOptions.filter(
                      (opt) => opt.value !== period.startHour,
                    );

                    return (
                      <div
                        key={index}
                        className="space-y-3 rounded-md border border-zinc-800 bg-zinc-900/40 p-3"
                      >
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                          <Form.Item label="Type" className="mb-0">
                            <Select
                              size="small"
                              value={period.label}
                              onChange={(v) =>
                                updatePricingPeriod(index, {
                                  label: v as "off_peak" | "peak",
                                })
                              }
                              options={[
                                { value: "off_peak", label: "Off-peak" },
                                { value: "peak", label: "Peak" },
                              ]}
                            />
                          </Form.Item>

                          <Form.Item label="Price / Hour (PKR)" className="mb-0">
                            <InputNumber
                              className="w-full"
                              size="small"
                              min={0}
                              step={0.01}
                              value={period.pricePerHour}
                              onChange={(v) =>
                                updatePricingPeriod(index, {
                                  pricePerHour: typeof v === "number" ? v : 0,
                                })
                              }
                            />
                          </Form.Item>

                          <Form.Item label="Start Time" className="mb-0">
                            <Select
                              size="small"
                              value={period.startHour}
                              onChange={(v) =>
                                updatePricingPeriod(index, { startHour: v })
                              }
                              options={startOptions}
                              showSearch
                              optionFilterProp="label"
                              listHeight={192}
                            />
                          </Form.Item>

                          <Form.Item label="End Time" className="mb-0">
                            <Select
                              size="small"
                              value={period.endHour}
                              onChange={(v) =>
                                updatePricingPeriod(index, { endHour: v })
                              }
                              options={endOptions}
                              showSearch
                              optionFilterProp="label"
                              listHeight={384}
                            />
                          </Form.Item>
                        </div>

                        <div className="flex sm:justify-end">
                          <Button
                            type="text"
                            danger
                            icon={<DeleteOutlined />}
                            onClick={() => removePricingPeriod(index)}
                            title="Remove period"
                          />
                        </div>
                      </div>
                    );
                  })}
                  <Text type="secondary" className="text-[11px]">
                    Periods must tile the full day (12:00 AM → 12:00 AM). Ranges
                    can wrap past midnight (e.g. 10:00 PM – 2:00 AM for evening
                    peak). Example: Off-peak 12:00 AM–5:00 PM, Peak 5:00 PM–12:00 AM.
                  </Text>
                </div>
              )}
            </div>
          )}

          <Form.Item className="mb-0 mt-6">
            <Space className="flex justify-end">
              <Button
                onClick={() => {
                  setShowCourtModal(false);
                  resetCourtForm();
                }}
              >
                Cancel
              </Button>
              <Button type="primary" htmlType="submit" loading={isSubmittingCourt}>
                {editingCourt ? "Update Court" : "Create Court"}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Delete Court"
        open={showDeleteModal}
        onCancel={() => {
          setShowDeleteModal(false);
          setDeletingCourt(null);
        }}
        onOk={confirmDeleteCourt}
        okText="Yes, Delete Court"
        okButtonProps={{ danger: true, loading: isDeleting }}
        cancelButtonProps={{ disabled: isDeleting }}
      >
        <Text type="secondary" className="mb-4 block">
          Are you sure you want to delete this court? This action cannot be
          undone.
        </Text>
        {deletingCourt && (
          <div className="space-y-4">
            <div className="space-y-2 rounded-lg bg-zinc-900/50 p-4">
              <div className="flex items-center justify-between">
                <Text type="secondary">Court Name:</Text>
                <Text className="font-medium text-white">
                  {deletingCourt.name}
                </Text>
              </div>
              <div className="flex items-center justify-between">
                <Text type="secondary">Type:</Text>
                <Text>{deletingCourt.type}</Text>
              </div>
              <div className="flex items-center justify-between">
                <Text type="secondary">Price/Hour:</Text>
                <Text>
                  PKR {deletingCourt.pricePerHour.toLocaleString()}
                </Text>
              </div>
              <div className="flex items-center justify-between">
                <Text type="secondary">Status:</Text>
                <Tag color={deletingCourt.isActive ? "cyan" : "error"}>
                  {deletingCourt.isActive ? "Active" : "Inactive"}
                </Tag>
              </div>
            </div>
            <Text className="text-zinc-300">
              This action will permanently delete the court from the system. All
              associated data will be lost and this cannot be undone.
            </Text>
          </div>
        )}
      </Modal>
    </AdminLayout>
  );
}
