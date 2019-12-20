# Projet CSL

J'ai décidé d'utiliser Node.JS et EJS côté serveur et VueJS côté client comme technologies pour ce projet.

## Installation

NPM et Node.JS doivent être installés sur votre machine.

Depuis un terminal, exécutez la commande `npm run i` dans le dossier racine du projet (celui contenant le fichier `package.json`)

Cette opération peut durer un moment en fonction de la vitesse de votre connexion.

## Exécution

Nous avons deux programmes à lancer (le serveur puppeteer et le serveur client), donc il vous faudra deux instances de votre terminal.

1. Pour le serveur puppeteer, exécutez la commande `npm run puppeteer` dans le dossier racine du projet. Une fois ce serveur lancé, le message suivant apparaitra :

    `Puppeteer cluster launched with 4 worker(s) and x ms of delay on port 9091`

2. Pour le serveur classique, exécutez la commande `npm run start` dans le dossier racine du projet. Une fois ce serveur lancé, le message suivant apparaitra :

    `Server listening on port 9090`

    

    <strong>/!\ /!\ ATTENTION</strong> : Si vous utilisez un proxy, la connexion à la base de données échouera ! <strong>/!\  /!\ </strong>

## Utilisation

Une fois les deux serveurs lancés, vous pouvez vous rendre sur la page accueil du projet, se trouvant à l'adresse `http://localhost:9090`. 

Si vous souhaitez visualiser le site sur votre mobile, c'est possible en vous rendant à l'adresse `http://votre_adresse_ip_locale:9090`, `votre_adresse_ip_locale` étant l'adresse locale de l'ordinateur sur lequel `npm run start` tourne (Exemple : `192.168.1.11`).

## Fonctionnement

Pour scrapper un nouveau produit, rendez-vous dans la page de Recherche ou vous entrez un code barre valide dans le champ. Si c'est un format de gtin valide, il vous proposera d'aller scrapper le produit. Vous pouvez aussi vous rendre à l'adresse `http://localhost:9090/produits/:gtin` ou `:gtin` est le code barre du produit.

1. La requête est envoyée au serveur
2. Le serveur vérifie que le produit n'est pas déjà dans la base de données
    - Si le produit est présent, retourne la page avec le produit
    - Sinon, retourne la page vide au client, ouvre une connexion WebSocket avec le client et demande au serveur puppeteer d'aller chercher les informations

3. Le serveur puppeteer répond au serveur classique avec les informations scrappées.
4. Le serveur classique envoie, grâce aux WebSocket, les informations au client pour que le produit puisse être affiché.
5. Le serveur classique sauvegarde les nouvelles informations scrappées.
6. Le client demande au serveur classique d'aller chercher les images et le prix pour ce nouveau produit.
7. Le serveur classique transmet la demande au serveur puppeteer.
8. Le serveur puppeteer répond avec les informations.
9. Le serveur classique pousse les nouvelles données vers le client pour l'affichage et sauvegarde les nouvelles informations. 