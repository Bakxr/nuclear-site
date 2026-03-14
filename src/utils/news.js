const COUNTRY_KEYWORDS = [
  ["United States", ["united states", "u.s.", "us ", "america", "wyoming", "texas", "nrc", "doe"]],
  ["Canada", ["canada", "ontario", "darlington", "candu"]],
  ["China", ["china", "cnnc", "cgn"]],
  ["France", ["france", "french", "edf"]],
  ["United Kingdom", ["united kingdom", "uk ", "britain", "british", "rolls-royce"]],
  ["Ukraine", ["ukraine", "chernobyl"]],
  ["Lithuania", ["lithuania"]],
  ["Poland", ["poland", "polish"]],
  ["Japan", ["japan", "japanese", "fukushima"]],
  ["South Korea", ["south korea", "korea", "korean"]],
  ["India", ["india", "indian"]],
  ["Russia", ["russia", "russian", "rosatom"]],
  ["Belgium", ["belgium", "belgian"]],
  ["Iran", ["iran", "iranian"]],
  ["Sweden", ["sweden", "swedish"]],
];

export function inferNewsLocation(article) {
  const text = `${article?.title || ""} ${article?.curiosityHook || ""} ${article?.whyItMatters || ""}`.toLowerCase();

  for (const [country, patterns] of COUNTRY_KEYWORDS) {
    if (patterns.some((pattern) => text.includes(pattern))) {
      return country;
    }
  }

  return null;
}
