# Tradebilia Form Field Specifications

## Overview
This document outlines all field configurations, requirements, and changes made to the Add Inventory form across all collectible categories.

---

## Form Layout Changes

### Grid Layout
- **Desktop**: 4 columns per row (`lg:grid-cols-4`)
- **Tablet**: 2 columns per row (`md:grid-cols-2`)
- **Mobile**: 1 column per row (`grid-cols-1`)
- **Form Width**: `max-w-3xl` (balanced spacing for field labels and inputs)

### Field Positioning Strategy
- **Column 1-2**: Regular fields (no conditional logic)
- **Column 3**: Fields with conditional triggers (fields with `supportsOther` or `conditionalLogic`)
- **Column 4**: Reserved for conditional inputs (custom "Other" fields appear here)

### Field Label Styling
- Labels display on a single line (`whitespace-nowrap`)
- No text wrapping to maintain clean alignment

---

## Field Sections

### 1. Required Fields Section
Fields that must be completed to submit the form. Includes:
- Standard required fields
- Custom "Other" fields when parent is required
- Conditional fields when parent is required

**Completion Tracking**: Progress bar includes custom "Other" fields when their parent is required

### 2. Recommended Fields Section
Fields that improve listing quality but are not mandatory. Includes:
- Standard recommended fields
- Conditional fields when parent is recommended

### 3. Optional Fields Section
Additional fields for enhanced listing details. Includes:
- Standard optional fields
- Conditional fields when parent is optional

**Excluded from Optional Section**:
- Description (has dedicated Description section)
- Shipping Available (has dedicated Shipping section)

### 4. Dedicated Sections
- **Photos Section**: Image upload with cover photo selection
- **Description Section**: Rich text editor for item description
- **Shipping Section**: Shipping options and availability

---

## Field Requirement Changes

### Pokemon Category / Single Card
- **Year**: Changed from `recommended` → `required`
  - Reason: Essential for identifying card vintage and value

### Autographs / Signed Item
- **Authentication Included**: Changed from `recommended` → `required`
  - Reason: Critical for authentication conditional fields
  - **Conditional Fields** (appear when "Authentication Included = Yes"):
    - `authenticationCompany`: `required`
    - `authenticationType`: `required`
    - `certificateNumber`: `required`

### Disney Pins / Individual Pin
- **Shipping Available**: Changed from `required` → `optional`
  - Reason: Moved to dedicated Shipping section (no duplication)

---

## Field Configuration Updates

### Duplicate "Other" Option Fix
**Issue**: Fields with `supportsOther: true` were showing "Other" twice in dropdown
**Solution**: Modified DynamicFieldRenderer to check if "Other" already exists in `dropdownOptions` before adding it

**Affected Fields**:
- Manufacturer (all categories)
- Art Type
- All other fields with `supportsOther: true`

### Conditional Field Placement
**Rule**: Conditional fields must appear in the same section as their parent field
- If parent is `required` → conditional is `required`
- If parent is `recommended` → conditional is `recommended`
- If parent is `optional` → conditional is `optional`

**Verified Categories**:
- Autographs / Signed Item (authentication fields)
- Pokemon / Single Card (authentication fields)
- All other categories with conditional logic

---

## Custom "Other" Field Behavior

### When "Other" is Selected
1. **Display**: Custom input bubble appears in 4th column (right of parent field)
2. **Styling**: Matches standard input field styling (white background, rounded corners)
3. **Label**: Field name appears above the bubble (e.g., "Custom Manufacturer")
4. **Placeholder**: No default placeholder text
5. **Requirement**: Inherits parent field's requirement level

### Custom Input Styling
- **Background**: White (`bg-white`)
- **Border**: Light gray (`border-gray-300`)
- **Border Radius**: `rounded-lg`
- **Padding**: Standard input padding
- **Text Color**: Black
- **Focus State**: Blue ring (`focus:ring-blue-500`)

### Form Completion Tracking
- Custom "Other" fields count toward required field completion when parent is required
- Progress bar updates dynamically when "Other" is selected for required fields

---

## Field Reset Behavior

### Category Change
- **Action**: All form fields reset to default values
- **Affected**: All category-specific fields
- **Errors**: Cleared on category change

### Item Type Change
- **Action**: All form fields reset to default values
- **Affected**: All item type-specific fields
- **Errors**: Cleared on item type change

### Manufacturer Field Specific
- **Behavior**: Resets when category OR item type changes
- **Custom Input**: Also clears when parent field resets

---

## Field Definitions by Category

### Autographs Category

#### Autographs / Signed Item
**Required Fields**:
- Listing Title (text)
- Trade Value (currency)
- Condition (dropdown)
- Photos (image upload)
- Signer (text)
- Signed Item Type (dropdown with "Other" support)
- Authentication Included (dropdown) - **CHANGED TO REQUIRED**
- **Conditional (when Authentication Included = Yes)**:
  - Authentication Company (dropdown with "Other" support)
  - Authentication Type (dropdown with "Other" support)
  - Certificate Number (text)

**Recommended Fields**:
- Quantity (number, default: 1)
- Autograph Category (dropdown with "Other" support)
- Inscription Present (dropdown)
- **Conditional (when Inscription Present = Yes)**:
  - Inscription Text (text)

**Optional Fields**:
- (None - Description and Shipping in dedicated sections)

---

### Pokemon Category

#### Pokemon / Single Card
**Required Fields**:
- Listing Title (text)
- Trade Value (currency)
- Condition (dropdown)
- Photos (image upload)
- Sport (dropdown)
- Player (text)
- Year (text) - **CHANGED TO REQUIRED**
- Manufacturer (dropdown with "Other" support)
- Is Graded (dropdown)
- Factory Sealed (dropdown)
- Authenticated (dropdown)
- **Conditional (when Authenticated = Yes)**:
  - Authentication Company (dropdown with "Other" support)
  - From A Sealed Case (dropdown)

**Recommended Fields**:
- Quantity (number, default: 1)
- Set Name (text)
- Card Number (text)
- Edition (dropdown)
- Rarity (dropdown)
- Holographic (dropdown)
- Era (dropdown with "Other" support)

**Optional Fields**:
- (None - Description and Shipping in dedicated sections)

---

### Disney Pins Category

#### Disney Pins / Individual Pin
**Required Fields**:
- Listing Title (text)
- Trade Value (currency)
- Condition (dropdown)
- Photos (image upload)
- Pin Name (text)

**Recommended Fields**:
- Quantity (number, default: 1)
- Park / Event (text)
- Series (text)
- Edition (text)
- Year (text)

**Optional Fields**:
- (None - Description and Shipping in dedicated sections)

**Shipping Section**:
- Shipping Available (dropdown) - **MOVED FROM REQUIRED**

---

## Form Validation Rules

### Required Field Validation
- All fields with `requirement: 'required'` must be filled
- Custom "Other" fields must be filled when parent is required
- Form cannot be submitted with empty required fields

### Conditional Field Validation
- Conditional fields only validate when their parent condition is met
- Example: Certificate Number only validates when "Authentication Included = Yes"

### Custom "Other" Field Validation
- Cannot be empty when parent field is set to "Other" and parent is required
- Validates field type (text, number, etc.) based on `inputType`

---

## Components Used

### DynamicFieldRenderer
- Renders individual form fields
- Handles dropdown options and conditional logic
- Manages "Other" field display and validation
- **Props**:
  - `field`: FieldDefinition object
  - `value`: Current field value
  - `onChange`: Update handler
  - `onOtherChange`: Custom "Other" input handler
  - `showOtherInput`: Boolean to show custom input
  - `otherValue`: Current custom input value

### FieldWithCustomInput
- Wrapper component for required fields
- Positions custom "Other" inputs in 4th column
- Handles label and input styling
- Ensures proper grid alignment

### CollapsibleFormSection
- Groups fields by requirement level
- Shows/hides field groups
- Displays field count
- Manages section expansion state

### FormProgressIndicator
- Displays required field completion progress
- Updates dynamically as fields are filled
- Includes custom "Other" fields in count

---

## Known Issues & Resolutions

### Issue 1: Duplicate "Other" Options
**Status**: ✅ RESOLVED
**Solution**: Modified DynamicFieldRenderer to check if "Other" exists before adding

### Issue 2: Custom Input Styling Not Applying
**Status**: ✅ RESOLVED
**Solution**: Switched from Tailwind classes to inline styles with `!important`

### Issue 3: Manufacturer Not Resetting on Item Type Change
**Status**: ✅ RESOLVED
**Solution**: Updated `setItemType` hook to reset all form fields

### Issue 4: Conditional Fields in Wrong Section
**Status**: ⏳ IN PROGRESS
**Issue**: Some conditional fields appear in different section than parent
**Current Work**: Updating field requirements to match parent field levels

---

## Testing Checklist

- [ ] All required fields display in Required Fields section
- [ ] All recommended fields display in Recommended Fields section
- [ ] All optional fields display in Optional Fields section (excluding Description/Shipping)
- [ ] Custom "Other" inputs appear in 4th column when selected
- [ ] Custom "Other" inputs have correct styling (white background, black text)
- [ ] Manufacturer resets when category changes
- [ ] Manufacturer resets when item type changes
- [ ] "Other" appears only once in all dropdowns
- [ ] Progress bar includes custom "Other" fields for required parents
- [ ] Conditional fields appear in correct section (matching parent)
- [ ] Form validation prevents submission with empty required fields
- [ ] Form validation prevents submission with empty required custom "Other" fields
- [ ] Description section is separate from optional fields
- [ ] Shipping Available appears only in Shipping section (not Required/Optional)

---

## Future Enhancements

1. **Field-level Validation Messages**: Add inline error messages for specific constraints
2. **Photo Reordering**: Implement drag-and-drop for photo reordering and cover selection
3. **Form Autosave**: Add periodic autosave to localStorage to prevent data loss
4. **Responsive Adjustments**: Optimize column layout for tablet breakpoints
5. **Accessibility**: Add ARIA labels and keyboard navigation improvements

---

**Last Updated**: June 20, 2026
**Version**: 1.0
