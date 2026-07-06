/**
 * DETAILS LAYOUT MOCKUPS
 * A temporary preview page showing 5 different layout options for the
 * Item Detail page's "Details" section. Route: /details-mockups
 */

// Sample data representing a typical item (Star Wars CGC 9.4)
const SAMPLE_FIELDS = [
  { label: "Category", value: "Movies" },
  { label: "Grading Company", value: "CGC" },
  { label: "Estimated Value", value: "$125.00" },
  { label: "Item Type", value: "Individual Movie" },
  { label: "Certification Number", value: "1254054564" },
  { label: "Format", value: "VHS" },
  { label: "Is Graded", value: "Yes" },
  { label: "Quantity", value: "1" },
  { label: "Region", value: "USA" },
  { label: "Release Year", value: "1990" },
  { label: "Sealed", value: "Yes" },
  { label: "Shipping Available", value: "Yes" },
  { label: "Title", value: "Star Wars" },
  { label: "Description", value: "Sealed CGC 9.4, check out pictures" },
];

// ─────────────────────────────────────────────────────────────────────────────
// MOCKUP 1 — Classic 4-column zebra (alternating gray/white rows)
// ─────────────────────────────────────────────────────────────────────────────
function Mockup1() {
  const rows: (typeof SAMPLE_FIELDS)[] = [];
  for (let i = 0; i < SAMPLE_FIELDS.length; i += 4) {
    rows.push(SAMPLE_FIELDS.slice(i, i + 4));
  }
  return (
    <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-sm">
      <div className="px-6 py-4 border-b border-gray-200 bg-white">
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-500">Details</p>
      </div>
      <table className="w-full text-sm">
        <tbody>
          {rows.map((row, rowIdx) => (
            <tr key={rowIdx} className={rowIdx % 2 === 0 ? "bg-white" : "bg-gray-50"}>
              {row.map((field, colIdx) => (
                <td key={colIdx} className="px-5 py-3.5 border-r border-gray-100 last:border-r-0 w-1/4">
                  <span className="block text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-1">
                    {field.label}
                  </span>
                  <span className="block font-medium text-gray-900">{field.value}</span>
                </td>
              ))}
              {/* Pad short last row */}
              {row.length < 4 && Array.from({ length: 4 - row.length }).map((_, i) => (
                <td key={`pad-${i}`} className={`w-1/4 border-r border-gray-100 last:border-r-0 ${rowIdx % 2 === 0 ? "bg-white" : "bg-gray-50"}`} />
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MOCKUP 2 — 4-column zebra with a colored left-label column accent
// ─────────────────────────────────────────────────────────────────────────────
function Mockup2() {
  const rows: (typeof SAMPLE_FIELDS)[] = [];
  for (let i = 0; i < SAMPLE_FIELDS.length; i += 4) {
    rows.push(SAMPLE_FIELDS.slice(i, i + 4));
  }
  return (
    <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-sm">
      <div className="px-6 py-4 border-b border-gray-200 bg-white">
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-500">Details</p>
      </div>
      <table className="w-full text-sm">
        <tbody>
          {rows.map((row, rowIdx) => (
            <tr key={rowIdx} className={rowIdx % 2 === 0 ? "bg-white" : "bg-slate-50"}>
              {row.map((field, colIdx) => (
                <td key={colIdx} className="px-0 py-0 border-r border-gray-100 last:border-r-0 w-1/4">
                  <div className="flex h-full">
                    <div className="bg-slate-100 border-r border-slate-200 px-3 py-3.5 flex items-start">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 whitespace-nowrap">{field.label}</span>
                    </div>
                    <div className="px-4 py-3.5">
                      <span className="font-semibold text-gray-900">{field.value}</span>
                    </div>
                  </div>
                </td>
              ))}
              {row.length < 4 && Array.from({ length: 4 - row.length }).map((_, i) => (
                <td key={`pad-${i}`} className="w-1/4 border-r border-gray-100 last:border-r-0" />
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MOCKUP 3 — 4-column zebra with a teal/brand accent stripe on even rows
// ─────────────────────────────────────────────────────────────────────────────
function Mockup3() {
  const rows: (typeof SAMPLE_FIELDS)[] = [];
  for (let i = 0; i < SAMPLE_FIELDS.length; i += 4) {
    rows.push(SAMPLE_FIELDS.slice(i, i + 4));
  }
  return (
    <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-sm">
      <div className="px-6 py-4 border-b border-gray-200 bg-white flex items-center gap-3">
        <div className="h-4 w-1 rounded-full bg-teal-500" />
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-500">Details</p>
      </div>
      <table className="w-full text-sm">
        <tbody>
          {rows.map((row, rowIdx) => (
            <tr key={rowIdx} className={rowIdx % 2 === 0 ? "bg-white" : "bg-teal-50/60"}>
              {row.map((field, colIdx) => (
                <td key={colIdx} className="px-5 py-3.5 border-r border-gray-100 last:border-r-0 w-1/4">
                  <span className="block text-[10px] font-semibold uppercase tracking-widest text-teal-600 mb-1">
                    {field.label}
                  </span>
                  <span className="block font-semibold text-gray-900">{field.value}</span>
                </td>
              ))}
              {row.length < 4 && Array.from({ length: 4 - row.length }).map((_, i) => (
                <td key={`pad-${i}`} className="w-1/4 border-r border-gray-100 last:border-r-0" />
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MOCKUP 4 — 2-column label/value list (like a spec sheet), zebra rows
// ─────────────────────────────────────────────────────────────────────────────
function Mockup4() {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-sm">
      <div className="px-6 py-4 border-b border-gray-200 bg-white">
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-500">Details</p>
      </div>
      <div className="divide-y divide-gray-100">
        {SAMPLE_FIELDS.map((field, idx) => (
          <div key={idx} className={`grid grid-cols-[200px_1fr] ${idx % 2 === 0 ? "bg-white" : "bg-gray-50"}`}>
            <div className="px-6 py-3 border-r border-gray-100">
              <span className="text-[11px] font-semibold uppercase tracking-widest text-gray-500">{field.label}</span>
            </div>
            <div className="px-6 py-3">
              <span className="font-medium text-gray-900">{field.value}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MOCKUP 5 — 4-column zebra with a dark header row and pill-style values
// ─────────────────────────────────────────────────────────────────────────────
function Mockup5() {
  const rows: (typeof SAMPLE_FIELDS)[] = [];
  for (let i = 0; i < SAMPLE_FIELDS.length; i += 4) {
    rows.push(SAMPLE_FIELDS.slice(i, i + 4));
  }
  return (
    <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-sm">
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-900">
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">Details</p>
      </div>
      <table className="w-full text-sm">
        <tbody>
          {rows.map((row, rowIdx) => (
            <tr key={rowIdx} className={rowIdx % 2 === 0 ? "bg-white" : "bg-gray-50"}>
              {row.map((field, colIdx) => (
                <td key={colIdx} className="px-5 py-4 border-r border-gray-100 last:border-r-0 w-1/4 align-top">
                  <span className="block text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-2">
                    {field.label}
                  </span>
                  <span className="inline-block bg-gray-100 text-gray-900 font-semibold text-xs px-3 py-1.5 rounded-full">
                    {field.value}
                  </span>
                </td>
              ))}
              {row.length < 4 && Array.from({ length: 4 - row.length }).map((_, i) => (
                <td key={`pad-${i}`} className="w-1/4 border-r border-gray-100 last:border-r-0" />
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main page component
// ─────────────────────────────────────────────────────────────────────────────
export default function DetailsLayoutMockups() {
  const mockups = [
    {
      id: 1,
      title: "Option 1 — Classic 4-Column Zebra",
      description: "Clean alternating white/gray rows, 4 fields per row. Labels sit above values in each cell. Simple and highly readable.",
      component: <Mockup1 />,
    },
    {
      id: 2,
      title: "Option 2 — 4-Column Zebra with Label Sidebar",
      description: "Each cell is split: the label sits in a shaded left column, the value in a clean right column. Creates a clear label-to-value relationship within each cell.",
      component: <Mockup2 />,
    },
    {
      id: 3,
      title: "Option 3 — 4-Column Zebra with Teal Accent",
      description: "Same 4-column zebra structure but odd rows are tinted with a soft teal, matching the site's trade button color. Labels are teal-colored for a branded feel.",
      component: <Mockup3 />,
    },
    {
      id: 4,
      title: "Option 4 — 2-Column Spec Sheet",
      description: "A classic specification-sheet layout: label column on the left, value on the right, zebra rows. More compact vertically and very easy to read top-to-bottom.",
      component: <Mockup4 />,
    },
    {
      id: 5,
      title: "Option 5 — 4-Column Zebra with Dark Header & Pill Values",
      description: "4-column zebra with a dark charcoal header bar. Values are displayed as pill badges, giving a modern 'tag' feel. Great for items with short values.",
      component: <Mockup5 />,
    },
  ];

  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4">
      <div className="mx-auto max-w-5xl">
        <div className="mb-10 text-center">
          <h1 className="text-3xl font-bold text-gray-900">Details Section — Layout Mockups</h1>
          <p className="mt-2 text-gray-500">5 design options for the item detail page's information grid. Review each and pick your favorite.</p>
          <p className="mt-1 text-sm text-gray-400">Sample data: Star Wars CGC 9.4 (Movies category)</p>
        </div>

        <div className="space-y-14">
          {mockups.map((m) => (
            <div key={m.id}>
              <div className="mb-4">
                <h2 className="text-xl font-bold text-gray-800">{m.title}</h2>
                <p className="mt-1 text-sm text-gray-500">{m.description}</p>
              </div>
              {m.component}
            </div>
          ))}
        </div>

        <div className="mt-14 rounded-2xl border border-blue-200 bg-blue-50 p-6 text-center">
          <p className="text-sm text-blue-700 font-medium">
            This is a temporary preview page. Once you choose a design, it will be implemented in the live Item Detail page and this page will be removed.
          </p>
        </div>
      </div>
    </div>
  );
}
