import pypdf
import sys
import re

docs = [
    'Document_1_Project_Synopsis.pdf',
    'Document_2_Requirement_Analysis_Document.pdf',
    'Document_3_ERD_and_Schema.pdf',
    'Document_4_High_Fidelity_Figma_Wireframes.pdf'
]

expected_members = [
    ('Kanak Waradkar', '24B-CO-030', 'kanakwaradkar@gmail.com'),
    ('Krushna Surve', '24B-CO-031', 'krushnasurve07@gmail.com'),
    ('Manjunath Subhash Gavada', '24B-CO-035', 'manjunathgavada40@gmail.com')
]

latex_tokens = [
    r'\text', r'\longrightarrow', r'\longleftrightarrow', r'\bowtie', r'\underline', r'\emptyset', '$$'
]

errors = []

for doc in docs:
    reader = pypdf.PdfReader(doc)
    full_text = ''
    for idx, page in enumerate(reader.pages):
        page_text = page.extract_text() or ''
        full_text += f'\n--- Page {idx+1} ---\n' + page_text
        for token in latex_tokens:
            if token in page_text:
                errors.append(f'{doc} Page {idx+1}: Found LaTeX token "{token}"')
        if '$' in page_text:
            errors.append(f'{doc} Page {idx+1}: Found raw $ token in page text')

    # Normalize text for checking
    normalized_text = re.sub(r'-\s+', '-', full_text)
    normalized_text = re.sub(r'\s+', ' ', normalized_text)

    # Check members
    for name, roll, email in expected_members:
        if name not in normalized_text:
            errors.append(f'{doc}: Missing member name {name}')
        if roll not in normalized_text:
            errors.append(f'{doc}: Missing member roll {roll}')
        if email not in normalized_text:
            errors.append(f'{doc}: Missing member email {email}')

    print(f'Checked {doc}: {len(reader.pages)} pages.')

if errors:
    print('ERRORS FOUND:')
    for e in errors:
        print('  -', e)
    sys.exit(1)
else:
    print('ALL VERIFICATION CHECKS PASSED PERFECTLY!')
