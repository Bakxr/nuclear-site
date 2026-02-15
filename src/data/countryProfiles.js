/**
 * Country profiles for all 18 countries in NUCLEAR_SHARE.
 * Data sourced from IAEA PRIS, World Nuclear Association, and national energy agencies.
 * Last updated: February 2026
 */

export const COUNTRY_PROFILES = {
  "USA": {
    summary:
      "The United States operates the world's largest fleet of nuclear reactors with 94 units " +
      "across 54 plants, generating about 18.9% of national electricity and roughly 50% of the " +
      "country's carbon-free power.",
    policy:
      "Bipartisan support for nuclear energy has strengthened significantly. The Inflation " +
      "Reduction Act provides production tax credits for existing plants, and the ADVANCE Act " +
      "of 2024 streamlined NRC licensing for advanced reactors.",
    futurePlans:
      "Multiple SMR and advanced reactor projects are underway, including NuScale VOYGR, " +
      "X-energy Xe-100, and TerraPower Natrium. The DOE has set a target of 200 GW of nuclear " +
      "capacity by 2050, more than doubling the current fleet.",
    keyFacts: [
      { label: "First Reactor", value: "1958 (Shippingport)" },
      { label: "Grid Share", value: "18.9%" },
      { label: "Total Capacity", value: "97.0 GW" },
      { label: "Key Technology", value: "PWR / BWR" },
    ],
  },

  France: {
    summary:
      "France has the world's highest nuclear electricity share at 67.3%, with 57 reactors " +
      "generating the vast majority of the nation's power. The fleet is operated almost " +
      "entirely by state-controlled EDF.",
    policy:
      "President Macron reversed decades of planned nuclear reduction with the Belfort speech " +
      "in 2022, declaring nuclear essential to energy sovereignty and climate goals. France " +
      "champions nuclear energy within the EU.",
    futurePlans:
      "France plans to build 6 to 14 new EPR2 reactors by 2050 and is extending the lifetime " +
      "of existing reactors beyond 50 years. EDF is also developing the NUWARD SMR for " +
      "domestic and export markets.",
    keyFacts: [
      { label: "First Reactor", value: "1962 (Chinon A1)" },
      { label: "Grid Share", value: "67.3%" },
      { label: "Total Capacity", value: "63.0 GW" },
      { label: "Key Technology", value: "PWR (CP0/CPY/N4/EPR)" },
    ],
  },

  China: {
    summary:
      "China has the world's fastest-growing nuclear program with 57 operating reactors and " +
      "the largest construction pipeline globally. Nuclear provides about 4.9% of electricity, " +
      "a share that is rising rapidly as new units connect to the grid each year.",
    policy:
      "Nuclear power is a strategic national priority under China's Five-Year Plans. The " +
      "government approves 6-10 new reactor units per year and has developed indigenous " +
      "reactor designs including the Hualong One (HPR1000).",
    futurePlans:
      "China aims for 150 GW of nuclear capacity by 2035, nearly tripling its current fleet. " +
      "Advanced projects include the HTR-PM high-temperature gas reactor (operational), " +
      "CFR-600 fast reactor, and multiple SMR designs under development.",
    keyFacts: [
      { label: "First Reactor", value: "1991 (Qinshan-1)" },
      { label: "Grid Share", value: "4.9%" },
      { label: "Total Capacity", value: "55.8 GW" },
      { label: "Key Technology", value: "PWR (Hualong One / CPR-1000)" },
    ],
  },

  Japan: {
    summary:
      "Japan was once the world's third-largest nuclear power producer, but the 2011 " +
      "Fukushima Daiichi disaster led to the shutdown of all 54 reactors. As of 2024, " +
      "12 reactors have restarted under stringent new safety standards set by the NRA.",
    policy:
      "The government's GX (Green Transformation) policy adopted in 2023 reversed the " +
      "post-Fukushima phase-out stance, endorsing reactor restarts, lifetime extensions " +
      "beyond 60 years, and development of next-generation reactors.",
    futurePlans:
      "Japan targets restarting additional reactors to restore nuclear to 20-22% of its " +
      "energy mix by 2030. Utilities are pursuing restarts of roughly 15 more units, and " +
      "next-generation fast reactor and high-temperature reactor development is underway.",
    keyFacts: [
      { label: "First Reactor", value: "1966 (Tokai-1)" },
      { label: "Grid Share", value: "8.5%" },
      { label: "Total Capacity", value: "10.0 GW (operable: ~33 GW)" },
      { label: "Key Technology", value: "BWR / PWR" },
    ],
  },

  Russia: {
    summary:
      "Russia operates 36 reactors domestically and is the world's leading exporter of " +
      "nuclear technology through the state corporation Rosatom. Nuclear provides about " +
      "11.8% of Russia's electricity, concentrated in the European part of the country.",
    policy:
      "Nuclear energy is a cornerstone of Russian energy and industrial policy. Rosatom " +
      "operates as a vertically integrated state corporation with full fuel cycle " +
      "capabilities, from uranium mining and enrichment to spent fuel reprocessing.",
    futurePlans:
      "Russia is building multiple VVER-1200 units domestically and abroad in Egypt, " +
      "Turkey, Bangladesh, and India. Advanced projects include the BREST-300 lead-cooled " +
      "fast reactor and expansion of the floating nuclear power plant concept.",
    keyFacts: [
      { label: "First Reactor", value: "1954 (Obninsk, world's first)" },
      { label: "Grid Share", value: "11.8%" },
      { label: "Total Capacity", value: "27.7 GW" },
      { label: "Key Technology", value: "VVER (PWR variant)" },
    ],
  },

  "S. Korea": {
    summary:
      "South Korea operates 26 reactors providing 29.0% of the country's electricity, " +
      "making it one of the most nuclear-dependent nations. Korean reactors consistently " +
      "rank among the most efficiently operated in the world.",
    policy:
      "The Yoon administration reversed the previous government's phase-out policy in " +
      "2022, reinstating nuclear as a key pillar of energy security and designating it " +
      "a national strategic technology for export growth.",
    futurePlans:
      "South Korea plans to increase nuclear's share to over 30% by 2030 and is actively " +
      "exporting APR1400 reactors (Barakah, UAE). KHNP is pursuing new domestic builds " +
      "and competing for international contracts in Poland and Czech Republic.",
    keyFacts: [
      { label: "First Reactor", value: "1978 (Kori-1)" },
      { label: "Grid Share", value: "29.0%" },
      { label: "Total Capacity", value: "26.0 GW" },
      { label: "Key Technology", value: "PWR (APR1400 / OPR1000)" },
    ],
  },

  Canada: {
    summary:
      "Canada operates 19 CANDU reactors across Ontario and New Brunswick, generating " +
      "about 14.6% of national electricity. Ontario alone derives over 50% of its power " +
      "from nuclear energy, making it one of the cleanest grids in North America.",
    policy:
      "Nuclear is supported at both federal and provincial levels. Canada has positioned " +
      "itself as a leader in SMR deployment with a national SMR Action Plan, and maintains " +
      "a strong regulatory framework through the CNSC.",
    futurePlans:
      "Ontario Power Generation is building Canada's first SMR, the GE-Hitachi BWRX-300, " +
      "at the Darlington site. Bruce Power is pursuing a major refurbishment program to " +
      "extend its fleet to 2064, and New Brunswick is developing the ARC-100 SMR.",
    keyFacts: [
      { label: "First Reactor", value: "1962 (NPD, Rolphton)" },
      { label: "Grid Share", value: "14.6%" },
      { label: "Total Capacity", value: "13.6 GW" },
      { label: "Key Technology", value: "PHWR (CANDU)" },
    ],
  },

  Ukraine: {
    summary:
      "Ukraine operates 15 reactors at four sites, with nuclear providing 55.0% of the " +
      "country's electricity. This makes it the second-most nuclear-dependent country in " +
      "Europe after France. The fleet is crucial for national energy independence.",
    policy:
      "Despite the ongoing conflict and the Russian occupation of the Zaporizhzhia NPP " +
      "(Europe's largest nuclear plant), Ukraine remains firmly committed to nuclear power " +
      "and has diversified its fuel supply away from Russia to Westinghouse.",
    futurePlans:
      "Ukraine signed agreements for 9 new AP1000 reactors from Westinghouse to be built " +
      "at Khmelnytskyi and other sites. The country also plans to deploy Holtec SMR-160 " +
      "small modular reactors as part of post-war energy reconstruction.",
    keyFacts: [
      { label: "First Reactor", value: "1977 (Chernobyl-1)" },
      { label: "Grid Share", value: "55.0%" },
      { label: "Total Capacity", value: "13.1 GW" },
      { label: "Key Technology", value: "VVER-1000 / VVER-440" },
    ],
  },

  "UK": {
    summary:
      "The UK operates 9 reactors providing about 13.0% of national electricity. The " +
      "country was a nuclear pioneer, opening the world's first commercial nuclear power " +
      "station at Calder Hall in 1956.",
    policy:
      "The UK government designated nuclear as critical to achieving net-zero by 2050 " +
      "and established Great British Nuclear (GBN) in 2023 to accelerate new construction. " +
      "The Nuclear Energy (Financing) Act enables the Regulated Asset Base funding model.",
    futurePlans:
      "Hinkley Point C (3.2 GW EPR) is under construction with completion expected around " +
      "2030. Sizewell C (EPR) received government approval. The UK selected multiple SMR " +
      "designs through GBN, including Rolls-Royce SMR and GE-Hitachi BWRX-300.",
    keyFacts: [
      { label: "First Reactor", value: "1956 (Calder Hall)" },
      { label: "Grid Share", value: "13.0%" },
      { label: "Total Capacity", value: "5.9 GW" },
      { label: "Key Technology", value: "AGR / PWR / EPR (new)" },
    ],
  },

  Spain: {
    summary:
      "Spain operates 7 reactors at 5 sites, generating about 20.3% of the country's " +
      "electricity. The nuclear fleet provides reliable baseload power and is the nation's " +
      "largest single source of low-carbon electricity.",
    policy:
      "Spain's current government has adopted a nuclear phase-out policy, planning to " +
      "close all reactors between 2027 and 2035. However, debate continues as nuclear " +
      "remains the cheapest and most reliable low-carbon source on the Spanish grid.",
    futurePlans:
      "No new reactor construction is planned under current policy. Operators are seeking " +
      "license extensions to delay closures. The scheduled shutdown of Almaraz (2027) and " +
      "Cofrentes (2030) will be closely watched as tests of the phase-out commitment.",
    keyFacts: [
      { label: "First Reactor", value: "1968 (Jose Cabrera)" },
      { label: "Grid Share", value: "20.3%" },
      { label: "Total Capacity", value: "7.1 GW" },
      { label: "Key Technology", value: "PWR / BWR" },
    ],
  },

  Sweden: {
    summary:
      "Sweden operates 6 reactors at 3 sites, generating about 29.5% of the country's " +
      "electricity. Together with hydropower, nuclear makes Sweden's electricity grid one " +
      "of the cleanest in the world with minimal fossil fuel dependence.",
    policy:
      "The center-right government elected in 2022 reversed decades of nuclear skepticism, " +
      "removing the legal cap on reactor numbers and setting a target for the equivalent " +
      "of at least 2 new large reactors by 2035.",
    futurePlans:
      "Vattenfall and other utilities are evaluating new large reactors and SMRs. The " +
      "government has tasked regulators with preparing for new build licensing. Existing " +
      "reactors at Forsmark and Ringhals are approved for extended operation to 60+ years.",
    keyFacts: [
      { label: "First Reactor", value: "1972 (Oskarshamn-1)" },
      { label: "Grid Share", value: "29.5%" },
      { label: "Total Capacity", value: "6.9 GW" },
      { label: "Key Technology", value: "BWR / PWR" },
    ],
  },

  Belgium: {
    summary:
      "Belgium operates 5 reactors at 2 sites (Doel and Tihange), generating about " +
      "41.1% of the country's electricity. Nuclear is the single largest source of " +
      "electricity generation in Belgium by a significant margin.",
    policy:
      "After years of planned phase-out, Belgium reversed course in 2022, extending " +
      "the operational life of Doel 4 and Tihange 3 by 10 years to 2035 due to energy " +
      "security concerns following the European energy crisis.",
    futurePlans:
      "Engie-Electrabel and the Belgian government signed a framework agreement for " +
      "the 10-year extension of 2 GW of nuclear capacity. Beyond 2035, Belgium's " +
      "nuclear future remains uncertain, though interest in SMRs is growing.",
    keyFacts: [
      { label: "First Reactor", value: "1962 (BR3, Mol)" },
      { label: "Grid Share", value: "41.1%" },
      { label: "Total Capacity", value: "3.9 GW" },
      { label: "Key Technology", value: "PWR" },
    ],
  },

  "Czech Rep.": {
    summary:
      "The Czech Republic operates 6 VVER reactors at two sites, Dukovany and Temelin, " +
      "providing about 36.7% of national electricity. Nuclear is the backbone of Czech " +
      "baseload power generation and energy independence.",
    policy:
      "Nuclear energy enjoys strong bipartisan political support. The Czech government " +
      "views nuclear expansion as essential for energy security, coal replacement, and " +
      "reducing dependence on imported Russian natural gas.",
    futurePlans:
      "The Czech Republic selected South Korea's KHNP to build at least 2 new large " +
      "units at Dukovany, with an option for 2 more at Temelin. The first new unit is " +
      "targeted for commercial operation in the early 2030s.",
    keyFacts: [
      { label: "First Reactor", value: "1985 (Dukovany-1)" },
      { label: "Grid Share", value: "36.7%" },
      { label: "Total Capacity", value: "4.2 GW" },
      { label: "Key Technology", value: "VVER-440 / VVER-1000" },
    ],
  },

  Switzerland: {
    summary:
      "Switzerland operates 4 reactors at 4 sites, providing about 36.4% of the " +
      "country's electricity. Combined with abundant hydropower, this gives Switzerland " +
      "one of the lowest-carbon electricity grids in the world.",
    policy:
      "A 2017 referendum banned new nuclear construction, but existing plants are " +
      "allowed to operate as long as they are deemed safe by ENSI, the Swiss nuclear " +
      "safety regulator. There is no fixed shutdown date for current reactors.",
    futurePlans:
      "Beznau-1 (commissioned 1969) is the world's oldest operating power reactor. " +
      "Swiss utilities plan to operate existing reactors as long as safely possible. " +
      "Political debate on lifting the new-build ban has re-emerged amid energy " +
      "security concerns across Europe.",
    keyFacts: [
      { label: "First Reactor", value: "1969 (Beznau-1)" },
      { label: "Grid Share", value: "36.4%" },
      { label: "Total Capacity", value: "3.0 GW" },
      { label: "Key Technology", value: "PWR / BWR" },
    ],
  },

  Finland: {
    summary:
      "Finland operates 5 reactors providing about 39.1% of national electricity. " +
      "The completion of Olkiluoto 3 in 2023, Europe's largest reactor at 1.6 GW, " +
      "significantly boosted Finland's nuclear share and reduced import dependence.",
    policy:
      "Finland is strongly pro-nuclear, with broad political and public support. " +
      "Nuclear is classified as sustainable in Finnish energy policy and is seen as " +
      "essential for energy independence and meeting climate targets.",
    futurePlans:
      "Finland granted a construction license for Hanhikivi-1 (Rosatom) but terminated " +
      "the project in 2022 following the Russian invasion of Ukraine. New SMR and large " +
      "reactor proposals are under evaluation, including interest in Rolls-Royce SMR " +
      "and other Western designs.",
    keyFacts: [
      { label: "First Reactor", value: "1977 (Loviisa-1)" },
      { label: "Grid Share", value: "39.1%" },
      { label: "Total Capacity", value: "4.6 GW" },
      { label: "Key Technology", value: "BWR / VVER / EPR" },
    ],
  },

  India: {
    summary:
      "India operates 23 reactors generating about 3.1% of national electricity. India " +
      "has developed a unique indigenous three-stage nuclear program designed to " +
      "eventually utilize its vast thorium reserves for long-term energy security.",
    policy:
      "Nuclear energy is a strategic priority under India's Department of Atomic Energy. " +
      "India operates outside the NPT but gained access to international nuclear " +
      "commerce through the landmark 2008 India-US Civil Nuclear Agreement and NSG waiver.",
    futurePlans:
      "India has 8 reactors under construction including indigenous 700 MW PHWRs and " +
      "Russian VVER-1000 units at Kudankulam. The government targets 22.5 GW of nuclear " +
      "capacity by 2031 and is developing the AHWR thorium reactor as part of the " +
      "three-stage program.",
    keyFacts: [
      { label: "First Reactor", value: "1969 (Tarapur-1)" },
      { label: "Grid Share", value: "3.1%" },
      { label: "Total Capacity", value: "7.5 GW" },
      { label: "Key Technology", value: "PHWR / VVER / BWR" },
    ],
  },

  Pakistan: {
    summary:
      "Pakistan operates 6 reactors providing about 8.6% of national electricity. The " +
      "program relies heavily on Chinese-supplied reactors, with the Karachi (KANUPP) " +
      "and Chashma complexes forming the backbone of the civilian nuclear fleet.",
    policy:
      "Nuclear energy is managed by the Pakistan Atomic Energy Commission (PAEC). As a " +
      "non-NPT state, Pakistan's civil nuclear cooperation is largely limited to China " +
      "under bilateral agreements outside the NSG framework.",
    futurePlans:
      "Pakistan plans to expand nuclear capacity to 8.8 GW by 2030 with additional " +
      "Chinese Hualong One (HPR-1000) units. Chashma-5 and potential new coastal sites " +
      "are under consideration for future reactor construction.",
    keyFacts: [
      { label: "First Reactor", value: "1972 (KANUPP-1)" },
      { label: "Grid Share", value: "8.6%" },
      { label: "Total Capacity", value: "3.6 GW" },
      { label: "Key Technology", value: "PWR (Hualong One / CNP-300)" },
    ],
  },

  Argentina: {
    summary:
      "Argentina operates 3 reactors generating about 4.5% of national electricity. It " +
      "is the only country in Latin America with an indigenous nuclear technology " +
      "capability and has developed the CAREM small modular reactor domestically.",
    policy:
      "Nuclear energy is supported as a strategic technology for energy independence and " +
      "scientific development. Argentina's National Atomic Energy Commission (CNEA) " +
      "oversees the civil nuclear program including fuel cycle activities.",
    futurePlans:
      "Argentina is constructing CAREM-25, a domestically designed 32 MW small modular " +
      "reactor that will be the country's first SMR. A fourth large reactor (Atucha III, " +
      "a Chinese Hualong One) has been discussed but faces financing challenges due to " +
      "economic constraints.",
    keyFacts: [
      { label: "First Reactor", value: "1974 (Atucha-1)" },
      { label: "Grid Share", value: "4.5%" },
      { label: "Total Capacity", value: "1.6 GW" },
      { label: "Key Technology", value: "PHWR / PWR" },
    ],
  },
};
