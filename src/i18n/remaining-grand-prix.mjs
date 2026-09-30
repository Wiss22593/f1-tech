// Presentation only: event identity, FIA mappings and dates stay in the registry.
const labels = {
  "es": {
    "bahrain": "GRAN PREMIO DE BAHRÉIN",
    "saudi-arabia": "GRAN PREMIO DE ARABIA SAUDITA",
    "singapore": "GRAN PREMIO DE SINGAPUR",
    "united-states": "GRAN PREMIO DE ESTADOS UNIDOS",
    "mexico-city": "GRAN PREMIO DE CIUDAD DE MÉXICO",
    "sao-paulo": "GRAN PREMIO DE SÃO PAULO",
    "las-vegas": "GRAN PREMIO DE LAS VEGAS",
    "qatar": "GRAN PREMIO DE QATAR",
    "abu-dhabi": "GRAN PREMIO DE ABU DABI"
  },
  "en": {
    "bahrain": "BAHRAIN GRAND PRIX",
    "saudi-arabia": "SAUDI ARABIAN GRAND PRIX",
    "singapore": "SINGAPORE GRAND PRIX",
    "united-states": "UNITED STATES GRAND PRIX",
    "mexico-city": "MEXICO CITY GRAND PRIX",
    "sao-paulo": "SÃO PAULO GRAND PRIX",
    "las-vegas": "LAS VEGAS GRAND PRIX",
    "qatar": "QATAR GRAND PRIX",
    "abu-dhabi": "ABU DHABI GRAND PRIX"
  },
  "it": {
    "bahrain": "GRAN PREMIO DI BAHRAIN",
    "saudi-arabia": "GRAN PREMIO D’ARABIA SAUDITA",
    "singapore": "GRAN PREMIO DI SINGAPORE",
    "united-states": "GRAN PREMIO DEGLI STATI UNITI",
    "mexico-city": "GRAN PREMIO DI CITTÀ DEL MESSICO",
    "sao-paulo": "GRAN PREMIO DI SAN PAOLO",
    "las-vegas": "GRAN PREMIO DI LAS VEGAS",
    "qatar": "GRAN PREMIO DEL QATAR",
    "abu-dhabi": "GRAN PREMIO DI ABU DHABI"
  },
  "pt": {
    "bahrain": "GRANDE PRÉMIO DO BAHREIN",
    "saudi-arabia": "GRANDE PRÉMIO DA ARÁBIA SAUDITA",
    "singapore": "GRANDE PRÉMIO DE SINGAPURA",
    "united-states": "GRANDE PRÉMIO DOS ESTADOS UNIDOS",
    "mexico-city": "GRANDE PRÉMIO DA CIDADE DO MÉXICO",
    "sao-paulo": "GRANDE PRÉMIO DE SÃO PAULO",
    "las-vegas": "GRANDE PRÉMIO DE LAS VEGAS",
    "qatar": "GRANDE PRÉMIO DO CATAR",
    "abu-dhabi": "GRANDE PRÉMIO DE ABU DHABI"
  },
  "fr": {
    "bahrain": "GRAND PRIX DE BAHREÏN",
    "saudi-arabia": "GRAND PRIX D’ARABIE SAOUDITE",
    "singapore": "GRAND PRIX DE SINGAPOUR",
    "united-states": "GRAND PRIX DES ÉTATS-UNIS",
    "mexico-city": "GRAND PRIX DE MEXICO",
    "sao-paulo": "GRAND PRIX DE SÃO PAULO",
    "las-vegas": "GRAND PRIX DE LAS VEGAS",
    "qatar": "GRAND PRIX DU QATAR",
    "abu-dhabi": "GRAND PRIX D’ABOU DABI"
  },
  "de": {
    "bahrain": "GROSSER PREIS VON BAHRAIN",
    "saudi-arabia": "GROSSER PREIS VON SAUDI-ARABIEN",
    "singapore": "GROSSER PREIS VON SINGAPUR",
    "united-states": "GROSSER PREIS DER USA",
    "mexico-city": "GROSSER PREIS VON MEXIKO-STADT",
    "sao-paulo": "GROSSER PREIS VON SÃO PAULO",
    "las-vegas": "GROSSER PREIS VON LAS VEGAS",
    "qatar": "GROSSER PREIS VON KATAR",
    "abu-dhabi": "GROSSER PREIS VON ABU DHABI"
  }
}
export function remainingGrandPrixName(locale, id) {
  const match = /^(.*)-(\d{4})$/.exec(id)
  const label = match && labels[locale]?.[match[1]]
  return label ? label + ' ' + match[2] : null
}
