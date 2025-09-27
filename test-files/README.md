# Test Files for File Transfer App

This folder contains sample files to test the file transfer functionality.

## Files Included

### 1. sample-code.js
A JavaScript file demonstrating a simple Calculator class with:
- Basic arithmetic operations (add, subtract, multiply, divide)
- Operation history tracking
- Error handling for division by zero
- Example usage and testing

### 2. sample-style.css
A modern CSS file showcasing:
- CSS custom properties (variables)
- Modern layout techniques (Grid, Flexbox)
- Responsive design principles
- Animations and transitions
- Component-based styling approach

### 3. README.md (this file)
Documentation explaining the test files and their purpose.

## How to Use

1. **Single File Test**: Upload one of these files individually
2. **Multiple Files Test**: Select all files to test batch upload
3. **Folder Test**: Select the entire test-files folder (if supported)

## Expected Results

- Files should upload successfully with progress indication
- Unique download link should be generated
- Files should be downloadable individually or as a ZIP archive
- Links should expire after 24 hours (configurable)

## File Types Demonstrated

- `.js` - JavaScript source code
- `.css` - Stylesheets
- `.md` - Markdown documentation

These represent common file types that developers frequently need to share.

## Testing Scenarios

### Basic Upload Test
1. Upload sample-code.js
2. Verify download link generation
3. Test download functionality

### Multi-file Upload Test
1. Select all three files
2. Upload simultaneously
3. Verify ZIP download contains all files

### Error Testing
1. Try uploading unsupported file types
2. Test file size limits
3. Verify error handling and user feedback

## Security Validation

These files are safe test files containing:
- No executable code
- No sensitive information
- Standard web development file types
- Clean, educational content

Perfect for testing the file validation and security features of the transfer app.