"use client";

import { priceUnit } from "@/lib/pricing-utils";
import { Button, Card, Space, Table, Tag, Typography } from "antd";
import type { ColumnsType, TableProps } from "antd/es/table";
import { EditOutlined, DeleteOutlined } from "@ant-design/icons";
import type { Court } from "@/types";

/**
 * The prices to show in the list. With peak/off-peak on, bookings use the
 * period prices (not the base price), so show their lowest and highest.
 */
function shownPrices(court: Court): { low: number; high: number; peak: boolean } {
  const periods = court.timeBasedPricingEnabled ? court.pricingPeriods ?? [] : [];
  if (periods.length === 0) return { low: court.pricePerHour, high: court.pricePerHour, peak: false };
  const prices = periods.map((p) => Number(p.pricePerHour)).filter((n) => Number.isFinite(n));
  if (prices.length === 0) return { low: 0, high: 0, peak: true };
  return { low: Math.min(...prices), high: Math.max(...prices), peak: true };
}

const { Text } = Typography;

type CourtsTableProps = {
  courts: Court[];
  sortColumn: keyof Court | null;
  sortDirection: "asc" | "desc";
  onTableChange: TableProps<Court>["onChange"];
  onEdit: (court: Court) => void;
  onDelete: (court: Court) => void;
};

export function CourtsTable({
  courts,
  sortColumn,
  sortDirection,
  onTableChange,
  onEdit,
  onDelete,
}: CourtsTableProps) {
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
        <span className="font-medium text-[var(--ant-color-text)]">{name}</span>
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
        <Text className="text-[var(--ant-color-text-secondary)]">
          {description}
        </Text>
      ),
    },
    {
      title: "Price",
      dataIndex: "pricePerHour",
      key: "pricePerHour",
      sorter: (a, b) => shownPrices(a).low - shownPrices(b).low,
      sortOrder: sortOrderFor("pricePerHour"),
      render: (_: number, court) => {
        const { low, high, peak } = shownPrices(court);
        const weekend = peak
          ? court.pricingPeriods?.some((p) => p.weekendPricePerHour != null)
          : court.weekendPricePerHour != null;
        return (
          <Space size="small" wrap>
            <span className="font-semibold text-[#2DD4BF]">
              PKR {low.toLocaleString()}
              {high > low && ` – ${high.toLocaleString()}`}
              <span className="font-normal text-[var(--ant-color-text-secondary)]">{priceUnit(court).short}</span>
            </span>
            {peak && <Tag color="gold">Peak / off-peak</Tag>}
            {high === 0 && <Tag>Free</Tag>}
            {weekend && <Tag color="purple">Weekend price</Tag>}
          </Space>
        );
      },
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
            onClick={() => onEdit(court)}
            title="Edit"
          />
          <Button
            type="text"
            danger
            icon={<DeleteOutlined />}
            onClick={() => onDelete(court)}
            title="Delete"
          />
        </Space>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <Card
        className="border-[var(--ant-color-border)]"
        styles={{ body: { padding: 0 } }}
      >
        <Table<Court>
          rowKey="_id"
          columns={columns}
          dataSource={courts}
          onChange={onTableChange}
          pagination={false}
          scroll={{ x: "max-content" }}
          locale={{
            emptyText:
              "No courts found. Create your first court to get started.",
          }}
        />
      </Card>
    </div>
  );
}
