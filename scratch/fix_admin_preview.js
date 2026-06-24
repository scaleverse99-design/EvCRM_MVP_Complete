const fs = require('fs');
const path = 'app/admin/page.js';
let content = fs.readFileSync(path, 'utf8');

const oldLine = 'whiteSpace: "pre-wrap"';
const newLine = 'className="prose-admin-preview"';

if (content.includes(oldLine)) {
  content = content.replace(oldLine, newLine);
  console.log('Fixed opening div');
}

const oldContent = '                     {draft.summary || "Start writing your definitive briefing to see it take shape in real-time..."}';
// Since indentation is the issue, I will search for the string without the leading whitespace
const searchStr = '{draft.summary || "Start writing your definitive briefing to see it take shape in real-time..."}';
const regex = new RegExp('^\\s*' + searchStr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'm');

const newContent = `                    <ReactMarkdown 
                      remarkPlugins={[remarkGfm]}
                      components={{
                        h2: ({node, ...props}) => <h2 style={{ fontSize: 18, fontWeight: 900, color: "#0f172a", marginTop: 24, marginBottom: 12 }} {...props} />,
                        h3: ({node, ...props}) => <h3 style={{ fontSize: 15, fontWeight: 900, color: "#0f172a", marginTop: 16, marginBottom: 8 }} {...props} />,
                        p: ({node, ...props}) => <p style={{ marginBottom: 12 }} {...props} />,
                        table: ({node, ...props}) => <div style={{ overflowX: "auto", margin: "16px 0", background: "#f8fafc", borderRadius: 8, padding: 12 }}><table style={{ width: "100%", fontSize: 11, borderCollapse: "collapse" }} {...props} /></div>,
                        th: ({node, ...props}) => <th style={{ padding: 8, borderBottom: "2px solid #10b981", textAlign: "left" }} {...props} />,
                        td: ({node, ...props}) => <td style={{ padding: 8, borderBottom: "1px solid #e2e8f0" }} {...props} />
                      }}
                    >
                      {draft.summary || "Start writing your definitive briefing to see it take shape in real-time..."}
                    </ReactMarkdown>`;

if (regex.test(content)) {
  content = content.replace(regex, (match) => {
    // preserve original leading indentation for the first line but the script uses its own
    return newContent;
  });
  console.log('Fixed markdown content');
} else {
  console.log('Search content not found via regex');
}

fs.writeFileSync(path, content);
