"use client";

import { Button, Card, Space, Table, Tag, Typography } from "antd";
import type { ColumnsType, TableProps } from "antd/es/table";
import { EditOutlined, DeleteOutlined } from "@ant-design/icons";
import type { Court } from "@/types";

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
