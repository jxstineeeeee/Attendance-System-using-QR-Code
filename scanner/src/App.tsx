import { useCallback, useEffect, useState } from 'react'
import { currentOperator, signOut, type Device, type Operator } from './lib/gate'
import { SignIn } from './screens/SignIn'
import { PickDevice } from './screens/PickDevice'
import { Gate } from './screens/Gate'

/**
 * Three states, in order: who is holding the scanner, which gate it is, then
 * scanning. No router — a gate app has one screen and two pieces of setup.
 */
const DEVICE_KEY = 'qr-scanner.device'

function rememberedDevice(): string | null {
  try {
    return localStorage.getItem(DEVICE_KEY)
  } catch {
    return null
  }
}

export function App() {
  const [operator, setOperator] = useState<Operator | null>(null)
  const [otherRole, setOtherRole] = useState<string | null>(null)
  const [device, setDevice] = useState<Device | null>(null)
  const [deviceCode, setDeviceCode] = useState<string | null>(rememberedDevice)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    currentOperator()
      .then((res) => {
        if (cancelled) return
        setOperator(res.operator)
        setOtherRole(res.otherRole)
      })
      .catch(() => {
        // Signed out, or the API is unreachable; the sign-in screen reports it.
        if (!cancelled) setOperator(null)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  const pickDevice = useCallback((picked: Device) => {
    setDevice(picked)
    setDeviceCode(picked.code)
    try {
      localStorage.setItem(DEVICE_KEY, picked.code)
    } catch {
      // Not remembering it only costs one tap next time.
    }
  }, [])

  const handleSignOut = useCallback(async () => {
    try {
      await signOut()
    } finally {
      setOperator(null)
      setDevice(null)
    }
  }, [])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ink">
        <p className="text-[17px] text-white/70">Starting the scanner…</p>
      </div>
    )
  }

  if (!operator) {
    return (
      <SignIn
        otherRole={otherRole}
        onSignedIn={(op) => {
          setOperator(op)
          setOtherRole(null)
        }}
      />
    )
  }

  if (!device) {
    return (
      <PickDevice
        current={deviceCode}
        onPick={pickDevice}
        onSignOut={() => void handleSignOut()}
      />
    )
  }

  return (
    <Gate
      operator={operator}
      device={device}
      onChangeDevice={() => setDevice(null)}
      onSignOut={() => void handleSignOut()}
    />
  )
}
