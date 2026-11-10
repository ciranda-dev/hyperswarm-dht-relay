import test from 'brittle'
import BlindPairing from 'blind-pairing'
import { randomBytes } from 'crypto'
import HyperDHT from 'hyperdht'
import Hyperswarm from 'hyperswarm'

import { withDHT } from './helpers/with-dht.mjs'
import { withRelay } from './helpers/ws/with-relay.mjs'
import { withSwarm } from './helpers/with-swarm.mjs'

test('blind pairing, relayed candidate', (t) =>
  withDHT((a) => withRelay(a, (withDHT) => withDHT({ custodial: false }, (b) => withSwarm(b, async (swarm) => {
    const pairing = t.test('paired')
    pairing.plan(2)

    const key = randomBytes(32)
    const { invite, publicKey, discoveryKey } = BlindPairing.createInvite(key)

    const bootstrap = [{ host: '127.0.0.1', port: a.address().port }]
    const memberSwarm = new Hyperswarm({
      dht: new HyperDHT({ bootstrap, host: '127.0.0.1', ephemeral: false, firewalled: false })
    })
    const memberPairing = new BlindPairing(memberSwarm)
    const member = memberPairing.addMember({
      discoveryKey,
      onadd (request) {
        request.open(publicKey)
        request.confirm({ key })
      }
    })
    await member.flushed()

    const candidatePairing = new BlindPairing(swarm)
    const candidate = candidatePairing.addCandidate({
      invite,
      userData: randomBytes(32),
      onadd (result) {
        pairing.alike(result.key, key, 'the member’s key')
      }
    })

    pairing.ok(await candidate.pairing, 'through the relay')

    await pairing
    await candidatePairing.close()
    await memberPairing.close()
    await memberSwarm.destroy()
  }))))
)
