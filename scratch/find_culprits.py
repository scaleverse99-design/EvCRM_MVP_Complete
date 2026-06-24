import os

app_path = r'c:\Users\balaj\Downloads\EvCRM_MVP_Complete\evcrm-mvp\app'

culprits = []

for root, dirs, files in os.walk(app_path):
    if 'page.js' in files:
        file_path = os.path.join(root, 'page.js')
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Check for dynamic blockers in Server Components
        if '"use client"' not in content:
            if 'db.' in content or 'fetch(' in content or 'searchParams' in content:
                culprits.append(file_path)

for c in culprits:
    print(f"DYNAMIC CULPRIT: {c}")
