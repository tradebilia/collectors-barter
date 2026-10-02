import { describe, expect, it } from 'vitest';
import { buildSiriusSearchRequest, normalizeSiriusSale, parseSiriusAuctionResultsHtml, parseSiriusLotHtml } from './siriusSportsAuctionMarketData';

describe('Sirius Sports Auctions adapter', () => {
  const target = { title: '1993 Finest 1 Michael Jordan', category: 'sports_cards', grade: '8', certificationCompany: 'PSA', itemDetails: JSON.stringify({ player: 'Michael Jordan', setName: '1993 Finest', cardNumber: '1' }) };

  it('builds a structured all-auctions ASP.NET search request', () => {
    const request = buildSiriusSearchRequest(target);
    expect(request.url).toBe('https://siriussportsauctions.com/auctionresults.aspx');
    expect(request.query).toContain('Michael Jordan');
    expect(request.query).toContain('1993 Finest');
    expect(request.form.auctionId).toBe('-1');
    expect(request.form.searchBy).toBe('3');
  });

  it('parses bounded result rows and public lot links', () => {
    const html = `<table id="SearchGrid"><tr><th>Auction Name</th><th>Lot Number</th><th>Title</th><th>Min Bid</th><th>Final Price</th><th>Status</th></tr><tr><td>Sirius Sports Cards Auction # 422 - Ends 8/20/26</td><td>781</td><td>1993 FINEST 1 MICHAEL JORDAN PSA NM-MT 8</td><td>$1.00</td><td>$319.50</td><td>OVER</td><td><a href="AuctionResults.aspx?auctionid=435">auction</a><a href="LotDetail.aspx?inventoryid=1747581">lot</a></td></tr></table>`;
    const rows = parseSiriusAuctionResultsHtml(html);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ lotId: '781', finalPrice: 319.5, status: 'over', url: 'https://siriussportsauctions.com/LotDetail.aspx?inventoryid=1747581' });
  });

  it('parses closed detail pages with final price including buyers premium and close date', () => {
    const html = `<div id="PageBase"><div id="AuctionName">Sirius Sports Cards Auction # 422 - Ends 8/20/26</div><div id="LotInfo"><h1>1993 FINEST 1 MICHAEL JORDAN PSA NM-MT 8</h1></div><div id="Description">1993 FINEST 1 MICHAEL JORDAN PSA NM-MT 8</div><div id="ClosedItem">This lot is closed for bidding. Bidding ended on 8/21/2026</div><div id="BiddingSummary">Final prices include buyers premium.: $319.50</div></div>`;
    expect(parseSiriusLotHtml(html)).toMatchObject({ title: '1993 FINEST 1 MICHAEL JORDAN PSA NM-MT 8', finalPrice: 319.5, closed: true, date: '8/21/2026' });
  });

  it('admits only explicit closed, dated, priced, identity-and-grade-compatible lots', () => {
    const summary: any = { auctionName: 'Sirius Sports Cards Auction # 422', lotId: '781', title: '1993 FINEST 1 MICHAEL JORDAN PSA NM-MT 8', minBid: 1, finalPrice: 319.5, status: 'over', url: 'https://siriussportsauctions.com/LotDetail.aspx?inventoryid=1747581', auctionUrl: null };
    const sold = normalizeSiriusSale(summary, { title: summary.title, description: summary.title, lotId: '781', finalPrice: 319.5, date: '8/21/2026', closed: true, auctionName: summary.auctionName }, target);
    const open = normalizeSiriusSale(summary, { title: summary.title, finalPrice: 319.5, closed: false }, target);
    const wrongGrade = normalizeSiriusSale(summary, { title: '1993 FINEST 1 MICHAEL JORDAN PSA NM-MT 9', finalPrice: 319.5, date: '8/21/2026', closed: true }, target);
    expect(sold).toMatchObject({ completed: true, sold: true, price: 319.5, priceBasis: 'realized', buyerPremiumIncluded: true, identityMatched: true });
    expect(open).toMatchObject({ completed: false, sold: false, price: null });
    expect(wrongGrade.identityMatched).toBe(false);
  });
});
