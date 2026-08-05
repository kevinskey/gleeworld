// GENERATED FILE — do not edit by hand.
// Regenerate: node scripts/ingest-liturgy.mjs <dir>
//
// EMPTY ON PURPOSE, and this is the honest state of things.
//
// Nearly every source on the intended list is under copyright:
//
//   - Vatican texts (Sacrosanctum Concilium, Musicam Sacram, Redemptionis
//     Sacramentum, Desiderio Desideravi, the Catechism, the Code of Canon
//     Law) are © Libreria Editrice Vaticana.
//   - The General Instruction of the Roman Missal, the US adaptations, and
//     the Roman Missal's own rubrics are © USCCB / ICEL.
//   - Sing to the Lord and Built of Living Stones are © USCCB.
//
// None of those may be scraped and bundled into this repository. And writing
// the corpus from a model's recollection would be worse than leaving it
// empty: it would manufacture exactly the invented paragraph numbers, canons
// and rubrics the assistant is forbidden to produce, while wrapping them in
// the authority of a citation.
//
// So the pipeline is built and the shelf is bare. Point
// scripts/ingest-liturgy.mjs at documents you hold a licence for — a
// diocesan handbook, a licensed GIRM extract, parish policies you wrote —
// and they appear here with their authority recorded.
//
// Until then search_liturgy returns nothing and the assistant says it could
// not verify a controlling rule, which is the truth.

import type { LiturgyChunk } from './types.ts';

export const LITURGY_CORPUS: LiturgyChunk[] = [];
