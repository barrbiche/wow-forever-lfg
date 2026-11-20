// Teste supabase/ameliorations26.sql et 27 (fiche du personnage) sur un vrai Postgres en mémoire (PGlite), sans toucher à
// la vraie base. Il simule auth.uid() et les rôles anon / authenticated.
//   npm install --no-save @electric-sql/pglite   (une fois, il n'est pas dans package.json)
//   node supabase/tests/test_fiche.mjs
import { PGlite } from '@electric-sql/pglite'
import { readFileSync } from 'node:fs'

const db = new PGlite()
let total = 0, echecs = 0
const verifier = (ok, msg) => { total++; if (!ok) { echecs++; console.log('ÉCHEC:', msg) } }
const A = '11111111-1111-1111-1111-111111111111', B = '22222222-2222-2222-2222-222222222222'

await db.exec(`
  create role anon nologin; create role authenticated nologin;
  create schema auth;
  create table auth.users (id uuid primary key);
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('app.uid', true), '')::uuid $$;
  create schema if not exists public;
  grant usage on schema public, auth to anon, authenticated;
  grant execute on function auth.uid() to anon, authenticated;
  create table public.profils (user_id uuid primary key references auth.users (id) on delete cascade,
    perso text not null, visible boolean not null default true);
  insert into auth.users values ('${A}'), ('${B}');
  insert into public.profils values ('${A}', 'Alice', true), ('${B}', 'Bob', false);
`)
const sql = readFileSync(process.env.SQLFILE ?? new URL('../ameliorations26.sql', import.meta.url), 'utf8')
await db.exec(sql)
await db.exec(sql) // relancé sans problème
const sql27 = readFileSync(new URL('../ameliorations27.sql', import.meta.url), 'utf8')
await db.exec(sql27)
await db.exec(sql27)
verifier(true, 'script lancé deux fois')

const moi = async (uid, role = 'authenticated') => {
  await db.exec(`reset role; select set_config('app.uid', '${uid}', false); set role ${role};`)
}
const essai = async (q, params) => {
  try { return { ok: true, rows: (await db.query(q, params)).rows } } catch (e) { return { ok: false, erreur: e.message } }
}
const GEAR = [
  { slot: 1, id: 12345, ilvl: 62, qualite: 4, enchant: 0, nom: 'Casque du Crépuscule', extra: 'à jeter' },
  { slot: 5, id: 22222, ilvl: 58, qualite: 3, enchant: 1234, nom: '  Plastron <b>spécial</b>  ' },
]
const ARBRES = [{ nom: 'Armes', points: 31 }, { nom: 'Fureur', points: 20 }, { nom: 'Protection', points: 0 }]
const TAL = [{ nom: 'Précision', rang: 3, arbre: 1 }]
const enreg = (eq, ar, ta) => essai('select public.enregistrer_fiche($1::jsonb,$2::jsonb,$3::jsonb)', [JSON.stringify(eq), JSON.stringify(ar), JSON.stringify(ta)])

// --- icônes (ameliorations27)
await moi(A)
{
  const eqI = [{ ...GEAR[0], icone: 'inv_helmet_01' }, { ...GEAR[1], icone: '' }]
  const arI = [{ nom: 'Armes', points: 31, icone: 'ability_warrior_savageblow' }, { nom: 'Fureur', points: 20 }]
  const taI = [{ nom: 'Précision', rang: 3, arbre: 1, icone: 'ability_marksmanship' }, { nom: 'Autre', rang: 1, arbre: 2 }]
  let x = await enreg(eqI, arI, taI)
  verifier(x.ok, 'enregistrement avec icônes: ' + x.erreur)
  x = await essai('select public.fiche_de($1) as f', [A])
  const g = x.rows?.[0]?.f
  verifier(g?.equipement?.[0]?.icone === 'inv_helmet_01' && !('icone' in g.equipement[1]), 'icône d\'équipement gardée (vide = pas de clé)')
  verifier(g?.arbres?.[0]?.icone === 'ability_warrior_savageblow' && !('icone' in g.arbres[1]), 'icône d\'arbre gardée')
  verifier(g?.talents?.[0]?.icone === 'ability_marksmanship' && !('icone' in g.talents[1]), 'icône de talent gardée')
  for (const mauvaise of ['../evil', 'Majuscule', 'a b', 'x'.repeat(65), 'a/b', '<img>', "a'b"]) {
    const y = await enreg([{ ...GEAR[0], icone: mauvaise }], ARBRES, TAL)
    verifier(!y.ok, 'icône refusée: ' + mauvaise)
    const z = await enreg([GEAR[0]], [{ nom: 'A', points: 1, icone: mauvaise }], TAL)
    verifier(!z.ok, 'icône d\'arbre refusée: ' + mauvaise)
    const w = await enreg([GEAR[0]], ARBRES, [{ nom: 'T', rang: 1, arbre: 1, icone: mauvaise }])
    verifier(!w.ok, 'icône de talent refusée: ' + mauvaise)
  }
}

// --- enregistrement valide
await moi(A)
let r = await enreg(GEAR, ARBRES, TAL)
verifier(r.ok, 'enregistrement valide: ' + r.erreur)
r = await essai('select public.fiche_de($1) as f', [A])
const f = r.rows?.[0]?.f
verifier(f && f.perso === 'Alice' && f.equipement.length === 2, 'je relis ma fiche')
verifier(f && !('extra' in f.equipement[0]), 'clés inconnues jetées')
verifier(f && f.equipement[1].nom === 'Plastron bspécial/b', 'balises < > retirées et espaces nettoyés: ' + f?.equipement?.[1]?.nom)
verifier(f && f.arbres[1].points === 20 && f.talents[0].rang === 3, 'arbres et talents gardés')

// --- remplace l'ancienne
r = await enreg([GEAR[0]], ARBRES, [])
r = await essai('select jsonb_array_length((public.fiche_de($1))->\'equipement\') as n', [A])
verifier(r.rows?.[0]?.n === 1, 'une nouvelle fiche remplace l\'ancienne')

// --- invalide
const mauvais = [
  ['slot 20', [{ ...GEAR[0], slot: 20 }], ARBRES, TAL],
  ['slot 0', [{ ...GEAR[0], slot: 0 }], ARBRES, TAL],
  ['même emplacement deux fois', [GEAR[0], { ...GEAR[1], slot: 1 }], ARBRES, TAL],
  ['niveau d\'objet 5000', [{ ...GEAR[0], ilvl: 5000 }], ARBRES, TAL],
  ['qualité 9', [{ ...GEAR[0], qualite: 9 }], ARBRES, TAL],
  ['id avec des lettres', [{ ...GEAR[0], id: 'abc' }], ARBRES, TAL],
  ['id négatif', [{ ...GEAR[0], id: -5 }], ARBRES, TAL],
  ['nom vide', [{ ...GEAR[0], nom: '' }], ARBRES, TAL],
  ['nom seulement des balises', [{ ...GEAR[0], nom: '<>' }], ARBRES, TAL],
  ['nom trop long', [{ ...GEAR[0], nom: 'x'.repeat(61) }], ARBRES, TAL],
  ['18 pièces', Array.from({ length: 18 }, (_, i) => ({ ...GEAR[0], slot: (i % 19) + 1 })), ARBRES, TAL],
  ['équipement pas une liste', { a: 1 }, ARBRES, TAL],
  ['élément pas un objet', [5], ARBRES, TAL],
  ['4 arbres', [GEAR[0]], [...ARBRES, { nom: 'X', points: 1 }], TAL],
  ['arbre à 61 points', [GEAR[0]], [{ nom: 'A', points: 61 }], TAL],
  ['talent rang 6', [GEAR[0]], ARBRES, [{ nom: 'T', rang: 6, arbre: 1 }]],
  ['talent rang 0', [GEAR[0]], ARBRES, [{ nom: 'T', rang: 0, arbre: 1 }]],
  ['talent arbre 4', [GEAR[0]], ARBRES, [{ nom: 'T', rang: 1, arbre: 4 }]],
  ['71 talents', [GEAR[0]], ARBRES, Array.from({ length: 71 }, () => ({ nom: 'T', rang: 1, arbre: 1 }))],
  ['fiche vide', [], [], []],
]
for (const [nom, eq, ar, ta] of mauvais) {
  const x = await enreg(eq, ar, ta)
  verifier(!x.ok, `refusé: ${nom}`)
}
r = await essai('select jsonb_array_length((public.fiche_de($1))->\'equipement\') as n', [A])
verifier(r.rows?.[0]?.n === 1, 'les refus ne changent pas la fiche gardée')
r = await essai('select public.enregistrer_fiche(null, $1::jsonb, null)', [JSON.stringify(ARBRES)])
verifier(r.ok, 'seulement des arbres (équipement absent): ' + r.erreur)

// --- qui voit quoi
await moi(B)
r = await enreg(GEAR, ARBRES, TAL)
verifier(r.ok, 'Bob enregistre sa fiche (profil caché)')
r = await essai('select public.fiche_de($1) as f', [B])
verifier(r.rows?.[0]?.f?.perso === 'Bob', 'Bob voit sa propre fiche même profil caché')
r = await essai('select public.fiche_de($1) as f', [A])
verifier(r.rows?.[0]?.f?.perso === 'Alice', 'Bob voit la fiche d\'Alice (profil visible)')
await moi(A)
r = await essai('select public.fiche_de($1) as f', [B])
verifier(r.ok && r.rows[0].f === null, 'Alice ne voit pas la fiche de Bob (profil caché)')
r = await essai('select public.fiche_de($1) as f', ['33333333-3333-3333-3333-333333333333'])
verifier(r.ok && r.rows[0].f === null, 'joueur sans fiche: rien')

await moi('', 'authenticated')
r = await essai('select public.fiche_de($1) as f', [A])
verifier(r.ok && r.rows[0].f === null, 'connecté sans identité: rien')
r = await enreg(GEAR, ARBRES, TAL)
verifier(!r.ok, 'enregistrer sans identité refusé')
await moi(A, 'anon')
r = await essai('select public.fiche_de($1) as f', [A])
verifier(!r.ok, 'un visiteur (anon) ne peut pas appeler fiche_de: ' + (r.erreur ?? 'a pu'))
r = await essai('select public.enregistrer_fiche(\'[]\', \'[]\', \'[]\')')
verifier(!r.ok, 'un visiteur ne peut pas enregistrer')
await moi(A)
r = await essai('select * from public.fiches_perso')
verifier(!r.ok, 'lecture directe de la table refusée')
r = await essai('insert into public.fiches_perso (user_id, perso) values ($1, \'x\')', [A])
verifier(!r.ok, 'écriture directe dans la table refusée')

// --- effacer, et effacement avec le profil
r = await essai('select public.effacer_fiche()')
verifier(r.ok, 'effacer ma fiche')
r = await essai('select public.fiche_de($1) as f', [A])
verifier(r.ok && r.rows[0].f === null, 'ma fiche est partie')
await db.exec(`reset role;`)
await db.exec(`delete from public.profils where user_id = '${B}'`)
r = await essai('select count(*)::int as n from public.fiches_perso')
verifier(r.rows?.[0]?.n === 0, 'la fiche part avec le profil (cascade)')

console.log(`${total - echecs}/${total} vérifications réussies`)
process.exit(echecs ? 1 : 0)
