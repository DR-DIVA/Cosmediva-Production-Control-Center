import re

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Fix the syntax error \'แผนก\' -> 'แผนก'
    content = content.replace(r"\'แผนก\'", "'แผนก'")

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

files = [
    r'src\app\(dashboard)\my-tasks\mixing\page.tsx',
    r'src\app\(dashboard)\my-tasks\packing\page.tsx',
    r'src\app\(dashboard)\my-tasks\pof\page.tsx'
]

for file in files:
    process_file(file)

print("Fixed backslashes")
