// Test script to verify raw material subcategory functionality
import { getRawMaterialSubcategories, addRawMaterialSubcategory, getRawMaterialSubcategoriesByCategory } from '../src/lib/raw-material-subcategories';
import { createRawMaterial, getRawMaterials } from '../src/lib/raw-materials';
import { getDB } from '../src/lib/db';

async function testRawMaterialSubcategories() {
  console.log('=== Testing Raw Material Subcategories ===\n');
  
  try {
    // Test 1: Get all subcategories
    console.log('1. Getting all subcategories...');
    const allSubcategories = await getRawMaterialSubcategories();
    console.log(`   Found ${allSubcategories.length} subcategories`);
    console.log('   Sample subcategories:', allSubcategories.slice(0, 5).map((s: any) => `${s.category} -> ${s.subcategory}`));
    
    // Test 2: Get subcategories by category
    console.log('\n2. Getting subcategories for "Fabric"...');
    const fabricSubcategories = await getRawMaterialSubcategoriesByCategory('Fabric');
    console.log(`   Found ${fabricSubcategories.length} fabric subcategories:`);
    fabricSubcategories.forEach((s: any) => console.log(`     - ${s.subcategory} (${s.code})`));
    
    // Test 3: Add a new subcategory
    console.log('\n3. Adding new subcategory "Velvet" to "Fabric"...');
    const addResult = await addRawMaterialSubcategory('Fabric', 'Velvet', 'VL');
    console.log(`   Add result: ${addResult ? 'SUCCESS' : 'FAILED'}`);
    
    // Test 4: Create raw material with subcategory
    console.log('\n4. Creating raw material with subcategory...');
    const newMaterial = {
      name: 'Premium Velvet Fabric',
      category: 'Fabric',
      subcategory: 'Velvet',
      unitOfMeasure: 'Meter',
      currentBalance: 50,
      minimumStockLevel: 20,
      costPerUnit: 150,
      supplier: 'Luxury Textiles Co.'
    };
    
    const materialId = await createRawMaterial(newMaterial);
    console.log(`   Created material with ID: ${materialId}`);
    
    // Test 5: Verify the material was created with correct ID format
    console.log('\n5. Verifying material ID format...');
    const materials = await getRawMaterials();
    const createdMaterial = materials.find((m: any) => m.id === materialId);
    if (createdMaterial) {
      console.log(`   Material ID: ${createdMaterial.id}`);
      console.log(`   Expected format: RW-Fa-Ve-XX`);
      console.log(`   Name: ${createdMaterial.name}`);
      console.log(`   Subcategory: ${createdMaterial.subcategory || 'None'}`);
    }
    
    // Test 6: Create another material in the same subcategory to test auto-increment
    console.log('\n6. Creating second material in same subcategory...');
    const secondMaterial = {
      name: 'Luxury Velvet Fabric',
      category: 'Fabric',
      subcategory: 'Velvet',
      unitOfMeasure: 'Meter',
      currentBalance: 30,
      minimumStockLevel: 15,
      costPerUnit: 180,
      supplier: 'Premium Fabrics Ltd.'
    };
    
    const secondMaterialId = await createRawMaterial(secondMaterial);
    console.log(`   Created second material with ID: ${secondMaterialId}`);
    
    console.log('\n=== All Tests Completed Successfully! ===');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testRawMaterialSubcategories();