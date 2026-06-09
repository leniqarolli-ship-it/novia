exports.handler = async function (event, context) {
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
      },
      body: "",
    };
  }

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Méthode non autorisée" };
  }

  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Content-Type": "application/json",
  };

  try {
    const data = JSON.parse(event.body);
    const {
      typeBien, localite, quartier, surface, chambres, etage, ascenseur,
      exposition, peb, chauffage, jardinTerrasse, cave, parking, fibre,
      anneeConstruction, etatBien, defauts, charges, chargesInclus,
      precompte, travaux, prix, disponibilite, bail, pointsForts
    } = data;

    if (!typeBien || !localite || !surface || !prix) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "Champs obligatoires manquants." }),
      };
    }

    const prompt = `Tu es un agent immobilier belge expérimenté. Tu rédiges des annonces immobilières pour le marché wallon.

Ton style : humain, direct, honnête. Tu donnes envie sans survendre. Tu utilises des faits concrets pour convaincre, pas des formules creuses. Tu écris comme un professionnel qui connaît bien son bien et qui respecte ses futurs acheteurs ou locataires.

Voici les informations du bien :

LOCALISATION
- Type : ${typeBien}
- Localité : ${localite}
- Quartier / rue : ${quartier || "non précisé"}

CARACTÉRISTIQUES
- Surface : ${surface} m²
- Chambres : ${chambres || "non précisé"}
- Étage : ${etage || "non précisé"}
- Ascenseur : ${ascenseur || "non précisé"}
- Exposition : ${exposition || "non précisée"}
- Jardin / terrasse / balcon : ${jardinTerrasse || "non"}
- Cave : ${cave || "non"}
- Parking : ${parking || "non"}
- Fibre internet : ${fibre || "non précisé"}
- Année de construction : ${anneeConstruction || "non précisée"}

TECHNIQUE & ÉNERGIE
- PEB : ${peb || "non précisé"}
- Type de chauffage : ${chauffage || "non précisé"}

ÉTAT DU BIEN
- État général : ${etatBien || "non précisé"}
- Défauts / réparations à prévoir : ${defauts || "aucun défaut signalé"}

FINANCIER
- Prix : ${prix} €
- Charges : ${charges || "non précisé"} € / mois
- Charges incluent : ${chargesInclus || "non précisé"}
- Précompte immobilier : ${precompte || "non précisé"}
- Travaux en copropriété prévus : ${travaux || "aucun"}

PRATIQUE
- Disponibilité : ${disponibilite || "à convenir"}
- Durée du bail : ${bail || "non précisé"}

POINTS FORTS
${pointsForts || "non précisé"}

---

Rédige une annonce immobilière avec ces règles :

1. TITRE : factuel et accrocheur, sans superlatifs vides. Ex: "Appartement 3 chambres avec terrasse — Liège, Outremeuse" plutôt que "Magnifique appartement de rêve".

2. INTRODUCTION (3-4 phrases) : présente le bien de façon humaine et concrète. Donne envie sans mentir. Mets en avant ce qui est vraiment bien dans ce bien en te basant uniquement sur les faits fournis. Une phrase peut avoir un léger côté vendeur si elle est ancrée dans un fait réel.

3. CARACTÉRISTIQUES (liste avec tirets) : surface, chambres, étage, exposition, PEB, chauffage, cave, parking, jardin/terrasse, fibre, année construction. N'invente rien — si une info est manquante, ne la mets pas.

4. INFORMATIONS FINANCIÈRES : prix, charges (et ce qu'elles incluent), précompte, travaux prévus.

5. DISPONIBILITÉ : date et durée du bail.

6. À NOTER (uniquement si des défauts ou réparations sont mentionnés) : sois honnête et factuel. C'est un signe de sérieux, pas une faiblesse.

7. CONTACT : une phrase sobre pour inviter à prendre contact.

RÈGLES STRICTES :
- Zéro emoji
- Zéro cliché ("havre de paix", "coup de coeur", "coche toutes les cases", "rapport qualité-prix")
- Zéro affirmation non vérifiable ("idéalement situé", "très lumineux" sans preuve)
- Si l'exposition est connue, tu peux dire "bien exposé sud" — c'est un fait
- Longueur : 280-350 mots
- Français belge professionnel mais accessible`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1500,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) throw new Error("Erreur API Anthropic");
    const result = await response.json();
    const annonce = result.content[0].text;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ annonce }),
    };
  } catch (err) {
    console.error("Erreur:", err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Erreur serveur. Réessaie." }),
    };
  }
};
