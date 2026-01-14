"use client";

import { QRCodeSVG } from "qrcode.react";

interface QRCodeProps {
  value: string;
  size?: number;
  className?: string;
}

export function QRCode({ value, size = 200, className }: QRCodeProps) {
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <QRCodeSVG
        value={value}
        size={size}
        level="H"
        includeMargin={true}
        fgColor="#0F172A"
        bgColor="#FFFFFF"
      />
    </div>
  );
}
