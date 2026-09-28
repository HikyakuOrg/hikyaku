"use client"

import { QRCodeCanvas } from "qrcode.react";

interface QrCodeWithLogoProps {
    value: string;
    /** Org's uploaded logo URL (getOrganisationBranding). Omit/null renders a plain QR code. */
    logoUrl?: string | null;
    size?: number;
}

/**
 * QR code with the organisation logo in the centre. With a logo, error
 * correction is H (about 30%), so the code still scans.
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
