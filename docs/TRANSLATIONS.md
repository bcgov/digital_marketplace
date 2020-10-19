# Traductions

* Le module de traduction utilisé est [i18next](https://www.i18next.com/).
* La configuration se trouve [coté front-end](src/front-end/typescript/lib/i18n)
* Les traductions sont transpilées à même le code javascript.
* L'application côté serveur n'utilise pas encore de traduction.

## Implantation

### Texte simple

Utiliser la function `t` :

```jsx
import React from 'react'
import { useTranslation } from 'react-i18next';

const monComposant = () => {
  const { t } = useTranslation()
  return <div>{t('cle.traduction')}</div>
}
```

Exemple de traduction: 

```json
{
  "cle": {
    "traduction": "Lorem ipsum"
  }
}
```

### Texte contenant des balises HTML


Utiliser le composant React `<Trans />` :

```jsx
import React from 'react'
import { Trans } from 'react-i18next';

const monComposant = () => {
  return <div><Trans i18nKey="cle.traduction" /></div>
}
```

Exemple de traduction: 

```json
{
  "cle": {
    "traduction": "Lorem <i>ipsum</i>"
  }
}
```

### Images

Il est possible de changer d'image selon la langue :

```jsx
<img src={t('cle.traduction')}/>
```

### Liens HTML

Il est recommandé de traduire séparément le texte et l'URL du lien :

```jsx
<a href={t('cle.lien.href')}>{t('cle.lien.content')}</a>
```

## Détecter les termes non traduits

Exécuter la commande NPM :

```bash
npm run i18n:parse
```

Les termes non traduits seront ajoutés aux fichiers de traduction [anglais](src/front-end/typescript/lib/i18n/locales/en/translation.json) et [français](src/front-end/typescript/lib/i18n/locales/fr/translation.json)