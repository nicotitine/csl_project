# ToDo stores

## Intermarché

- Choisir un CP
- Cherche un produit : 
  - intermarche.com/rechercheproduits/{driveID}/recherche/product/{ean}
  - waitFor(1000)
  - Si querySelector => produit trouvé - retourner le prix, sinon produit non trouvé

## Magasins U

- choisir un CP coursesu.com/drive/home
- Cherche un produit :
  - https://www.coursesu.com/recherche?q={ean}
  - waitFor(1000)
  - Si querySelector => produit trouvé - retourner le prix, sinon produit non trouvé