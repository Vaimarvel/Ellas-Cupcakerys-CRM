# tools/crm_tools.py
from langchain.tools import tool
from Mock_data.mock_data import MOCK_CUSTOMER_DB, MOCK_MENU_DB, MOCK_ORDER_DB, MOCK_PROMO_DB, MOCK_FEEDBACK_LOG, persist_changes
import uuid
import datetime
from typing import List, Dict, Optional

# --- CORE RETRIEVAL TOOLS ---

@tool
def GetCustomerProfile(user_id: str) -> dict:
    """
    Retrieves the customer's full profile.
    """
    customer_data = MOCK_CUSTOMER_DB.get(user_id)
    if not customer_data:
        # DO NOT RETURN NEW USER HERE. Just return empty/not found to let the agent decide.
        return {} 
    return customer_data

@tool
def GetMenuAndPrice(query: str = "") -> list[dict]:
    """
    Searches the Ellas Cupcakery menu.
    - If 'query' is provided, returns items matching the name or ingredients.
    - If 'query' is empty (or "all"), returns the ENTIRE menu.
    """
    query = query.lower().strip()
    results = []
    
    # If query is empty or "all", return everything
    return_all = (not query) or (query == "all") or (query == "menu")

    for item_id, item_data in MOCK_MENU_DB.items():
        if not item_data['is_available']:
            continue
            
        if return_all:
            match = True
        else:
            match = (query in item_data['name'].lower()) or \
                    any(query in ing.lower() for ing in item_data['ingredients'])
        
        if match:
            results.append({
                "item_id": item_id,
                "name": item_data['name'],
                "price": item_data['price'],
                "is_available": item_data['is_available'],
                "ingredients": item_data['ingredients']
            })
            
    return results if results else [{"message": f"No products found matching '{query}'."}]

@tool
def UpdateDeliveryStatus(order_id: str) -> dict:
    """
    Checks the current delivery status of a submitted order.
    """
    order_data = MOCK_ORDER_DB.get(order_id)
    if not order_data:
        return {"error": f"Order ID '{order_id}' not found. Please check your ID."}
    
    return {
        "order_id": order_id, 
        "status": order_data['status'], 
        "payment_status": order_data.get('payment_status', 'Unknown'),
        "timestamp": order_data['timestamp']
    }

# --- ACTION & PROACTIVE TOOLS ---

@tool
def ProcessOrder(user_id: str, items: list[dict]) -> dict:
    """
    Creates a new order record. 
    Required: 'items' list with 'item_id'.
    Note: Payment is NOT processed here. It is marked as 'Pending Payment'.
    """
    if user_id == "9012345678":
        return {"error": "Test user is restricted from placing orders. Please use your own account."}

    total_price = 0.0
    processed_items = []
    
    for item in items:
        # LLM might pass name, we need ID. Try to fuzzy match if ID missing
        item_id = item.get('item_id')
        
        # Fallback search if ID is missing or invalid
        if not item_id or item_id not in MOCK_MENU_DB:
             name_query = item.get('name', '').lower()
     # Try exact match first
             found = next((k for k,v in MOCK_MENU_DB.items() if v['name'].lower() == name_query), None)
             
             # If not found, try robust substring match
             if not found:
                 # Check if user query is significant part of item name (e.g. "chocolate" in "Classic Chocolate Cake")
                 # FILTER OUT empty strings
                 if not name_query or len(name_query) < 2:
                     continue 

                 candidates = [k for k,v in MOCK_MENU_DB.items() if name_query in v['name'].lower()]
                 
                 if len(candidates) == 1:
                     found = candidates[0]
                 elif len(candidates) > 1:
                     # AMBIGUITY CHECK: Do not guess. Force clarification.
                     candidate_names = [MOCK_MENU_DB[c]['name'] for c in candidates]
                     return {"error": f"Multiple items match '{name_query}': {', '.join(candidate_names)}. Please specify which one."}

             if found:
                 item_id = found
             else:
                 return {"error": f"Item '{item.get('name')}' not found in menu. Please check the name."}

        menu_item = MOCK_MENU_DB.get(item_id)
        quantity = item.get('quantity', 1)
        
        if not menu_item['is_available']:
            return {"error": f"Item {menu_item['name']} is currently Out of Stock."}
            
        total_price += menu_item['price'] * quantity
        processed_items.append({
            "item_id": item_id, 
            "name": menu_item['name'], 
            "quantity": quantity,
            "price_at_order": menu_item['price']
        })
    
    if not processed_items:
        return {"error": "No valid items were identified. Please specify the exact menu item name (e.g., 'Red Velvet Cupcake')."}

    import time
    new_order_id = f"O-{int(time.time())}" # Use O-Timestamp format consistently
    current_time = datetime.datetime.now().isoformat()
    
    new_order = {
        "id": new_order_id,
        "customer_id": user_id,
        "items": processed_items,
        "status": "Pending Payment", 
        "payment_status": "Unpaid",
        "timestamp": current_time,
        "total": total_price
    }
    
    MOCK_ORDER_DB[new_order_id] = new_order
    
    # Check if we need to update customer profile (e.g. last order date)
    if user_id not in MOCK_CUSTOMER_DB:
        # Create a new profile for this implicit user so we can track the order date
        MOCK_CUSTOMER_DB[user_id] = {
            "id": user_id,
            "name": "New Customer", 
            "email": "",
            "preferences": [],
            "loyalty_points": 0,
            "last_order_date": current_time, # Store full ISO timestamp for better sorting
            "is_first_time": True
        }
    else:
        # Update existing user
        MOCK_CUSTOMER_DB[user_id]['last_order_date'] = current_time
        MOCK_CUSTOMER_DB[user_id]['is_first_time'] = False
        
    # NOTE: Loyalty points are now awarded ONLY when payment is confirmed in the admin dashboard.
    
    persist_changes() # Save to disk
    
    # --- EMAIL HOOK (Simulated) ---
    print(f"📧 [SMTP] Sending New Order Notification to ella@cupcakery.com for Order {new_order_id}...")
    # real SMTP code would go here:
    # send_email("ella@cupcakery.com", "New Order Received", f"Order {new_order_id} needs attention.")
    
    print(f"DEBUG: ProcessOrder execution successful. Order {new_order_id} created for {user_id}. Total: {total_price}")

    return {
        "message": "Order Placed Successfully.",
        "order_id": new_order_id,
        "total_price": f"₦{total_price:,.2f}",
        "status": "Pending Payment",
        "instruction": f"The price of this order is ₦{total_price:,.2f}. Please kindly make payment to: {{bank_details}}. Your order will be created upon payment confirmation. Order ID: {new_order_id}."
    }

@tool
def LogFeedbackAndComplaint(user_id: str, message: str, sentiment: str = "Neutral") -> dict:
    """
    Logs customer feedback.
    """
    log_id = f"L-{str(uuid.uuid4())[:4]}"
    log_entry = {
        "log_id": log_id,
        "timestamp": datetime.datetime.now().isoformat(),
        "user_id": user_id,
        "message": message,
        "sentiment": sentiment
    }
    
    MOCK_FEEDBACK_LOG.append(log_entry)
    persist_changes()
    
    if sentiment.lower() in ["crisis", "negative"]:
        print(f"🚨 ALERT: Negative Feedback from {user_id}: {message}")
        
    return {"confirmation": "Feedback logged successfully."}

@tool
def SuggestPersonalizedMeal(customer_preferences: List[str], last_order_date: str) -> dict:
    """
    Suggests a highly personalized and available pastry based on customer 
    preferences and order history.
    """
    target_preference = next((p for p in customer_preferences if p in ["Chocolate", "Vegan", "No Nuts"]), None)
    
    suggestion = None
    for item_id, item_data in MOCK_MENU_DB.items():
        if target_preference and target_preference in item_data['ingredients'] and item_data['is_available']:
            suggestion = item_data
            break

    if suggestion:
        reasoning = f"Based on your love for {target_preference} pastries, we recommend our {suggestion['name']} (₦{suggestion['price']:,.2f})."
        return {"suggestion_name": suggestion['name'], "reasoning": reasoning}
    
    return {"suggestion_name": "General Recommendation", "reasoning": "We recommend checking out our current best-seller: Red Velvet Cupcake."}

@tool
def SearchPromotions(customer_preferences: List[str] = None) -> list[dict]:
    """
    Searches for and returns active promotions, optionally filtering them 
    based on customer preferences for targeted deals.
    """
    active_promos = [p for p in MOCK_PROMO_DB if p['active']]
    
    if not customer_preferences:
        return active_promos

    targeted_promos = []
    for promo in active_promos:
        if any(tag in customer_preferences for tag in promo.get('target_tags', [])):
            targeted_promos.append(promo)
            
    return targeted_promos if targeted_promos else [{"message": "No targeted promotions currently available."}]

@tool
def UpdateCustomerProfile(user_id: str, name: str = None, email: str = None) -> dict:
    """
    Updates the customer's profile with new information (name or email) provided in the chat.
    Use this tool IMMEDIATELY when a user provides their contact details.
    """
    if user_id not in MOCK_CUSTOMER_DB:
        # Create new profile if it doesn't exist
        MOCK_CUSTOMER_DB[user_id] = {
            "id": user_id,
            "name": name,
            "email": email,
            "preferences": [],
            "loyalty_points": 0,
            "last_order_date": None,
            "is_first_time": True
        }
    else:
        if name:
            MOCK_CUSTOMER_DB[user_id]["name"] = name
        if email:
            MOCK_CUSTOMER_DB[user_id]["email"] = email
            
    persist_changes()
    
    updated_profile = MOCK_CUSTOMER_DB[user_id]
    return {
        "message": "Profile updated successfully.", 
        "current_profile": {
            "name": updated_profile.get("name"), 
            "email": updated_profile.get("email")
        }
    }

@tool
def NotifyPaymentMade(user_id: str) -> dict:
    """
    Notifies the vendor that the customer claims to have made a payment.
    Use this when the customer says "I have paid" or "Payment sent".
    """
    # Find active order for user
    active_order_id = None
    # Sort by timestamp desc to get latest
    sorted_orders = sorted(MOCK_ORDER_DB.values(), key=lambda x: x['timestamp'], reverse=True)
    
    for order in sorted_orders:
        if order['customer_id'] == user_id and order['status'] == 'Pending Payment':
            active_order_id = order['id']
            break
            
    if active_order_id:
        MOCK_ORDER_DB[active_order_id]['payment_status'] = 'Customer Claimed Paid'
        persist_changes()
        return {"message": "Vendor notified of payment. Please wait for confirmation."}
        
    return {"message": "No pending payment order found to notify."}

@tool
def GetDeliveryTimes() -> dict:
    """
    Returns available delivery windows for the day.
    """
    return {
        "windows": [
            "10:00–12:00",
            "12:00–14:00",
            "14:00–16:00",
            "16:00–18:00"
        ],
        "note": "Same-day delivery for orders confirmed before 12:00."
    }

# Package all tools for the LangGraph
ELLAS_CUPCAKERY_TOOLS = [
    GetCustomerProfile, UpdateCustomerProfile, GetMenuAndPrice, ProcessOrder, UpdateDeliveryStatus, 
    SearchPromotions, LogFeedbackAndComplaint, SuggestPersonalizedMeal, NotifyPaymentMade, GetDeliveryTimes
]
