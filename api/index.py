# api/index.py (FastAPI Serverless Entry Point)
import os
from fastapi import FastAPI, Request
from pydantic import BaseModel
from dotenv import load_dotenv

# Import the core components
from workflows.crm_graph import build_crm_graph
from workflows.agent_state import AgentState # For type hinting the state
from agents.agent_core import identify_user_node, intent_classifier_node, tool_executor_node, response_generator_node

# Load environment variables
load_dotenv()

from fastapi.middleware.cors import CORSMiddleware

# --- 1. FastAPI Setup ---
app = FastAPI(
    title="Ellas Cupcakery CRM Agent API",
    version="1.0",
    description="Groq-powered LangGraph CRM Agent for Ellas Cupcakery, deployed on Vercel."
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Allow all origins for development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- 2. Request/Response Models ---
class ChatRequest(BaseModel):
    # This ID will be used to look up the customer in the mock DB
    user_id: str
    message: str
    # Optional: for multi-turn conversations, but kept simple for initial setup
    chat_history: list = []

class ChatResponse(BaseModel):
    user_id: str
    response: str
    
# --- 3. Build and Compile LangGraph ---
# The graph is compiled once on startup, making the function calls efficient.
# We pass None as the global LLM is now managed dynamically by agents.llm_manager
try:
    crm_agent_app = build_crm_graph(None)
    print("[OK] LangGraph CRM Agent compiled successfully.")
except Exception as e:
    print(f"[ERROR] Error compiling LangGraph: {e}")
    crm_agent_app = None


# --- 4. API Endpoints ---

@app.get("/api/health")
def health_check():
    """Simple endpoint for Vercel health check."""
    return {"status": "ok", "brand": os.getenv("BRAND_NAME", "Ellas Cupcakery")}

# --- Dashboard Data Endpoints ---
from Mock_data.mock_data import MOCK_MENU_DB, MOCK_ORDER_DB, MOCK_CUSTOMER_DB, MOCK_FEEDBACK_LOG, SITE_SETTINGS, persist_changes

@app.get("/api/data/menu")
def get_menu_data():
    return MOCK_MENU_DB

@app.get("/api/data/orders")
def get_order_data():
    return MOCK_ORDER_DB

@app.get("/api/data/customers")
def get_customer_data():
    return MOCK_CUSTOMER_DB

@app.get("/api/data/feedback")
def get_feedback_data():
    return MOCK_FEEDBACK_LOG

class UpdateRequest(BaseModel):
    collection: str # "menu", "orders", "promos"
    item_id: str
    updates: dict

@app.post("/api/data/update")
def update_data(request: UpdateRequest):
    if request.collection == "menu":
        if request.item_id in MOCK_MENU_DB:
            MOCK_MENU_DB[request.item_id].update(request.updates)
            persist_changes()
            return {"status": "success", "message": f"Menu item {request.item_id} updated."}
    elif request.collection == "orders":
        if request.item_id in MOCK_ORDER_DB:
            MOCK_ORDER_DB[request.item_id].update(request.updates)
            persist_changes()
            
            # --- Email Notification Trigger ---
            new_status = request.updates.get("status")
            new_payment = request.updates.get("payment_status")
            
            order = MOCK_ORDER_DB[request.item_id]
            customer_id = order.get("customer_id")
            customer = MOCK_CUSTOMER_DB.get(customer_id)
            
            # Award Loyalty Points if Payment is Confirmed (and not already awarded)
            if new_payment == 'Paid' or (new_status == 'Processing' and order.get('payment_status') == 'Paid'):
                # Check if points already given to avoid double counting? 
                # Ideally we need a flag on order like 'points_awarded'.
                if not order.get('points_awarded'):
                    total_price = order.get('total', 0)
                    # Logic: 10 points per 1000 naira (or 1 pt per 100)
                    points_earned = int(total_price / 100)
                    
                    if customer:
                        current_points = customer.get('loyalty_points', 0)
                        customer['loyalty_points'] = current_points + points_earned
                        # Flag order as processed for loyalty
                        MOCK_ORDER_DB[request.item_id]['points_awarded'] = True
                        persist_changes()
                        print(f"--- Loyalty: Awarded {points_earned} pts to {customer_id} for Order {request.item_id}")

            if new_status:
                if customer and customer.get("email"):
                    subject = f"Order Update: {request.item_id}"
                    body = f"Hello {customer.get('name', 'Customer')},\n\nYour order {request.item_id} status has been updated to: {new_status}.\n\nThank you for choosing Ellas Cupcakery!"
                    send_email_notification(customer['email'], subject, body)
            # ----------------------------------
            
            return {"status": "success", "message": f"Order {request.item_id} updated."}
    elif request.collection == "site_settings":
        for k, v in request.updates.items():
            SITE_SETTINGS[k] = v
        persist_changes()
        return {"status": "success", "message": "Site settings updated."}
    
    return {"status": "error", "message": "Item or Collection not found."}

@app.get("/api/site/settings")
def get_site_settings():
    return SITE_SETTINGS

class AddRequest(BaseModel):
    collection: str # "menu", "customers"
    item: dict

@app.post("/api/data/add")
def add_data(request: AddRequest):
    if request.collection == "menu":
        item_id = request.item.get("id")
        if item_id and item_id not in MOCK_MENU_DB:
            MOCK_MENU_DB[item_id] = request.item
            persist_changes()
            return {"status": "success", "message": f"Menu item {item_id} added."}
        return {"status": "error", "message": "Item ID already exists or missing."}
    elif request.collection == "customers":
        customer_id = request.item.get("id")
        if customer_id:
            incoming = dict(request.item)
            email_in = (incoming.get("email") or "").lower().strip()
            duplicates = []
            if email_in:
                for cid, cust in list(MOCK_CUSTOMER_DB.items()):
                    if cid != customer_id and (cust.get("email") or "").lower().strip() == email_in:
                        duplicates.append((cid, cust))
            if duplicates:
                base = dict(incoming)
                total_points = int(base.get("loyalty_points") or 0)
                prefs = set(base.get("preferences") or [])
                last_dates = [base.get("last_order_date")] + [d.get("last_order_date") for _, d in duplicates]
                for old_id, old in duplicates:
                    total_points += int(old.get("loyalty_points") or 0)
                    for p in old.get("preferences") or []:
                        prefs.add(p)
                base["loyalty_points"] = total_points
                base["preferences"] = list(prefs)
                last_dates_clean = [d for d in last_dates if d]
                if last_dates_clean:
                    base["last_order_date"] = sorted(last_dates_clean)[-1]
                if not base.get("name"):
                    for _, old in duplicates:
                        if old.get("name"):
                            base["name"] = old["name"]
                            break
                for old_id, _ in duplicates:
                    for oid, od in list(MOCK_ORDER_DB.items()):
                        if od.get("customer_id") == old_id:
                            MOCK_ORDER_DB[oid]["customer_id"] = customer_id
                    if old_id in MOCK_CUSTOMER_DB:
                        del MOCK_CUSTOMER_DB[old_id]
                MOCK_CUSTOMER_DB[customer_id] = base
            else:
                MOCK_CUSTOMER_DB[customer_id] = incoming
            persist_changes()
            return {"status": "success", "message": f"Customer {customer_id} added/updated."}
        return {"status": "error", "message": "Customer ID missing."}
    
    return {"status": "error", "message": "Invalid collection."}

class DeleteRequest(BaseModel):
    collection: str
    item_id: str

@app.post("/api/data/delete")
def delete_data(request: DeleteRequest):
    if request.collection == "menu":
        if request.item_id in MOCK_MENU_DB:
            del MOCK_MENU_DB[request.item_id]
            persist_changes()
            return {"status": "success", "message": f"Menu item {request.item_id} deleted."}
        return {"status": "error", "message": "Item ID not found."}
    
    return {"status": "error", "message": "Delete not supported for this collection."}


# --- Email Notification Helper ---
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

def send_email_notification(to_email: str, subject: str, body: str):
    """Sends an email notification via SMTP."""
    smtp_server = os.getenv("SMTP_SERVER", "smtp.gmail.com")
    smtp_port = int(os.getenv("SMTP_PORT", "587"))
    smtp_user = os.getenv("SMTP_EMAIL")
    smtp_password = os.getenv("SMTP_PASSWORD")

    if not smtp_user or not smtp_password:
        print(f"[MOCK EMAIL] To: {to_email} | Subject: {subject} | Body: {body}")
        return

    try:
        msg = MIMEMultipart()
        msg['From'] = smtp_user
        msg['To'] = to_email
        msg['Subject'] = subject
        msg.attach(MIMEText(body, 'plain'))

        with smtplib.SMTP(smtp_server, smtp_port) as server:
            server.starttls()
            server.login(smtp_user, smtp_password)
            server.send_message(msg)
        print(f"[EMAIL SENT] To: {to_email}")
    except Exception as e:
        print(f"[EMAIL ERROR] Failed to send to {to_email}: {e}")

@app.post("/api/chat", response_model=ChatResponse)
async def chat_endpoint(request_data: ChatRequest):
    """The main chat endpoint that runs the LangGraph agent."""
    
    if not crm_agent_app:
        return ChatResponse(
            user_id=request_data.user_id, 
            response="System initialization error. Please check server logs."
        )

    # 1. Prepare the initial state for the graph
    initial_state: AgentState = {
        "user_id": request_data.user_id,
        "input_query": request_data.message,
        "chat_history": request_data.chat_history,
        "customer_profile": {},
        "tools_to_run": [],
        "tool_output": [],
        "intent": "",
        "final_response": "",
    }

    # 2. Invoke the LangGraph (The entire agentic loop runs here)
    try:
        # Note: We use .invoke() for a single-turn synchronous call
        final_state = crm_agent_app.invoke(initial_state)
        
        final_response_text = final_state.get("final_response", "Sorry, I encountered an internal error.")

        # 3. Return the response
        return ChatResponse(
            user_id=request_data.user_id,
            response=final_response_text
        )

    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        print(f"LangGraph execution error: {e}")
        with open("server_errors.log", "a") as f:
            f.write(f"\n--- ERROR ---\n{error_details}\n")
        
        return ChatResponse(
            user_id=request_data.user_id,
            response="I'm sorry, I'm having trouble processing your request right now. Please try again later."
        )

# For local development, you would run this via Uvicorn (e.g., uvicorn api.index:app --reload)
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
    
