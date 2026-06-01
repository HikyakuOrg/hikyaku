"use client"

import { useEffect, useRef } from "react";
import { QRCodeCanvas } from 'qrcode.react';
import JsBarcode from "jsbarcode";
interface PackageLabelProps {
    packageId: string;
    trackingNumber: string;
    receiver: Customer | null;
    canvasRef: React.RefObject<HTMLCanvasElement | null>;
}

export function PackageLabel({ packageId, trackingNumber, receiver, canvasRef }: PackageLabelProps) {
    const qrRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || !receiver) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        canvas.width = 600;
        canvas.height = 720;

        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = 'black';
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 4;

        ctx.strokeRect(20, 20, canvas.width - 40, canvas.height - 40);

        ctx.font = 'bold 36px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('SHIPPING LABEL', canvas.width / 2, 80);
        ctx.lineWidth = 2;

        ctx.textAlign = 'left';
        ctx.font = 'bold 18px sans-serif';
        ctx.beginPath(); ctx.moveTo(20, 120); ctx.lineTo(canvas.width - 20, 120);
        ctx.stroke();

        ctx.font = 'bold 24px sans-serif';
        ctx.fillText('SHIP TO:', 40, 170);

        ctx.font = 'bold 36px sans-serif';
        ctx.fillText(receiver.customer_name.toUpperCase(), 40, 225);

        ctx.font = '24px sans-serif';
        ctx.fillText(receiver.customer_phone, 40, 270);
        ctx.fillText(receiver.customer_address, 40, 310);
        ctx.fillText(`${receiver.customer_suburb.toUpperCase()} ${receiver.customer_postcode}`, 40, 350);
        ctx.fillText(receiver.customer_state?.toUpperCase() || '', 40, 390);

        ctx.beginPath(); ctx.moveTo(20, 430); ctx.lineTo(canvas.width - 20, 430); ctx.stroke();

        const qrCanvasElement = qrRef.current?.querySelector('canvas');
        if (qrCanvasElement) {
            ctx.drawImage(qrCanvasElement, 40, 520, 160, 160);
        }

        const barcodeCanvas = document.createElement('canvas');
        try {
            JsBarcode(barcodeCanvas, trackingNumber, {
                format: "CODE128",
                width: 2,
                height: 100,
                displayValue: true,
                fontSize: 18,
                margin: 0,
                background: "#ffffff"
            });
            ctx.drawImage(barcodeCanvas, 220, 520, 340, 160);
        } catch (e) {
            console.error("Barcode error", e);
        }
    }, [packageId, trackingNumber, receiver, canvasRef]);

    return (
        <div className="flex flex-col items-center gap-4">
            <div className="bg-white p-2 rounded-lg shadow-md border">
                <canvas
                    ref={canvasRef}
                    className="max-w-full h-auto bg-white"
                    style={{ width: '320px', height: '384px' }}
                />
            </div>

            <div ref={qrRef} className="hidden">
                <QRCodeCanvas value={packageId} size={256} />
            </div>

            <p className="text-xs text-muted-foreground italic">
                Preview reflects the actual printed label content
            </p>
        </div>
    );
}

export function downloadLabelAsPNG(canvas: HTMLCanvasElement, filename: string) {
    const link = document.createElement('a');
    link.download = filename;
    link.href = canvas.toDataURL('image/png', 1.0);
    link.click();
}
