# Dépôt d'Extension Paperback pour Starbound Scans

Ce dépôt contient le code source de l'extension [Starbound Scans](https://starboundscans.com/) pour l'application [Paperback](https://paperback.moe/).

Il est construit à l'aide de la `paperback-toolchain` officielle, qui compile le code TypeScript en une extension JavaScript fonctionnelle et génère les fichiers de dépôt nécessaires.

## Prérequis

-   [Node.js](https://nodejs.org/) (version LTS recommandée)
-   npm (généralement inclus avec Node.js)

## Installation des dépendances

Clonez ce dépôt sur votre machine, puis installez les dépendances nécessaires à l'aide de npm.

```bash
git clone https://github.com/MaksOuw/Paperback-extensions
cd Paperback-extensions
npm install
```

## Développement et Test en direct

La toolchain Paperback inclut un serveur de développement qui vous permet de tester votre extension en direct sur l'application Paperback sans avoir à construire et héberger les fichiers à chaque modification.

1.  **Lancez le serveur de développement :**
    ```bash
    npm run serve
    ```
    Cela démarrera un serveur local, généralement sur `http://127.0.0.1:8000`.

2.  **Ajoutez le dépôt dans Paperback :**
    -   Ouvrez l'application Paperback sur votre iPhone/iPad.
    -   Allez dans `Paramètres` > `Extensions`.
    -   Appuyez sur le `+` en haut à droite.
    -   Entrez l'URL de votre serveur local : `http://127.0.0.1:8000` (assurez-vous que votre appareil est sur le même réseau Wi-Fi que votre ordinateur).

3.  **Testez :**
    -   Votre dépôt local devrait apparaître dans la liste.
    -   Vous pouvez maintenant installer l'extension "Starbound Scans" et l'utiliser.
    -   Toute modification que vous enregistrerez dans votre code TypeScript sera automatiquement reflétée dans l'application après un rafraîchissement.

## Génération des fichiers du dépôt (Build)

Lorsque vous êtes satisfait de votre extension et que vous souhaitez la publier, vous devez générer les fichiers finaux du dépôt.

1.  **Lancez la commande de build :**
    ```bash
    npm run build
    ```

2.  **Résultat :**
    -   Cette commande va créer un dossier `dist/` à la racine de votre projet.
    -   Ce dossier contiendra tous les fichiers nécessaires pour un dépôt public :
        -   `repo.json` : Le manifeste principal du dépôt.
        -   `versioning.json` : Le catalogue des versions pour les mises à jour.
        -   Un sous-dossier contenant l'extension JavaScript compilée et son icône.

## Déploiement

Pour rendre votre extension accessible à tous, vous devez héberger le **contenu du dossier `dist/`** en ligne. Une solution simple et gratuite est d'utiliser [GitHub Pages](https://pages.github.com/).

Une fois hébergé, l'URL publique pointant vers votre fichier `repo.json` est celle que les utilisateurs devront ajouter à Paperback pour installer votre extension.