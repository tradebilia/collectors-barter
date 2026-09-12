import json
from pathlib import Path
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Border, Side, Alignment
from openpyxl.worksheet.table import Table, TableStyleInfo
from openpyxl.worksheet.datavalidation import DataValidation
from openpyxl.utils import get_column_letter

ROOT = Path('/home/ubuntu/tradebilia-isolated-development')
source = json.loads((ROOT / 'scripts/test_ai_query_audit.json').read_text())
rows = source['rows']
output = ROOT / 'exports' / 'tradebilia_test_ai_query_audit.xlsx'
output.parent.mkdir(parents=True, exist_ok=True)

wb = Workbook()
ws = wb.active
ws.title = 'Read Me'
navy = '18243A'
blue = '245B9E'
light_blue = 'DCEAF7'
yellow = 'FFF2CC'
green = 'E2F0D9'
orange = 'FCE4D6'
gray = 'F2F2F2'
white = 'FFFFFF'
thin_gray = Side(style='thin', color='D9E2F3')

for sheet in wb.worksheets:
    sheet.sheet_view.showGridLines = False

def style_header(sheet, row=1):
    for cell in sheet[row]:
        cell.font = Font(bold=True, color=white)
        cell.fill = PatternFill('solid', fgColor=navy)
        cell.alignment = Alignment(horizontal='center', vertical='center', wrap_text=True)
        cell.border = Border(bottom=Side(style='medium', color=blue))
    sheet.row_dimensions[row].height = 32

def add_table(sheet, ref, name):
    tab = Table(displayName=name, ref=ref)
    tab.tableStyleInfo = TableStyleInfo(name='TableStyleMedium2', showFirstColumn=False, showLastColumn=False, showRowStripes=True, showColumnStripes=False)
    sheet.add_table(tab)

def autosize(sheet, max_width=55):
    for col in range(1, sheet.max_column + 1):
        letter = get_column_letter(col)
        values = [str(sheet.cell(r, col).value or '') for r in range(1, min(sheet.max_row, 120) + 1)]
        width = min(max(max((len(v) for v in values), default=10) + 2, 10), max_width)
        sheet.column_dimensions[letter].width = width

# Read Me
ws['A1'] = 'Tradebilia Test AI Query Audit Workbook'
ws['A1'].font = Font(size=18, bold=True, color=white)
ws['A1'].fill = PatternFill('solid', fgColor=navy)
ws.merge_cells('A1:F1')
ws['A3'] = 'Purpose'
ws['B3'] = 'Audit the current category/item-type field definitions and the query fields that Test AI sends to marketplace, sold-comps, and catalog/reference sources.'
ws['A4'] = 'Generated'
ws['B4'] = source['generatedAt']
ws['A5'] = 'Coverage'
ws['B5'] = f"{len(rows)} category/item-type mappings across {len(set(r['category'] for r in rows))} categories."
ws['A7'] = 'How to use this workbook'
ws['A8'] = '1. Start with Query Mapping to review the current source behavior for each category.'
ws['A9'] = '2. Use Field Detail to audit every stored field, requirement, conditional rule, and dropdown option for every item type.'
ws['A10'] = '3. Use Upload Template to propose revised mappings. Keep one row per category, item type, field, and provider scope.'
ws['A11'] = '4. The workbook is an audit/export artifact; uploading changes requires a separate import process and validation.'
ws['A13'] = 'Important current behavior'
ws['A14'] = 'The current implementation is source-specific. A field may be available in the inventory form but not yet used by every provider. Query Mapping documents those differences instead of assuming all sources behave identically.'
ws['A15'] = 'Sports Cards Unopened Product currently uses Sport + Product Format, omits Product Name and Condition, adds Authentication Company only when Authenticated = Yes, and adds FASC only when From A Sealed Case = Yes.'
ws['A16'] = 'Music/Discogs uses Album / Release Title, Artist / Performer, and optional Release Year. Saved format, label, country, and catalog number are not restrictive Discogs filters.'
for row in range(3, 17):
    ws[f'A{row}'].font = Font(bold=True, color=navy)
    ws[f'A{row}'].alignment = Alignment(vertical='top', wrap_text=True)
    ws[f'B{row}'].alignment = Alignment(vertical='top', wrap_text=True)
ws.column_dimensions['A'].width = 28
ws.column_dimensions['B'].width = 110
ws.freeze_panes = 'A3'

# Category & Item Types
ws = wb.create_sheet('Category Item Types')
headers = ['Category', 'Item Type Key', 'Field Count', 'Field Names', 'Notes']
ws.append(headers)
for r in rows:
    ws.append([r['category'], r['itemType'], len(r['fields']), '; '.join(f['name'] for f in r['fields']), 'Review Query Mapping for provider-specific query behavior.'])
style_header(ws)
add_table(ws, f'A1:E{ws.max_row}', 'CategoryItemTypes')
ws.freeze_panes = 'A2'
autosize(ws, 80)

# Query Mapping
ws = wb.create_sheet('Query Mapping')
headers = ['Category', 'Item Type Key', 'Active eBay Query Fields', 'Sold-Comps Query Fields', 'Other Sources / Reference', 'Conditional Rules', 'Excluded or Not Yet Used', 'Implementation Notes']
ws.append(headers)
for r in rows:
    q = r['query']
    ws.append([r['category'], r['itemType'], q['activeEbay'], q['soldComps'], q['otherSources'], q['conditionalRules'], q['excludedFields'], q['notes']])
style_header(ws)
for row in ws.iter_rows(min_row=2):
    for cell in row:
        cell.alignment = Alignment(vertical='top', wrap_text=True)
add_table(ws, f'A1:H{ws.max_row}', 'QueryMapping')
ws.freeze_panes = 'A2'
autosize(ws, 68)

# Field Detail
ws = wb.create_sheet('Field Detail')
headers = ['Category', 'Item Type Key', 'Field Name', 'Field Label', 'Input Type', 'Requirement', 'Conditional Logic', 'Dropdown Options', 'Supports Other', 'Query Relevance / Review']
ws.append(headers)
for r in rows:
    for f in r['fields']:
        relevance = 'Form field; verify against Query Mapping before adding to a provider query.'
        if f['name'] in {'listingTitle', 'title'}:
            relevance = 'Fallback identity/title input; may be used when structured identity fields are missing.'
        elif f['name'] in {'year', 'releaseYear', 'manufactureYear'}:
            relevance = 'Often used as an identity or narrowing field where the provider supports it.'
        elif f['name'] in {'condition', 'grade', 'certificationCompany', 'gradingCompany', 'authenticationCompany'}:
            relevance = 'Conditional market/query evidence field; provider-specific behavior applies.'
        ws.append([r['category'], r['itemType'], f['name'], f['label'], f['inputType'], f['requirement'], f['conditionalLogic'], f['options'], f['supportsOther'], relevance])
style_header(ws)
for row in ws.iter_rows(min_row=2):
    for cell in row:
        cell.alignment = Alignment(vertical='top', wrap_text=True)
add_table(ws, f'A1:J{ws.max_row}', 'FieldDetail')
ws.freeze_panes = 'A2'
autosize(ws, 58)

# Provider behavior
ws = wb.create_sheet('Provider Behavior')
headers = ['Provider / Source', 'Current Status', 'Categories / Item Types', 'Primary Query / Lookup Fields', 'Fallback Behavior', 'Restrictions / Audit Notes']
ws.append(headers)
provider_rows = [
    ['eBay Active Listings', 'Live source', 'Most marketplace categories', 'Category-specific router branch; otherwise title + certification company + grade', 'Broader identity/title candidates are used for sports cards', 'Read-only marketplace evidence; exact provider response may vary.'],
    ['eBay Sold History / Sold-Comps', 'Live source', 'Most marketplace categories', 'Category-specific completed-sales branches for comics, sports cards, video games, movies, Pokemon, stamps, vintage toys, Disney Pins', 'Falls back to generic title/grade behavior when no dedicated branch applies', 'Treat completed sales as evidence, not guaranteed valuation.'],
    ['130Point / Sold Sales', 'Live or configured source', 'Sports cards and other supported items', 'User-facing title query', 'No structured category-specific query contract documented in current Test AI', 'Provider availability and response format are source-specific.'],
    ['Discogs Music Catalog', 'Live source', 'Music', 'Album / Release Title + Artist / Performer; optional Release Year', 'Year-first search, broad title/artist retry if year returns no candidates', 'Catalog identity/pressing evidence; not a valuation source.'],
    ['PSA / Beckett certificate lookup', 'Live for supported paths', 'Certified cards / supported certificate types', 'Certificate ID and grading company', 'No certificate result means market search may remain unavailable for cert-direct mode', 'Verification evidence, not completed-sale value.'],
    ['PCGS CoinFacts', 'Configured/reference', 'Coins', 'Certificate or coin identity fields where supported', 'No dedicated generic market query branch', 'Reference and auction context; check provider rights and limits.'],
    ['IGDB / RAWG / TCGdex / Smithsonian / Wikidata', 'Reference/catalog sources', 'Video games, Pokemon, general references', 'Title, platform, set, creator, or catalog identity', 'Not used as direct market valuation evidence', 'Metadata supports identity matching only.'],
    ['GoCollect / Heritage / Comic Book Realm / PWCC / Parse.bot placeholders', 'Placeholder or conditional', 'Category-specific', 'Not a verified active query contract in this workbook', 'No production reliance unless authorized and enabled', 'Do not infer active access from a visible source button.'],
]
for r in provider_rows: ws.append(r)
style_header(ws)
for row in ws.iter_rows(min_row=2):
    for cell in row: cell.alignment = Alignment(vertical='top', wrap_text=True)
add_table(ws, f'A1:F{ws.max_row}', 'ProviderBehavior')
ws.freeze_panes = 'A2'
autosize(ws, 62)

# Upload Template
ws = wb.create_sheet('Upload Template')
headers = ['Category', 'Item Type Key', 'Provider Scope', 'Query Order', 'Field Name', 'Include Rule', 'Query Token / Transformation', 'Enabled', 'Notes']
ws.append(headers)
# Seed the template with rows reflecting the current Sports Cards Unopened Product and Discogs rules plus blank examples for all mappings.
template_rows = [
    ['sports_cards', 'unopened_product', 'eBay + Sold-Comps', 1, 'sport', 'Always when supplied', 'Use sport or customSport value', 'Yes', 'Current revised rule'],
    ['sports_cards', 'unopened_product', 'eBay + Sold-Comps', 2, 'productFormat', 'Always when supplied', 'Use Product Format value', 'Yes', 'Current revised rule'],
    ['sports_cards', 'unopened_product', 'eBay + Sold-Comps', 3, 'authenticationCompany', 'Only when authenticated = yes', 'Append authentication company', 'Yes', 'Do not use when Authenticated = no'],
    ['sports_cards', 'unopened_product', 'eBay + Sold-Comps', 4, 'fromASealedCase', 'Only when fromASealedCase = yes', 'Emit exact token FASC', 'Yes', 'Omit entirely when no'],
    ['music', 'vinyl_record', 'Discogs', 1, 'releaseTitle', 'Required', 'Send as release_title and q', 'Yes', 'Album / Release Title, not listing title'],
    ['music', 'vinyl_record', 'Discogs', 2, 'artist', 'Required', 'Send as artist', 'Yes', 'Artist / Performer'],
    ['music', 'vinyl_record', 'Discogs', 3, 'releaseYear', 'Optional and valid', 'Year-first filter with broad fallback', 'Yes', 'Do not hide valid results if year has no match'],
]
for r in template_rows: ws.append(r)
style_header(ws)
for row in ws.iter_rows(min_row=2):
    for cell in row: cell.alignment = Alignment(vertical='top', wrap_text=True)
add_table(ws, f'A1:I{ws.max_row}', 'UploadTemplate')
ws.freeze_panes = 'A2'
autosize(ws, 55)
# Data validations to make future uploads consistent.
dv_enabled = DataValidation(type='list', formula1='"Yes,No"', allow_blank=True)
ws.add_data_validation(dv_enabled)
dv_enabled.add(f'H2:H5000')
dv_scope = DataValidation(type='list', formula1='"eBay Active Listings,Sold-Comps,Discogs,PSA,PCGS,Reference,All"', allow_blank=True)
ws.add_data_validation(dv_scope)
dv_scope.add(f'C2:C5000')

# Apply consistent formatting and print settings
for sheet in wb.worksheets:
    sheet.sheet_properties.pageSetUpPr.fitToPage = True
    sheet.page_setup.fitToWidth = 1
    sheet.page_setup.fitToHeight = 0
    sheet.sheet_view.zoomScale = 90
    for row in sheet.iter_rows():
        for cell in row:
            if cell.value is not None:
                cell.alignment = Alignment(vertical='top', wrap_text=True)
    if sheet.max_row > 1:
        sheet.auto_filter.ref = sheet.dimensions if sheet.title in {'Read Me'} else None

# Highlight the two highest-risk audit areas.
for sheet_name in ['Query Mapping', 'Upload Template']:
    sheet = wb[sheet_name]
    for row in sheet.iter_rows(min_row=2):
        if row[0].value == 'sports_cards' and row[1].value == 'unopened_product':
            for cell in row:
                cell.fill = PatternFill('solid', fgColor=yellow)
        if row[0].value == 'music' and row[1].value == 'vinyl_record':
            for cell in row:
                cell.fill = PatternFill('solid', fgColor=green)

wb.save(output)
print(output)
