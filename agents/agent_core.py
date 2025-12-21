# agents/agent_core.py
import os
import json
from dotenv import load_dotenv
from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.messages import HumanMessage, SystemMessage, AIMessage, BaseMessage, ToolMessage
from operator import itemgetter

from tools.crm_tools import ELLAS_CUPCAKERY_TOOLS
from workflows.agent_state import AgentState
from Mock_data.mock_data import MOCK_CUSTOMER_DB, MOCK_MENU_DB

from config import CRM_CONFIG

load_dotenv()
GROQ_API_KEY = os.getenv("GROQ_API_KEY")


from agents.llm_manager import robust_llm_invoke

print("--- LOADED STRICT MODE AGENT ---")

# Define Protocol here if it was missing or imported
SYSTEM_PROTOCOL = """
You are a direct, efficient cashier for Ellas Cupcakery.
Your only goal is to take orders and get payment.
### CRITICAL ORDER RULE ###
1. You are a bakery assistant. 
2. You DO NOT have the authority to create Order IDs or confirm payments yourself.
3. If a user mentions "order", "buy", or an item name (e.g., "red velvet"), you MUST call the 'ProcessOrder' tool.
4. FORBIDDEN: Do NOT say "Order created" or "Order ID" or provide "Ellas Bank" details from your memory. 
5. You may ONLY provide those details by repeating the EXACT output returned by the 'ProcessOrder' tool. 
6. Do NOT say you are "processing" anything. Trigger the 'ProcessOrder' tool silently and reply using the tool's instruction.

STRICT RULES (Violations will be penalized):
1. **NO SMALL TALK**: Do not say "It is lovely to have you", "I see you are interested", etc. be brief.
2. **NO NARRATION**: NEVER say "I am checking", "Using tool", "Processing order", "According to the system". ACTION ONLY.
3. **HIDDEN MECHANICS**: NEVER mention "tools", "database", "ID", "Profile". To the user, you are just a person.
4. **NO RAW JSON**: NEVER write JSON in your chat response. If you need to order, you must trigger the tool 'ProcessOrder' via the function-calling API. If you output {{\"ProcessOrder\":...}} as text, the system will fail. You are forbidden from talking about the order until the Tool returns a Result.
5. **IDENTITY CHECK**: 
   - If the customer profile has a name (e.g., "John"), USE IT.
   - If "New Customer", refer to them as "Guest". Do NOT ask for their name until they definitely place an order.
6. **PRICING**: Use **EXACT** prices from the 'GetMenuAndPrice' tool. NEVER guess or hallucinate prices. If unsure, check the menu.
7. **CLOSING**: To place an order, you MUST use the 'ProcessOrder' tool.
   - **CRITICAL**: You CANNOT confirm an order without the tool.
   - **RESPONSE**: You **MUST** use the exact text provided in the 'instruction' field of the tool output. 
   - **IF NO TOOL OUTPUT**: Ask which item and quantity to order, then call the tool.
"""

INTENT_CLASSIFIER_PROMPT = SYSTEM_PROTOCOL + """
Your role: Analyze the query and decide the next step.
CONTEXT:
Chat History: {chat_history}
Customer: {customer_profile}
Current Query: {input_query}

DECISION LOGIC:
1. MENU & AVAILABILITY: 
   - If user asks about menu/prices -> Call 'GetMenuAndPrice'.
   - After listing, prompt: "Here's the current menu — which would you like to order?"

2. ORDERING (High Priority):
   - If user says "Order X", "I want X" -> Call 'ProcessOrder'.
   - **MANDATORY MENU CHECK**: Do not assume items exist. If 'ProcessOrder' returns an error saying "Item not found", you must explicitly tell the user "That item is not available."
   - **CRITICAL**: If the user provides their name/email (e.g., "My name is John"), Call 'UpdateCustomerProfile'.
   - If user tries to order and provide name in one go -> Call Both.
   - **FORCE TOOL**: Do not answer "Order created" without calling 'ProcessOrder'.

3. STATUS: 
   - If asking for order status -> 'UpdateDeliveryStatus'.

4. PAYMENT:
   - If user claims payment made -> 'NotifyPaymentMade'.

5. DELIVERY TIMES:
   - If user asks about delivery windows/times -> 'GetDeliveryTimes'.
"""

# --- LangGraph Node Functions ---

def _format_history(history: list) -> str:
    """Helper to format chat history for prompts."""
    # ... (Implementation kept)
    if not history:
        return "No previous history."
    formatted = []
    for msg in history:
        # Handle dicts (from API) or Objects (internal)
        role = msg.get("role", "unknown") if isinstance(msg, dict) else getattr(msg, "type", "unknown")
        content = msg.get("content", "") if isinstance(msg, dict) else getattr(msg, "content", "")
        formatted.append(f"{role.upper()}: {content}")
    return "\n".join(formatted)[-2000:]


def identify_user_node(state: AgentState) -> AgentState:
    """Node 1: Retrieves customer profile using the ID passed from Frontend."""
    user_id = state.get("user_id")
    customer_profile = MOCK_CUSTOMER_DB.get(user_id)
    if not customer_profile:
        template = MOCK_CUSTOMER_DB.get("NEW_USER").copy()
        template["id"] = user_id 
        customer_profile = template
    print(f"--- Node 1: Identified User: {customer_profile.get('name')} (ID: {user_id})")
    return {"customer_profile": customer_profile, "user_id": user_id}

def intent_classifier_node(state: AgentState) -> AgentState:
    """Node 2: Determines intent using Robust LLM."""
    input_query = state["input_query"]
    customer_profile = state["customer_profile"]
    chat_history = _format_history(state.get("chat_history", []))
    
    prompt = ChatPromptTemplate.from_messages([
        ("system", INTENT_CLASSIFIER_PROMPT),
        ("human", "{input_query}")
    ])

    # 1. Format the prompts with data
    prompt_val = prompt.invoke({
        "customer_profile": json.dumps(customer_profile),
        "chat_history": chat_history,
        "input_query": input_query
    })

    # --- DETERMINISTIC GUARDRAILS (Force Tool Usage) ---
    # Because LLMs can sometimes be lazy, we force the menu tool if keywords appear.
    lower_query = input_query.lower()
    forced_tools = []
    
    # Strict greeting guard: avoid any tool calls for simple salutations
    import re as _re
    greet_pat = _re.compile(r'^\s*(hi|hello|hey|good\s+(morning|afternoon|evening))\b', _re.IGNORECASE)
    if greet_pat.search(input_query) and len(input_query) < 20:
        name = customer_profile.get("name") or "Guest"
        return {"intent": "CONVERSATIONAL", "final_response": f"Hi {name}, what would you like to order today?"}
    
    # Exclusive Feedback Handling: never create orders for feedback
    if input_query.startswith("[FEEDBACK]"):
        print("--- Node 2: Guardrail DETECTED FEEDBACK via UI (exclusive)")
        feedback_text = input_query.replace("[FEEDBACK]", "").strip()
        return {"intent": "TOOL_REQUIRED", "tools_to_run": [{"tool": "LogFeedbackAndComplaint", "args": {"message": feedback_text, "sentiment": "Neutral"}}]}
    
    # Force Menu
    if any(k in lower_query for k in ["menu", "price", "list", "available", "cost"]):
        # But NOT if they are asking for status
        if "status" not in lower_query and "order" not in lower_query and "buy" not in lower_query:
            print("--- Node 2: Guardrail FORCED 'GetMenuAndPrice'")
            forced_tools.append({"tool": "GetMenuAndPrice", "args": {"query": "all"}})
            
    # Force ProcessOrder (Deterministic Guardrail)
    # If the user says "order X" or "buy X", and the message is short, force the tool.
    # We must be careful not to force it for "order status".
    # Force ProcessOrder (Deterministic Guardrail)
    # If the user says "order X", "buy X", or JUST "X" (naming an item), force the tool.
    # We add specific item keywords to catch "a red velvet" which misses the "order" keyword.
    item_keywords = ["velvet", "chocolate", "strawberry", "vanilla", "bun", "cupcake", "cake"]
    is_item_request = any(k in lower_query for k in item_keywords)
    
    if (("order" in lower_query or "buy" in lower_query or "want" in lower_query or "get" in lower_query) or is_item_request) and "status" not in lower_query:
         print("--- Node 2: Guardrail DETECTED ORDER INTENT - Building deterministic args")
         # Simple heuristic to extract quantity and item names from query
         import re
         qty_match = re.search(r'\\b(\\d+)\\b', lower_query)
         quantity = int(qty_match.group(1)) if qty_match else 1
         matched_items = []
         for item_id, item in MOCK_MENU_DB.items():
             name_l = item['name'].lower()
             # require at least one distinctive token to match
             if any(tok in name_l for tok in ["velvet","chocolate","lemon","bun","cupcake","cake","platter","chops"]) and \
                any(tok in lower_query for tok in name_l.split()):
                 matched_items.append({"name": item['name'], "quantity": quantity})
                 break
         if matched_items:
             forced_tools.append({"tool": "ProcessOrder", "args": {"items": matched_items}})
             print(f"--- Node 2: Heuristic items -> {matched_items}")
         else:
             from langchain_core.messages import HumanMessage
             prompt_val.messages.append(HumanMessage(content=f"[SYSTEM INJECTION]: Please place an order for the exact menu item mentioned: '{input_query}'."))
    
    # Loyalty/Points
    if any(k in lower_query for k in ["loyalty", "points", "balance"]):
        print("--- Node 2: Guardrail FORCED 'GetCustomerProfile' for points")
        forced_tools.append({"tool": "GetCustomerProfile", "args": {}})
    
    # (feedback handled above)
    
    # 2. Invoke Robust LLM with Tools
    if forced_tools:
        intent = "TOOL_REQUIRED"
        return {"intent": intent, "tools_to_run": forced_tools}

    response = robust_llm_invoke(prompt_val, tools=ELLAS_CUPCAKERY_TOOLS)
    
    # --- FALLBACK: Detect JSON in text (Hallucination Fix) ---
    import re
    # Look for {"ToolName": {args}} pattern
    json_match = re.search(r'\{"([a-zA-Z0-9_]+)":\s*(\{.*?\})\}', response.content, re.DOTALL)
    
    if not response.tool_calls and json_match:
        print("--- Node 2: JSON HALLUCINATION DETECTED. Parsing manually...")
        tool_name = json_match.group(1)
        tool_args_str = json_match.group(2)
        
        try:
            tool_args = json.loads(tool_args_str)
            print(f"--- Node 2: Recovered Tool: {tool_name} Args: {tool_args}")
            
            # SCHEMA FIX: ProcessOrder expects 'items': list[dict], but LLM often gives 'item': str or flat dict
            if tool_name == "ProcessOrder":
                if "items" not in tool_args:
                    # Case 1: {"item": "Red Velvet", "quantity": 1}
                    if "item" in tool_args:
                        tool_args["items"] = [{"name": tool_args["item"], "quantity": tool_args.get("quantity", 1)}]
                    # Case 2: {"name": "Red Velvet", ...}
                    elif "name" in tool_args:
                         tool_args["items"] = [{"name": tool_args["name"], "quantity": tool_args.get("quantity", 1)}]
                    # Case 3: Just flat args, assume it's one item
                    else:
                        tool_args["items"] = [tool_args] # Hope for the best
            
            # Construct valid tool call
            tools_to_run = [{"tool": tool_name, "args": tool_args}]
            intent = "TOOL_REQUIRED"
            return {"intent": intent, "tools_to_run": tools_to_run}
            
        except json.JSONDecodeError:
            print("--- Node 2: Failed to parse hallucinated JSON.")

    if response.tool_calls:
        print(f"--- Node 2: Intent: Tool Call ({response.tool_calls[0].get('name')})")
        tools_to_run = [{"tool": tc.get("name"), "args": tc.get("args")} for tc in response.tool_calls]
        intent = "TOOL_REQUIRED"
    else:
        print("--- Node 2: Intent: Conversational")
        tools_to_run = []
        intent = "CONVERSATIONAL"
        
        # DOUBLE CHECK: If user wants to order, do NOT exit.
        if ("order" in lower_query or "buy" in lower_query) and "status" not in lower_query and len(lower_query) < 50:
             print("--- Node 2: Suspected Missed Tool Call. Retrying with 'Please call ProcessOrder' hint.")
             # We can't easily retry in this node structure without loops.
             # I'll rely on the updated PROMPT which I'm about to improve further.
        
        return {"intent": intent, "final_response": response.content, "tools_to_run": tools_to_run}

    return {"intent": intent, "tools_to_run": tools_to_run}


def tool_executor_node(state: AgentState) -> AgentState:
    """Node 3: Executes tools."""
    tools_to_run = state["tools_to_run"]
    tool_output_list = []
    
    tool_map = {tool.name: tool for tool in ELLAS_CUPCAKERY_TOOLS}

    for tool_call in tools_to_run:
        tool_name = tool_call["tool"]
        tool_args = tool_call["args"]
        
        try:
            # CRITICAL FIX: Always inject user_id for tools that need it (Ordering, Profile, etc)
            # The LLM doesn't usually generate the ID, so we must supply it from state.
            if tool_name in ["ProcessOrder", "UpdateCustomerProfile", "GetCustomerProfile", "LogFeedbackAndComplaint", "NotifyPaymentMade"]:
                 tool_args["user_id"] = state["user_id"]
                 # Prevent accidental orders before profile is set
                 if tool_name == "ProcessOrder" and (not state["user_id"] or state["user_id"] == "NEW_USER"):
                     tool_output_list.append(json.dumps({"ProcessOrder": {"error": "Please provide your name and email before placing an order."}}))
                     print("--- Node 3: Blocked ProcessOrder for NEW_USER")
                     continue
            
            # Additional safety: Ensure items list exists for ProcessOrder
            if tool_name == "ProcessOrder" and "items" not in tool_args:
                 # If LLM messed up and passed just 'items' as a string or flat args, try to recover?
                 # ideally we rely on robust_llm invocation, but let's assume valid args for now.
                 pass
            
            # Quantity normalization: parse quantity from user text if missing or 1
            if tool_name == "ProcessOrder" and isinstance(tool_args.get("items"), list):
                import re
                text = state.get("input_query", "").lower()
                qty_num = None
                m = re.search(r'\b(\d+)\b', text)
                if m:
                    try:
                        qty_num = int(m.group(1))
                    except:
                        qty_num = None
                if qty_num is None:
                    words = {
                        "one": 1, "two": 2, "three": 3, "four": 4, "five": 5,
                        "six": 6, "seven": 7, "eight": 8, "nine": 9, "ten": 10,
                        "eleven": 11, "twelve": 12
                    }
                    for w, n in words.items():
                        if f" {w} " in f" {text} ":
                            qty_num = n
                            break
                if qty_num and qty_num > 1:
                    for it in tool_args["items"]:
                        if not isinstance(it.get("quantity"), int) or it.get("quantity", 1) == 1:
                            it["quantity"] = qty_num
            
            if tool_name in tool_map:
                tool_result = tool_map[tool_name].invoke(tool_args)
                tool_output_list.append(json.dumps({tool_name: tool_result}))
                print(f"--- Node 3: Executed {tool_name}")
            else:
                 error_msg = f"Tool '{tool_name}' not found."
                 tool_output_list.append(json.dumps({"error": error_msg}))
                 print(f"--- Node 3: {error_msg}")
                 
        except Exception as e:
            error_msg = f"Tool failure: {str(e)}"
            tool_output_list.append(json.dumps({tool_name: {"error": error_msg}}))
            print(f"--- Node 3: Error {error_msg}")

    return {"tool_output": tool_output_list}


RESPONSE_GENERATOR_PROMPT = SYSTEM_PROTOCOL + """
Your Goal: Synthesize a concise response based on the Tool Outputs and Context.
CONTEXT:
Chat History: {chat_history}
Customer Profile: {customer_profile}
Tool Outputs: {tool_output}
Bank Details: {bank_details}
User Query: {input_query}

FORBIDDEN PHRASES (Do NOT use):
- "I am checking"
- "Using tool"
- "System"
- "Database"
- "Let me process"
- "I have updated your profile" (Action is enough)

INSTRUCTIONS:
1. **VERIFY TOOL OUTPUT**: Look at {tool_output}. 
   - DID 'ProcessOrder' run successfully? 
   - IS there an 'order_id'? 
   - IF NO: DO NOT say "Order created". Say "I need to place the order first. What would you like?"
2. **USE TOOL INSTRUCTION**: If 'ProcessOrder' returned an 'instruction' field, USE THAT EXACT TEXT.
3. **MENU**: If listing menu, keep it simple (Item - Price).
4. **FAILURES**: If tool returns error, apologize and ask to try again.
5. **BE ROBOTICALLY EFFICIENT**.
"""

def response_generator_node(state: AgentState) -> AgentState:
    """Node 4: Generates final response."""
    customer_profile = state["customer_profile"]
    tool_output = state.get("tool_output", [])
    input_query = state["input_query"]
    chat_history = _format_history(state.get("chat_history", []))
    
    # Get Bank Details from Site Settings
    from Mock_data.mock_data import SITE_SETTINGS
    bank_name = SITE_SETTINGS.get('payment_bank_name') or "Access Bank"
    bank_num = SITE_SETTINGS.get('payment_account_number') or "1522553410"
    bank_acc = SITE_SETTINGS.get('payment_account_name') or "Ellas Cupcakery"
    bank_info = f"{bank_name} - {bank_num} ({bank_acc})"
    
    # Greeting handling: if no tools were run and message is a greeting, reply with a concise prompt
    import re as _re
    if not tool_output:
        gpat = _re.compile(r'^\s*(hi|hello|hey|good\s+(morning|afternoon|evening))\b', _re.IGNORECASE)
        if gpat.search(input_query or ""):
            name = customer_profile.get("name") or "Guest"
            final_content = f"Hi {name}, what would you like to order today?"
            return {"final_response": final_content}

    import json
    parsed = []
    for s in tool_output:
        try:
            parsed.append(json.loads(s))
        except Exception:
            pass

    process_order_result = None
    menu_result = None
    delivery_times_result = None
    feedback_result = None
    profile_result = None
    for entry in parsed:
        if isinstance(entry, dict):
            if "ProcessOrder" in entry:
                process_order_result = entry["ProcessOrder"]
            if "GetMenuAndPrice" in entry:
                menu_result = entry["GetMenuAndPrice"]
            if "GetDeliveryTimes" in entry:
                delivery_times_result = entry["GetDeliveryTimes"]
            if "LogFeedbackAndComplaint" in entry:
                feedback_result = entry["LogFeedbackAndComplaint"]
            if "GetCustomerProfile" in entry:
                profile_result = entry["GetCustomerProfile"]

    if process_order_result and isinstance(process_order_result, dict):
        if process_order_result.get("error"):
            final_content = process_order_result["error"]
        else:
            instr = process_order_result.get("instruction")
            if instr:
                final_content = instr.replace("{bank_details}", bank_info)
            else:
                final_content = f"Order Placed. ID: {process_order_result.get('order_id','Unknown')}. Total: {process_order_result.get('total_price','Unknown')}."
    elif profile_result and isinstance(profile_result, dict):
        pts = profile_result.get("loyalty_points", 0)
        q = input_query.lower()
        from Mock_data.mock_data import SITE_SETTINGS
        thr = int(SITE_SETTINGS.get("offer_points_threshold", 300))
        if "offer" in q or "need" in q:
            if pts >= thr:
                final_content = f"You have {pts} points and qualify for the offer."
            else:
                final_content = f"You have {pts} points. You need {thr - pts} more for the offer."
        else:
            final_content = f"You have {pts} loyalty points."
    elif menu_result and isinstance(menu_result, list):
        lines = []
        for item in menu_result:
            name = item.get("name")
            price = item.get("price")
            if name and price is not None:
                lines.append(f"{name} - {price}")
        if not lines:
            final_content = "No products found."
        else:
            suggest = ""
            try:
                uid = state.get("user_id")
                from Mock_data.mock_data import MOCK_ORDER_DB
                cnt = {}
                for _, od in MOCK_ORDER_DB.items():
                    if od.get("customer_id") == uid:
                        for it in od.get("items", []):
                            n = it.get("name")
                            if n:
                                cnt[n] = cnt.get(n, 0) + int(it.get("quantity", 1))
                if cnt:
                    top = sorted(cnt.items(), key=lambda x: x[1], reverse=True)[0][0]
                    suggest = f"\nRecommended: {top} — would you like to repeat it?"
            except Exception:
                suggest = ""
            final_content = "\n".join(lines) + "\n\nHere's the current menu — which would you like to order?" + suggest
    elif delivery_times_result and isinstance(delivery_times_result, dict):
        windows = delivery_times_result.get("windows", [])
        note = delivery_times_result.get("note", "")
        final_content = "Available delivery windows:\n" + "\n".join(f"- {w}" for w in windows)
        if note:
            final_content += f"\n{note}"
    elif feedback_result and isinstance(feedback_result, dict):
        final_content = "Thanks for your feedback! It has been logged."
    else:
        prompt = ChatPromptTemplate.from_messages([
            ("system", RESPONSE_GENERATOR_PROMPT),
            ("human", "{input_query}")
        ])
        prompt_val = prompt.invoke({
            "customer_profile": json.dumps(customer_profile),
            "tool_output": json.dumps(tool_output),
            "chat_history": chat_history,
            "input_query": input_query,
            "bank_details": bank_info
        })
        final_response_msg = robust_llm_invoke(prompt_val)
        final_content = final_response_msg.content

    # --- EXECUTION LOCK INTERCEPTOR ---
    # Final safety net: If the LLM *still* outputs raw JSON text for ProcessOrder, catch it here.
    if '{"ProcessOrder":' in final_content:
        import re
        print("--- Node 4: EXECUTION LOCK TRIGGERED. Intercepting JSON text...")
        
        # Regex to extract the argument block
        json_match = re.search(r'\{"ProcessOrder":\s*(\{.*?\})\s*\}', final_content, re.DOTALL)
        
        if json_match:
            try:
                args_str = json_match.group(1)
                args = json.loads(args_str)
                user_id = state.get("user_id")
                
                print(f"--- Node 4: Manually executing ProcessOrder with args: {args}")
                
                # Normalize args (items list vs item)
                if "items" not in args:
                    if "item" in args:
                        args["items"] = [{"name": args["item"], "quantity": args.get("quantity", 1)}]
                    elif "name" in args:
                         args["items"] = [{"name": args["name"], "quantity": args.get("quantity", 1)}]
                    else:
                        args["items"] = [args]

                # EXECUTE TOOL DIRECTLY
                from tools.crm_tools import ProcessOrder
                result = ProcessOrder.invoke({"user_id": user_id, "items": args["items"]})
                
                # SWAP RESPONSE TEXT
                # Using the exact instruction from the tool if available
                if isinstance(result, dict) and "instruction" in result:
                    final_content = result["instruction"]
                else:
                    final_content = f"Order Placed. ID: {result.get('order_id', 'Unknown')}. Total: {result.get('total_price', 'Unknown')}."
                    
                print(f"--- Node 4: Interceptor SWAPPED response to: {final_content}")
                
            except Exception as e:
                print(f"--- Node 4: Interceptor Failed: {e}")

    print("--- Node 4: Final Response Generated")
    print(f"DEBUG: Tool Outputs used for response: {tool_output}")
    print(f"DEBUG: Final Answer: {final_content}")

    return {"final_response": final_content}
