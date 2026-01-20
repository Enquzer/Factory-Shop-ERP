$filePath = "c:\Users\USER 1\Documents\my_Codes\Carement_Fashion\Carement_Central\Factory-Shop-ERP\src\components\product-detail-dialog.tsx"
$content = Get-Content -Path $filePath -Raw

# 1. Update handleQuantityChange stock check logic
$pattern1 = 'if \(user\?\.role === ''factory'' && newQuantity > availableStock && amount > 0\) \{'
$replacement1 = 'if (false && user?.role === ''factory'' && newQuantity > availableStock && amount > 0) {'
# (Note: I already updated this part, but just in case)

# 2. Update the first occurrence of VariantRow controls (lines 707-747)
# Match the Input's onChange and max/disabled attributes
$pattern2 = 'const maxAllowed = user\?\.role === ''shop'' \? variant\.stock \+ \(quantities\[variant\.id\] \|\| 0\) : variant\.stock \+ \(quantities\[variant\.id\] \|\| 0\);'
$replacement2 = 'if (user?.role === ''factory'') { setQuantities(prev => ({...prev, [variant.id]: Math.max(0, value)})); return; } const maxAllowed = variant.stock + (quantities[variant.id] || 0);'

# Instead of complex regex, let's use a simpler string replace if we can find unique enough substrings
$content = $content -replace 'max=\{user\?\.role === ''shop'' \? variant\.stock \+ \(quantities\[variant\.id\] \|\| 0\) : variant\.stock \+ \(quantities\[variant\.id\] \|\| 0\)\}', ''
$content = $content -replace 'disabled=\{user\?\.role === ''shop'' \? \(variant\.stock === 0\) : variant\.stock === 0\}', 'disabled={false}'

# Fix the Plus button
$oldPlus = 'disabled={user?.role === ''shop'' ? (orderedQuantity >= variant.stock && variant.stock > 0) : orderedQuantity >= variant.stock}'
$newPlus = 'disabled={user?.role === ''shop'' ? (orderedQuantity >= variant.stock && variant.stock > 0) : false}'
$content = $content.Replace($oldPlus, $newPlus)

# Fix the onChange logic
$oldOnChange = 'const maxAllowed = user\?\.role === ''shop'' \? variant\.stock \+ \(quantities\[variant\.id\] \|\| 0\) : variant\.stock \+ \(quantities\[variant\.id\] \|\| 0\);'
$newOnChange = 'if (user?.role === ''factory'') { setQuantities(prev => ({...prev, [variant.id]: Math.max(0, value)})); return; } const maxAllowed = variant.stock + (quantities[variant.id] || 0);'
# (Wait, I'll use a more direct replacement for the entire onChange body)

$content = [regex]::Replace($content, 'onChange=\{\(e\) => \{[\s\S]*?if \(value <= maxAllowed\) \{', 'onChange={(e) => {
                                                           const value = parseInt(e.target.value) || 0;
                                                           if (user?.role === ''factory'') {
                                                               setQuantities(prev => ({...prev, [variant.id]: Math.max(0, value)}));
                                                           } else {
                                                               const maxAllowed = variant.stock + (quantities[variant.id] || 0);
                                                               if (value <= maxAllowed) {')

[IO.File]::WriteAllText($filePath, $content)
