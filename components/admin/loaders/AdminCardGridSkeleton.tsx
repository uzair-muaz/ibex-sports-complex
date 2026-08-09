"use client";

import { Card, Col, Row, Skeleton } from "antd";

type AdminCardGridSkeletonProps = {
  count?: number;
  columns?: 2 | 3 | 4;
};

export function AdminCardGridSkeleton({
  count = 4,
  columns = 4,
}: AdminCardGridSkeletonProps) {
  const span =
    columns === 2 ? 12 : columns === 3 ? 8 : 6;

  return (
    <Row gutter={[16, 16]}>
      {Array.from({ length: count }).map((_, index) => (
        <Col key={`card-skel-${index}`} xs={24} sm={12} xl={span}>
          <Card bordered={false}>
            <Skeleton active paragraph={{ rows: 2 }} />
          </Card>
        </Col>
      ))}
    </Row>
  );
}
