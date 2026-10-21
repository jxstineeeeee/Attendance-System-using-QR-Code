/**
 * A short tone per scan, so the person at the gate knows the result without
 * looking at the screen: a rising pair for accepted, a low buzz for refused.
 *
 * The AudioContext is created on first use — browsers refuse to start one
 * before a gesture, and the first scan always follows a tap or a sign-in.
 */

let ctx: AudioContext | null = null

function audio(): AudioContext | null {
  try {
    ctx ??= new AudioContext()
    void ctx.resume()
    return ctx
  } catch {
    // No audio on this device: the screen still says everything.
    return null
  }
}

function tone(freq: number, startAt: number, length: number, volume = 0.12) {
  const context = audio()
  if (!context) return

  const osc = context.createOscillator()
  const gain = context.createGain()
  osc.type = 'square'
  osc.frequency.value = freq

  const start = context.currentTime + startAt
  gain.gain.setValueAtTime(volume, start)
  gain.gain.exponentialRampToValueAtTime(0.0001, start + length)

  osc.connect(gain).connect(context.destination)
  osc.start(start)
  osc.stop(start + length)
}

export function beepAccepted() {
  tone(880, 0, 0.09)
  tone(1320, 0.1, 0.12)
}

export function beepLate() {
  tone(660, 0, 0.1)
  tone(560, 0.12, 0.16)
}

export function beepRejected() {
  tone(200, 0, 0.32, 0.16)
}
