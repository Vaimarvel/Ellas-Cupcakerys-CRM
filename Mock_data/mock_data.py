
import json
import os
import datetime
from typing import Dict, List

# File to persist data
DATA_FILE = "data.json"

def load_data():
    if not os.path.exists(DATA_FILE):
        return None
    try:
        with open(DATA_FILE, "r") as f:
            return json.load(f)
    except:
        return None

def save_data(data):
    # Convert datetime objects to string for JSON serialization
    # This is a simple recursive helper if needed, but for now we just save the global dicts
    # We will assume the structure passed in is JSON-serializable (strings/ints/lists/dicts)
    with open(DATA_FILE, "w") as f:
        json.dump(data, f, indent=4)

# --- INITIAL MOCK DATA (Fallback) ---
INITIAL_CUSTOMERS = {
    "9012345678": {
        "id": "9012345678",
        "name": "Bola Alade",
        "email": "bola@example.com",
        "preferences": ["Chocolate", "No Nuts", "Coffee Lover"],
        "loyalty_points": 820,
        "last_order_date": (datetime.datetime.now() - datetime.timedelta(days=15)).isoformat(),
        "is_first_time": False,
    },
    "NEW_USER": {
        "id": "NEW_USER",
        "name": "New Customer",
        "email": "",
        "preferences": [],
        "loyalty_points": 0,
        "last_order_date": None,
        "is_first_time": True,
    }
}

INITIAL_MENU = {
    "P001": {
        "id": "P001",
        "name": "Red Velvet Cupcake",
        "price": 850.00,
        "ingredients": ["Cream Cheese", "Cocoa", "Vanilla"],
        "is_available": True,
        "image_url": "/images/red_velvet_cupcake.png",
        "loyalty_points": 8
    },
    "P002": {
        "id": "P002",
        "name": "Classic Chocolate Cake (6-inch)",
        "price": 5500.00,
        "ingredients": ["Dark Chocolate", "Flour", "Butter", "Nuts"],
        "is_available": True,
        "image_url": "/images/chocolate_cake.png",
        "loyalty_points": 55
    },
    "P003": {
        "id": "P003",
        "name": "Vegan Lemon Loaf",
        "price": 3200.00,
        "ingredients": ["Lemon", "Flour", "Vegan"],
        "is_available": False,
        "image_url": "/images/lemon_loaf.png",
        "loyalty_points": 32
    },
    "P004": {
        "id": "P004",
        "name": "Small Chops Platter",
        "price": 2500.00,
        "ingredients": ["Samosa", "Spring Roll", "Puff Puff", "Chicken"],
        "is_available": True,
        "image_url": "/images/small_chops.png",
        "loyalty_points": 25
    },
    "P005": {
        "id": "P005",
        "name": "Fresh Baked Buns",
        "price": 500.00,
        "ingredients": ["Flour", "Sugar", "Butter"],
        "is_available": True,
        "image_url": "/images/buns-fresh.png",
        "loyalty_points": 5
    }
}

INITIAL_ORDERS = {
    "O-202501": {
        "id": "O-202501",
        "customer_id": "9012345678",
        "items": [
            {"item_id": "P002", "name": "Classic Chocolate Cake (6-inch)", "quantity": 1},
        ],
        "status": "Out for Delivery",
        "payment_status": "Paid",
        "timestamp": (datetime.datetime.now() - datetime.timedelta(hours=2)).isoformat(),
        "total": 5500.00
    }
}

INITIAL_PROMOS = [
    {
        "id": "S001", 
        "name": "Loyalty 10% Off",
        "description": "10% off any order over ₦5000 for loyalty members.",
        "target_tags": ["High Loyalty"],
        "active": True
    },
    {
        "id": "S002", 
        "name": "New Customer Free Coffee",
        "description": "Get a free Cold Brew with your first order.",
        "target_tags": ["New Customer"],
        "active": True
    },
]

INITIAL_SITE_SETTINGS = {
    "hero_bg_url": "https://images.unsplash.com/photo-1494972688394-4cc796f9f094?q=80&w=1600&auto=format&fit=crop",
    "hero_img_url": "",
    "promo1_url": "",
    "promo2_url": "",
    "payment_bank_name": "Access Bank",
    "payment_account_number": "1522553410",
    "payment_account_name": "Ellas Cupcakery",
    "offer_points_threshold": 2000,
    "contact_email": "hello@ellascupcakery.com",
    "contact_instagram": "@ellas_cupcakery",
    "contact_whatsapp": "+2348012345678",
    "contact_facebook": ""
}

# --- LOAD OR INIT DATA ---
loaded = load_data()

if loaded:
    MOCK_CUSTOMER_DB = loaded.get("customers", INITIAL_CUSTOMERS)
    MOCK_MENU_DB = loaded.get("menu", INITIAL_MENU)
    MOCK_ORDER_DB = loaded.get("orders", INITIAL_ORDERS)
    MOCK_PROMO_DB = loaded.get("promos", INITIAL_PROMOS)
    MOCK_FEEDBACK_LOG = loaded.get("feedback", [])
    SITE_SETTINGS = loaded.get("site_settings", INITIAL_SITE_SETTINGS)
else:
    MOCK_CUSTOMER_DB = INITIAL_CUSTOMERS
    MOCK_MENU_DB = INITIAL_MENU
    MOCK_ORDER_DB = INITIAL_ORDERS
    MOCK_PROMO_DB = INITIAL_PROMOS
    MOCK_FEEDBACK_LOG = []
    SITE_SETTINGS = INITIAL_SITE_SETTINGS
    
    # Save immediately to create the file
    save_data({
        "customers": MOCK_CUSTOMER_DB,
        "menu": MOCK_MENU_DB,
        "orders": MOCK_ORDER_DB,
        "promos": MOCK_PROMO_DB,
        "feedback": MOCK_FEEDBACK_LOG,
        "site_settings": SITE_SETTINGS
    })

# --- HELPER TO SAVE ON UPDATES ---
def persist_changes():
    save_data({
        "customers": MOCK_CUSTOMER_DB,
        "menu": MOCK_MENU_DB,
        "orders": MOCK_ORDER_DB,
        "promos": MOCK_PROMO_DB,
        "feedback": MOCK_FEEDBACK_LOG,
        "site_settings": SITE_SETTINGS
    })
