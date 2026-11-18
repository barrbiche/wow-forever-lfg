// Lit des codes (un par ligne, JSON) sur l'entrée standard et écrit le résultat de lireCodeJeu pour chacun.
import { lireCodeJeu } from '../../src/codeJeu.js'

let entree = ''
for await (const morceau of process.stdin) entree += morceau
const codes = JSON.parse(entree)
process.stdout.write(JSON.stringify(codes.map((c) => lireCodeJeu(c))))
