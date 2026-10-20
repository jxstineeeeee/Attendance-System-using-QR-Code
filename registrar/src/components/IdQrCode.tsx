import { QRCodeSVG } from 'qrcode.react'

/**
 * The code the gate scanner reads.
 *
 * It encodes the card's `qr_content` — the learner's LRN plus that card's own
 * four-character code, e.g. `136743020001-A7F2`. Keying it to the LRN makes it
 * unique per learner; keying it to the card as well means a reissue produces a
 * different code, which is what lets the scanner reject a lost card while the
 * learner keeps their LRN.
 *
 * Drawn as SVG so it stays sharp at any size, including on a printer.
 */
export function IdQrCode({
  value,
  size = 176,
}: {
  value: string
  size?: number
}) {
  return (
    <QRCodeSVG
      value={value}
      size={size}
      // Level Q tolerates about a quarter of the code being scuffed or
      // smudged, which an ID card carried in a bag will be.
      level="Q"
      marginSize={2}
      bgColor="#ffffff"
      fgColor="#1a1a17"
      title={`QR code for ${value}`}
    />
  )
}
