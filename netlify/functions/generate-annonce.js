exports.handler = async function (event, context) {
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type" },
      body: "",
    };
  }

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Méthode non autorisée" };
  }

  const headers = { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" };

  try {
    const data = JSON.parse(event.body);
    const {
      typeTransaction, typeBien, localite, quartier, surface, chambres, etage, ascenseur,
      exposition, peb, chauffage, jardinTerrasse, cave, parking, fibre,
      anneeConstruction, etatBien, defauts, charges, chargesInclus,
      precompte, travaux, prix, disponibilite, bail, pointsForts, styleAnnonce
    } = data;

    if (!typeBien || !localite || !surface || !prix) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: "Champs obligatoires manquants." }) };
    }

    // Logique conditionnelle
    const isAppartement = ['Appartement', 'Studio', 'Duplex', 'Penthouse'].includes(typeBien);
    const isMaison = ['Maison', 'Villa'].includes(typeBien);
    const isLuxe = ['Villa', 'Penthouse'].includes(typeBien) || styleAnnonce === 'Premium / Luxe';
    const isLocation = typeTransaction === 'Location';

    const coproprieteSection = isAppartement ? `
- Charges : ${charges ? charges + ' €/mois' : 'non précisé'}${chargesInclus ? ' (inclus : ' + chargesInclus + ')' : ''}
- Travaux copropriété : ${travaux ? travaux : 'aucun travaux urgents mentionnés'}
- Précompte immobilier : ${precompte || 'non précisé'}` : `
- Précompte immobilier : ${precompte || 'non précisé'}
- Travaux : ${travaux ? travaux : 'aucun travaux urgents mentionnés'}`;

    const ascenseurSection = isAppartement && etage ? `\n- Ascenseur : ${ascenseur || 'non précisé'}` : '';

    const styleInstructions = {
      'Sobre / Professionnel': `Style : sobre, factuel, professionnel. Ton neutre et structuré. Pas de storytelling. Des faits, une structure claire, un vocabulaire précis. L'annonce doit inspirer confiance par sa rigueur.`,
      'Commercial / Émotionnel': `Style : humain et commercial. Tu peux utiliser un peu de storytelling ancré dans des faits réels. Donne envie de visiter sans survendre. Idéal pour biens familiaux, maisons avec jardin, appartements bien situés. Le lecteur doit se projeter.`,
      'Premium / Luxe': `Style : raffiné, exclusif, sobre dans le luxe. Vocabulaire soigné, phrases élégantes. Pas d'exclamations, pas de superlatifs vides — mais une mise en valeur subtile de ce qui rend ce bien exceptionnel. Le lecteur doit sentir que c'est un bien rare.`
    };

    const styleChoisi = styleInstructions[styleAnnonce] || styleInstructions['Sobre / Professionnel'];

    const prompt = `Tu es un agent immobilier belge expérimenté qui rédige des annonces pour le marché wallon.

${styleChoisi}

RÈGLES ABSOLUES :
- Zéro emoji
- Zéro cliché ("havre de paix", "coup de coeur", "coche toutes les cases", "rapport qualité-prix", "sans surprise")
- Jamais d'affirmations absolues sur l'état : utilise "présenté en excellent état", "sans travaux urgents mentionnés" plutôt que "aucun défaut", "parfait état"
- N'invente aucune information non fournie (pas de "proche gare" si non mentionné)
- Si un champ est vide ou "non précisé", ignore-le complètement
- ${isAppartement ? 'Ce bien est un appartement : tu peux parler de copropriété, charges communes, syndic.' : 'Ce bien est une maison/terrain : évite absolument les termes "copropriété" et "syndic" sauf si explicitement mentionné.'}
- Pour le nombre de chambres, écris le chiffre exact (ex: "3 chambres") jamais "et plus"
- Type de transaction : ${isLocation ? 'LOCATION — utilise "loyer", "locataire", "bail"' : 'VENTE — utilise "prix de vente", "acquéreur"'}

INFORMATIONS DU BIEN :

Type : ${typeBien} — ${typeTransaction}
Localité : ${localite}${quartier ? ' — ' + quartier : ''}
Surface : ${surface} m²${chambres ? '\nChambres : ' + chambres : ''}${etage ? '\nÉtage : ' + etage : ''}${ascenseurSection}${exposition ? '\nExposition : ' + exposition : ''}${anneeConstruction ? '\nAnnée de construction : ' + anneeConstruction : ''}${cave ? '\nCave : ' + cave : ''}${parking ? '\nParking : ' + parking : ''}${fibre ? '\nFibre internet : ' + fibre : ''}${jardinTerrasse ? '\nExtérieur : ' + jardinTerrasse : ''}

ÉNERGIE & TECHNIQUE :${peb ? '\nPEB : ' + peb : ''}${chauffage ? '\nChauffage : ' + chauffage : ''}

ÉTAT :
- État général : ${etatBien || 'non précisé'}${defauts ? '\n- Points à noter : ' + defauts : ''}

FINANCIER :
- ${isLocation ? 'Loyer' : 'Prix de vente'} : ${prix} €${coproprieteSection}

PRATIQUE :${disponibilite ? '\n- Disponibilité : ' + disponibilite : ''}${bail && isLocation ? '\n- Durée du bail : ' + bail : ''}

POINTS FORTS :
${pointsForts || 'non précisé'}

---

STRUCTURE DE L'ANNONCE :

1. TITRE : factuel et accrocheur (ex: "Maison 4 façades — 5 chambres avec jardin — Huy")

2. INTRODUCTION (3-4 phrases) : présente le bien selon le style choisi. Si des défauts sont mentionnés, tu peux les intégrer positivement ou les réserver pour la section "À noter". Une annonce transparente rassure.

3. CARACTÉRISTIQUES (liste avec tirets) : inclus uniquement les infos fournies.

4. INFORMATIONS ${isLocation ? 'LOCATION' : 'FINANCIÈRES'} : ${isLocation ? 'loyer, charges, bail' : 'prix, charges si appartement, précompte, travaux'}.

5. DISPONIBILITÉ.

6. À NOTER (uniquement si défauts mentionnés) : formule honnêtement et prudemment. Ex: "La chaudière date de 2008 et devra être vérifiée à court terme."

7. MENTION LÉGALE (toujours présente, mot pour mot) :
"Les informations communiquées sont données à titre indicatif et ne constituent pas un engagement contractuel. Le certificat PEB est disponible sur demande auprès de l'agence."

Longueur totale : 280-360 mots.`;

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

    return { statusCode: 200, headers, body: JSON.stringify({ annonce }) };
  } catch (err) {
    console.error("Erreur:", err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: "Erreur serveur. Réessaie." }) };
  }
};
