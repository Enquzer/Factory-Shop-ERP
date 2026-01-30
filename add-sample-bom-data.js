const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'db/carement.db');
const db = new sqlite3.Database(dbPath);

console.log('Adding sample BOM data to:', dbPath);

// Function to add BOM entries for existing products
function addSampleBOMData() {
    db.serialize(() => {
        // Get all products
        db.all("SELECT id, productCode, name FROM products", (err, products) => {
            if (err) {
                console.error('Error fetching products:', err);
                db.close();
                return;
            }

            console.log(`Found ${products.length} products. Adding sample BOM entries...`);

            // Get all raw materials
            db.all("SELECT id, name FROM raw_materials", (err, materials) => {
                if (err) {
                    console.error('Error fetching raw materials:', err);
                    db.close();
                    return;
                }

                console.log(`Found ${materials.length} raw materials.`);

                if (materials.length === 0) {
                    console.log('No raw materials found. Cannot create BOM entries.');
                    db.close();
                    return;
                }

                // Add sample BOM entries for each product
                let productsProcessed = 0;

                for (const product of products) {
                    // For each product, create BOM entries with 2-3 random materials
                    const numMaterials = Math.min(2, materials.length); // Use at least 2 or all available
                    const selectedMaterials = [...materials]
                        .sort(() => 0.5 - Math.random())
                        .slice(0, numMaterials);

                    for (const material of selectedMaterials) {
                        const quantityPerUnit = (Math.random() * 2 + 0.5).toFixed(2); // Random quantity between 0.5 and 2.5
                        const wastagePercentage = (Math.random() * 10).toFixed(1); // Random wastage between 0 and 10%

                        db.run(
                            `INSERT OR REPLACE INTO product_bom (productId, materialId, quantityPerUnit, wastagePercentage) VALUES (?, ?, ?, ?)`,
                            [product.id, material.id, parseFloat(quantityPerUnit), parseFloat(wastagePercentage)],
                            (err) => {
                                if (err) {
                                    console.error(`Error adding BOM for product ${product.name} and material ${material.name}:`, err);
                                } else {
                                    console.log(`Added BOM entry: ${product.name} -> ${material.name} (${quantityPerUnit} per unit, ${wastagePercentage}% wastage)`);
                                }
                            }
                        );
                    }

                    productsProcessed++;
                    
                    if (productsProcessed === products.length) {
                        // Finalize and close the database
                        setTimeout(() => {
                            console.log('Sample BOM data added successfully!');
                            
                            // Verify the BOM entries
                            db.all("SELECT COUNT(*) as count FROM product_bom", (err, result) => {
                                if (err) {
                                    console.error('Error counting BOM entries:', err);
                                } else {
                                    console.log(`Total BOM entries after adding samples: ${result[0].count}`);
                                }
                                
                                db.close();
                            });
                        }, 1000); // Small delay to ensure all inserts are processed
                    }
                }
            });
        });
    });
}

// Execute the function
addSampleBOMData();