"use client"

import { QRCodeCanvas } from "qrcode.react";

interface QrCodeWithLogoProps {
    value: string;
    /** Org's uploaded logo URL (getOrganisationBranding). Omit/null renders a plain QR code. */
    logoUrl?: string | null;
    size?: number;
}

/**
 * QR code that embeds an organisation's logo in the centre, wherever a
 * customer- or driver-facing QR gets rendered. Error correction bumps to
 * "H" only when a logo is present — qrcode.react's `excavate` then clears
 * the modules the logo overlaps, and level H's ~30% redundancy budget is
 * what keeps the code scannable despite the hole.
 */
export function QrCodeWithLogo({ value, logoUrl, size = 256 }: QrCodeWithLogoProps) {
    const logoSize = Math.round(size * 0.22);

    return (
        <QRCodeCanvas
            value={value}
            size={size}
            level={logoUrl ? "H" : "L"}
            imageSettings={
                logoUrl
                    ? {
                        src: logoUrl,
                        height: logoSize,
                        width: logoSize,
                        excavate: true,
                    }
                    : undefined
            }
        />
    );
}
