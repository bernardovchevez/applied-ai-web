import type { SourceCitation } from "@/lib/types";

export function CitationList({ sources }: { sources: SourceCitation[] }) {
  if (sources.length === 0) return null;
  return (
    <div className="citations">
      <p className="label">Sources</p>
      <ul>
        {sources.map((s, i) => (
          <li key={`${s.file_name}-${s.chunk_index ?? i}`}>
            <code>{s.file_name}</code>
            {s.doc_type ? <span className="meta">{s.doc_type}</span> : null}
            {s.rights_tier ? <span className="meta">{s.rights_tier}</span> : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
