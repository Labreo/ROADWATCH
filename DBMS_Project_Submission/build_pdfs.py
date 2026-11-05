import os
import subprocess
import re

CHROME_BIN = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
BASE_DIR = "/Users/sanjaywaradkar/ROADWATCH/DBMS_Project_Submission"

HTML_TEMPLATE = """<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>{{TITLE}}</title>
    <style>
        @page {
            size: A4;
            margin: 20mm 18mm 20mm 18mm;
            @bottom-right {
                content: counter(page);
            }
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            font-size: 11pt;
            line-height: 1.6;
            color: #1e293b;
            background: #ffffff;
            margin: 0;
            padding: 30px 40px;
        }
        h1, h2, h3, h4 {
            color: #0f172a;
            font-weight: 700;
            margin-top: 1.4em;
            margin-bottom: 0.5em;
            line-height: 1.25;
        }
        h1 {
            font-size: 22pt;
            border-bottom: 2.5px solid #2563eb;
            padding-bottom: 8px;
            margin-top: 0;
            color: #1e3a8a;
        }
        h2 {
            font-size: 15pt;
            border-bottom: 1.5px solid #cbd5e1;
            padding-bottom: 4px;
            color: #1e40af;
            page-break-after: avoid;
        }
        h3 {
            font-size: 12.5pt;
            color: #334155;
            page-break-after: avoid;
        }
        p, ul, ol {
            margin-top: 0.4em;
            margin-bottom: 0.8em;
        }
        li {
            margin-bottom: 0.3em;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 1.2em 0;
            font-size: 9.5pt;
            page-break-inside: auto;
        }
        tr {
            page-break-inside: avoid;
            page-break-after: auto;
        }
        th, td {
            border: 1px solid #cbd5e1;
            padding: 7px 10px;
            text-align: left;
            vertical-align: top;
        }
        th {
            background-color: #f1f5f9;
            color: #0f172a;
            font-weight: 600;
        }
        tr:nth-child(even) td {
            background-color: #f8fafc;
        }
        code, pre {
            font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
        }
        code {
            background-color: #f1f5f9;
            padding: 2px 5px;
            border-radius: 4px;
            font-size: 9pt;
            color: #0369a1;
        }
        pre {
            background-color: #0f172a;
            color: #f8fafc;
            padding: 14px 18px;
            border-radius: 6px;
            font-size: 8.5pt;
            line-height: 1.45;
            overflow-x: auto;
            page-break-inside: avoid;
        }
        pre code {
            background-color: transparent;
            color: inherit;
            padding: 0;
            border-radius: 0;
        }
        blockquote {
            margin: 1em 0;
            padding: 10px 18px;
            background-color: #eff6ff;
            border-left: 4px solid #2563eb;
            color: #1e3a8a;
            border-radius: 0 4px 4px 0;
        }
        blockquote strong {
            color: #1d4ed8;
        }
        .header-meta {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 14px 18px;
            margin-bottom: 24px;
            font-size: 10pt;
        }
        .img-container {
            text-align: center;
            margin: 20px auto;
            page-break-inside: avoid;
        }
        .img-container img {
            max-width: 100%;
            max-height: 220mm;
            width: auto;
            height: auto;
            border: 1px solid #cbd5e1;
            border-radius: 6px;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.08);
            display: inline-block;
        }
        .caption {
            font-size: 9.5pt;
            color: #475569;
            margin-top: 8px;
            font-style: italic;
            font-weight: 500;
        }
        .page-break {
            page-break-before: always;
        }
    </style>
</head>
<body>
{{BODY}}
</body>
</html>
"""

def simple_md_to_html(md_text, is_doc3=False):
    # Process alerts
    md_text = re.sub(r'> \[!IMPORTANT\]\n> (.*?)\n>\n', r'<blockquote><strong>IMPORTANT:</strong> \1</blockquote>\n', md_text, flags=re.DOTALL)
    md_text = re.sub(r'> \[!NOTE\]\n> (.*?)\n>\n', r'<blockquote><strong>NOTE:</strong> \1</blockquote>\n', md_text, flags=re.DOTALL)

    html_lines = []
    in_code = False
    in_table = False
    table_rows = []

    lines = md_text.split('\n')
    i = 0
    while i < len(lines):
        line = lines[i]
        
        # Code block
        if line.startswith('```'):
            if in_code:
                html_lines.append('</code></pre>')
                in_code = False
            else:
                lang = line[3:].strip()
                html_lines.append(f'<pre><code class="language-{lang}">')
                in_code = True
            i += 1
            continue

        if in_code:
            html_lines.append(line.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;'))
            i += 1
            continue

        # Table processing
        if '|' in line and not line.strip().startswith('```'):
            if not in_table:
                in_table = True
                table_rows = []
            table_rows.append(line)
            i += 1
            continue
        else:
            if in_table:
                # Flush table
                html_lines.append('<table>')
                is_header = True
                for trow in table_rows:
                    if re.match(r'^\s*\|?\s*:?-+:?\s*\|', trow):
                        is_header = False
                        continue
                    cells = [c.strip() for c in trow.strip().strip('|').split('|')]
                    html_lines.append('<tr>')
                    tag = 'th' if is_header else 'td'
                    for c in cells:
                        cell_html = parse_inline(c)
                        html_lines.append(f'<{tag}>{cell_html}</{tag}>')
                    html_lines.append('</tr>')
                    is_header = False
                html_lines.append('</table>')
                in_table = False

        # Regular Markdown lines
        stripped = line.strip()
        if not stripped:
            html_lines.append('')
            i += 1
            continue

        # Markdown image syntax: ![Alt text](image_path)
        m_img = re.match(r'^!\[(.*?)\]\((.*?)\)$', stripped)
        if m_img:
            alt_text, src = m_img.group(1), m_img.group(2)
            caption_text = alt_text
            next_idx = i + 1
            while next_idx < len(lines) and not lines[next_idx].strip():
                next_idx += 1
            if next_idx < len(lines) and lines[next_idx].strip().startswith('*Figure'):
                caption_text = lines[next_idx].strip().strip('*')
                i = next_idx

            img_style = 'style="max-height: 125mm;"' if 'figma_frames/' in src else ''
            html_lines.append(f'''
<div class="img-container">
    <img src="{src}" alt="{alt_text}" {img_style}/>
    <div class="caption">{caption_text}</div>
</div>
''')
            i += 1
            continue

        # Insert clean page break before major diagram sections for professional print layout
        if stripped in [
            '### Use Case Diagram',
            '## 15. Preliminary System Flow',
            '## 3. Conceptual ER Diagram (Chen Notation Architecture)'
        ]:
            html_lines.append('<div class="page-break"></div>')

        if stripped.startswith('# '):
            html_lines.append(f'<h1>{parse_inline(stripped[2:])}</h1>')
        elif stripped.startswith('## '):
            html_lines.append(f'<h2>{parse_inline(stripped[3:])}</h2>')
        elif stripped.startswith('### '):
            html_lines.append(f'<h3>{parse_inline(stripped[4:])}</h3>')
        elif stripped.startswith('#### '):
            html_lines.append(f'<h4>{parse_inline(stripped[5:])}</h4>')
        elif stripped.startswith('---'):
            html_lines.append('<hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;"/>')
        elif stripped.startswith('* ') or stripped.startswith('- '):
            html_lines.append(f'<ul><li>{parse_inline(stripped[2:])}</li></ul>')
        else:
            html_lines.append(f'<p>{parse_inline(stripped)}</p>')
        i += 1

    if in_table:
        html_lines.append('<table>')
        for trow in table_rows:
            if not re.match(r'^\s*\|?\s*:?-+:?\s*\|', trow):
                cells = [c.strip() for c in trow.strip().strip('|').split('|')]
                html_lines.append('<tr>')
                for c in cells:
                    html_lines.append(f'<td>{parse_inline(c)}</td>')
                html_lines.append('</tr>')
        html_lines.append('</table>')

    html_content = '\n'.join(html_lines)
    # Merge consecutive <ul> tags
    html_content = re.sub(r'</ul>\s*<ul>', '', html_content)

    return html_content

def parse_inline(text):
    text = text.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
    # Bold italic
    text = re.sub(r'\*\*\*(.*?)\*\*\*', r'<strong><em>\1</em></strong>', text)
    # Bold
    text = re.sub(r'\*\*(.*?)\*\*', r'<strong>\1</strong>', text)
    # Italic
    text = re.sub(r'\*(.*?)\*', r'<em>\1</em>', text)
    # Inline code
    text = re.sub(r'`(.*?)`', r'<code>\1</code>', text)
    # Links
    text = re.sub(r'\[(.*?)\]\((.*?)\)', r'<a href="\2">\1</a>', text)
    # Restore HTML tags: <u>, </u>, <br>, <br/>
    text = text.replace('&lt;u&gt;', '<u>').replace('&lt;/u&gt;', '</u>')
    text = text.replace('&lt;br&gt;', '<br/>').replace('&lt;br/&gt;', '<br/>')
    return text

def build():
    docs = [
        ('Document_1_Project_Synopsis.md', 'Document_1_Project_Synopsis.html', 'Document_1_Project_Synopsis.pdf', 'ROADWATCH - Project Synopsis', False),
        ('Document_2_Requirement_Analysis_Document.md', 'Document_2_Requirement_Analysis_Document.html', 'Document_2_Requirement_Analysis_Document.pdf', 'ROADWATCH - Requirement Analysis Document', False),
        ('Document_3_ERD_and_Schema.md', 'Document_3_ERD_and_Schema.html', 'Document_3_ERD_and_Schema.pdf', 'ROADWATCH - ERD & Relational Schema', True),
        ('Document_4_High_Fidelity_Figma_Wireframes.md', 'Document_4_High_Fidelity_Figma_Wireframes.html', 'Document_4_High_Fidelity_Figma_Wireframes.pdf', 'ROADWATCH - High-Fidelity Figma Wireframes Specification', False)
    ]

    for md_name, html_name, pdf_name, title, is_doc3 in docs:
        md_path = os.path.join(BASE_DIR, md_name)
        html_path = os.path.join(BASE_DIR, html_name)
        pdf_path = os.path.join(BASE_DIR, pdf_name)

        with open(md_path, 'r') as f:
            md_text = f.read()

        body_html = simple_md_to_html(md_text, is_doc3)
        full_html = HTML_TEMPLATE.replace("{{TITLE}}", title).replace("{{BODY}}", body_html)

        with open(html_path, 'w') as f:
            f.write(full_html)
        print(f"Generated {html_name}")

        # Render PDF via Headless Chrome
        cmd = [
            CHROME_BIN,
            "--headless",
            "--disable-gpu",
            "--no-pdf-header-footer",
            f"--print-to-pdf={pdf_path}",
            f"file://{html_path}"
        ]
        res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        if os.path.exists(pdf_path):
            print(f"Generated {pdf_name} ({os.path.getsize(pdf_path)} bytes)")
        else:
            print(f"Error generating {pdf_name}: {res.stderr.decode()}")

if __name__ == '__main__':
    build()
