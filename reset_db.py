
import json
import os
from Mock_data.mock_data import INITIAL_MENU, INITIAL_CUSTOMERS, INITIAL_ORDERS

data = {
    "menu": INITIAL_MENU,
    "customers": INITIAL_CUSTOMERS,
    "orders": INITIAL_ORDERS,
    "feedback": [],
    "promos": {},
    "site_settings": {
        "contact_email": "orders@ellascupcakery.com",
        "contact_phone": "+234 801 234 5678",
        "contact_instagram": "@EllasCupcakery",
        "contact_whatsapp": "+2348012345678",
        "contact_facebook": "Ellas Cupcakery"
    }
}

with open("data.json", "w") as f:
    json.dump(data, f, indent=4)

print("Database reset to defaults successfully.")
