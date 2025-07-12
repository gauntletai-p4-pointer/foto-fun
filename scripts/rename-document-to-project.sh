#!/bin/bash

# Rename Document to Project throughout codebase
# Usage: ./scripts/rename-document-to-project.sh

set -e

echo "🚀 Starting Document → Project rename across codebase..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Directories to include (relative to project root)
INCLUDE_DIRS=(
  "app"
  "components" 
  "lib"
  "types"
  "hooks"
  "constants"
  "docs"
)

# File extensions to process
FILE_EXTENSIONS=(
  "*.ts"
  "*.tsx" 
  "*.js"
  "*.jsx"
  "*.md"
  "*.json"
)

# Directories to exclude
EXCLUDE_DIRS=(
  "node_modules"
  ".git"
  ".next"
  "dist"
  "build"
  ".turbo"
  "coverage"
  ".nyc_output"
)

# Build find command with exclusions
build_find_command() {
  local cmd="find"
  
  # Add include directories
  for dir in "${INCLUDE_DIRS[@]}"; do
    if [ -d "$dir" ]; then
      cmd="$cmd $dir"
    fi
  done
  
  # Add exclusions
  for exclude in "${EXCLUDE_DIRS[@]}"; do
    cmd="$cmd -type d -name '$exclude' -prune -o"
  done
  
  # Add file type filters
  cmd="$cmd \\("
  for i in "${!FILE_EXTENSIONS[@]}"; do
    if [ $i -eq 0 ]; then
      cmd="$cmd -name '${FILE_EXTENSIONS[$i]}'"
    else
      cmd="$cmd -o -name '${FILE_EXTENSIONS[$i]}'"
    fi
  done
  cmd="$cmd \\) -type f -print"
  
  echo "$cmd"
}

# Function to backup files
backup_files() {
  echo -e "${BLUE}📦 Creating backup...${NC}"
  
  # Create backup directory with timestamp
  BACKUP_DIR="backups/document-to-project-$(date +%Y%m%d-%H%M%S)"
  mkdir -p "$BACKUP_DIR"
  
  # Copy entire project to backup (excluding node_modules)
  rsync -av --exclude='node_modules' --exclude='.git' --exclude='.next' --exclude='dist' . "$BACKUP_DIR/"
  
  echo -e "${GREEN}✅ Backup created at: $BACKUP_DIR${NC}"
}

# Function to find and replace in file contents
replace_in_files() {
  echo -e "${BLUE}🔍 Finding files to process...${NC}"
  
  local find_cmd=$(build_find_command)
  local files=$(eval "$find_cmd")
  local file_count=$(echo "$files" | wc -l)
  
  echo -e "${YELLOW}📊 Found $file_count files to process${NC}"
  
  if [ -z "$files" ]; then
    echo -e "${RED}❌ No files found to process${NC}"
    return 1
  fi
  
  echo -e "${BLUE}🔄 Replacing content in files...${NC}"
  
  # Define replacement patterns
  declare -A replacements=(
    # Class names and interfaces
    ["DocumentStore"]="ProjectStore"
    ["DocumentSerializer"]="ProjectSerializer" 
    ["DocumentManager"]="ProjectManager"
    ["EventDocumentStore"]="EventProjectStore"
    ["DocumentState"]="ProjectState"
    ["DocumentEvent"]="ProjectEvent"
    ["DocumentHistory"]="ProjectHistory"
    ["DocumentSettings"]="ProjectSettings"
    ["DocumentMetadata"]="ProjectMetadata"
    
    # File names and paths (will be handled separately)
    ["document/"]="project/"
    ["Document.ts"]="Project.ts"
    ["Document.tsx"]="Project.tsx"
    
    # Variable names and properties
    ["documentId"]="projectId"
    ["documentStore"]="projectStore"
    ["documentState"]="projectState"
    ["documentManager"]="projectManager"
    ["documentHistory"]="projectHistory"
    ["documentSettings"]="projectSettings"
    ["currentDocument"]="currentProject"
    ["activeDocument"]="activeProject"
    
    # Event names
    ["document.created"]="project.created"
    ["document.updated"]="project.updated"
    ["document.deleted"]="project.deleted"
    ["document.saved"]="project.saved"
    ["document.loaded"]="project.loaded"
    
    # Comments and strings
    ["document"]="project"
    ["Document"]="Project"
    
    # API endpoints
    ["/api/document"]="/api/project"
    ["/documents/"]="/projects/"
  )
  
  local processed=0
  
  # Process each file
  while IFS= read -r file; do
    if [ -f "$file" ]; then
      local changed=false
      
      # Apply all replacements to this file
      for find_str in "${!replacements[@]}"; do
        replace_str="${replacements[$find_str]}"
        
        # Check if file contains the pattern
        if grep -q "$find_str" "$file" 2>/dev/null; then
          # Use sed to replace (macOS compatible)
          if [[ "$OSTYPE" == "darwin"* ]]; then
            sed -i '' "s|$find_str|$replace_str|g" "$file"
          else
            sed -i "s|$find_str|$replace_str|g" "$file"
          fi
          changed=true
        fi
      done
      
      if [ "$changed" = true ]; then
        echo -e "  ${GREEN}✓${NC} $file"
        ((processed++))
      fi
    fi
  done <<< "$files"
  
  echo -e "${GREEN}✅ Processed $processed files${NC}"
}

# Function to rename files and directories
rename_files_and_dirs() {
  echo -e "${BLUE}📁 Renaming files and directories...${NC}"
  
  # Find and rename files
  local renamed_files=0
  
  # Rename TypeScript/TSX files
  for dir in "${INCLUDE_DIRS[@]}"; do
    if [ -d "$dir" ]; then
      find "$dir" -name "*Document*" -type f | while read -r file; do
        if [[ "$file" != *"node_modules"* ]]; then
          new_file=$(echo "$file" | sed 's/Document/Project/g')
          if [ "$file" != "$new_file" ]; then
            mv "$file" "$new_file"
            echo -e "  ${GREEN}✓${NC} $file → $new_file"
            ((renamed_files++))
          fi
        fi
      done
    fi
  done
  
  # Rename directories
  local renamed_dirs=0
  
  for dir in "${INCLUDE_DIRS[@]}"; do
    if [ -d "$dir" ]; then
      find "$dir" -name "*document*" -type d | sort -r | while read -r directory; do
        if [[ "$directory" != *"node_modules"* ]]; then
          new_directory=$(echo "$directory" | sed 's/document/project/g')
          if [ "$directory" != "$new_directory" ]; then
            mv "$directory" "$new_directory"
            echo -e "  ${GREEN}✓${NC} $directory → $new_directory"
            ((renamed_dirs++))
          fi
        fi
      done
    fi
  done
  
  echo -e "${GREEN}✅ File and directory renaming complete${NC}"
}

# Function to update imports and exports
update_imports() {
  echo -e "${BLUE}🔗 Updating import/export statements...${NC}"
  
  local find_cmd=$(build_find_command)
  local files=$(eval "$find_cmd")
  
  while IFS= read -r file; do
    if [ -f "$file" ]; then
      # Update import paths
      if grep -q "from.*document" "$file" 2>/dev/null; then
        if [[ "$OSTYPE" == "darwin"* ]]; then
          sed -i '' 's|from.*document|from project|g' "$file"
          sed -i '' 's|import.*document|import project|g' "$file"
        else
          sed -i 's|from.*document|from project|g' "$file"
          sed -i 's|import.*document|import project|g' "$file"
        fi
        echo -e "  ${GREEN}✓${NC} Updated imports in $file"
      fi
    fi
  done <<< "$files"
  
  echo -e "${GREEN}✅ Import/export updates complete${NC}"
}

# Function to validate the changes
validate_changes() {
  echo -e "${BLUE}🔍 Validating changes...${NC}"
  
  # Check for any remaining "Document" references that might be problematic
  local find_cmd=$(build_find_command)
  local files=$(eval "$find_cmd")
  
  echo -e "${YELLOW}📊 Checking for remaining 'Document' references...${NC}"
  
  local remaining_count=0
  while IFS= read -r file; do
    if [ -f "$file" ]; then
      local matches=$(grep -c "Document" "$file" 2>/dev/null || echo "0")
      if [ "$matches" -gt 0 ]; then
        echo -e "  ${YELLOW}⚠️${NC} $file: $matches remaining 'Document' references"
        ((remaining_count += matches))
      fi
    fi
  done <<< "$files"
  
  if [ "$remaining_count" -eq 0 ]; then
    echo -e "${GREEN}✅ No problematic 'Document' references found${NC}"
  else
    echo -e "${YELLOW}⚠️ Found $remaining_count remaining 'Document' references${NC}"
    echo -e "${YELLOW}   These may be intentional (e.g., in comments, documentation)${NC}"
  fi
}

# Function to run type check
run_type_check() {
  echo -e "${BLUE}🔧 Running type check...${NC}"
  
  if command -v bun &> /dev/null; then
    if bun typecheck; then
      echo -e "${GREEN}✅ Type check passed${NC}"
    else
      echo -e "${RED}❌ Type check failed${NC}"
      echo -e "${YELLOW}💡 You may need to fix import paths manually${NC}"
      return 1
    fi
  else
    echo -e "${YELLOW}⚠️ bun not found, skipping type check${NC}"
  fi
}

# Main execution
main() {
  echo -e "${BLUE}🎯 Document → Project Rename Script${NC}"
  echo -e "${BLUE}=====================================${NC}"
  
  # Confirm with user
  echo -e "${YELLOW}This will rename all 'Document' references to 'Project' throughout the codebase.${NC}"
  echo -e "${YELLOW}A backup will be created before making changes.${NC}"
  echo ""
  read -p "Continue? (y/N): " -n 1 -r
  echo ""
  
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${RED}❌ Operation cancelled${NC}"
    exit 1
  fi
  
  # Execute steps
  backup_files
  replace_in_files
  rename_files_and_dirs
  update_imports
  validate_changes
  run_type_check
  
  echo ""
  echo -e "${GREEN}🎉 Document → Project rename complete!${NC}"
  echo -e "${BLUE}📋 Next steps:${NC}"
  echo -e "  1. Review the changes: git diff"
  echo -e "  2. Run tests: bun test"
  echo -e "  3. Fix any remaining type errors"
  echo -e "  4. Update documentation if needed"
  echo ""
  echo -e "${YELLOW}💾 Backup location: $BACKUP_DIR${NC}"
}

# Run main function
main "$@" 