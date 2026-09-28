import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { TICKET_QR_PREFIX } from "@shared/constants";

/** Renders the ticket's QR code. It encodes only the opaque ticket code; the server looks everything else up. */
export function TicketQr({ code, size = 240 }: { code: string; size?: number }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    QRCode.toDataURL(`${TICKET_QR_PREFIX}${code}`, { width: size * 2, margin: 1, errorCorrectionLevel: "M", color: { dark: "#1a1612", light: "#ffffff" } })
      .then((url) => active && setSrc(url))
      .catch(() => active && setSrc(null));
    return () => {
      active = false;
    };
  }, [code, size]);

  return (
    <div className="flex items-center justify-center rounded-xl bg-white p-3" style={{ width: size + 24, height: size + 24, maxWidth: "100%" }}>
      {src ? <img src={src} width={size} height={size} alt="Ticket QR code" className="h-auto max-w-full" /> : <div className="h-full w-full animate-pulse rounded bg-muted" />}
    </div>
  );
}
