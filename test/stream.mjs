import test from 'brittle'
import { Duplex } from 'streamx'

import DHT from '../index.js'

test('stream that fails to open', async (t) => {
  const stream = new Duplex({
    open (cb) {
      cb(new Error('Could not open'))
    }
  })

  stream.on('error', () => {})

  const dht = new DHT(stream)

  await new Promise((resolve) => stream.once('close', resolve))
  await new Promise((resolve) => setImmediate(resolve))

  t.ok(dht.destroyed, 'destroyed without an unhandled rejection')
})
