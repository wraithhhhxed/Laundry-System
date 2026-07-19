// backend/scripts/migrate/lib/readBson.js
//
// Nagbabasa ng .bson file (mongodump output) at ibinabalik bilang array
// ng plain JS objects. Bawat BSON document ay may 4-byte "size" prefix sa
// unahan — ginagamit natin 'to para malaman kung saan magtatapos ang bawat
// record habang tumatakbo pababa sa buong file.

import fs from 'fs'
import { BSON } from 'bson'

export function readBsonDocs(filePath) {
  const buffer = fs.readFileSync(filePath)
  const docs = []
  let offset = 0

  while (offset < buffer.length) {
    const size = buffer.readInt32LE(offset)
    const docBuffer = buffer.subarray(offset, offset + size)
    docs.push(BSON.deserialize(docBuffer))
    offset += size
  }

  return docs
}