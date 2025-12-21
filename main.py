# main.py
import os
import uvicorn
from api.index import app # Import the FastAPI app for local serving
from workflows.crm_graph import build_crm_graph
from agents.agent_core import identify_user_node, intent_classifier_node, tool_executor_node, response_generator_node
from config import CRM_CONFIG
from workflows.agent_state import AgentState # For type hinting the initial state

def run_local_test(user_id: str, query: str):
    """
    Runs a single query through the compiled LangGraph agent for testing.
    """
    print(f"\n--- Testing Query ---")
    print(f"User ID: {user_id}")
    print(f"Query: {query}")
    print("---------------------\n")

    # 1. Compile the graph (needs to be done once)
    try:
        crm_agent_app = build_crm_graph(None)
        print("[OK] LangGraph compiled successfully.")
    except Exception as e:
        print(f"[ERROR] Error compiling graph: {e}")
        return

    # 2. Define the initial state
    initial_state: AgentState = {
        "user_id": user_id,
        "input_query": query,
        "chat_history": [],
        "customer_profile": {},
        "tools_to_run": [],
        "tool_output": [],
        "intent": "",
        "final_response": "",
    }

    # 3. Invoke the LangGraph agent
    try:
        # The .invoke() method executes the full graph from start to end
        final_state = crm_agent_app.invoke(initial_state)
        
        final_response_text = final_state.get("final_response", "System failed to generate final response.")

        print("\n--- FINAL AGENT RESPONSE ---")
        print(f"Response: {final_response_text}")
        print("----------------------------\n")
        
        # Optional: Print the full execution path for debugging
        # print("Full State Path:", final_state) 

    except Exception as e:
        print(f"[ERROR] LangGraph Execution Failed: {e}")


def start_api_server():
    """Starts the Uvicorn server to host the FastAPI application locally."""
    print(f"\n[INFO] Starting local API server at http://{CRM_CONFIG.API_HOST}:{CRM_CONFIG.API_PORT}")
    # Run the uvicorn server with the application instance
    uvicorn.run(app, host=CRM_CONFIG.API_HOST, port=CRM_CONFIG.API_PORT)


if __name__ == "__main__":
    # --- Local Testing Block ---
    
    # Example 1: Personalized Greeting & Suggestion (Returning User)
    # run_local_test(user_id="9012345678", query="Hello, what should I order today?")

    # Example 2: Ordering a Product (Requires ProcessOrder tool)
    # run_local_test(user_id="NEW_USER", query="Can I order 2 red velvet cupcakes?")
    
    # Example 3: Tracking an Order (Requires UpdateDeliveryStatus tool)
    # run_local_test(user_id="9012345678", query="Where is my order O-202501?")

    # --- Start API Server ---
    # To test the API endpoints (http://127.0.0.1:8000/api/chat), uncomment the line below:
    start_api_server()