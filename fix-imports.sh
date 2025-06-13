#!/bin/bash

# Find all files with the incorrect import and replace it
find /Users/tadies/Documents/GitHub/GIT/learn-x/frontend/src -type f -name "*.ts" -o -name "*.tsx" | xargs sed -i '' 's|@/components/ui/UseToast|@/components/ui/use-toast|g'
