import tkinter as tk
from tkinter import filedialog, messagebox
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import os
import re
import unicodedata
import plotly.graph_objs as go
import plotly.offline as pyo

derniere_figure = None

def nettoyer(texte):
    if not isinstance(texte, str):
        return ""
    # Supprimer les articles
    texte = re.sub(r'^(le|la|les|un|une|des|l’|l\')\s*', '', texte.strip().lower())
    # Supprimer les accents
    texte = ''.join(
        c for c in unicodedata.normalize('NFD', texte)
        if unicodedata.category(c) != 'Mn'
    )
    return texte

def extraire_donnees(fichier_excel, grille_rsb):
    try:
        if fichier_excel.lower().endswith('.csv'):
            try:
                df = pd.read_csv(fichier_excel, header=0, encoding='utf-8')
            except UnicodeDecodeError:
                try:
                    df = pd.read_csv(fichier_excel, header=0, encoding='latin1')
                except Exception as e:
                    print(f"❌ Erreur d'encodage dans {fichier_excel} : {e}")
                    return None
        else:
            df = pd.read_excel(fichier_excel, header=0)
        row = df.iloc[0]
        rsb_start  = int(row.get("rsbStart", 0))
        rsb_end    = int(row.get("rsbEnd", -14))
        rsb_step   = int(row.get("rsbStep", -2))
        word_count = int(row.get("wordCnt", 4))

        nb_niveaux = int(abs((rsb_end - rsb_start) / rsb_step)) + 1
        rsb_levels = [float(rsb_start) + i*float(rsb_step) for i in range(nb_niveaux)]
        resultats  = {float(r): {"bons":0, "total":0, "temps":[]} for r in rsb_levels}

        mots_valides   = 0
        total_attendu = nb_niveaux * word_count

        print("\n--- Debug RSB trouvés dans la ligne de données ---")
        for i in range(total_attendu):
            rsb = row.get(f"wordHist/{i}/rsb", None)
            if not pd.isna(rsb):
                print(f"  Index {i} : RSB = {rsb} (type {type(rsb)})")
        print("-----------------------------------------------\n")

        for i in range(total_attendu):
            mot   = nettoyer(row.get(f"wordHist/{i}/word", ""))
            rep   = nettoyer(row.get(f"wordHist/{i}/resp", ""))
            rsb   = row.get(f"wordHist/{i}/rsb", None)
            debut = row.get(f"wordHist/{i}/beginningOfSpeechTime", None)
            fin   = row.get(f"wordHist/{i}/endOfSpeechTime", None)
            if not mot or not rep or pd.isna(rsb) or pd.isna(debut) or pd.isna(fin):
                continue
            duree = fin - debut
            # filtre sur des durées plausibles
            if not (100 <= duree <= 10000):
                continue
            mots_valides += 1
            r = float(rsb)
            if r not in resultats:
                resultats[r] = {"bons":0,"total":0,"temps":[]}
            if mot in rep:
                resultats[r]["bons"] += 1
            resultats[r]["total"] += 1
            resultats[r]["temps"].append(duree)

        # Exclusion si trop peu de données valides
        if mots_valides < 0.8 * total_attendu:
            print(f"⚠️ Fichier ignoré (données insuffisantes) : {os.path.basename(fichier_excel)}")
            return None

        rsb_points = sorted(resultats.keys())
        pourcentages = []
        temps_moyens  = []

        for r in rsb_points:
            total = resultats[r]["total"]
            bons  = resultats[r]["bons"]
            pourcentages.append(100 * bons / total if total>0 else 0)
            temps_moyens.append(np.mean(resultats[r]["temps"]) if resultats[r]["temps"] else 0)

        # Affichage debug : pour chaque RSB, afficher le nombre de bons, total, et pourcentage
        print(f"\n--- Résultats pour {os.path.basename(fichier_excel)} ---")
        essais_valides_par_rsb = {r: [] for r in rsb_points}
        essais_ignores_par_rsb = {r: [] for r in rsb_points}
        for i in range(total_attendu):
            mot   = nettoyer(row.get(f"wordHist/{i}/word", ""))
            rep   = nettoyer(row.get(f"wordHist/{i}/resp", ""))
            rsb   = row.get(f"wordHist/{i}/rsb", None)
            debut = row.get(f"wordHist/{i}/beginningOfSpeechTime", None)
            fin   = row.get(f"wordHist/{i}/endOfSpeechTime", None)
            raison = None
            if not mot or not rep or pd.isna(rsb) or pd.isna(debut) or pd.isna(fin):
                raison = "champ manquant"
            else:
                duree = fin - debut
                if not (100 <= duree <= 10000):
                    raison = f"durée hors plage ({duree})"
            if raison is None:
                r_val = float(rsb)
                if r_val in essais_valides_par_rsb:
                    essais_valides_par_rsb[r_val].append((mot, rep))
            else:
                if not pd.isna(rsb):
                    r_val = float(rsb)
                    if r_val in essais_ignores_par_rsb:
                        essais_ignores_par_rsb[r_val].append((mot, rep, raison))
        for r in rsb_points:
            total = resultats[r]["total"]
            bons = resultats[r]["bons"]
            pourc = 100 * bons / total if total > 0 else 0
            print(f"RSB {r} dB : {bons}/{total} bons ({pourc:.1f}%)")
            # Afficher les mots cibles et les réponses valides pour ce RSB
            for cible, rep in essais_valides_par_rsb[r]:
                print(f"    [OK] cible: '{cible}' | réponse: '{rep}'")
            # Afficher les essais ignorés pour ce RSB
            for cible, rep, raison in essais_ignores_par_rsb[r]:
                print(f"    [IGNORÉ] cible: '{cible}' | réponse: '{rep}' | raison: {raison}")
        print("------------------------------\n")

        return {
            "pourcentages_interp": np.interp(grille_rsb, rsb_points, pourcentages),
            "temps_interp":       np.interp(grille_rsb, rsb_points, temps_moyens),
            "rsb":                rsb_points,
            "pourcent":           pourcentages,
            "temps":              temps_moyens,
            "rsb_start":          rsb_start,
            "rsb_end":            rsb_end
        }

    except Exception as e:
        print(f"❌ Erreur dans {fichier_excel} : {e}")
        return None

def lancer_analyse(fichiers):
    global derniere_figure
    grille_rsb = np.arange(-14, 8, 2)
    grille_rsb = np.array(grille_rsb)  # S'assurer que c'est un numpy array
    toutes_les_courbes = []
    tous_les_temps   = []

    # Figure 1 : reconnaissance vs RSB
    fig1, ax1 = plt.subplots(figsize=(10,6))
    rsb_starts = []
    rsb_ends = []
    for f in fichiers:
        print(f"🔍 Traitement : {os.path.basename(f)}")
        d = extraire_donnees(f, grille_rsb)
        if d is not None:
            rsb_start = d.get("rsb_start", min(grille_rsb))
            rsb_end = d.get("rsb_end", max(grille_rsb))
            if rsb_start > rsb_end:
                rsb_start, rsb_end = rsb_end, rsb_start
            rsb_starts.append(rsb_start)
            rsb_ends.append(rsb_end)
            print(f"  Affichage de {rsb_start} à {rsb_end} dB pour {os.path.basename(f)}")
            # Affichage uniquement des points mesurés, reliés par segments droits, avec ronds
            rsb_points = np.array(d["rsb"])
            pourcentages = np.array(d["pourcent"])
            toutes_les_courbes.append(d["pourcentages_interp"])  # Pour la moyenne, on garde tout
            tous_les_temps.append(d["temps_interp"])
            nom_courbe = os.path.splitext(os.path.basename(f))[0]
            ax1.plot(rsb_points, pourcentages, marker='o', linestyle='-', color='orange', alpha=0.7, label=nom_courbe)
    # Forcer les ticks X de -14 à 6 par pas de 2
    ax1.set_xticks(grille_rsb)
    if not toutes_les_courbes:
        messagebox.showerror("Erreur", "Aucune courbe valide.")
        return

    toutes_les_courbes = np.array(toutes_les_courbes)
    tous_les_temps     = np.array(tous_les_temps)

    if len(fichiers) > 1:
        moyenne    = np.mean(toutes_les_courbes, axis=0)
        ecart_type = np.std(toutes_les_courbes, axis=0)
        courbe_min = np.min(toutes_les_courbes, axis=0)
        courbe_max = np.max(toutes_les_courbes, axis=0)
        temps_moy  = np.mean(tous_les_temps, axis=0)

        # Limiter l'affichage de la moyenne et stats à l'intervalle commun
        rsb_min_global = max(rsb_starts) if rsb_starts else min(grille_rsb)
        rsb_max_global = min(rsb_ends) if rsb_ends else max(grille_rsb)
        mask_global = (grille_rsb >= rsb_min_global) & (grille_rsb <= rsb_max_global)
        grille_rsb_stats = grille_rsb[mask_global]
        moyenne_stats = moyenne[mask_global]
        ecart_type_stats = ecart_type[mask_global]
        courbe_min_stats = courbe_min[mask_global]
        courbe_max_stats = courbe_max[mask_global]

        ax1.plot(grille_rsb_stats, moyenne_stats, marker='o', color='blue', linewidth=2, label='Moyenne')
        ax1.fill_between(grille_rsb_stats, moyenne_stats-ecart_type_stats, moyenne_stats+ecart_type_stats,
                         color='blue', alpha=0.2, label='± Ecart-type')
        ax1.plot(grille_rsb_stats, courbe_min_stats, linestyle='--', color='grey', label='Min')
        ax1.plot(grille_rsb_stats, courbe_max_stats, linestyle='--', color='black', label='Max')
    ax1.set_title("Reconnaissance vocale dans le bruit")
    ax1.set_xlabel("RSB (dB)")
    ax1.set_ylabel("% de mots reconnus")
    ax1.set_ylim(0,110)
    ax1.grid(True)
    ax1.legend()
    fig1.tight_layout()
    fig1.savefig("courbe_moyenne.png")
    derniere_figure = fig1
    plt.show()

    # Figure 2 : temps de réponse par RSB
    fig2, ax2 = plt.subplots(figsize=(8,5))
    for idx, f in enumerate(fichiers):
        d = extraire_donnees(f, grille_rsb)
        if d is not None:
            rsb_points = np.array(d["rsb"])
            temps = np.array(d["temps"])
            nom_courbe = os.path.splitext(os.path.basename(f))[0]
            ax2.plot(rsb_points, temps, marker='o', linestyle='-', alpha=0.7, label=nom_courbe)
    ax2.set_title("Temps moyen de réponse par RSB")
    ax2.set_xlabel("RSB (dB)")
    ax2.set_ylabel("Temps moyen (ms)")
    ax2.grid(True)
    ax2.set_xticks(grille_rsb)
    if len(fichiers) > 1:
        # Calculer la moyenne uniquement sur les points communs
        tous_les_temps = np.array(tous_les_temps)
        rsb_starts = [d["rsb_start"] for d in [extraire_donnees(f, grille_rsb) for f in fichiers] if d is not None]
        rsb_ends = [d["rsb_end"] for d in [extraire_donnees(f, grille_rsb) for f in fichiers] if d is not None]
        rsb_min_global = max(rsb_starts) if rsb_starts else min(grille_rsb)
        rsb_max_global = min(rsb_ends) if rsb_ends else max(grille_rsb)
        mask_global = (grille_rsb >= rsb_min_global) & (grille_rsb <= rsb_max_global)
        grille_rsb_stats = grille_rsb[mask_global]
        temps_moy = np.mean(tous_les_temps, axis=0)[mask_global]
        ax2.plot(grille_rsb_stats, temps_moy, marker='s', linestyle='-', color='green', label='Moyenne')
    ax2.legend()
    fig2.tight_layout()
    fig2.savefig("temps_par_rsb.png")
    derniere_figure = fig2
    plt.show()

    # Figure 3 : temps vs taux de réussite
    fig3, ax3 = plt.subplots(figsize=(8,5))
    all_pourcentages = []
    all_temps = []
    for idx, f in enumerate(fichiers):
        d = extraire_donnees(f, grille_rsb)
        if d is not None:
            pourcentages = np.array(d["pourcent"])
            temps = np.array(d["temps"])
            nom_courbe = os.path.splitext(os.path.basename(f))[0]
            ax3.scatter(pourcentages, temps, alpha=0.7, label=nom_courbe)
            all_pourcentages.extend(pourcentages)
            all_temps.extend(temps)
    ax3.set_title("Temps moyen vs Taux de réussite")
    ax3.set_xlabel("% de mots reconnus")
    ax3.set_ylabel("Temps moyen (ms)")
    ax3.grid(True)
    if len(fichiers) > 1 and len(all_pourcentages) > 1:
        # Courbe de tendance (régression linéaire)
        x = np.array(all_pourcentages)
        y = np.array(all_temps)
        # Trier par x pour un affichage propre
        sort_idx = np.argsort(x)
        x_sorted = x[sort_idx]
        y_sorted = y[sort_idx]
        # Régression linéaire
        coefs = np.polyfit(x_sorted, y_sorted, 1)
        y_fit = np.polyval(coefs, x_sorted)
        ax3.plot(x_sorted, y_fit, color='red', linewidth=2, label='Tendance linéaire')
    ax3.legend()
    fig3.tight_layout()
    fig3.savefig("temps_vs_reussite.png")
    derniere_figure = fig3
    plt.show()

    # Export CSV
    df_export = pd.DataFrame({
        "RSB (dB)":           grille_rsb,
        "Pourcentage moyen":  moyenne,
        "Ecart-type":         ecart_type,
        "Min":                courbe_min,
        "Max":                courbe_max,
        "Temps moyen (ms)":   temps_moy
    })
    df_export.to_csv("moyenne_rsb.csv", index=False)
    print("✅ Export CSV terminé : moyenne_rsb.csv")

    print("Génération du graphe interactif Plotly...")
    plotly_affichage_moyenne(grille_rsb, toutes_les_courbes, fichiers, moyenne, rsb_min_global, rsb_max_global)

def imprimer_figure():
    if derniere_figure is not None:
        derniere_figure.savefig("impression_ecran_courbe.png")
        messagebox.showinfo("Image sauvegardée",
                            "Figure enregistrée sous 'impression_ecran_courbe.png'")
    else:
        messagebox.showwarning("Aucune figure",
                               "Aucune courbe n'a encore été affichée.")

def choisir_fichiers():
    fichiers = filedialog.askopenfilenames(
        filetypes=[("Fichiers Excel ou CSV", "*.xlsx *.csv"), ("Tous les fichiers", "*.*")]
    )
    if fichiers:
        lancer_analyse(fichiers)

def quitter_appli(root):
    plt.close('all')
    root.destroy()

def plotly_affichage_moyenne(grille_rsb, toutes_les_courbes, fichiers, moyenne, rsb_min_global, rsb_max_global):
    import plotly.graph_objs as go
    import plotly.offline as pyo
    import os

    traces = []
    for idx, courbe in enumerate(toutes_les_courbes):
        traces.append(go.Scatter(
            x=grille_rsb,
            y=courbe,
            mode='lines+markers',
            name=f'Courbe {idx+1} ({os.path.basename(fichiers[idx])})'
        ))
    traces.append(go.Scatter(
        x=grille_rsb,
        y=moyenne,
        mode='lines+markers',
        name='Moyenne',
        line=dict(width=4, color='blue')
    ))
    layout = go.Layout(
        title="Reconnaissance vocale dans le bruit (Plotly)",
        xaxis=dict(title="RSB (dB)", dtick=2),
        yaxis=dict(title="% de mots reconnus", range=[0, 110]),
        legend=dict(x=0, y=1)
    )
    fig = go.Figure(data=traces, layout=layout)
    pyo.plot(fig, filename="courbe_moyenne_plotly.html", auto_open=True)

def interface():
    root = tk.Tk()
    root.title("Analyse RSB - Reconnaissance vocale dans le bruit")
    root.geometry("600x400")

    titre = tk.Label(root, text="Analyse RSB", font=("Helvetica",24,"bold"))
    titre.pack(pady=20)

    info = ("Cette application analyse la reconnaissance vocale dans le bruit\n"
            "à partir de fichiers Excel contenant les résultats des tests.")
    description = tk.Label(root, text=info, font=("Helvetica",12), justify="center")
    description.pack(pady=10)

    btn_lancer = tk.Button(root, text="Choisir fichiers à analyser",
                           font=("Helvetica",14), command=choisir_fichiers)
    btn_lancer.pack(pady=20)

    btn_print = tk.Button(root, text="Imprimer la courbe affichée",
                          font=("Helvetica",12), command=imprimer_figure)
    btn_print.pack(pady=10)

    btn_quit = tk.Button(root, text="Quitter",
                         font=("Helvetica",12),
                         command=lambda: quitter_appli(root))
    btn_quit.pack(side=tk.BOTTOM, pady=10)

    root.mainloop()

if __name__ == "__main__":

    interface()
