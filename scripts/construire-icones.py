"""Construit public/icones-jeu.txt: la table « numéro de fichier -> nom d'icône » dont le site a besoin pour afficher les
icônes des joueurs de WoW Forever (le jeu donne un numéro, l'image se retrouve par son nom).

Source: la liste communautaire des fichiers du jeu (https://github.com/wowdev/wow-listfile, community-listfile.csv).
    python3 -I scripts/construire-icones.py community-listfile.csv public/icones-jeu.txt

Format du résultat, une ligne par icône, triée: « écart avec le numéro précédent:nom » (le premier écart part de 0).
Seuls les noms sûrs sont gardés (minuscules, chiffres, soulignés, 64 caractères au plus): ce sont les mêmes règles que
celles de la base et du site pour un nom d'icône. À refaire quand un nouveau lot d'icônes sort (rarement)."""
import re
import sys

if len(sys.argv) != 3:
    sys.exit(__doc__)
icones = {}
with open(sys.argv[1], encoding="utf-8", errors="replace") as f:
    for ligne in f:
        numero, _, chemin = ligne.rstrip("\n").partition(";")
        m = re.fullmatch(r"interface/icons/([a-z0-9_]{1,64})\.blp", chemin)
        if m and numero.isdigit():
            icones[int(numero)] = m.group(1)
precedent = 0
with open(sys.argv[2], "w", encoding="utf-8", newline="\n") as sortie:
    for numero in sorted(icones):
        sortie.write(f"{numero - precedent}:{icones[numero]}\n")
        precedent = numero
print(f"{len(icones)} icônes écrites dans {sys.argv[2]}")
