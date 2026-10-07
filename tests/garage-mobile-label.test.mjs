import test from 'node:test'
import assert from 'node:assert/strict'
import { shortGrandPrixLabel } from '../src/features/garage/presentation.mjs'
test('mobile GP label removes translated prefix and year without changing the source', () => {
  for (const [full, short] of [['GRAN PREMIO DE BAHRÉIN 2026', 'BAHRÉIN'], ['BAHRAIN GRAND PRIX 2026', 'BAHRAIN'], ['GRAN PREMIO DI MONZA 2026', 'MONZA'], ['GRAND PRIX DE BAHREÏN 2026', 'BAHREÏN'], ['GROSSER PREIS VON BAHRAIN 2026', 'BAHRAIN'], ['GRANDE PRÉMIO DO BAHREIN 2026', 'BAHREIN'], ['Australia', 'Australia']]) assert.equal(shortGrandPrixLabel(full), short)
})
