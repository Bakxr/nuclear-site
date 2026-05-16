import { describe, expect, it } from "vitest";
import { __parseRssForTest as parseRss } from "./nrcDockets.js";

const RSS = `<?xml version="1.0"?>
<rss><channel>
  <item>
    <title>NRC Issues License Amendment to Vogtle Unit 4</title>
    <link>https://www.nrc.gov/x1</link>
    <description>Routine licensing action for Vogtle</description>
    <pubDate>Wed, 14 May 2026 12:00:00 GMT</pubDate>
  </item>
  <item>
    <title>NRC Schedules Inspection at Diablo Canyon</title>
    <link>https://www.nrc.gov/x2</link>
    <description>Reactor inspection planned</description>
    <pubDate>Tue, 13 May 2026 12:00:00 GMT</pubDate>
  </item>
  <item>
    <title>Recipe for cookies</title>
    <link>https://www.nrc.gov/x3</link>
    <description>Unrelated content</description>
    <pubDate>Mon, 12 May 2026 12:00:00 GMT</pubDate>
  </item>
</channel></rss>`;

describe("nrcDockets parseRss", () => {
  it("keeps nuclear-relevant items and classifies actions", () => {
    const rows = parseRss(RSS);
    expect(rows.length).toBe(2);
    expect(rows[0]).toMatchObject({ action: "Licensing", plant: "Vogtle" });
    expect(rows[1]).toMatchObject({ action: "Inspection", plant: "Diablo Canyon" });
  });
});
