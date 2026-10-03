import { describe, expect, it } from "vitest";
import { buildSportsCardTestAiQueries, filterTestAiListingsBySport } from "../shared/testAiCriteria";
import { buildEbayBrowseQuery, filterListingsByGrade, filterListingsByNumber, filterListingsByTargetGradingState } from "./testAIRouter";

describe("Test AI sports-card eBay query candidates", () => {
  it("preserves the target certification grade in precise sports-card Browse searches", () => {
    const query = "1989 Upper Deck Ken Griffey Jr 1 PSA 10";

    expect(buildEbayBrowseQuery(query, { preserveGrade: true })).toBe(query);
    expect(buildEbayBrowseQuery(query)).toBe("1989 Upper Deck Ken Griffey Jr 1 PSA");
  });

  it("keeps sports-card titles that omit the explicit card number", () => {
    const listings = [
      { title: "1989 Upper Deck Ken Griffey Jr Rookie PSA 10" },
      { title: "1989 Upper Deck Ken Griffey Jr #2 PSA 10" },
    ];

    expect(filterListingsByNumber(listings, "1", { allowMissingNumber: true })).toEqual([listings[0]]);
  });

  it("includes Sport and Product Format while omitting Product Name for Sports Cards Unopened Product", () => {
    const queries = buildSportsCardTestAiQueries(
      {
        year: "2024",
        manufacturer: "Topps",
        sport: "Hockey",
        productName: "Chrome Hobby Box",
        productFormat: "Box",
        authenticated: "yes",
        authenticationCompany: "BBCE",
        fromASealedCase: "yes",
      },
      "Listing title",
      "",
      "",
      "unopened_product",
    );

    expect(queries[0]).toContain("2024 Topps Hockey Box BBCE FASC");
    expect(queries[0]).not.toContain("Chrome Hobby Box");
    expect(queries[0]).not.toContain("from sealed case");
    expect(queries[0]).not.toContain("near_mint");
  });

  it("omits authentication and sealed-case criteria when their conditions are not yes", () => {
    const queries = buildSportsCardTestAiQueries(
      {
        sport: "Baseball",
        productName: "Retail Blaster",
        productFormat: "Box",
        authenticated: "no",
        authenticationCompany: "BBCE",
        fromASealedCase: "no",
      },
      "Listing title",
      "",
      "",
      "unopened_product",
    );

    expect(queries[0]).toBe("Baseball Box");
    expect(queries[0]).not.toContain("PSA");
    expect(queries[0]).not.toContain("BBCE");
    expect(queries[0]).not.toContain("FASC");
  });

  it("filters explicit conflicting sports while retaining matching and sparse titles", () => {
    const listings = [
      { title: "1987 O-Pee-Chee Hockey Box BBCE" },
      { title: "1987 O-Pee-Chee Baseball Box" },
      { title: "1987 O-Pee-Chee Box BBCE" },
    ];

    expect(filterTestAiListingsBySport(listings, "Hockey")).toEqual([listings[0], listings[2]]);
  });

  it("does not filter listings when no target sport is available", () => {
    const listings = [{ title: "1987 O-Pee-Chee Baseball Box" }, { title: "1987 O-Pee-Chee Box" }];
    expect(filterTestAiListingsBySport(listings, "")).toEqual(listings);
  });

  it("includes a broader Ken Griffey identity query when card-number formatting is too strict", () => {
    const queries = buildSportsCardTestAiQueries(
      { year: "1989", manufacturer: "Upper Deck", player: "Ken Griffey Jr", cardNumber: "1" },
      "Ken Griffey Jr Upper Deck Rookie PSA 10",
      "PSA",
      "10",
    );

    expect(queries).toContain("1989 Upper Deck Ken Griffey Jr 1 PSA 10");
    expect(queries).toContain("1989 Upper Deck Ken Griffey Jr PSA 10");
    expect(queries).toContain("Upper Deck Ken Griffey Jr PSA 10");
  });

  it("treats AFA Q60 and AFA 60.0 as the same numeric grade", () => {
    const listings = [
      { title: "Rare 1984 Hasbro Transformers G1 Megatron AFA Graded Q60 MIB" },
      { title: "Transformers Megatron AFA Q75" },
    ];

    expect(filterListingsByGrade(listings, 60, "vintage_toys", "AFA")).toEqual([listings[0]]);
  });

  it("excludes explicitly graded listings when the eBay target is raw or ungraded", () => {
    const listings = [
      { title: "2024 Upper Deck Macklin Celebrini Young Guns #451" },
      { title: "2024 Upper Deck Macklin Celebrini Young Guns #451 PSA 9" },
      { title: "2024 Upper Deck Macklin Celebrini Young Guns #451 graded slab" },
      { title: "2024 Upper Deck Macklin Celebrini Young Guns #451" },
    ];

    expect(filterListingsByTargetGradingState(listings, false)).toEqual([listings[0], listings[3]]);
    expect(filterListingsByTargetGradingState(listings, true)).toEqual(listings);
  });
});
