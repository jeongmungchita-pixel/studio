#!/bin/bash

# Fix all APIError imports to use the new location

echo "🔧 Fixing APIError imports..."

# List of files to fix
FILES=(
  "src/hooks/api/__tests__/use-api.test.ts"
  "src/hooks/api/__tests__/use-enhanced-api.errors.test.tsx"
  "src/hooks/api/__tests__/use-enhanced-api.more.errors.test.tsx"
  "src/hooks/api/use-user-with-realtime.ts"
  "src/hooks/realtime/use-realtime-collection.ts"
  "src/hooks/realtime/use-realtime-document.ts"
  "src/lib/__tests__/react-query.test.tsx"
  "src/lib/react-query.tsx"
  "src/lib/security/data-encryption.ts"
  "src/lib/security/rbac-enhanced.ts"
  "src/lib/security/security-audit.ts"
  "src/lib/security/vulnerability-scanner.ts"
  "src/lib/validation/__tests__/server-validator.extended.test.ts"
  "src/lib/validation/server-validator.ts"
  "src/stores/club-store.ts"
  "src/stores/user-store.ts"
)

# Fix each file
for file in "${FILES[@]}"; do
  if [ -f "$file" ]; then
    echo "  Fixing $file"
    sed -i '' "s|from '@/utils/error/api-error'|from '@/lib/error/error-manager'|g" "$file"
  fi
done

echo "✅ APIError imports fixed!"
