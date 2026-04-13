from utils.text_keywords import Scope1, Sustainable_sourcing, Impacts_of_transport, Other_Emmisions, Scope2, GHGReductions, Scope3, Impact_and_actions_of_supply_chain, chemical_products_manag, Biodiversity_sites, Imapct_mitigation_of_products_and_services, Impact_on_biodiversity, Climate_Change_Risks_and_Strategy

QUANT = {
    "GHG Emissions" : {r"scope\s*[123]", "direct", "GHG", "emission", "intensity", "GEI"}, #gei for spanish docs 
    "Other Air Emissions" : {"NOx", "SO2", r"PM\s*(\d*([,.]\d*))", "ozone", "ODS", "CFC"}, 
    "Energy": {"energy", "consumption", "diesel", "gas", "electricity"}, 
    "Water" : {"water", "agua", "withdraw", "discharge"}, #agua for water
    "Raw Materials and Packing" : {"card", "plast", "paper", "recy"}, 
    "Biodiversity": {"biodiversity", "protected", "species", "habitat"}, 
    "Waste and Spills": {"waste", "hazardous", "peligroso", "desecho"}, #peligrosos, desechos for spanish docs
    "Environmental Compliance": {"fines", "compliance", "Coast Guard", "Bureau"}, 
    "Environmental Grievance Mechanism": {"griev", "file", "resolv"}
}

QUANT_PATTERNS = {
    k: "|".join(v) for k,v in QUANT.items()
}

QUALITATIVE_PATTERNS = {
    "Scope1":{"patterns":Scope1.REGEX_PATTERN, "queries":Scope1.QUERIES},
    "Sustainable_sourcing":{"patterns":Sustainable_sourcing.REGEX_PATTERN, "queries":Sustainable_sourcing.QUERIES},
    "Impacts_of_transport":{"patterns":Impacts_of_transport.REGEX_PATTERN, "queries":Impacts_of_transport.QUERIES},
    "Other_Emmisions":{"patterns":Other_Emmisions.REGEX_PATTERN, "queries":Other_Emmisions.QUERIES},
    "Scope2":{"patterns":Scope2.REGEX_PATTERN, "queries":Scope2.QUERIES},
    "GHGReductions":{"patterns":GHGReductions.REGEX_PATTERN, "queries":GHGReductions.QUERIES},
    "Scope3":{"patterns":Scope3.REGEX_PATTERN, "queries":Scope3.QUERIES},
    "Impact_and_actions_of_supply_chain":{"patterns":Impact_and_actions_of_supply_chain.REGEX_PATTERN, "queries":Impact_and_actions_of_supply_chain.QUERIES},
    "chemical_products_manag":{"patterns":chemical_products_manag.REGEX_PATTERN, "queries":chemical_products_manag.QUERIES},
    "Biodiversity_sites":{"patterns":Biodiversity_sites.REGEX_PATTERN, "queries":Biodiversity_sites.QUERIES},
    "Imapct_mitigation_of_products_and_services":{"patterns":Imapct_mitigation_of_products_and_services.REGEX_PATTERN, "queries":Imapct_mitigation_of_products_and_services.QUERIES},
    "Impact_on_biodiversity":{"patterns":Impact_on_biodiversity.REGEX_PATTERN, "queries":Impact_on_biodiversity.QUERIES},
    "Climate_Change_Risks_and_Strategy":{"patterns":Climate_Change_Risks_and_Strategy.REGEX_PATTERN, "queries":Climate_Change_Risks_and_Strategy.QUERIES}
}

