"use client";
import { QRCodeCanvas } from "qrcode.react";

export function MobileSettingsQr({ value }: { value: string }) {

    return (
        <div data-testid="mobile-qr-wrapper" className="flex flex-col items-center gap-4">
            <QRCodeCanvas value={value} size={256} />
        </div>
    );
}
