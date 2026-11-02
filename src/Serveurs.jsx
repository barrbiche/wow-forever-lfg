import { useContext, useState } from 'react'
import { RULESETS, nomRuleset } from './data.js'
import { lireStatsServeurs } from './store.js'
import { ContextePersos } from './commun.jsx'

// Où jouent les gens du site: un total par région et type de serveur, pour choisir où aller le soir du lancement.
// Que des totaux (voir supabase/ameliorations23.sql). Ne se charge qu'à l'ouverture.
const REGIONS = ['US', 'EU']
const pluriel = (n, un, plusieurs) => `${n} ${n > 1 ? plusieurs : un}`

function regrouper(lignes) {
  const serveurs = []
  for (const region of REGIONS) {
    for (const { id } of RULESETS) {
      const duServeur = lignes.filter((l) => l.region === region && (l.ruleset || 'normal') === id)
      const somme = (champ, faction) =>
        duServeur.filter((l) => !faction || l.faction === faction).reduce((n, l) => n + (l[champ] ?? 0), 0)
      serveurs.push({
        cle: `${region}-${id}`,
        region,
        ruleset: id,
        joueurs: somme('joueurs'),
        alliance: somme('joueurs', 'alliance'),
        horde: somme('joueurs', 'horde'),
        actifs: somme('actifs'),
        groupes: somme('groupes'),
        guildes: somme('guildes'),
      })
    }
  }
  return serveurs.sort((a, b) => b.joueurs + b.groupes - (a.joueurs + a.groupes) || a.cle.localeCompare(b.cle))
}

export default function Serveurs() {
  const [stats, setStats] = useState(undefined) // undefined: pas chargé; null: indisponible
  const persos = useContext(ContextePersos)

  const ouvrir = async (e) => {
    if (e.currentTarget.open && stats === undefined) setStats(await lireStatsServeurs())
  }

  const serveurs = stats ? regrouper(stats) : []
  const avecMonde = serveurs.filter((s) => s.joueurs + s.groupes + s.guildes > 0)
  const mien = (s) => !!persos && persos.some((p) => p.region === s.region && (p.ruleset || 'normal') === s.ruleset)

  return (
    <details className="serveurs" onToggle={ouvrir}>
      <summary>Sur quel serveur jouent les gens du site?</summary>
      {stats === undefined && <p className="aide" role="status">Chargement…</p>}
      {stats === null && <p className="aide">Le compteur n’est pas encore disponible.</p>}
      {stats && avecMonde.length === 0 && (
        <p className="aide">Personne ne s’est encore inscrit. Les totaux apparaissent dès que des profils et des annonces sont là.</p>
      )}
      {stats && avecMonde.length > 0 && (
        <>
          <p className="aide">
            Le jeu partage un grand monde par région, découpé selon le type de serveur: on groupe seulement avec le même type.
            Les joueurs comptés ont un profil visible sur le site.
          </p>
          <ul className="serveurs-liste">
            {avecMonde.map((s) => (
              <li key={s.cle} className={`serveur${mien(s) ? ' mien' : ''}`}>
                <div className="serveur-nom">
                  <strong>
                    {s.region} · {nomRuleset(s.ruleset)}
                  </strong>
                  {mien(s) && <span className="chip">Un de tes persos</span>}
                </div>
                <div className="serveur-chiffres">
                  <span>
                    {pluriel(s.joueurs, 'joueur', 'joueurs')}
                    {s.actifs > 0 && <> ({s.actifs} actif{s.actifs > 1 ? 's' : ''} depuis 1 h)</>}
                  </span>
                  <span>
                    Alliance {s.alliance} · Horde {s.horde}
                  </span>
                  <span>
                    {pluriel(s.groupes, 'groupe', 'groupes')} · {pluriel(s.guildes, 'guilde', 'guildes')}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </details>
  )
}
