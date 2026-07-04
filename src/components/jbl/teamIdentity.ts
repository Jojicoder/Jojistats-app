// Team personality content for the "Team Identity" page. Sourced from
// BaseballEngine/docs/jbl-team-ai-design.md (the front-office AI design doc)
// and translated to English for the UI — kept as static content here rather
// than derived, since it's editorial/flavor text, not simulation data.

export type TeamIdentity = {
  philosophy: string
  tagline: string
  vibe: string
  draft: string
  freeAgency: string
  trade: string
  strategy: string
}

export const TEAM_IDENTITY: Record<string, TeamIdentity> = {
  "Newark Knights": {
    philosophy: "Small Ball",
    tagline: "A team that manufactures wins with its legs.",
    vibe: "Old-school chivalry — discipline and honor.",
    draft: "Prioritizes speed, contact, and defense.",
    freeAgency: "Favors high-OBP, fast players.",
    trade: "Collects players who can run.",
    strategy: "Grinds out runs with singles, steals, and situational hitting.",
  },
  "Queens Titans": {
    philosophy: "Balanced Baseball",
    tagline: "A traditional powerhouse built on a balanced attack.",
    vibe: "Proud, powerful giants carrying the diversity of an immigrant borough.",
    draft: "Balances pitching and hitting picks.",
    freeAgency: "Targets ace-caliber arms and middle-of-the-order bats.",
    trade: "Fills needs precisely, no excess.",
    strategy: "No tricks — wins by playing it straight.",
  },
  "Brooklyn Hammers": {
    philosophy: "Power Baseball",
    tagline: "A team that breaks games open with the long ball.",
    vibe: "Blue-collar, unpolished, forged in the factories and docks.",
    draft: "Prioritizes power, arm strength, exit velocity.",
    freeAgency: "Favors big boppers and hard-throwing pitchers.",
    trade: "Aggressive about upgrading the lineup.",
    strategy: "Rarely bunts — swings for the fences.",
  },
  "Bronx Wolves": {
    philosophy: "Win Now",
    tagline: "A perennial contender for whom winning is a mandate.",
    vibe: "Aggressive, hunts in packs — rough and intimidating.",
    draft: "Prioritizes MLB-ready, polished players.",
    freeAgency: "Aggressive even for star-level talent.",
    trade: "Will deal prospects if it's in a pennant race.",
    strategy: "Aggressive on the bases, quick to go to its best relievers.",
  },
  "Harlem Eagles": {
    philosophy: "Small Ball",
    tagline: "Baseball played beautifully, stringing hits together.",
    vibe: "Proud and charismatic — looks down with dignity.",
    draft: "Values contact, eye, speed, defense.",
    freeAgency: "Targets high-OBP hitters and glove-first players.",
    trade: "Reinforces without disrupting team chemistry.",
    strategy: "Heavy use of bunts, hit-and-run, situational hitting.",
  },
  "Staten Island Foxes": {
    philosophy: "Player Development",
    tagline: "A scrappy team betting on upside.",
    vibe: "A bit of an outsider — cunning and quick.",
    draft: "Prioritizes high ceiling over floor.",
    freeAgency: "Targets young, cheap talent.",
    trade: "Prefers youth over proven veterans.",
    strategy: "Sometimes values experience over winning in the moment.",
  },
  "Fishtown Ferals": {
    philosophy: "Power Baseball",
    tagline: "A wild, explosive team.",
    vibe: "Wild and street-raised — rough around the edges but fast.",
    draft: "Raw but high-ceiling players.",
    freeAgency: "Power hitters, power arms.",
    trade: "Favors moves that add momentum.",
    strategy: "Aggressive, plays off the game's energy.",
  },
  "Kensington Iron": {
    philosophy: "Defense First",
    tagline: "A tough team that doesn't crack.",
    vibe: "Industrial toughness — unpolished and unbreakable.",
    draft: "Defense, durability, control.",
    freeAgency: "Glove-first players, steady arms.",
    trade: "Fills weaknesses over making a splash.",
    strategy: "Defensive replacements, shifts, careful bullpen management.",
  },
  "Germantown Colonials": {
    philosophy: "Balanced Baseball",
    tagline: "A team that values tradition and experience.",
    vibe: "Carries the weight of revolutionary history — tradition and defiance.",
    draft: "Polished, well-rounded players; control-type pitchers.",
    freeAgency: "Willing to pay for veterans.",
    trade: "Trusts its current roster over a rapid rebuild.",
    strategy: "Believes in its starters, plays old-school baseball.",
  },
  "Manayunk Runners": {
    philosophy: "Small Ball",
    tagline: "A team that wears opponents down with speed.",
    vibe: "The stamina to run the hilly streets — quietly hardworking.",
    draft: "Speed above all, contact too.",
    freeAgency: "Fast, high-OBP, glove-first players.",
    trade: "Collects players who can run.",
    strategy: "Heavy use of steals, bunts, hit-and-run.",
  },
  "Fairmount Rams": {
    philosophy: "Rebuild",
    tagline: "A youth-driven team in rebuild mode.",
    vibe: "A park-and-museum city — powerful but with some class.",
    draft: "Upside, raw tools, developmental projects.",
    freeAgency: "Mostly short-term deals.",
    trade: "Turns veterans into prospects.",
    strategy: "Gives young players playing time.",
  },
  "South Philly Stallions": {
    philosophy: "Player Development",
    tagline: "A rebuilding team betting on contact-oriented youth.",
    vibe: "A wild racehorse — gambler's instinct.",
    draft: "Prioritizes contact-oriented prospects.",
    freeAgency: "Only local fan favorites or short-term stopgaps.",
    trade: "Collects upside over immediate help.",
    strategy: "Prioritizes reps for young players, with some old-school steadiness.",
  },
  "Georgetown Ravens": {
    philosophy: "Win Now",
    tagline: "An elite team that wins on intelligence and organization.",
    vibe: "Intellectual and mysterious — college-town sophistication.",
    draft: "Polish, baseball IQ, few weaknesses.",
    freeAgency: "Fills only the exact pieces it needs.",
    trade: "Efficient, calculated moves.",
    strategy: "Uses shifts, bullpen matchups, and pinch hitters rationally.",
  },
  "Capitol Hill Senators": {
    philosophy: "Balanced Baseball",
    tagline: "A team that plays it straight, by the book.",
    vibe: "The gravitas and gamesmanship of the seat of power.",
    draft: "High-floor, fundamentally sound players.",
    freeAgency: "Low-risk, steady veterans.",
    trade: "Reinforces steadily rather than gambling.",
    strategy: "Orthodox — doesn't force the issue.",
  },
  "Anacostia Kings": {
    philosophy: "Power Baseball",
    tagline: "A defiant team that wins with raw power.",
    vibe: "Regal bearing — pride of the local community.",
    draft: "Power above all else.",
    freeAgency: "Aggressive about adding thump to the lineup.",
    trade: "Leans toward hitting over pitching upgrades.",
    strategy: "Prioritizes offense, willing to live with defensive risk.",
  },
  "Alexandria Cannons": {
    philosophy: "Balanced Baseball",
    tagline: "A steady team built on veteran presence.",
    vibe: "A historic port town — heavy and lethal in one blow.",
    draft: "Leans MLB-ready.",
    freeAgency: "Values experienced, mid-career-to-veteran players.",
    trade: "Favors steady additions over big swings.",
    strategy: "Plays a controlled game that avoids blowups.",
  },
  "Bethesda Blaze": {
    philosophy: "Rebuild",
    tagline: "A young, unsteady team still finding its footing.",
    vibe: "Suburban heat — a rising team with momentum.",
    draft: "Prioritizes youth and tools, but tempted by MLB-ready picks too.",
    freeAgency: "Sometimes overpays for young free agents it should avoid.",
    trade: "Should be selling veterans, but wavers for short-term fixes.",
    strategy: "Still inconsistent — results vary game to game.",
  },
  "Silver Spring Ghosts": {
    philosophy: "Pitching First",
    tagline: "A team that dominates games through pitching.",
    vibe: "Elusive and eerie — quietly creeping strength.",
    draft: "Starting pitching, control, defense-first catchers.",
    freeAgency: "Invests in starters, defense, and the bullpen.",
    trade: "Won't easily part with its pitching core.",
    strategy: "Values bullpen management, shifts, and low-scoring games.",
  },
}

export const DIVISION_TONE: Record<string, string> = {
  "North Division": "Gritty & street-smart",
  "Mid Division": "Blue-collar grind",
  "South Division": "Refined & authoritative",
}
