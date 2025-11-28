#!/bin/bash

# Bulk update script to change all /classes/mus240 references to /mus-240
# Run this from the project root directory

echo "Starting MUS240 route migration..."
echo "This will update all references from /classes/mus240 to /mus-240"

# Count files that will be affected
echo ""
echo "Files to be updated:"
grep -r "/classes/mus240" src/ --exclude-dir=node_modules | cut -d: -f1 | sort -u | wc -l

echo ""
read -p "Continue with bulk update? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]
then
    echo "Migration cancelled."
    exit 1
fi

# Perform the replacement in all TypeScript/JavaScript files
find src/ -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) \
  -exec sed -i 's|/classes/mus240|/mus-240|g' {} +

echo ""
echo "Migration complete!"
echo "All /classes/mus240 references have been updated to /mus-240"
echo ""
echo "Next steps:"
echo "1. Review the changes with git diff"
echo "2. Test the application thoroughly"
echo "3. Commit the changes if everything works"
