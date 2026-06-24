import os

app_api_path = r'c:\Users\balaj\Downloads\EvCRM_MVP_Complete\evcrm-mvp\app\api'

for root, dirs, files in os.walk(app_api_path):
    if 'route.js' in files:
        file_path = os.path.join(root, 'route.js')
        with open(file_path, 'r', encoding='utf-8') as f:
            lines = f.readlines()
        
        new_lines = [line for line in lines if 'export const dynamic = "force-dynamic"' not in line]
        
        if len(new_lines) != len(lines):
            with open(file_path, 'w', encoding='utf-8') as f:
                f.writelines(new_lines)
            print(f"Cleaned: {file_path}")
