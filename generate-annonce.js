exports.handler = async function (event, context) {
  // Autoriser uniquement les requêtes POST
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Méthode non autorisée" }),
    };
  }

  // Headers CORS pour autoriser les appels depuis ton site Netlify
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json",
  };

  // Répondre aux preflight OPTIONS
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  try {
    const data = JSON.parse(event.body);

    // Les 6 champs du formulaire
    const {
      typeBien,       // ex: "Appartement", "Maison", "Villa"
      localite,       // ex: "Liège", "Namur", "Charleroi"
      surface,        // ex: "85" (en m²)
      chambres,       // ex: "3"
      prix,           // ex: "249000" (en €)
      description,    // Détails libres : état, équipements, atouts
    } = data;

    // Validation basique
    if (!typeBien || !localite || !surface || !prix) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "Champs obligatoires manquants (type, localité, surface, prix)" }),
      };
    }

    // Prompt optimisé pour une annonce immo belge professionnelle
    const prompt = `Tu es un expert en rédaction d'annonces immobilières pour le marché belge.

Génère une annonce immobilière professionnelle et accrocheuse basée sur ces informations :

- Type de bien : ${typeBien}
- Localité : ${localite}
- Surface : ${surface} m²
- Nombre de chambres : ${chambres || "non précisé"}
- Prix : ${prix} €
- Détails supplémentaires : ${description || "aucun"}

L'annonce doit :
1. Commencer par un titre accrocheur (max 10 mots)
2. Avoir un paragraphe d'accroche émotionnel (2-3 phrases)
3. Présenter les points forts sous forme de liste avec des émojis
4. Se terminer par un call-to-action pour contacter l'agence

Ton de voix : professionnel, chaleureux, vendeur. 
Langue : français belge standard.
Longueur totale : 150-200 mots maximum.`;

    // Appel à l'API Anthropic (clé stockée en variable d'env Netlify)
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-opus-4-20250514",
        max_tokens: 1024,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Erreur API Anthropic:", errText);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: "Erreur lors de la génération. Réessaie." }),
      };
    }

    const result = await response.json();
    const annonce = result.content[0].text;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ annonce }),
    };
  } catch (err) {
    console.error("Erreur fonction Netlify:", err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Erreur serveur inattendue." }),
    };
  }
};
