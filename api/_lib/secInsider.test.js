import { describe, expect, it } from "vitest";
import { parseForm4Xml } from "./secInsider.js";

const FORM4 = `<?xml version="1.0"?>
<ownershipDocument>
  <reportingOwner>
    <reportingOwnerId><rptOwnerName>Doe, Jane</rptOwnerName></reportingOwnerId>
    <reportingOwnerRelationship>
      <isDirector>0</isDirector>
      <isOfficer>1</isOfficer>
      <officerTitle>CFO</officerTitle>
    </reportingOwnerRelationship>
  </reportingOwner>
  <nonDerivativeTable>
    <nonDerivativeTransaction>
      <transactionDate><value>2026-05-01</value></transactionDate>
      <transactionAmounts>
        <transactionShares><value>1000</value></transactionShares>
        <transactionPricePerShare><value>25.5</value></transactionPricePerShare>
        <transactionAcquiredDisposedCode><value>A</value></transactionAcquiredDisposedCode>
      </transactionAmounts>
    </nonDerivativeTransaction>
    <nonDerivativeTransaction>
      <transactionDate><value>2026-05-02</value></transactionDate>
      <transactionAmounts>
        <transactionShares><value>500</value></transactionShares>
        <transactionPricePerShare><value>26</value></transactionPricePerShare>
        <transactionAcquiredDisposedCode><value>D</value></transactionAcquiredDisposedCode>
      </transactionAmounts>
    </nonDerivativeTransaction>
  </nonDerivativeTable>
</ownershipDocument>`;

describe("parseForm4Xml", () => {
  it("parses buys and sells with totals", () => {
    const rows = parseForm4Xml(FORM4, { ticker: "CCJ", url: "https://example/doc.xml" });
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      ticker: "CCJ",
      filer: "Doe, Jane",
      title: "CFO",
      transactionType: "buy",
      shares: 1000,
      pricePerShare: 25.5,
      totalValue: 25500,
    });
    expect(rows[1].transactionType).toBe("sell");
  });

  it("returns [] for empty input", () => {
    expect(parseForm4Xml("", {})).toEqual([]);
    expect(parseForm4Xml(null, {})).toEqual([]);
  });
});
