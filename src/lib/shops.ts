
export const shops = [
    {
        id: "SHP-001",
        name: "Bole Boutique",
        contactPerson: "Abebe Bikila",
        city: "Addis Ababa",
        exactLocation: "Bole, next to Edna Mall",
        discount: 5,
        status: "Active"
    },
    {
        id: "SHP-002",
        name: "Hawassa Habesha",
        contactPerson: "Tirunesh Dibaba",
        city: "Hawassa",
        exactLocation: "Piassa, near the lake",
        discount: 0,
        status: "Active"
    },
    {
        id: "SHP-003",
        name: "Merkato Style",
        contactPerson: "Kenenisa Bekele",
        city: "Addis Ababa",
        exactLocation: "Merkato, main market area",
        discount: 10,
        status: "Pending"
    },
    {
        id: "SHP-004",
        name: "Adama Modern",
        contactPerson: "Meseret Defar",
        city: "Adama",
        exactLocation: "City center, across from the post office",
        discount: 5,
        status: "Inactive"
    }
];

export type Shop = typeof shops[0];
